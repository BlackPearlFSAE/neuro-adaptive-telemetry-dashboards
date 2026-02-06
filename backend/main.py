"""
NATS - Neuro-Adaptive Telemetry System Backend v3.0
Real-time telemetry streaming for Formula EV with M-TESLA integration
Comprehensive multi-modal biosignal monitoring for driver safety AI
BP16 Best Practices compliant
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import asyncio
import json
import math
import random
from datetime import datetime

# Import comprehensive biosignal module
from biosignals import BiosignalSimulator, DEVICE_CONFIGS

# Import BP16 best practices and vehicle telemetry
from best_practices import SafetyMonitor, DataLogger, get_bp16_data, BP16_THRESHOLDS
from vehicle_telemetry import VehicleSimulator

# Import Real Sensor Drivers
from polar_h10_driver import PolarH10, HeartRateData
from muse_driver import MuseDriver, EEGData
from pupil_driver import PupilDriver, EyeData
from vitals_driver import VitalsDriver, VitalsData

# Import Safety AI and Session Recording
from safety_ai import SafetyAI, BiometricInput, safety_ai
from session_recorder import session_recorder
from weather_service import weather_simulator
from thermal_service import thermal_simulator
from autonomous_service import autonomous_service
from circuit_analyzer_service import circuit_analyzer, Point as CircuitPoint
from neuro_adaptive_service import neuro_service

app = FastAPI(
    title="NATS - Neuro-Adaptive Telemetry System",
    description="Real-time multi-modal biosignal telemetry for Formula EV driver safety AI with BP16 compliance",
    version="3.0.0"
)

# CORS middleware for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connection manager for WebSocket clients
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

# Initialize comprehensive biosignal simulator
biosignal_sim = BiosignalSimulator()

# Initialize vehicle telemetry simulator
vehicle_sim = VehicleSimulator()

# Initialize safety monitoring
safety_monitor = SafetyMonitor()
data_logger = DataLogger()

# Initialize Drivers
polar_sensor = PolarH10()
muse_sensor = MuseDriver()
pupil_sensor = PupilDriver()
vitals_sensor = VitalsDriver()

# Global Data Store (Fusion Layer)
fusion_state = {
    "heart": None,
    "eeg": None,
    "eye": None,
    "vitals": None
}

# --- Callbacks ---
def on_polar_data(data): fusion_state["heart"] = data
def on_muse_data(data): fusion_state["eeg"] = data
def on_pupil_data(data): fusion_state["eye"] = data
def on_vitals_data(data): fusion_state["vitals"] = data

# State for adaptive intervention settings

# State for adaptive intervention settings
class InterventionState:
    def __init__(self):
        self.throttle_mapping = "LINEAR"
        self.cognitive_load_hud = "FULL"
        self.haptic_steering = "NOMINAL"

intervention_state = InterventionState()

def generate_throttle_curve(mapping_type: str) -> List[dict]:
    """Generate throttle response curve points"""
    points = []
    for i in range(20):
        x = i / 19
        if mapping_type == "LINEAR":
            y = x
        else:  # PROGRESSIVE
            y = x * x
        points.append({"x": round(x, 2), "y": round(y, 2)})
    return points

def get_full_telemetry_data() -> dict:
    """Get comprehensive telemetry with all biosignals"""
    # Get all biosignal data from simulator
    biosignals = biosignal_sim.get_all_signals()
    
    # Extract key metrics for dashboard display
    ecg = biosignals["ecg"]
    eeg = biosignals["eeg"]
    emotional = biosignals["emotionalState"]
    eye = biosignals["eyeTracking"]
    
    return {
        "timestamp": biosignals["timestamp"],
        
        # Driver info (using biosignal-derived data)
        "driver": {
            "name": "L. Hamilton",
            "mode": "Sim",
            "heartRate": ecg["heart_rate"],
            "stress": round(emotional["stress"], 2)
        },
        
        # EEG data (for backward compatibility + enhanced)
        "eeg": {
            "samplingRate": eeg["sampling_rate"],
            "status": eeg["status"],
            "waveform": eeg["waveform"],
            "thetaFocus": round(eeg["theta_focus"], 2),
            "betaStress": round(eeg["beta_stress"], 2),
            # Enhanced frequency band data
            "bands": {
                "delta": round(eeg["delta_power"], 2),
                "theta": round(eeg["theta_power"], 2),
                "alpha": round(eeg["alpha_power"], 2),
                "beta": round(eeg["beta_power"], 2),
                "gamma": round(eeg["gamma_power"], 2)
            },
            "attention": round(eeg["attention_index"], 2),
            "meditation": round(eeg["meditation_index"], 2)
        },
        
        # Track telemetry
        "telemetrySync": {
            "status": "LIVE",
            "mTeslaPrediction": "Optimal" if emotional["safety_risk"] < 0.5 else "Caution",
            "circuit": "SILVERSTONE",
            "carPosition": round(vehicle_sim.lap_progress, 4)
        },
        
        # Adaptive intervention
        "adaptiveIntervention": {
            "active": True,
            "throttleMapping": intervention_state.throttle_mapping,
            "throttleCurve": generate_throttle_curve(intervention_state.throttle_mapping),
            "cognitiveLoadHud": intervention_state.cognitive_load_hud,
            "hapticSteering": intervention_state.haptic_steering,
            # New: AI-suggested interventions
            "suggestedIntervention": emotional["intervention_type"],
            "interventionNeeded": emotional["intervention_needed"]
        },
        
        # === NEW: Comprehensive Biosignals ===
        "biosignals": {
            # ECG / Heart
            "ecg": {
                "waveform": ecg["waveform"],
                "heartRate": ecg["heart_rate"],
                "hrv": {
                    "rmssd": round(ecg["hrv_rmssd"], 1),
                    "sdnn": round(ecg["hrv_sdnn"], 1),
                    "lfHfRatio": round(ecg["hrv_lf_hf_ratio"], 2)
                },
                "quality": ecg["quality"]
            },
            
            # EMG / Muscle
            "emg": {
                "waveform": biosignals["emg"]["waveform"],
                "rmsAmplitude": round(biosignals["emg"]["rms_amplitude"], 1),
                "fatigueIndex": round(biosignals["emg"]["fatigue_index"], 2),
                "muscleGroups": {
                    "grip": round(biosignals["emg"]["grip_tension"], 2),
                    "shoulder": round(biosignals["emg"]["shoulder_tension"], 2),
                    "neck": round(biosignals["emg"]["neck_tension"], 2)
                },
                "quality": biosignals["emg"]["quality"]
            },
            
            # GSR / Electrodermal
            "gsr": {
                "waveform": biosignals["gsr"]["waveform"],
                "skinConductance": round(biosignals["gsr"]["skin_conductance"], 2),
                "arousalIndex": round(biosignals["gsr"]["arousal_index"], 2),
                "scrPeaks": biosignals["gsr"]["scr_peaks"],
                "quality": biosignals["gsr"]["quality"]
            },
            
            # PPG / Blood Oxygen
            "ppg": {
                "waveform": biosignals["ppg"]["waveform"],
                "spo2": round(biosignals["ppg"]["spo2"], 1),
                "pulseRate": biosignals["ppg"]["pulse_rate"],
                "perfusionIndex": round(biosignals["ppg"]["perfusion_index"], 1),
                "quality": biosignals["ppg"]["quality"]
            },
            
            # Eye Tracking
            "eyeTracking": {
                "gazeX": round(eye["gaze_x"], 3),
                "gazeY": round(eye["gaze_y"], 3),
                "pupilLeft": round(eye["pupil_diameter_left"], 1),
                "pupilRight": round(eye["pupil_diameter_right"], 1),
                "blinkRate": round(eye["blink_rate"], 1),
                "cognitiveLoad": round(eye["cognitive_load"], 2),
                "drowsiness": round(eye["drowsiness_index"], 2),
                "quality": eye["quality"]
            },
            
            # Respiration
            "respiration": {
                "waveform": biosignals["respiration"]["waveform"],
                "rate": biosignals["respiration"]["rate"],
                "depth": round(biosignals["respiration"]["depth"], 2),
                "regularity": round(biosignals["respiration"]["regularity"], 2),
                "phase": biosignals["respiration"]["phase"],
                "quality": biosignals["respiration"]["quality"]
            },
            
            # Temperature
            "temperature": {
                "skin": round(biosignals["temperature"]["skin_temp"], 1),
                "ambient": round(biosignals["temperature"]["ambient_temp"], 1),
                "thermalComfort": round(biosignals["temperature"]["thermal_comfort"], 2),
                "quality": biosignals["temperature"]["quality"]
            },
            
            # EOG / Eye Movements
            "eog": {
                "horizontalWaveform": biosignals["eog"]["horizontal_waveform"],
                "verticalWaveform": biosignals["eog"]["vertical_waveform"],
                "saccadeCount": biosignals["eog"]["saccade_count"],
                "microsleepDetected": biosignals["eog"]["microsleep_detected"],
                "quality": biosignals["eog"]["quality"]
            },
            
            # Motion / IMU
            "motion": {
                "acceleration": {
                    "x": round(biosignals["motion"]["acceleration_x"], 2),
                    "y": round(biosignals["motion"]["acceleration_y"], 2),
                    "z": round(biosignals["motion"]["acceleration_z"], 2)
                },
                "gyro": {
                    "x": round(biosignals["motion"]["gyro_x"], 1),
                    "y": round(biosignals["motion"]["gyro_y"], 1),
                    "z": round(biosignals["motion"]["gyro_z"], 1)
                },
                "totalGForce": round(biosignals["motion"]["total_g_force"], 2),
                "quality": biosignals["motion"]["quality"]
            }
        },
        
        # === NEW: AI Emotional State Prediction ===
        "emotionalState": {
            "stress": emotional["stress"],
            "focus": emotional["focus"],
            "fatigue": emotional["fatigue"],
            "alertness": emotional["alertness"],
            "anxiety": emotional["anxiety"],
            "confidence": emotional["confidence"],
            "frustration": emotional["frustration"],
            "flowState": emotional["flow_state"],
            "overallReadiness": emotional["overall_readiness"],
            "safetyRisk": emotional["safety_risk"],
            "primaryIndicators": emotional["primary_indicators"]
        },
        
        "systemStatus": "ONLINE",
        
        # Vehicle Telemetry (Real-time 60Hz source subsampled or passed through)
        "vehicle": vehicle_sim.get_all_telemetry()
    }

# Models for API
class InterventionUpdate(BaseModel):
    throttleMapping: Optional[str] = None
    cognitiveLoadHud: Optional[str] = None
    hapticSteering: Optional[str] = None

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Send comprehensive telemetry data
            data = get_full_telemetry_data()
            await websocket.send_json(data)
            
            # Check for incoming messages (control updates)
            try:
                incoming = await asyncio.wait_for(
                    websocket.receive_json(),
                    timeout=0.1
                )
                if "throttleMapping" in incoming:
                    intervention_state.throttle_mapping = incoming["throttleMapping"]
                if "cognitiveLoadHud" in incoming:
                    intervention_state.cognitive_load_hud = incoming["cognitiveLoadHud"]
                if "hapticSteering" in incoming:
                    intervention_state.haptic_steering = incoming["hapticSteering"]
            except asyncio.TimeoutError:
                pass
            except Exception:
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Vehicle Telemetry WebSocket for 3D Dashboard (60Hz)
@app.websocket("/ws/vehicle")
async def vehicle_websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # 60Hz update rate loop
            start_time = asyncio.get_event_loop().time()
            
            # Get latest vehicle data
            data = vehicle_sim.get_all_telemetry()
            await websocket.send_json(data)
            
            # Calculate sleep time to maintain 60Hz
            elapsed = asyncio.get_event_loop().time() - start_time
            sleep_time = max(0, (1.0 / 60.0) - elapsed)
            await asyncio.sleep(sleep_time)
            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"Vehicle WebSocket error: {e}")

@app.get("/")
async def root():
    return {
        "status": "NATS Backend Online",
        "version": "3.0.0",
        "features": [
            "Multi-modal biosignal monitoring (10 signal types)",
            "Real-time emotional state prediction",
            "Driver safety AI integration",
            "BP16 Best Practices compliance",
            "Vehicle telemetry (motor/battery/brakes/tires)",
            "Real-time safety alerts"
        ]
    }

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for Docker container monitoring"""
    return {"status": "healthy", "version": "3.0.0"}

