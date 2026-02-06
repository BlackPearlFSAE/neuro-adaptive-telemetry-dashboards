"""
Charging System Service
=======================
Simulates EV charging system telemetry including:
- HV Battery monitoring (RMS voltage, temperatures, HVIL)
- Charge Port status (cable, latch, pin temps)
- Contactors (pack, fast charge, precharge)
- PCS (Power Conversion System)
- CPL (Charge Port Latching)
"""

import random
from dataclasses import dataclass, field, asdict
from typing import Dict, Any, Optional
from datetime import datetime


@dataclass
class HVBatteryState:
    """High Voltage Battery state"""
    rms_voltage: float = 395.0
    min_cell_temp: float = 28.0
    max_cell_temp: float = 32.0
    hvil_status: str = "OK"  # OK, FAULT
    soc: float = 78.0
    pack_current: float = 0.0
    isolation_resistance: float = 500.0  # kOhm
    status: str = "optimal"


@dataclass
class ChargePortState:
    """Charge port status"""
    cable_state: str = "Disconnected"  # Disconnected, Connected, Latched
    latch_state: str = "Open"  # Open, Engaged, Fault
    back_cover_present: bool = True
    handle_button_pressed: bool = False
    ac_pin_temp: float = 25.0
    dc_pin_temp: float = 25.0
    inlet_voltage: float = 0.0
    status: str = "idle"


@dataclass
class ContactorsState:
    """HV Contactors state"""
    pack_positive: str = "Open"  # Open, Closed, Welded
    pack_negative: str = "Open"
    fast_charge_positive: str = "Open"
    fast_charge_negative: str = "Open"
    precharge: str = "Open"
    status: str = "open"


@dataclass
class PCSState:
    """Power Conversion System state"""
    mode: str = "Idle"  # Idle, AC Charging, DC Fast Charge, V2G, Preconditioning
    power_kw: float = 0.0
    efficiency: float = 0.0
    input_voltage: float = 0.0
    output_voltage: float = 0.0
    status: str = "offline"


@dataclass
class CPLState:
    """Charge Port Latch signal"""
    connected: bool = False
    pilot_signal_percent: float = 0.0
    proximity_detected: bool = False
    cp_voltage: float = 12.0  # Control Pilot voltage


@dataclass
class ChargingSystemData:
    hv_battery: HVBatteryState = field(default_factory=HVBatteryState)
    charge_port: ChargePortState = field(default_factory=ChargePortState)
    contactors: ContactorsState = field(default_factory=ContactorsState)
    pcs: PCSState = field(default_factory=PCSState)
    cpl: CPLState = field(default_factory=CPLState)
    is_charging: bool = False
    charging_mode: str = "none"  # none, ac, dc_fast, v2g


