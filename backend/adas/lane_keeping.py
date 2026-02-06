#!/usr/bin/env python3
"""
Lane Keeping Assist System
Advanced lane detection and departure warning.

Features:
- Lane line detection (Hough + polynomial fitting)
- Lane departure warning
- Road width estimation
- Curvature analysis
- Steering angle suggestion
"""

import numpy as np
import cv2
from typing import Tuple, Optional, List
from dataclasses import dataclass
from enum import Enum
import time


class LaneDepartureStatus(Enum):
    """Lane departure status."""
    CENTERED = "centered"
    DRIFTING_LEFT = "drifting_left"
    DRIFTING_RIGHT = "drifting_right"
    DEPARTED_LEFT = "departed_left"
    DEPARTED_RIGHT = "departed_right"
    NO_LANE = "no_lane"


@dataclass
class LaneState:
    """Current lane detection state."""
    # Lane polynomials (x = f(y))
    left_poly: Optional[np.ndarray] = None
    right_poly: Optional[np.ndarray] = None
    center_poly: Optional[np.ndarray] = None
    
    # Lane metrics
    road_width: float = 3.5  # meters
    center_offset: float = 0.0  # meters (positive = right of center)
    curvature_radius: float = float('inf')  # meters
    heading_angle: float = 0.0  # degrees
    
    # Status
    departure_status: LaneDepartureStatus = LaneDepartureStatus.NO_LANE
    confidence: float = 0.0
    
    # Steering suggestion (positive = turn right)
    suggested_steering: float = 0.0


