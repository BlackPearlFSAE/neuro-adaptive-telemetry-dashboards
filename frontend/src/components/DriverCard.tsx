import React, { useState, useEffect } from 'react'
import { DriverData } from '../types/telemetry'

interface DriverCardProps {
    driver: DriverData
}

export const DriverCard: React.FC<DriverCardProps> = ({ driver }) => {
    const [heartBeat, setHeartBeat] = useState(false)

    // Heartbeat animation synced to HR
    useEffect(() => {
        const interval = 60000 / driver.heartRate // ms per beat
        const timer = setInterval(() => {
            setHeartBeat(true)
            setTimeout(() => setHeartBeat(false), 150)
        }, Math.max(interval, 400))
        return () => clearInterval(timer)
    }, [driver.heartRate])

    const getStressColor = (stress: number) => {
        if (stress < 0.3) return '#00ff88'
        if (stress < 0.6) return '#fbbf24'
        return '#ff4757'
    }

    const getZoneColor = (hr: number) => {
        if (hr < 100) return '#22d3ee' // Recovery
        if (hr < 140) return '#4ade80' // Aerobic
        if (hr < 160) return '#fbbf24' // Threshold
        return '#ff4757' // Max
    }

    const getZoneName = (hr: number) => {
        if (hr < 100) return 'RECOVERY'
        if (hr < 140) return 'AEROBIC'
        if (hr < 160) return 'THRESHOLD'
        return 'MAXIMUM'
    }

    return (
        <div style={styles.card}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.avatar}>
                    <svg width="50" height="50" viewBox="0 0 50 50">
                        <circle cx="25" cy="25" r="24" fill="none" stroke="rgba(0,212,255,0.3)" strokeWidth="2" />
                        <ellipse cx="25" cy="18" rx="8" ry="9" fill="rgba(0, 212, 255, 0.6)" />
                        <path d="M11 45C11 36 17 29 25 29C33 29 39 36 39 45" stroke="rgba(0, 212, 255, 0.6)" strokeWidth="4" strokeLinecap="round" />
                        {/* Helmet visor */}
                        <rect x="17" y="12" width="16" height="6" rx="3" fill="#0a1628" />
                        <rect x="19" y="13.5" width="12" height="3" rx="1.5" fill="#00d4ff" />
                    </svg>
                </div>
                <div style={styles.driverInfo}>
                    <div style={styles.nameRow}>
                        <span style={styles.name}>{driver.name}</span>
                        <span style={styles.teamBadge}>BLACK PEARL</span>
                    </div>
                    <div style={styles.modeRow}>
                        <span style={styles.modeDot}>◉</span>
                        <span style={styles.mode}>{driver.mode}</span>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div style={styles.metricsGrid}>
                {/* Heart Rate with Animation */}
                <div style={{
                    ...styles.metricCard,
                    borderColor: getZoneColor(driver.heartRate) + '40'
                }}>
                    <div style={styles.metricHeader}>
                        <span style={{
                            ...styles.heartIcon,
                            transform: heartBeat ? 'scale(1.3)' : 'scale(1)',
                            color: getZoneColor(driver.heartRate)
                        }}>💓</span>
                        <span style={styles.metricLabel}>HEART RATE</span>
                    </div>
                    <div style={styles.metricValueRow}>
                        <span style={{ ...styles.metricValue, color: getZoneColor(driver.heartRate) }}>
                            {driver.heartRate}
                        </span>
                        <span style={styles.metricUnit}>BPM</span>
                    </div>
                    <div style={{ ...styles.zoneTag, background: getZoneColor(driver.heartRate) + '20', color: getZoneColor(driver.heartRate) }}>
                        {getZoneName(driver.heartRate)} ZONE
                    </div>
                </div>

                {/* Stress Index */}
                <div style={{
                    ...styles.metricCard,
                    borderColor: getStressColor(driver.stress) + '40'
                }}>
                    <div style={styles.metricHeader}>
                        <span style={styles.metricIcon}>⚡</span>
                        <span style={styles.metricLabel}>STRESS INDEX</span>
                    </div>
                    <div style={styles.metricValueRow}>
                        <span style={{ ...styles.metricValue, color: getStressColor(driver.stress) }}>
                            {(driver.stress * 100).toFixed(0)}
                        </span>
                        <span style={styles.metricUnit}>%</span>
                    </div>
                    <div style={styles.stressBar}>
                        <div style={{
                            ...styles.stressFill,
                            width: `${driver.stress * 100}%`,
                            background: getStressColor(driver.stress)
                        }} />
                    </div>
                </div>
            </div>

            {/* Quick Stats Row */}
            <div style={styles.statsRow}>
                <div style={styles.statItem}>
                    <span style={styles.statValue}>LAP 12</span>
                    <span style={styles.statLabel}>Current</span>
                </div>
                <div style={styles.statDivider} />
                <div style={styles.statItem}>
                    <span style={styles.statValue}>P3</span>
                    <span style={styles.statLabel}>Position</span>
                </div>
                <div style={styles.statDivider} />
                <div style={styles.statItem}>
                    <span style={styles.statValue}>+2.4s</span>
                    <span style={styles.statLabel}>Gap</span>
                </div>
            </div>
        </div>
    )
}