class ChargingService:
    """Charging system simulation service"""
    
    def __init__(self):
        self.state = ChargingSystemData()
        self._charging_start_time: Optional[datetime] = None
        self._target_soc: float = 80.0
    
    def start_charging(self, mode: str = "dc_fast") -> Dict[str, Any]:
        """Initiate charging session"""
        self.state.is_charging = True
        self.state.charging_mode = mode
        self._charging_start_time = datetime.now()
        
        # Update states for charging
        self.state.charge_port.cable_state = "Latched"
        self.state.charge_port.latch_state = "Engaged"
        self.state.charge_port.status = "charging"
        
        self.state.cpl.connected = True
        self.state.cpl.proximity_detected = True
        self.state.cpl.pilot_signal_percent = 100.0
        self.state.cpl.cp_voltage = 6.0  # Charging mode
        
        if mode == "dc_fast":
            self.state.contactors.fast_charge_positive = "Closed"
            self.state.contactors.fast_charge_negative = "Closed"
            self.state.pcs.mode = "DC Fast Charge"
            self.state.pcs.status = "active"
        else:
            self.state.contactors.pack_positive = "Closed"
            self.state.contactors.pack_negative = "Closed"
            self.state.pcs.mode = "AC Charging"
            self.state.pcs.status = "active"
        
        self.state.contactors.precharge = "Closed"
        self.state.contactors.status = "closed"
        
        return {"success": True, "mode": mode}
    
    def stop_charging(self) -> Dict[str, Any]:
        """Stop charging session"""
        self.state.is_charging = False
        self.state.charging_mode = "none"
        
        # Reset states
        self.state.charge_port.cable_state = "Disconnected"
        self.state.charge_port.latch_state = "Open"
        self.state.charge_port.status = "idle"
        
        self.state.cpl.connected = False
        self.state.cpl.proximity_detected = False
        self.state.cpl.pilot_signal_percent = 0.0
        self.state.cpl.cp_voltage = 12.0
        
        self.state.contactors.pack_positive = "Open"
        self.state.contactors.pack_negative = "Open"
        self.state.contactors.fast_charge_positive = "Open"
        self.state.contactors.fast_charge_negative = "Open"
        self.state.contactors.precharge = "Open"
        self.state.contactors.status = "open"
        
        self.state.pcs.mode = "Idle"
        self.state.pcs.power_kw = 0.0
        self.state.pcs.status = "offline"
        
        return {"success": True}
    
    def update(self):
        """Update charging system simulation"""
        # Temperature fluctuations
        self.state.hv_battery.min_cell_temp = 26 + random.uniform(0, 4)
        self.state.hv_battery.max_cell_temp = self.state.hv_battery.min_cell_temp + 2 + random.uniform(0, 3)
        self.state.hv_battery.rms_voltage = 390 + random.uniform(0, 15)
        
        if self.state.is_charging:
            # Charging simulation
            mode = self.state.charging_mode
            
            # Power based on mode
            if mode == "dc_fast":
                base_power = 150  # kW DC fast
                self.state.pcs.power_kw = base_power - (self.state.hv_battery.soc / 100) * 80 + random.uniform(-5, 5)
                self.state.pcs.efficiency = 94 + random.uniform(0, 4)
                self.state.charge_port.inlet_voltage = 400 + random.uniform(0, 50)
            else:
                base_power = 11  # kW AC
                self.state.pcs.power_kw = base_power + random.uniform(-1, 1)
                self.state.pcs.efficiency = 92 + random.uniform(0, 3)
                self.state.charge_port.inlet_voltage = 230 + random.uniform(-5, 5)
            
            # SOC increase
            charge_rate = self.state.pcs.power_kw / (75 * 60)  # 75 kWh battery, per second
            self.state.hv_battery.soc = min(100, self.state.hv_battery.soc + charge_rate * 0.5)
            
            # Pin temperature during charging
            self.state.charge_port.ac_pin_temp = 35 + random.uniform(0, 10)
            self.state.charge_port.dc_pin_temp = 40 + random.uniform(0, 15)
            
            # Current flow
            self.state.hv_battery.pack_current = self.state.pcs.power_kw * 1000 / self.state.hv_battery.rms_voltage
            
            # Check for completion
            if self.state.hv_battery.soc >= self._target_soc:
                self.stop_charging()
        else:
            # Idle state
            self.state.charge_port.ac_pin_temp = 25 + random.uniform(0, 5)
            self.state.charge_port.dc_pin_temp = 25 + random.uniform(0, 5)
            self.state.hv_battery.pack_current = random.uniform(-5, 5)  # Small auxiliary loads
        
        # Update status based on conditions
        if self.state.hv_battery.max_cell_temp > 45:
            self.state.hv_battery.status = "warning"
        elif self.state.hv_battery.max_cell_temp > 55:
            self.state.hv_battery.status = "critical"
        else:
            self.state.hv_battery.status = "optimal"
    
    def get_state(self) -> Dict[str, Any]:
        """Get current charging system state"""
        self.update()
        
        return {
            "timestamp": datetime.now().isoformat(),
            "hvBattery": {
                "rmsVoltage": round(self.state.hv_battery.rms_voltage, 1),
                "minCellTemp": round(self.state.hv_battery.min_cell_temp, 1),
                "maxCellTemp": round(self.state.hv_battery.max_cell_temp, 1),
                "hvilStatus": self.state.hv_battery.hvil_status,
                "soc": round(self.state.hv_battery.soc, 1),
                "packCurrent": round(self.state.hv_battery.pack_current, 1),
                "isolationResistance": self.state.hv_battery.isolation_resistance,
                "status": self.state.hv_battery.status
            },
            "chargePort": {
                "cableState": self.state.charge_port.cable_state,
                "latchState": self.state.charge_port.latch_state,
                "backCoverPresent": self.state.charge_port.back_cover_present,
                "handleButtonPressed": self.state.charge_port.handle_button_pressed,
                "acPinTemp": round(self.state.charge_port.ac_pin_temp, 2),
                "dcPinTemp": round(self.state.charge_port.dc_pin_temp, 2),
                "inletVoltage": round(self.state.charge_port.inlet_voltage, 1),
                "status": self.state.charge_port.status
            },
            "contactors": {
                "packPositive": self.state.contactors.pack_positive,
                "packNegative": self.state.contactors.pack_negative,
                "fastChargePositive": self.state.contactors.fast_charge_positive,
                "fastChargeNegative": self.state.contactors.fast_charge_negative,
                "precharge": self.state.contactors.precharge,
                "status": self.state.contactors.status
            },
            "pcs": {
                "mode": self.state.pcs.mode,
                "powerKw": round(self.state.pcs.power_kw, 1),
                "efficiency": round(self.state.pcs.efficiency, 1),
                "status": self.state.pcs.status
            },
            "cpl": {
                "connected": self.state.cpl.connected,
                "pilotSignal": round(self.state.cpl.pilot_signal_percent, 0),
                "proximityDetected": self.state.cpl.proximity_detected,
                "cpVoltage": round(self.state.cpl.cp_voltage, 1)
            },
            "isCharging": self.state.is_charging,
            "chargingMode": self.state.charging_mode
        }
    
    def ecu_reset(self) -> Dict[str, Any]:
        """Reset charge port ECU"""
        # Simulate ECU reset
        self.stop_charging()
        self.state.hv_battery.hvil_status = "OK"
        self.state.charge_port.latch_state = "Open"
        return {"success": True, "message": "Charge Port ECU Reset Complete"}


# Global service instance
charging_service = ChargingService()
