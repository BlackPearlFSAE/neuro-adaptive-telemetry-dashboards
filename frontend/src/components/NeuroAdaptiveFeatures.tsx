import React, { useState, useEffect } from 'react'
import { CognitiveModal } from './modals/CognitiveModal'
import { StressModal } from './modals/StressModal'
import { AttentionModal } from './modals/AttentionModal'
import { VitalsModal } from './modals/VitalsModal'
import { VehicleModal } from './modals/VehicleModal'

/**
 * Neuro-Adaptive Features Panel - Enhanced Edition
 * Displays 4 advanced biosignal monitoring features with detailed SVG visualizations
 * EV Formula compatible with comprehensive metrics
 * Click on any feature card to open detailed modal dashboard
 */

type ModalType = 'cognitive' | 'stress' | 'attention' | 'vitals' | 'vehicle' | null

interface FeatureData {
    cognitive: {
        fatigue: number
        focus: number
        oxygenation: number
        taskSaturation: boolean
        hbo2Level: number      // HbO2 μmol/L
        hbrLevel: number       // HbR μmol/L
        mentalWorkload: number // 0-100%
        prefrontalActivity: number // asymmetry index
    }
    stress: {
        level: number
        eda: number
        gripForce: number
        spikes: number[]
        scl: number           // Skin Conductance Level μS
        scrCount: number      // SCR peaks count
        arousalIndex: number  // 0-1
        recoveryRate: number  // stress recovery speed
    }
    attention: {
        tunnelVision: boolean
        blinkRate: number
        gazeFixation: { x: number; y: number }[]
        cognitiveLoad: number
        pupilDiameterL: number  // mm
        pupilDiameterR: number  // mm
        perclos: number         // % eye closure
        fixationDuration: number // ms
        saccadeVelocity: number  // deg/s
        gazeDispersion: number   // tunnel vision indicator
    }
    vitals: {
        hrv: number
        rmssd: number
        notifications: number
        hapticActive: boolean
        heartRate: number       // BPM
        pnn50: number          // %
        lfHfRatio: number      // LF/HF power ratio
        respiratoryRate: number // breaths/min
        coreTemperature: number // °C
        skinTemperature: number // °C
    }
}

const getDefaultData = (): FeatureData => ({
    cognitive: {
        fatigue: 25, focus: 78, oxygenation: 95, taskSaturation: false,
        hbo2Level: 68, hbrLevel: 32, mentalWorkload: 45, prefrontalActivity: 0.12
    },
    stress: {
        level: 33, eda: 5.6, gripForce: 65, spikes: [],
        scl: 4.2, scrCount: 5, arousalIndex: 0.45, recoveryRate: 0.78
    },
    attention: {
        tunnelVision: false, blinkRate: 22, gazeFixation: [], cognitiveLoad: 45,
        pupilDiameterL: 4.2, pupilDiameterR: 4.1, perclos: 0.08,
        fixationDuration: 245, saccadeVelocity: 380, gazeDispersion: 0.18
    },
    vitals: {
        hrv: 84, rmssd: 45, notifications: 2, hapticActive: true,
        heartRate: 92, pnn50: 14.5, lfHfRatio: 1.6,
        respiratoryRate: 14, coreTemperature: 37.2, skinTemperature: 34.5
    }
})