@app.get("/api/telemetry")
async def get_telemetry():
    """Get current comprehensive telemetry snapshot"""
    return get_full_telemetry_data()

@app.get("/api/biosignals")
async def get_biosignals():
    """Get raw biosignal data only"""
    return biosignal_sim.get_all_signals()

@app.get("/api/emotional-state")
async def get_emotional_state():
    """Get current emotional state prediction"""
    signals = biosignal_sim.get_all_signals()
    return signals["emotionalState"]

@app.get("/api/device-configs")
async def get_device_configs():
    """Get supported device configurations for real hardware integration"""
    return {
        "supportedDevices": DEVICE_CONFIGS,
        "note": "Use these configurations to integrate real biosignal hardware"
    }

# ========== MULTI-SENSOR STARTUP ==========

@app.on_event("startup")
async def startup_sensors():
    """Initialize all sensor drivers (Real or Sim)"""
    print("🚀 NATS v3.1 Startup: Initializing Multi-Modal Sensor Suite...")
    
    # Polar H10
    await polar_sensor.scan_and_connect(timeout=2)
    await polar_sensor.start_hr_stream(on_polar_data)
    
    # Muse EEG
    await muse_sensor.connect()
    await muse_sensor.start_stream(on_muse_data)
    
    # Pupil Labs
    await pupil_sensor.connect()
    await pupil_sensor.start_stream(on_pupil_data)
    
    # Vitals (GSR/SpO2)
    await vitals_sensor.connect()
    await vitals_sensor.start_stream(on_vitals_data)
    
    print("✅ All Sensors Initialized (Live/Sim Mode Active)")
    
    # Start Neuro-Adaptive Service
    await neuro_service.start()