const styles: { [key: string]: React.CSSProperties } = {
    card: {
        background: 'linear-gradient(135deg, rgba(13, 33, 55, 0.95) 0%, rgba(10, 22, 40, 0.98) 100%)',
        backdropFilter: 'blur(20px)',
        borderRadius: '16px',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        padding: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '20px',
    },
    avatar: {
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(0, 255, 199, 0.1))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid rgba(0, 212, 255, 0.3)',
    },
    driverInfo: {
        flex: 1,
    },
    nameRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '4px',
    },
    name: {
        fontSize: '1.2rem',
        fontWeight: 700,
        color: '#fff',
    },
    teamBadge: {
        fontSize: '0.6rem',
        padding: '3px 8px',
        background: 'linear-gradient(135deg, #00d4ff, #00ffc7)',
        color: '#0a1628',
        borderRadius: '10px',
        fontWeight: 700,
        letterSpacing: '0.5px',
    },
    modeRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    modeDot: {
        color: '#00ff88',
        fontSize: '0.7rem',
        animation: 'pulse 2s infinite',
    },
    mode: {
        fontSize: '0.8rem',
        color: 'rgba(255, 255, 255, 0.5)',
        textTransform: 'uppercase',
    },
    metricsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        marginBottom: '16px',
    },
    metricCard: {
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '12px',
        border: '1px solid',
        padding: '14px',
    },
    metricHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '6px',
    },
    heartIcon: {
        fontSize: '1rem',
        transition: 'transform 0.15s ease',
    },
    metricIcon: {
        fontSize: '1rem',
    },
    metricLabel: {
        fontSize: '0.65rem',
        color: 'rgba(255,255,255,0.5)',
        fontWeight: 600,
        letterSpacing: '0.5px',
    },
    metricValueRow: {
        display: 'flex',
        alignItems: 'baseline',
        gap: '4px',
    },
    metricValue: {
        fontSize: '1.8rem',
        fontWeight: 800,
        fontFamily: "'Roboto Mono', monospace",
    },
    metricUnit: {
        fontSize: '0.75rem',
        color: 'rgba(255,255,255,0.4)',
    },
    zoneTag: {
        marginTop: '8px',
        fontSize: '0.6rem',
        fontWeight: 700,
        padding: '4px 8px',
        borderRadius: '8px',
        textAlign: 'center',
        letterSpacing: '0.5px',
    },
    stressBar: {
        marginTop: '8px',
        height: '6px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '3px',
        overflow: 'hidden',
    },
    stressFill: {
        height: '100%',
        borderRadius: '3px',
        transition: 'width 0.5s ease',
    },
    statsRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '10px',
        padding: '12px',
    },
    statItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px',
    },
    statValue: {
        fontSize: '1rem',
        fontWeight: 700,
        color: '#00d4ff',
        fontFamily: "'Roboto Mono', monospace",
    },
    statLabel: {
        fontSize: '0.65rem',
        color: 'rgba(255,255,255,0.4)',
    },
    statDivider: {
        width: '1px',
        height: '30px',
        background: 'rgba(255,255,255,0.1)',
    },
}
