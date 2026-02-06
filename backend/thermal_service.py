"""
Thermal Management System (TMS) Service
Simulates coolant loop dynamics for EV powertrain and battery thermal management.
"""

import asyncio
import random
from dataclasses import dataclass, field, asdict
from typing import Dict, Any
from datetime import datetime

@dataclass
class CoolantLoop:
    """Represents a single coolant loop (e.g., Powertrain or Battery)"""
    name: str
    inlet_temp: float = 30.0  # °C
    outlet_temp: float = 32.0  # °C
    flow_rate: float = 5.0    # L/min
    pump_rpm: int = 1500
    target_temp: float = 35.0
    status: str = "normal"  # normal, warning, critical

@dataclass
class ThermalManagementSystem:
    """Full TMS state"""
    ambient_temp: float = 28.0  # °C
    radiator_fan_rpm: int = 0
    five_way_valve_position: str = "Series"  # Series, Parallel, Chiller
    chiller_active: bool = False
    
    powertrain_loop: CoolantLoop = field(default_factory=lambda: CoolantLoop(name="Powertrain"))
    battery_loop: CoolantLoop = field(default_factory=lambda: CoolantLoop(name="Battery"))
    
    # Component temps
    pcs_temp: float = 30.0     # Power Conversion System
    dcdc_temp: float = 29.0    # DC-DC Converter
    charger_temp: float = 28.0
    front_inverter_temp: float = 32.0
    rear_inverter_temp: float = 35.0
    hv_battery_temp: float = 30.0
    autopilot_temp: float = 52.0     # Autopilot computer
    infotainment_temp: float = 38.0  # Infotainment system
    
    last_update: str = ""

class ThermalSimulator:
    def __init__(self):
        self.tms = ThermalManagementSystem()
        self._running = False
    
    async def start(self):
        self._running = True
        asyncio.create_task(self._simulation_loop())
    
    async def stop(self):
        self._running = False
    
    async def _simulation_loop(self):
        while self._running:
            self._update_temps()
            await asyncio.sleep(1.0)
    
    def _update_temps(self):
        """Simulate thermal dynamics"""
        # Simulate ambient changes
        self.tms.ambient_temp += random.uniform(-0.2, 0.2)
        self.tms.ambient_temp = max(20, min(45, self.tms.ambient_temp))
        
        # Powertrain loop dynamics
        pt = self.tms.powertrain_loop
        load_factor = random.uniform(0.5, 1.0)  # Simulated load
        pt.outlet_temp = pt.inlet_temp + (5 * load_factor)
        pt.pump_rpm = int(1500 + (pt.outlet_temp - 30) * 50)
        pt.inlet_temp = pt.outlet_temp - random.uniform(1, 3)
        pt.flow_rate = 5.0 + (pt.pump_rpm - 1500) / 200
        pt.status = "normal" if pt.outlet_temp < 50 else ("warning" if pt.outlet_temp < 60 else "critical")
        
        # Battery loop dynamics
        bt = self.tms.battery_loop
        bt.outlet_temp = bt.inlet_temp + (3 * random.uniform(0.3, 0.8))
        bt.pump_rpm = int(1560 + random.randint(-50, 50))
        bt.inlet_temp = bt.outlet_temp - random.uniform(1, 2)
        bt.flow_rate = 5.0 + random.uniform(-0.5, 0.5)
        bt.status = "normal" if bt.outlet_temp < 40 else ("warning" if bt.outlet_temp < 50 else "critical")
        
        # Component temps
        self.tms.front_inverter_temp = 32 + random.uniform(-2, 5)
        self.tms.rear_inverter_temp = 35 + random.uniform(-2, 7)
        self.tms.pcs_temp = 30 + random.uniform(-1, 3)
        self.tms.dcdc_temp = 29 + random.uniform(-1, 4)
        self.tms.hv_battery_temp = 30 + random.uniform(-2, 5)
        self.tms.autopilot_temp = 50 + random.uniform(-3, 8)
        self.tms.infotainment_temp = 35 + random.uniform(-2, 6)
        
        # Radiator fan control
        max_temp = max(pt.outlet_temp, bt.outlet_temp)
        if max_temp > 40:
            self.tms.radiator_fan_rpm = int((max_temp - 40) * 200)
        else:
            self.tms.radiator_fan_rpm = 0
        
        # Chiller activation
        self.tms.chiller_active = bt.outlet_temp > 35
        
        self.tms.last_update = datetime.now().isoformat()
    
    def get_state(self) -> Dict[str, Any]:
        """Return current TMS state as dict"""
        return {
            "ambient_temp": round(self.tms.ambient_temp, 1),
            "radiator_fan_rpm": self.tms.radiator_fan_rpm,
            "five_way_valve": self.tms.five_way_valve_position,
            "chiller_active": self.tms.chiller_active,
            "powertrain_loop": asdict(self.tms.powertrain_loop),
            "battery_loop": asdict(self.tms.battery_loop),
            "components": {
                "pcs": round(self.tms.pcs_temp, 1),
                "dcdc": round(self.tms.dcdc_temp, 1),
                "charger": round(self.tms.charger_temp, 1),
                "front_inverter": round(self.tms.front_inverter_temp, 1),
                "rear_inverter": round(self.tms.rear_inverter_temp, 1),
                "hv_battery": round(self.tms.hv_battery_temp, 1),
                "autopilot": round(self.tms.autopilot_temp, 1),
                "infotainment": round(self.tms.infotainment_temp, 1),
            },
            "last_update": self.tms.last_update
        }
    
    def set_valve_position(self, position: str):
        """Set 5-way valve position"""
        if position in ["Series", "Parallel", "Chiller"]:
            self.tms.five_way_valve_position = position
    
    def coolant_purge(self) -> Dict[str, Any]:
        """Start coolant purge sequence"""
        self.tms.powertrain_loop.pump_rpm = 2000
        self.tms.battery_loop.pump_rpm = 2000
        return {"success": True, "message": "Coolant purge started"}
    
    def coolant_fill_drain(self, action: str = "fill") -> Dict[str, Any]:
        """Start coolant fill or drain"""
        return {"success": True, "message": f"Coolant {action} initiated"}
    
    def valve_test(self) -> Dict[str, Any]:
        """Test 5-way valve positions"""
        positions = ["Series", "Parallel", "Chiller"]
        return {"success": True, "message": "Valve test sequence started", "positions": positions}

# Singleton instance
thermal_simulator = ThermalSimulator()
