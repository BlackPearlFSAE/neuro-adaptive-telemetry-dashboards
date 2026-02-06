import React, { useState, useEffect } from 'react'

interface WeatherData {
    air_temp: number
    track_temp: number
    humidity: number
    wind_speed: number
    wind_direction: number
    rain_intensity: number
    visibility: number
    condition: string
    track_state: string
    grip_factor: number
}

export const WeatherWidget: React.FC = () => {
    const [weather, setWeather] = useState<WeatherData | null>(null)

    useEffect(() => {
        const fetchWeather = async () => {
            try {
                const res = await fetch('/api/weather')
                if (res.ok) {
                    setWeather(await res.json())
                }
            } catch { }
        }

        fetchWeather()
        const interval = setInterval(fetchWeather, 2000)
        return () => clearInterval(interval)
    }, [])

    if (!weather) return null

    const getConditionIcon = () => {
        switch (weather.condition) {
            case 'Heavy Rain': return '🌧️'
            case 'Light Rain': return '🌦️'
            case 'Cloudy': return '☁️'
            default: return '☀️'
        }
    }

    const getTrackStateColor = () => {
        switch (weather.track_state) {
            case 'Flooded': return '#ff4757'
            case 'Wet': return '#ffa502'
            case 'Damp': return '#7bed9f'
            default: return '#00ff88'
        }
    }

    const gripPercent = Math.round(weather.grip_factor * 100)

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span style={styles.icon}>{getConditionIcon()}</span>
                <span style={styles.title}>TRACK CONDITIONS</span>
                <span style={{ ...styles.trackBadge, background: getTrackStateColor() + '30', color: getTrackStateColor() }}>
                    {weather.track_state.toUpperCase()}
                </span>
            </div>

            <div style={styles.grid}>
                {/* Air Temp */}
                <div style={styles.metric}>
                    <span style={styles.metricLabel}>AIR</span>
                    <span style={styles.metricValue}>{weather.air_temp}°C</span>
                </div>

                {/* Track Temp */}
                <div style={styles.metric}>
                    <span style={styles.metricLabel}>TRACK</span>
                    <span style={{ ...styles.metricValue, color: weather.track_temp > 45 ? '#ffa502' : '#00d4ff' }}>
                        {weather.track_temp}°C
                    </span>
                </div>

                {/* Humidity */}
                <div style={styles.metric}>
                    <span style={styles.metricLabel}>HUMIDITY</span>
                    <span style={styles.metricValue}>{weather.humidity}%</span>
                </div>

                {/* Wind */}
                <div style={styles.metric}>
                    <span style={styles.metricLabel}>WIND</span>
                    <span style={styles.metricValue}>{weather.wind_speed} km/h</span>
                </div>
            </div>

            {/* Rain Bar */}
            {weather.rain_intensity > 0 && (
                <div style={styles.rainSection}>
                    <span style={styles.rainLabel}>🌧️ Rain Intensity</span>
                    <div style={styles.rainBarBg}>
                        <div style={{ ...styles.rainBarFill, width: `${weather.rain_intensity * 100}%` }} />
                    </div>
                    <span style={styles.rainPercent}>{Math.round(weather.rain_intensity * 100)}%</span>
                </div>
            )}

            {/* Grip Factor */}
            <div style={styles.gripSection}>
                <span style={styles.gripLabel}>GRIP FACTOR</span>
                <div style={styles.gripRing}>
                    <svg width="50" height="50" viewBox="0 0 50 50">
                        <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                        <circle
                            cx="25" cy="25" r="20" fill="none"
                            stroke={gripPercent > 80 ? '#00ff88' : gripPercent > 50 ? '#fbbf24' : '#ff4757'}
                            strokeWidth="6"
                            strokeDasharray={`${gripPercent * 1.26} 126`}
                            strokeLinecap="round"
                            transform="rotate(-90 25 25)"
                        />
                    </svg>
                    <span style={styles.gripValue}>{gripPercent}</span>
                </div>
            </div>
        </div>
    )
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        background: 'linear-gradient(135deg, rgba(13, 33, 55, 0.95) 0%, rgba(10, 22, 40, 0.98) 100%)',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        borderRadius: '12px',
        padding: '16px',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '12px',
    },
    icon: { fontSize: '1.5rem' },
    title: {
        fontSize: '0.75rem',
        fontWeight: 700,
        color: '#fff',
        letterSpacing: '1px',
        flex: 1,
    },
    trackBadge: {
        fontSize: '0.6rem',
        fontWeight: 700,
        padding: '4px 8px',
        borderRadius: '6px',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '10px',
        marginBottom: '12px',
    },
    metric: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
    },
    metricLabel: {
        fontSize: '0.55rem',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: '0.5px',
    },
    metricValue: {
        fontSize: '1rem',
        fontWeight: 700,
        color: '#00d4ff',
        fontFamily: 'monospace',
    },
    rainSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '12px',
    },
    rainLabel: {
        fontSize: '0.65rem',
        color: 'rgba(255,255,255,0.6)',
    },
    rainBarBg: {
        flex: 1,
        height: '6px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '3px',
        overflow: 'hidden',
    },
    rainBarFill: {
        height: '100%',
        background: 'linear-gradient(90deg, #00d4ff, #00ff88)',
        borderRadius: '3px',
        transition: 'width 0.3s',
    },
    rainPercent: {
        fontSize: '0.7rem',
        fontWeight: 600,
        color: '#00d4ff',
        width: '40px',
        textAlign: 'right',
    },
    gripSection: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderTop: '1px solid rgba(255,255,255,0.1)',
    },
    gripLabel: {
        fontSize: '0.65rem',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: '0.5px',
    },
    gripRing: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    gripValue: {
        position: 'absolute',
        fontSize: '0.85rem',
        fontWeight: 700,
        color: '#fff',
    },
}
