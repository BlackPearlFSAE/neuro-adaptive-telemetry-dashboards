"""
NATS Safety AI Engine
=====================
Real-time driver safety prediction combining all biosignal inputs.
Generates a single 0-100 Safety Score with intervention recommendations.

Black Pearl Racing | KMUTT Student Formula | BP16
"""

import time
import math
from dataclasses import dataclass, field
from typing import List, Optional, Dict
from enum import Enum

class SafetyLevel(Enum):
    OPTIMAL = "optimal"      # 80-100: Driver in peak condition
    CAUTION = "caution"      # 60-79: Elevated stress or fatigue
    WARNING = "warning"      # 40-59: Intervention recommended
    CRITICAL = "critical"    # 0-39: Immediate action required

@dataclass
class SafetyPrediction:
    """Real-time safety assessment"""
    score: float              # 0-100 overall safety score
    level: SafetyLevel
    confidence: float         # 0-1 prediction confidence
    timestamp: float
    
    # Component scores (0-100 each)
    cardiac_score: float = 100.0
    cognitive_score: float = 100.0
    visual_score: float = 100.0
    stress_score: float = 100.0
    
    # Intervention flags
    intervention_required: bool = False
    recommended_actions: List[str] = field(default_factory=list)
    
    # Prediction horizon
    predicted_score_3s: float = 100.0  # Predict 3 seconds ahead
    trend: str = "stable"  # rising, falling, stable

@dataclass 
class BiometricInput:
    """Input from all sensor sources"""
    heart_rate: float = 75.0
    hrv_rmssd: float = 50.0
    stress_index: float = 0.3
    
    eeg_focus: float = 0.7
    eeg_theta: float = 0.3
    eeg_beta: float = 0.5
    
    eye_drowsiness: float = 0.1
    eye_blink_rate: float = 15.0
    pupil_dilation: float = 4.0
    
    gsr_arousal: float = 0.3
    skin_temp: float = 36.5
    spo2: float = 98.0
    
    g_force: float = 1.0

