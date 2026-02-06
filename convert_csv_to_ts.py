
import csv
import json
import os
import math

base_dir = '/Users/nrkwine/Downloads/neuro-adaptive-telemetry-dashboards-master/dataRecord'
target_ts = '/Users/nrkwine/Downloads/neuro-adaptive-telemetry-dashboards-master/frontend/src/data/demoReplayData.ts'

files_to_process = ['datalog_000.csv', 'datalog_001.csv', 'datalog_002.csv']
all_logs = {}

for filename in files_to_process:
    source_csv = os.path.join(base_dir, filename)
    if not os.path.exists(source_csv):
        print(f"Skipping {filename}: Not found")
        continue
        
    telemetry_data = []
    
    with open(source_csv, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Helper to get float
            def get_f(key, default=0.0):
                try:
                    return float(row.get(key, default))
                except:
                    return default

            # Helper to get int
            def get_i(key, default=0):
                try:
                    return int(float(row.get(key, default))) # float parsing first handles "1.0" strings
                except:
                    return default

            # Derived values
            wheel_rpm = (get_f('Wheel_RPM_Left') + get_f('Wheel_RPM_Right')) / 2
            motor_rpm = wheel_rpm * 4.0 # Approx reduction ratio
            speed_kph = get_f('GPS_Speed')
            if speed_kph == 0 and wheel_rpm > 0:
                speed_kph = (wheel_rpm * 60 * 0.0016)

            # Get raw battery values
            raw_voltage = get_f('BAMOVolt(V)')
            raw_current = get_f('BAMOAmp(A)')
            raw_power = get_f('BAMOPower(W)')
            
            # Simulate realistic battery data if source is zero (data quality issue)
            if raw_voltage < 1 and raw_current == 0:
                # Estimate voltage based on a typical FSAE battery (80-100V pack)
                base_voltage = 380  # Nominal voltage
                # Voltage drops slightly with speed/power
                voltage_drop = (speed_kph / 200) * 20  # Up to 20V drop at max speed
                battery_voltage = max(320, base_voltage - voltage_drop + (motor_rpm / 5000) * 10)
                
                # Estimate current from motor power (P = V * I)
                estimated_power = motor_rpm * 0.015 + speed_kph * 0.8  # Rough power estimate in kW
                battery_current = (estimated_power * 1000) / battery_voltage if battery_voltage > 0 else 0
                battery_power_kw = estimated_power
            else:
                battery_voltage = raw_voltage if raw_voltage > 0 else 400
                battery_current = raw_current
                battery_power_kw = raw_power / 1000 if raw_power != 0 else (battery_voltage * battery_current) / 1000

            # Simulate SoC (decreasing over time based on power use)
            base_soc = 95 - (len(telemetry_data) * 0.001)  # Slowly depleting
            soc = max(20, min(100, base_soc - (speed_kph / 50)))

            frame = {
                "timestamp": row.get('UnixTime', ''),
                "motor": {
                    "rpm": int(motor_rpm),
                    "power_kw": round(battery_power_kw, 2),
                    "torque_nm": round(battery_current * 0.12, 1),  # Improved torque estimate
                    "temperature": round(get_f('MotorTemp(C)', 45) if get_f('MotorTemp(C)') > 0 else 45 + (speed_kph / 8), 1),
                    "efficiency": round(max(75, min(98, 92 + (motor_rpm / 2000) - (battery_power_kw / 20))), 1),
                    "mode": "RACE" if speed_kph > 5 else "READY",
                    "inv_mode": "RUN" if motor_rpm > 100 else "READY",
                    "status": "optimal",
                    # Advanced inverter fields
                    "inverter": {
                        "dc_bus_voltage": round(battery_voltage * 1.02, 1),  # Slightly higher than battery
                        "phase_u": round(battery_current * 0.577 * (1 + 0.05 * (len(telemetry_data) % 3)), 1),  # U phase
                        "phase_v": round(battery_current * 0.577 * (1 + 0.05 * ((len(telemetry_data) + 1) % 3)), 1),  # V phase
                        "phase_w": round(battery_current * 0.577 * (1 + 0.05 * ((len(telemetry_data) + 2) % 3)), 1),  # W phase
                        "igbt_temp": round(55 + (battery_current / 20) + (speed_kph / 15), 1),
                        "switching_freq": 8000 if motor_rpm > 500 else 4000,  # Hz
                        "gate_driver_ok": True,
                        "fault_code": 0,
                        "status": "RUN" if motor_rpm > 100 else "READY"
                    }
                },
                "battery": {
                    "soc": round(soc, 1),
                    "voltage": round(battery_voltage, 1),
                    "current": round(battery_current, 1),
                    "power_kw": round(battery_power_kw, 2),
                    "temperature": get_f('BAMOTemp(C)', 35) if get_f('BAMOTemp(C)') > 0 else 35 + (battery_current / 20),
                    "min_cell_temp": 30 + (battery_current / 30),
                    "max_cell_temp": 38 + (battery_current / 25),
                    "health_soh": 98,
                    "status": "optimal" if soc > 20 else "warning"
                },
                "chassis": {
                    "speed_kph": speed_kph,
                    "steering_angle": round(5 * math.sin(len(telemetry_data) * 0.1), 1),  # Simulated steering
                    "throttle_position": get_f('APPS(%)'),
                    "brake_position": get_f('BPPS(%)'),
                    "acceleration_g": {
                        # Simulate G-force based on speed and time
                        "lateral": round(get_f('IMU_AccelY') if get_f('IMU_AccelY') != 0 else 
                                        (speed_kph / 100) * math.sin(len(telemetry_data) * 0.15) * 1.2, 2),
                        "longitudinal": round(get_f('IMU_AccelX') if get_f('IMU_AccelX') != 0 else
                                             (speed_kph / 100) * math.cos(len(telemetry_data) * 0.08) * 0.6, 2),
                        "vertical": round(get_f('IMU_AccelZ') if get_f('IMU_AccelZ') != 0 else 1.0, 2)
                    },
                    # Aerodynamic downforce (kg) = 0.5 * rho * v^2 * Cl * A, simplified
                    "downforce_kg": round((speed_kph ** 2) * 0.015, 1),  # ~50-150kg at racing speeds
                    "suspension": {
                        "fl": {
                            "travel_mm": round(get_f('Stroke1_mm') if get_f('Stroke1_mm') != 0 else 15 + 20 * math.sin(len(telemetry_data) * 0.12), 1),
                            "damper_velocity": round(abs(math.cos(len(telemetry_data) * 0.2)) * 15 + speed_kph * 0.05, 1),
                            "spring_rate_n_mm": 45,
                            "damping_n_mm_s": 25,
                            "force_n": round(45 * (15 + 20 * math.sin(len(telemetry_data) * 0.12)) + 25 * (abs(math.cos(len(telemetry_data) * 0.2)) * 15), 0),
                            "camber_deg": round(-2.0 + (-0.02 * (15 + 20 * math.sin(len(telemetry_data) * 0.12))), 2),
                            "oil_temp_c": round(45 + (speed_kph / 5), 1),
                            "geometry": "Double Wishbone",
                            "load_status": "high" if speed_kph > 60 else "normal"
                        },
                        "fr": {
                            "travel_mm": round(get_f('Stroke2_mm') if get_f('Stroke2_mm') != 0 else 15 + 18 * math.sin(len(telemetry_data) * 0.13 + 0.5), 1),
                            "damper_velocity": round(abs(math.cos(len(telemetry_data) * 0.22)) * 14 + speed_kph * 0.04, 1),
                            "spring_rate_n_mm": 45,
                            "damping_n_mm_s": 25,
                            "force_n": round(45 * (15 + 18 * math.sin(len(telemetry_data) * 0.13 + 0.5)) + 25 * (abs(math.cos(len(telemetry_data) * 0.22)) * 14), 0),
                            "camber_deg": round(-2.0 + (-0.02 * (15 + 18 * math.sin(len(telemetry_data) * 0.13 + 0.5))), 2),
                            "oil_temp_c": round(45 + (speed_kph / 5.2), 1),
                            "geometry": "Double Wishbone",
                            "load_status": "high" if speed_kph > 60 else "normal"
                        },
                        "rl": {
                            "travel_mm": round(get_f('Stroke1_mm') if get_f('Stroke1_mm') != 0 else 18 + 25 * math.sin(len(telemetry_data) * 0.11), 1),
                            "damper_velocity": round(abs(math.cos(len(telemetry_data) * 0.18)) * 12 + speed_kph * 0.06, 1),
                            "spring_rate_n_mm": 50,
                            "damping_n_mm_s": 30,
                            "force_n": round(50 * (18 + 25 * math.sin(len(telemetry_data) * 0.11)) + 30 * (abs(math.cos(len(telemetry_data) * 0.18)) * 12), 0),
                            "camber_deg": round(-1.5 + (-0.015 * (18 + 25 * math.sin(len(telemetry_data) * 0.11))), 2),
                            "oil_temp_c": round(50 + (speed_kph / 4.8), 1),
                            "geometry": "Double Wishbone",
                            "load_status": "high" if speed_kph > 50 else "normal"
                        },
                        "rr": {
                            "travel_mm": round(get_f('Stroke2_mm') if get_f('Stroke2_mm') != 0 else 18 + 22 * math.sin(len(telemetry_data) * 0.14 + 1), 1),
                            "damper_velocity": round(abs(math.cos(len(telemetry_data) * 0.19)) * 13 + speed_kph * 0.05, 1),
                            "spring_rate_n_mm": 50,
                            "damping_n_mm_s": 30,
                            "force_n": round(50 * (18 + 22 * math.sin(len(telemetry_data) * 0.14 + 1)) + 30 * (abs(math.cos(len(telemetry_data) * 0.19)) * 13), 0),
                            "camber_deg": round(-1.5 + (-0.015 * (18 + 22 * math.sin(len(telemetry_data) * 0.14 + 1))), 2),
                            "oil_temp_c": round(50 + (speed_kph / 5.1), 1),
                            "geometry": "Double Wishbone",
                            "load_status": "high" if speed_kph > 50 else "normal"
                        }
                    },
                    # Keep old format for backwards compatibility
                    "suspension_travel": {
                        "fl": round(get_f('Stroke1_mm') if get_f('Stroke1_mm') != 0 else 15 + 20 * math.sin(len(telemetry_data) * 0.12), 1),
                        "fr": round(get_f('Stroke2_mm') if get_f('Stroke2_mm') != 0 else 15 + 18 * math.sin(len(telemetry_data) * 0.13), 1),
                        "rl": round(get_f('Stroke1_mm') if get_f('Stroke1_mm') != 0 else 18 + 25 * math.sin(len(telemetry_data) * 0.11), 1),
                        "rr": round(get_f('Stroke2_mm') if get_f('Stroke2_mm') != 0 else 18 + 22 * math.sin(len(telemetry_data) * 0.14), 1)
                    },
                    "safety": {
                        "hv_on": get_i('HV_ON') == 1,
                        "imd_ok": get_i('IMD_OK') == 1,
                        "ams_ok": get_i('AMS_OK') == 1,
                        "bspd_ok": get_i('BSPD_OK') == 1,
                        "apps": get_f('APPS(%)'),
                        "bpps": get_f('BPPS(%)')
                    }
                },
                "brakes": {
                    "pressure_front": get_f('BPPS(%)') * 0.8,
                    "pressure_rear": get_f('BPPS(%)') * 0.6,
                    "bias_percent": 55,
                    "status": "optimal",
                    # Disc temperatures for each wheel (°C) - increases with speed and braking
                    "fl_temp": round(180 + (speed_kph * 2) + (get_f('BPPS(%)') * 4), 1),
                    "fr_temp": round(180 + (speed_kph * 2) + (get_f('BPPS(%)') * 4) + 5, 1),  # slight variation
                    "rl_temp": round(160 + (speed_kph * 1.8) + (get_f('BPPS(%)') * 3.5), 1),
                    "rr_temp": round(160 + (speed_kph * 1.8) + (get_f('BPPS(%)') * 3.5) + 3, 1)
                },
                "tires": {
                    "front_left": { 
                        "temp": round(70 + (speed_kph / 5) + (get_f('BPPS(%)') * 0.3) + get_f('Stroke1_mm') * 0.1, 1), 
                        "pressure": round(1.75 + (speed_kph / 500) + (len(telemetry_data) % 100) * 0.001, 2), 
                        "wear": round(max(50, 99 - (len(telemetry_data) * 0.002) - (speed_kph / 100)), 1)
                    },
                    "front_right": { 
                        "temp": round(70 + (speed_kph / 5) + (get_f('BPPS(%)') * 0.3) + get_f('Stroke2_mm') * 0.1, 1), 
                        "pressure": round(1.75 + (speed_kph / 500) + ((len(telemetry_data) + 20) % 100) * 0.001, 2), 
                        "wear": round(max(50, 99 - (len(telemetry_data) * 0.002) - (speed_kph / 100)), 1)
                    },
                    "rear_left": { 
                        "temp": round(72 + (speed_kph / 4.5) + (get_f('APPS(%)') * 0.2), 1), 
                        "pressure": round(1.78 + (speed_kph / 500) + ((len(telemetry_data) + 40) % 100) * 0.001, 2), 
                        "wear": round(max(50, 98 - (len(telemetry_data) * 0.0025) - (speed_kph / 80)), 1)
                    },
                    "rear_right": { 
                        "temp": round(72 + (speed_kph / 4.5) + (get_f('APPS(%)') * 0.2), 1), 
                        "pressure": round(1.78 + (speed_kph / 500) + ((len(telemetry_data) + 60) % 100) * 0.001, 2), 
                        "wear": round(max(50, 98 - (len(telemetry_data) * 0.0025) - (speed_kph / 80)), 1)
                    }
                },
                # Advanced Aerodynamics telemetry
                "aero": {
                    "front_wing": {
                        "downforce_kg": round((speed_kph ** 2) * 0.006, 1),  # ~40% of total
                        "drag_n": round((speed_kph ** 2) * 0.002, 1),
                        "angle_deg": 12.5,  # Static setting
                        "aoa_deg": round(12.5 + math.sin(len(telemetry_data) * 0.05) * 1.5, 2),  # Dynamic AoA
                        "efficiency": round(95 - (speed_kph / 50), 1),
                        "cl": 1.85,  # Lift coefficient
                        "cd": 0.45,  # Drag coefficient
                        "ld_ratio": round(1.85 / 0.45, 2),  # L/D ratio
                        "surface_temp_c": round(35 + speed_kph * 0.15, 1)
                    },
                    "rear_wing": {
                        "downforce_kg": round((speed_kph ** 2) * 0.009, 1),  # ~60% of total
                        "drag_n": round((speed_kph ** 2) * 0.003, 1),
                        "angle_deg": 18.0,
                        "aoa_deg": round(18.0 + math.sin(len(telemetry_data) * 0.04) * 2.0, 2),
                        "efficiency": round(92 - (speed_kph / 40), 1),
                        "cl": 2.15,
                        "cd": 0.55,
                        "ld_ratio": round(2.15 / 0.55, 2),
                        "surface_temp_c": round(38 + speed_kph * 0.18, 1),
                        "drs_active": speed_kph > 80 and len(telemetry_data) % 200 < 50,  # DRS simulation
                        "drs_flap_angle": 0 if (speed_kph > 80 and len(telemetry_data) % 200 < 50) else 18.0
                    },
                    "diffuser": {
                        "downforce_kg": round((speed_kph ** 2) * 0.004, 1),
                        "expansion_ratio": 2.8,
                        "ground_clearance_mm": round(35 + 5 * math.sin(len(telemetry_data) * 0.08), 1)
                    },
                    "total_downforce_kg": round((speed_kph ** 2) * 0.019, 1),
                    "total_drag_n": round((speed_kph ** 2) * 0.005, 1),
                    "aero_balance": 42,  # % front
                    "ride_height_front_mm": round(30 + 3 * math.sin(len(telemetry_data) * 0.06), 1),
                    "ride_height_rear_mm": round(45 + 4 * math.sin(len(telemetry_data) * 0.07), 1)
                },
                "cellMonitoring": {
                    "cell_count": 96,
                    "voltages": [3.8] * 96, # Simplified
                    "min_voltage": 3.7,
                    "max_voltage": 3.9,
                    "voltage_delta": 0.2,
                    "min_cell_temp": 40,
                    "max_cell_temp": 48,
                    "balancing_active": True,
                    "pack_health_pct": 98
                }
            }
            telemetry_data.append(frame)
    all_logs[filename] = telemetry_data
    print(f"Processed {filename}: {len(telemetry_data)} frames")

# Write TS file structure
ts_content = f"""// Auto-generated from datalogs
import {{ VehicleTelemetryData }} from '../../types/telemetry';

export const DEMO_REPLAY_LOGS: Record<string, any[]> = {json.dumps(all_logs, indent=2)};

// Default export alias for compatibility if needed, or helper
export const getDemoLog = (key: string) => DEMO_REPLAY_LOGS[key] || DEMO_REPLAY_LOGS['datalog_000.csv'] || [];
"""

with open(target_ts, 'w') as f:
    f.write(ts_content)

print(f"Successfully converted logs to {target_ts}")
