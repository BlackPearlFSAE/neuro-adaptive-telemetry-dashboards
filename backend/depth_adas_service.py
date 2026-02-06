#!/usr/bin/env python3
"""
Depth ADAS Service
Unified Advanced Driver Assistance System service for NATS dashboard integration.

Features:
- Depth estimation using Depth Anything V2
- Real-time collision warning
- Lane keeping assist
- Distance estimation
- Video processing with streaming results
"""

import asyncio
import time
import numpy as np
from typing import Dict, Any, Optional, AsyncGenerator, List
from dataclasses import dataclass, asdict
from pathlib import Path
from enum import Enum
import json

# ADAS Modules
from adas import CollisionWarning, LaneKeeping, DistanceEstimator, SceneReconstruction
from adas.collision_warning import WarningLevel, WarningState


class ProcessingStatus(Enum):
    """Video processing status."""
    IDLE = "idle"
    LOADING_MODEL = "loading_model"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"


@dataclass
class ADASState:
    """Unified ADAS state for streaming to frontend."""
    timestamp: float
    frame_id: int
    
    # Collision Warning
    warning_level: str
    warning_message: str
    threats: List[Dict[str, Any]]
    brake_assist: bool
    
    # Lane Keeping
    lane_status: str
    center_offset: float
    suggested_steering: float
    lane_confidence: float
    
    # Distance
    min_distance: float
    distance_zone: str
    
    # Processing Info
    fps: float
    processing_time_ms: float


