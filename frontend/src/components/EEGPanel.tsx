import React, { useState, useEffect, useRef } from 'react'
import { EEGData } from '../types/telemetry'

interface EEGPanelProps {
    eeg: EEGData
    onAnalyzeClick?: () => void
}

export const EEGPanel: React.FC<EEGPanelProps> = ({ eeg, onAnalyzeClick }) => {
    const [waveform, setWaveform] = useState<number[]>([])
    const [spectrum, setSpectrum] = useState<number[]>([])
    const [selectedBand, setSelectedBand] = useState<number | null>(null)
    const phaseRef = useRef(0)

    // Safe accessors
    const thetaValue = eeg.thetaFocus || 0
    const betaValue = eeg.betaStress || 0
    const bands = eeg.bands || { delta: 0.2, theta: thetaValue, alpha: 0.3, beta: betaValue, gamma: 0.1 }

    // Generate animated EEG waveform
    useEffect(() => {
        const animate = () => {
            phaseRef.current += 0.08

            // Generate realistic EEG pattern
            const newWave: number[] = []
            for (let i = 0; i < 150; i++) {
                const x = i / 150 * Math.PI * 12 + phaseRef.current

                // Base components
                let deltaC = Math.sin(x * 0.2) * 0.6 * (bands.delta || 0.2)
                let thetaC = Math.sin(x * 0.4) * 0.5 * (bands.theta || thetaValue)
                let alphaC = Math.sin(x * 0.8) * 0.3 * (bands.alpha || 0.3)
                let betaC = Math.sin(x * 2.5) * 0.4 * (bands.beta || betaValue)
                let gammaC = Math.sin(x * 5.0) * 0.2 * (bands.gamma || 0.1)

                // Apply filtering if a band is selected
                if (selectedBand !== null) {
                    const dampener = 0.1
                    if (selectedBand !== 0) deltaC *= dampener
                    if (selectedBand !== 1) thetaC *= dampener
                    if (selectedBand !== 2) alphaC *= dampener
                    if (selectedBand !== 3) betaC *= dampener
                    if (selectedBand !== 4) gammaC *= dampener
                }

                const noise = Math.random() * 0.05
                newWave.push(deltaC + thetaC + alphaC + betaC + gammaC + noise)
            }
            setWaveform(newWave)

            // Generate frequency spectrum (FFT-like) or use real bands if updating fast enough
            // For animation smoothness, we blend real values with some jitter if not provided
            const newSpectrum = [
                (bands.delta || 0.2) + Math.random() * 0.05,
                (bands.theta || thetaValue) + Math.random() * 0.05,
                (bands.alpha || 0.3) + Math.random() * 0.05,
                (bands.beta || betaValue) + Math.random() * 0.05,
                (bands.gamma || 0.1) + Math.random() * 0.05
            ]
            setSpectrum(newSpectrum)
        }

        const interval = setInterval(animate, 50)
        return () => clearInterval(interval)
    }, [thetaValue, betaValue, bands, selectedBand])

    const getBandColor = (index: number) => {
        const colors = ['#a855f7', '#22d3ee', '#4ade80', '#fbbf24', '#ff6b6b']
        return colors[index]
    }

    const bandNames = ['Delta', 'Theta', 'Alpha', 'Beta', 'Gamma']
    const bandHz = ['1-4Hz', '4-8Hz', '8-12Hz', '12-30Hz', '30+Hz']

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.titleSection}>
                    <h3 style={styles.title}>🧠 EEG</h3>
                    <span style={styles.subtitle}>Neural Activity Monitor</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={styles.sampleRate}>
                        <span style={styles.rateDot}>◉</span>
                        {eeg.samplingRate || 256} Hz
                    </div>
                    {onAnalyzeClick && (
                        <button style={styles.analyzeBtn} onClick={onAnalyzeClick}>
                            🔍 ANALYZE
                        </button>
                    )}
                </div>
            </div>

            {/* Main Waveform */}
            <div style={styles.waveformSection}>
                <div style={styles.waveformHeader}>
                    <span>{selectedBand !== null ? `${bandNames[selectedBand].toUpperCase()} SIGNAL` : 'RAW EEG SIGNAL'}</span>
                    <span style={styles.amplitude}>±50 μV</span>
                </div>
                <div style={styles.waveformCanvas}>
                    <svg width="100%" height="80" preserveAspectRatio="none" viewBox="0 0 150 50">
                        {/* Grid */}
                        {[...Array(5)].map((_, i) => (
                            <line key={i} x1="0" y1={i * 12.5} x2="150" y2={i * 12.5} stroke="rgba(0,212,255,0.1)" strokeWidth="0.5" />
                        ))}
                        {/* Waveform */}
                        <polyline
                            fill="none"
                            stroke={selectedBand !== null ? getBandColor(selectedBand) : "#00d4ff"}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={waveform.map((v, i) => `${i},${25 - v * 20}`).join(' ')}
                            style={{
                                filter: `drop-shadow(0 0 4px ${selectedBand !== null ? getBandColor(selectedBand) : "#00d4ff"})`,
                                transition: 'stroke 0.3s ease'
                            }}
                        />
                    </svg>
                </div>
            </div>

            {/* Frequency Spectrum */}
            <div style={styles.spectrumSection}>
                <div style={styles.spectrumHeader}>FREQUENCY SPECTRUM {selectedBand !== null && <span style={styles.filterBadge} onClick={() => setSelectedBand(null)}>RESET</span>}</div>
                <div style={styles.spectrumBars}>
                    {spectrum.map((val, i) => (
                        <div
                            key={i}
                            style={{
                                ...styles.spectrumBar,
                                opacity: selectedBand === null || selectedBand === i ? 1 : 0.4,
                                transform: selectedBand === i ? 'scale(1.05)' : 'scale(1)',
                                cursor: 'pointer'
                            }}
                            onClick={() => setSelectedBand(selectedBand === i ? null : i)}
                        >
                            <div style={styles.barContainer}>
                                <div style={{
                                    ...styles.barFill,
                                    height: `${Math.min(val * 100, 100)}%`,
                                    background: getBandColor(i),
                                    boxShadow: selectedBand === i ? `0 0 15px ${getBandColor(i)}` : 'none'
                                }} />
                            </div>
                            <span style={{ ...styles.bandName, color: getBandColor(i) }}>{bandNames[i]}</span>
                            <span style={styles.bandHz}>{bandHz[i]}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Cognitive Metrics */}
            <div style={styles.metricsRow}>
                <CognitiveMetric
                    label="FOCUS"
                    value={thetaValue}
                    icon="🎯"
                    color="#00ff88"
                    description="Theta waves indicate deep focus"
                />
                <CognitiveMetric
                    label="STRESS"
                    value={betaValue}
                    icon="⚡"
                    color="#ff6b6b"
                    description="Beta activity correlates with stress"
                />
            </div>
        </div>
    )
}

