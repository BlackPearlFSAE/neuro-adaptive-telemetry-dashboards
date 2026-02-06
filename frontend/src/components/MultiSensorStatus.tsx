import React, { useState, useEffect, useRef } from 'react'

/**
 * Enhanced NATS Sensor Suite with Advanced Waveform Visualization
 * Displays real-time waveforms for ECG, EEG, Eye tracking, GSR, and SpO2
 */

interface FusedData {
    heart: { bpm: number; connected: boolean }
    eeg: { focus: number; connected: boolean }
    eye: { drowsiness: number; connected: boolean }
    vitals: { stress: number; connected: boolean }
}

interface SensorConfig {
    id: string
    name: string
    type: string
    icon: string
    color: string
    connected: boolean
    simMode: boolean
    battery: number
    signalQuality: number
    lastUpdate: number
}

interface WaveformData {
    ecg: number[]
    eeg: number[]
    gsr: number[]
    pupil: number[]
    spo2: number[]
}

interface Props {
    onDataUpdate?: (data: FusedData) => void
}

export const MultiSensorStatus: React.FC<Props> = ({ onDataUpdate }) => {
    const [data, setData] = useState<FusedData | null>(null)
    const [activeTab, setActiveTab] = useState<'overview' | 'devices' | 'config' | 'waveforms'>('overview')
    const [expanded, setExpanded] = useState(false)
    const [waveforms, setWaveforms] = useState<WaveformData>({
        ecg: [], eeg: [], gsr: [], pupil: [], spo2: []
    })

    const [sensors, setSensors] = useState<SensorConfig[]>([
        { id: 'polar', name: 'Polar H10', type: 'ECG/HRV', icon: '💓', color: '#ff6b6b', connected: false, simMode: true, battery: 85, signalQuality: 92, lastUpdate: Date.now() },
        { id: 'muse', name: 'Muse 2', type: 'EEG', icon: '🧠', color: '#a855f7', connected: false, simMode: true, battery: 72, signalQuality: 88, lastUpdate: Date.now() },
        { id: 'pupil', name: 'Pupil Labs', type: 'Eye Tracking', icon: '👁️', color: '#22d3ee', connected: false, simMode: true, battery: 90, signalQuality: 95, lastUpdate: Date.now() },
        { id: 'shimmer', name: 'Shimmer3', type: 'GSR/Vitals', icon: '⚡', color: '#fbbf24', connected: false, simMode: true, battery: 68, signalQuality: 85, lastUpdate: Date.now() },
        { id: 'nonin', name: 'Nonin 3150', type: 'SpO2/Temp', icon: '🫁', color: '#4ade80', connected: false, simMode: true, battery: 95, signalQuality: 98, lastUpdate: Date.now() },
    ])

    // Generate realistic waveform data
    useEffect(() => {
        const generateWaveforms = () => {
            setWaveforms(prev => {
                const maxPoints = 100

                // ECG waveform - realistic PQRST pattern
                const ecgPoint = generateECGPoint(prev.ecg.length)
                const newEcg = [...prev.ecg.slice(-maxPoints + 1), ecgPoint]

                // EEG waveform - alpha waves with noise
                const eegPoint = Math.sin(Date.now() / 100) * 0.5 +
                    Math.sin(Date.now() / 50) * 0.3 +
                    (Math.random() - 0.5) * 0.4
                const newEeg = [...prev.eeg.slice(-maxPoints + 1), eegPoint]

                // GSR waveform - slow varying with spikes
                const gsrBase = 0.5 + Math.sin(Date.now() / 2000) * 0.3
                const gsrPoint = gsrBase + (Math.random() > 0.95 ? 0.3 : 0)
                const newGsr = [...prev.gsr.slice(-maxPoints + 1), gsrPoint]

                // Pupil size variation
                const pupilPoint = 0.5 + Math.sin(Date.now() / 500) * 0.2 + (Math.random() - 0.5) * 0.1
                const newPupil = [...prev.pupil.slice(-maxPoints + 1), pupilPoint]

                // SpO2 - relatively stable with slight variation
                const spo2Point = 0.97 + Math.sin(Date.now() / 1000) * 0.02 + (Math.random() - 0.5) * 0.01
                const newSpo2 = [...prev.spo2.slice(-maxPoints + 1), spo2Point]

                return { ecg: newEcg, eeg: newEeg, gsr: newGsr, pupil: newPupil, spo2: newSpo2 }
            })
        }

        const interval = setInterval(generateWaveforms, 50)
        return () => clearInterval(interval)
    }, [])

    // Generate realistic ECG point
    const generateECGPoint = (index: number): number => {
        const cycle = index % 60
        if (cycle < 5) return 0.1 * Math.sin(cycle / 5 * Math.PI)  // P wave
        if (cycle < 8) return 0  // PR segment
        if (cycle < 10) return -0.2 + (cycle - 8) * 0.1  // Q wave
        if (cycle < 13) return -0.2 + (cycle - 8) * 0.4  // R wave up
        if (cycle < 16) return 1.0 - (cycle - 13) * 0.5  // R wave down
        if (cycle < 18) return -0.3 + (cycle - 16) * 0.15  // S wave
        if (cycle < 25) return 0  // ST segment
        if (cycle < 35) return 0.2 * Math.sin((cycle - 25) / 10 * Math.PI)  // T wave
        return 0
    }

    useEffect(() => {
        const fetchFused = async () => {
            try {
                const res = await fetch('/api/biosignals/fused')
                if (res.ok) {
                    const json = await res.json()
                    setData(json)
                    onDataUpdate?.(json)
                    setSensors(prev => prev.map(s => ({
                        ...s,
                        connected: s.id === 'polar' ? json.heart.connected :
                            s.id === 'muse' ? json.eeg.connected :
                                s.id === 'pupil' ? json.eye.connected :
                                    s.id === 'shimmer' ? json.vitals.connected : s.connected,
                        lastUpdate: Date.now(),
                        signalQuality: 80 + Math.random() * 20
                    })))
                }
            } catch { }
        }
        fetchFused()
        const interval = setInterval(fetchFused, 1000)
        return () => clearInterval(interval)
    }, [onDataUpdate])

    if (!data) return null

    const activeSensors = sensors.filter(s => s.connected || s.simMode).length
    const systemHealth = (activeSensors / sensors.length) * 100

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header} onClick={() => setExpanded(!expanded)}>
                <div style={styles.headerLeft}>
                    <div style={{ ...styles.healthRing, borderColor: systemHealth === 100 ? '#00ff88' : '#fbbf24' }}>
                        <span style={styles.healthPercent}>{Math.round(systemHealth)}</span>
                    </div>
                    <div style={styles.titleSection}>
                        <span style={styles.title}>NATS SENSOR SUITE</span>
                        <span style={styles.subtitle}>{activeSensors}/{sensors.length} Active • {systemHealth === 100 ? 'All Systems Go' : 'Partial Coverage'}</span>
                    </div>
                </div>
                <div style={styles.headerRight}>
                    {sensors.slice(0, 4).map(s => (
                        <div key={s.id} style={{ ...styles.miniSensor, borderColor: s.connected ? s.color : 'rgba(255,255,255,0.2)' }}>
                            <span style={styles.miniIcon}>{s.icon}</span>
                            <span style={{ ...styles.miniStatus, color: s.connected ? '#00ff88' : s.simMode ? '#fbbf24' : '#ff4757' }}>
                                {s.connected ? '●' : s.simMode ? '○' : '✕'}
                            </span>
                        </div>
                    ))}
                    <span style={styles.expandIcon}>{expanded ? '▲' : '▼'}</span>
                </div>
            </div>

            {expanded && (
                <div style={styles.expandedPanel}>
                    {/* Tab Navigation */}
                    <div style={styles.tabNav}>
                        <button style={{ ...styles.tab, ...(activeTab === 'overview' ? styles.tabActive : {}) }} onClick={() => setActiveTab('overview')}>📊 Overview</button>
                        <button style={{ ...styles.tab, ...(activeTab === 'waveforms' ? styles.tabActive : {}) }} onClick={() => setActiveTab('waveforms')}>📈 Waveforms</button>
                        <button style={{ ...styles.tab, ...(activeTab === 'devices' ? styles.tabActive : {}) }} onClick={() => setActiveTab('devices')}>📡 Devices</button>
                        <button style={{ ...styles.tab, ...(activeTab === 'config' ? styles.tabActive : {}) }} onClick={() => setActiveTab('config')}>⚙️ Config</button>
                    </div>

                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div style={styles.tabContent}>
                            <div style={styles.sensorGrid}>
                                {sensors.map(s => (
                                    <SensorCard key={s.id} sensor={s} data={data} waveforms={waveforms} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Advanced Waveforms Tab */}
                    {activeTab === 'waveforms' && (
                        <div style={styles.tabContent}>
                            <div style={styles.waveformContainer}>
                                <WaveformPanel
                                    title="ECG - Polar H10"
                                    data={waveforms.ecg}
                                    color="#ff6b6b"
                                    unit="mV"
                                    min={-0.5}
                                    max={1.2}
                                />
                                <WaveformPanel
                                    title="EEG Alpha - Muse 2"
                                    data={waveforms.eeg}
                                    color="#a855f7"
                                    unit="μV"
                                    min={-1}
                                    max={1}
                                />
                                <WaveformPanel
                                    title="GSR - Shimmer3"
                                    data={waveforms.gsr}
                                    color="#fbbf24"
                                    unit="μS"
                                    min={0}
                                    max={1}
                                />
                                <WaveformPanel
                                    title="Pupil Size - Pupil Labs"
                                    data={waveforms.pupil}
                                    color="#22d3ee"
                                    unit="mm"
                                    min={0}
                                    max={1}
                                />
                                <WaveformPanel
                                    title="SpO2 - Nonin 3150"
                                    data={waveforms.spo2}
                                    color="#4ade80"
                                    unit="%"
                                    min={0.9}
                                    max={1}
                                />
                            </div>
                        </div>
                    )}

                    {/* Devices Tab */}
                    {activeTab === 'devices' && (
                        <div style={styles.tabContent}>
                            <div style={styles.deviceList}>
                                {sensors.map(s => <DeviceRow key={s.id} sensor={s} />)}
                            </div>
                            <button style={styles.scanBtn}>🔍 Scan for New Devices</button>
                        </div>
                    )}

                    {/* Config Tab */}
                    {activeTab === 'config' && (
                        <div style={styles.tabContent}>
                            <div style={styles.configSection}>
                                <h4 style={styles.configTitle}>Sampling Rates</h4>
                                <ConfigSlider label="ECG" value={250} unit="Hz" />
                                <ConfigSlider label="EEG" value={256} unit="Hz" />
                                <ConfigSlider label="Eye" value={120} unit="Hz" />
                            </div>
                            <div style={styles.configSection}>
                                <h4 style={styles.configTitle}>Alert Thresholds</h4>
                                <ConfigSlider label="HR Max" value={180} unit="BPM" />
                                <ConfigSlider label="Stress" value={70} unit="%" />
                                <ConfigSlider label="Drowsy" value={50} unit="%" />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// Waveform Panel Component with Visual Enhancements
const WaveformPanel = ({ title, data, color, unit, min, max }: {
    title: string; data: number[]; color: string; unit: string; min: number; max: number
}) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [width, setWidth] = useState(400)
    const height = 120 // Increased height for better detail
    const padding = 20

    useEffect(() => {
        if (containerRef.current) {
            setWidth(containerRef.current.clientWidth)
        }
    }, [])

    // Generate SVG path from data
    const getPath = (smooth = false) => {
        if (data.length < 2) return ''
        const range = max - min
        const xStep = (width - padding * 2) / (data.length - 1)

        // Basic Line
        if (!smooth) {
            return data.map((val, i) => {
                const x = padding + i * xStep
                const y = height - padding - ((val - min) / range) * (height - padding * 2)
                return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
            }).join(' ')
        }

        // Area Path
        const line = data.map((val, i) => {
            const x = padding + i * xStep
            const y = height - padding - ((val - min) / range) * (height - padding * 2)
            return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
        }).join(' ')

        return `${line} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`
    }

    const currentValue = data.length > 0 ? data[data.length - 1] : 0
    const minValue = Math.min(...data)
    const maxValue = Math.max(...data)

    return (
        <div style={styles.waveformPanel} ref={containerRef}>
            <div style={styles.waveformHeader}>
                <div style={styles.headerTitleGroup}>
                    <span style={{ ...styles.waveformTitle, borderLeft: `3px solid ${color}` }}>{title}</span>
                    <span style={styles.liveBadge}>LIVE</span>
                </div>
                <div style={styles.valueGroup}>
                    <span style={{ ...styles.waveformValue, color, textShadow: `0 0 10px ${color}40` }}>
                        {(currentValue).toFixed(2)} <span style={styles.unit}>{unit}</span>
                    </span>
                </div>
            </div>

            <div style={styles.statsRow}>
                <span style={styles.statLabel}>MIN: <span style={styles.statValue}>{minValue.toFixed(2)}</span></span>
                <span style={styles.statLabel}>MAX: <span style={styles.statValue}>{maxValue.toFixed(2)}</span></span>
            </div>

            <svg width="100%" height={height} style={styles.waveformSvg}>
                <defs>
                    <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    </pattern>
                </defs>

                {/* Background Grid */}
                <rect x={padding} y={padding} width={width - padding * 2} height={height - padding * 2} fill="url(#grid)" />

                {/* Axes */}
                <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" />
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" />

                {/* Area Fill */}
                <path
                    d={getPath(true)}
                    fill={`url(#grad-${title})`}
                />

                {/* Main Line */}
                <path
                    d={getPath()}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter={`drop-shadow(0 0 4px ${color})`}
                />

                {/* Peak Indicator (Current) */}
                <circle
                    cx={padding + (data.length - 1) * ((width - padding * 2) / (data.length - 1))}
                    cy={height - padding - ((currentValue - min) / (max - min)) * (height - padding * 2)}
                    r="3"
                    fill="#fff"
                />
            </svg>
        </div>
    )
}

// Enhanced Sensor Card with mini waveform
const SensorCard = ({ sensor, data, waveforms }: { sensor: SensorConfig; data: FusedData; waveforms: WaveformData }) => {
    const getValue = () => {
        switch (sensor.id) {
            case 'polar': return `${data.heart.bpm} BPM`
            case 'muse': return `${(data.eeg.focus * 100).toFixed(0)}% Focus`
            case 'pupil': return data.eye.drowsiness < 0.3 ? 'Alert' : 'Drowsy'
            case 'shimmer': return `${(data.vitals.stress * 100).toFixed(0)}% Stress`
            default: return 'N/A'
        }
    }

    const getWaveformData = (): number[] => {
        switch (sensor.id) {
            case 'polar': return waveforms.ecg.slice(-30)
            case 'muse': return waveforms.eeg.slice(-30)
            case 'shimmer': return waveforms.gsr.slice(-30)
            case 'pupil': return waveforms.pupil.slice(-30)
            case 'nonin': return waveforms.spo2.slice(-30)
            default: return []
        }
    }

    const waveData = getWaveformData()
    const miniPath = waveData.length > 1 ?
        waveData.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * 4} ${20 - v * 15}`).join(' ') : ''

    return (
        <div style={{ ...styles.sensorCard, borderColor: sensor.color + '40' }}>
            <div style={styles.cardHeader}>
                <span style={styles.cardIcon}>{sensor.icon}</span>
                <div style={{
                    ...styles.statusBadge,
                    background: sensor.connected ? 'rgba(0,255,136,0.2)' : 'rgba(255,165,2,0.2)',
                    color: sensor.connected ? '#00ff88' : '#ffa502'
                }}>
                    {sensor.connected ? 'LIVE' : 'SIM'}
                </div>
            </div>
            <div style={styles.cardName}>{sensor.name}</div>
            <div style={styles.cardType}>{sensor.type}</div>

            {/* Mini Waveform */}
            <svg width="100%" height="25" style={styles.miniWaveform}>
                <path d={miniPath} fill="none" stroke={sensor.color} strokeWidth="1.5" opacity="0.8" />
            </svg>

            <div style={{ ...styles.cardValue, color: sensor.color }}>{getValue()}</div>
            <div style={styles.cardMeta}>
                <span>🔋 {sensor.battery}%</span>
                <span>📶 {sensor.signalQuality.toFixed(0)}%</span>
            </div>
        </div>
    )
}

// Device Row Component
const DeviceRow = ({ sensor }: { sensor: SensorConfig }) => (
    <div style={styles.deviceRow}>
        <div style={styles.deviceLeft}>
            <span style={styles.deviceIcon}>{sensor.icon}</span>
            <div>
                <div style={styles.deviceName}>{sensor.name}</div>
                <div style={styles.deviceType}>{sensor.type}</div>
            </div>
        </div>
        <div style={styles.deviceRight}>
            <span style={{ ...styles.deviceStatus, color: sensor.connected ? '#00ff88' : '#ffa502' }}>
                {sensor.connected ? '● Connected' : '○ Simulating'}
            </span>
            <button style={styles.deviceBtn}>{sensor.connected ? 'Disconnect' : 'Connect'}</button>
        </div>
    </div>
)

// Config Slider Component
const ConfigSlider = ({ label, value, unit }: { label: string; value: number; unit: string }) => (
    <div style={styles.configRow}>
        <span style={styles.configLabel}>{label}</span>
        <input type="range" min="0" max="300" value={value} style={styles.slider} readOnly />
        <span style={styles.configValue}>{value} {unit}</span>
    </div>
)

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        background: 'linear-gradient(135deg, rgba(13, 33, 55, 0.95) 0%, rgba(10, 22, 40, 0.98) 100%)',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        borderRadius: '12px',
        overflow: 'hidden',
    },
    header: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', cursor: 'pointer', transition: 'background 0.2s',
    },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
    healthRing: {
        width: '40px', height: '40px', borderRadius: '50%',
        border: '3px solid', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.3)',
    },
    healthPercent: { fontSize: '0.8rem', fontWeight: 700, color: '#fff' },
    titleSection: { display: 'flex', flexDirection: 'column', gap: '2px' },
    title: { fontSize: '0.9rem', fontWeight: 700, color: '#fff', letterSpacing: '1px' },
    subtitle: { fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' },
    headerRight: { display: 'flex', alignItems: 'center', gap: '8px' },
    miniSensor: {
        width: '32px', height: '32px', borderRadius: '8px',
        border: '1px solid', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)',
    },
    miniIcon: { fontSize: '0.8rem' },
    miniStatus: { fontSize: '0.5rem' },
    expandIcon: { color: 'rgba(0,212,255,0.6)', fontSize: '0.8rem', marginLeft: '8px' },
    expandedPanel: { borderTop: '1px solid rgba(0,212,255,0.1)' },
    tabNav: { display: 'flex', padding: '10px 16px', gap: '8px', background: 'rgba(0,0,0,0.2)' },
    tab: {
        padding: '8px 16px', border: 'none', borderRadius: '6px',
        background: 'transparent', color: 'rgba(255,255,255,0.5)',
        fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600,
    },
    tabActive: { background: 'rgba(0,212,255,0.2)', color: '#00d4ff' },
    tabContent: { padding: '16px' },
    sensorGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' },
    sensorCard: {
        background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '12px',
        border: '1px solid', display: 'flex', flexDirection: 'column', gap: '4px',
    },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    cardIcon: { fontSize: '1.2rem' },
    statusBadge: { fontSize: '0.55rem', padding: '2px 6px', borderRadius: '8px', fontWeight: 700 },
    cardName: { fontSize: '0.8rem', fontWeight: 600, color: '#fff' },
    cardType: { fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' },
    miniWaveform: { marginTop: '4px', marginBottom: '2px' },
    cardValue: { fontSize: '0.95rem', fontWeight: 700, fontFamily: 'monospace' },
    cardMeta: { display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' },
    waveformContainer: { display: 'flex', flexDirection: 'column', gap: '16px' },
    waveformPanel: {
        background: 'rgba(10, 22, 40, 0.6)', borderRadius: '12px', padding: '16px',
        border: '1px solid rgba(0, 212, 255, 0.15)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    },
    waveformHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' },
    headerTitleGroup: { display: 'flex', alignItems: 'center', gap: '10px' },
    waveformTitle: { fontSize: '0.9rem', fontWeight: 600, color: '#fff', paddingLeft: '10px' },
    liveBadge: {
        fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(255,0,0,0.2)',
        color: '#ff4757', borderRadius: '4px', fontWeight: 800, letterSpacing: '1px'
    },
    valueGroup: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
    waveformValue: { fontSize: '1.2rem', fontWeight: 700, fontFamily: 'monospace' },
    unit: { fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 },
    statsRow: { display: 'flex', gap: '16px', marginBottom: '8px', paddingLeft: '14px' },
    statLabel: { fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' },
    statValue: { color: 'rgba(255,255,255,0.8)' },
    waveformSvg: { width: '100%', display: 'block', borderRadius: '4px', background: 'rgba(0,0,0,0.2)' },
    deviceList: { display: 'flex', flexDirection: 'column', gap: '8px' },
    deviceRow: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '10px 12px',
    },
    deviceLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
    deviceIcon: { fontSize: '1.2rem' },
    deviceName: { fontSize: '0.85rem', fontWeight: 600, color: '#fff' },
    deviceType: { fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' },
    deviceRight: { display: 'flex', alignItems: 'center', gap: '12px' },
    deviceStatus: { fontSize: '0.7rem', fontWeight: 600 },
    deviceBtn: {
        padding: '6px 12px', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '6px',
        background: 'rgba(0,212,255,0.1)', color: '#00d4ff', fontSize: '0.7rem', cursor: 'pointer',
    },
    scanBtn: {
        width: '100%', marginTop: '12px', padding: '10px', border: 'none', borderRadius: '8px',
        background: 'linear-gradient(135deg, #00d4ff, #00ff88)', color: '#0a1628',
        fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
    },
    configSection: { marginBottom: '16px' },
    configTitle: { fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '10px', fontWeight: 600 },
    configRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' },
    configLabel: { width: '70px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' },
    slider: { flex: 1, accentColor: '#00d4ff' },
    configValue: { width: '70px', textAlign: 'right', fontSize: '0.75rem', color: '#00d4ff', fontFamily: 'monospace' },
}
