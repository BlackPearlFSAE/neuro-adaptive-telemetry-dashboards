"""
Generic Vitals Driver (GSR + SpO2 + Temp)
=========================================
Handles connection to:
- Shimmer3 GSR+ (Skin Conductance)
- Nonin 3150 (SpO2)
- Generic BLE Thermistors

Requirements:
    bleak
"""
import asyncio
import random
import logging
from dataclasses import dataclass

@dataclass
class VitalsData:
    gsr_conductance: float  # microSiemens (uS)
    spo2_percent: int       # %
    skin_temp_c: float      # Celsius
    arousal_index: float    # 0-1 (Stress from GSR)

class VitalsDriver:
    def __init__(self):
        self.connected = False
        self.running = False
        
        # Sim State
        self._stress_base = 0.3
        self._temp_base = 36.5

    async def connect(self) -> bool:
        # Placeholder for Shimmer/Nonin BLE scanning
        self.connected = True
        return True

    async def start_stream(self, callback):
        self.running = True
        asyncio.create_task(self._process_stream(callback))

    async def _process_stream(self, callback):
        while self.running:
            # Simulate Stress Events (GSR Spikes)
            if random.random() < 0.05:
                self._stress_base += 0.2
            self._stress_base *= 0.98 # Decay
            
            gsr_val = 5.0 + (self._stress_base * 10.0) + random.uniform(-0.5, 0.5)
            
            # Simulate Temp rise over time
            self._temp_base += 0.001
            
            data = VitalsData(
                gsr_conductance=gsr_val,
                spo2_percent=int(98 + random.uniform(-1, 1)),
                skin_temp_c=self._temp_base + random.uniform(-0.1, 0.1),
                arousal_index=min(1.0, max(0.0, self._stress_base))
            )
            
            if callback:
                callback(data)
            
            await asyncio.sleep(0.5) # 2Hz update is sufficient for vitals

    def stop(self):
        self.running = False
