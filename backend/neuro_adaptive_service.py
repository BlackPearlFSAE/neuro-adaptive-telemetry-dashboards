"""
Neuro-Adaptive Biosignal Service
Full-stack backend for EV Formula driver monitoring
FIA Formula E / Electric GT compliant

Features:
1. Cognitive Load (fNIRS) - Mental fatigue and focus
2. Stress (GSR/EDA) - Skin conductance and stress spikes
3. Attention (Eye Track) - Gaze fixation and blink rate
4. Vitals & Feedback - HRV and haptic notifications
"""

import asyncio
import random
import math
from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional
from datetime import datetime


@dataclass
class CognitiveLoadData:
    """fNIRS-based cognitive load monitoring"""
    fatigue: float = 25.0           # 0-100%
    focus: float = 78.0             # 0-100%
    oxygenation: float = 92.0       # Prefrontal cortex O2 saturation %
    task_saturation: bool = False   # Mental overload flag
    hbo2_level: float = 65.0        # Oxygenated hemoglobin μmol/L
    hbr_level: float = 35.0         # Deoxygenated hemoglobin μmol/L
    mental_workload: float = 45.0   # 0-100% composite score
    prefrontal_activity: float = 0.0  # Left-right asymmetry
    sampling_rate: int = 10         # Hz (fNIRS standard)
    

@dataclass
class StressData:
    """GSR/EDA-based stress monitoring"""
    level: float = 33.0             # 0-100% stress index
    eda: float = 4.2                # Electrodermal activity μS
    grip_force: float = 65.0        # Steering grip force 0-100%
    scl: float = 3.5                # Skin Conductance Level μS (tonic)
    scr_count: int = 5              # Skin Conductance Response count (phasic)
    arousal_index: float = 0.45     # 0-1 physiological arousal
    recovery_rate: float = 0.8      # Stress recovery speed
    spike_timestamps: List[float] = field(default_factory=list)
    sampling_rate: int = 256        # Hz (EDA standard)


@dataclass
class AttentionData:
    """Eye tracking-based attention monitoring"""
    tunnel_vision: bool = False     # Peripheral vision reduction
    blink_rate: float = 18.0        # Blinks per minute
    cognitive_load: float = 45.0    # 0-100% from pupil dilation
    gaze_x: float = 0.5             # Normalized gaze X (0-1)
    gaze_y: float = 0.5             # Normalized gaze Y (0-1)
    pupil_diameter_l: float = 4.2   # Left pupil mm
    pupil_diameter_r: float = 4.1   # Right pupil mm
    fixation_duration: float = 250  # Average fixation ms
    saccade_velocity: float = 350   # deg/s
    perclos: float = 0.08           # % eye closure (drowsiness)
    gaze_dispersion: float = 0.15   # Gaze spread (tunnel vision indicator)
    sampling_rate: int = 120        # Hz (eye tracking standard)


@dataclass
class VitalsData:
    """ECG/HRV-based vitals and haptic feedback"""
    hrv: float = 65.0               # Heart Rate Variability ms (SDNN)
    rmssd: float = 42.0             # HRV metric (parasympathetic)
    heart_rate: int = 95            # BPM
    notifications: int = 2          # Pending haptic alerts
    haptic_active: bool = True      # Haptic motors enabled
    pnn50: float = 12.5             # % of NN50 (HRV quality)
    lf_hf_ratio: float = 1.8        # Low/High freq power ratio
    respiratory_rate: int = 14      # Breaths per minute
    core_temperature: float = 37.2  # Core body temp °C
    skin_temperature: float = 34.5  # Skin temp °C
    sampling_rate: int = 250        # Hz (ECG standard)


@dataclass
class NeuroAdaptiveState:
    """Combined neuro-adaptive state for all 4 features"""
    cognitive: CognitiveLoadData = field(default_factory=CognitiveLoadData)
    stress: StressData = field(default_factory=StressData)
    attention: AttentionData = field(default_factory=AttentionData)
    vitals: VitalsData = field(default_factory=VitalsData)
    timestamp: str = ""
    session_duration: float = 0.0   # Minutes since session start
    overall_risk: float = 0.0       # Composite safety risk 0-1
    intervention_level: int = 0     # 0=none, 1=mild, 2=moderate, 3=critical


