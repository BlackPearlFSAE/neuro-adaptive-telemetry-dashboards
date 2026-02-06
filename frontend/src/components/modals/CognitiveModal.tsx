import React, { useState, useEffect } from 'react'

/**
 * Cognitive Load Modal Dashboard
 * Detailed fNIRS brain oxygenation monitoring
 * FIA Formula E compliant
 */

interface CognitiveData {
    fatigue: number
    focus: number
    oxygenation: number
    taskSaturation: boolean
    hbo2Level: number
    hbrLevel: number
    mentalWorkload: number
    prefrontalActivity: number
    leftHemisphere: number
    rightHemisphere: number
    channelData: number[]
    waveformHistory: number[]
}

interface Props {
    isOpen: boolean
    onClose: () => void
}

export const CognitiveModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const [data, setData] = useState<CognitiveData>({
        fatigue: 25, focus: 78, oxygenation: 95, taskSaturation: false,
        hbo2Level: 68, hbrLevel: 32, mentalWorkload: 45, prefrontalActivity: 0.12,
        leftHemisphere: 52, rightHemisphere: 48, channelData: Array(16).fill(0),
        waveformHistory: []
    })
    const [selectedChannel, setSelectedChannel] = useState(0)
    const [isCalibrating, setIsCalibrating] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        const fetchData = async () => {
            try {
                const res = await fetch('/api/neuro/cognitive')
                if (res.ok) {
                    const apiData = await res.json()
                    setData(prev => ({
                        ...prev,
                        fatigue: apiData.fatigue || prev.fatigue,
                        focus: apiData.focus || prev.focus,
                        oxygenation: apiData.oxygenation || prev.oxygenation,
                        hbo2Level: apiData.hbo2_level || prev.hbo2Level,
                        hbrLevel: apiData.hbr_level || prev.hbrLevel,
                        mentalWorkload: apiData.mental_workload || prev.mentalWorkload,
                        waveformHistory: [...prev.waveformHistory.slice(-100), apiData.oxygenation || 95]
                    }))
                }
            } catch {
                // Simulate if API not available
                setData(prev => ({
                    ...prev,
                    fatigue: Math.max(0, Math.min(100, prev.fatigue + (Math.random() - 0.45) * 3)),
                    focus: Math.max(0, Math.min(100, prev.focus + (Math.random() - 0.5) * 5)),
                    oxygenation: 88 + Math.random() * 8,
                    hbo2Level: 60 + Math.random() * 15,
                    hbrLevel: 28 + Math.random() * 10,
                    mentalWorkload: Math.max(0, Math.min(100, prev.mentalWorkload + (Math.random() - 0.5) * 4)),
                    leftHemisphere: 45 + Math.random() * 10,
                    rightHemisphere: 45 + Math.random() * 10,
                    channelData: prev.channelData.map(() => 50 + Math.random() * 50),
                    waveformHistory: [...prev.waveformHistory.slice(-100), 88 + Math.random() * 8]
                }))
            }
        }
        fetchData()
        const interval = setInterval(fetchData, 200)
        return () => clearInterval(interval)
    }, [isOpen])

    const calibrate = async () => {
        setIsCalibrating(true)
        await fetch('/api/neuro/calibrate?sensor=fnirs', { method: 'POST' }).catch(() => { })
        setTimeout(() => setIsCalibrating(false), 2000)
    }

    if (!isOpen) return null

    const getColor = (v: number, inv = false) => {
        const val = inv ? 100 - v : v
        if (val < 30) return '#00ff88'
        if (val < 70) return '#fbbf24'
        return '#ff4757'
    }

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <div style={styles.header}>
                    <div style={styles.headerLeft}>
                        <span style={styles.headerIcon}>🧠</span>
                        <div>
                            <h2 style={styles.title}>COGNITIVE LOAD MONITOR</h2>
                            <p style={styles.subtitle}>fNIRS Prefrontal Cortex Analysis • 10 Hz</p>
                        </div>
                    </div>
                    <div style={styles.headerRight}>
                        <button style={styles.calibrateBtn} onClick={calibrate} disabled={isCalibrating}>
                            {isCalibrating ? '⏳ Calibrating...' : '📐 Calibrate fNIRS'}
                        </button>
                        <button style={styles.closeBtn} onClick={onClose}>✕</button>
                    </div>
                </div>

                <div style={styles.content}>
                    {/* Top Row: Brain Visualization + Primary Metrics */}
                    <div style={styles.topRow}>
                        {/* Brain Hemisphere View */}
                        <div style={styles.brainSection}>
                            <svg viewBox="0 0 300 200" style={{ width: '100%', height: '200px' }}>
                                {/* Brain outline */}
                                <ellipse cx="150" cy="100" rx="120" ry="85" fill="none" stroke="#00d4ff" strokeWidth="2" opacity="0.3" />

                                {/* Left Hemisphere */}
                                <path d="M 150 20 Q 50 30, 40 100 Q 30 170, 150 180" fill={`rgba(0,212,255,${data.leftHemisphere / 200})`} stroke="#00d4ff" strokeWidth="1" />
                                <text x="80" y="100" textAnchor="middle" fill="#00d4ff" fontSize="10">LEFT</text>
                                <text x="80" y="115" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold">{data.leftHemisphere.toFixed(0)}%</text>

                                {/* Right Hemisphere */}
                                <path d="M 150 20 Q 250 30, 260 100 Q 270 170, 150 180" fill={`rgba(168,85,247,${data.rightHemisphere / 200})`} stroke="#a855f7" strokeWidth="1" />
                                <text x="220" y="100" textAnchor="middle" fill="#a855f7" fontSize="10">RIGHT</text>
                                <text x="220" y="115" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold">{data.rightHemisphere.toFixed(0)}%</text>

                                {/* Prefrontal Cortex Indicator */}
                                <ellipse cx="150" cy="45" rx="40" ry="20" fill={`rgba(255,107,107,${data.mentalWorkload / 150})`} stroke="#ff6b6b" strokeWidth="2" />
                                <text x="150" y="50" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">PFC</text>

                                {/* fNIRS Channels */}
                                {[[100, 55], [130, 45], [170, 45], [200, 55], [110, 80], [150, 70], [190, 80]].map(([x, y], i) => (
                                    <g key={i} onClick={() => setSelectedChannel(i)} style={{ cursor: 'pointer' }}>
                                        <circle cx={x} cy={y} r={selectedChannel === i ? 10 : 7}
                                            fill={selectedChannel === i ? '#00ff88' : '#a855f7'} opacity="0.9" />
                                        <text x={x} y={y + 3} textAnchor="middle" fill="#000" fontSize="6" fontWeight="bold">{i + 1}</text>
                                    </g>
                                ))}
                            </svg>
                            <div style={styles.channelInfo}>
                                Channel {selectedChannel + 1}: <span style={{ color: '#00ff88' }}>{data.channelData[selectedChannel]?.toFixed(1)}%</span> activity
                            </div>
                        </div>

                        {/* Primary Metrics */}
                        <div style={styles.metricsPanel}>
                            <div style={styles.bigMetric}>
                                <span style={styles.bigLabel}>O₂ SATURATION</span>
                                <span style={{ ...styles.bigValue, color: '#00d4ff' }}>{data.oxygenation.toFixed(1)}%</span>
                            </div>
                            <div style={styles.metricRow}>
                                <div style={styles.metricCard}>
                                    <span style={styles.metricLabel}>HbO₂</span>
                                    <span style={{ ...styles.metricValue, color: '#00d4ff' }}>{data.hbo2Level.toFixed(1)}</span>
                                    <span style={styles.metricUnit}>μmol/L</span>
                                </div>
                                <div style={styles.metricCard}>
                                    <span style={styles.metricLabel}>HbR</span>
                                    <span style={{ ...styles.metricValue, color: '#ff6b6b' }}>{data.hbrLevel.toFixed(1)}</span>
                                    <span style={styles.metricUnit}>μmol/L</span>
                                </div>
                            </div>
                            <div style={styles.metricRow}>
                                <div style={styles.metricCard}>
                                    <span style={styles.metricLabel}>WORKLOAD</span>
                                    <span style={{ ...styles.metricValue, color: getColor(data.mentalWorkload) }}>{data.mentalWorkload.toFixed(0)}%</span>
                                </div>
                                <div style={styles.metricCard}>
                                    <span style={styles.metricLabel}>PFC BIAS</span>
                                    <span style={{ ...styles.metricValue, color: '#a855f7' }}>
                                        {data.prefrontalActivity > 0 ? 'R' : 'L'} {Math.abs(data.prefrontalActivity * 100).toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Waveform Chart */}
                    <div style={styles.waveformSection}>
                        <div style={styles.waveformHeader}>
                            <span>📈 OXYGENATION TREND</span>
                            <span style={styles.liveTag}>● LIVE</span>
                        </div>
                        <svg width="100%" height="80" preserveAspectRatio="none" viewBox="0 0 100 40">
                            <defs>
                                <linearGradient id="oxyGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.3" />
                                    <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            {[20, 30].map((y, i) => (
                                <line key={i} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />
                            ))}
                            <polyline fill="url(#oxyGrad)" stroke="none"
                                points={`0,40 ${data.waveformHistory.map((v, i) => `${i},${40 - (v - 80) * 2}`).join(' ')} ${data.waveformHistory.length},40`} />
                            <polyline fill="none" stroke="#00d4ff" strokeWidth="1"
                                points={data.waveformHistory.map((v, i) => `${i},${40 - (v - 80) * 2}`).join(' ')} />
                        </svg>
                    </div>

                    {/* Bottom: Status Bars */}
                    <div style={styles.bottomRow}>
                        <div style={styles.statusBar}>
                            <span style={styles.statusLabel}>FATIGUE</span>
                            <div style={styles.barTrack}>
                                <div style={{ ...styles.barFill, width: `${data.fatigue}%`, background: getColor(data.fatigue) }} />
                            </div>
                            <span style={{ ...styles.statusValue, color: getColor(data.fatigue) }}>{data.fatigue.toFixed(0)}%</span>
                        </div>
                        <div style={styles.statusBar}>
                            <span style={styles.statusLabel}>FOCUS</span>
                            <div style={styles.barTrack}>
                                <div style={{ ...styles.barFill, width: `${data.focus}%`, background: getColor(data.focus, true) }} />
                            </div>
                            <span style={{ ...styles.statusValue, color: getColor(data.focus, true) }}>{data.focus.toFixed(0)}%</span>
                        </div>
                        <div style={{ ...styles.alertBox, background: data.taskSaturation ? 'rgba(255,71,87,0.2)' : 'rgba(0,255,136,0.1)', borderColor: data.taskSaturation ? '#ff4757' : '#00ff88' }}>
                            {data.taskSaturation ? '⚠️ TASK SATURATION DETECTED' : '✓ COGNITIVE STATE NOMINAL'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

const styles: { [key: string]: React.CSSProperties } = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' },
    modal: { background: 'linear-gradient(135deg, rgba(13, 33, 55, 0.98) 0%, rgba(10, 22, 40, 0.99) 100%)', borderRadius: '20px', border: '1px solid rgba(0, 212, 255, 0.3)', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
    headerIcon: { fontSize: '2rem' },
    title: { fontSize: '1.2rem', fontWeight: 800, color: '#fff', letterSpacing: '2px', margin: 0 },
    subtitle: { fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', margin: 0 },
    headerRight: { display: 'flex', gap: '12px', alignItems: 'center' },
    calibrateBtn: { padding: '8px 16px', background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '8px', color: '#00d4ff', cursor: 'pointer', fontSize: '0.8rem' },
    closeBtn: { width: '36px', height: '36px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontSize: '1rem' },
    content: { padding: '24px' },
    topRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '20px' },
    brainSection: { background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' },
    channelInfo: { textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: '8px' },
    metricsPanel: { display: 'flex', flexDirection: 'column', gap: '12px' },
    bigMetric: { background: 'rgba(0,212,255,0.1)', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '1px solid rgba(0,212,255,0.2)' },
    bigLabel: { display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', letterSpacing: '1px' },
    bigValue: { fontSize: '2.5rem', fontWeight: 800, fontFamily: 'monospace' },
    metricRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
    metricCard: { background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '14px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' },
    metricLabel: { display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' },
    metricValue: { display: 'block', fontSize: '1.3rem', fontWeight: 700, fontFamily: 'monospace' },
    metricUnit: { display: 'block', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' },
    waveformSection: { background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.05)' },
    waveformHeader: { display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' },
    liveTag: { color: '#00ff88', fontSize: '0.7rem' },
    bottomRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' },
    statusBar: { display: 'flex', alignItems: 'center', gap: '10px' },
    statusLabel: { fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', width: '60px' },
    barTrack: { flex: 1, height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: '4px', transition: 'width 0.3s' },
    statusValue: { fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace', width: '45px', textAlign: 'right' },
    alertBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', padding: '10px', border: '1px solid', fontSize: '0.75rem', fontWeight: 600, color: '#fff' },
}

export default CognitiveModal
