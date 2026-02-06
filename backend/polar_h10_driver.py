"""
Polar H10 BLE Driver for NATS
============================
Black Pearl Racing | KMUTT Student Formula

Connects to Polar H10 chest strap via Bluetooth LE and streams:
- Heart Rate (BPM)
- RR Intervals (for HRV calculation)
- Connection status

Requirements:
    pip install bleak

Usage:
    sensor = PolarH10()
    await sensor.scan_and_connect()
    await sensor.start_hr_stream(callback_function)
"""

import asyncio
import struct
import time
from dataclasses import dataclass, field
from typing import Callable, List, Optional
import logging

try:
    from bleak import BleakClient, BleakScanner
    BLEAK_AVAILABLE = True
except ImportError:
    BLEAK_AVAILABLE = False
    logging.warning("bleak not installed. Running in simulation mode.")

# Polar H10 BLE UUIDs
HR_SERVICE_UUID = "0000180d-0000-1000-8000-00805f9b34fb"
HR_MEASUREMENT_UUID = "00002a37-0000-1000-8000-00805f9b34fb"

# PMD (Polar Measurement Data) for raw ECG
PMD_SERVICE_UUID = "fb005c80-02e7-f387-1cad-8acd2d8df0c8"
PMD_CONTROL_UUID = "fb005c81-02e7-f387-1cad-8acd2d8df0c8"
PMD_DATA_UUID = "fb005c82-02e7-f387-1cad-8acd2d8df0c8"


@dataclass
class HeartRateData:
    """Heart rate measurement from Polar H10"""
    bpm: int
    rr_intervals: List[int] = field(default_factory=list)  # milliseconds
    timestamp: float = field(default_factory=time.time)
    sensor_contact: bool = True
    energy_expended: Optional[int] = None


@dataclass
class HRVMetrics:
    """Heart Rate Variability metrics calculated from RR intervals"""
    rmssd: float = 0.0      # Root Mean Square of Successive Differences
    sdnn: float = 0.0       # Standard Deviation of NN intervals
    pnn50: float = 0.0      # Percentage of successive RR intervals > 50ms
    mean_rr: float = 0.0    # Mean RR interval
    stress_index: float = 0.0  # Calculated stress (0-1)


def calculate_hrv(rr_intervals: List[int]) -> HRVMetrics:
    """Calculate HRV metrics from RR intervals (in ms)"""
    if len(rr_intervals) < 2:
        return HRVMetrics()
    
    # Filter out invalid RR intervals (typically 300-2000ms is valid)
    valid_rr = [rr for rr in rr_intervals if 300 <= rr <= 2000]
    if len(valid_rr) < 2:
        return HRVMetrics()
    
    import math
    
    # Mean RR
    mean_rr = sum(valid_rr) / len(valid_rr)
    
    # SDNN - Standard Deviation
    variance = sum((rr - mean_rr) ** 2 for rr in valid_rr) / len(valid_rr)
    sdnn = math.sqrt(variance)
    
    # RMSSD - Root Mean Square of Successive Differences
    successive_diffs = [abs(valid_rr[i+1] - valid_rr[i]) for i in range(len(valid_rr)-1)]
    if successive_diffs:
        rmssd = math.sqrt(sum(d**2 for d in successive_diffs) / len(successive_diffs))
    else:
        rmssd = 0.0
    
    # pNN50 - Percentage > 50ms difference
    nn50_count = sum(1 for d in successive_diffs if d > 50)
    pnn50 = (nn50_count / len(successive_diffs) * 100) if successive_diffs else 0.0
    
    # Stress Index (simplified: lower HRV = higher stress)
    # Normalized to 0-1 range where 1 = high stress
    # RMSSD of 20-80ms is typical; below 20 = stressed
    stress_index = max(0.0, min(1.0, 1.0 - (rmssd - 10) / 70))
    
    return HRVMetrics(
        rmssd=round(rmssd, 2),
        sdnn=round(sdnn, 2),
        pnn50=round(pnn50, 2),
        mean_rr=round(mean_rr, 2),
        stress_index=round(stress_index, 3)
    )