class NeuroAdaptiveService:
    """
    Full-stack neuro-adaptive biosignal monitoring service
    EV Formula compatible with FIA telemetry standards
    """
    
    def __init__(self):
        self.state = NeuroAdaptiveState()
        self._running = False
        self._session_start = datetime.now()
        self._gaze_history: List[Dict[str, float]] = []
        self._stress_spikes: List[float] = []
        
    async def start(self):
        """Start the simulation loop"""
        self._running = True
        self._session_start = datetime.now()
        asyncio.create_task(self._simulation_loop())
        print("🧠 NeuroAdaptive Service started")
        
    async def stop(self):
        """Stop the simulation loop"""
        self._running = False
        print("🧠 NeuroAdaptive Service stopped")
        
    async def _simulation_loop(self):
        """Main simulation loop - updates all biosignal data"""
        while self._running:
            self._update_cognitive()
            self._update_stress()
            self._update_attention()
            self._update_vitals()
            self._calculate_overall_risk()
            self.state.timestamp = datetime.now().isoformat()
            self.state.session_duration = (datetime.now() - self._session_start).total_seconds() / 60
            await asyncio.sleep(0.1)  # 10 Hz update rate
            
    def _update_cognitive(self):
        """Update cognitive load (fNIRS) data"""
        c = self.state.cognitive
        
        # Simulate fatigue increase over time with occasional recovery
        fatigue_drift = 0.02 if random.random() > 0.3 else -0.05
        c.fatigue = max(0, min(100, c.fatigue + fatigue_drift + (random.random() - 0.5) * 2))
        
        # Focus inversely correlates with fatigue
        c.focus = max(0, min(100, 100 - c.fatigue * 0.6 + (random.random() - 0.5) * 10))
        
        # Oxygenation varies with workload
        c.oxygenation = 88 + random.random() * 8
        
        # Hemoglobin levels
        c.hbo2_level = 60 + random.random() * 15
        c.hbr_level = 30 + random.random() * 10
        
        # Mental workload from oxygenation
        c.mental_workload = (c.hbo2_level - c.hbr_level) / 0.5
        c.mental_workload = max(0, min(100, c.mental_workload))
        
        # Prefrontal asymmetry
        c.prefrontal_activity = (random.random() - 0.5) * 0.4
        
        # Task saturation flag
        c.task_saturation = c.fatigue > 70 or c.mental_workload > 80
        
    def _update_stress(self):
        """Update stress (GSR/EDA) data"""
        s = self.state.stress
        
        # Stress level with random spikes
        stress_change = (random.random() - 0.48) * 3
        if random.random() > 0.93:
            stress_change += 15  # Stress spike
            self._stress_spikes.append(datetime.now().timestamp())
            
        s.level = max(0, min(100, s.level + stress_change))
        
        # EDA correlates with stress
        s.eda = 2 + (s.level / 20) + random.random() * 1.5
        
        # Skin conductance components
        s.scl = s.eda * 0.8  # Tonic level
        s.scr_count = int(s.level / 15) + random.randint(0, 3)
        
        # Grip force varies with stress
        s.grip_force = 50 + (s.level * 0.4) + (random.random() - 0.5) * 20
        s.grip_force = max(20, min(100, s.grip_force))
        
        # Arousal index
        s.arousal_index = s.level / 100
        
        # Recovery rate (decreases with sustained stress)
        s.recovery_rate = max(0.3, 1.0 - (s.level / 150))
        
        # Keep recent spikes
        current_time = datetime.now().timestamp()
        s.spike_timestamps = [t for t in self._stress_spikes if current_time - t < 60]
        
    def _update_attention(self):
        """Update attention (Eye Tracking) data"""
        a = self.state.attention
        
        # Gaze position with natural movement
        a.gaze_x = 0.5 + math.sin(datetime.now().timestamp() * 0.5) * 0.2 + (random.random() - 0.5) * 0.1
        a.gaze_y = 0.5 + math.cos(datetime.now().timestamp() * 0.3) * 0.15 + (random.random() - 0.5) * 0.1
        
        # Add to history
        self._gaze_history.append({'x': a.gaze_x, 'y': a.gaze_y})
        if len(self._gaze_history) > 100:
            self._gaze_history = self._gaze_history[-100:]
        
        # Blink rate (increases with fatigue)
        fatigue_factor = self.state.cognitive.fatigue / 100
        a.blink_rate = 15 + fatigue_factor * 10 + (random.random() - 0.5) * 5
        
        # Pupil dilation correlates with cognitive load
        base_pupil = 3.5 + (self.state.cognitive.mental_workload / 100) * 1.5
        a.pupil_diameter_l = base_pupil + (random.random() - 0.5) * 0.3
        a.pupil_diameter_r = base_pupil + (random.random() - 0.5) * 0.3
        
        # Cognitive load from pupil
        avg_pupil = (a.pupil_diameter_l + a.pupil_diameter_r) / 2
        a.cognitive_load = ((avg_pupil - 3) / 2.5) * 100
        a.cognitive_load = max(0, min(100, a.cognitive_load))
        
        # PERCLOS (eye closure)
        a.perclos = 0.05 + fatigue_factor * 0.15 + random.random() * 0.03
        
        # Fixation and saccade metrics
        a.fixation_duration = 200 + random.random() * 100
        a.saccade_velocity = 300 + random.random() * 100
        
        # Gaze dispersion (low = tunnel vision)
        if len(self._gaze_history) > 10:
            xs = [p['x'] for p in self._gaze_history[-20:]]
            ys = [p['y'] for p in self._gaze_history[-20:]]
            a.gaze_dispersion = (max(xs) - min(xs) + max(ys) - min(ys)) / 2
        
        # Tunnel vision detection
        a.tunnel_vision = a.gaze_dispersion < 0.1 or a.cognitive_load > 85
        
    def _update_vitals(self):
        """Update vitals (HRV/ECG) and haptic feedback data"""
        v = self.state.vitals
        
        # Heart rate varies with stress
        stress_hr_increase = self.state.stress.level * 0.5
        v.heart_rate = int(75 + stress_hr_increase + (random.random() - 0.5) * 10)
        
        # HRV inversely correlates with stress (SDNN)
        v.hrv = 80 - (self.state.stress.level * 0.4) + (random.random() - 0.5) * 10
        v.hrv = max(20, min(120, v.hrv))
        
        # RMSSD (parasympathetic indicator)
        v.rmssd = v.hrv * 0.7 + (random.random() - 0.5) * 10
        
        # pNN50
        v.pnn50 = max(0, min(50, v.hrv / 3 + (random.random() - 0.5) * 5))
        
        # LF/HF ratio (stress indicator)
        v.lf_hf_ratio = 1.0 + (self.state.stress.level / 50) + (random.random() - 0.5) * 0.5
        
        # Respiratory rate
        v.respiratory_rate = 12 + int(self.state.stress.level / 20) + random.randint(-2, 2)
        
        # Core temperature (increases slightly during racing)
        session_heat = min(1.0, self.state.session_duration / 30) * 0.8
        v.core_temperature = 37.0 + session_heat + (random.random() - 0.5) * 0.3
        
        # Skin temperature
        v.skin_temperature = v.core_temperature - 2.5 + (random.random() - 0.5) * 0.5
        
    def _calculate_overall_risk(self):
        """Calculate composite safety risk score"""
        c = self.state.cognitive
        s = self.state.stress
        a = self.state.attention
        v = self.state.vitals
        
        # Weighted risk factors
        fatigue_risk = c.fatigue / 100 * 0.25
        stress_risk = s.level / 100 * 0.20
        attention_risk = (1 if a.tunnel_vision else 0) * 0.15 + a.perclos * 0.10
        hrv_risk = max(0, (60 - v.hrv) / 60) * 0.15
        temp_risk = max(0, (v.core_temperature - 38) / 2) * 0.15
        
        self.state.overall_risk = min(1.0, fatigue_risk + stress_risk + attention_risk + hrv_risk + temp_risk)
        
        # Intervention level
        if self.state.overall_risk < 0.3:
            self.state.intervention_level = 0
        elif self.state.overall_risk < 0.5:
            self.state.intervention_level = 1
        elif self.state.overall_risk < 0.7:
            self.state.intervention_level = 2
        else:
            self.state.intervention_level = 3
            
    def get_state(self) -> Dict[str, Any]:
        """Get current neuro-adaptive state"""
        return {
            'cognitive': asdict(self.state.cognitive),
            'stress': asdict(self.state.stress),
            'attention': asdict(self.state.attention),
            'vitals': asdict(self.state.vitals),
            'timestamp': self.state.timestamp,
            'session_duration': self.state.session_duration,
            'overall_risk': self.state.overall_risk,
            'intervention_level': self.state.intervention_level,
            'gaze_history': self._gaze_history[-50:],
            'stress_spikes': self.state.stress.spike_timestamps[-10:]
        }
        
    def get_cognitive_state(self) -> Dict[str, Any]:
        """Get cognitive load (fNIRS) state only"""
        return asdict(self.state.cognitive)
        
    def get_stress_state(self) -> Dict[str, Any]:
        """Get stress (GSR/EDA) state only"""
        data = asdict(self.state.stress)
        data['recent_spikes'] = len(self.state.stress.spike_timestamps)
        return data
        
    def get_attention_state(self) -> Dict[str, Any]:
        """Get attention (Eye Tracking) state only"""
        data = asdict(self.state.attention)
        data['gaze_history'] = self._gaze_history[-30:]
        return data
        
    def get_vitals_state(self) -> Dict[str, Any]:
        """Get vitals (HRV) state only"""
        return asdict(self.state.vitals)
        
    def trigger_haptic(self, pattern: str = "alert") -> Dict[str, Any]:
        """Trigger haptic feedback to driver"""
        patterns = {
            "alert": "Short vibration burst",
            "warning": "Double pulse",
            "critical": "Continuous rapid pulses",
            "pit_entry": "Long gentle pulse"
        }
        self.state.vitals.notifications += 1
        return {
            'success': True,
            'pattern': pattern,
            'description': patterns.get(pattern, "Unknown pattern"),
            'total_notifications': self.state.vitals.notifications
        }
        
    def reset_session(self) -> Dict[str, Any]:
        """Reset session and all metrics"""
        self._session_start = datetime.now()
        self._gaze_history = []
        self._stress_spikes = []
        self.state = NeuroAdaptiveState()
        return {'success': True, 'message': 'Session reset'}
        
    def calibrate_sensor(self, sensor: str) -> Dict[str, Any]:
        """Calibrate a specific sensor"""
        valid_sensors = ['fnirs', 'gsr', 'eye', 'ecg']
        if sensor.lower() not in valid_sensors:
            return {'success': False, 'error': f'Unknown sensor: {sensor}'}
        return {
            'success': True,
            'sensor': sensor,
            'message': f'{sensor.upper()} calibration complete',
            'baseline_captured': True
        }


# Global service instance
neuro_service = NeuroAdaptiveService()
