#!/usr/bin/env python3
"""
Collision Warning System
Real-time collision detection and warning generation.

Features:
- Time-to-Collision (TTC) calculation
- Forward Collision Warning (FCW)
- Proximity zone alerts (danger/warning/safe)
- Multi-object tracking and priority
- Audio/Visual warning generation
"""

import numpy as np
from typing import List, Tuple, Optional, Dict, Any
from dataclasses import dataclass, field
from enum import Enum
import time


class WarningLevel(Enum):
    """Warning severity levels."""
    NONE = 0
    INFO = 1
    WARNING = 2
    DANGER = 3
    CRITICAL = 4


class WarningType(Enum):
    """Types of collision warnings."""
    FORWARD_COLLISION = "forward_collision"
    PEDESTRIAN = "pedestrian"
    CYCLIST = "cyclist"
    SIDE_COLLISION = "side_collision"
    REAR_COLLISION = "rear_collision"
    LANE_DEPARTURE = "lane_departure"


@dataclass
class CollisionThreat:
    """Represents a potential collision threat."""
    object_id: int
    object_class: str
    distance: float  # meters
    relative_velocity: float  # m/s (negative = approaching)
    ttc: float  # Time to collision (seconds)
    lateral_offset: float  # meters from center
    warning_level: WarningLevel
    warning_type: WarningType
    confidence: float
    
    @property
    def is_critical(self) -> bool:
        return self.warning_level in [WarningLevel.DANGER, WarningLevel.CRITICAL]


@dataclass
class WarningState:
    """Current warning system state."""
    timestamp: float
    active_threats: List[CollisionThreat] = field(default_factory=list)
    highest_level: WarningLevel = WarningLevel.NONE
    primary_threat: Optional[CollisionThreat] = None
    warning_message: str = ""
    audio_alert: bool = False
    brake_assist_triggered: bool = False


