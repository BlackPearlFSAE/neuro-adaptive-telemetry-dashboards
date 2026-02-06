import React, { useState, useEffect } from 'react'
import { EEGData } from '../../types/telemetry'

interface EEGAnalyzeModalProps {
    isOpen: boolean
    onClose: () => void
    data: EEGData
}

export const EEGAnalyzeModal: React.FC<EEGAnalyzeModalProps> = ({ isOpen, onClose, data }) => {
    if (!isOpen) return null

    const [activeTab, setActiveTab] = useState<'spectrum' | 'timeSeries' | 'cognitive'>('spectrum')
    const [history, setHistory] = useState<any[]>([])

    // Simulate history data accumulation
    useEffect(() => {
        if (!isOpen) return

        const interval = setInterval(() => {
            setHistory(prev => {
                const newPoint = {
                    time: Date.now(),
                    delta: (data.bands?.delta || 0.2) + Math.random() * 0.1,
                    theta: (data.bands?.theta || data.thetaFocus || 0.4) + Math.random() * 0.1,
                    alpha: (data.bands?.alpha || 0.3) + Math.random() * 0.1,
                    beta: (data.bands?.beta || data.betaStress || 0.2) + Math.random() * 0.1,
                    gamma: (data.bands?.gamma || 0.1) + Math.random() * 0.1,
                }
                const newHistory = [...prev, newPoint]
                if (newHistory.length > 50) newHistory.shift() // Keep last 50 points
                return newHistory
            })
        }, 100)

        return () => clearInterval(interval)
    }, [isOpen, data])

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <div style={styles.header}>
                    <div style={styles.headerLeft}>
                        <span style={styles.icon}>🧠</span>
                        <div>
                            <h2 style={styles.title}>Advanced EEG Analysis</h2>
                            <p style={styles.subtitle}>M-TESLA Neural Spectrography</p>
                        </div>
                    </div>
                    <button style={styles.closeBtn} onClick={onClose}>×</button>
                </div>

                <div style={styles.content}>
                    {/* Sidebar Navigation */}
                    <div style={styles.sidebar}>
                        <button
                            style={{ ...styles.navBtn, ...(activeTab === 'spectrum' ? styles.navBtnActive : {}) }}
                            onClick={() => setActiveTab('spectrum')}
                        >
                            📊 Frequency Spectrum
                        </button>
                        <button
                            style={{ ...styles.navBtn, ...(activeTab === 'timeSeries' ? styles.navBtnActive : {}) }}
                            onClick={() => setActiveTab('timeSeries')}
                        >
                            📈 Time-Series Analysis
                        </button>
                        <button
                            style={{ ...styles.navBtn, ...(activeTab === 'cognitive' ? styles.navBtnActive : {}) }}
                            onClick={() => setActiveTab('cognitive')}
                        >
                            🧠 Cognitive Correlations
                        </button>
                    </div>

                    {/* Main Content Area */}
                    <div style={styles.mainPanel}>
                        {activeTab === 'spectrum' && (
                            <div style={styles.spectrumView}>
                                <div style={styles.viewHeader}>
                                    <h3>Real-Time Spectral Power Density</h3>
                                    <span style={styles.badge}>LIVE STREAM</span>
                                </div>
                                <div style={styles.bandsGrid}>
                                    <SpectralCard label="Delta" range="1-4 Hz" value={data.bands?.delta || 0.2} color="#a855f7" description="Deep Sleep / Unconscious" />
                                    <SpectralCard label="Theta" range="4-8 Hz" value={data.bands?.theta || data.thetaFocus || 0} color="#22d3ee" description="Deep Focus / Meditation" />
                                    <SpectralCard label="Alpha" range="8-12 Hz" value={data.bands?.alpha || 0.3} color="#4ade80" description="Relaxed / Calvin" />
                                    <SpectralCard label="Beta" range="12-30 Hz" value={data.bands?.beta || data.betaStress || 0} color="#fbbf24" description="Active Thinking / Stress" />
                                    <SpectralCard label="Gamma" range="30+ Hz" value={data.bands?.gamma || 0.1} color="#ff6b6b" description="Peak Cognition / Binding" />
                                </div>
                            </div>
                        )}

                        {activeTab === 'timeSeries' && (
                            <div style={styles.timeView}>
                                <div style={styles.viewHeader}>
                                    <h3>Band Power History (Last 5s)</h3>
                                </div>
                                <div style={styles.chartContainer}>
                                    {/* Simple SVG Line Chart */}
                                    <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none">
                                        <g>
                                            {/* Grid Lines */}
                                            {[0, 50, 100, 150, 200].map(y => (
                                                <line key={y} x1="0" y1={y} x2="500" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                                            ))}
                                        </g>

                                        {/* Paths */}
                                        <path d={getPolyline(history, 'delta', 500, 200)} fill="none" stroke="#a855f7" strokeWidth="2" />
                                        <path d={getPolyline(history, 'theta', 500, 200)} fill="none" stroke="#22d3ee" strokeWidth="2" />
                                        <path d={getPolyline(history, 'alpha', 500, 200)} fill="none" stroke="#4ade80" strokeWidth="2" />
                                        <path d={getPolyline(history, 'beta', 500, 200)} fill="none" stroke="#fbbf24" strokeWidth="2" />
                                        <path d={getPolyline(history, 'gamma', 500, 200)} fill="none" stroke="#ff6b6b" strokeWidth="2" />
                                    </svg>
                                </div>
                                <div style={styles.legend}>
                                    <div style={{ color: '#a855f7' }}>● Delta</div>
                                    <div style={{ color: '#22d3ee' }}>● Theta</div>
                                    <div style={{ color: '#4ade80' }}>● Alpha</div>
                                    <div style={{ color: '#fbbf24' }}>● Beta</div>
                                    <div style={{ color: '#ff6b6b' }}>● Gamma</div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'cognitive' && (
                            <div style={styles.cognitiveView}>
                                <div style={styles.viewHeader}>
                                    <h3>Cognitive State Correlations</h3>
                                </div>
                                <div style={styles.correlationGrid}>
                                    <div style={styles.corrCard}>
                                        <h4>Focus vs. Theta</h4>
                                        <div style={styles.corrValue}>High Correlation (0.85)</div>
                                        <p style={styles.corrDesc}>Theta waves are strongly predicting current flow state.</p>
                                    </div>
                                    <div style={styles.corrCard}>
                                        <h4>Stress vs. Beta</h4>
                                        <div style={styles.corrValue}>Moderate Correlation (0.62)</div>
                                        <p style={styles.corrDesc}>Beta activity indicates rising workload.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

const getPolyline = (data: any[], key: string, width: number, height: number) => {
    if (data.length < 2) return ''
    const xStep = width / 50
    return data.map((pt, i) => {
        const x = i * xStep
        const y = height - (pt[key] * height)
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')
}

const SpectralCard = ({ label, range, value, color, description }: any) => (
    <div style={{ ...styles.spectralCard, borderLeft: `4px solid ${color}` }}>
        <div style={styles.spectralHeader}>
            <span style={styles.spectralLabel}>{label}</span>
            <span style={styles.spectralRange}>{range}</span>
        </div>
        <div style={styles.spectralMeter}>
            <div style={{ ...styles.meterFill, width: `${value * 100}%`, background: color }} />
        </div>
        <div style={styles.spectralValue}>{(value * 100).toFixed(1)}%</div>
        <div style={styles.spectralDesc}>{description}</div>
    </div>
)

const styles: { [key: string]: React.CSSProperties } = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
    },
    modal: {
        width: '900px', height: '600px',
        background: 'linear-gradient(135deg, #0d2137 0%, #0a1628 100%)',
        borderRadius: '20px', border: '1px solid rgba(0, 212, 255, 0.3)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
    },
    header: {
        padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '15px' },
    icon: { fontSize: '2rem' },
    title: { margin: 0, fontSize: '1.2rem', color: '#fff', fontWeight: 700 },
    subtitle: { margin: 0, fontSize: '0.8rem', color: '#00d4ff' },
    closeBtn: {
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
        fontSize: '1.5rem', cursor: 'pointer', transition: 'color 0.2s'
    },
    content: { flex: 1, display: 'flex' },
    sidebar: {
        width: '200px', background: 'rgba(0,0,0,0.2)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px'
    },
    navBtn: {
        background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)',
        padding: '10px 15px', textAlign: 'left', borderRadius: '8px',
        cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s'
    },
    navBtnActive: {
        background: 'rgba(0, 212, 255, 0.15)', color: '#00d4ff', fontWeight: 600
    },
    mainPanel: { flex: 1, padding: '30px', overflowY: 'auto' },
    spectrumView: { display: 'flex', flexDirection: 'column', gap: '20px' },
    viewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
    badge: {
        background: 'rgba(255, 69, 58, 0.2)', color: '#ff453a',
        padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700
    },
    bandsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' },
    spectralCard: {
        background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '10px',
        display: 'flex', flexDirection: 'column', gap: '8px'
    },
    spectralHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
    spectralLabel: { fontWeight: 700, color: '#fff' },
    spectralRange: { fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' },
    spectralMeter: { height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' },
    meterFill: { height: '100%', transition: 'width 0.3s' },
    spectralValue: { fontSize: '1.2rem', fontWeight: 700, color: '#fff' },
    spectralDesc: { fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' },

    timeView: { height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' },
    chartContainer: {
        flex: 1, background: 'rgba(0,0,0,0.2)', borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.05)', padding: '20px',
        minHeight: '300px'
    },
    legend: { display: 'flex', gap: '20px', justifyContent: 'center', fontSize: '0.8rem' },

    cognitiveView: { display: 'flex', flexDirection: 'column', gap: '20px' },
    correlationGrid: { display: 'flex', gap: '20px' },
    corrCard: {
        flex: 1, background: 'rgba(255,255,255,0.03)', padding: '20px',
        borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)'
    },
    corrValue: { fontSize: '1rem', color: '#00ff88', fontWeight: 600, margin: '10px 0' },
    corrDesc: { fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }
}
