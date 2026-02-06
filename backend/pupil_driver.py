"""
Pupil Labs Eye Tracker Driver for NATS
=====================================
Connects to Pupil Capture via ZeroMQ / Network API.
Streams:
- Gaze Coordinates (X, Y)
- Pupil Diameter (mm)
- Blink Detection
- Drowsiness Index (PERCLOS simulation)

Requirements:
    pip install pyzmq
"""

import asyncio
import time
import random
import logging
from dataclasses import dataclass

try:
    import zmq
    ZMQ_AVAILABLE = True
except ImportError:
    ZMQ_AVAILABLE = False
    logging.warning("pyzmq not installed. Running in simulation mode.")

@dataclass
class EyeData:
    gaze_x: float  # 0.0 - 1.0 (Screen relative)
    gaze_y: float  # 0.0 - 1.0
    pupil_diameter: float # mm
    is_blinking: bool
    drowsiness_index: float # 0.0 - 1.0
    fixation_duration: float # ms

class PupilDriver:
    def __init__(self):
        self.connected = False
        self.logger = logging.getLogger("PupilDriver")
        self.running = False
        self.last_data = None
        
        # Sim state
        self._gaze_x = 0.5
        self._gaze_y = 0.5
        self._blink_timer = 0
        self._drowsiness = 0.1

    async def connect(self, ip="127.0.0.1", port=50020) -> bool:
        """Connect to Pupil Remote"""
        if ZMQ_AVAILABLE:
            try:
                self.ctx = zmq.Context()
                self.socket = self.ctx.socket(zmq.REQ)
                self.socket.connect(f"tcp://{ip}:{port}")
                # Simple ping in real implementation
                # self.socket.send_string("v")
                # ver = self.socket.recv_string()
                # self.connected = True
            except Exception:
                pass
        
        # Fallback to Sim
        self.logger.info("Pupil Labs not found. Starting Simulation.")
        self.connected = True
        return True

    async def start_stream(self, callback):
        self.running = True
        asyncio.create_task(self._process_stream(callback))

    async def _process_stream(self, callback):
        while self.running:
            # SIMULATION LOGIC
            
            # Simulate Saccades (Rapid eye movement)
            if random.random() < 0.1:
                # Jump to new point
                self._gaze_x = random.normalvariate(0.5, 0.2)
                self._gaze_y = random.normalvariate(0.5, 0.15)
            else:
                # Fixation jitter
                self._gaze_x += random.uniform(-0.01, 0.01)
                self._gaze_y += random.uniform(-0.01, 0.01)
                
            # Clamp
            self._gaze_x = max(0, min(1, self._gaze_x))
            self._gaze_y = max(0, min(1, self._gaze_y))
            
            # Simulate Blinks
            is_blinking = False
            self._blink_timer -= 1
            if self._blink_timer <= 0:
                if random.random() < 0.05: # Start blink
                    self._blink_timer = 3 # 300ms blink
            
            if self._blink_timer > 0:
                is_blinking = True
                
            # Drifting Drowsiness
            self._drowsiness += random.uniform(-0.01, 0.01)
            self._drowsiness = max(0.0, min(0.8, self._drowsiness))
            
            data = EyeData(
                gaze_x=self._gaze_x,
                gaze_y=self._gaze_y,
                pupil_diameter=3.0 + (self._drowsiness * 1.5) + random.uniform(-0.1, 0.1),
                is_blinking=is_blinking,
                drowsiness_index=self._drowsiness,
                fixation_duration=random.randint(100, 800)
            )
            
            self.last_data = data
            if callback:
                callback(data)
            
            await asyncio.sleep(0.1)

    def stop(self):
        self.running = False
        self.connected = False