class DepthADASService:
    """
    Unified ADAS Service for Dashboard Integration.
    
    Provides real-time collision warning, lane keeping, and
    distance estimation from video or camera streams.
    """
    
    def __init__(
        self,
        ego_velocity: float = 15.0,  # m/s (~54 km/h)
        enable_depth_model: bool = True,
        model_size: str = "small",
    ):
        """
        Initialize ADAS service.
        
        Args:
            ego_velocity: Vehicle velocity for TTC calculation
            enable_depth_model: Load Depth Anything model
            model_size: Depth model size (small/base/large)
        """
        self.ego_velocity = ego_velocity
        self.enable_depth_model = enable_depth_model
        self.model_size = model_size
        
        # Initialize ADAS modules
        self.collision_warning = CollisionWarning(ego_velocity=ego_velocity)
        self.lane_keeping = LaneKeeping()
        self.distance_estimator = DistanceEstimator()
        self.scene_reconstructor = SceneReconstruction()
        
        # Depth estimation pipeline (lazy loaded)
        self._depth_pipe = None
        self._yolo_model = None
        
        # Processing state
        self.status = ProcessingStatus.IDLE
        self.current_video: Optional[str] = None
        self.processed_frames = 0
        self.total_frames = 0
        
        # Performance tracking
        self._last_frame_times: List[float] = []
        
    @property
    def depth_pipe(self):
        """Lazy load Depth Anything model."""
        if self._depth_pipe is None and self.enable_depth_model:
            self._load_depth_model()
        return self._depth_pipe
    
    @property
    def yolo_model(self):
        """Lazy load YOLO model for object detection."""
        if self._yolo_model is None:
            self._load_yolo_model()
        return self._yolo_model
    
    def _load_depth_model(self):
        """Load Depth Anything V2 model."""
        try:
            from transformers import pipeline
            
            model_configs = {
                "small": "depth-anything/Depth-Anything-V2-Small-hf",
                "base": "depth-anything/Depth-Anything-V2-Base-hf",
                "large": "depth-anything/Depth-Anything-V2-Large-hf",
            }
            
            model_name = model_configs.get(self.model_size, model_configs["small"])
            print(f"🔧 Loading Depth Anything model: {model_name}")
            
            self._depth_pipe = pipeline(
                task="depth-estimation",
                model=model_name,
                device=-1,  # CPU
            )
            print("✅ Depth model loaded!")
            
        except Exception as e:
            print(f"⚠️ Could not load depth model: {e}")
            self._depth_pipe = None
    
    def _load_yolo_model(self):
        """Load YOLOv8 for object detection."""
        try:
            from ultralytics import YOLO
            
            print("🔧 Loading YOLOv8 model...")
            self._yolo_model = YOLO("yolov8n.pt")
            print("✅ YOLO model loaded!")
            
        except Exception as e:
            print(f"⚠️ Could not load YOLO model: {e}")
            self._yolo_model = None
    
    def update_ego_velocity(self, velocity: float):
        """Update ego vehicle velocity."""
        self.ego_velocity = max(0, velocity)
        self.collision_warning.update_ego_velocity(velocity)
    
    def process_frame(
        self,
        frame: np.ndarray,
        depth_map: Optional[np.ndarray] = None,
        frame_id: int = 0,
    ) -> ADASState:
        """
        Process a single frame through all ADAS modules.
        
        Args:
            frame: BGR image
            depth_map: Pre-computed depth map (optional)
            frame_id: Frame number
            
        Returns:
            Unified ADAS state
        """
        import cv2
        from PIL import Image
        
        start_time = time.time()
        h, w = frame.shape[:2]
        
        # === Depth Estimation ===
        if depth_map is None and self.depth_pipe is not None:
            # Convert and run depth estimation
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(frame_rgb)
            result = self.depth_pipe(pil_image)
            depth_map = np.array(result["depth"])
            # Normalize to 0-1 (higher = closer)
            depth_map = cv2.normalize(depth_map, None, 0, 1, cv2.NORM_MINMAX).astype(np.float32)
        elif depth_map is None:
            # Fallback: create dummy depth
            depth_map = np.zeros((h, w), dtype=np.float32)
        
        # === Object Detection ===
        detected_objects = []
        if self.yolo_model is not None:
            results = self.yolo_model(frame, verbose=False)
            for result in results:
                for box in result.boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                    cls = int(box.cls[0])
                    conf = float(box.conf[0])
                    label = self.yolo_model.names[cls]
                    
                    # Estimate distance from depth map
                    distance = self.distance_estimator.estimate_for_bbox(
                        depth_map, x1, y1, x2, y2
                    )
                    
                    detected_objects.append({
                        'object_id': hash(f"{x1}{y1}{x2}{y2}") % 10000,
                        'object_class': label,
                        'distance': distance,
                        'bbox': (x1, y1, x2, y2),
                        'confidence': conf,
                    })
        
        # === Collision Warning ===
        warning_state = self.collision_warning.analyze(
            detected_objects, frame_width=w
        )
        
        # === Lane Keeping ===
        lane_state = self.lane_keeping.detect(frame)
        
        # === Distance ===
        min_dist, _ = self.distance_estimator.get_closest_object_distance(depth_map)
        distance_zone = self.distance_estimator.get_zone(min_dist)
        
        # === Performance ===
        processing_time = (time.time() - start_time) * 1000  # ms
        self._last_frame_times.append(processing_time)
        if len(self._last_frame_times) > 30:
            self._last_frame_times.pop(0)
        avg_time = sum(self._last_frame_times) / len(self._last_frame_times)
        fps = 1000 / avg_time if avg_time > 0 else 0
        
        # === Build State ===
        threats_data = []
        for threat in warning_state.active_threats[:5]:
            threats_data.append({
                'object_class': threat.object_class,
                'distance': round(threat.distance, 1),
                'ttc': round(threat.ttc, 1),
                'level': threat.warning_level.name,
            })
        
        return ADASState(
            timestamp=time.time(),
            frame_id=frame_id,
            warning_level=warning_state.highest_level.name,
            warning_message=warning_state.warning_message,
            threats=threats_data,
            brake_assist=warning_state.brake_assist_triggered,
            lane_status=lane_state.departure_status.value,
            center_offset=round(lane_state.center_offset, 2),
            suggested_steering=round(lane_state.suggested_steering, 1),
            lane_confidence=round(lane_state.confidence, 2),
            min_distance=round(min_dist, 1),
            distance_zone=distance_zone,
            fps=round(fps, 1),
            processing_time_ms=round(processing_time, 1),
        )
    
    async def process_video(
        self,
        video_path: str,
        scale: float = 0.5,
        skip_frames: int = 2,
    ) -> AsyncGenerator[ADASState, None]:
        """
        Process video and yield ADAS states.
        
        Args:
            video_path: Path to video file
            scale: Processing scale (0.5 = 50%)
            skip_frames: Process every Nth frame
            
        Yields:
            ADASState for each processed frame
        """
        import cv2
        
        self.status = ProcessingStatus.LOADING_MODEL
        self.current_video = video_path
        
        try:
            # Ensure models are loaded
            _ = self.depth_pipe
            _ = self.yolo_model
            
            self.status = ProcessingStatus.PROCESSING
            
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                self.status = ProcessingStatus.ERROR
                raise ValueError(f"Could not open video: {video_path}")
            
            self.total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            self.processed_frames = 0
            frame_count = 0
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                frame_count += 1
                
                # Skip frames
                if (frame_count - 1) % skip_frames != 0:
                    continue
                
                # Scale down for faster processing
                if scale != 1.0:
                    h, w = frame.shape[:2]
                    frame = cv2.resize(frame, (int(w * scale), int(h * scale)))
                
                # Process frame
                state = self.process_frame(frame, frame_id=frame_count)
                self.processed_frames = frame_count
                
                yield state
                
                # Yield control to event loop
                await asyncio.sleep(0)
            
            cap.release()
            self.status = ProcessingStatus.COMPLETED
            
        except Exception as e:
            self.status = ProcessingStatus.ERROR
            raise
    
    def get_status(self) -> Dict[str, Any]:
        """Get current processing status."""
        return {
            'status': self.status.value,
            'current_video': self.current_video,
            'processed_frames': self.processed_frames,
            'total_frames': self.total_frames,
            'progress': (self.processed_frames / self.total_frames * 100) if self.total_frames > 0 else 0,
        }
    
    def to_json(self, state: ADASState) -> str:
        """Convert ADASState to JSON string."""
        return json.dumps(asdict(state))


# Singleton instance
adas_service = DepthADASService(enable_depth_model=False)  # Start without heavy models


# ============================================================================
# Testing
# ============================================================================

if __name__ == "__main__":
    import cv2
    
    print("🚗 Depth ADAS Service Test")
    
    service = DepthADASService(enable_depth_model=False)
    
    # Create test frame
    test_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.rectangle(test_frame, (200, 200), (300, 350), (0, 255, 0), -1)
    
    # Process
    state = service.process_frame(test_frame, frame_id=1)
    
    print(f"\n📊 ADAS State:")
    print(f"   Warning: {state.warning_level}")
    print(f"   Lane: {state.lane_status}")
    print(f"   Min Distance: {state.min_distance}m ({state.distance_zone})")
    print(f"   FPS: {state.fps}")
    
    print("\n✅ Test complete!")
