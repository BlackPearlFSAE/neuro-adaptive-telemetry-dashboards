"""
BP16 Best Practices Module - Black Pearl Racing
================================================

Safety thresholds, intervention protocols, and data logging for KMUTT Student Formula.
Black Pearl Racing (blackpearlracing.club) - BP16 Neuro-Adaptive Telemetry System.
"""

from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Tuple
from enum import Enum
from datetime import datetime
import json


class AlertLevel(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


class InterventionType(Enum):
    """Types of adaptive interventions"""
    NONE = "none"
    HAPTIC_FEEDBACK = "haptic_feedback"
    AUDIO_ALERT = "audio_alert"
    VISUAL_REDUCTION = "visual_reduction"
    THROTTLE_LIMIT = "throttle_limit"
    PIT_RECOMMENDATION = "pit_recommendation"
    IMMEDIATE_STOP = "immediate_stop"


@dataclass
class SafetyThreshold:
    """Safety threshold definition"""
    metric: str
    category: str
    unit: str
    normal_min: float
    normal_max: float
    warning_min: Optional[float]
    warning_max: Optional[float]
    critical_min: Optional[float]
    critical_max: Optional[float]
    action_warning: str
    action_critical: str


@dataclass
class Alert:
    """Real-time safety alert"""
    id: str
    timestamp: str
    level: str
    category: str
    metric: str
    current_value: float
    threshold_value: float
    message: str
    intervention: str
    acknowledged: bool = False


# BP16 Safety Thresholds Definition
BP16_THRESHOLDS: Dict[str, SafetyThreshold] = {
    # Driver Biometrics
    "heart_rate": SafetyThreshold(
        metric="heart_rate",
        category="Cardiovascular",
        unit="BPM",
        normal_min=60, normal_max=120,
        warning_min=50, warning_max=140,
        critical_min=40, critical_max=160,
        action_warning="Monitor closely, reduce cognitive load",
        action_critical="Immediate pit stop, medical assessment"
    ),
    "hrv_rmssd": SafetyThreshold(
        metric="hrv_rmssd",
        category="Cardiovascular",
        unit="ms",
        normal_min=25, normal_max=80,
        warning_min=15, warning_max=None,
        critical_min=10, critical_max=None,
        action_warning="Driver stress elevated, monitor",
        action_critical="High stress state, pit recommendation"
    ),
    "spo2": SafetyThreshold(
        metric="spo2",
        category="Respiratory",
        unit="%",
        normal_min=96, normal_max=100,
        warning_min=94, warning_max=None,
        critical_min=92, critical_max=None,
        action_warning="Check breathing, reduce physical demand",
        action_critical="Medical emergency, immediate stop"
    ),
    "respiration_rate": SafetyThreshold(
        metric="respiration_rate",
        category="Respiratory",
        unit="BPM",
        normal_min=12, normal_max=18,
        warning_min=8, warning_max=24,
        critical_min=6, critical_max=30,
        action_warning="Breathing irregular, provide audio guidance",
        action_critical="Respiratory distress, medical alert"
    ),
    "skin_temp": SafetyThreshold(
        metric="skin_temp",
        category="Thermal",
        unit="°C",
        normal_min=32, normal_max=35,
        warning_min=31, warning_max=36,
        critical_min=30, critical_max=37.5,
        action_warning="Cool suit adjustment recommended",
        action_critical="Heat stress, mandatory cooling"
    ),
    "stress_index": SafetyThreshold(
        metric="stress_index",
        category="Psychological",
        unit="%",
        normal_min=0, normal_max=50,
        warning_min=None, warning_max=70,
        critical_min=None, critical_max=85,
        action_warning="Reduce HUD complexity, calming audio",
        action_critical="Maximum intervention, haptic feedback"
    ),
    "fatigue_index": SafetyThreshold(
        metric="fatigue_index",
        category="Cognitive",
        unit="%",
        normal_min=0, normal_max=40,
        warning_min=None, warning_max=60,
        critical_min=None, critical_max=75,
        action_warning="Alert driver, reduce session time",
        action_critical="Pit stop mandatory, driver swap"
    ),
    "drowsiness": SafetyThreshold(
        metric="drowsiness",
        category="Cognitive",
        unit="%",
        normal_min=0, normal_max=20,
        warning_min=None, warning_max=40,
        critical_min=None, critical_max=60,
        action_warning="Audio alert, haptic wake-up",
        action_critical="Emergency intervention, immediate stop"
    ),
    "blink_rate": SafetyThreshold(
        metric="blink_rate",
        category="Cognitive",
        unit="/min",
        normal_min=10, normal_max=20,
        warning_min=8, warning_max=30,
        critical_min=5, critical_max=40,
        action_warning="Monitor attention, reduce distractions",
        action_critical="Drowsiness detected, alert driver"
    ),
    # Vehicle Systems
    "motor_temp": SafetyThreshold(
        metric="motor_temp",
        category="Powertrain",
        unit="°C",
        normal_min=40, normal_max=75,
        warning_min=30, warning_max=85,
        critical_min=20, critical_max=95,
        action_warning="Reduce power output",
        action_critical="Power limiting active, pit recommended"
    ),
    "battery_temp": SafetyThreshold(
        metric="battery_temp",
        category="Energy",
        unit="°C",
        normal_min=25, normal_max=40,
        warning_min=20, warning_max=50,
        critical_min=15, critical_max=55,
        action_warning="Adjust regen, manage thermal",
        action_critical="Thermal emergency, stop vehicle"
    ),
    "battery_soc": SafetyThreshold(
        metric="battery_soc",
        category="Energy",
        unit="%",
        normal_min=30, normal_max=100,
        warning_min=20, warning_max=None,
        critical_min=10, critical_max=None,
        action_warning="Plan pit strategy",
        action_critical="Return to pit immediately"
    ),
    "brake_temp": SafetyThreshold(
        metric="brake_temp",
        category="Braking",
        unit="°C",
        normal_min=200, normal_max=600,
        warning_min=100, warning_max=750,
        critical_min=50, critical_max=850,
        action_warning="Reduce brake pressure, cool laps",
        action_critical="Brake fade risk, immediate action"
    ),
    "tire_temp": SafetyThreshold(
        metric="tire_temp",
        category="Tires",
        unit="°C",
        normal_min=70, normal_max=100,
        warning_min=60, warning_max=115,
        critical_min=50, critical_max=125,
        action_warning="Adjust driving style",
        action_critical="Tire degradation risk, pit for change"
    ),
}


# BP16 Guidelines
BP16_GUIDELINES = {
    "version": "BP16.2024.1",
    "title": "Black Pearl Racing - Neuro-Adaptive Telemetry Safety Standards",
    "team": "Black Pearl Racing Club",
    "institution": "KMUTT (King Mongkut's University of Technology Thonburi)",
    "website": "blackpearlracing.club",
    "categories": [
        {
            "id": "driver_monitoring",
            "title": "Driver Monitoring",
            "icon": "👤",
            "guidelines": [
                "Continuous ECG/HRV monitoring at minimum 130Hz sampling",
                "EEG monitoring with theta/beta ratio analysis",
                "Blink rate and pupil dilation tracking for fatigue",
                "GSR/EDA for stress and arousal detection",
                "Respiration rate and pattern analysis",
                "Core/skin temperature differential monitoring"
            ]
        },
        {
            "id": "intervention_protocol",
            "title": "Intervention Protocol",
            "icon": "⚡",
            "guidelines": [
                "Level 1 (Info): Visual indicator only",
                "Level 2 (Warning): Audio alert + reduced HUD",
                "Level 3 (Critical): Haptic feedback + throttle limiting",
                "Level 4 (Emergency): Full vehicle control intervention",
                "All interventions logged with timestamp and driver response",
                "Minimum 5-second delay between repeated alerts"
            ]
        },
        {
            "id": "data_integrity",
            "title": "Data Integrity",
            "icon": "🔒",
            "guidelines": [
                "All biosignal data timestamped to GPS precision",
                "Redundant storage: local + cloud backup",
                "Signal quality metrics recorded per channel",
                "Missing data flagged with interpolation markers",
                "Session data retained minimum 30 days",
                "GDPR-compliant driver consent required"
            ]
        },
        {
            "id": "vehicle_integration",
            "title": "Vehicle Integration",
            "icon": "🏎️",
            "guidelines": [
                "CAN bus integration at 500kbps minimum",
                "Motor controller telemetry at 100Hz",
                "Battery management system monitoring",
                "Brake-by-wire feedback integration",
                "Steering angle and torque sensing",
                "Accelerometer/gyroscope for G-force tracking"
            ]
        },
        {
            "id": "ai_safety",
            "title": "AI Safety Model",
            "icon": "🧠",
            "guidelines": [
                "Multi-modal fusion with weighted confidence",
                "Minimum 3 independent signals for critical alerts",
                "False positive rate < 5% for critical alerts",
                "Model retraining required after 50 session hours",
                "Human-in-loop override always available",
                "Explainable AI decision logging required"
            ]
        },
        {
            "id": "emergency_procedures",
            "title": "Emergency Procedures",
            "icon": "🚨",
            "guidelines": [
                "Microsleep detection triggers immediate audio",
                "SpO2 < 92% initiates medical protocol",
                "Heart rate anomaly alerts race control",
                "Loss of signal for > 5s triggers safety check",
                "Driver non-response initiates vehicle slowdown",
                "Emergency stop contact with race medical team"
            ]
        }
    ]
}


class SafetyMonitor:
    """Real-time safety monitoring and alert generation"""
    
    def __init__(self):
        self.active_alerts: List[Alert] = []
        self.alert_history: List[Alert] = []
        self.alert_counter = 0
        self.last_alert_time: Dict[str, float] = {}
        self.min_alert_interval = 5.0  # seconds between same alert type
    
    def check_threshold(self, metric: str, value: float) -> Optional[Alert]:
        """Check if a metric violates safety thresholds"""
        if metric not in BP16_THRESHOLDS:
            return None
        
        threshold = BP16_THRESHOLDS[metric]
        current_time = datetime.now()
        
        # Check critical thresholds
        level = None
        threshold_value = None
        
        if threshold.critical_min is not None and value < threshold.critical_min:
            level = AlertLevel.CRITICAL
            threshold_value = threshold.critical_min
        elif threshold.critical_max is not None and value > threshold.critical_max:
            level = AlertLevel.CRITICAL
            threshold_value = threshold.critical_max
        elif threshold.warning_min is not None and value < threshold.warning_min:
            level = AlertLevel.WARNING
            threshold_value = threshold.warning_min
        elif threshold.warning_max is not None and value > threshold.warning_max:
            level = AlertLevel.WARNING
            threshold_value = threshold.warning_max
        
        if level is None:
            return None
        
        # Rate limiting
        last_time = self.last_alert_time.get(metric, 0)
        if (current_time.timestamp() - last_time) < self.min_alert_interval:
            return None
        
        self.last_alert_time[metric] = current_time.timestamp()
        self.alert_counter += 1
        
        # Determine intervention
        if level == AlertLevel.CRITICAL:
            intervention = InterventionType.THROTTLE_LIMIT.value
            message = threshold.action_critical
        else:
            intervention = InterventionType.HAPTIC_FEEDBACK.value
            message = threshold.action_warning
        
        alert = Alert(
            id=f"ALT-{self.alert_counter:04d}",
            timestamp=current_time.isoformat(),
            level=level.value,
            category=threshold.category,
            metric=metric,
            current_value=round(value, 2),
            threshold_value=threshold_value,
            message=message,
            intervention=intervention
        )
        
        self.active_alerts.append(alert)
        self.alert_history.append(alert)
        
        # Keep only last 100 in history
        if len(self.alert_history) > 100:
            self.alert_history = self.alert_history[-100:]
        
        return alert
    
    def check_all_metrics(self, data: Dict[str, float]) -> List[Alert]:
        """Check all provided metrics against thresholds"""
        new_alerts = []
        for metric, value in data.items():
            alert = self.check_threshold(metric, value)
            if alert:
                new_alerts.append(alert)
        return new_alerts
    
    def acknowledge_alert(self, alert_id: str) -> bool:
        """Mark an alert as acknowledged"""
        for alert in self.active_alerts:
            if alert.id == alert_id:
                alert.acknowledged = True
                return True
        return False
    
    def dismiss_alert(self, alert_id: str) -> bool:
        """Remove an alert from active list"""
        for i, alert in enumerate(self.active_alerts):
            if alert.id == alert_id:
                self.active_alerts.pop(i)
                return True
        return False
    
    def get_active_alerts(self) -> List[Dict]:
        """Get all active alerts"""
        return [asdict(a) for a in self.active_alerts]
    
    def get_alert_summary(self) -> Dict:
        """Get alert statistics"""
        return {
            "total_active": len(self.active_alerts),
            "critical": sum(1 for a in self.active_alerts if a.level == "critical"),
            "warning": sum(1 for a in self.active_alerts if a.level == "warning"),
            "info": sum(1 for a in self.active_alerts if a.level == "info"),
            "total_history": len(self.alert_history)
        }


class DataLogger:
    """Session data logging for analysis and AI training"""
    
    def __init__(self):
        self.session_id: Optional[str] = None
        self.session_start: Optional[datetime] = None
        self.data_points: List[Dict] = []
        self.events: List[Dict] = []
    
    def start_session(self, driver_name: str, circuit: str) -> str:
        """Start a new logging session"""
        self.session_id = f"SES-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        self.session_start = datetime.now()
        self.data_points = []
        self.events = []
        
        self.log_event("session_start", {
            "driver": driver_name,
            "circuit": circuit
        })
        
        return self.session_id
    
    def log_data(self, data: Dict) -> None:
        """Log a telemetry data point"""
        if self.session_id:
            self.data_points.append({
                "timestamp": datetime.now().isoformat(),
                "data": data
            })
    
    def log_event(self, event_type: str, details: Dict) -> None:
        """Log a session event"""
        self.events.append({
            "timestamp": datetime.now().isoformat(),
            "type": event_type,
            "details": details
        })
    
    def end_session(self) -> Dict:
        """End the current session and return summary"""
        if not self.session_id:
            return {}
        
        self.log_event("session_end", {})
        
        summary = {
            "session_id": self.session_id,
            "start_time": self.session_start.isoformat() if self.session_start else None,
            "end_time": datetime.now().isoformat(),
            "duration_seconds": (datetime.now() - self.session_start).total_seconds() if self.session_start else 0,
            "data_point_count": len(self.data_points),
            "event_count": len(self.events)
        }
        
        self.session_id = None
        return summary
    
    def get_session_info(self) -> Dict:
        """Get current session information"""
        return {
            "session_id": self.session_id,
            "active": self.session_id is not None,
            "start_time": self.session_start.isoformat() if self.session_start else None,
            "data_points_logged": len(self.data_points),
            "events_logged": len(self.events)
        }


def get_bp16_data() -> Dict:
    """Get BP16 guidelines and thresholds for frontend"""
    return {
        "guidelines": BP16_GUIDELINES,
        "thresholds": {k: asdict(v) for k, v in BP16_THRESHOLDS.items()},
        "alert_levels": [level.value for level in AlertLevel],
        "intervention_types": [it.value for it in InterventionType]
    }
