"""
Autonomous Driving Service
Simulates basic self-driving capabilities including path following, LIDAR/Vision sensing, and environment mapping.
"""

import asyncio
import math
import random
from dataclasses import dataclass, field
from typing import List, Dict, Any, Tuple

@dataclass
class Point:
    x: float
    y: float

@dataclass
class AutonomousState:
    enabled: bool = False
    confidence: float = 0.0
    perception_status: str = "offline"  # offline, calibrating, active, error
    current_path_index: int = 0
    nearest_waypoint_dist: float = 0.0
    steering_cmd: float = 0.0
    throttle_cmd: float = 0.0
    brake_cmd: float = 0.0
    lidar_points: List[Point] = field(default_factory=list)
    detected_objects: List[Dict[str, Any]] = field(default_factory=list)

class AutonomousService:
    def __init__(self):
        self.state = AutonomousState()
        self.waypoints: List[Point] = []
        self._running = False
        self._generate_mock_waypoints()

    def _generate_mock_waypoints(self):
        # Generate a simple loop for testing (Silverstone-ish oval approximation for now)
        # This will be replaced by the CircuitConfigurator data later
        center_x, center_y = 400, 300
        radius_x, radius_y = 300, 150
        steps = 100
        for i in range(steps):
            theta = (2 * math.pi * i) / steps
            self.waypoints.append(Point(
                x=center_x + radius_x * math.cos(theta),
                y=center_y + radius_y * math.sin(theta)
            ))

    async def start(self):
        self._running = True
        asyncio.create_task(self._loop())

    async def stop(self):
        self._running = False
        self.state.enabled = False

    def toggle_autonomy(self, enabled: bool):
        self.state.enabled = enabled
        self.state.perception_status = "active" if enabled else "offline"
        if enabled:
            self.state.confidence = 0.85  # Initial confidence

    def update_waypoints(self, waypoints: List[Point]):
        """Update waypoints from external source (e.g., circuit analyzer)"""
        self.waypoints = waypoints
        self.state.current_path_index = 0
        print(f"🛤️ Autonomous: Updated with {len(waypoints)} waypoints")

    async def _loop(self):
        while self._running:
            if self.state.enabled:
                self._update_perception()
                self._calculate_control()
            await asyncio.sleep(0.1)  # 10Hz control loop

    def _update_perception(self):
        # Simulate LIDAR scan (noisy points around track boundaries)
        self.state.lidar_points = []
        num_points = 36
        for i in range(num_points):
            angle = (2 * math.pi * i) / num_points
            dist = 20 + random.uniform(-2, 2)  # 20m range
            self.state.lidar_points.append(Point(
                x=dist * math.cos(angle),
                y=dist * math.sin(angle)
            ))
        
        # Simulate varying driver confidence based on "sensor noise"
        self.state.confidence = max(0.0, min(1.0, 0.9 + random.uniform(-0.05, 0.05)))

    def _calculate_control(self):
        # Mock Stanley Controller logic
        # In a real system, this would take car pose vs waypoints
        # Here we just generate realistic-looking control values
        error = random.uniform(-0.5, 0.5)
        self.state.steering_cmd = error * 20  # Proportional steering
        self.state.throttle_cmd = 0.4 if abs(self.state.steering_cmd) < 5 else 0.2
        self.state.brake_cmd = 0.0

    def get_state(self) -> Dict[str, Any]:
        return {
            "enabled": self.state.enabled,
            "confidence": round(self.state.confidence, 2),
            "perception_status": self.state.perception_status,
            "steering_cmd": round(self.state.steering_cmd, 1),
            "throttle_cmd": round(self.state.throttle_cmd, 2),
            "lidar_points": [{"x": p.x, "y": p.y} for p in self.state.lidar_points]
        }

autonomous_service = AutonomousService()