class LaneKeeping:
    """
    Lane Keeping Assist (LKA) System
    
    Detects lane markings and provides departure warnings
    and steering suggestions to keep vehicle centered.
    """
    
    # Departure thresholds (meters from center)
    DRIFT_THRESHOLD = 0.3
    DEPARTURE_THRESHOLD = 0.7
    
    # Lane width assumptions
    MIN_LANE_WIDTH = 2.5  # meters
    MAX_LANE_WIDTH = 4.5  # meters
    DEFAULT_LANE_WIDTH = 3.5  # meters
    
    def __init__(
        self,
        roi_top_ratio: float = 0.55,
        history_size: int = 7,
        enable_smoothing: bool = True,
    ):
        """
        Initialize lane keeping system.
        
        Args:
            roi_top_ratio: Top of ROI as ratio of image height
            history_size: Number of frames for lane smoothing
            enable_smoothing: Enable temporal smoothing
        """
        self.roi_top_ratio = roi_top_ratio
        self.history_size = history_size
        self.enable_smoothing = enable_smoothing
        
        # Lane history for smoothing
        self.left_history: List[np.ndarray] = []
        self.right_history: List[np.ndarray] = []
        
        # Camera calibration (pixels per meter at different heights)
        self.ppm_bottom = 100  # pixels per meter at bottom of image
        self.ppm_top = 30  # pixels per meter at top of ROI
        
        # Perspective transform matrices (computed on first frame)
        self.M = None
        self.Minv = None
        self.warped_size = (400, 600)
    
    def detect(self, frame: np.ndarray) -> LaneState:
        """
        Detect lanes and compute lane keeping metrics.
        
        Args:
            frame: BGR image
            
        Returns:
            LaneState with detected lane info
        """
        h, w = frame.shape[:2]
        
        # Compute perspective transform if not done
        if self.M is None:
            self._compute_perspective(w, h)
        
        # Apply perspective transform
        warped = cv2.warpPerspective(frame, self.M, self.warped_size)
        
        # Extract lane pixels
        left_pixels, right_pixels = self._extract_lane_pixels(warped)
        
        # Fit polynomials
        left_poly = self._fit_polynomial(left_pixels) if len(left_pixels[0]) > 100 else None
        right_poly = self._fit_polynomial(right_pixels) if len(right_pixels[0]) > 100 else None
        
        # Apply smoothing
        if self.enable_smoothing:
            left_poly = self._smooth_lane(left_poly, self.left_history)
            right_poly = self._smooth_lane(right_poly, self.right_history)
        
        # Compute metrics
        state = self._compute_metrics(left_poly, right_poly, w, h)
        
        return state
    
    def _compute_perspective(self, w: int, h: int):
        """Compute perspective transform matrices."""
        # Source points (trapezoid in original image)
        top_y = int(h * self.roi_top_ratio)
        src = np.float32([
            [w * 0.15, h],          # Bottom left
            [w * 0.45, top_y],       # Top left
            [w * 0.55, top_y],       # Top right
            [w * 0.85, h],          # Bottom right
        ])
        
        # Destination points (rectangle in warped image)
        dst = np.float32([
            [100, self.warped_size[1]],
            [100, 0],
            [self.warped_size[0] - 100, 0],
            [self.warped_size[0] - 100, self.warped_size[1]],
        ])
        
        self.M = cv2.getPerspectiveTransform(src, dst)
        self.Minv = cv2.getPerspectiveTransform(dst, src)
    
    def _extract_lane_pixels(
        self,
        warped: np.ndarray
    ) -> Tuple[Tuple[np.ndarray, np.ndarray], Tuple[np.ndarray, np.ndarray]]:
        """Extract lane pixels using color and gradient thresholds."""
        # Convert to different color spaces
        hls = cv2.cvtColor(warped, cv2.COLOR_BGR2HLS)
        lab = cv2.cvtColor(warped, cv2.COLOR_BGR2LAB)
        gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
        
        # S channel (saturation) - good for colored lanes
        s_channel = hls[:, :, 2]
        s_binary = np.zeros_like(s_channel)
        s_binary[(s_channel >= 100) & (s_channel <= 255)] = 1
        
        # B channel (LAB) - good for yellow
        b_channel = lab[:, :, 2]
        b_binary = np.zeros_like(b_channel)
        b_binary[(b_channel >= 145) & (b_channel <= 200)] = 1
        
        # L channel (lightness) - good for white lanes
        l_channel = hls[:, :, 1]
        l_binary = np.zeros_like(l_channel)
        l_binary[(l_channel >= 200) & (l_channel <= 255)] = 1
        
        # Gradient (Sobel X)
        sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        abs_sobelx = np.absolute(sobelx)
        scaled_sobel = np.uint8(255 * abs_sobelx / np.max(abs_sobelx))
        sobel_binary = np.zeros_like(scaled_sobel)
        sobel_binary[(scaled_sobel >= 30) & (scaled_sobel <= 150)] = 1
        
        # Combine all
        combined = np.zeros_like(gray)
        combined[(s_binary == 1) | (l_binary == 1) | (b_binary == 1) | (sobel_binary == 1)] = 1
        
        # Split into left and right halves
        midpoint = combined.shape[1] // 2
        
        # Use sliding window to find lane pixels
        left_pixels = self._sliding_window_search(combined[:, :midpoint], offset=0)
        right_pixels = self._sliding_window_search(combined[:, midpoint:], offset=midpoint)
        
        return left_pixels, right_pixels
    
    def _sliding_window_search(
        self,
        binary: np.ndarray,
        n_windows: int = 9,
        margin: int = 50,
        min_pixels: int = 50,
        offset: int = 0,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Find lane pixels using sliding window search."""
        h, w = binary.shape
        
        # Find starting point from histogram of bottom quarter
        histogram = np.sum(binary[3*h//4:, :], axis=0)
        if np.max(histogram) == 0:
            return (np.array([]), np.array([]))
        
        base = np.argmax(histogram)
        
        window_height = h // n_windows
        
        # Current position
        current = base
        
        lane_inds = []
        
        for window in range(n_windows):
            # Window boundaries
            win_y_low = h - (window + 1) * window_height
            win_y_high = h - window * window_height
            win_x_low = max(0, current - margin)
            win_x_high = min(w, current + margin)
            
            # Find nonzero pixels in window
            nonzero = binary.nonzero()
            nonzeroy = np.array(nonzero[0])
            nonzerox = np.array(nonzero[1])
            
            good_inds = (
                (nonzeroy >= win_y_low) & (nonzeroy < win_y_high) &
                (nonzerox >= win_x_low) & (nonzerox < win_x_high)
            ).nonzero()[0]
            
            lane_inds.append(good_inds)
            
            # Recenter next window
            if len(good_inds) > min_pixels:
                current = int(np.mean(nonzerox[good_inds]))
        
        # Concatenate indices
        lane_inds = np.concatenate(lane_inds) if lane_inds else np.array([])
        
        if len(lane_inds) == 0:
            return (np.array([]), np.array([]))
        
        nonzero = binary.nonzero()
        x = nonzero[1][lane_inds] + offset
        y = nonzero[0][lane_inds]
        
        return (x, y)
    
    def _fit_polynomial(
        self,
        pixels: Tuple[np.ndarray, np.ndarray],
        degree: int = 2
    ) -> Optional[np.ndarray]:
        """Fit polynomial to lane pixels."""
        x, y = pixels
        
        if len(x) < 10:
            return None
        
        try:
            # Fit x = f(y) (2nd degree polynomial)
            coeffs = np.polyfit(y, x, degree)
            return coeffs
        except (np.RankWarning, np.linalg.LinAlgError):
            return None
    
    def _smooth_lane(
        self,
        poly: Optional[np.ndarray],
        history: List[np.ndarray],
    ) -> Optional[np.ndarray]:
        """Apply temporal smoothing to lane polynomial."""
        if poly is not None:
            history.append(poly)
        
        if len(history) > self.history_size:
            history.pop(0)
        
        if not history:
            return None
        
        # Average coefficients
        return np.mean(history, axis=0)
    
    def _compute_metrics(
        self,
        left_poly: Optional[np.ndarray],
        right_poly: Optional[np.ndarray],
        img_width: int,
        img_height: int,
    ) -> LaneState:
        """Compute lane keeping metrics from polynomials."""
        state = LaneState()
        state.left_poly = left_poly
        state.right_poly = right_poly
        
        wh = self.warped_size[1]
        ww = self.warped_size[0]
        
        # Compute confidence
        confidence = 0.0
        if left_poly is not None:
            confidence += 0.5
        if right_poly is not None:
            confidence += 0.5
        state.confidence = confidence
        
        if confidence == 0:
            state.departure_status = LaneDepartureStatus.NO_LANE
            return state
        
        # Compute lane positions at bottom
        y_eval = wh - 1
        
        if left_poly is not None and right_poly is not None:
            left_x = np.polyval(left_poly, y_eval)
            right_x = np.polyval(right_poly, y_eval)
            
            lane_center = (left_x + right_x) / 2
            img_center = ww / 2
            
            # Convert pixel offset to meters
            lane_width_px = right_x - left_x
            if lane_width_px > 50:  # Valid lane width
                meters_per_pixel = self.DEFAULT_LANE_WIDTH / lane_width_px
                state.center_offset = (img_center - lane_center) * meters_per_pixel
                state.road_width = lane_width_px * meters_per_pixel
            
            # Compute center polynomial
            state.center_poly = (left_poly + right_poly) / 2
            
            # Compute curvature
            state.curvature_radius = self._compute_curvature(state.center_poly, y_eval)
            
            # Compute heading angle
            state.heading_angle = self._compute_heading(state.center_poly, y_eval)
        
        elif left_poly is not None:
            # Only left lane visible
            left_x = np.polyval(left_poly, y_eval)
            estimated_center = left_x + self.ppm_bottom * self.DEFAULT_LANE_WIDTH / 2
            state.center_offset = (ww / 2 - estimated_center) / self.ppm_bottom
        
        elif right_poly is not None:
            # Only right lane visible
            right_x = np.polyval(right_poly, y_eval)
            estimated_center = right_x - self.ppm_bottom * self.DEFAULT_LANE_WIDTH / 2
            state.center_offset = (ww / 2 - estimated_center) / self.ppm_bottom
        
        # Determine departure status
        if abs(state.center_offset) > self.DEPARTURE_THRESHOLD:
            if state.center_offset > 0:
                state.departure_status = LaneDepartureStatus.DEPARTED_RIGHT
            else:
                state.departure_status = LaneDepartureStatus.DEPARTED_LEFT
        elif abs(state.center_offset) > self.DRIFT_THRESHOLD:
            if state.center_offset > 0:
                state.departure_status = LaneDepartureStatus.DRIFTING_RIGHT
            else:
                state.departure_status = LaneDepartureStatus.DRIFTING_LEFT
        else:
            state.departure_status = LaneDepartureStatus.CENTERED
        
        # Compute suggested steering
        state.suggested_steering = self._compute_steering(state)
        
        return state
    
    def _compute_curvature(self, poly: np.ndarray, y_eval: float) -> float:
        """Compute radius of curvature at given y."""
        if poly is None or len(poly) < 3:
            return float('inf')
        
        # First and second derivatives
        d1 = 2 * poly[0] * y_eval + poly[1]
        d2 = 2 * poly[0]
        
        if abs(d2) < 1e-6:
            return float('inf')
        
        # Curvature formula: R = (1 + (dx/dy)^2)^(3/2) / |d2x/dy2|
        curvature = ((1 + d1**2)**1.5) / abs(d2)
        
        # Scale to meters (rough approximation)
        curvature_m = curvature / self.ppm_bottom
        
        return min(curvature_m, 10000)  # Cap at 10km
    
    def _compute_heading(self, poly: np.ndarray, y_eval: float) -> float:
        """Compute heading angle relative to lane."""
        if poly is None or len(poly) < 2:
            return 0.0
        
        # Slope at evaluation point (dx/dy)
        slope = 2 * poly[0] * y_eval + poly[1]
        
        # Convert to angle (in degrees)
        angle = np.arctan(slope) * 180 / np.pi
        
        return angle
    
    def _compute_steering(self, state: LaneState) -> float:
        """Compute suggested steering angle."""
        # Simple P controller
        kp_offset = 2.0  # Gain for center offset
        kp_heading = 0.5  # Gain for heading angle
        
        steering = kp_offset * state.center_offset + kp_heading * state.heading_angle
        
        # Clamp to reasonable range (-45 to 45 degrees)
        return np.clip(steering, -45, 45)
    
    def draw_lane(
        self,
        frame: np.ndarray,
        state: LaneState,
        show_info: bool = True,
    ) -> np.ndarray:
        """
        Draw lane overlay on frame.
        
        Args:
            frame: BGR image
            state: LaneState from detect()
            show_info: Show info panel
            
        Returns:
            Annotated frame
        """
        h, w = frame.shape[:2]
        output = frame.copy()
        
        if state.confidence == 0:
            if show_info:
                cv2.putText(
                    output, "No Lane Detected",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2
                )
            return output
        
        # Create warped lane image
        lane_img = np.zeros((self.warped_size[1], self.warped_size[0], 3), dtype=np.uint8)
        
        # Generate y points
        y_points = np.linspace(0, self.warped_size[1] - 1, 50)
        
        # Draw lane area
        if state.left_poly is not None and state.right_poly is not None:
            left_x = np.polyval(state.left_poly, y_points)
            right_x = np.polyval(state.right_poly, y_points)
            
            pts_left = np.column_stack((left_x, y_points))
            pts_right = np.column_stack((right_x, y_points))[::-1]
            pts = np.vstack((pts_left, pts_right)).astype(np.int32)
            
            # Color based on departure status
            if state.departure_status in [LaneDepartureStatus.DEPARTED_LEFT, 
                                          LaneDepartureStatus.DEPARTED_RIGHT]:
                color = (0, 0, 255)  # Red
            elif state.departure_status in [LaneDepartureStatus.DRIFTING_LEFT,
                                            LaneDepartureStatus.DRIFTING_RIGHT]:
                color = (0, 165, 255)  # Orange
            else:
                color = (0, 255, 0)  # Green
            
            cv2.fillPoly(lane_img, [pts], color)
        
        # Draw lane lines
        for poly, color in [(state.left_poly, (255, 255, 0)), 
                           (state.right_poly, (255, 255, 0))]:
            if poly is not None:
                x_points = np.polyval(poly, y_points)
                pts = np.column_stack((x_points, y_points)).astype(np.int32)
                cv2.polylines(lane_img, [pts], False, color, 3)
        
        # Unwarp back to original perspective
        unwarped = cv2.warpPerspective(lane_img, self.Minv, (w, h))
        output = cv2.addWeighted(output, 0.8, unwarped, 0.3, 0)
        
        # Draw info panel
        if show_info:
            info_lines = [
                f"Offset: {state.center_offset:.2f}m",
                f"Curvature: {state.curvature_radius:.0f}m",
                f"Heading: {state.heading_angle:.1f}°",
                f"Status: {state.departure_status.value}",
                f"Steering: {state.suggested_steering:.1f}°",
            ]
            
            # Background
            cv2.rectangle(output, (w - 200, 10), (w - 10, 140), (0, 0, 0), -1)
            cv2.rectangle(output, (w - 200, 10), (w - 10, 140), (255, 255, 255), 1)
            
            y_offset = 30
            for line in info_lines:
                cv2.putText(
                    output, line,
                    (w - 190, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1
                )
                y_offset += 25
            
            # Departure warning
            if state.departure_status in [LaneDepartureStatus.DEPARTED_LEFT,
                                          LaneDepartureStatus.DEPARTED_RIGHT]:
                cv2.putText(
                    output, "⚠️ LANE DEPARTURE",
                    (w // 2 - 120, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 2
                )
        
        return output


# ============================================================================
# Testing
# ============================================================================

if __name__ == "__main__":
    print("🛣️ Lane Keeping Assist Test")
    
    lka = LaneKeeping()
    
    # Create test image with simulated lanes
    test_img = np.zeros((480, 640, 3), dtype=np.uint8)
    test_img[:] = (100, 100, 100)
    
    # Draw simple lane lines
    cv2.line(test_img, (150, 480), (280, 250), (255, 255, 255), 3)
    cv2.line(test_img, (490, 480), (360, 250), (255, 255, 255), 3)
    
    state = lka.detect(test_img)
    
    print(f"\nLane State:")
    print(f"  Confidence: {state.confidence:.2f}")
    print(f"  Center Offset: {state.center_offset:.2f}m")
    print(f"  Curvature Radius: {state.curvature_radius:.0f}m")
    print(f"  Status: {state.departure_status.value}")
    print(f"  Suggested Steering: {state.suggested_steering:.1f}°")
    
    # Draw result
    result = lka.draw_lane(test_img, state)
    
    print("\n✅ Test complete!")