@app.get("/api/biosignals/fused")
async def get_fused_biosignals():
    """Get aggregated data from all sensors"""
    return {
        "heart": {
            "bpm": fusion_state["heart"].bpm if fusion_state["heart"] else 0,
            "connected": polar_sensor.connected
        },
        "eeg": {
            "focus": fusion_state["eeg"].focus_index if fusion_state["eeg"] else 0,
            "connected": muse_sensor.connected
        },
        "eye": {
            "drowsiness": fusion_state["eye"].drowsiness_index if fusion_state["eye"] else 0,
            "connected": pupil_sensor.connected
        },
        "vitals": {
            "stress": fusion_state["vitals"].arousal_index if fusion_state["vitals"] else 0,
            "connected": vitals_sensor.connected
        }
    }

# ========== SAFETY AI ENDPOINTS ==========

@app.get("/api/safety", tags=["Safety AI"])
async def get_safety_prediction():
    """Get real-time AI safety prediction"""
    # Build input from current sensor fusion state
    inp = BiometricInput(
        heart_rate=fusion_state["heart"].bpm if fusion_state["heart"] else 75,
        hrv_rmssd=50.0,  # Would come from polar_sensor.get_hrv()
        stress_index=fusion_state["vitals"].arousal_index if fusion_state["vitals"] else 0.3,
        eeg_focus=fusion_state["eeg"].focus_index if fusion_state["eeg"] else 0.7,
        eye_drowsiness=fusion_state["eye"].drowsiness_index if fusion_state["eye"] else 0.1,
        gsr_arousal=fusion_state["vitals"].arousal_index if fusion_state["vitals"] else 0.3,
    )
    
    prediction = safety_ai.predict(inp)
    return safety_ai.to_dict(prediction)