// Cognitive Metric Card
const CognitiveMetric = ({ label, value, icon, color, description }: {
    label: string; value: number; icon: string; color: string; description: string
}) => (
    <div style={styles.metricCard}>
        <div style={styles.metricHeader}>
            <span style={styles.metricIcon}>{icon}</span>
            <span style={styles.metricLabel}>{label}</span>
        </div>
        <div style={styles.metricValue}>
            <span style={{ ...styles.valueNum, color }}>{(value * 100).toFixed(0)}%</span>
        </div>
        <div style={styles.metricBar}>
            <div style={{
                ...styles.metricFill,
                width: `${value * 100}%`,
                background: color
            }} />
        </div>
        <span style={styles.metricDesc}>{description}</span>
    </div>
)

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        background: 'linear-gradient(135deg, rgba(13, 33, 55, 0.95) 0%, rgba(10, 22, 40, 0.98) 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    titleSection: { display: 'flex', flexDirection: 'column', gap: '2px' },
    title: { fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 },
    subtitle: { fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' },
    sampleRate: {
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '5px 10px', borderRadius: '10px',
        background: 'rgba(0, 255, 136, 0.1)',
        color: '#00ff88', fontSize: '0.7rem', fontWeight: 600,
    },
    rateDot: { animation: 'pulse 1s infinite' },
    analyzeBtn: {
        background: 'rgba(0, 212, 255, 0.2)', border: '1px solid #00d4ff',
        color: '#00d4ff', borderRadius: '8px', padding: '4px 10px',
        fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer',
        transition: 'all 0.2s', marginLeft: '10px'
    },
    waveformSection: {
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '10px',
        padding: '10px',
    },
    waveformHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.65rem',
        color: 'rgba(255,255,255,0.4)',
        marginBottom: '8px',
        fontWeight: 600,
        textTransform: 'uppercase'
    },
    amplitude: { color: '#00d4ff' },
    waveformCanvas: {
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '6px',
        overflow: 'hidden',
    },
    spectrumSection: {
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '10px',
        padding: '12px',
    },
    spectrumHeader: {
        fontSize: '0.65rem',
        color: 'rgba(255,255,255,0.4)',
        marginBottom: '10px',
        letterSpacing: '0.5px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    filterBadge: {
        background: 'rgba(255,255,255,0.1)',
        padding: '2px 6px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.55rem'
    },
    spectrumBars: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '8px',
    },
    spectrumBar: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        transition: 'all 0.2s ease'
    },
    barContainer: {
        width: '100%',
        height: '50px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'flex-end',
        overflow: 'hidden',
    },
    barFill: {
        width: '100%',
        borderRadius: '6px 6px 0 0',
        transition: 'height 0.3s ease',
    },
    bandName: { fontSize: '0.6rem', fontWeight: 600 },
    bandHz: { fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)' },
    metricsRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '10px',
    },
    metricCard: {
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '10px',
        padding: '12px',
    },
    metricHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '6px',
    },
    metricIcon: { fontSize: '1rem' },
    metricLabel: { fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.5px' },
    metricValue: { marginBottom: '6px' },
    valueNum: { fontSize: '1.4rem', fontWeight: 800, fontFamily: 'monospace' },
    metricBar: {
        height: '4px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '2px',
        overflow: 'hidden',
        marginBottom: '6px',
    },
    metricFill: {
        height: '100%',
        borderRadius: '2px',
        transition: 'width 0.5s ease',
    },
    metricDesc: { fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)' },
}
