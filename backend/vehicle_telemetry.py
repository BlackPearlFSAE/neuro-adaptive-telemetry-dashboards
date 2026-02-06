"""
Vehicle Telemetry Module
========================

EV Formula car telemetry simulation for motor, battery, brakes, and tires.
"""

import math
import random
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional
from datetime import datetime
import csv
import os
from pathlib import Path
from enum import Enum

class DrivingMode(str, Enum):
    SAFETY = "SAFETY"
    RACE = "RACE"
    ATTACK = "ATTACK"  # Formula E Attack Mode (+35kW)
    QUALI = "QUALI"    # Max Power
    IN_LAP = "IN_LAP"  # Regenerative heavy



@dataclass
class MotorTelemetry:
    """Electric motor telemetry data"""
    rpm: int
    power_kw: float
    torque_nm: float
    temperature: float  # °C
    efficiency: float   # %
    mode: str          # "RACE" | "QUALI" | "ECO"
    inv_mode: str      # "SPEED" | "TORQUE"
    map_setting: int   # 1-12
    status: str        # "optimal" | "warning" | "critical"


@dataclass
class BatteryTelemetry:
    """Battery management system telemetry"""
    soc: float              # State of Charge %
    voltage: float          # V
    current: float          # A
    temperature: float      # °C
    cell_balance: float     # %
    power_limit: float      # kW
    energy_used_kwh: float  # Cumulative energy used
    regen_kwh: float       # Cumulative regen
    lap_energy_kwh: float   # Energy used this lap
    target_delta_kwh: float # Difference from energy target
    regen_enabled: bool
    status: str


@dataclass
class BrakeTelemetry:
    """Brake system telemetry"""
    front_left_temp: float   # °C
    front_right_temp: float
    rear_left_temp: float
    rear_right_temp: float
    brake_bias: float        # % front
    brake_pressure: float    # bar
    wear_front: float        # %
    wear_rear: float
    status: str


@dataclass
class TireTelemetry:
    """Tire telemetry data"""
    front_left: Dict[str, float]   # temp, pressure, wear
    front_right: Dict[str, float]
    rear_left: Dict[str, float]
    rear_right: Dict[str, float]
    compound: str            # "SOFT" | "MEDIUM" | "HARD"
    optimal_temp_range: List[float]
    status: str


@dataclass
class ChassisTelemetry:
    """Chassis dynamics telemetry"""
    speed_kph: float
    acceleration_g: Dict[str, float]  # lateral, longitudinal, vertical
    steering_angle: float      # degrees
    throttle_position: float   # %
    brake_position: float      # %
    suspension_travel: Dict[str, float]
    downforce_kg: float
    downforce_kg: float
    drag_coefficient: float
    safety: Optional['SafetyTelemetry'] = None


@dataclass
class SafetyTelemetry:
    """Safety loop status"""
    ams_ok: bool       # Accumulator Management System
    imd_ok: bool       # Insulation Monitoring Device
    hv_on: bool        # High Voltage Active
    bspd_ok: bool      # Brake Plausibility Device
    apps: float        # Accelerator Pedal %
    bpps: float        # Brake Pedal %


@dataclass
class EnergyManagement:
    """EV Formula Energy Management System"""
    attack_mode_active: bool      # Formula E Attack Mode (+35kW boost)
    attack_mode_remaining: float  # Seconds remaining (max 240s per activation)
    attack_mode_activations: int  # Times activated this session
    regen_level: int              # 0-10 regenerative braking strength
    regen_mode: str               # "COAST" | "LIFT" | "BRAKE"
    deployment_rate: float        # kW being deployed
    harvest_rate: float           # kW being harvested
    net_energy_flow: float        # Positive = consuming, negative = regen
    energy_target: float          # Target energy for race strategy
    energy_delta: float           # Delta from target (+/-)


