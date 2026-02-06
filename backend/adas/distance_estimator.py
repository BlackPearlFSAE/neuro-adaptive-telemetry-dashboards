#!/usr/bin/env python3
"""
Distance Estimator Module
Estimates real-world distances from depth maps and camera parameters.

Features:
- Point distance estimation
- Object distance estimation (using bounding boxes)
- Ground plane distance
- Camera calibration support
"""

import numpy as np
from typing import Tuple, Optional, List
from dataclasses import dataclass


@dataclass
class CameraCalibration:
    """Camera intrinsic and extrinsic parameters."""
    # Intrinsic parameters
    fx: float = 500.0  # Focal length X (pixels)
    fy: float = 500.0  # Focal length Y (pixels)
    cx: float = 320.0  # Principal point X
    cy: float = 240.0  # Principal point Y
    
    # Extrinsic parameters (camera pose relative to ground)
    height: float = 1.5  # Camera height from ground (meters)
    pitch: float = 0.0  # Camera pitch angle (radians, positive = looking down)
    
    # Depth scale
    depth_scale: float = 10.0  # Scale factor for metric depth
    
    @property
    def intrinsic_matrix(self) -> np.ndarray:
        """Get 3x3 camera intrinsic matrix."""
        return np.array([
            [self.fx, 0, self.cx],
            [0, self.fy, self.cy],
            [0, 0, 1]
        ], dtype=np.float32)


