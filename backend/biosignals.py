"""
Biosignal Sensors Integration Module
====================================

Comprehensive driver biosignal monitoring for EV Formula safety AI development.
Supports real-time data acquisition from commercially available sensors.

Supported Signals & Recommended Hardware:
-----------------------------------------

1. EEG (Electroencephalography) - Brain activity
   - Devices: Muse 2, OpenBCI Cyton, Emotiv EPOC X, NeuroSky MindWave
   - Python: brainflow, muselsl, pylsl, cortex-api

2. ECG/EKG (Electrocardiography) - Heart rhythm + HRV
   - Devices: Polar H10, Garmin HRM-Pro, Zephyr BioHarness, Shimmer3 ECG
   - Python: heartpy, neurokit2, hrv-analysis, bleak (BLE)

3. EMG (Electromyography) - Muscle tension
   - Devices: Shimmer3 EMG, Delsys Trigno, Myo Armband
   - Python: brainflow, pyemgpipeline, biosignalsnotebooks

4. GSR/EDA (Galvanic Skin Response) - Stress/Arousal
   - Devices: Empatica E4, Shimmer3 GSR+, Grove GSR Sensor, BiTalino
   - Python: neurokit2, eda-explorer, pyeda

5. PPG/SpO2 (Photoplethysmography) - Blood oxygen, pulse
   - Devices: MAX30102, Nonin, Masimo, Empatica E4
   - Python: heartpy, pyPPG, neurokit2

6. Eye Tracking - Gaze, pupil, blink
   - Devices: Tobii Pro Glasses 3, Pupil Labs Core, EyeLink
   - Python: tobii-research, pupil-labs-realtime-api, pylink

7. Respiration - Breathing rate & pattern
   - Devices: Zephyr BioModule, Polar Sense, RespiBAN
   - Python: neurokit2, respiract, biosignalsnotebooks

8. Skin Temperature - Thermal stress
   - Devices: Empatica E4, iButtons, MLX90614, TMP117
   - Python: smbus2, adafruit-circuitpython

9. EOG (Electrooculography) - Eye movements
   - Devices: OpenBCI, BiTalino, Shimmer3
   - Python: brainflow, neurokit2

10. Motion/IMU - G-forces, body position
    - Devices: Xsens MTw, Shimmer3 IMU, MPU6050, BNO055
    - Python: ahrs, imufusion, adafruit-circuitpython

Universal Platforms:
--------------------
- BrainFlow: Universal biosignal streaming (supports 20+ boards)
- LSL (Lab Streaming Layer): Multi-device synchronization
- BiTalino: Multi-modal biosignal acquisition
- Shimmer: Research-grade wearable sensors
"""

import math
import random
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional
from enum import Enum
from datetime import datetime
import asyncio