@dataclass
class PowerMap:
    """Motor Power Map Configuration"""
    map_id: int                   # 1-12 map setting
    name: str                     # Human readable name
    power_limit_kw: float         # Maximum power output
    torque_limit_pct: float       # Torque limit as percentage
    throttle_curve: str           # "LINEAR" | "PROGRESSIVE" | "AGGRESSIVE"
    regen_on_throttle_lift: bool  # Regen when throttle released
    tc_enabled: bool              # Traction control active
    tc_slip_target: float         # Target slip percentage


@dataclass
class CellMonitoring:
    """Battery Cell-Level Monitoring (96-cell pack typical)"""
    cell_count: int                    # Total cells in pack
    cell_voltages: List[float]         # Individual cell voltages (V)
    cell_temps: List[float]            # Individual cell temps (°C)
    min_cell_voltage: float            # Lowest cell voltage
    max_cell_voltage: float            # Highest cell voltage
    voltage_delta: float               # Max - Min voltage spread
    min_cell_temp: float               # Coldest cell
    max_cell_temp: float               # Hottest cell
    temp_delta: float                  # Temperature spread
    weak_cells: List[int]              # Indices of underperforming cells
    balancing_active: bool             # Cell balancing in progress
    pack_health_pct: float             # Overall pack health


class VehicleSimulator:
    """EV Formula vehicle telemetry simulation"""
    
    # Power Map Presets (EV Formula Standard)
    POWER_MAPS = {
        1: {"name": "ECO", "power_limit": 200, "torque_pct": 70, "curve": "LINEAR", "regen_lift": True, "tc": True, "slip": 3.0},
        2: {"name": "ECO+", "power_limit": 220, "torque_pct": 75, "curve": "LINEAR", "regen_lift": True, "tc": True, "slip": 3.0},
        3: {"name": "WET", "power_limit": 180, "torque_pct": 60, "curve": "PROGRESSIVE", "regen_lift": True, "tc": True, "slip": 2.0},
        4: {"name": "WET+", "power_limit": 200, "torque_pct": 65, "curve": "PROGRESSIVE", "regen_lift": True, "tc": True, "slip": 2.5},
        5: {"name": "RACE", "power_limit": 300, "torque_pct": 90, "curve": "PROGRESSIVE", "regen_lift": True, "tc": True, "slip": 5.0},
        6: {"name": "RACE+", "power_limit": 320, "torque_pct": 95, "curve": "PROGRESSIVE", "regen_lift": True, "tc": True, "slip": 6.0},
        7: {"name": "ATTACK", "power_limit": 350, "torque_pct": 100, "curve": "AGGRESSIVE", "regen_lift": False, "tc": True, "slip": 8.0},
        8: {"name": "QUALI", "power_limit": 350, "torque_pct": 100, "curve": "AGGRESSIVE", "regen_lift": False, "tc": False, "slip": 10.0},
        9: {"name": "PUSH", "power_limit": 330, "torque_pct": 98, "curve": "AGGRESSIVE", "regen_lift": True, "tc": True, "slip": 7.0},
        10: {"name": "DEFEND", "power_limit": 280, "torque_pct": 85, "curve": "PROGRESSIVE", "regen_lift": True, "tc": True, "slip": 4.0},
        11: {"name": "HARVEST", "power_limit": 250, "torque_pct": 80, "curve": "LINEAR", "regen_lift": True, "tc": True, "slip": 4.0},
        12: {"name": "SAFETY", "power_limit": 150, "torque_pct": 50, "curve": "LINEAR", "regen_lift": True, "tc": True, "slip": 2.0},
    }
    
    def __init__(self):
        self.time_offset = 0.0
        self.lap_progress = 0.0
        self.stint_laps = 0
        self.total_laps = 0
        
        # Base states
        self.motor_temp = 65.0
        self.battery_soc = 100.0
        self.battery_temp = 30.0
        self.brake_temps = [400.0, 380.0, 350.0, 340.0]  # FL, FR, RL, RR
        self.tire_temps = [85.0, 84.0, 82.0, 81.0]
        self.tire_wear = [100.0, 100.0, 100.0, 100.0]
        
        # Energy Strategy State
        self.driving_mode = DrivingMode.RACE
        self.energy_used = 0.0
        self.regen_recovered = 0.0
        self.lap_start_energy = 0.0
        self.energy_target_per_lap = 1.85 # kWh
        self.attack_mode_active = False
        self.attack_mode_timer = 0.0
        self.attack_mode_activations = 0
        
        # Power Map State
        self.current_power_map = 5  # Default: RACE
        
        # Regen State
        self.regen_level = 5  # 0-10 scale
        self.regen_mode = "LIFT"  # COAST | LIFT | BRAKE
        self.current_harvest_rate = 0.0
        self.current_deployment_rate = 0.0
        
        # Cell Monitoring State (96-cell pack)
        self.cell_count = 96
        self.cell_voltages = [3.7 + 0.1 * random.random() for _ in range(96)]
        self.cell_temps = [30.0 + 5.0 * random.random() for _ in range(96)]
        self.balancing_active = False
        
        # Track characteristics (Silverstone approximation)
        self.track_zones = [
            {"type": "straight", "length": 0.15, "max_speed": 320, "direction": 0},
            {"type": "corner", "length": 0.08, "max_speed": 180, "direction": 1},   # Right
            {"type": "straight", "length": 0.12, "max_speed": 290, "direction": 0},
            {"type": "corner", "length": 0.10, "max_speed": 200, "direction": -1},  # Left
            {"type": "corner", "length": 0.05, "max_speed": 150, "direction": 1},   # Right
            {"type": "straight", "length": 0.18, "max_speed": 340, "direction": 0},
            {"type": "corner", "length": 0.06, "max_speed": 170, "direction": -1},  # Left
            {"type": "corner", "length": 0.08, "max_speed": 190, "direction": 1},   # Right
            {"type": "straight", "length": 0.10, "max_speed": 280, "direction": 0},
            {"type": "corner", "length": 0.08, "max_speed": 160, "direction": 1},   # Right
        ]
        
        # Datalog Replay State
        self.replay_mode = False
        self.datalog_data: List[Dict] = []
        self.replay_index = 0
        self.current_log_file = ""
    
    def load_datalog(self, filename: str) -> bool:
        """Load a CSV datalog file for replay"""
        try:
            # Try to find the file in known locations
            base_paths = [
                Path("."), 
                Path("../dataRecord"),
                Path("/Users/nrkwine/Downloads/f1/formulaSystem/neuro-adaptive telemetry system/dataRecord")
            ]
            
            file_path = None
            for base in base_paths:
                p = base / filename
                if p.exists():
                    file_path = p
                    break
            
            if not file_path:
                print(f"❌ Datalog file not found: {filename}")
                return False

            with open(file_path, 'r') as f:
                reader = csv.DictReader(f)
                self.datalog_data = list(reader)
            
            if not self.datalog_data:
                return False
                
            self.replay_mode = True
            self.replay_index = 0
            self.current_log_file = filename
            print(f"✅ Loaded {len(self.datalog_data)} frames from {filename}")
            return True
        except Exception as e:
            print(f"❌ Error loading datalog: {e}")
            return False

    def toggle_replay(self, enabled: bool):
        """Toggle replay mode"""
        self.replay_mode = enabled and len(self.datalog_data) > 0

    def update(self, dt: float = 0.1):
        """Update simulation state or advance replay"""
        if self.replay_mode and self.datalog_data:
            self.replay_index = (self.replay_index + 1) % len(self.datalog_data)
            return

        self.time_offset += dt
        self.lap_progress = (self.lap_progress + 0.003) % 1.0
        
        # Attack Mode Logic
        if self.attack_mode_active:
            self.attack_mode_timer -= dt
            if self.attack_mode_timer <= 0:
                self.attack_mode_active = False
                self.driving_mode = DrivingMode.RACE
        
        # Energy Consumption Integrated
        power_demand = 300 if self.driving_mode == DrivingMode.ATTACK else 250
        consumption = (power_demand * dt) / 3600 # kWh
        self.energy_used += consumption

    
    def update(self, dt: float = 0.1):
        """Update simulation state"""
        self.time_offset += dt
        self.lap_progress = (self.lap_progress + 0.003) % 1.0
        
        # Check for lap completion
        if self.lap_progress < 0.01 and self.time_offset > 1.0:
            self.stint_laps += 1
            self.stint_laps += 1
            self.total_laps += 1
            self.lap_start_energy = self.energy_used
            
    def set_drive_mode(self, mode: str):
        """Standard EV Formula Mode Switching"""
        if mode in DrivingMode.__members__:
            self.driving_mode = DrivingMode[mode]
            if self.driving_mode == DrivingMode.ATTACK:
                self.attack_mode_active = True
                self.attack_mode_timer = 240.0 # 4 minutes
    
    def pit_stop(self):
        """Simulate Formula Pit Stop"""
        self.battery_soc = 100.0
        self.energy_used = 0.0
        self.lap_start_energy = 0.0
        self.tire_wear = [100.0] * 4
        self.tire_temps = [90.0] * 4
        self.stint_laps = 0
        
        # Get current track zone
        zone = self._get_current_zone()
        is_corner = zone["type"] == "corner"
        
        # Motor temperature dynamics
        if is_corner:
            self.motor_temp += 0.3 * random.uniform(0.8, 1.2)
        else:
            self.motor_temp -= 0.1 * random.uniform(0.8, 1.2)
        self.motor_temp = max(50, min(95, self.motor_temp))
        
        # Battery discharge
        discharge_rate = 0.02 if is_corner else 0.03
        self.battery_soc -= discharge_rate * random.uniform(0.8, 1.2)
        self.battery_soc = max(5, self.battery_soc)
        
        # Battery temperature
        self.battery_temp += 0.01 * (80 - self.battery_soc) / 80
        self.battery_temp = max(25, min(55, self.battery_temp))
        
        # Brake temperatures
        brake_heat = 20 if is_corner else -5
        for i in range(4):
            self.brake_temps[i] += brake_heat * random.uniform(0.7, 1.3)
            self.brake_temps[i] = max(150, min(850, self.brake_temps[i]))
        
        # Tire temperatures
        tire_heat = 2 if is_corner else 0.5
        for i in range(4):
            self.tire_temps[i] += tire_heat * random.uniform(0.5, 1.5) - 1
            self.tire_temps[i] = max(60, min(125, self.tire_temps[i]))
        
        # Tire wear
        wear_rate = 0.03 if is_corner else 0.01
        for i in range(4):
            self.tire_wear[i] -= wear_rate * random.uniform(0.8, 1.2)
            self.tire_wear[i] = max(0, self.tire_wear[i])
    
    def _get_current_zone(self) -> Dict:
        """Get the current track zone based on lap progress"""
        cumulative = 0
        for zone in self.track_zones:
            cumulative += zone["length"]
            if self.lap_progress < cumulative:
                return zone
        return self.track_zones[-1]
    
    def get_motor_telemetry(self) -> MotorTelemetry:
        """Get current motor telemetry"""
        zone = self._get_current_zone()
        
        # Calculate RPM based on speed
        speed = zone["max_speed"] * (0.8 + 0.2 * random.random())
        rpm = int(speed * 45 + random.randint(-200, 200))
        
        # Power based on acceleration phase
        power = 350 + (200 if zone["type"] == "straight" else 100)
        power *= 0.9 + 0.1 * random.random()
        
        # Determine status
        if self.motor_temp > 90:
            status = "critical"
        elif self.motor_temp > 80:
            status = "warning"
        else:
            status = "optimal"
        
        return MotorTelemetry(
            rpm=rpm,
            power_kw=round(power, 1),
            torque_nm=round(power * 1000 / (rpm / 60 * 2 * math.pi) if rpm > 0 else 0, 1),
            temperature=round(self.motor_temp, 1),
            efficiency=round(92 - 0.1 * (self.motor_temp - 60), 1),
            mode=self.driving_mode.value,
            inv_mode="TORQUE" if self.driving_mode in [DrivingMode.RACE, DrivingMode.ATTACK] else "SPEED",
            map_setting=8 if self.driving_mode == DrivingMode.ATTACK else 5,
            status=status
        )
    
    def get_battery_telemetry(self) -> BatteryTelemetry:
        """Get current battery telemetry"""
        voltage = 780 + (self.battery_soc / 100) * 120
        current = 200 + 100 * random.random()
        
        if self.battery_soc < 15 or self.battery_temp > 50:
            status = "critical"
        elif self.battery_soc < 25 or self.battery_temp > 45:
            status = "warning"
        else:
            status = "optimal"
        
        return BatteryTelemetry(
            soc=round(self.battery_soc, 1),
            voltage=round(voltage, 1),
            current=round(current, 1),
            temperature=round(self.battery_temp, 1),
            cell_balance=round(98 + 2 * random.random(), 1),
            power_limit=round(350 if self.driving_mode == DrivingMode.ATTACK else 300, 0),
            energy_used_kwh=round(self.energy_used, 2),
            regen_kwh=round(self.regen_recovered, 2),
            lap_energy_kwh=round(self.energy_used - self.lap_start_energy, 2),
            target_delta_kwh=round((self.energy_used - self.lap_start_energy) - (self.lap_progress * self.energy_target_per_lap), 2),
            regen_enabled=self.battery_soc < 95,
            status=status
        )
    
    def get_brake_telemetry(self) -> BrakeTelemetry:
        """Get current brake telemetry"""
        avg_temp = sum(self.brake_temps) / 4
        
        if avg_temp > 800:
            status = "critical"
        elif avg_temp > 700:
            status = "warning"
        else:
            status = "optimal"
        
        return BrakeTelemetry(
            front_left_temp=round(self.brake_temps[0], 0),
            front_right_temp=round(self.brake_temps[1], 0),
            rear_left_temp=round(self.brake_temps[2], 0),
            rear_right_temp=round(self.brake_temps[3], 0),
            brake_bias=57.5,
            brake_pressure=round(80 + 40 * random.random(), 1),
            wear_front=round(95 - self.stint_laps * 0.5, 1),
            wear_rear=round(97 - self.stint_laps * 0.3, 1),
            status=status
        )
    
    def get_tire_telemetry(self) -> TireTelemetry:
        """Get current tire telemetry"""
        def tire_data(idx: int) -> Dict[str, float]:
            return {
                "temp": round(self.tire_temps[idx], 1),
                "pressure": round(1.8 + 0.1 * (self.tire_temps[idx] - 80) / 20, 2),
                "wear": round(self.tire_wear[idx], 1)
            }
        
        avg_temp = sum(self.tire_temps) / 4
        min_wear = min(self.tire_wear)
        
        if avg_temp > 115 or min_wear < 20:
            status = "critical"
        elif avg_temp > 105 or min_wear < 40:
            status = "warning"
        else:
            status = "optimal"
        
        return TireTelemetry(
            front_left=tire_data(0),
            front_right=tire_data(1),
            rear_left=tire_data(2),
            rear_right=tire_data(3),
            compound="MEDIUM",
            optimal_temp_range=[75, 100],
            status=status
        )
    
    def get_chassis_telemetry(self) -> ChassisTelemetry:
        """Get current chassis dynamics"""
        zone = self._get_current_zone()
        speed = zone["max_speed"] * (0.85 + 0.15 * random.random())
        
        is_corner = zone["type"] == "corner"
        direction = zone.get("direction", 1)
        
        # Calculate realistic G-forces
        lateral_g = (3.5 * random.uniform(0.8, 1.0) * direction) if is_corner else 0.2 * random.uniform(-1, 1)
        long_g = -1.5 if is_corner else 1.0 * random.uniform(0.5, 1.0)
        
        # Calculate steering angle based on Lateral G and direction
        # Positive angle = Right turn (positive Lateral G)
        # Negative angle = Left turn (negative Lateral G)
        steering_angle = 45 * (lateral_g / 3.5) if is_corner else 0
        
        return ChassisTelemetry(
            speed_kph=round(speed, 1),
            acceleration_g={
                "lateral": round(lateral_g, 2),
                "longitudinal": round(long_g, 2),
                "vertical": round(1.0 + 0.1 * random.gauss(0, 1), 2)
            },
            steering_angle=round(steering_angle, 1),
            throttle_position=round(30 if is_corner else 95, 0),
            brake_position=round(60 if is_corner else 0, 0),
            suspension_travel={
                "fl": round(10 + 5 * random.random(), 1),
                "fr": round(10 + 5 * random.random(), 1),
                "rl": round(12 + 5 * random.random(), 1),
                "rr": round(12 + 5 * random.random(), 1)
            },
            downforce_kg=round(500 + (speed / 300) * 800, 0),
            drag_coefficient=0.95
        )
    
    def get_energy_management(self) -> EnergyManagement:
        """Get current energy management state"""
        zone = self._get_current_zone()
        is_braking = zone["type"] == "corner"
        
        # Calculate deployment and harvest rates
        power_map = self.POWER_MAPS.get(self.current_power_map, self.POWER_MAPS[5])
        if is_braking and self.regen_level > 0:
            self.current_harvest_rate = min(150, self.regen_level * 15) * random.uniform(0.8, 1.0)
            self.current_deployment_rate = 0
        else:
            self.current_harvest_rate = 0
            self.current_deployment_rate = power_map["power_limit"] * random.uniform(0.6, 0.95)
        
        net_flow = self.current_deployment_rate - self.current_harvest_rate
        
        return EnergyManagement(
            attack_mode_active=self.attack_mode_active,
            attack_mode_remaining=round(self.attack_mode_timer, 1),
            attack_mode_activations=self.attack_mode_activations,
            regen_level=self.regen_level,
            regen_mode=self.regen_mode,
            deployment_rate=round(self.current_deployment_rate, 1),
            harvest_rate=round(self.current_harvest_rate, 1),
            net_energy_flow=round(net_flow, 1),
            energy_target=round(self.energy_target_per_lap * (self.total_laps + 1), 2),
            energy_delta=round(self.energy_used - (self.energy_target_per_lap * self.total_laps + self.energy_target_per_lap * self.lap_progress), 2)
        )
    
    def get_power_map(self) -> PowerMap:
        """Get current power map configuration"""
        preset = self.POWER_MAPS.get(self.current_power_map, self.POWER_MAPS[5])
        
        return PowerMap(
            map_id=self.current_power_map,
            name=preset["name"],
            power_limit_kw=preset["power_limit"],
            torque_limit_pct=preset["torque_pct"],
            throttle_curve=preset["curve"],
            regen_on_throttle_lift=preset["regen_lift"],
            tc_enabled=preset["tc"],
            tc_slip_target=preset["slip"]
        )
    
    def get_cell_monitoring(self) -> CellMonitoring:
        """Get battery cell-level monitoring data"""
        # Simulate cell voltage drift
        for i in range(self.cell_count):
            drift = random.gauss(0, 0.002)
            self.cell_voltages[i] = max(3.2, min(4.2, self.cell_voltages[i] + drift))
            
            # Temperature varies with position and load
            temp_drift = random.gauss(0, 0.1)
            base_heat = 0.05 if self.attack_mode_active else 0.02
            self.cell_temps[i] = max(20, min(60, self.cell_temps[i] + temp_drift + base_heat))
        
        min_v = min(self.cell_voltages)
        max_v = max(self.cell_voltages)
        min_t = min(self.cell_temps)
        max_t = max(self.cell_temps)
        
        # Identify weak cells (voltage significantly below average)
        avg_voltage = sum(self.cell_voltages) / self.cell_count
        weak_cells = [i for i, v in enumerate(self.cell_voltages) if v < avg_voltage - 0.1]
        
        # Activate balancing if voltage spread is too high
        self.balancing_active = (max_v - min_v) > 0.05
        
        # Calculate pack health
        voltage_health = 100 - ((max_v - min_v) / 0.2) * 10  # 0.2V spread = 10% penalty
        temp_health = 100 - max(0, (max_t - 45) * 2)  # Above 45°C = penalty
        pack_health = min(100, max(0, (voltage_health + temp_health) / 2))
        
        return CellMonitoring(
            cell_count=self.cell_count,
            cell_voltages=[round(v, 3) for v in self.cell_voltages],
            cell_temps=[round(t, 1) for t in self.cell_temps],
            min_cell_voltage=round(min_v, 3),
            max_cell_voltage=round(max_v, 3),
            voltage_delta=round(max_v - min_v, 3),
            min_cell_temp=round(min_t, 1),
            max_cell_temp=round(max_t, 1),
            temp_delta=round(max_t - min_t, 1),
            weak_cells=weak_cells[:5],  # Limit to top 5 weak cells
            balancing_active=self.balancing_active,
            pack_health_pct=round(pack_health, 1)
        )
    
    def set_power_map(self, map_id: int) -> bool:
        """Change to a different power map"""
        if 1 <= map_id <= 12:
            self.current_power_map = map_id
            return True
        return False
    
    def set_regen_level(self, level: int) -> bool:
        """Set regenerative braking level (0-10)"""
        if 0 <= level <= 10:
            self.regen_level = level
            return True
        return False
    
    def activate_attack_mode(self) -> bool:
        """Activate Formula E style Attack Mode"""
        if not self.attack_mode_active and self.attack_mode_activations < 2:
            self.attack_mode_active = True
            self.attack_mode_timer = 240.0  # 4 minutes
            self.attack_mode_activations += 1
            self.current_power_map = 7  # Switch to ATTACK map
            return True
        return False
    
    def get_all_telemetry(self) -> Dict:
        """Get complete vehicle telemetry"""
        self.update()
        
        if self.replay_mode and self.datalog_data:
            return self._get_replay_telemetry()
        
        motor = self.get_motor_telemetry()
        battery = self.get_battery_telemetry()
        brakes = self.get_brake_telemetry()
        tires = self.get_tire_telemetry()
        chassis = self.get_chassis_telemetry()
        energy = self.get_energy_management()
        power_map = self.get_power_map()
        cells = self.get_cell_monitoring()
        
        # Overall status
        statuses = [motor.status, battery.status, brakes.status, tires.status]
        if "critical" in statuses:
            overall_status = "critical"
        elif "warning" in statuses:
            overall_status = "warning"
        else:
            overall_status = "optimal"
        
        return {
            "timestamp": datetime.now().isoformat(),
            "motor": asdict(motor),
            "battery": asdict(battery),
            "brakes": asdict(brakes),
            "tires": asdict(tires),
            "chassis": asdict(chassis),
            "energyManagement": asdict(energy),
            "powerMap": asdict(power_map),
            "cellMonitoring": asdict(cells),
            "lap": {
                "current": self.total_laps + 1,
                "stint": self.stint_laps,
                "progress": round(self.lap_progress, 4)
            },
            "overallStatus": overall_status
        }
    
        self.tire_wear = [100.0, 100.0, 100.0, 100.0]
        self.brake_temps = [300.0, 300.0, 280.0, 280.0]
        self.stint_laps = 0

    def _get_replay_telemetry(self) -> Dict:
        """Extract telemetry from current CSV frame"""
        row = self.datalog_data[self.replay_index]
        
        # Helper to parse float safely
        def f(key, default=0.0):
            try:
                return float(row.get(key, default))
            except:
                return default
        
        # Helper to parse int/bool safely
        def i(key, default=0):
            try:
                return int(float(row.get(key, default)))
            except:
                return default

        # Map CSV Data
        rpm_l = f("Wheel_RPM_Left")
        rpm_r = f("Wheel_RPM_Right")
        avg_rpm = (rpm_l + rpm_r) / 2
        
        # Motor
        motor = MotorTelemetry(
            rpm=int(avg_rpm),
            power_kw=f("BAMOPower") / 1000.0,
            torque_nm=0.0, # Not in CSV
            temperature=f("MotorTemp"),
            efficiency=90.0,
            mode="REPLAY",
            status="optimal" if f("MotorTemp") < 90 else "warning"
        )
        
        # Battery
        volts = f("BAMOVolt")
        amps = f("BAMOAmp")
        motor_temp = f("BAMOTemp") # Using BAMOTemp as Battery Temp proxy if needed or just specific
        
        battery = BatteryTelemetry(
            soc=80.0, # Not explicit in CSV, assumes constant or modeled
            voltage=volts,
            current=amps,
            temperature=motor_temp, # Placeholder if BAMO is inverter/motor controller
            cell_balance=99.0,
            power_limit=600.0,
            regen_enabled=True,
            status="optimal"
        )
        
        # Chassis & Safety
        accel_x = f("IMU_AccelX")
        accel_y = f("IMU_AccelY")
        speed = f("GPS_Speed") # Or calc from RPM
        
        safety = SafetyTelemetry(
            ams_ok=i("AMS_OK") == 1,
            imd_ok=i("IMD_OK") == 1,
            hv_on=i("HV_ON") == 1,
            bspd_ok=i("BSPD_OK") == 1,
            apps=f("APPS"),
            bpps=f("BPPS")
        )
        
        chassis = ChassisTelemetry(
            speed_kph=speed if speed > 0 else avg_rpm * 0.05, # Fallback
            acceleration_g={
                "lateral": accel_x,
                "longitudinal": accel_y,
                "vertical": f("IMU_AccelZ")
            },
            steering_angle=0.0, # Not in CSV
            throttle_position=f("APPS"),
            brake_position=f("BPPS"),
            suspension_travel={
                "fl": f("Stroke1_mm"),
                "fr": f("Stroke2_mm"),
                "rl": f("Stroke1_mm"), # Duplicated/Placeholder
                "rr": f("Stroke2_mm")
            },
            downforce_kg=0.0,
            drag_coefficient=0.9,
            safety=safety
        )
        
        # Brakes (Simulated based on BPPS since not in CSV)
        brakes = BrakeTelemetry(
            front_left_temp=300 + f("BPPS")*2,
            front_right_temp=300 + f("BPPS")*2,
            rear_left_temp=300 + f("BPPS")*2,
            rear_right_temp=300 + f("BPPS")*2,
            brake_bias=55.0,
            brake_pressure=f("BPPS"),
            wear_front=90.0,
            wear_rear=90.0,
            status="optimal"
        )
        
        # Tires (Simulated)
        tires = TireTelemetry(
            front_left={"temp": 80, "pressure": 1.9, "wear": 95},
            front_right={"temp": 80, "pressure": 1.9, "wear": 95},
            rear_left={"temp": 80, "pressure": 1.9, "wear": 95},
            rear_right={"temp": 80, "pressure": 1.9, "wear": 95},
            compound="SLICK",
            optimal_temp_range=[70,100],
            status="optimal"
        )

        return {
            "timestamp": datetime.now().isoformat(),
            "motor": asdict(motor),
            "battery": asdict(battery),
            "brakes": asdict(brakes),
            "tires": asdict(tires),
            "chassis": asdict(chassis), # Includes Safety
            "lap": {
                "current": self.replay_index,
                "stint": 1,
                "progress": self.replay_index / len(self.datalog_data)
            },
            "overallStatus": "replay",
            "isReplay": True,
            "replayIndex": self.replay_index,
            "totalFrames": len(self.datalog_data)
        }
