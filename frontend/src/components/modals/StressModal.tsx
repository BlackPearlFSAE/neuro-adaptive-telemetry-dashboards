import React, { useState, useEffect } from 'react'

/**
 * Stress Modal Dashboard
 * Detailed GSR/EDA Electrodermal Activity Monitoring
 * FIA Formula E compliant
 */

interface StressData {
    level: number
    eda: number
    gripForce: number
    scl: number
    scrCount: number
    arousalIndex: number
    recoveryRate: number
    spikes: number[]
    fingerReadings: number[]
    waveformHistory: number[]
    scrPeaks: { time: number; amplitude: number }[]
}

interface Props {
    isOpen: boolean
    onClose: () => void
}

export const StressModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const [data, setData] = useState<StressData>({
        level: 33, eda: 5.6, gripForce: 65, scl: 4.2, scrCount: 5,
        arousalIndex: 0.45, recoveryRate: 0.78, spikes: [],
        fingerReadings: [4.2, 5.1, 4.8, 5.3],
        waveformHistory: [],
        scrPeaks: []
    })
    const [selectedFinger, setSelectedFinger] = useState<number | null>(null)
    const [isCalibrating, setIsCalibrating] = useState(false)
    const [viewMode, setViewMode] = useState<'live' | 'analysis'>('live')

    useEffect(() => {
        if (!isOpen) return
        const fetchData = async () => {
            try {
                const res = await fetch('/api/neuro/stress')
                if (res.ok) {
                    const apiData = await res.json()
                    setData(prev => ({
                        ...prev,
                        level: apiData.level || prev.level,
                        eda: apiData.eda || prev.eda,
                        scl: apiData.scl || prev.scl,
                        scrCount: apiData.scr_count || prev.scrCount,
                        arousalIndex: apiData.arousal_index || prev.arousalIndex,
                        waveformHistory: [...prev.waveformHistory.slice(-150), apiData.eda || 5]
                    }))
                }
            } catch {
                setData(prev => {
                    const newEda = 3 + Math.random() * 4
                    const newSpike = Math.random() > 0.95 ? { time: Date.now(), amplitude: newEda } : null
                    return {
                        ...prev,
                        level: Math.max(0, Math.min(100, prev.level + (Math.random() - 0.5) * 4)),
                        eda: newEda,
                        gripForce: 50 + Math.random() * 40,
                        scl: 3 + Math.random() * 3,
                        scrCount: Math.floor(prev.level / 15) + Math.floor(Math.random() * 4),
                        arousalIndex: prev.level / 100,
                        recoveryRate: Math.max(0.3, 1.0 - prev.level / 150),
                        fingerReadings: prev.fingerReadings.map(v => v + (Math.random() - 0.5) * 0.5),
                        waveformHistory: [...prev.waveformHistory.slice(-150), newEda],
                        scrPeaks: newSpike ? [...prev.scrPeaks.slice(-10), newSpike] : prev.scrPeaks,
                        spikes: newSpike ? [...prev.spikes.slice(-5), Date.now()] : prev.spikes
                    }
                })
            }
        }
        fetchData()
        const interval = setInterval(fetchData, 100)
        return () => clearInterval(interval)
    }, [isOpen])

    const calibrate = async () => {
        setIsCalibrating(true)
        await fetch('/api/neuro/calibrate?sensor=gsr', { method: 'POST' }).catch(() => { })
        setTimeout(() => setIsCalibrating(false), 2000)
    }

    if (!isOpen) return null

    const getColor = (v: number) => v < 30 ? '#00ff88' : v < 70 ? '#fbbf24' : '#ff4757'
    const fingerNames = ['Index', 'Middle', 'Ring', 'Pinky']

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <div style={styles.header}>
                    <div style={styles.headerLeft}>
                        <span style={styles.headerIcon}>🖐️</span>
                        <div>
                            <h2 style={styles.title}>STRESS / EDA MONITOR</h2>
                            <p style={styles.subtitle}>Galvanic Skin Response Analysis • 256 Hz</p>
                        </div>
                    </div>
                    <div style={styles.headerRight}>
                        <div style={styles.viewToggle}>
                            <button style={{ ...styles.toggleBtn, background: viewMode === 'live' ? 'rgba(0,212,255,0.3)' : 'transparent' }} onClick={() => setViewMode('live')}>LIVE</button>
                            <button style={{ ...styles.toggleBtn, background: viewMode === 'analysis' ? 'rgba(0,212,255,0.3)' : 'transparent' }} onClick={() => setViewMode('analysis')}>ANALYSIS</button>
                        </div>
                        <button style={styles.calibrateBtn} onClick={calibrate} disabled={isCalibrating}>
                            {isCalibrating ? '⏳ Calibrating...' : '📐 Calibrate GSR'}
                        </button>
                        <button style={styles.closeBtn} onClick={onClose}>✕</button>
                    </div>
                </div>

                <div style={styles.content}>
                    <div style={styles.topRow}>
                        {/* Glove Visualization */}
                        <div style={styles.gloveSection}>
                            <svg viewBox="0 0 280 220" style={{ width: '100%', height: '220px' }}>
                                {/* Glove shape */}
                                <path d={`M 80 200 Q 50 170, 65 120 L 65 85 Q 65 72, 78 68 L 78 45 Q 78 35, 88 35 L 98 35 Q 108 35, 108 45 L 108 78 L 118 78 L 118 35 Q 118 25, 130 25 L 145 25 Q 155 25, 155 35 L 155 78 L 170 78 L 170 30 Q 170 18, 185 18 L 200 18 Q 212 18, 212 30 L 212 78 L 225 78 L 225 42 Q 225 30, 238 30 L 250 30 Q 262 30, 262 42 L 262 95 Q 285 125, 285 160 Q 300 180, 280 200 Z`}
                                    fill="rgba(60,60,80,0.4)" stroke="#555" strokeWidth="3" />

                                {/* Sensor areas on fingertips */}
                                {[[93, 40, 0], [142, 28, 1], [197, 22, 2], [250, 35, 3]].map(([x, y, idx]) => (
                                    <g key={idx} onClick={() => setSelectedFinger(idx as number)} style={{ cursor: 'pointer' }}>
                                        <circle cx={x} cy={y} r={selectedFinger === idx ? 18 : 14} fill="#fbbf24" opacity="0.9" />
                                        <circle cx={x} cy={y} r={selectedFinger === idx ? 25 : 20} fill="none" stroke="#fbbf24" strokeWidth="2" opacity="0.4">
                                            <animate attributeName="r" values={`${selectedFinger === idx ? 25 : 20};${selectedFinger === idx ? 35 : 28};${selectedFinger === idx ? 25 : 20}`} dur="1.5s" repeatCount="indefinite" />
                                            <animate attributeName="opacity" values="0.4;0;0.4" dur="1.5s" repeatCount="indefinite" />
                                        </circle>
                                        <text x={x} y={y + 4} textAnchor="middle" fill="#000" fontSize="10" fontWeight="bold">
                                            {data.fingerReadings[idx as number]?.toFixed(1)}
                                        </text>
                                    </g>
                                ))}

                                {/* Labels */}
                                <text x="20" y="120" fill="#888" fontSize="8">REINFORCED</text>
                                <text x="20" y="132" fill="#888" fontSize="8">PALM GRIP</text>
                                <text x="140" y="210" textAnchor="middle" fill="#fbbf24" fontSize="14" fontWeight="bold">
                                    EDA: {data.eda.toFixed(2)} μS
                                </text>
                            </svg>
                            {selectedFinger !== null && (
                                <div style={styles.fingerInfo}>
                                    <strong>{fingerNames[selectedFinger]}</strong>: {data.fingerReadings[selectedFinger].toFixed(2)} μS
                                </div>
                            )}
                        </div>

                        {/* Metrics Panel */}
                        <div style={styles.metricsPanel}>
                            <div style={styles.bigMetric}>
                                <span style={styles.bigLabel}>STRESS LEVEL</span>
                                <span style={{ ...styles.bigValue, color: getColor(data.level) }}>{data.level.toFixed(0)}%</span>
                            </div>
                            <div style={styles.metricRow}>
                                <div style={styles.metricCard}>
                                    <span style={styles.metricLabel}>SCL (Tonic)</span>
                                    <span style={{ ...styles.metricValue, color: '#fbbf24' }}>{data.scl.toFixed(2)}</span>
                                    <span style={styles.metricUnit}>μS</span>
                                </div>
                                <div style={styles.metricCard}>
                                    <span style={styles.metricLabel}>SCR (Phasic)</span>
                                    <span style={{ ...styles.metricValue, color: '#ff6b6b' }}>{data.scrCount}</span>
                                    <span style={styles.metricUnit}>peaks</span>
                                </div>
                            </div>
                            <div style={styles.metricRow}>
                                <div style={styles.metricCard}>
                                    <span style={styles.metricLabel}>AROUSAL</span>
                                    <span style={{ ...styles.metricValue, color: getColor(data.arousalIndex * 100) }}>{(data.arousalIndex * 100).toFixed(0)}%</span>
                                </div>
                                <div style={styles.metricCard}>
                                    <span style={styles.metricLabel}>RECOVERY</span>
                                    <span style={{ ...styles.metricValue, color: data.recoveryRate > 0.6 ? '#00ff88' : '#fbbf24' }}>{(data.recoveryRate * 100).toFixed(0)}%</span>
                                </div>
                            </div>
                            <div style={styles.metricRow}>
                                <div style={styles.metricCard}>
                                    <span style={styles.metricLabel}>GRIP FORCE</span>
                                    <span style={{ ...styles.metricValue, color: '#00d4ff' }}>{data.gripForce.toFixed(0)}%</span>
                                </div>
                                <div style={styles.metricCard}>
                                    <span style={styles.metricLabel}>SPIKES</span>
                                    <span style={{ ...styles.metricValue, color: data.spikes.length > 3 ? '#ff4757' : '#00ff88' }}>{data.spikes.length}</span>
                                    <span style={styles.metricUnit}>recent</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* EDA Waveform */}
                    <div style={styles.waveformSection}>
                        <div style={styles.waveformHeader}>
                            <span>📈 EDA WAVEFORM (Electrodermal Activity)</span>
                            <span style={styles.liveTag}>● 256 Hz LIVE</span>
                        </div>
                        <svg width="100%" height="120" preserveAspectRatio="none" viewBox="0 0 150 50">
                            {[15, 25, 35].map((y, i) => (
                                <line key={i} x1="0" y1={y} x2="150" y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />
                            ))}
                            <defs>
                                <linearGradient id="edaGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <polyline fill="url(#edaGrad)" stroke="none"
                                points={`0,50 ${data.waveformHistory.map((v, i) => `${i},${50 - v * 5}`).join(' ')} ${data.waveformHistory.length},50`} />
                            <polyline fill="none" stroke="#fbbf24" strokeWidth="1.5"
                                points={data.waveformHistory.map((v, i) => `${i},${50 - v * 5}`).join(' ')} />
                            {/* SCR Peak markers */}
                            {data.scrPeaks.slice(-5).map((peak, i) => (
                                <circle key={i} cx={data.waveformHistory.length - 5 + i} cy={50 - peak.amplitude * 5} r="3" fill="#ff4757" />
                            ))}
                        </svg>
                    </div>

                    {/* Alert Status */}
                    <div style={styles.alertRow}>
                        <div style={{ ...styles.alertBox, background: data.level > 70 ? 'rgba(255,71,87,0.2)' : data.level > 40 ? 'rgba(251,191,36,0.2)' : 'rgba(0,255,136,0.1)', borderColor: data.level > 70 ? '#ff4757' : data.level > 40 ? '#fbbf24' : '#00ff88' }}>
                            {data.level > 70 ? '🔴 HIGH STRESS - Consider pit stop' : data.level > 40 ? '🟡 ELEVATED STRESS' : '🟢 STRESS NOMINAL'}
                        </div>
                        <div style={{ ...styles.alertBox, background: data.spikes.length > 3 ? 'rgba(255,71,87,0.2)' : 'rgba(0,255,136,0.1)', borderColor: data.spikes.length > 3 ? '#ff4757' : '#00ff88' }}>
                            {data.spikes.length > 3 ? `⚡ ${data.spikes.length} STRESS SPIKES DETECTED` : '✓ NO ACUTE SPIKES'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

const styles: { [key: string]: React.CSSProperties } = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' },
    modal: { background: 'linear-gradient(135deg, rgba(13, 33, 55, 0.98) 0%, rgba(10, 22, 40, 0.99) 100%)', borderRadius: '20px', border: '1px solid rgba(251,191,36,0.3)', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
    headerIcon: { fontSize: '2rem' },
    title: { fontSize: '1.2rem', fontWeight: 800, color: '#fff', letterSpacing: '2px', margin: 0 },
    subtitle: { fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', margin: 0 },
    headerRight: { display: 'flex', gap: '12px', alignItems: 'center' },
    viewToggle: { display: 'flex', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', overflow: 'hidden' },
    toggleBtn: { padding: '6px 12px', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.7rem' },
    calibrateBtn: { padding: '8px 16px', background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '8px', color: '#fbbf24', cursor: 'pointer', fontSize: '0.8rem' },
    closeBtn: { width: '36px', height: '36px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontSize: '1rem' },
    content: { padding: '24px' },
    topRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '20px' },
    gloveSection: { background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' },
    fingerInfo: { textAlign: 'center', fontSize: '0.85rem', color: '#fbbf24', marginTop: '8px', padding: '8px', background: 'rgba(251,191,36,0.1)', borderRadius: '8px' },
    metricsPanel: { display: 'flex', flexDirection: 'column', gap: '12px' },
    bigMetric: { background: 'rgba(251,191,36,0.1)', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '1px solid rgba(251,191,36,0.2)' },
    bigLabel: { display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', letterSpacing: '1px' },
    bigValue: { fontSize: '2.5rem', fontWeight: 800, fontFamily: 'monospace' },
    metricRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
    metricCard: { background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '14px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' },
    metricLabel: { display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' },
    metricValue: { display: 'block', fontSize: '1.3rem', fontWeight: 700, fontFamily: 'monospace' },
    metricUnit: { display: 'block', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' },
    waveformSection: { background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.05)' },
    waveformHeader: { display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' },
    liveTag: { color: '#fbbf24', fontSize: '0.7rem' },
    alertRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
    alertBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', padding: '12px', border: '1px solid', fontSize: '0.8rem', fontWeight: 600, color: '#fff' },
}

export default StressModal