export const NeuroAdaptiveFeatures: React.FC = () => {
    const [data, setData] = useState<FeatureData>(getDefaultData())
    const [gazeHistory, setGazeHistory] = useState<{ x: number; y: number }[]>([])
    const [activeModal, setActiveModal] = useState<ModalType>(null)

    // Simulate real-time data updates with enhanced metrics
    useEffect(() => {
        const interval = setInterval(() => {
            setData(prev => ({
                cognitive: {
                    fatigue: Math.max(0, Math.min(100, prev.cognitive.fatigue + (Math.random() - 0.45) * 3)),
                    focus: Math.max(0, Math.min(100, prev.cognitive.focus + (Math.random() - 0.5) * 5)),
                    oxygenation: 88 + Math.random() * 8,
                    taskSaturation: prev.cognitive.fatigue > 70 || prev.cognitive.mentalWorkload > 80,
                    hbo2Level: 60 + Math.random() * 15,
                    hbrLevel: 28 + Math.random() * 10,
                    mentalWorkload: Math.max(0, Math.min(100, prev.cognitive.mentalWorkload + (Math.random() - 0.5) * 4)),
                    prefrontalActivity: (Math.random() - 0.5) * 0.4
                },
                stress: {
                    level: Math.max(0, Math.min(100, prev.stress.level + (Math.random() - 0.5) * 4)),
                    eda: 3 + Math.random() * 4,
                    gripForce: 50 + Math.random() * 40,
                    spikes: Math.random() > 0.9 ? [...prev.stress.spikes.slice(-5), Date.now()] : prev.stress.spikes,
                    scl: 3 + Math.random() * 3,
                    scrCount: Math.floor(prev.stress.level / 15) + Math.floor(Math.random() * 4),
                    arousalIndex: prev.stress.level / 100,
                    recoveryRate: Math.max(0.3, 1.0 - prev.stress.level / 150)
                },
                attention: {
                    tunnelVision: prev.attention.gazeDispersion < 0.1 || prev.attention.cognitiveLoad > 85,
                    blinkRate: 15 + Math.random() * 12,
                    gazeFixation: prev.attention.gazeFixation,
                    cognitiveLoad: Math.max(0, Math.min(100, prev.attention.cognitiveLoad + (Math.random() - 0.5) * 5)),
                    pupilDiameterL: 3.5 + (prev.attention.cognitiveLoad / 100) * 1.5 + (Math.random() - 0.5) * 0.3,
                    pupilDiameterR: 3.5 + (prev.attention.cognitiveLoad / 100) * 1.5 + (Math.random() - 0.5) * 0.3,
                    perclos: 0.05 + (prev.cognitive.fatigue / 100) * 0.15 + Math.random() * 0.03,
                    fixationDuration: 200 + Math.random() * 100,
                    saccadeVelocity: 300 + Math.random() * 150,
                    gazeDispersion: 0.1 + Math.random() * 0.2
                },
                vitals: {
                    hrv: 55 + Math.random() * 40,
                    rmssd: 35 + Math.random() * 20,
                    notifications: prev.vitals.notifications,
                    hapticActive: prev.vitals.hapticActive,
                    heartRate: 75 + Math.floor(prev.stress.level * 0.5) + Math.floor((Math.random() - 0.5) * 10),
                    pnn50: Math.max(0, 20 - prev.stress.level / 5 + (Math.random() - 0.5) * 5),
                    lfHfRatio: 1.0 + prev.stress.level / 50 + (Math.random() - 0.5) * 0.5,
                    respiratoryRate: 12 + Math.floor(prev.stress.level / 20) + Math.floor((Math.random() - 0.5) * 4),
                    coreTemperature: 37.0 + Math.random() * 0.8,
                    skinTemperature: 34.0 + Math.random() * 1.0
                }
            }))

            setGazeHistory(prev => [
                ...prev.slice(-40),
                { x: 150 + (Math.random() - 0.5) * 120, y: 80 + (Math.random() - 0.5) * 70 }
            ])
        }, 200)

        return () => clearInterval(interval)
    }, [])

    const getStatusColor = (value: number, thresholds: [number, number] = [30, 70]) => {
        if (value < thresholds[0]) return '#00ff88'
        if (value < thresholds[1]) return '#fbbf24'
        return '#ff4757'
    }

    const getInverseStatusColor = (value: number, thresholds: [number, number] = [30, 70]) => {
        if (value > thresholds[1]) return '#00ff88'
        if (value > thresholds[0]) return '#fbbf24'
        return '#ff4757'
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={styles.icon}>🧠</span>
                    <span style={styles.title}>NEURO-ADAPTIVE MONITORING</span>
                    <span style={styles.badge}>LIVE</span>
                </div>
                <button
                    style={{
                        background: 'rgba(59, 130, 246, 0.2)',
                        border: '1px solid #3b82f6',
                        color: '#60a5fa',
                        padding: '6px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                    }}
                    onClick={() => setActiveModal('vehicle')}
                >
                    🏎️ VEHICLE TELEMETRY
                </button>
            </div>

            <div style={styles.grid}>
                {/* Feature 1: Cognitive Load (fNIRS) */}
                <div style={{ ...styles.featureCard, cursor: 'pointer' }} onClick={() => setActiveModal('cognitive')}>
                    <div style={styles.featureImage}>
                        <svg viewBox="0 0 300 180" style={styles.svg}>
                            <ellipse cx="150" cy="100" rx="100" ry="70" fill="none" stroke="#00d4ff" strokeWidth="2" opacity="0.3" />
                            <ellipse cx="150" cy="95" rx="85" ry="60" fill="rgba(0,212,255,0.05)" stroke="#00d4ff" strokeWidth="1" />
                            <rect x="75" y="55" width="35" height="18" rx="3" fill="#ff6b6b" opacity="0.9" />
                            <text x="92" y="42" textAnchor="middle" fill="#aaa" fontSize="7">fNIRS Detector</text>
                            <path d="M 93 73 Q 75 100, 85 130" fill="none" stroke="#00d4ff" strokeWidth="2" />
                            <path d="M 93 73 Q 110 100, 100 130" fill="none" stroke="#ff6b6b" strokeWidth="2" />
                            <text x="55" y="105" fill="#aaa" fontSize="6">Optical Fibers</text>
                            {[[120, 55], [150, 45], [180, 55], [130, 85], [170, 85]].map(([x, y], i) => (
                                <circle key={i} cx={x} cy={y} r="6" fill="#a855f7" opacity="0.9">
                                    <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" begin={`${i * 0.2}s`} />
                                </circle>
                            ))}
                            <text x="205" y="55" fill="#aaa" fontSize="6">EEG Electrodes</text>
                            <path d="M 220 85 Q 245 70, 270 85" fill="none" stroke="#00ff88" strokeWidth="1" strokeDasharray="4,2" />
                            <path d="M 225 78 Q 250 63, 275 78" fill="none" stroke="#00ff88" strokeWidth="1" strokeDasharray="4,2" />
                            <text x="248" y="100" textAnchor="middle" fill="#aaa" fontSize="6">Wireless</text>
                            <text x="150" y="155" textAnchor="middle" fill="#00d4ff" fontSize="12" fontWeight="bold">
                                O₂: {data.cognitive.oxygenation.toFixed(0)}%
                            </text>
                        </svg>
                    </div>
                    <div style={styles.featureContent}>
                        <div style={styles.featureHeader}>
                            <h3 style={styles.featureTitle}>Cognitive Load (fNIRS)</h3>
                            <span style={styles.featureIcon}>🧠</span>
                        </div>
                        <p style={styles.featureDesc}>Prefrontal cortex oxygenation • 10 Hz fNIRS sampling</p>

                        {/* Enhanced metrics grid */}
                        <div style={styles.metricsGrid}>
                            <div style={styles.metricBox}>
                                <span style={styles.metricBoxLabel}>HbO₂</span>
                                <span style={{ ...styles.metricBoxValue, color: '#00d4ff' }}>{data.cognitive.hbo2Level.toFixed(0)}</span>
                                <span style={styles.metricBoxUnit}>μmol/L</span>
                            </div>
                            <div style={styles.metricBox}>
                                <span style={styles.metricBoxLabel}>HbR</span>
                                <span style={{ ...styles.metricBoxValue, color: '#ff6b6b' }}>{data.cognitive.hbrLevel.toFixed(0)}</span>
                                <span style={styles.metricBoxUnit}>μmol/L</span>
                            </div>
                            <div style={styles.metricBox}>
                                <span style={styles.metricBoxLabel}>Workload</span>
                                <span style={{ ...styles.metricBoxValue, color: getStatusColor(data.cognitive.mentalWorkload) }}>{data.cognitive.mentalWorkload.toFixed(0)}</span>
                                <span style={styles.metricBoxUnit}>%</span>
                            </div>
                        </div>

                        <div style={styles.metrics}>
                            <div style={styles.metric}>
                                <span style={styles.metricLabel}>Fatigue</span>
                                <div style={styles.metricBar}><div style={{ ...styles.metricFill, width: `${data.cognitive.fatigue}%`, background: getStatusColor(data.cognitive.fatigue) }} /></div>
                                <span style={{ ...styles.metricValue, color: getStatusColor(data.cognitive.fatigue) }}>{data.cognitive.fatigue.toFixed(0)}%</span>
                            </div>
                            <div style={styles.metric}>
                                <span style={styles.metricLabel}>Focus</span>
                                <div style={styles.metricBar}><div style={{ ...styles.metricFill, width: `${data.cognitive.focus}%`, background: getInverseStatusColor(data.cognitive.focus) }} /></div>
                                <span style={{ ...styles.metricValue, color: getInverseStatusColor(data.cognitive.focus) }}>{data.cognitive.focus.toFixed(0)}%</span>
                            </div>
                        </div>
                        <div style={styles.tags}>
                            <span style={{ ...styles.tag, background: data.cognitive.taskSaturation ? 'rgba(255,71,87,0.2)' : 'rgba(0,212,255,0.2)', color: data.cognitive.taskSaturation ? '#ff4757' : '#00d4ff' }}>
                                {data.cognitive.taskSaturation ? '⚠️ SATURATED' : '✓ NOMINAL'}
                            </span>
                            <span style={{ ...styles.tag, background: 'rgba(168,85,247,0.2)', color: '#a855f7' }}>
                                PFC: {data.cognitive.prefrontalActivity > 0 ? 'R' : 'L'} {Math.abs(data.cognitive.prefrontalActivity * 100).toFixed(0)}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Feature 2: Stress (GSR/EDA) */}
                <div style={{ ...styles.featureCard, cursor: 'pointer' }} onClick={() => setActiveModal('stress')}>
                    <div style={styles.featureImage}>
                        <svg viewBox="0 0 300 180" style={styles.svg}>
                            <path d={`M 100 155 Q 75 135, 85 100 L 85 75 Q 85 65, 95 60 L 95 42 Q 95 35, 102 35 L 108 35 Q 115 35, 115 42 L 115 68 L 122 68 L 122 32 Q 122 25, 130 25 L 138 25 Q 145 25, 145 32 L 145 68 L 155 68 L 155 28 Q 155 20, 163 20 L 172 20 Q 180 20, 180 28 L 180 68 L 190 68 L 190 38 Q 190 30, 198 30 L 206 30 Q 215 30, 215 38 L 215 78 Q 235 100, 235 125 Q 250 140, 235 155 Z`} fill="rgba(80,80,100,0.3)" stroke="#666" strokeWidth="2" />
                            {[[105, 38], [137, 27], [171, 23], [207, 33]].map(([x, y], i) => (
                                <g key={i}>
                                    <circle cx={x} cy={y} r="8" fill="#fbbf24" opacity="0.95" />
                                    <circle cx={x} cy={y} r="12" fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.5">
                                        <animate attributeName="r" values="12;18;12" dur="1.5s" repeatCount="indefinite" begin={`${i * 0.3}s`} />
                                        <animate attributeName="opacity" values="0.5;0;0.5" dur="1.5s" repeatCount="indefinite" begin={`${i * 0.3}s`} />
                                    </circle>
                                </g>
                            ))}
                            <text x="258" y="45" fill="#aaa" fontSize="7">SKIN CONDUCTANCE</text>
                            <text x="258" y="55" fill="#aaa" fontSize="7">SENSORS</text>
                            <text x="55" y="95" fill="#aaa" fontSize="7">REINFORCED</text>
                            <text x="55" y="105" fill="#aaa" fontSize="7">PALM GRIP</text>
                            <text x="258" y="130" fill="#aaa" fontSize="7">SENSOR WIRING</text>
                            <text x="258" y="140" fill="#aaa" fontSize="7">HARNESS</text>
                            <text x="165" y="170" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="bold">
                                EDA: {data.stress.eda.toFixed(1)} μS
                            </text>
                        </svg>
                    </div>
                    <div style={styles.featureContent}>
                        <div style={styles.featureHeader}>
                            <h3 style={styles.featureTitle}>Stress (GSR/EDA)</h3>
                            <span style={styles.featureIcon}>🖐️</span>
                        </div>
                        <p style={styles.featureDesc}>Galvanic Skin Response • 256 Hz electrodermal sampling</p>

                        <div style={styles.metricsGrid}>
                            <div style={styles.metricBox}>
                                <span style={styles.metricBoxLabel}>SCL</span>
                                <span style={{ ...styles.metricBoxValue, color: '#fbbf24' }}>{data.stress.scl.toFixed(1)}</span>
                                <span style={styles.metricBoxUnit}>μS</span>
                            </div>
                            <div style={styles.metricBox}>
                                <span style={styles.metricBoxLabel}>SCR</span>
                                <span style={{ ...styles.metricBoxValue, color: '#ff6b6b' }}>{data.stress.scrCount}</span>
                                <span style={styles.metricBoxUnit}>peaks</span>
                            </div>
                            <div style={styles.metricBox}>
                                <span style={styles.metricBoxLabel}>Recovery</span>
                                <span style={{ ...styles.metricBoxValue, color: getInverseStatusColor(data.stress.recoveryRate * 100) }}>{(data.stress.recoveryRate * 100).toFixed(0)}</span>
                                <span style={styles.metricBoxUnit}>%</span>
                            </div>
                        </div>

                        <div style={styles.metrics}>
                            <div style={styles.metric}>
                                <span style={styles.metricLabel}>Stress</span>
                                <div style={styles.metricBar}><div style={{ ...styles.metricFill, width: `${data.stress.level}%`, background: getStatusColor(data.stress.level) }} /></div>
                                <span style={{ ...styles.metricValue, color: getStatusColor(data.stress.level) }}>{data.stress.level.toFixed(0)}%</span>
                            </div>
                            <div style={styles.metric}>
                                <span style={styles.metricLabel}>Grip</span>
                                <div style={styles.metricBar}><div style={{ ...styles.metricFill, width: `${data.stress.gripForce}%`, background: '#00d4ff' }} /></div>
                                <span style={styles.metricValue}>{data.stress.gripForce.toFixed(0)}%</span>
                            </div>
                        </div>
                        <div style={styles.tags}>
                            <span style={{ ...styles.tag, background: 'rgba(251,191,36,0.2)', color: '#fbbf24' }}>AROUSAL: {(data.stress.arousalIndex * 100).toFixed(0)}%</span>
                            <span style={{ ...styles.tag, background: data.stress.spikes.length > 3 ? 'rgba(255,71,87,0.2)' : 'rgba(0,255,136,0.2)', color: data.stress.spikes.length > 3 ? '#ff4757' : '#00ff88' }}>
                                {data.stress.spikes.length > 0 ? `🔺 ${data.stress.spikes.length} SPIKES` : '✓ STABLE'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Feature 3: Attention (Eye Track) */}
                <div style={{ ...styles.featureCard, cursor: 'pointer' }} onClick={() => setActiveModal('attention')}>
                    <div style={styles.featureImage}>
                        <svg viewBox="0 0 300 180" style={styles.svg}>
                            <rect x="15" y="15" width="270" height="135" rx="8" fill="rgba(0,0,0,0.6)" stroke="#333" strokeWidth="2" />
                            <path d="M 55 150 L 245 150 L 200 70 L 100 70 Z" fill="rgba(30,30,35,0.6)" stroke="#444" strokeWidth="1" />
                            <line x1="150" y1="70" x2="150" y2="150" stroke="#fbbf24" strokeWidth="3" strokeDasharray="8,6" />
                            {gazeHistory.map((point, i) => {
                                const intensity = i / gazeHistory.length
                                const r = 255
                                const g = Math.max(0, Math.floor(255 - intensity * 100))
                                return (
                                    <circle key={i} cx={point.x} cy={point.y} r={6 + intensity * 8}
                                        fill={`rgba(${r},${g},0,${0.3 + intensity * 0.4})`} />
                                )
                            })}
                            <g transform="translate(55, 115)">
                                <circle r="28" fill="rgba(0,0,0,0.7)" stroke="#333" strokeWidth="1" />
                                <text x="0" y="-14" textAnchor="middle" fill="#888" fontSize="6">RPM</text>
                                <text x="0" y="6" textAnchor="middle" fill="#00ff88" fontSize="14" fontWeight="bold">7</text>
                                <path d="M -20 12 A 22 22 0 0 1 20 12" fill="none" stroke="#00ff88" strokeWidth="4" strokeLinecap="round" />
                            </g>
                            <g transform="translate(250, 130)">
                                <circle r="14" fill="rgba(34,211,238,0.2)" stroke="#22d3ee" strokeWidth="1" />
                                <text x="0" y="5" textAnchor="middle" fontSize="14">👁️</text>
                            </g>
                            <text x="150" y="172" textAnchor="middle" fill="#22d3ee" fontSize="12" fontWeight="bold">
                                Blink: {data.attention.blinkRate.toFixed(0)}/min
                            </text>
                        </svg>
                    </div>
                    <div style={styles.featureContent}>
                        <div style={styles.featureHeader}>
                            <h3 style={styles.featureTitle}>Attention (Eye Track)</h3>
                            <span style={styles.featureIcon}>👁️</span>
                        </div>
                        <p style={styles.featureDesc}>IR pupilometry • 120 Hz eye tracking</p>

                        <div style={styles.metricsGrid}>
                            <div style={styles.metricBox}>
                                <span style={styles.metricBoxLabel}>Pupil L</span>
                                <span style={{ ...styles.metricBoxValue, color: '#22d3ee' }}>{data.attention.pupilDiameterL.toFixed(1)}</span>
                                <span style={styles.metricBoxUnit}>mm</span>
                            </div>
                            <div style={styles.metricBox}>
                                <span style={styles.metricBoxLabel}>Pupil R</span>
                                <span style={{ ...styles.metricBoxValue, color: '#22d3ee' }}>{data.attention.pupilDiameterR.toFixed(1)}</span>
                                <span style={styles.metricBoxUnit}>mm</span>
                            </div>
                            <div style={styles.metricBox}>
                                <span style={styles.metricBoxLabel}>PERCLOS</span>
                                <span style={{ ...styles.metricBoxValue, color: getStatusColor(data.attention.perclos * 100, [10, 20]) }}>{(data.attention.perclos * 100).toFixed(1)}</span>
                                <span style={styles.metricBoxUnit}>%</span>
                            </div>
                        </div>

                        <div style={styles.metrics}>
                            <div style={styles.metric}>
                                <span style={styles.metricLabel}>Cognitive</span>
                                <div style={styles.metricBar}><div style={{ ...styles.metricFill, width: `${data.attention.cognitiveLoad}%`, background: getStatusColor(data.attention.cognitiveLoad) }} /></div>
                                <span style={{ ...styles.metricValue, color: getStatusColor(data.attention.cognitiveLoad) }}>{data.attention.cognitiveLoad.toFixed(0)}%</span>
                            </div>
                            <div style={styles.metric}>
                                <span style={styles.metricLabel}>Fixation</span>
                                <div style={styles.metricBar}><div style={{ ...styles.metricFill, width: `${(data.attention.fixationDuration / 400) * 100}%`, background: '#a855f7' }} /></div>
                                <span style={styles.metricValue}>{data.attention.fixationDuration.toFixed(0)}ms</span>
                            </div>
                        </div>
                        <div style={styles.tags}>
                            <span style={{ ...styles.tag, background: data.attention.tunnelVision ? 'rgba(255,71,87,0.2)' : 'rgba(34,211,238,0.2)', color: data.attention.tunnelVision ? '#ff4757' : '#22d3ee' }}>
                                {data.attention.tunnelVision ? '⚠️ TUNNEL VISION' : '✓ WIDE SCAN'}
                            </span>
                            <span style={{ ...styles.tag, background: 'rgba(168,85,247,0.2)', color: '#a855f7' }}>SACCADE: {data.attention.saccadeVelocity.toFixed(0)}°/s</span>
                        </div>
                    </div>
                </div>

                {/* Feature 4: Vitals & Feedback */}
                <div style={{ ...styles.featureCard, cursor: 'pointer' }} onClick={() => setActiveModal('vitals')}>
                    <div style={styles.featureImage}>
                        <svg viewBox="0 0 300 180" style={styles.svg}>
                            <rect x="30" y="20" width="240" height="140" rx="8" fill="rgba(20,30,50,0.9)" />
                            <defs>
                                <pattern id="suitPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                                    <line x1="0" y1="0" x2="20" y2="0" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                                    <line x1="0" y1="10" x2="20" y2="10" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                                </pattern>
                            </defs>
                            <rect x="30" y="20" width="240" height="140" fill="url(#suitPattern)" />
                            {[[60, 50], [120, 50], [180, 50], [240, 50], [60, 90], [120, 90], [180, 90], [240, 90], [60, 130], [120, 130], [180, 130]].map(([x, y], i) => (
                                <g key={i} transform={`translate(${x}, ${y})`}>
                                    <rect x="-15" y="-15" width="30" height="30" rx="4" fill="rgba(0,0,0,0.5)" stroke="#444" />
                                    <rect x="-10" y="-10" width="20" height="20" rx="2" fill="#333" stroke={i < 4 ? '#4ade80' : '#555'} />
                                    {i < 4 && (
                                        <circle r="4" fill="#4ade80" opacity="0.9">
                                            <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" begin={`${i * 0.2}s`} />
                                        </circle>
                                    )}
                                </g>
                            ))}
                            {[[90, 70], [150, 70], [210, 70]].map(([x, y], i) => (
                                <g key={`haptic-${i}`} transform={`translate(${x}, ${y})`}>
                                    <circle r="5" fill={data.vitals.hapticActive ? '#a855f7' : '#444'} />
                                    {data.vitals.hapticActive && (
                                        <circle r="10" fill="none" stroke="#a855f7" opacity="0.5">
                                            <animate attributeName="r" values="10;16;10" dur="0.8s" repeatCount="indefinite" />
                                            <animate attributeName="opacity" values="0.5;0;0.5" dur="0.8s" repeatCount="indefinite" />
                                        </circle>
                                    )}
                                </g>
                            ))}
                            <text x="150" y="170" textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="bold">
                                HRV: {data.vitals.hrv.toFixed(0)} ms | RMSSD: {data.vitals.rmssd.toFixed(0)}
                            </text>
                        </svg>
                    </div>
                    <div style={styles.featureContent}>
                        <div style={styles.featureHeader}>
                            <h3 style={styles.featureTitle}>Vitals & Feedback</h3>
                            <span style={styles.featureIcon}>💚</span>
                        </div>
                        <p style={styles.featureDesc}>ECG leads • 250 Hz HRV • Haptic motors</p>

                        <div style={styles.metricsGrid}>
                            <div style={styles.metricBox}>
                                <span style={styles.metricBoxLabel}>HR</span>
                                <span style={{ ...styles.metricBoxValue, color: getStatusColor(data.vitals.heartRate, [60, 120]) }}>{data.vitals.heartRate}</span>
                                <span style={styles.metricBoxUnit}>BPM</span>
                            </div>
                            <div style={styles.metricBox}>
                                <span style={styles.metricBoxLabel}>pNN50</span>
                                <span style={{ ...styles.metricBoxValue, color: getInverseStatusColor(data.vitals.pnn50, [5, 15]) }}>{data.vitals.pnn50.toFixed(1)}</span>
                                <span style={styles.metricBoxUnit}>%</span>
                            </div>
                            <div style={styles.metricBox}>
                                <span style={styles.metricBoxLabel}>LF/HF</span>
                                <span style={{ ...styles.metricBoxValue, color: getStatusColor(data.vitals.lfHfRatio * 30, [30, 60]) }}>{data.vitals.lfHfRatio.toFixed(1)}</span>
                                <span style={styles.metricBoxUnit}>ratio</span>
                            </div>
                        </div>

                        <div style={styles.metricsGrid}>
                            <div style={styles.metricBox}>
                                <span style={styles.metricBoxLabel}>Resp</span>
                                <span style={{ ...styles.metricBoxValue, color: '#00d4ff' }}>{data.vitals.respiratoryRate}</span>
                                <span style={styles.metricBoxUnit}>br/m</span>
                            </div>
                            <div style={styles.metricBox}>
                                <span style={styles.metricBoxLabel}>Core</span>
                                <span style={{ ...styles.metricBoxValue, color: getStatusColor((data.vitals.coreTemperature - 37) * 50, [25, 75]) }}>{data.vitals.coreTemperature.toFixed(1)}</span>
                                <span style={styles.metricBoxUnit}>°C</span>
                            </div>
                            <div style={styles.metricBox}>
                                <span style={styles.metricBoxLabel}>Skin</span>
                                <span style={{ ...styles.metricBoxValue, color: '#fbbf24' }}>{data.vitals.skinTemperature.toFixed(1)}</span>
                                <span style={styles.metricBoxUnit}>°C</span>
                            </div>
                        </div>

                        <div style={styles.tags}>
                            <span style={{ ...styles.tag, background: 'rgba(74,222,128,0.2)', color: '#4ade80' }}>HRV: {data.vitals.hrv.toFixed(0)}ms</span>
                            <span style={{ ...styles.tag, background: 'rgba(168,85,247,0.2)', color: '#a855f7' }}>ALERTS: {data.vitals.notifications}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Dashboards */}
            <CognitiveModal isOpen={activeModal === 'cognitive'} onClose={() => setActiveModal(null)} />
            <StressModal isOpen={activeModal === 'stress'} onClose={() => setActiveModal(null)} />
            <AttentionModal isOpen={activeModal === 'attention'} onClose={() => setActiveModal(null)} />
            <VitalsModal isOpen={activeModal === 'vitals'} onClose={() => setActiveModal(null)} />
            <VehicleModal isOpen={activeModal === 'vehicle'} onClose={() => setActiveModal(null)} />
        </div>
    )
}