@app.get("/api/safety/history", tags=["Safety AI"])
async def get_safety_history():
    """Get recent safety prediction history"""
    return {
        "history": [safety_ai.to_dict(p) for p in safety_ai.history[-60:]]
    }

# ========== SESSION RECORDING ENDPOINTS ==========

@app.post("/api/session/start", tags=["Session"])
async def start_session(driver: str = "Driver", track: str = "Silverstone"):
    """Start a new telemetry recording session"""
    session_id = session_recorder.start_session(driver, track)
    return {"session_id": session_id, "status": "recording"}

@app.post("/api/session/stop", tags=["Session"])
async def stop_session():
    """Stop current recording session"""
    filepath = session_recorder.stop_session()
    return {"status": "stopped", "filepath": filepath}

@app.get("/api/session/status", tags=["Session"])
async def get_session_status():
    """Get current session status"""
    return {
        "is_recording": session_recorder.is_recording,
        "session": session_recorder.current_session.__dict__ if session_recorder.current_session else None,
        "frame_count": session_recorder.frame_counter
    }

@app.get("/api/sessions", tags=["Session"])
async def list_sessions():
    """List all recorded sessions"""
    return {"sessions": session_recorder.list_sessions()}

@app.post("/api/intervention")
async def update_intervention(update: InterventionUpdate):
    """Update adaptive intervention settings"""
    if update.throttleMapping:
        intervention_state.throttle_mapping = update.throttleMapping
    if update.cognitiveLoadHud:
        intervention_state.cognitive_load_hud = update.cognitiveLoadHud
    if update.hapticSteering:
        intervention_state.haptic_steering = update.hapticSteering
    
    return {"success": True, "current": {
        "throttleMapping": intervention_state.throttle_mapping,
        "cognitiveLoadHud": intervention_state.cognitive_load_hud,
        "hapticSteering": intervention_state.haptic_steering
    }}

