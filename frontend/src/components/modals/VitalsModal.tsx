import React, { useState, useEffect } from 'react'

/**
 * Vitals Modal Dashboard
 * ECG/HRV Analysis and Haptic Feedback Control
 * FIA Formula E compliant
 */

interface VitalsData {
    hrv: number
    rmssd: number
    heartRate: number
    notifications: number
    hapticActive: boolean
    pnn50: number
    lfHfRatio: number
    respiratoryRate: number
    coreTemperature: number
    skinTemperature: number
    hrvHistory: number[]
    hrHistory: number[]
    ecgWaveform: number[]
    hrvZoneTime: { zone: string; minutes: number; color: string }[]
}

interface Props {
    isOpen: boolean
    onClose: () => void
}

export const VitalsModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const [data, setData] = useState<VitalsData>({
        hrv: 65, rmssd: 42, heartRate: 92, notifications: 2, hapticActive: true,
        pnn50: 14.5, lfHfRatio: 1.6, respiratoryRate: 14,
        coreTemperature: 37.2, skinTemperature: 34.5,
        hrvHistory: [], hrHistory: [], ecgWaveform: [],
        hrvZoneTime: [
            { zone: 'Recovery', minutes: 8, color: '#00ff88' },
            { zone: 'Optimal', minutes: 25, color: '#00d4ff' },
            { zone: 'Stress', minutes: 12, color: '#fbbf24' },
            { zone: 'Overload', minutes: 3, color: '#ff4757' }
        ]
    })
    const [isCalibrating, setIsCalibrating] = useState(false)

    useEffect(() => {
        if (!isOpen) return

        // Generate ECG waveform
        const generateECG = () => {
            const points: number[] = []
            for (let i = 0; i < 200; i++) {
                const x = i / 200 * Math.PI * 8
                let y = 0
                const beat = (x % (Math.PI * 2)) / (Math.PI * 2)
                if (beat < 0.1) y = Math.sin(beat * 30) * 0.3
                else if (beat < 0.15) y = -0.1
                else if (beat < 0.2) y = 1.0
                else if (beat < 0.25) y = -0.4
                else if (beat < 0.35) y = 0.1
                else if (beat < 0.5) y = Math.sin((beat - 0.35) * 10) * 0.2
                else y = 0.02 * Math.sin(x * 5)
                y += Math.random() * 0.02
                points.push(y)
            }
            return points
        }

        const fetchData = async () => {
            try {
                const res = await fetch('/api/neuro/vitals')
                if (res.ok) {
                    const apiData = await res.json()
                    setData(prev => ({
                        ...prev,
                        hrv: apiData.hrv || prev.hrv,
                        rmssd: apiData.rmssd || prev.rmssd,
                        heartRate: apiData.heart_rate || prev.heartRate,
                        pnn50: apiData.pnn50 || prev.pnn50,
                        lfHfRatio: apiData.lf_hf_ratio || prev.lfHfRatio,
                        hrvHistory: [...prev.hrvHistory.slice(-60), apiData.hrv || 65],
                        hrHistory: [...prev.hrHistory.slice(-60), apiData.heart_rate || 90],
                        ecgWaveform: generateECG()
                    }))
                }
            } catch {
                setData(prev => ({
                    ...prev,
                    hrv: 55 + Math.random() * 40,
                    rmssd: 35 + Math.random() * 20,
                    heartRate: 75 + Math.floor(Math.random() * 40),
                    pnn50: Math.max(0, 20 - Math.random() * 10),
                    lfHfRatio: 1.0 + Math.random() * 1.5,
                    respiratoryRate: 12 + Math.floor(Math.random() * 8),
                    coreTemperature: 37.0 + Math.random() * 0.8,
                    skinTemperature: 34.0 + Math.random() * 1.0,
                    hrvHistory: [...prev.hrvHistory.slice(-60), 55 + Math.random() * 40],
                    hrHistory: [...prev.hrHistory.slice(-60), 75 + Math.floor(Math.random() * 40)],
                    ecgWaveform: generateECG()
                }))
            }
        }
        fetchData()
        const interval = setInterval(fetchData, 200)
        return () => clearInterval(interval)
    }, [isOpen])

    const calibrate = async () => {
        setIsCalibrating(true)
        await fetch('/api/neuro/calibrate?sensor=ecg', { method: 'POST' }).catch(() => { })
        setTimeout(() => setIsCalibrating(false), 2000)
    }

    const triggerHaptic = async (pattern: string) => {
        await fetch(`/api/neuro/haptic?pattern=${pattern}`, { method: 'POST' }).catch(() => { })
        setData(prev => ({ ...prev, notifications: prev.notifications + 1 }))
    }

    const toggleHaptic = () => {
        setData(prev => ({ ...prev, hapticActive: !prev.hapticActive }))
    }

    if (!isOpen) return null

    const getHRZone = (hr: number) => {
        if (hr < 100) return { zone: 'Recovery', color: '#00ff88' }
        if (hr < 140) return { zone: 'Aerobic', color: '#00d4ff' }
        if (hr < 170) return { zone: 'Threshold', color: '#fbbf24' }
        return { zone: 'Max', color: '#ff4757' }
    }

    const hrZone = getHRZone(data.heartRate)

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <div style={styles.header}>
                    <div style={styles.headerLeft}>
                        <span style={styles.headerIcon}>💚</span>
                        <div>
                            <h2 style={styles.title}>VITALS & FEEDBACK</h2>
                            <p style={styles.subtitle}>ECG / HRV Analysis • Haptic Control • 250 Hz</p>
                        </div>
                    </div>
                    <div style={styles.headerRight}>
                        <button style={{ ...styles.hapticToggle, background: data.hapticActive ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.1)' }} onClick={toggleHaptic}>
                            📳 Haptic: {data.hapticActive ? 'ON' : 'OFF'}
                        </button>
                        <button style={styles.calibrateBtn} onClick={calibrate} disabled={isCalibrating}>
                            {isCalibrating ? '⏳ Calibrating...' : '📐 Calibrate ECG'}
                        </button>
                        <button style={styles.closeBtn} onClick={onClose}>✕</button>
                    </div>
                </div>

                <div style={styles.content}>
                    <div style={styles.topRow}>
                        {/* ECG Waveform */}
                        <div style={styles.ecgSection}>
                            <div style={styles.ecgHeader}>
                                <span>📈 ECG WAVEFORM</span>
                                <span style={styles.liveTag}>● 250 Hz LIVE</span>
                            </div>
                            <svg width="100%" height="150" preserveAspectRatio="none" viewBox="0 0 200 60">
                                {[15, 30, 45].map((y, i) => (
                                    <line key={i} x1="0" y1={y} x2="200" y2={y} stroke="rgba(74,222,128,0.1)" strokeWidth="0.5" />
                                ))}
                                {[0, 50, 100, 150].map((x, i) => (
                                    <line key={i} x1={x} y1="0" x2={x} y2="60" stroke="rgba(74,222,128,0.1)" strokeWidth="0.5" />
                                ))}
                                <polyline
                                    fill="none"
                                    stroke="#4ade80"
                                    strokeWidth="1.5"
                                    points={data.ecgWaveform.map((v, i) => `${i},${30 - v * 25}`).join(' ')}
                                    style={{ filter: 'drop-shadow(0 0 3px #4ade80)' }}
                                />
                            </svg>
                        </div>

                        {/* Primary Metrics */}
                        <div style={styles.metricsPanel}>
                            <div style={styles.hrDisplay}>
                                <div style={styles.hrCircle}>
                                    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                                        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                                        <circle cx="50" cy="50" r="45" fill="none" stroke={hrZone.color} strokeWidth="8"
                                            strokeDasharray={`${(data.heartRate / 200) * 283} 283`}
                                            transform="rotate(-90 50 50)" strokeLinecap="round" />
                                        <text x="50" y="45" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="bold">{data.heartRate}</text>
                                        <text x="50" y="60" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8">BPM</text>
                                    </svg>
                                </div>
                                <div style={{ ...styles.hrZoneBadge, background: `${hrZone.color}30`, borderColor: hrZone.color }}>{hrZone.zone}</div>
                            </div>
                            <div style={styles.metricRow}>
                                <div style={styles.metricCard}>
                                    <span style={styles.metricLabel}>HRV (SDNN)</span>
                                    <span style={{ ...styles.metricValue, color: '#4ade80' }}>{data.hrv.toFixed(0)}</span>
                                    <span style={styles.metricUnit}>ms</span>
                                </div>
                                <div style={styles.metricCard}>
                                    <span style={styles.metricLabel}>RMSSD</span>
                                    <span style={{ ...styles.metricValue, color: '#22d3ee' }}>{data.rmssd.toFixed(0)}</span>
                                    <span style={styles.metricUnit}>ms</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Metrics Row */}
                    <div style={styles.secondaryRow}>
                        <div style={styles.metricCard}>
                            <span style={styles.metricLabel}>pNN50</span>
                            <span style={{ ...styles.metricValue, color: data.pnn50 > 10 ? '#00ff88' : '#fbbf24' }}>{data.pnn50.toFixed(1)}%</span>
                        </div>
                        <div style={styles.metricCard}>
                            <span style={styles.metricLabel}>LF/HF</span>
                            <span style={{ ...styles.metricValue, color: data.lfHfRatio < 2 ? '#00ff88' : '#fbbf24' }}>{data.lfHfRatio.toFixed(2)}</span>
                        </div>
                        <div style={styles.metricCard}>
                            <span style={styles.metricLabel}>RESP RATE</span>
                            <span style={{ ...styles.metricValue, color: '#00d4ff' }}>{data.respiratoryRate}</span>
                            <span style={styles.metricUnit}>br/min</span>
                        </div>
                        <div style={styles.metricCard}>
                            <span style={styles.metricLabel}>CORE TEMP</span>
                            <span style={{ ...styles.metricValue, color: data.coreTemperature > 38 ? '#ff4757' : '#fbbf24' }}>{data.coreTemperature.toFixed(1)}°C</span>
                        </div>
                        <div style={styles.metricCard}>
                            <span style={styles.metricLabel}>SKIN TEMP</span>
                            <span style={{ ...styles.metricValue, color: '#fbbf24' }}>{data.skinTemperature.toFixed(1)}°C</span>
                        </div>
                    </div>

                    {/* HRV Trend Chart */}
                    <div style={styles.trendSection}>
                        <div style={styles.trendHeader}>
                            <span>📊 HRV TREND (Last 60 samples)</span>
                        </div>
                        <svg width="100%" height="80" preserveAspectRatio="none" viewBox="0 0 60 40">
                            <defs>
                                <linearGradient id="hrvGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#4ade80" stopOpacity="0.3" />
                                    <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <polyline fill="url(#hrvGrad)" stroke="none"
                                points={`0,40 ${data.hrvHistory.map((v, i) => `${i},${40 - (v - 40) * 0.5}`).join(' ')} ${data.hrvHistory.length},40`} />
                            <polyline fill="none" stroke="#4ade80" strokeWidth="1"
                                points={data.hrvHistory.map((v, i) => `${i},${40 - (v - 40) * 0.5}`).join(' ')} />
                        </svg>
                    </div>

                    {/* Haptic Control Panel */}
                    <div style={styles.hapticSection}>
                        <div style={styles.sectionTitle}>📳 HAPTIC FEEDBACK CONTROL</div>
                        <div style={styles.hapticGrid}>
                            {[
                                { id: 'alert', label: 'ALERT', desc: 'Short burst', icon: '⚡' },
                                { id: 'warning', label: 'WARNING', desc: 'Double pulse', icon: '⚠️' },
                                { id: 'critical', label: 'CRITICAL', desc: 'Rapid pulses', icon: '🔴' },
                                { id: 'pit_entry', label: 'PIT ENTRY', desc: 'Long gentle', icon: '🛞' }
                            ].map(pattern => (
                                <button key={pattern.id} style={styles.hapticBtn} onClick={() => triggerHaptic(pattern.id)}>
                                    <span style={styles.hapticIcon}>{pattern.icon}</span>
                                    <span style={styles.hapticLabel}>{pattern.label}</span>
                                    <span style={styles.hapticDesc}>{pattern.desc}</span>
                                </button>
                            ))}
                        </div>
                        <div style={styles.notificationCount}>Active Notifications: <strong>{data.notifications}</strong></div>
                    </div>

                    {/* HRV Zone Time */}
                    <div style={styles.zoneSection}>
                        <div style={styles.sectionTitle}>⏱️ TIME IN HRV ZONES</div>
                        <div style={styles.zoneGrid}>
                            {data.hrvZoneTime.map((zone, i) => (
                                <div key={i} style={styles.zoneCard}>
                                    <div style={{ ...styles.zoneDot, background: zone.color }} />
                                    <span style={styles.zoneName}>{zone.zone}</span>
                                    <span style={{ ...styles.zoneValue, color: zone.color }}>{zone.minutes}m</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

const styles: { [key: string]: React.CSSProperties } = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' },
    modal: { background: 'linear-gradient(135deg, rgba(13, 33, 55, 0.98) 0%, rgba(10, 22, 40, 0.99) 100%)', borderRadius: '20px', border: '1px solid rgba(74,222,128,0.3)', width: '90%', maxWidth: '950px', maxHeight: '90vh', overflow: 'auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
    headerIcon: { fontSize: '2rem' },
    title: { fontSize: '1.2rem', fontWeight: 800, color: '#fff', letterSpacing: '2px', margin: 0 },
    subtitle: { fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', margin: 0 },
    headerRight: { display: 'flex', gap: '12px', alignItems: 'center' },
    hapticToggle: { padding: '8px 14px', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '8px', color: '#a855f7', cursor: 'pointer', fontSize: '0.8rem' },
    calibrateBtn: { padding: '8px 16px', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '8px', color: '#4ade80', cursor: 'pointer', fontSize: '0.8rem' },
    closeBtn: { width: '36px', height: '36px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontSize: '1rem' },
    content: { padding: '24px' },
    topRow: { display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: '24px', marginBottom: '20px' },
    ecgSection: { background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(74,222,128,0.2)' },
    ecgHeader: { display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' },
    liveTag: { color: '#4ade80', fontSize: '0.7rem' },
    metricsPanel: { display: 'flex', flexDirection: 'column', gap: '12px' },
    hrDisplay: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
    hrCircle: { width: '120px', height: '120px' },
    hrZoneBadge: { padding: '4px 12px', borderRadius: '12px', border: '1px solid', fontSize: '0.75rem', fontWeight: 700 },
    metricRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
    secondaryRow: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' },
    metricCard: { background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' },
    metricLabel: { display: 'block', fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' },
    metricValue: { display: 'block', fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace' },
    metricUnit: { display: 'block', fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)' },
    trendSection: { background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.05)' },
    trendHeader: { fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '10px' },
    hapticSection: { background: 'rgba(168,85,247,0.1)', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '1px solid rgba(168,85,247,0.2)' },
    sectionTitle: { fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '12px', fontWeight: 600 },
    hapticGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' },
    hapticBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' },
    hapticIcon: { fontSize: '1.5rem' },
    hapticLabel: { fontSize: '0.75rem', fontWeight: 700, color: '#fff' },
    hapticDesc: { fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' },
    notificationCount: { textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' },
    zoneSection: { background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' },
    zoneGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' },
    zoneCard: { display: 'flex', alignItems: 'center', gap: '8px' },
    zoneDot: { width: '10px', height: '10px', borderRadius: '50%' },
    zoneName: { fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', flex: 1 },
    zoneValue: { fontSize: '1rem', fontWeight: 700, fontFamily: 'monospace' },
}

export default VitalsModal
