"""
NATS Session Recorder
=====================
Persists telemetry data for post-race analysis and replay.

Black Pearl Racing | KMUTT Student Formula | BP16
"""

import json
import time
import asyncio
import os
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import List, Optional, Dict, Any
from pathlib import Path

@dataclass
class SessionFrame:
    """Single frame of telemetry data"""
    timestamp: float
    frame_id: int
    biosignals: Dict[str, Any]
    safety_score: float
    vehicle: Optional[Dict[str, Any]] = None

@dataclass
class SessionMetadata:
    """Session information"""
    session_id: str
    driver_name: str
    track_name: str
    start_time: float
    end_time: Optional[float] = None
    total_frames: int = 0
    avg_safety_score: float = 100.0

class SessionRecorder:
    """Record and playback telemetry sessions"""
    
    def __init__(self, storage_dir: str = "./sessions"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        
        self.is_recording = False
        self.current_session: Optional[SessionMetadata] = None
        self.frames: List[SessionFrame] = []
        self.frame_counter = 0
        
    def start_session(self, driver: str = "Driver", track: str = "Unknown") -> str:
        """Start a new recording session"""
        session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        self.current_session = SessionMetadata(
            session_id=session_id,
            driver_name=driver,
            track_name=track,
            start_time=time.time()
        )
        
        self.frames = []
        self.frame_counter = 0
        self.is_recording = True
        
        return session_id
    
    def record_frame(self, biosignals: dict, safety_score: float, vehicle: dict = None):
        """Record a single frame of data"""
        if not self.is_recording:
            return
            
        frame = SessionFrame(
            timestamp=time.time(),
            frame_id=self.frame_counter,
            biosignals=biosignals,
            safety_score=safety_score,
            vehicle=vehicle
        )
        
        self.frames.append(frame)
        self.frame_counter += 1
        
        if self.current_session:
            self.current_session.total_frames = self.frame_counter
    
    def stop_session(self) -> Optional[str]:
        """Stop recording and save to disk"""
        if not self.is_recording or not self.current_session:
            return None
            
        self.is_recording = False
        self.current_session.end_time = time.time()
        
        # Calculate average safety score
        if self.frames:
            scores = [f.safety_score for f in self.frames]
            self.current_session.avg_safety_score = sum(scores) / len(scores)
        
        # Save to file
        filepath = self._save_session()
        
        return filepath
    
    def _save_session(self) -> str:
        """Save session to JSON file"""
        if not self.current_session:
            return ""
            
        filename = f"session_{self.current_session.session_id}.json"
        filepath = self.storage_dir / filename
        
        data = {
            "metadata": asdict(self.current_session),
            "frames": [asdict(f) for f in self.frames]
        }
        
        with open(filepath, 'w') as f:
            json.dump(data, f)
            
        return str(filepath)
    
    def list_sessions(self) -> List[dict]:
        """List all recorded sessions"""
        sessions = []
        
        for f in self.storage_dir.glob("session_*.json"):
            try:
                with open(f) as file:
                    data = json.load(file)
                    sessions.append(data["metadata"])
            except:
                pass
                
        return sorted(sessions, key=lambda x: x["start_time"], reverse=True)
    
    def load_session(self, session_id: str) -> Optional[dict]:
        """Load a session for playback"""
        filepath = self.storage_dir / f"session_{session_id}.json"
        
        if not filepath.exists():
            return None
            
        with open(filepath) as f:
            return json.load(f)
    
    def get_session_stats(self, session_id: str) -> Optional[dict]:
        """Get statistics for a session"""
        session = self.load_session(session_id)
        if not session:
            return None
            
        frames = session["frames"]
        if not frames:
            return None
            
        scores = [f["safety_score"] for f in frames]
        
        return {
            "session_id": session_id,
            "duration_s": session["metadata"]["end_time"] - session["metadata"]["start_time"],
            "total_frames": len(frames),
            "safety": {
                "min": min(scores),
                "max": max(scores),
                "avg": sum(scores) / len(scores),
                "critical_events": sum(1 for s in scores if s < 40)
            }
        }

# Singleton instance
session_recorder = SessionRecorder()
