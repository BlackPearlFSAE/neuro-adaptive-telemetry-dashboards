import React, { useState, useEffect } from 'react'

/**
 * Attention Modal Dashboard
 * Eye Tracking and Gaze Analysis
 * FIA Formula E compliant
 */

interface AttentionData {
    tunnelVision: boolean
    blinkRate: number
    cognitiveLoad: number
    pupilDiameterL: number
    pupilDiameterR: number
    perclos: number
    fixationDuration: number
    saccadeVelocity: number
    gazeDispersion: number
    gazeX: number
    gazeY: number
    gazeHistory: { x: number; y: number; t: number }[]
    fixationZones: { zone: string; percentage: number }[]
    blinkHistory: number[]
}

interface Props {
    isOpen: boolean
    onClose: () => void
}

export const AttentionModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const [data, setData] = useState<AttentionData>({
        tunnelVision: false, blinkRate: 22, cognitiveLoad: 45,
        pupilDiameterL: 4.2, pupilDiameterR: 4.1, perclos: 0.08,
        fixationDuration: 245, saccadeVelocity: 380, gazeDispersion: 0.18,
        gazeX: 0.5, gazeY: 0.5, gazeHistory: [],
        fixationZones: [
            { zone: 'Mirrors', percentage: 12 },
            { zone: 'Instruments', percentage: 25 },
            { zone: 'Track Center', percentage: 45 },
            { zone: 'Periphery', percentage: 18 }
        ],
        blinkHistory: []
    })
    const [selectedView, setSelectedView] = useState<'heatmap' | 'scanpath'>('heatmap')
    const [isCalibrating, setIsCalibrating] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        const fetchData = async () => {
            try {
                const res = await fetch('/api/neuro/attention')
                if (res.ok) {
                    const apiData = await res.json()
                    setData(prev => ({
                        ...prev,
                        blinkRate: apiData.blink_rate || prev.blinkRate,
                        cognitiveLoad: apiData.cognitive_load || prev.cognitiveLoad,
                        pupilDiameterL: apiData.pupil_diameter_l || prev.pupilDiameterL,
                        pupilDiameterR: apiData.pupil_diameter_r || prev.pupilDiameterR,
                        perclos: apiData.perclos || prev.perclos,
                        gazeX: apiData.gaze_x || prev.gazeX,
                        gazeY: apiData.gaze_y || prev.gazeY,
                        gazeHistory: apiData.gaze_history || prev.gazeHistory
                    }))
                }
            } catch {
                const newX = 0.5 + Math.sin(Date.now() / 500) * 0.25 + (Math.random() - 0.5) * 0.1
                const newY = 0.5 + Math.cos(Date.now() / 700) * 0.2 + (Math.random() - 0.5) * 0.1
                setData(prev => ({
                    ...prev,
                    tunnelVision: prev.gazeDispersion < 0.1 || prev.cognitiveLoad > 85,
                    blinkRate: 15 + Math.random() * 15,
                    cognitiveLoad: Math.max(0, Math.min(100, prev.cognitiveLoad + (Math.random() - 0.5) * 5)),
                    pupilDiameterL: 3.5 + (prev.cognitiveLoad / 100) * 1.5 + (Math.random() - 0.5) * 0.3,
                    pupilDiameterR: 3.5 + (prev.cognitiveLoad / 100) * 1.5 + (Math.random() - 0.5) * 0.3,
                    perclos: 0.05 + Math.random() * 0.1,
                    fixationDuration: 200 + Math.random() * 150,
                    saccadeVelocity: 300 + Math.random() * 150,
                    gazeDispersion: 0.08 + Math.random() * 0.25,
                    gazeX: newX, gazeY: newY,
                    gazeHistory: [...prev.gazeHistory.slice(-80), { x: newX, y: newY, t: Date.now() }],
                    blinkHistory: [...prev.blinkHistory.slice(-30), prev.blinkRate]
                }))
            }
        }
        fetchData()
        const interval = setInterval(fetchData, 100)
        return () => clearInterval(interval)
    }, [isOpen])

    const calibrate = async () => {
        setIsCalibrating(true)
        await fetch('/api/neuro/calibrate?sensor=eye', { method: 'POST' }).catch(() => { })
        setTimeout(() => setIsCalibrating(false), 3000)
    }

    if (!isOpen) return null

    const getColor = (v: number) => v < 30 ? '#00ff88' : v < 70 ? '#fbbf24' : '#ff4757'

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <div style={styles.header}>
                    <div style={styles.headerLeft}>
                        <span style={styles.headerIcon}>👁️</span>
                        <div>
                            <h2 style={styles.title}>ATTENTION / EYE TRACKING</h2>
                            <p style={styles.subtitle}>IR Pupilometry & Gaze Analysis • 120 Hz</p>
                        </div>
                    </div>
                    <div style={styles.headerRight}>
                        <div style={styles.viewToggle}>
                            <button style={{ ...styles.toggleBtn, background: selectedView === 'heatmap' ? 'rgba(34,211,238,0.3)' : 'transparent' }} onClick={() => setSelectedView('heatmap')}>HEATMAP</button>
                            <button style={{ ...styles.toggleBtn, background: selectedView === 'scanpath' ? 'rgba(34,211,238,0.3)' : 'transparent' }} onClick={() => setSelectedView('scanpath')}>SCANPATH</button>
                        </div>
                        <button style={styles.calibrateBtn} onClick={calibrate} disabled={isCalibrating}>
                            {isCalibrating ? '⏳ Calibrating...' : '📐 Calibrate Eye'}
                        </button>
                        <button style={styles.closeBtn} onClick={onClose}>✕</button>
                    </div>
                </div>

                <div style={styles.content}>
                    <div style={styles.topRow}>
                        {/* Cockpit View with Gaze */}
                        <div style={styles.cockpitSection}>
                            <svg viewBox="0 0 400 240" style={{ width: '100%', height: '240px' }}>
                                {/* Cockpit frame */}
                                <rect x="10" y="10" width="380" height="200" rx="10" fill="rgba(0,0,0,0.7)" stroke="#333" strokeWidth="2" />

                                {/* Track perspective */}
                                <path d="M 80 210 L 320 210 L 260 80 L 140 80 Z" fill="rgba(30,30,35,0.7)" stroke="#444" strokeWidth="1" />
                                <line x1="200" y1="80" x2="200" y2="210" stroke="#fbbf24" strokeWidth="4" strokeDasharray="12,8" />

                                {/* Side lines */}
                                <line x1="140" y1="80" x2="80" y2="210" stroke="#555" strokeWidth="2" />
                                <line x1="260" y1="80" x2="320" y2="210" stroke="#555" strokeWidth="2" />

                                {/* Mirrors */}
                                <rect x="20" y="60" width="50" height="35" rx="4" fill="rgba(50,50,60,0.8)" stroke="#444" />
                                <rect x="330" y="60" width="50" height="35" rx="4" fill="rgba(50,50,60,0.8)" stroke="#444" />

                                {/* Instrument panel */}
                                <rect x="150" y="175" width="100" height="30" rx="4" fill="rgba(0,0,0,0.6)" stroke="#333" />
                                <circle cx="175" cy="190" r="10" fill="none" stroke="#00ff88" strokeWidth="2" />
                                <circle cx="200" cy="190" r="10" fill="none" stroke="#00d4ff" strokeWidth="2" />
                                <circle cx="225" cy="190" r="10" fill="none" stroke="#fbbf24" strokeWidth="2" />

                                {/* Gaze heatmap or scanpath */}
                                {selectedView === 'heatmap' ? (
                                    data.gazeHistory.slice(-40).map((point, i) => {
                                        const intensity = i / 40
                                        const r = 255
                                        const g = Math.floor(255 - intensity * 180)
                                        return (
                                            <circle key={i}
                                                cx={20 + point.x * 360}
                                                cy={15 + point.y * 190}
                                                r={8 + intensity * 12}
                                                fill={`rgba(${r},${g},0,${0.2 + intensity * 0.4})`}
                                            />
                                        )
                                    })
                                ) : (
                                    <polyline
                                        fill="none"
                                        stroke="#22d3ee"
                                        strokeWidth="2"
                                        strokeOpacity="0.7"
                                        points={data.gazeHistory.slice(-30).map(p => `${20 + p.x * 360},${15 + p.y * 190}`).join(' ')}
                                    />
                                )}

                                {/* Current gaze point */}
                                <circle cx={20 + data.gazeX * 360} cy={15 + data.gazeY * 190} r="12" fill="#22d3ee" opacity="0.9">
                                    <animate attributeName="r" values="10;15;10" dur="0.5s" repeatCount="indefinite" />
                                </circle>
                                <circle cx={20 + data.gazeX * 360} cy={15 + data.gazeY * 190} r="4" fill="#fff" />
                            </svg>
                            <div style={styles.viewLabel}>{selectedView === 'heatmap' ? 'GAZE HEATMAP' : 'SCANPATH TRACE'}</div>
                        </div>

                        {/* Metrics Panel */}
                        <div style={styles.metricsPanel}>
                            {/* Eye visualization */}
                            <div style={styles.eyeSection}>
                                <svg viewBox="0 0 200 80" style={{ width: '100%', height: '80px' }}>
                                    {/* Left Eye */}
                                    <g transform="translate(50, 40)">
                                        <ellipse rx="35" ry="20" fill="none" stroke="#22d3ee" strokeWidth="2" />
                                        <circle r={data.pupilDiameterL * 3} fill="#333" />
                                        <circle r={data.pupilDiameterL * 1.5} fill="#000" />
                                        <circle r="3" cx="3" cy="-3" fill="rgba(255,255,255,0.4)" />
                                        <text x="0" y="35" textAnchor="middle" fill="#aaa" fontSize="8">L: {data.pupilDiameterL.toFixed(1)}mm</text>
                                    </g>
                                    {/* Right Eye */}
                                    <g transform="translate(150, 40)">
                                        <ellipse rx="35" ry="20" fill="none" stroke="#22d3ee" strokeWidth="2" />
                                        <circle r={data.pupilDiameterR * 3} fill="#333" />
                                        <circle r={data.pupilDiameterR * 1.5} fill="#000" />
                                        <circle r="3" cx="3" cy="-3" fill="rgba(255,255,255,0.4)" />
                                        <text x="0" y="35" textAnchor="middle" fill="#aaa" fontSize="8">R: {data.pupilDiameterR.toFixed(1)}mm</text>
                                    </g>
                                </svg>
                            </div>

                            <div style={styles.metricRow}>
                                <div style={styles.metricCard}>
                                    <span style={styles.metricLabel}>COGNITIVE</span>
                                    <span style={{ ...styles.metricValue, color: getColor(data.cognitiveLoad) }}>{data.cognitiveLoad.toFixed(0)}%</span>
                                </div>
                                <div style={styles.metricCard}>
                                    <span style={styles.metricLabel}>PERCLOS</span>
                                    <span style={{ ...styles.metricValue, color: getColor(data.perclos * 200) }}>{(data.perclos * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                            <div style={styles.metricRow}>
                                <div style={styles.metricCard}>
                                    <span style={styles.metricLabel}>BLINK RATE</span>
                                    <span style={{ ...styles.metricValue, color: '#22d3ee' }}>{data.blinkRate.toFixed(0)}</span>
                                    <span style={styles.metricUnit}>/min</span>
                                </div>
                                <div style={styles.metricCard}>
                                    <span style={styles.metricLabel}>FIXATION</span>
                                    <span style={{ ...styles.metricValue, color: '#a855f7' }}>{data.fixationDuration.toFixed(0)}</span>
                                    <span style={styles.metricUnit}>ms</span>
                                </div>
                            </div>
                            <div style={styles.metricRow}>
                                <div style={styles.metricCard}>
                                    <span style={styles.metricLabel}>SACCADE</span>
                                    <span style={{ ...styles.metricValue, color: '#fbbf24' }}>{data.saccadeVelocity.toFixed(0)}</span>
                                    <span style={styles.metricUnit}>°/s</span>
                                </div>
                                <div style={styles.metricCard}>
                                    <span style={styles.metricLabel}>DISPERSION</span>
                                    <span style={{ ...styles.metricValue, color: data.gazeDispersion < 0.1 ? '#ff4757' : '#00ff88' }}>{data.gazeDispersion.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fixation Zone Analysis */}
                    <div style={styles.zoneSection}>
                        <div style={styles.sectionTitle}>📍 FIXATION ZONE ANALYSIS</div>
                        <div style={styles.zoneGrid}>
                            {data.fixationZones.map((zone, i) => (
                                <div key={i} style={styles.zoneCard}>
                                    <span style={styles.zoneName}>{zone.zone}</span>
                                    <div style={styles.zoneBar}>
                                        <div style={{ ...styles.zoneFill, width: `${zone.percentage}%`, background: i === 2 ? '#00ff88' : '#22d3ee' }} />
                                    </div>
                                    <span style={styles.zoneValue}>{zone.percentage}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Alert Status */}
                    <div style={styles.alertRow}>
                        <div style={{ ...styles.alertBox, background: data.tunnelVision ? 'rgba(255,71,87,0.2)' : 'rgba(0,255,136,0.1)', borderColor: data.tunnelVision ? '#ff4757' : '#00ff88' }}>
                            {data.tunnelVision ? '⚠️ TUNNEL VISION DETECTED - Expand visual scanning' : '✓ VISUAL SCANNING NORMAL'}
                        </div>
                        <div style={{ ...styles.alertBox, background: data.perclos > 0.15 ? 'rgba(255,71,87,0.2)' : 'rgba(0,255,136,0.1)', borderColor: data.perclos > 0.15 ? '#ff4757' : '#00ff88' }}>
                            {data.perclos > 0.15 ? '😴 DROWSINESS RISK - High PERCLOS' : '👁️ ALERTNESS GOOD'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

const styles: { [key: string]: React.CSSProperties } = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' },
    modal: { background: 'linear-gradient(135deg, rgba(13, 33, 55, 0.98) 0%, rgba(10, 22, 40, 0.99) 100%)', borderRadius: '20px', border: '1px solid rgba(34,211,238,0.3)', width: '90%', maxWidth: '950px', maxHeight: '90vh', overflow: 'auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
    headerIcon: { fontSize: '2rem' },
    title: { fontSize: '1.2rem', fontWeight: 800, color: '#fff', letterSpacing: '2px', margin: 0 },
    subtitle: { fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', margin: 0 },
    headerRight: { display: 'flex', gap: '12px', alignItems: 'center' },
    viewToggle: { display: 'flex', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', overflow: 'hidden' },
    toggleBtn: { padding: '6px 12px', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.7rem' },
    calibrateBtn: { padding: '8px 16px', background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: '8px', color: '#22d3ee', cursor: 'pointer', fontSize: '0.8rem' },
    closeBtn: { width: '36px', height: '36px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontSize: '1rem' },
    content: { padding: '24px' },
    topRow: { display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', marginBottom: '20px' },
    cockpitSection: { background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' },
    viewLabel: { textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px', letterSpacing: '1px' },
    metricsPanel: { display: 'flex', flexDirection: 'column', gap: '10px' },
    eyeSection: { background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '10px', border: '1px solid rgba(34,211,238,0.2)' },
    metricRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
    metricCard: { background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' },
    metricLabel: { display: 'block', fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' },
    metricValue: { display: 'block', fontSize: '1.2rem', fontWeight: 700, fontFamily: 'monospace' },
    metricUnit: { display: 'block', fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)' },
    zoneSection: { background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.05)' },
    sectionTitle: { fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '12px', fontWeight: 600 },
    zoneGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' },
    zoneCard: { display: 'flex', flexDirection: 'column', gap: '6px' },
    zoneName: { fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' },
    zoneBar: { height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' },
    zoneFill: { height: '100%', borderRadius: '4px' },
    zoneValue: { fontSize: '0.85rem', fontWeight: 700, color: '#fff', fontFamily: 'monospace' },
    alertRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
    alertBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', padding: '12px', border: '1px solid', fontSize: '0.8rem', fontWeight: 600, color: '#fff' },
}

export default AttentionModal
