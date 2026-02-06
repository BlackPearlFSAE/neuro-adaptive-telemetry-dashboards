"""
Weather Service Module
======================

Simulates dynamic track and environmental conditions for predictive driver analysis.
"""

import random
import math
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Dict, Optional


@dataclass
class WeatherData:
    """Current weather conditions"""
    air_temp: float          # °C
    track_temp: float        # °C
    humidity: float          # %
    wind_speed: float        # km/h
    wind_direction: float    # degrees (0-360)
    rain_intensity: float    # 0.0 (dry) to 1.0 (heavy rain)
    visibility: float        # km
    pressure: float          # hPa
    condition: str           # "Clear", "Cloudy", "Light Rain", "Heavy Rain"
    track_state: str         # "Dry", "Damp", "Wet", "Flooded"
    grip_factor: float       # 0.0 to 1.0 (affects safety predictions)


class WeatherSimulator:
    """Simulates realistic weather conditions for race track"""
    
    def __init__(self):
        # Base conditions (starting state)
        self.base_air_temp = 22.0
        self.base_track_temp = 35.0
        self.base_humidity = 45.0
        self.rain_probability = 0.0
        self.rain_intensity = 0.0
        self.time_offset = 0.0
        
        # Weather change dynamics
        self.weather_trend = random.choice(["stable", "improving", "deteriorating"])
        self.next_change_time = random.uniform(60, 180)  # seconds until weather shift
        
    def update(self, dt: float = 0.1):
        """Update weather simulation"""
        self.time_offset += dt
        
        # Check for weather trend change
        if self.time_offset > self.next_change_time:
            self._shift_weather_trend()
            self.next_change_time = self.time_offset + random.uniform(60, 180)
        
        # Apply gradual changes based on trend
        if self.weather_trend == "deteriorating":
            self.rain_probability = min(0.9, self.rain_probability + 0.001)
            self.base_humidity = min(95, self.base_humidity + 0.02)
        elif self.weather_trend == "improving":
            self.rain_probability = max(0.0, self.rain_probability - 0.002)
            self.base_humidity = max(30, self.base_humidity - 0.03)
        
        # Rain dynamics
        if random.random() < self.rain_probability * 0.01:
            self.rain_intensity = min(1.0, self.rain_intensity + random.uniform(0.05, 0.15))
        else:
            self.rain_intensity = max(0.0, self.rain_intensity - 0.005)
    
    def _shift_weather_trend(self):
        """Randomly shift weather trend"""
        trends = ["stable", "improving", "deteriorating"]
        weights = [0.5, 0.3, 0.2] if self.rain_intensity < 0.3 else [0.3, 0.4, 0.3]
        self.weather_trend = random.choices(trends, weights=weights)[0]
    
    def get_weather(self) -> WeatherData:
        """Get current weather conditions"""
        self.update()
        
        # Calculate derived values
        time_factor = math.sin(self.time_offset / 300) * 0.5 + 0.5  # slow oscillation
        
        air_temp = self.base_air_temp + random.gauss(0, 0.3) + time_factor * 3
        track_temp = air_temp + 10 + (1 - self.rain_intensity) * 8
        humidity = self.base_humidity + self.rain_intensity * 30 + random.gauss(0, 2)
        
        wind_speed = 5 + random.uniform(0, 20) * (0.5 + self.rain_intensity * 0.5)
        wind_direction = (180 + self.time_offset * 0.5) % 360
        
        visibility = 10 - self.rain_intensity * 7
        pressure = 1013 + random.gauss(0, 5) - self.rain_intensity * 10
        
        # Determine conditions
        if self.rain_intensity > 0.6:
            condition = "Heavy Rain"
            track_state = "Flooded"
        elif self.rain_intensity > 0.3:
            condition = "Light Rain"
            track_state = "Wet"
        elif self.rain_intensity > 0.1:
            condition = "Cloudy"
            track_state = "Damp"
        else:
            condition = "Clear"
            track_state = "Dry"
        
        # Grip factor (critical for safety predictions)
        grip_factor = 1.0 - self.rain_intensity * 0.5
        if track_temp < 20 or track_temp > 50:
            grip_factor *= 0.9
        
        return WeatherData(
            air_temp=round(air_temp, 1),
            track_temp=round(track_temp, 1),
            humidity=round(min(100, max(0, humidity)), 1),
            wind_speed=round(wind_speed, 1),
            wind_direction=round(wind_direction, 0),
            rain_intensity=round(self.rain_intensity, 2),
            visibility=round(visibility, 1),
            pressure=round(pressure, 1),
            condition=condition,
            track_state=track_state,
            grip_factor=round(grip_factor, 2)
        )
    
    def to_dict(self) -> Dict:
        """Get weather as dictionary for API"""
        weather = self.get_weather()
        return {
            "timestamp": datetime.now().isoformat(),
            **asdict(weather)
        }
    
    def trigger_rain(self, intensity: float = 0.5):
        """Manually trigger rain (for testing)"""
        self.rain_intensity = min(1.0, max(0.0, intensity))
        self.weather_trend = "stable"
    
    def clear_weather(self):
        """Reset to clear conditions"""
        self.rain_intensity = 0.0
        self.rain_probability = 0.0
        self.weather_trend = "improving"


# Singleton instance for global use
weather_simulator = WeatherSimulator()