class SignalQuality(Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    MODERATE = "moderate"
    POOR = "poor"
    NO_SIGNAL = "no_signal"


@dataclass
class ECGData:
    """ECG/EKG Signal - Heart electrical activity"""
    waveform: List[float]  # Raw ECG waveform
    heart_rate: int        # BPM
    hrv_rmssd: float       # HRV - Root Mean Square of Successive Differences (ms)
    hrv_sdnn: float        # HRV - Standard Deviation of NN intervals (ms)
    hrv_lf_hf_ratio: float # LF/HF ratio - Autonomic balance
    rr_intervals: List[float]  # R-R intervals in ms
    quality: str


@dataclass
class EMGData:
    """EMG Signal - Muscle electrical activity"""
    waveform: List[float]     # Raw EMG waveform
    rms_amplitude: float      # Root Mean Square amplitude (µV)
    mean_frequency: float     # Mean frequency (Hz)
    fatigue_index: float      # 0-1 fatigue indicator
    activation_level: float   # 0-1 muscle activation
    # Specific muscle groups for racing
    grip_tension: float       # Steering grip tension
    shoulder_tension: float   # Shoulder muscle tension
    neck_tension: float       # Neck muscle tension
    quality: str


@dataclass
class GSRData:
    """GSR/EDA Signal - Electrodermal activity (stress/arousal)"""
    waveform: List[float]     # Raw GSR signal (µS)
    skin_conductance: float   # Skin conductance level (µS)
    scr_peaks: int            # Skin Conductance Response peaks (count)
    scr_amplitude: float      # SCR amplitude
    tonic_level: float        # Tonic (baseline) level
    phasic_level: float       # Phasic (response) level
    arousal_index: float      # 0-1 arousal/stress indicator
    quality: str


@dataclass
class PPGData:
    """PPG Signal - Photoplethysmography (blood volume)"""
    waveform: List[float]     # Raw PPG waveform
    spo2: float               # Blood oxygen saturation (%)
    pulse_rate: int           # Pulse rate (BPM)
    perfusion_index: float    # Blood perfusion (%)
    respiratory_rate: int     # Derived respiration rate
    pulse_amplitude: float    # Pulse wave amplitude
    quality: str


@dataclass 
class EyeTrackingData:
    """Eye Tracking - Gaze and pupil metrics"""
    gaze_x: float             # Gaze position X (normalized 0-1)
    gaze_y: float             # Gaze position Y (normalized 0-1)
    pupil_diameter_left: float   # Left pupil diameter (mm)
    pupil_diameter_right: float  # Right pupil diameter (mm)
    blink_rate: float         # Blinks per minute
    blink_duration: float     # Average blink duration (ms)
    fixation_duration: float  # Current fixation duration (ms)
    saccade_velocity: float   # Saccade velocity (deg/s)
    cognitive_load: float     # 0-1 cognitive load from pupil
    drowsiness_index: float   # 0-1 drowsiness indicator
    quality: str


@dataclass
class RespirationData:
    """Respiration - Breathing patterns"""
    waveform: List[float]     # Breathing waveform
    rate: int                 # Breaths per minute
    depth: float              # Breathing depth (relative)
    regularity: float         # 0-1 breathing regularity
    inhalation_time: float    # Inhalation duration (s)
    exhalation_time: float    # Exhalation duration (s)
    ie_ratio: float           # Inhalation/Exhalation ratio
    phase: str                # "inhale" or "exhale"
    quality: str


@dataclass
class TemperatureData:
    """Skin Temperature - Thermal stress"""
    skin_temp: float          # Skin temperature (°C)
    ambient_temp: float       # Ambient temperature (°C)
    temp_gradient: float      # Rate of change (°C/min)
    thermal_comfort: float    # 0-1 thermal comfort index
    quality: str


@dataclass
class EOGData:
    """EOG Signal - Eye movement electrooculography"""
    horizontal_waveform: List[float]  # Horizontal EOG
    vertical_waveform: List[float]    # Vertical EOG
    saccade_count: int        # Saccade count
    fixation_count: int       # Fixation count
    eye_movement_velocity: float  # Velocity (deg/s)
    microsleep_detected: bool # Microsleep detection
    quality: str


@dataclass
class MotionData:
    """IMU/Motion - Body kinematics and G-forces"""
    acceleration_x: float     # X-axis acceleration (g)
    acceleration_y: float     # Y-axis acceleration (g)
    acceleration_z: float     # Z-axis acceleration (g)
    gyro_x: float             # X-axis rotation (deg/s)
    gyro_y: float             # Y-axis rotation (deg/s)
    gyro_z: float             # Z-axis rotation (deg/s)
    total_g_force: float      # Total G-force magnitude
    head_position: str        # Head position state
    body_sway: float          # Body sway magnitude
    quality: str


@dataclass
class EEGData:
    """EEG Signal - Brain electrical activity"""
    waveform: List[float]     # Raw EEG waveform
    sampling_rate: float      # Hz
    status: str
    # Frequency bands power (µV²)
    delta_power: float        # 0.5-4 Hz (deep sleep)
    theta_power: float        # 4-8 Hz (drowsiness, focus)
    alpha_power: float        # 8-12 Hz (relaxed)
    beta_power: float         # 12-30 Hz (active, alert)
    gamma_power: float        # 30-100 Hz (cognitive processing)
    # Derived metrics
    theta_focus: float        # 0-1 focus indicator
    beta_stress: float        # 0-1 stress indicator
    attention_index: float    # 0-1 attention level
    meditation_index: float   # 0-1 relaxation level
    quality: str


@dataclass
class EmotionalState:
    """Predicted emotional state from multi-modal fusion"""
    timestamp: str
    # Primary emotions (0-1 intensity)
    stress: float
    focus: float
    fatigue: float
    alertness: float
    anxiety: float
    confidence: float
    frustration: float
    flow_state: float         # Optimal performance state
    # Composite scores
    overall_readiness: float  # 0-1 racing readiness
    safety_risk: float        # 0-1 safety risk level
    intervention_needed: bool
    intervention_type: Optional[str]
    # Contributing signals
    primary_indicators: List[str]


class BiosignalSimulator:
    """Realistic biosignal simulation for demo/testing"""
    
    def __init__(self):
        self.time_offset = 0.0
        self.stress_level = 0.3  # Base stress
        self.fatigue_level = 0.2  # Base fatigue
        self.track_position = 0.0
        
    def update(self, dt: float = 0.1):
        """Update simulation time"""
        self.time_offset += dt
        self.track_position = (self.track_position + 0.002) % 1.0
        
        # Simulate stress variation based on track position (corners = more stress)
        corner_stress = 0.3 * math.sin(self.track_position * 2 * math.pi * 5)
        self.stress_level = 0.3 + corner_stress + 0.1 * math.sin(self.time_offset * 0.1)
        self.stress_level = max(0.1, min(0.9, self.stress_level))
        
        # Fatigue gradually increases
        self.fatigue_level = min(0.8, 0.2 + 0.001 * self.time_offset)
        
    def generate_ecg(self, num_points: int = 100) -> ECGData:
        """Generate realistic ECG waveform with PQRST complex"""
        waveform = []
        hr = 85 + int(30 * self.stress_level) + random.randint(-3, 3)
        
        for i in range(num_points):
            t = self.time_offset + i * 0.01
            # Simplified PQRST waveform
            phase = (t * hr / 60) % 1.0
            
            if 0.0 <= phase < 0.1:  # P wave
                v = 0.15 * math.sin(phase * 10 * math.pi)
            elif 0.15 <= phase < 0.2:  # Q wave
                v = -0.1 * math.sin((phase - 0.15) * 20 * math.pi)
            elif 0.2 <= phase < 0.25:  # R wave
                v = 1.0 * math.sin((phase - 0.2) * 20 * math.pi)
            elif 0.25 <= phase < 0.3:  # S wave
                v = -0.2 * math.sin((phase - 0.25) * 20 * math.pi)
            elif 0.35 <= phase < 0.5:  # T wave
                v = 0.3 * math.sin((phase - 0.35) * 6.67 * math.pi)
            else:
                v = 0.0
            
            v += 0.02 * random.gauss(0, 1)  # Noise
            waveform.append(v)
        
        # Calculate HRV metrics
        rr_interval = 60000 / hr  # ms
        rr_intervals = [rr_interval + random.gauss(0, 20) for _ in range(10)]
        
        return ECGData(
            waveform=waveform,
            heart_rate=hr,
            hrv_rmssd=35 - 15 * self.stress_level + random.gauss(0, 5),
            hrv_sdnn=45 - 20 * self.stress_level + random.gauss(0, 5),
            hrv_lf_hf_ratio=1.5 + self.stress_level + random.gauss(0, 0.2),
            rr_intervals=rr_intervals,
            quality=SignalQuality.GOOD.value
        )
    
    def generate_emg(self, num_points: int = 100) -> EMGData:
        """Generate EMG signal with muscle activity patterns"""
        waveform = []
        base_activation = 0.3 + 0.4 * self.stress_level
        
        for i in range(num_points):
            t = self.time_offset + i * 0.002
            # EMG is high-frequency bursts
            burst = base_activation * random.gauss(0, 1)
            modulation = 0.5 * (1 + math.sin(t * 2))
            v = burst * modulation
            waveform.append(v)
        
        return EMGData(
            waveform=waveform,
            rms_amplitude=50 + 100 * base_activation + random.gauss(0, 10),
            mean_frequency=80 + 40 * (1 - self.fatigue_level),
            fatigue_index=self.fatigue_level,
            activation_level=base_activation,
            grip_tension=0.4 + 0.4 * self.stress_level,
            shoulder_tension=0.3 + 0.3 * self.stress_level + 0.2 * self.fatigue_level,
            neck_tension=0.25 + 0.25 * self.stress_level + 0.3 * self.fatigue_level,
            quality=SignalQuality.GOOD.value
        )
    
    def generate_gsr(self, num_points: int = 100) -> GSRData:
        """Generate GSR/EDA signal for stress detection"""
        waveform = []
        base_conductance = 2.0 + 5.0 * self.stress_level
        
        for i in range(num_points):
            t = self.time_offset + i * 0.05
            # Tonic level with slow drift
            tonic = base_conductance + 0.5 * math.sin(t * 0.1)
            # Phasic responses (SCRs)
            scr = 0.5 * max(0, math.sin(t * 2) ** 10) if random.random() > 0.8 else 0
            v = tonic + scr + 0.1 * random.gauss(0, 1)
            waveform.append(v)
        
        return GSRData(
            waveform=waveform,
            skin_conductance=base_conductance,
            scr_peaks=int(3 + 5 * self.stress_level),
            scr_amplitude=0.5 + 1.0 * self.stress_level,
            tonic_level=base_conductance,
            phasic_level=0.5 * self.stress_level,
            arousal_index=self.stress_level,
            quality=SignalQuality.GOOD.value
        )
    
    def generate_ppg(self, num_points: int = 100) -> PPGData:
        """Generate PPG signal for SpO2 and pulse"""
        waveform = []
        pulse_rate = 82 + int(25 * self.stress_level)
        
        for i in range(num_points):
            t = self.time_offset + i * 0.01
            # PPG pulse waveform
            phase = (t * pulse_rate / 60) % 1.0
            # Systolic peak + dicrotic notch
            v = math.exp(-((phase - 0.15) ** 2) / 0.01) - 0.3 * math.exp(-((phase - 0.4) ** 2) / 0.02)
            v += 0.02 * random.gauss(0, 1)
            waveform.append(v)
        
        return PPGData(
            waveform=waveform,
            spo2=98 - 2 * self.fatigue_level + random.gauss(0, 0.5),
            pulse_rate=pulse_rate,
            perfusion_index=3.5 + 2 * (1 - self.stress_level),
            respiratory_rate=14 + int(6 * self.stress_level),
            pulse_amplitude=0.8 + 0.2 * (1 - self.stress_level),
            quality=SignalQuality.GOOD.value
        )
    
    def generate_eye_tracking(self) -> EyeTrackingData:
        """Generate eye tracking data"""
        # Simulate gaze following track
        base_gaze_x = 0.5 + 0.3 * math.sin(self.time_offset * 0.5)
        base_gaze_y = 0.4 + 0.2 * math.cos(self.time_offset * 0.3)
        
        # Pupil dilates with cognitive load
        base_pupil = 4.0 + 2.0 * self.stress_level
        
        return EyeTrackingData(
            gaze_x=base_gaze_x + random.gauss(0, 0.02),
            gaze_y=base_gaze_y + random.gauss(0, 0.02),
            pupil_diameter_left=base_pupil + random.gauss(0, 0.2),
            pupil_diameter_right=base_pupil + random.gauss(0, 0.2),
            blink_rate=15 + 10 * self.fatigue_level,
            blink_duration=150 + 100 * self.fatigue_level,
            fixation_duration=200 + 100 * (1 - self.stress_level),
            saccade_velocity=300 - 100 * self.fatigue_level,
            cognitive_load=self.stress_level * 0.8,
            drowsiness_index=self.fatigue_level * 0.7,
            quality=SignalQuality.GOOD.value
        )
    
    def generate_respiration(self, num_points: int = 50) -> RespirationData:
        """Generate respiration signal"""
        waveform = []
        rate = 12 + int(8 * self.stress_level)
        
        for i in range(num_points):
            t = self.time_offset + i * 0.1
            # Breathing waveform
            phase = (t * rate / 60) % 1.0
            v = math.sin(2 * math.pi * phase)
            # Add irregularity with stress
            v += 0.1 * self.stress_level * math.sin(7 * math.pi * phase)
            waveform.append(v)
        
        ie_ratio = 0.4 + 0.1 * self.stress_level  # I:E ratio changes with stress
        inhalation_time = (60 / rate) * ie_ratio
        
        return RespirationData(
            waveform=waveform,
            rate=rate,
            depth=0.8 - 0.2 * self.fatigue_level,
            regularity=0.9 - 0.3 * self.stress_level,
            inhalation_time=inhalation_time,
            exhalation_time=(60 / rate) - inhalation_time,
            ie_ratio=ie_ratio,
            phase="inhale" if math.sin(self.time_offset * rate / 60 * 2 * math.pi) > 0 else "exhale",
            quality=SignalQuality.GOOD.value
        )
    
    def generate_temperature(self) -> TemperatureData:
        """Generate skin temperature data"""
        base_temp = 33.5 + 1.5 * self.stress_level
        
        return TemperatureData(
            skin_temp=base_temp + random.gauss(0, 0.1),
            ambient_temp=25.0 + random.gauss(0, 0.5),
            temp_gradient=0.1 * self.stress_level,
            thermal_comfort=0.7 - 0.3 * abs(base_temp - 34),
            quality=SignalQuality.GOOD.value
        )
    
    def generate_eog(self, num_points: int = 50) -> EOGData:
        """Generate EOG signal for eye movements"""
        h_waveform = []
        v_waveform = []
        
        for i in range(num_points):
            t = self.time_offset + i * 0.02
            # Horizontal saccades
            h = 0.3 * math.sin(t * 3) + 0.1 * random.gauss(0, 1)
            # Vertical movements
            v = 0.2 * math.sin(t * 2) + 0.1 * random.gauss(0, 1)
            h_waveform.append(h)
            v_waveform.append(v)
        
        return EOGData(
            horizontal_waveform=h_waveform,
            vertical_waveform=v_waveform,
            saccade_count=int(10 + 20 * (1 - self.fatigue_level)),
            fixation_count=int(15 + 10 * (1 - self.fatigue_level)),
            eye_movement_velocity=250 - 100 * self.fatigue_level,
            microsleep_detected=self.fatigue_level > 0.7 and random.random() > 0.9,
            quality=SignalQuality.GOOD.value
        )
    
    def generate_motion(self) -> MotionData:
        """Generate IMU/motion data"""
        # Simulate G-forces during racing
        lateral_g = 2.0 * math.sin(self.track_position * 2 * math.pi * 8)  # Cornering
        longitudinal_g = 1.5 * math.cos(self.track_position * 2 * math.pi * 4)  # Braking/accel
        
        return MotionData(
            acceleration_x=lateral_g + random.gauss(0, 0.1),
            acceleration_y=longitudinal_g + random.gauss(0, 0.1),
            acceleration_z=1.0 + 0.1 * random.gauss(0, 1),  # Vertical (1g baseline)
            gyro_x=10 * math.sin(self.time_offset) + random.gauss(0, 2),
            gyro_y=5 * math.cos(self.time_offset * 0.5) + random.gauss(0, 2),
            gyro_z=20 * lateral_g + random.gauss(0, 5),  # Yaw during cornering
            total_g_force=math.sqrt(lateral_g**2 + longitudinal_g**2 + 1),
            head_position="forward",
            body_sway=0.05 + 0.1 * abs(lateral_g),
            quality=SignalQuality.GOOD.value
        )
    
    def generate_eeg(self, num_points: int = 100) -> EEGData:
        """Generate EEG signal with frequency bands"""
        waveform = []
        
        for i in range(num_points):
            t = self.time_offset + i * 0.01
            # Combine frequency bands
            delta = 0.1 * math.sin(2 * math.pi * 2 * t)
            theta = 0.3 * (1 - self.stress_level) * math.sin(2 * math.pi * 6 * t)
            alpha = 0.25 * (1 - self.stress_level) * math.sin(2 * math.pi * 10 * t)
            beta = 0.2 * self.stress_level * math.sin(2 * math.pi * 20 * t)
            gamma = 0.1 * self.stress_level * math.sin(2 * math.pi * 40 * t)
            noise = 0.05 * random.gauss(0, 1)
            
            waveform.append(delta + theta + alpha + beta + gamma + noise)
        
        return EEGData(
            waveform=waveform,
            sampling_rate=1.5,
            status="Nominal",
            delta_power=10 + 5 * self.fatigue_level,
            theta_power=15 * (1 - self.stress_level),
            alpha_power=20 * (1 - self.stress_level),
            beta_power=25 * self.stress_level,
            gamma_power=10 * self.stress_level,
            theta_focus=0.65 + 0.2 * (1 - self.stress_level),
            beta_stress=0.3 + 0.4 * self.stress_level,
            attention_index=0.7 - 0.3 * self.fatigue_level,
            meditation_index=0.5 * (1 - self.stress_level),
            quality=SignalQuality.GOOD.value
        )
    
    def predict_emotional_state(self, ecg: ECGData, emg: EMGData, gsr: GSRData,
                                 ppg: PPGData, eye: EyeTrackingData, 
                                 resp: RespirationData, eeg: EEGData) -> EmotionalState:
        """Fuse multi-modal signals to predict emotional state"""
        
        # Calculate composite metrics
        stress = (
            0.2 * (ecg.heart_rate - 60) / 60 +
            0.2 * gsr.arousal_index +
            0.15 * emg.activation_level +
            0.15 * eeg.beta_stress +
            0.1 * (eye.pupil_diameter_left - 4) / 4 +
            0.1 * (resp.rate - 12) / 8 +
            0.1 * (1 - ecg.hrv_rmssd / 50)
        )
        stress = max(0, min(1, stress))
        
        focus = (
            0.3 * eeg.theta_focus +
            0.25 * eeg.attention_index +
            0.2 * (1 - eye.blink_rate / 30) +
            0.15 * (1 - eye.drowsiness_index) +
            0.1 * resp.regularity
        )
        focus = max(0, min(1, focus))
        
        fatigue = (
            0.2 * eye.drowsiness_index +
            0.2 * (1 - eye.saccade_velocity / 400) +
            0.15 * emg.fatigue_index +
            0.15 * (eeg.delta_power / 20) +
            0.15 * (1 - resp.depth) +
            0.15 * (eye.blink_rate / 30)
        )
        fatigue = max(0, min(1, fatigue))
        
        alertness = 1 - fatigue * 0.7 - stress * 0.3
        alertness = max(0, min(1, alertness))
        
        anxiety = stress * 0.6 + (1 - ecg.hrv_rmssd / 50) * 0.4
        anxiety = max(0, min(1, anxiety))
        
        confidence = (1 - anxiety) * 0.5 + focus * 0.3 + (1 - fatigue) * 0.2
        confidence = max(0, min(1, confidence))
        
        frustration = stress * 0.4 + (1 - focus) * 0.3 + emg.shoulder_tension * 0.3
        frustration = max(0, min(1, frustration))
        
        # Flow state: high focus, moderate stress, low fatigue
        flow_state = focus * 0.4 + (1 - abs(stress - 0.4)) * 0.3 + (1 - fatigue) * 0.3
        flow_state = max(0, min(1, flow_state))
        
        # Overall readiness
        overall_readiness = (
            0.3 * alertness +
            0.25 * focus +
            0.2 * (1 - fatigue) +
            0.15 * (1 - anxiety) +
            0.1 * (ppg.spo2 / 100)
        )
        
        # Safety risk assessment
        safety_risk = (
            0.25 * fatigue +
            0.2 * (stress if stress > 0.7 else 0) +
            0.2 * eye.drowsiness_index +
            0.15 * (1 if eye.blink_rate > 25 else 0) +
            0.1 * (1 - focus) +
            0.1 * emg.fatigue_index
        )
        
        # Determine if intervention needed
        intervention_needed = safety_risk > 0.6 or fatigue > 0.7 or stress > 0.8
        intervention_type = None
        if intervention_needed:
            if fatigue > 0.7:
                intervention_type = "FATIGUE_ALERT"
            elif stress > 0.8:
                intervention_type = "STRESS_REDUCTION"
            else:
                intervention_type = "ATTENTION_BOOST"
        
        # Primary indicators
        primary_indicators = []
        if stress > 0.6:
            primary_indicators.append("HIGH_STRESS")
        if fatigue > 0.5:
            primary_indicators.append("FATIGUE_DETECTED")
        if focus > 0.7:
            primary_indicators.append("HIGH_FOCUS")
        if eye.drowsiness_index > 0.5:
            primary_indicators.append("DROWSINESS")
        
        return EmotionalState(
            timestamp=datetime.now().isoformat(),
            stress=round(stress, 3),
            focus=round(focus, 3),
            fatigue=round(fatigue, 3),
            alertness=round(alertness, 3),
            anxiety=round(anxiety, 3),
            confidence=round(confidence, 3),
            frustration=round(frustration, 3),
            flow_state=round(flow_state, 3),
            overall_readiness=round(overall_readiness, 3),
            safety_risk=round(safety_risk, 3),
            intervention_needed=intervention_needed,
            intervention_type=intervention_type,
            primary_indicators=primary_indicators
        )
    
    def get_all_signals(self) -> Dict[str, Any]:
        """Get all biosignal data"""
        self.update()
        
        ecg = self.generate_ecg()
        emg = self.generate_emg()
        gsr = self.generate_gsr()
        ppg = self.generate_ppg()
        eye = self.generate_eye_tracking()
        resp = self.generate_respiration()
        temp = self.generate_temperature()
        eog = self.generate_eog()
        motion = self.generate_motion()
        eeg = self.generate_eeg()
        
        emotional_state = self.predict_emotional_state(
            ecg, emg, gsr, ppg, eye, resp, eeg
        )
        
        return {
            "ecg": asdict(ecg),
            "emg": asdict(emg),
            "gsr": asdict(gsr),
            "ppg": asdict(ppg),
            "eyeTracking": asdict(eye),
            "respiration": asdict(resp),
            "temperature": asdict(temp),
            "eog": asdict(eog),
            "motion": asdict(motion),
            "eeg": asdict(eeg),
            "emotionalState": asdict(emotional_state),
            "timestamp": datetime.now().isoformat()
        }


# Device Integration Templates (for real hardware)
DEVICE_CONFIGS = {
    "polar_h10": {
        "type": "ECG",
        "connection": "BLE",
        "python_lib": "bleak",
        "service_uuid": "0000180d-0000-1000-8000-00805f9b34fb",
        "sample_rate": 130
    },
    "muse_2": {
        "type": "EEG",
        "connection": "BLE",
        "python_lib": "muselsl",
        "channels": 4,
        "sample_rate": 256
    },
    "empatica_e4": {
        "type": "Multi",
        "signals": ["EDA", "PPG", "Temperature", "Accelerometer"],
        "connection": "E4 Streaming Server",
        "python_lib": "e4connect",
        "sample_rate": {"EDA": 4, "PPG": 64, "Temp": 4, "ACC": 32}
    },
    "tobii_pro": {
        "type": "Eye Tracking",
        "connection": "USB/Ethernet",
        "python_lib": "tobii-research",
        "sample_rate": 120
    },
    "shimmer3": {
        "type": "Multi",
        "signals": ["EMG", "ECG", "GSR", "IMU"],
        "connection": "Bluetooth",
        "python_lib": "pyshimmer",
        "sample_rate": 512
    },
    "openbci_cyton": {
        "type": "Multi",
        "signals": ["EEG", "EMG", "ECG", "EOG"],
        "connection": "USB/WiFi",
        "python_lib": "brainflow",
        "channels": 8,
        "sample_rate": 250
    }
}