const styles: { [key: string]: React.CSSProperties } = {
    container: { background: 'linear-gradient(135deg, rgba(13, 33, 55, 0.95) 0%, rgba(10, 22, 40, 0.98) 100%)', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '16px', padding: '20px' },
    header: { display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px', marginBottom: '20px' },
    icon: { fontSize: '1.5rem' },
    title: { fontSize: '1rem', fontWeight: 700, color: '#fff', letterSpacing: '1.5px', flex: 1 },
    badge: { fontSize: '0.7rem', fontWeight: 700, color: '#00ff88', padding: '4px 10px', background: 'rgba(0,255,136,0.15)', borderRadius: '4px', border: '1px solid rgba(0,255,136,0.3)' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' },
    featureCard: { background: 'rgba(0,0,0,0.3)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' },
    featureImage: { height: '180px', background: 'rgba(0,0,0,0.4)' },
    svg: { width: '100%', height: '100%' },
    featureContent: { padding: '14px' },
    featureHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' },
    featureTitle: { fontSize: '0.95rem', fontWeight: 700, color: '#fff', margin: 0 },
    featureIcon: { fontSize: '1.2rem' },
    featureDesc: { fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' },
    metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' },
    metricBox: { background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' },
    metricBoxLabel: { display: 'block', fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' },
    metricBoxValue: { display: 'block', fontSize: '1rem', fontWeight: 700, fontFamily: 'monospace' },
    metricBoxUnit: { display: 'block', fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)' },
    metrics: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' },
    metric: { display: 'flex', alignItems: 'center', gap: '6px' },
    metricLabel: { width: '55px', fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' },
    metricBar: { flex: 1, height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' },
    metricFill: { height: '100%', borderRadius: '2px', transition: 'width 0.3s ease' },
    metricValue: { width: '40px', fontSize: '0.7rem', fontWeight: 600, textAlign: 'right', fontFamily: 'monospace' },
    tags: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
    tag: { fontSize: '0.55rem', fontWeight: 700, padding: '3px 6px', borderRadius: '3px', letterSpacing: '0.5px' },
}

export default NeuroAdaptiveFeatures