class PolarH10:
    """
    Polar H10 Heart Rate Monitor BLE Driver
    
    Supports:
    - Heart Rate (BPM)
    - RR Intervals for HRV
    - Sensor contact detection
    """
    
    def __init__(self, device_name: str = "Polar H10"):
        self.device_name = device_name
        self.client: Optional[BleakClient] = None
        self.device_address: Optional[str] = None
        self.connected = False
        self.callbacks: List[Callable[[HeartRateData], None]] = []
        self.rr_buffer: List[int] = []  # Rolling buffer for HRV
        self.rr_buffer_max = 60  # Keep last 60 RR intervals (~1 minute)
        self.last_hr_data: Optional[HeartRateData] = None
        self.logger = logging.getLogger("PolarH10")
    
    async def scan(self, timeout: float = 10.0) -> Optional[str]:
        """Scan for Polar H10 device, return address if found"""
        if not BLEAK_AVAILABLE:
            self.logger.warning("Bleak not available, using simulation")
            return None
        
        self.logger.info(f"Scanning for {self.device_name}...")
        devices = await BleakScanner.discover(timeout=timeout)
        
        for device in devices:
            if device.name and self.device_name in device.name:
                self.logger.info(f"Found: {device.name} [{device.address}]")
                self.device_address = device.address
                return device.address
        
        self.logger.warning(f"Device '{self.device_name}' not found")
        return None
    
    async def connect(self, address: Optional[str] = None) -> bool:
        """Connect to Polar H10"""
        if not BLEAK_AVAILABLE:
            self.logger.info("Simulation mode: pretending connected")
            self.connected = True
            return True
        
        addr = address or self.device_address
        if not addr:
            addr = await self.scan()
            if not addr:
                return False
        
        try:
            self.client = BleakClient(addr)
            await self.client.connect()
            self.connected = self.client.is_connected
            self.logger.info(f"Connected: {self.connected}")
            return self.connected
        except Exception as e:
            self.logger.error(f"Connection failed: {e}")
            self.connected = False
            return False
    
    async def scan_and_connect(self, timeout: float = 10.0) -> bool:
        """Convenience method: scan and connect in one call"""
        address = await self.scan(timeout)
        if address:
            return await self.connect(address)
        return False
    
    async def start_hr_stream(self, callback: Callable[[HeartRateData], None]) -> bool:
        """Start receiving heart rate notifications"""
        self.callbacks.append(callback)
        
        if not BLEAK_AVAILABLE or not self.client:
            self.logger.info("Starting simulated HR stream")
            asyncio.create_task(self._simulate_hr_stream())
            return True
        
        try:
            await self.client.start_notify(
                HR_MEASUREMENT_UUID,
                self._hr_notification_handler
            )
            self.logger.info("HR stream started")
            return True
        except Exception as e:
            self.logger.error(f"Failed to start HR stream: {e}")
            return False
    
    def _hr_notification_handler(self, sender, data: bytearray):
        """Parse incoming heart rate measurement BLE notification"""
        try:
            flags = data[0]
            
            # Bit 0: HR format (0=UINT8, 1=UINT16)
            hr_format_16bit = bool(flags & 0x01)
            # Bit 1-2: Sensor contact status
            sensor_contact_supported = bool(flags & 0x04)
            sensor_contact = bool(flags & 0x02) if sensor_contact_supported else True
            # Bit 3: Energy expended present
            energy_present = bool(flags & 0x08)
            # Bit 4: RR interval present
            rr_present = bool(flags & 0x10)
            
            offset = 1
            
            # Parse heart rate value
            if hr_format_16bit:
                bpm = struct.unpack_from("<H", data, offset)[0]
                offset += 2
            else:
                bpm = data[offset]
                offset += 1
            
            # Parse energy expended (if present)
            energy_expended = None
            if energy_present:
                energy_expended = struct.unpack_from("<H", data, offset)[0]
                offset += 2
            
            # Parse RR intervals (if present)
            rr_intervals = []
            if rr_present:
                while offset + 1 < len(data):
                    rr = struct.unpack_from("<H", data, offset)[0]
                    # Convert from 1/1024 seconds to milliseconds
                    rr_ms = int(rr * 1000 / 1024)
                    rr_intervals.append(rr_ms)
                    offset += 2
            
            # Update RR buffer for HRV
            self.rr_buffer.extend(rr_intervals)
            if len(self.rr_buffer) > self.rr_buffer_max:
                self.rr_buffer = self.rr_buffer[-self.rr_buffer_max:]
            
            # Create data object
            hr_data = HeartRateData(
                bpm=bpm,
                rr_intervals=rr_intervals,
                sensor_contact=sensor_contact,
                energy_expended=energy_expended
            )
            self.last_hr_data = hr_data
            
            # Notify callbacks
            for callback in self.callbacks:
                try:
                    callback(hr_data)
                except Exception as e:
                    self.logger.error(f"Callback error: {e}")
                    
        except Exception as e:
            self.logger.error(f"Failed to parse HR data: {e}")
    
    async def _simulate_hr_stream(self):
        """Simulate heart rate data when no real sensor connected"""
        import random
        base_hr = 75
        
        while self.connected:
            # Simulate realistic HR with variation
            hr = base_hr + random.randint(-5, 10)
            
            # Simulate RR intervals (inverse of HR)
            rr_base = int(60000 / hr)  # ms per beat
            rr_intervals = [
                rr_base + random.randint(-30, 30)
                for _ in range(random.randint(1, 3))
            ]
            
            # Update buffer
            self.rr_buffer.extend(rr_intervals)
            if len(self.rr_buffer) > self.rr_buffer_max:
                self.rr_buffer = self.rr_buffer[-self.rr_buffer_max:]
            
            hr_data = HeartRateData(
                bpm=hr,
                rr_intervals=rr_intervals,
                sensor_contact=True
            )
            self.last_hr_data = hr_data
            
            for callback in self.callbacks:
                try:
                    callback(hr_data)
                except Exception as e:
                    self.logger.error(f"Callback error: {e}")
            
            await asyncio.sleep(1.0)
    
    def get_hrv(self) -> HRVMetrics:
        """Calculate current HRV metrics from buffered RR intervals"""
        return calculate_hrv(self.rr_buffer)
    
    async def stop_hr_stream(self):
        """Stop heart rate notifications"""
        if self.client and BLEAK_AVAILABLE:
            try:
                await self.client.stop_notify(HR_MEASUREMENT_UUID)
            except Exception as e:
                self.logger.error(f"Failed to stop stream: {e}")
        self.callbacks.clear()
    
    async def disconnect(self):
        """Disconnect from device"""
        self.connected = False
        if self.client and BLEAK_AVAILABLE:
            try:
                await self.client.disconnect()
            except Exception:
                pass
        self.client = None
        self.logger.info("Disconnected")
    
    def to_dict(self) -> dict:
        """Get current state as dictionary"""
        hrv = self.get_hrv()
        return {
            "connected": self.connected,
            "device_name": self.device_name,
            "device_address": self.device_address,
            "last_bpm": self.last_hr_data.bpm if self.last_hr_data else 0,
            "sensor_contact": self.last_hr_data.sensor_contact if self.last_hr_data else False,
            "hrv": {
                "rmssd": hrv.rmssd,
                "sdnn": hrv.sdnn,
                "pnn50": hrv.pnn50,
                "mean_rr": hrv.mean_rr,
                "stress_index": hrv.stress_index
            },
            "rr_buffer_size": len(self.rr_buffer)
        }


# Standalone test
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    async def main():
        sensor = PolarH10()
        
        def on_hr(data: HeartRateData):
            hrv = sensor.get_hrv()
            print(f"HR: {data.bpm} BPM | RR: {data.rr_intervals} | "
                  f"RMSSD: {hrv.rmssd:.1f} | Stress: {hrv.stress_index:.2f}")
        
        print("Connecting to Polar H10...")
        if await sensor.scan_and_connect():
            await sensor.start_hr_stream(on_hr)
            print("Streaming for 30 seconds...")
            await asyncio.sleep(30)
            await sensor.disconnect()
        else:
            print("Failed to connect. Running simulation...")
            sensor.connected = True
            await sensor.start_hr_stream(on_hr)
            await asyncio.sleep(10)
            sensor.connected = False
    
    asyncio.run(main())