class CollisionWarning:
    """
    Collision Warning System (CWS)
    
    Analyzes detected objects and their trajectories to generate
    collision warnings with varying severity levels.
    """
    
    # TTC thresholds (seconds)
    TTC_CRITICAL = 1.0  # Emergency brake territory
    TTC_DANGER = 2.0    # Hard braking recommended
    TTC_WARNING = 3.5   # Moderate alert
    TTC_INFO = 5.0      # Informational
    
    # Distance thresholds (meters)
    DIST_CRITICAL = 3.0
    DIST_DANGER = 8.0
    DIST_WARNING = 15.0
    DIST_SAFE = 30.0
    
    # Lateral threshold for forward collision (meters)
    LATERAL_THRESHOLD = 2.0
    
    def __init__(
        self,
        ego_velocity: float = 10.0,  # Default ego vehicle velocity (m/s)
        min_confidence: float = 0.5,
        enable_audio: bool = True,
    ):
        """
        Initialize collision warning system.
        
        Args:
            ego_velocity: Ego vehicle velocity (m/s)
            min_confidence: Minimum detection confidence
            enable_audio: Enable audio alerts
        """
        self.ego_velocity = ego_velocity
        self.min_confidence = min_confidence
        self.enable_audio = enable_audio
        
        # Object tracking history
        self.object_history: Dict[int, List[Tuple[float, float, float]]] = {}  # id -> [(time, distance, lat)]
        self.history_window = 1.0  # seconds
        
        # Warning state
        self.last_warning_time: Dict[str, float] = {}
        self.warning_cooldown = 0.5  # seconds between repeated warnings
        
        # Priority weights for different object classes
        self.class_priority = {
            "person": 1.0,
            "bicycle": 0.9,
            "motorcycle": 0.8,
            "car": 0.7,
            "truck": 0.7,
            "bus": 0.7,
        }
    
    def update_ego_velocity(self, velocity: float):
        """Update ego vehicle velocity."""
        self.ego_velocity = max(0, velocity)
    
    def analyze(
        self,
        detected_objects: List[Dict[str, Any]],
        frame_width: int,
        timestamp: Optional[float] = None,
    ) -> WarningState:
        """
        Analyze detected objects and generate warnings.
        
        Args:
            detected_objects: List of detected objects with:
                - object_id: int
                - object_class: str
                - distance: float (meters)
                - bbox: (x1, y1, x2, y2)
                - confidence: float
            frame_width: Image width for lateral position calculation
            timestamp: Current timestamp
            
        Returns:
            WarningState with active threats and warnings
        """
        timestamp = timestamp or time.time()
        
        threats: List[CollisionThreat] = []
        
        for obj in detected_objects:
            if obj.get('confidence', 1.0) < self.min_confidence:
                continue
            
            threat = self._evaluate_threat(obj, frame_width, timestamp)
            if threat and threat.warning_level != WarningLevel.NONE:
                threats.append(threat)
        
        # Sort by priority (TTC first, then distance)
        threats.sort(key=lambda t: (t.ttc, t.distance))
        
        # Determine overall warning state
        state = WarningState(timestamp=timestamp)
        state.active_threats = threats
        
        if threats:
            state.primary_threat = threats[0]
            state.highest_level = max(t.warning_level for t in threats)
            state.warning_message = self._generate_warning_message(threats[0])
            state.audio_alert = (
                self.enable_audio and 
                state.highest_level.value >= WarningLevel.WARNING.value
            )
            state.brake_assist_triggered = (
                state.highest_level == WarningLevel.CRITICAL
            )
        
        return state
    
    def _evaluate_threat(
        self,
        obj: Dict[str, Any],
        frame_width: int,
        timestamp: float,
    ) -> Optional[CollisionThreat]:
        """Evaluate threat level for a single object."""
        object_id = obj.get('object_id', hash(str(obj)))
        object_class = obj.get('object_class', 'unknown')
        distance = obj.get('distance', float('inf'))
        confidence = obj.get('confidence', 1.0)
        bbox = obj.get('bbox', (0, 0, 0, 0))
        
        if distance <= 0 or distance > self.DIST_SAFE:
            return None
        
        # Calculate lateral offset
        if bbox:
            x1, y1, x2, y2 = bbox
            center_x = (x1 + x2) / 2
            lateral_offset = (center_x - frame_width / 2) / (frame_width / 2) * 3.0  # Rough meters
        else:
            lateral_offset = 0.0
        
        # Update tracking history
        self._update_history(object_id, timestamp, distance, lateral_offset)
        
        # Calculate relative velocity from history
        relative_velocity = self._estimate_velocity(object_id)
        
        # Calculate Time to Collision
        ttc = self._calculate_ttc(distance, relative_velocity)
        
        # Determine warning level
        warning_level = self._determine_warning_level(
            distance, ttc, lateral_offset, object_class
        )
        
        # Determine warning type
        warning_type = self._determine_warning_type(object_class, lateral_offset)
        
        return CollisionThreat(
            object_id=object_id,
            object_class=object_class,
            distance=distance,
            relative_velocity=relative_velocity,
            ttc=ttc,
            lateral_offset=lateral_offset,
            warning_level=warning_level,
            warning_type=warning_type,
            confidence=confidence,
        )
    
    def _update_history(
        self,
        object_id: int,
        timestamp: float,
        distance: float,
        lateral: float,
    ):
        """Update object tracking history."""
        if object_id not in self.object_history:
            self.object_history[object_id] = []
        
        history = self.object_history[object_id]
        history.append((timestamp, distance, lateral))
        
        # Remove old entries
        cutoff = timestamp - self.history_window
        self.object_history[object_id] = [
            (t, d, l) for t, d, l in history if t > cutoff
        ]
    
    def _estimate_velocity(self, object_id: int) -> float:
        """Estimate relative velocity from tracking history."""
        history = self.object_history.get(object_id, [])
        
        if len(history) < 2:
            return 0.0
        
        # Use first and last points
        t1, d1, _ = history[0]
        t2, d2, _ = history[-1]
        
        dt = t2 - t1
        if dt < 0.01:
            return 0.0
        
        # Negative velocity = approaching
        velocity = (d2 - d1) / dt
        return velocity
    
    def _calculate_ttc(self, distance: float, relative_velocity: float) -> float:
        """Calculate Time to Collision."""
        # Relative velocity with ego motion
        # Negative relative_velocity means object is approaching
        closing_velocity = self.ego_velocity - relative_velocity
        
        if closing_velocity <= 0:
            return float('inf')  # Not approaching
        
        ttc = distance / closing_velocity
        return max(0, ttc)
    
    def _determine_warning_level(
        self,
        distance: float,
        ttc: float,
        lateral_offset: float,
        object_class: str,
    ) -> WarningLevel:
        """Determine warning level based on threat parameters."""
        
        # Check if object is in our path (lateral threshold)
        if abs(lateral_offset) > self.LATERAL_THRESHOLD:
            # Object is to the side, reduce severity
            return WarningLevel.INFO if distance < self.DIST_WARNING else WarningLevel.NONE
        
        # Priority boost for vulnerable road users
        priority = self.class_priority.get(object_class, 0.5)
        
        # TTC-based warnings
        if ttc < self.TTC_CRITICAL:
            return WarningLevel.CRITICAL
        elif ttc < self.TTC_DANGER:
            return WarningLevel.DANGER
        elif ttc < self.TTC_WARNING:
            return WarningLevel.WARNING
        elif ttc < self.TTC_INFO:
            return WarningLevel.INFO
        
        # Distance-based fallback
        if distance < self.DIST_CRITICAL:
            return WarningLevel.DANGER
        elif distance < self.DIST_DANGER:
            return WarningLevel.WARNING
        elif distance < self.DIST_WARNING:
            return WarningLevel.INFO
        
        return WarningLevel.NONE
    
    def _determine_warning_type(
        self,
        object_class: str,
        lateral_offset: float,
    ) -> WarningType:
        """Determine type of collision warning."""
        if object_class == "person":
            return WarningType.PEDESTRIAN
        elif object_class in ["bicycle", "motorcycle"]:
            return WarningType.CYCLIST
        elif abs(lateral_offset) > 1.5:
            return WarningType.SIDE_COLLISION
        else:
            return WarningType.FORWARD_COLLISION
    
    def _generate_warning_message(self, threat: CollisionThreat) -> str:
        """Generate human-readable warning message."""
        messages = {
            WarningLevel.CRITICAL: "⚠️ BRAKE NOW!",
            WarningLevel.DANGER: "🔴 Collision risk!",
            WarningLevel.WARNING: "🟠 Caution ahead",
            WarningLevel.INFO: "🟡 Object detected",
        }
        
        base_msg = messages.get(threat.warning_level, "")
        
        if threat.warning_type == WarningType.PEDESTRIAN:
            target = "Pedestrian"
        elif threat.warning_type == WarningType.CYCLIST:
            target = "Cyclist"
        else:
            target = threat.object_class.title()
        
        return f"{base_msg} {target} at {threat.distance:.1f}m (TTC: {threat.ttc:.1f}s)"
    
    def draw_warnings(
        self,
        frame: np.ndarray,
        state: WarningState,
    ) -> np.ndarray:
        """
        Draw warning overlays on frame.
        
        Args:
            frame: BGR image
            state: Current warning state
            
        Returns:
            Frame with warning overlays
        """
        import cv2
        
        output = frame.copy()
        h, w = output.shape[:2]
        
        # Warning colors
        colors = {
            WarningLevel.CRITICAL: (0, 0, 255),  # Red
            WarningLevel.DANGER: (0, 0, 200),
            WarningLevel.WARNING: (0, 165, 255),  # Orange
            WarningLevel.INFO: (0, 255, 255),  # Yellow
        }
        
        # Draw warning banner if active
        if state.highest_level.value >= WarningLevel.WARNING.value:
            color = colors.get(state.highest_level, (255, 255, 255))
            
            # Semi-transparent overlay at top
            overlay = output.copy()
            cv2.rectangle(overlay, (0, 0), (w, 60), color, -1)
            output = cv2.addWeighted(overlay, 0.4, output, 0.6, 0)
            
            # Warning text
            cv2.putText(
                output, state.warning_message,
                (10, 40),
                cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2
            )
        
        # Draw TTC for each threat
        for i, threat in enumerate(state.active_threats[:5]):  # Max 5
            y = 80 + i * 25
            color = colors.get(threat.warning_level, (200, 200, 200))
            
            text = f"{threat.object_class}: {threat.distance:.1f}m | TTC: {threat.ttc:.1f}s"
            cv2.putText(
                output, text,
                (10, y),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1
            )
        
        # Draw danger zone indicator
        if state.highest_level == WarningLevel.CRITICAL:
            # Flash border
            if int(time.time() * 4) % 2:  # Flash at 4Hz
                cv2.rectangle(output, (0, 0), (w - 1, h - 1), (0, 0, 255), 10)
        
        return output
    
    def clear_history(self):
        """Clear object tracking history."""
        self.object_history.clear()


# ============================================================================
# Testing
# ============================================================================

if __name__ == "__main__":
    print("🚨 Collision Warning System Test")
    
    cws = CollisionWarning(ego_velocity=15.0)
    
    # Simulate detected objects
    test_objects = [
        {
            'object_id': 1,
            'object_class': 'car',
            'distance': 8.0,
            'bbox': (300, 200, 400, 350),
            'confidence': 0.9,
        },
        {
            'object_id': 2,
            'object_class': 'person',
            'distance': 5.0,
            'bbox': (320, 250, 360, 400),
            'confidence': 0.85,
        },
    ]
    
    # Analyze threats
    state = cws.analyze(test_objects, frame_width=640)
    
    print(f"\nWarning Level: {state.highest_level.name}")
    print(f"Message: {state.warning_message}")
    print(f"Active Threats: {len(state.active_threats)}")
    
    for threat in state.active_threats:
        print(f"  - {threat.object_class}: {threat.distance:.1f}m, TTC={threat.ttc:.1f}s")
    
    print("\n✅ Test complete!")