@app.get("/api/circuits/silverstone")
async def get_silverstone():
    """Get Silverstone circuit data"""
    return {
        "name": "Silverstone",
        "country": "UK",
        "length": 5.891,
        "corners": 18,
        "sectors": [
            {"name": "Sector 1", "start": 0, "end": 0.33},
            {"name": "Sector 2", "start": 0.33, "end": 0.66},
            {"name": "Sector 3", "start": 0.66, "end": 1.0}
        ]
    }

# ========== BP16 BEST PRACTICES ENDPOINTS ==========

@app.get("/api/best-practices")
async def get_best_practices():
    """Get BP16 guidelines and safety thresholds"""
    return get_bp16_data()

@app.get("/api/alerts")
async def get_alerts():
    """Get current active safety alerts"""
    return {
        "alerts": safety_monitor.get_active_alerts(),
        "summary": safety_monitor.get_alert_summary()
    }

@app.post("/api/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    """Acknowledge a safety alert"""
    success = safety_monitor.acknowledge_alert(alert_id)
    return {"success": success, "alert_id": alert_id}

@app.post("/api/alerts/{alert_id}/dismiss")
async def dismiss_alert(alert_id: str):
    """Dismiss a safety alert"""
    success = safety_monitor.dismiss_alert(alert_id)
    return {"success": success, "alert_id": alert_id}

# ========== VEHICLE TELEMETRY ENDPOINTS ==========

@app.get("/api/vehicle")
async def get_vehicle_telemetry():
    """Get current vehicle telemetry (motor, battery, brakes, tires)"""
    return vehicle_sim.get_all_telemetry()

@app.get("/api/vehicle/motor")
async def get_motor_telemetry():
    """Get motor telemetry only"""
    from dataclasses import asdict
    return asdict(vehicle_sim.get_motor_telemetry())

@app.get("/api/vehicle/battery")
async def get_battery_telemetry():
    """Get battery telemetry only"""
    from dataclasses import asdict
    return asdict(vehicle_sim.get_battery_telemetry())

@app.get("/api/vehicle/brakes")
async def get_brake_telemetry():
    """Get brake telemetry only"""
    from dataclasses import asdict
    return asdict(vehicle_sim.get_brake_telemetry())

@app.get("/api/vehicle/tires")
async def get_tire_telemetry():
    """Get tire telemetry only"""
    from dataclasses import asdict
    return asdict(vehicle_sim.get_tire_telemetry())

@app.post("/api/vehicle/pit-stop")
async def trigger_pit_stop():
    """Simulate pit stop (refresh battery, tires)"""
    vehicle_sim.pit_stop()
    return {"success": True, "message": "Pit stop completed"}

@app.get("/api/vehicle/list-logs")
async def list_vehicle_logs():
    """List available CSV datalogs for replay"""
    import glob
    import os
    
    logs = []
    base_dirs = [
        ".", 
        "../dataRecord", 
        "/Users/nrkwine/Downloads/f1/formulaSystem/neuro-adaptive telemetry system/dataRecord"
    ]
    
    for d in base_dirs:
        if os.path.exists(d):
            logs.extend([os.path.basename(f) for f in glob.glob(os.path.join(d, "datalog_*.csv"))])
            
    return {"logs": sorted(list(set(logs)))}

@app.post("/api/vehicle/load-log")
async def load_vehicle_log(filename: str):
    """Load a specific CSV datalog for replay"""
    success = vehicle_sim.load_datalog(filename)
    return {"success": success, "filename": filename, "frames": len(vehicle_sim.datalog_data)}

@app.post("/api/vehicle/replay")
async def toggle_replay(enabled: bool = True):
    """Enable or disable datalog replay mode"""
    vehicle_sim.toggle_replay(enabled)
    return {"success": True, "replay_mode": vehicle_sim.replay_mode}

@app.post("/api/vehicle/set-mode")
async def set_vehicle_mode(mode: str):
    """Set Vehicle Driving Mode (SAFETY, RACE, ATTACK, QUALI)"""
    vehicle_sim.set_drive_mode(mode)
    return {"success": True, "mode": vehicle_sim.driving_mode}

@app.post("/api/vehicle/pit-stop")
async def trigger_pit_stop():
    """Simulate Pit Stop (Refresh Energy/Tires)"""
    vehicle_sim.pit_stop()
    return {"success": True, "message": "Pit Stop Complete: Energy and Tires Refreshed"}

# ========== EV FORMULA CONTROL ENDPOINTS ==========

@app.get("/api/vehicle/energy-management", tags=["EV Formula"])
async def get_energy_management():
    """Get current energy management state (Attack Mode, Regen)"""
    from dataclasses import asdict
    return asdict(vehicle_sim.get_energy_management())

@app.get("/api/vehicle/power-map", tags=["EV Formula"])
async def get_power_map():
    """Get current power map configuration"""
    from dataclasses import asdict
    return asdict(vehicle_sim.get_power_map())

@app.get("/api/vehicle/power-maps", tags=["EV Formula"])
async def get_all_power_maps():
    """Get list of all available power map presets"""
    return {"maps": vehicle_sim.POWER_MAPS}

@app.post("/api/vehicle/power-map/{map_id}", tags=["EV Formula"])
async def set_power_map(map_id: int):
    """Set active power map (1-12)"""
    success = vehicle_sim.set_power_map(map_id)
    if success:
        return {"success": True, "map_id": map_id, "name": vehicle_sim.POWER_MAPS[map_id]["name"]}
    return {"success": False, "error": "Invalid map_id (must be 1-12)"}

@app.post("/api/vehicle/regen-level/{level}", tags=["EV Formula"])
async def set_regen_level(level: int):
    """Set regenerative braking level (0-10)"""
    success = vehicle_sim.set_regen_level(level)
    if success:
        return {"success": True, "regen_level": level}
    return {"success": False, "error": "Invalid level (must be 0-10)"}

@app.post("/api/vehicle/attack-mode", tags=["EV Formula"])
async def activate_attack_mode():
    """Activate Formula E Attack Mode (+35kW for 240s)"""
    success = vehicle_sim.activate_attack_mode()
    if success:
        return {
            "success": True, 
            "attack_mode_active": True, 
            "remaining_seconds": 240,
            "activations": vehicle_sim.attack_mode_activations
        }
    return {
        "success": False, 
        "error": "Attack mode unavailable (already active or max activations reached)",
        "activations": vehicle_sim.attack_mode_activations
    }

@app.get("/api/vehicle/cell-monitoring", tags=["EV Formula"])
async def get_cell_monitoring():
    """Get detailed battery cell monitoring data (96 cells)"""
    from dataclasses import asdict
    return asdict(vehicle_sim.get_cell_monitoring())

class SessionStart(BaseModel):
    driver_name: str = "L. Hamilton"
    circuit: str = "Silverstone"

@app.post("/api/session/start")
async def start_session(session: SessionStart):
    """Start a new data logging session"""
    session_id = data_logger.start_session(session.driver_name, session.circuit)
    return {"success": True, "session_id": session_id}

@app.post("/api/session/end")
async def end_session():
    """End the current logging session"""
    summary = data_logger.end_session()
    return {"success": True, "summary": summary}

@app.get("/api/session")
async def get_session_info():
    """Get current session information"""
    return data_logger.get_session_info()

# ========== WEATHER ENDPOINTS ==========

@app.get("/api/weather", tags=["Weather"])
async def get_weather():
    """Get current track weather conditions"""
    return weather_simulator.to_dict()

@app.post("/api/weather/rain", tags=["Weather"])
async def trigger_rain(intensity: float = 0.5):
    """Trigger rain for testing (intensity 0.0-1.0)"""
    weather_simulator.trigger_rain(intensity)
    return {"success": True, "rain_intensity": intensity}

@app.post("/api/weather/clear", tags=["Weather"])
async def clear_weather():
    """Clear weather to dry conditions"""
    weather_simulator.clear_weather()
    return {"success": True, "condition": "Clear"}

# ========== THERMAL MANAGEMENT ENDPOINTS ==========

@app.get("/api/thermal", tags=["Thermal"])
async def get_thermal_state():
    """Get current Thermal Management System state"""
    return thermal_simulator.get_state()

@app.post("/api/thermal/valve", tags=["Thermal"])
async def set_valve_position(position: str = "Series"):
    """Set 5-way valve position (Series, Parallel, Chiller)"""
    thermal_simulator.set_valve_position(position)
    return {"success": True, "valve_position": position}

@app.post("/api/thermal/purge", tags=["Thermal"])
async def thermal_purge():
    """Start coolant purge sequence"""
    return thermal_simulator.coolant_purge()

@app.post("/api/thermal/fill-drain", tags=["Thermal"])
async def thermal_fill_drain(action: str = "fill"):
    """Start coolant fill or drain"""
    return thermal_simulator.coolant_fill_drain(action)

@app.post("/api/thermal/valve-test", tags=["Thermal"])
async def thermal_valve_test():
    """Run 5-way valve test sequence"""
    return thermal_simulator.valve_test()

# ========== AUTONOMOUS DRIVING ENDPOINTS ==========

@app.get("/api/autonomous/state", tags=["Autonomous"])
async def get_autonomous_state():
    """Get current Autonomous Driving System state"""
    return autonomous_service.get_state()

@app.post("/api/autonomous/toggle", tags=["Autonomous"])
async def toggle_autonomous(enabled: bool = True):
    """Enable/Disable Self-Driving Mode"""
    autonomous_service.toggle_autonomy(enabled)
    if enabled and not autonomous_service._running:
        await autonomous_service.start()
    return {"success": True, "enabled": enabled}

# ========== CIRCUIT ANALYZER ENDPOINTS ==========

from fastapi import File, UploadFile

@app.post("/api/circuit/analyze", tags=["Circuit"])
async def analyze_circuit(file: UploadFile = File(...), name: str = "Custom Circuit"):
    """Analyze uploaded circuit image and extract track data"""
    image_bytes = await file.read()
    circuit = await circuit_analyzer.analyze_image(image_bytes, name)
    return {
        "success": True,
        "circuit": circuit_analyzer.to_dict(circuit)
    }

@app.get("/api/circuit/active", tags=["Circuit"])
async def get_active_circuit():
    """Get currently active circuit for Overview display"""
    circuit = circuit_analyzer.get_active_circuit()
    if circuit:
        return circuit_analyzer.to_dict(circuit)
    return {"error": "No active circuit"}

@app.get("/api/circuit/list", tags=["Circuit"])
async def list_circuits():
    """Get list of all available circuits"""
    return {"circuits": circuit_analyzer.get_all_circuits()}

@app.post("/api/circuit/activate/{circuit_id}", tags=["Circuit"])
async def activate_circuit(circuit_id: str):
    """Activate a circuit and update autonomous service waypoints"""
    circuit = circuit_analyzer.activate_circuit(circuit_id)
    if circuit:
        # Update autonomous service with new waypoints
        from autonomous_service import Point
        autonomous_waypoints = [Point(x=p.x, y=p.y) for p in circuit.waypoints]
        autonomous_service.update_waypoints(autonomous_waypoints)
        
        return {
            "success": True,
            "circuit": circuit_analyzer.to_dict(circuit),
            "autonomousUpdated": True
        }
    return {"success": False, "error": "Circuit not found"}

# ========== CHARGING SYSTEM ENDPOINTS ==========

from charging_service import charging_service

@app.get("/api/charging/state", tags=["Charging"])
async def get_charging_state():
    """Get current HV Battery and Charging System state"""
    return charging_service.get_state()

@app.post("/api/charging/start", tags=["Charging"])
async def start_charging(mode: str = "dc_fast"):
    """Start charging session (mode: dc_fast, ac)"""
    return charging_service.start_charging(mode)

@app.post("/api/charging/stop", tags=["Charging"])
async def stop_charging():
    """Stop current charging session"""
    return charging_service.stop_charging()

@app.post("/api/charging/ecu-reset", tags=["Charging"])
async def ecu_reset():
    """Reset Charge Port ECU"""
    return charging_service.ecu_reset()

# ========== NEURO-ADAPTIVE ENDPOINTS ==========

@app.get("/api/neuro/state", tags=["NeuroAdaptive"])
async def get_neuro_state():
    """Get complete neuro-adaptive state (all 4 features)"""
    return neuro_service.get_state()

@app.get("/api/neuro/cognitive", tags=["NeuroAdaptive"])
async def get_cognitive_state():
    """Get Cognitive Load (fNIRS) state"""
    return neuro_service.get_cognitive_state()

@app.get("/api/neuro/stress", tags=["NeuroAdaptive"])
async def get_stress_state():
    """Get Stress (GSR/EDA) state"""
    return neuro_service.get_stress_state()

@app.get("/api/neuro/attention", tags=["NeuroAdaptive"])
async def get_attention_state():
    """Get Attention (Eye Tracking) state"""
    return neuro_service.get_attention_state()

@app.get("/api/neuro/vitals", tags=["NeuroAdaptive"])
async def get_vitals_state():
    """Get Vitals (HRV) and Haptic Feedback state"""
    return neuro_service.get_vitals_state()

@app.post("/api/neuro/haptic", tags=["NeuroAdaptive"])
async def trigger_haptic(pattern: str = "alert"):
    """Trigger haptic feedback to driver (alert, warning, critical, pit_entry)"""
    return neuro_service.trigger_haptic(pattern)

@app.post("/api/neuro/calibrate", tags=["NeuroAdaptive"])
async def calibrate_sensor(sensor: str = "fnirs"):
    """Calibrate a sensor (fnirs, gsr, eye, ecg)"""
    return neuro_service.calibrate_sensor(sensor)

@app.post("/api/neuro/reset", tags=["NeuroAdaptive"])
async def reset_neuro_session():
    """Reset neuro-adaptive session and all metrics"""
    return neuro_service.reset_session()

# ========== ADAS (Advanced Driver Assistance System) ENDPOINTS ==========

from depth_adas_service import adas_service, ADASState
from dataclasses import asdict
import os
import shutil
from tempfile import NamedTemporaryFile

# ADAS Connection Manager
class ADASConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, state: ADASState):
        data = asdict(state)
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception:
                pass

adas_manager = ADASConnectionManager()

@app.websocket("/ws/adas")
async def adas_websocket_endpoint(websocket: WebSocket):
    """
    Real-time ADAS state streaming via WebSocket.
    
    Streams:
    - Collision warnings (TTC, threat level)
    - Lane keeping (deviation, steering suggestion)
    - Distance (min distance, zone)
    - Processing FPS
    """
    await adas_manager.connect(websocket)
    try:
        while True:
            # Wait for client commands or heartbeat
            try:
                message = await asyncio.wait_for(
                    websocket.receive_json(),
                    timeout=0.5
                )
                
                # Handle velocity updates
                if "ego_velocity" in message:
                    adas_service.update_ego_velocity(message["ego_velocity"])
                    
            except asyncio.TimeoutError:
                pass
            
            # Send current status
            status = adas_service.get_status()
            await websocket.send_json({"type": "status", "data": status})
            
    except WebSocketDisconnect:
        adas_manager.disconnect(websocket)
    except Exception as e:
        print(f"ADAS WebSocket error: {e}")
        adas_manager.disconnect(websocket)

@app.get("/api/adas/status", tags=["ADAS"])
async def get_adas_status():
    """Get current ADAS processing status"""
    return adas_service.get_status()

@app.post("/api/adas/upload-video", tags=["ADAS"])
async def upload_adas_video(file: UploadFile = File(...)):
    """
    Upload video for ADAS processing.
    Returns task_id to track progress via WebSocket.
    """
    # Save uploaded file
    upload_dir = "adas_uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {
        "success": True,
        "filename": file.filename,
        "file_path": file_path,
        "message": "Video uploaded. Connect to /ws/adas to start processing."
    }

@app.post("/api/adas/process", tags=["ADAS"])
async def start_adas_processing(
    video_path: str,
    scale: float = 0.5,
    skip_frames: int = 2
):
    """
    Start ADAS processing on uploaded video.
    Results are streamed via /ws/adas WebSocket.
    """
    if not os.path.exists(video_path):
        return {"success": False, "error": f"Video not found: {video_path}"}
    
    # Start background processing task
    async def process_and_broadcast():
        async for state in adas_service.process_video(video_path, scale, skip_frames):
            await adas_manager.broadcast(state)
    
    asyncio.create_task(process_and_broadcast())
    
    return {
        "success": True,
        "message": "Processing started. Connect to /ws/adas for real-time updates."
    }

@app.post("/api/adas/velocity", tags=["ADAS"])
async def update_ego_velocity(velocity: float):
    """Update ego vehicle velocity for TTC calculations (m/s)"""
    adas_service.update_ego_velocity(velocity)
    return {"success": True, "ego_velocity": velocity}

@app.get("/api/adas/config", tags=["ADAS"])
async def get_adas_config():
    """Get current ADAS configuration and thresholds"""
    return {
        "ego_velocity": adas_service.ego_velocity,
        "model_size": adas_service.model_size,
        "enable_depth_model": adas_service.enable_depth_model,
        "collision_thresholds": {
            "ttc_critical": 1.0,
            "ttc_danger": 2.0,
            "ttc_warning": 3.5,
            "dist_critical": 3.0,
            "dist_danger": 8.0,
            "dist_warning": 15.0
        },
        "lane_thresholds": {
            "drift": 0.3,
            "departure": 0.7
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)


