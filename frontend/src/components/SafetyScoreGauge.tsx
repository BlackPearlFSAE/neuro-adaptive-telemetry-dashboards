import React, { useState, useEffect } from 'react'

interface SafetyData {
    score: number
    level: 'optimal' | 'caution' | 'warning' | 'critical'
    confidence: number
    components: {
        cardiac: number
        cognitive: number
        visual: number
        stress: number
    }
    intervention: {
        required: boolean
        actions: string[]
    }
    prediction: {
        score_3s: number
        trend: 'rising' | 'falling' | 'stable'
    }
}

export const SafetyScoreGauge: React.FC = () => {
    const [data, setData] = useState<SafetyData | null>(null)

    useEffect(() => {
        const fetchSafety = async () => {
            try {
                const res = await fetch('/api/safety')
                if (res.ok) {
                    setData(await res.json())
                }
            } catch { }
        }

        fetchSafety()
        const interval = setInterval(fetchSafety, 500)
        return () => clearInterval(interval)
    }, [])

    if (!data) return null

    const getColor = (level: string) => {
        switch (level) {
            case 'optimal': return '#00ff88'
            case 'caution': return '#ffa502'
            case 'warning': return '#ff6b6b'
            case 'critical': return '#ff4757'
            default: return '#00d4ff'
        }
    }

    const color = getColor(data.level)
    const circumference = 2 * Math.PI * 80
    const progress = (data.score / 100) * circumference

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span style={styles.title}>SAFETY AI</span>
                <span style={{ ...styles.levelBadge, background: color + '30', color }}>
                    {data.level.toUpperCase()}
                </span>
            </div>

            {/* Main Gauge */}
            <div style={styles.gaugeWrapper}>
                <svg width="200" height="200" viewBox="0 0 200 200">
                    {/* Background circle */}
                    <circle
                        cx="100" cy="100" r="80"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="12"
                    />
                    {/* Progress arc */}
                    <circle
                        cx="100" cy="100" r="80"
                        fill="none"
                        stroke={color}
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference - progress}
                        transform="rotate(-90 100 100)"
                        style={{
                            transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease',
                            filter: `drop-shadow(0 0 10px ${color})`
                        }}
                    />
                    {/* Center text */}
                    <text x="100" y="90" textAnchor="middle" fill="#fff" fontSize="48" fontWeight="700">
                        {Math.round(data.score)}
                    </text>
                    <text x="100" y="115" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="14">
                        SAFETY SCORE
                    </text>
                </svg>

                {/* Trend indicator */}
                <div style={{ ...styles.trend, color }}>
                    {data.prediction.trend === 'rising' ? '↑' : data.prediction.trend === 'falling' ? '↓' : '→'}
                    <span style={styles.trendValue}>{data.prediction.score_3s} in 3s</span>
                </div>
            </div>

            {/* Component Bars */}
            <div style={styles.components}>
                <ComponentBar label="Cardiac" value={data.components.cardiac} />
                <ComponentBar label="Cognitive" value={data.components.cognitive} />
                <ComponentBar label="Visual" value={data.components.visual} />
                <ComponentBar label="Stress" value={data.components.stress} />
            </div>

            {/* Intervention Warning */}
            {data.intervention.required && (
                <div style={styles.alert}>
                    <span style={styles.alertIcon}>⚠️</span>
                    <div style={styles.alertContent}>
                        <div style={styles.alertTitle}>INTERVENTION REQUIRED</div>
                        {data.intervention.actions.map((action, i) => (
                            <div key={i} style={styles.alertAction}>• {action}</div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

const ComponentBar = ({ label, value }: { label: string; value: number }) => {
    const getBarColor = (v: number) => v >= 80 ? '#00ff88' : v >= 60 ? '#ffa502' : '#ff4757'
    const color = getBarColor(value)

    return (
        <div style={styles.barRow}>
            <div style={styles.labelGroup}>
                <span style={styles.barLabel}>{label}</span>
                <span style={styles.barValue}>{Math.round(value)}</span>
            </div>
            <div style={styles.barTrack}>
                <div style={{
                    ...styles.barFill,
                    width: `${value}%`,
                    background: `linear-gradient(90deg, ${color}40, ${color})`,
                    boxShadow: `0 0 10px ${color}40`
                }} />
            </div>
        </div>
    )
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        background: 'rgba(13, 33, 55, 0.9)',
        borderRadius: '16px',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        padding: '20px',
        backdropFilter: 'blur(10px)',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
    },
    title: {
        fontSize: '0.85rem',
        fontWeight: 700,
        color: 'rgba(255,255,255,0.8)',
        letterSpacing: '2px',
    },
    levelBadge: {
        fontSize: '0.7rem',
        padding: '4px 10px',
        borderRadius: '12px',
        fontWeight: 600,
    },
    gaugeWrapper: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '20px',
        position: 'relative',
    },
    trendContainer: {
        position: 'absolute',
        bottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(0,0,0,0.4)',
        padding: '4px 12px',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.1)',
    },
    trendArrow: { fontSize: '0.8rem' },
    predictionText: { display: 'flex', alignItems: 'baseline' },
    components: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    barRow: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    labelGroup: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.7rem',
        color: 'rgba(255,255,255,0.7)',
        fontWeight: 600,
    },
    barLabel: {},
    barValue: { color: '#fff', fontFamily: 'monospace' },
    barTrack: {
        height: '6px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '3px',
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: '3px',
        transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    alert: {
        marginTop: '15px',
        padding: '12px',
        background: 'rgba(255, 71, 87, 0.15)',
        border: '1px solid rgba(255, 71, 87, 0.4)',
        borderRadius: '8px',
        display: 'flex',
        gap: '12px',
    },
    alertIcon: {
        fontSize: '1.5rem',
    },
    alertContent: {
        flex: 1,
    },
    alertTitle: {
        fontSize: '0.8rem',
        fontWeight: 700,
        color: '#ff4757',
        marginBottom: '4px',
    },
    alertAction: {
        fontSize: '0.75rem',
        color: 'rgba(255,255,255,0.7)',
    },
}