class DistanceEstimator:
    """
    Estimate real-world distances from monocular depth maps.
    
    This module converts normalized depth values to metric distances
    using camera calibration parameters.
    """
    
    def __init__(self, calibration: Optional[CameraCalibration] = None):
        """
        Initialize distance estimator.
        
        Args:
            calibration: Camera calibration parameters
        """
        self.calibration = calibration or CameraCalibration()
        
        # Distance zones (meters)
        self.zone_danger = 5.0      # Red zone
        self.zone_warning = 15.0    # Orange zone
        self.zone_safe = 30.0       # Green zone
    
    def estimate_at_point(
        self,
        depth_map: np.ndarray,
        x: int,
        y: int,
        window_size: int = 5
    ) -> float:
        """
        Estimate distance at a specific pixel.
        
        Args:
            depth_map: Normalized depth map (0-1, higher = closer)
            x, y: Pixel coordinates
            window_size: Averaging window radius
            
        Returns:
            Estimated distance in meters
        """
        h, w = depth_map.shape[:2]
        
        # Clamp to valid range
        x = max(window_size, min(w - window_size - 1, x))
        y = max(window_size, min(h - window_size - 1, y))
        
        # Get average depth in window
        window = depth_map[
            y - window_size:y + window_size + 1,
            x - window_size:x + window_size + 1
        ]
        
        avg_depth = np.mean(window)
        
        # Convert to metric distance
        return self._depth_to_distance(avg_depth)
    
    def estimate_for_bbox(
        self,
        depth_map: np.ndarray,
        x1: int,
        y1: int,
        x2: int,
        y2: int,
        method: str = "bottom_center"
    ) -> float:
        """
        Estimate distance to object defined by bounding box.
        
        Args:
            depth_map: Normalized depth map
            x1, y1, x2, y2: Bounding box coordinates
            method: Distance estimation method
                - "center": Use center of bbox
                - "bottom_center": Use bottom center (for ground objects)
                - "min": Use minimum distance (closest point)
                - "median": Use median distance
                
        Returns:
            Estimated distance in meters
        """
        h, w = depth_map.shape[:2]
        
        # Clamp coordinates
        x1, x2 = max(0, x1), min(w, x2)
        y1, y2 = max(0, y1), min(h, y2)
        
        if x2 <= x1 or y2 <= y1:
            return float('inf')
        
        if method == "center":
            cx = (x1 + x2) // 2
            cy = (y1 + y2) // 2
            return self.estimate_at_point(depth_map, cx, cy)
        
        elif method == "bottom_center":
            cx = (x1 + x2) // 2
            cy = y2 - 5  # Slightly above bottom
            return self.estimate_at_point(depth_map, cx, cy, window_size=10)
        
        elif method == "min":
            roi = depth_map[y1:y2, x1:x2]
            if roi.size == 0:
                return float('inf')
            max_depth = np.max(roi)  # Max depth = closest
            return self._depth_to_distance(max_depth)
        
        elif method == "median":
            roi = depth_map[y1:y2, x1:x2]
            if roi.size == 0:
                return float('inf')
            median_depth = np.median(roi)
            return self._depth_to_distance(median_depth)
        
        else:
            raise ValueError(f"Unknown method: {method}")
    
    def estimate_ground_distance(
        self,
        depth_map: np.ndarray,
        y_ratio: float = 0.9
    ) -> np.ndarray:
        """
        Estimate distance along ground plane.
        
        Args:
            depth_map: Normalized depth map
            y_ratio: Y position ratio (0=top, 1=bottom)
            
        Returns:
            Array of distances across image width
        """
        h, w = depth_map.shape[:2]
        y = int(h * y_ratio)
        
        # Get depth values along horizontal line
        depth_line = depth_map[y, :]
        
        # Convert to distances
        distances = np.array([
            self._depth_to_distance(d) for d in depth_line
        ])
        
        return distances
    
    def create_distance_map(self, depth_map: np.ndarray) -> np.ndarray:
        """
        Convert entire depth map to distance map.
        
        Args:
            depth_map: Normalized depth map (0-1)
            
        Returns:
            Distance map in meters
        """
        # Vectorized conversion
        distance_map = np.where(
            depth_map > 0.01,
            self.calibration.depth_scale / depth_map,
            100.0  # Max distance for very low depth values
        )
        
        return np.clip(distance_map, 0, 100)
    
    def get_zone(self, distance: float) -> str:
        """
        Get danger zone for given distance.
        
        Args:
            distance: Distance in meters
            
        Returns:
            Zone name: "danger", "warning", or "safe"
        """
        if distance < self.zone_danger:
            return "danger"
        elif distance < self.zone_warning:
            return "warning"
        else:
            return "safe"
    
    def get_zone_color(self, distance: float) -> Tuple[int, int, int]:
        """
        Get BGR color for danger zone.
        
        Args:
            distance: Distance in meters
            
        Returns:
            BGR color tuple
        """
        zone = self.get_zone(distance)
        if zone == "danger":
            return (0, 0, 255)  # Red
        elif zone == "warning":
            return (0, 165, 255)  # Orange
        else:
            return (0, 255, 0)  # Green
    
    def _depth_to_distance(self, depth: float) -> float:
        """
        Convert normalized depth to metric distance.
        
        Args:
            depth: Normalized depth value (0-1, higher = closer)
            
        Returns:
            Distance in meters
        """
        if depth < 0.01:
            return 100.0  # Max distance
        
        # Inverse relationship: closer objects have higher depth values
        distance = self.calibration.depth_scale / depth
        
        return min(distance, 100.0)
    
    def calibrate_from_known_distance(
        self,
        depth_value: float,
        actual_distance: float
    ):
        """
        Calibrate depth scale from known distance measurement.
        
        Args:
            depth_value: Measured normalized depth value
            actual_distance: Known actual distance in meters
        """
        if depth_value > 0.01:
            self.calibration.depth_scale = actual_distance * depth_value
            print(f"✅ Calibrated depth_scale = {self.calibration.depth_scale:.2f}")
    
    def get_closest_object_distance(
        self,
        depth_map: np.ndarray,
        roi: Optional[Tuple[int, int, int, int]] = None
    ) -> Tuple[float, Tuple[int, int]]:
        """
        Find closest point in depth map.
        
        Args:
            depth_map: Normalized depth map
            roi: Optional (x1, y1, x2, y2) region of interest
            
        Returns:
            (distance, (x, y)) of closest point
        """
        if roi:
            x1, y1, x2, y2 = roi
            region = depth_map[y1:y2, x1:x2]
            offset = (x1, y1)
        else:
            region = depth_map
            offset = (0, 0)
        
        # Find maximum depth (closest point)
        max_idx = np.unravel_index(np.argmax(region), region.shape)
        max_depth = region[max_idx]
        
        # Convert to image coordinates
        y, x = max_idx
        x += offset[0]
        y += offset[1]
        
        distance = self._depth_to_distance(max_depth)
        
        return distance, (x, y)


# ============================================================================
# Testing
# ============================================================================

if __name__ == "__main__":
    print("🔧 Distance Estimator Test")
    
    # Create test depth map
    depth_map = np.random.rand(480, 640).astype(np.float32)
    
    estimator = DistanceEstimator()
    
    # Test point distance
    dist = estimator.estimate_at_point(depth_map, 320, 240)
    print(f"Distance at center: {dist:.2f}m")
    
    # Test bbox distance
    dist = estimator.estimate_for_bbox(depth_map, 100, 200, 200, 400)
    print(f"Distance to bbox: {dist:.2f}m")
    
    # Test zone
    print(f"Zone: {estimator.get_zone(dist)}")
    
    print("✅ Test complete!")
