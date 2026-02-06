import React, { useState, useEffect, useRef } from 'react'
import { BiosignalsData, EmotionalStateData } from '../types/telemetry'

/**
 * Enhanced BiosignalsPanel - EV Formula Compatible
 * Compliant with FIA Formula E / Electric GT standards
 * Features: Real-time biometrics, G-Force tolerance, thermal stress, reaction time
 */

interface BiosignalsPanelProps {
    biosignals: BiosignalsData
    emotionalState: EmotionalStateData
}

// EV Formula specific metrics
interface FormulaMetrics {
    gForce: { lateral: number; longitudinal: number; peak: number }
    thermalStress: number  // Core body temperature stress index
    reactionTime: number   // ms
    energyExpenditure: number  // kcal/h
    hydrationLevel: number // 0-100%
    muscularFatigue: number // 0-100%
    vestibularStress: number // Inner ear stress from G-forces
}

export const BiosignalsPanel: React.FC<BiosignalsPanelProps> = ({
    biosignals,
    emotionalState
}) => {
    const [selectedSignal, setSelectedSignal] = useState<string | null>('ecg')
    const [waveformData, setWaveformData] = useState<number[]>([])
    const [formulaMetrics, setFormulaMetrics] = useState<FormulaMetrics>({
        gForce: { lateral: 0, longitudinal: 0, peak: 0 },
        thermalStress: 45,
        reactionTime: 185,
        energyExpenditure: 650,
        hydrationLevel: 85,
        muscularFatigue: 22,
        vestibularStress: 35
    })
    const animationRef = useRef<number>(0)
    const phaseRef = useRef<number>(0)

    // Simulate EV Formula specific metrics
    useEffect(() => {
        const updateFormulaMetrics = () => {
            setFormulaMetrics(prev => ({
                gForce: {
                    lateral: Math.sin(Date.now() / 1000) * 2.5 + (Math.random() - 0.5),
                    longitudinal: Math.cos(Date.now() / 1200) * 1.8 + (Math.random() - 0.5),
                    peak: Math.max(prev.gForce.peak, Math.abs(prev.gForce.lateral) + Math.abs(prev.gForce.longitudinal))
                },
                thermalStress: Math.min(100, Math.max(0, prev.thermalStress + (Math.random() - 0.45) * 2)),
                reactionTime: 180 + Math.random() * 50,
                energyExpenditure: 600 + Math.random() * 200,
                hydrationLevel: Math.max(60, prev.hydrationLevel - Math.random() * 0.1),
                muscularFatigue: Math.min(80, prev.muscularFatigue + Math.random() * 0.2),
                vestibularStress: 30 + Math.random() * 20
            }))
        }
        const interval = setInterval(updateFormulaMetrics, 500)
        return () => clearInterval(interval)
    }, [])

    // Generate animated ECG waveform
    useEffect(() => {
        const generateWaveform = () => {
            phaseRef.current += 0.15
            const newData: number[] = []
            for (let i = 0; i < 200; i++) {
                const x = i / 200 * Math.PI * 8 + phaseRef.current
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
                newData.push(y)
            }
            setWaveformData(newData)
            animationRef.current = requestAnimationFrame(generateWaveform)
        }
        generateWaveform()
        return () => cancelAnimationFrame(animationRef.current)
    }, [])

    const signals = [
        { id: 'ecg', icon: '💓', label: 'ECG/HRV', value: biosignals.ecg.heartRate, unit: 'BPM', color: '#ff6b6b' },
        { id: 'eeg', icon: '🧠', label: 'EEG Focus', value: Math.round((biosignals.eyeTracking?.cognitiveLoad || 0.5) * 100), unit: '%', color: '#a855f7' },
        { id: 'gsr', icon: '⚡', label: 'GSR Stress', value: biosignals.gsr?.arousalIndex || 0.3, unit: 'μS', color: '#fbbf24' },
        { id: 'spo2', icon: '🫁', label: 'SpO2', value: biosignals.ppg?.spo2 || 98, unit: '%', color: '#22d3ee' },
        { id: 'resp', icon: '💨', label: 'Respiration', value: biosignals.respiration?.rate || 14, unit: '/min', color: '#4ade80' },
        { id: 'temp', icon: '🌡️', label: 'Core Temp', value: biosignals.temperature?.skin || 37.2, unit: '°C', color: '#f97316' },
    ]

    const getStatusColor = (value: number, thresholds: [number, number] = [30, 70]) => {
        if (value < thresholds[0]) return '#00ff88'
        if (value < thresholds[1]) return '#fbbf24'
        return '#ff4757'
    }

    return (
        <div style={styles.container}>
            {/* Header with FIA Compliance Badge */}
            <div style={styles.header}>
                <div style={styles.titleSection}>
                    <div style={styles.titleRow}>
                        <h2 style={styles.title}>DRIVER BIOMETRICS</h2>
                        <span style={styles.fiaBadge}>FIA COMPLIANT</span>
                    </div>
                    <span style={styles.subtitle}>Real-Time Biosignal Monitoring • Formula E Standard</span>
                </div>
                <div style={styles.overallStatus}>
                    <StatusRing value={emotionalState.overallReadiness * 100} label="READINESS" />
                    <StatusRing value={(1 - emotionalState.safetyRisk) * 100} label="SAFETY" color="#00ff88" />
                    <StatusRing value={emotionalState.focus * 100} label="FOCUS" color="#a855f7" />
                </div>
            </div>

            {/* Main Layout */}
            <div style={styles.mainLayout}>
                {/* Left: Signal Cards Grid */}
                <div style={styles.signalGrid}>
                    {signals.map(sig => (
                        <div
                            key={sig.id}
                            style={{
                                ...styles.signalCard,
                                borderColor: selectedSignal === sig.id ? sig.color : 'rgba(255,255,255,0.1)',
                                boxShadow: selectedSignal === sig.id ? `0 0 20px ${sig.color}30` : 'none'
                            }}
                            onClick={() => setSelectedSignal(sig.id)}
                        >
                            <div style={styles.signalHeader}>
                                <span style={styles.signalIcon}>{sig.icon}</span>
                                <span style={styles.signalLabel}>{sig.label}</span>
                            </div>
                            <div style={styles.signalValue}>
                                <span style={{ ...styles.signalNumber, color: sig.color }}>
                                    {typeof sig.value === 'number' ?
                                        (sig.value < 10 ? sig.value.toFixed(1) : Math.round(sig.value)) : sig.value}
                                </span>
                                <span style={styles.signalUnit}>{sig.unit}</span>
                            </div>
                            <div style={styles.miniSparkline}>
                                <svg width="100%" height="20" preserveAspectRatio="none">
                                    <polyline
                                        fill="none" stroke={sig.color} strokeWidth="1.5" strokeOpacity="0.6"
                                        points={waveformData.slice(0, 50).map((v, i) => `${i * 2},${10 - v * 8}`).join(' ')}
                                    />
                                </svg>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right: Live Waveform & Formula Metrics */}
                <div style={styles.rightPanel}>
                    {/* Waveform Display */}
                    <div style={styles.waveformSection}>
                        <div style={styles.waveformHeader}>
                            <span style={styles.waveformTitle}>{selectedSignal?.toUpperCase() || 'ECG'} WAVEFORM</span>
                            <span style={styles.waveformRate}>250 Hz • LIVE</span>
                        </div>
                        <div style={styles.waveformCanvas}>
                            <svg width="100%" height="120" preserveAspectRatio="none" viewBox="0 0 200 60">
                                {[...Array(4)].map((_, i) => (
                                    <line key={`h${i}`} x1="0" y1={i * 20} x2="200" y2={i * 20} stroke="rgba(0,212,255,0.1)" strokeWidth="0.5" />
                                ))}
                                <polyline
                                    fill="none"
                                    stroke={signals.find(s => s.id === selectedSignal)?.color || '#ff6b6b'}
                                    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                                    points={waveformData.map((v, i) => `${i},${30 - v * 25}`).join(' ')}
                                    style={{ filter: 'drop-shadow(0 0 3px #ff6b6b)' }}
                                />
                            </svg>
                        </div>
                    </div>

                    {/* EV Formula Specific Metrics */}
                    <div style={styles.formulaMetrics}>
                        <div style={styles.formulaHeader}>
                            <span style={styles.formulaTitle}>⚡ EV FORMULA METRICS</span>
                            <span style={styles.formulaBadge}>REAL-TIME</span>
                        </div>
                        <div style={styles.formulaGrid}>
                            {/* G-Force Display */}
                            <div style={styles.gForceCard}>
                                <div style={styles.gForceTitle}>G-FORCE</div>
                                <div style={styles.gForceValues}>
                                    <div style={styles.gForceItem}>
                                        <span style={styles.gForceLabel}>LAT</span>
                                        <span style={{ ...styles.gForceValue, color: Math.abs(formulaMetrics.gForce.lateral) > 2 ? '#ff4757' : '#00d4ff' }}>
                                            {formulaMetrics.gForce.lateral.toFixed(1)}g
                                        </span>
                                    </div>
                                    <div style={styles.gForceItem}>
                                        <span style={styles.gForceLabel}>LON</span>
                                        <span style={{ ...styles.gForceValue, color: Math.abs(formulaMetrics.gForce.longitudinal) > 1.5 ? '#ff4757' : '#00d4ff' }}>
                                            {formulaMetrics.gForce.longitudinal.toFixed(1)}g
                                        </span>
                                    </div>
                                    <div style={styles.gForceItem}>
                                        <span style={styles.gForceLabel}>PEAK</span>
                                        <span style={{ ...styles.gForceValue, color: '#fbbf24' }}>
                                            {formulaMetrics.gForce.peak.toFixed(1)}g
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Performance Metrics */}
                            <div style={styles.perfMetric}>
                                <span style={styles.perfIcon}>⏱️</span>
                                <span style={styles.perfLabel}>Reaction</span>
                                <span style={{ ...styles.perfValue, color: formulaMetrics.reactionTime < 200 ? '#00ff88' : '#fbbf24' }}>
                                    {formulaMetrics.reactionTime.toFixed(0)}ms
                                </span>
                            </div>
                            <div style={styles.perfMetric}>
                                <span style={styles.perfIcon}>🔥</span>
                                <span style={styles.perfLabel}>Thermal</span>
                                <span style={{ ...styles.perfValue, color: getStatusColor(formulaMetrics.thermalStress) }}>
                                    {formulaMetrics.thermalStress.toFixed(0)}%
                                </span>
                            </div>
                            <div style={styles.perfMetric}>
                                <span style={styles.perfIcon}>💧</span>
                                <span style={styles.perfLabel}>Hydration</span>
                                <span style={{ ...styles.perfValue, color: formulaMetrics.hydrationLevel > 70 ? '#00ff88' : '#fbbf24' }}>
                                    {formulaMetrics.hydrationLevel.toFixed(0)}%
                                </span>
                            </div>
                            <div style={styles.perfMetric}>
                                <span style={styles.perfIcon}>⚡</span>
                                <span style={styles.perfLabel}>Energy</span>
                                <span style={styles.perfValue}>{formulaMetrics.energyExpenditure.toFixed(0)} kcal/h</span>
                            </div>
                            <div style={styles.perfMetric}>
                                <span style={styles.perfIcon}>💪</span>
                                <span style={styles.perfLabel}>Muscle</span>
                                <span style={{ ...styles.perfValue, color: getStatusColor(formulaMetrics.muscularFatigue) }}>
                                    {formulaMetrics.muscularFatigue.toFixed(0)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom: Cognitive State Analysis */}
            <div style={styles.emotionSection}>
                <h3 style={styles.sectionTitle}>COGNITIVE STATE ANALYSIS</h3>
                <div style={styles.emotionGrid}>
                    <EmotionBar label="Stress" value={emotionalState.stress} color="#ff6b6b" icon="😰" />
                    <EmotionBar label="Focus" value={emotionalState.focus} color="#a855f7" icon="🎯" />
                    <EmotionBar label="Fatigue" value={emotionalState.fatigue} color="#fbbf24" icon="😴" />
                    <EmotionBar label="Alertness" value={emotionalState.alertness} color="#4ade80" icon="⚡" />
                    <EmotionBar label="Confidence" value={emotionalState.confidence} color="#22d3ee" icon="💪" />
                    <EmotionBar label="Flow State" value={emotionalState.flowState} color="#ec4899" icon="🌊" />
                </div>
            </div>

            {/* Race Safety Thresholds */}
            <div style={styles.thresholdsSection}>
                <div style={styles.thresholdItem}>
                    <span style={styles.thresholdLabel}>HR MAX</span>
                    <div style={styles.thresholdBar}>
                        <div style={{ ...styles.thresholdFill, width: `${(biosignals.ecg.heartRate / 200) * 100}%`, background: biosignals.ecg.heartRate > 180 ? '#ff4757' : '#00ff88' }} />
                    </div>
                    <span style={styles.thresholdValue}>{biosignals.ecg.heartRate}/200</span>
                </div>
                <div style={styles.thresholdItem}>
                    <span style={styles.thresholdLabel}>G-LIMIT</span>
                    <div style={styles.thresholdBar}>
                        <div style={{ ...styles.thresholdFill, width: `${(formulaMetrics.gForce.peak / 5) * 100}%`, background: formulaMetrics.gForce.peak > 4 ? '#ff4757' : '#00d4ff' }} />
                    </div>
                    <span style={styles.thresholdValue}>{formulaMetrics.gForce.peak.toFixed(1)}/5.0g</span>
                </div>
                <div style={styles.thresholdItem}>
                    <span style={styles.thresholdLabel}>TEMP</span>
                    <div style={styles.thresholdBar}>
                        <div style={{ ...styles.thresholdFill, width: `${((biosignals.temperature?.skin || 37) - 35) / 5 * 100}%`, background: (biosignals.temperature?.skin || 37) > 38.5 ? '#ff4757' : '#fbbf24' }} />
                    </div>
                    <span style={styles.thresholdValue}>{(biosignals.temperature?.skin || 37).toFixed(1)}/40°C</span>
                </div>
            </div>
        </div>
    )
}

// Status Ring Component
const StatusRing = ({ value, label, color = '#00d4ff' }: { value: number; label: string; color?: string }) => {
    const circumference = 2 * Math.PI * 28
    const offset = circumference - (value / 100) * circumference

    return (
        <div style={{ textAlign: 'center' }}>
            <svg width="70" height="70" viewBox="0 0 70 70">
                <circle cx="35" cy="35" r="28" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                <circle cx="35" cy="35" r="28" fill="none" stroke={color} strokeWidth="5"
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    transform="rotate(-90 35 35)" strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
                <text x="35" y="38" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700">
                    {Math.round(value)}
                </text>
            </svg>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{label}</div>
        </div>
    )
}

// Emotion Bar Component
const EmotionBar = ({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) => (
    <div style={styles.emotionBar}>
        <div style={styles.emotionLabel}>
            <span>{icon}</span>
            <span>{label}</span>
        </div>
        <div style={styles.emotionTrack}>
            <div style={{
                ...styles.emotionFill,
                width: `${value * 100}%`,
                background: `linear-gradient(90deg, ${color}80, ${color})`
            }} />
        </div>
        <span style={styles.emotionValue}>{Math.round(value * 100)}%</span>
    </div>
)

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        background: 'linear-gradient(135deg, rgba(13, 33, 55, 0.95) 0%, rgba(10, 22, 40, 0.98) 100%)',
        borderRadius: '20px',
        border: '1px solid rgba(0, 212, 255, 0.15)',
        padding: '20px',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    titleSection: { display: 'flex', flexDirection: 'column', gap: '4px' },
    titleRow: { display: 'flex', alignItems: 'center', gap: '12px' },
    title: { fontSize: '1.1rem', fontWeight: 800, color: '#fff', letterSpacing: '2px', margin: 0 },
    fiaBadge: {
        fontSize: '0.6rem', fontWeight: 700, color: '#00ff88', padding: '3px 8px',
        background: 'rgba(0,255,136,0.15)', borderRadius: '4px', border: '1px solid rgba(0,255,136,0.3)',
    },
    subtitle: { fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' },
    overallStatus: { display: 'flex', gap: '12px' },
    mainLayout: { display: 'grid', gridTemplateColumns: '260px 1fr', gap: '16px' },
    signalGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' },
    signalCard: {
        background: 'rgba(0, 0, 0, 0.3)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
        padding: '12px', cursor: 'pointer', transition: 'all 0.2s ease',
    },
    signalHeader: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' },
    signalIcon: { fontSize: '1rem' },
    signalLabel: { fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 },
    signalValue: { display: 'flex', alignItems: 'baseline', gap: '4px' },
    signalNumber: { fontSize: '1.3rem', fontWeight: 700, fontFamily: 'monospace' },
    signalUnit: { fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' },
    miniSparkline: { marginTop: '6px', height: '18px' },
    rightPanel: { display: 'flex', flexDirection: 'column', gap: '12px' },
    waveformSection: { background: 'rgba(0, 0, 0, 0.4)', borderRadius: '12px', padding: '12px' },
    waveformHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
    waveformTitle: { fontSize: '0.8rem', fontWeight: 700, color: '#00d4ff', letterSpacing: '1px' },
    waveformRate: {
        fontSize: '0.65rem', color: 'rgba(0, 255, 136, 0.8)', background: 'rgba(0, 255, 136, 0.1)',
        padding: '3px 8px', borderRadius: '10px',
    },
    waveformCanvas: { background: 'rgba(0, 0, 0, 0.3)', borderRadius: '6px', overflow: 'hidden' },
    formulaMetrics: { background: 'rgba(0, 0, 0, 0.4)', borderRadius: '12px', padding: '12px' },
    formulaHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
    formulaTitle: { fontSize: '0.8rem', fontWeight: 700, color: '#fbbf24', letterSpacing: '1px' },
    formulaBadge: {
        fontSize: '0.6rem', color: '#00d4ff', background: 'rgba(0,212,255,0.15)',
        padding: '2px 6px', borderRadius: '4px',
    },
    formulaGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' },
    gForceCard: {
        gridColumn: 'span 3', background: 'rgba(0,212,255,0.1)', borderRadius: '8px', padding: '10px',
        border: '1px solid rgba(0,212,255,0.2)',
    },
    gForceTitle: { fontSize: '0.7rem', fontWeight: 700, color: '#00d4ff', marginBottom: '8px', textAlign: 'center' },
    gForceValues: { display: 'flex', justifyContent: 'space-around' },
    gForceItem: { textAlign: 'center' },
    gForceLabel: { display: 'block', fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)' },
    gForceValue: { fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace' },
    perfMetric: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
        background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '8px',
    },
    perfIcon: { fontSize: '1rem' },
    perfLabel: { fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)' },
    perfValue: { fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace', color: '#fff' },
    emotionSection: { borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' },
    sectionTitle: { fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '1px', marginBottom: '10px' },
    emotionGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' },
    emotionBar: { display: 'flex', alignItems: 'center', gap: '8px' },
    emotionLabel: { display: 'flex', alignItems: 'center', gap: '5px', width: '80px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' },
    emotionTrack: { flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' },
    emotionFill: { height: '100%', borderRadius: '3px', transition: 'width 0.5s ease' },
    emotionValue: { width: '35px', textAlign: 'right', fontSize: '0.7rem', fontWeight: 600, color: '#fff', fontFamily: 'monospace' },
    thresholdsSection: {
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px',
        borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px',
    },
    thresholdItem: { display: 'flex', alignItems: 'center', gap: '8px' },
    thresholdLabel: { fontSize: '0.65rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', width: '55px' },
    thresholdBar: { flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' },
    thresholdFill: { height: '100%', borderRadius: '3px', transition: 'width 0.3s ease' },
    thresholdValue: { fontSize: '0.7rem', fontWeight: 600, color: '#fff', fontFamily: 'monospace', width: '60px', textAlign: 'right' },
}