class SafetyAI:
    """
    Multi-modal fusion AI for driver safety prediction.
    Weights are tuned for Formula racing conditions.
    """
    
    # Thresholds for each metric (min_safe, max_safe)
    THRESHOLDS = {
        "heart_rate": (50, 180),      # BPM
        "hrv_rmssd": (20, 100),       # ms (lower = stressed)
        "stress_index": (0, 0.7),     # 0-1
        "eeg_focus": (0.3, 1.0),      # 0-1
        "eye_drowsiness": (0, 0.4),   # 0-1
        "eye_blink_rate": (8, 25),    # blinks/min
        "gsr_arousal": (0, 0.8),      # 0-1
        "spo2": (94, 100),            # %
    }
    
    # Component weights for final score
    WEIGHTS = {
        "cardiac": 0.30,
        "cognitive": 0.25,
        "visual": 0.25,
        "stress": 0.20,
    }
    
    def __init__(self):
        self.history: List[SafetyPrediction] = []
        self.max_history = 300  # 5 minutes at 1Hz
        
    def _score_metric(self, value: float, metric: str) -> float:
        """Score a single metric 0-100 based on thresholds"""
        if metric not in self.THRESHOLDS:
            return 100.0
            
        min_safe, max_safe = self.THRESHOLDS[metric]
        
        # Invert for metrics where lower is worse
        if metric in ["hrv_rmssd", "eeg_focus", "spo2"]:
            # Lower values are worse
            if value >= max_safe:
                return 100.0
            elif value <= min_safe:
                return 0.0
            else:
                return ((value - min_safe) / (max_safe - min_safe)) * 100
        else:
            # Higher values are worse (stress, drowsiness, etc)
            if value <= min_safe:
                return 100.0
            elif value >= max_safe:
                return 0.0
            else:
                return (1 - (value - min_safe) / (max_safe - min_safe)) * 100
    
    def _calculate_cardiac_score(self, inp: BiometricInput) -> float:
        """Cardiac health: HR + HRV + SpO2"""
        hr_score = self._score_metric(inp.heart_rate, "heart_rate")
        hrv_score = self._score_metric(inp.hrv_rmssd, "hrv_rmssd")
        spo2_score = self._score_metric(inp.spo2, "spo2")
        
        return (hr_score * 0.3 + hrv_score * 0.4 + spo2_score * 0.3)
    
    def _calculate_cognitive_score(self, inp: BiometricInput) -> float:
        """Cognitive state: EEG focus + drowsiness"""
        focus_score = self._score_metric(inp.eeg_focus, "eeg_focus")
        drowsy_score = self._score_metric(inp.eye_drowsiness, "eye_drowsiness")
        
        return (focus_score * 0.6 + drowsy_score * 0.4)
    
    def _calculate_visual_score(self, inp: BiometricInput) -> float:
        """Visual alertness: Blink rate + drowsiness"""
        blink_score = self._score_metric(inp.eye_blink_rate, "eye_blink_rate")
        drowsy_score = self._score_metric(inp.eye_drowsiness, "eye_drowsiness")
        
        return (blink_score * 0.4 + drowsy_score * 0.6)
    
    def _calculate_stress_score(self, inp: BiometricInput) -> float:
        """Stress level: GSR + stress index"""
        gsr_score = self._score_metric(inp.gsr_arousal, "gsr_arousal")
        stress_score = self._score_metric(inp.stress_index, "stress_index")
        
        return (gsr_score * 0.5 + stress_score * 0.5)
    
    def _predict_future(self, current: float) -> tuple:
        """Predict score 3 seconds ahead using trend analysis"""
        if len(self.history) < 3:
            return current, "stable"
            
        recent = [p.score for p in self.history[-5:]]
        avg_change = (recent[-1] - recent[0]) / len(recent)
        
        predicted = current + (avg_change * 3)
        predicted = max(0, min(100, predicted))
        
        if avg_change > 2:
            trend = "rising"
        elif avg_change < -2:
            trend = "falling"
        else:
            trend = "stable"
            
        return predicted, trend
    
    def _get_recommendations(self, pred: SafetyPrediction) -> List[str]:
        """Generate intervention recommendations"""
        actions = []
        
        if pred.cardiac_score < 60:
            actions.append("Reduce throttle aggressiveness")
        if pred.cognitive_score < 50:
            actions.append("Enable reduced HUD mode")
        if pred.visual_score < 40:
            actions.append("Activate alertness warning")
        if pred.stress_score < 50:
            actions.append("Enable haptic calming feedback")
        if pred.score < 40:
            actions.append("RECOMMEND PIT STOP")
            
        return actions
    
    def predict(self, inp: BiometricInput) -> SafetyPrediction:
        """Generate real-time safety prediction"""
        
        # Calculate component scores
        cardiac = self._calculate_cardiac_score(inp)
        cognitive = self._calculate_cognitive_score(inp)
        visual = self._calculate_visual_score(inp)
        stress = self._calculate_stress_score(inp)
        
        # Weighted fusion
        score = (
            cardiac * self.WEIGHTS["cardiac"] +
            cognitive * self.WEIGHTS["cognitive"] +
            visual * self.WEIGHTS["visual"] +
            stress * self.WEIGHTS["stress"]
        )
        
        # Determine safety level
        if score >= 80:
            level = SafetyLevel.OPTIMAL
        elif score >= 60:
            level = SafetyLevel.CAUTION
        elif score >= 40:
            level = SafetyLevel.WARNING
        else:
            level = SafetyLevel.CRITICAL
        
        # Predict future
        predicted_3s, trend = self._predict_future(score)
        
        # Build prediction
        pred = SafetyPrediction(
            score=round(score, 1),
            level=level,
            confidence=0.85,
            timestamp=time.time(),
            cardiac_score=round(cardiac, 1),
            cognitive_score=round(cognitive, 1),
            visual_score=round(visual, 1),
            stress_score=round(stress, 1),
            intervention_required=score < 50,
            predicted_score_3s=round(predicted_3s, 1),
            trend=trend
        )
        
        pred.recommended_actions = self._get_recommendations(pred)
        
        # Store history
        self.history.append(pred)
        if len(self.history) > self.max_history:
            self.history.pop(0)
        
        return pred
    
    def to_dict(self, pred: SafetyPrediction) -> dict:
        """Convert prediction to JSON-serializable dict"""
        return {
            "score": pred.score,
            "level": pred.level.value,
            "confidence": pred.confidence,
            "timestamp": pred.timestamp,
            "components": {
                "cardiac": pred.cardiac_score,
                "cognitive": pred.cognitive_score,
                "visual": pred.visual_score,
                "stress": pred.stress_score
            },
            "intervention": {
                "required": pred.intervention_required,
                "actions": pred.recommended_actions
            },
            "prediction": {
                "score_3s": pred.predicted_score_3s,
                "trend": pred.trend
            }
        }

# Singleton instance
safety_ai = SafetyAI()
