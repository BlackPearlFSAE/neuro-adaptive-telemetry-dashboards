import React, { useState, useEffect } from 'react'
import { AdaptiveInterventionData, InterventionUpdate } from '../types/telemetry'

interface AdaptiveInterventionProps {
    intervention: AdaptiveInterventionData
    onUpdate: (update: InterventionUpdate) => void
}

export const AdaptiveIntervention: React.FC<AdaptiveInterventionProps> = ({
    intervention,
    onUpdate
}) => {
    const [mode, setMode] = useState<'AUTO' | 'MANUAL'>('AUTO')
    const [intensity, setIntensity] = useState(0)

    // Simulate varying intervention intensity based on mode
    useEffect(() => {
        const interval = setInterval(() => {
            setIntensity(prev => {
                const target = mode === 'AUTO' ? 30 + Math.random() * 40 : prev
                return prev + (target - prev) * 0.1
            })
        }, 100)
        return () => clearInterval(interval)
    }, [mode])

    return (
        <div style={styles.card}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.titleRow}>
                    <div style={styles.iconBox}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            <path d="M12 8v4" />
                            <path d="M12 16h.01" />
                        </svg>
                    </div>
                    <div>
                        <div style={styles.title}>ADAPTIVE CONTROLLER</div>
                        <div style={styles.subtitle}>Active Safety Systems</div>
                    </div>
                </div>
                <div style={styles.statusBadge}>
                    <span style={{ ...styles.statusDot, background: mode === 'AUTO' ? '#00ff88' : '#ffa502' }} />
                    {mode === 'AUTO' ? 'AI ACTIVE' : 'MANUAL'}
                </div>
            </div>

            {/* Protocol Level / Intensity */}
            <div style={styles.mainDisplay}>
                <div style={styles.intensityRing}>
                    <svg width="120" height="120" viewBox="0 0 120 120">
                        {/* Background Ring */}
                        <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                        {/* Active Ring */}
                        <circle
                            cx="60" cy="60" r="54"
                            fill="none"
                            stroke="url(#gradient)"
                            strokeWidth="8"
                            strokeDasharray={339.292}
                            strokeDashoffset={339.292 * (1 - intensity / 100)}
                            strokeLinecap="round"
                            transform="rotate(-90 60 60)"
                        />
                        <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#00d4ff" />
                                <stop offset="100%" stopColor="#00ff88" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div style={styles.intensityValue}>
                        <span style={styles.intensityNum}>{Math.round(intensity)}</span>
                        <span style={styles.intensityUnit}>%</span>
                    </div>
                    <div style={styles.intensityLabel}>INTERVENTION</div>
                </div>

                <div style={styles.modeSwitch}>
                    <button
                        style={{ ...styles.modeBtn, opacity: mode === 'MANUAL' ? 1 : 0.5 }}
                        onClick={() => setMode('MANUAL')}
                    >MANUAL</button>
                    <button
                        style={{ ...styles.modeBtn, opacity: mode === 'AUTO' ? 1 : 0.5, borderColor: '#00ff88', color: '#00ff88' }}
                        onClick={() => setMode('AUTO')}
                    >AUTO AI</button>
                </div>
            </div>

            {/* Trigger Factors */}
            <div style={styles.section}>
                <div style={styles.sectionTitle}>TRIGGER FACTORS</div>
                <div style={styles.factorsGrid}>
                    <FactorBar label="Stress Load" value={72} color="#ff4757" />
                    <FactorBar label="Fatigue" value={24} color="#fbbf24" />
                    <FactorBar label="G-Force" value={56} color="#00d4ff" />
                    <FactorBar label="Traction" value={88} color="#00ff88" />
                </div>
            </div>

            {/* System Responses */}
            <div style={styles.section}>
                <div style={styles.sectionTitle}>SYSTEM RESPONSE</div>

                {/* Throttle Mapping */}
                <div style={styles.controlRow}>
                    <div style={styles.controlInfo}>
                        <div style={styles.controlName}>Throttle Map</div>
                        <div style={styles.controlStatus}>{intervention.throttleMapping}</div>
                    </div>
                    <div style={styles.responseBar}>
                        <div style={{ ...styles.responsefill, width: intervention.throttleMapping === 'PROGRESSIVE' ? '80%' : '40%' }} />
                    </div>
                    <button
                        style={styles.toggleBtn}
                        onClick={() => onUpdate({ throttleMapping: intervention.throttleMapping === 'LINEAR' ? 'PROGRESSIVE' : 'LINEAR' })}
                    >TOGGLE</button>
                </div>

                {/* Cognitive HUD */}
                <div style={styles.controlRow}>
                    <div style={styles.controlInfo}>
                        <div style={styles.controlName}>UI Density</div>
                        <div style={styles.controlStatus}>{intervention.cognitiveLoadHud}</div>
                    </div>
                    <div style={styles.responseBar}>
                        <div style={{ ...styles.responsefill, width: intervention.cognitiveLoadHud === 'REDUCED' ? '30%' : '100%' }} />
                    </div>
                    <button
                        style={styles.toggleBtn}
                        onClick={() => onUpdate({ cognitiveLoadHud: intervention.cognitiveLoadHud === 'FULL' ? 'REDUCED' : 'FULL' })}
                    >TOGGLE</button>
                </div>

                {/* Haptic Feedback */}
                <div style={styles.controlRow}>
                    <div style={styles.controlInfo}>
                        <div style={styles.controlName}>Haptics</div>
                        <div style={styles.controlStatus}>{intervention.hapticSteering}</div>
                    </div>
                    <div style={styles.responseBar}>
                        <div style={{ ...styles.responsefill, width: intervention.hapticSteering === 'ENHANCED' ? '90%' : '50%' }} />
                    </div>
                    <button
                        style={styles.toggleBtn}
                        onClick={() => onUpdate({ hapticSteering: intervention.hapticSteering === 'NOMINAL' ? 'ENHANCED' : 'NOMINAL' })}
                    >TOGGLE</button>
                </div>
            </div>
        </div>
    )
}

const FactorBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div style={styles.factorItem}>
        <div style={styles.factorHeader}>
            <span style={styles.factorLabel}>{label}</span>
            <span style={{ ...styles.factorValue, color }}>{value}%</span>
        </div>
        <div style={styles.factorTrack}>
            <div style={{ ...styles.factorFill, width: `${value}%`, background: color }} />
        </div>
    </div>
)

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
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
    },
    titleRow: { display: 'flex', alignItems: 'center', gap: '12px' },
    iconBox: {
        width: '40px', height: '40px', borderRadius: '10px',
        background: 'rgba(0, 212, 255, 0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid rgba(0, 212, 255, 0.3)',
    },
    title: { fontSize: '0.9rem', fontWeight: 700, color: '#fff', letterSpacing: '1px' },
    subtitle: { fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' },
    statusBadge: {
        padding: '6px 12px', borderRadius: '20px',
        background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', gap: '8px',
        fontSize: '0.7rem', fontWeight: 700, color: '#fff',
    },
    statusDot: { width: '8px', height: '8px', borderRadius: '50%', boxShadow: '0 0 8px currentColor' },
    mainDisplay: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        padding: '0 10px',
    },
    intensityRing: {
        position: 'relative',
        width: '120px', height: '120px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    intensityValue: {
        position: 'absolute',
        display: 'flex', alignItems: 'baseline',
    },
    intensityNum: { fontSize: '2.5rem', fontWeight: 700, color: '#fff', fontFamily: 'monospace' },
    intensityUnit: { fontSize: '1rem', color: 'rgba(255,255,255,0.5)', marginLeft: '2px' },
    intensityLabel: {
        position: 'absolute', bottom: '20px',
        fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600,
    },
    modeSwitch: {
        display: 'flex', flexDirection: 'column', gap: '10px',
    },
    modeBtn: {
        padding: '10px 20px', border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '8px', background: 'transparent', color: '#fff',
        fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
        transition: 'all 0.2s', width: '120px',
    },
    section: { marginBottom: '20px' },
    sectionTitle: {
        fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)',
        marginBottom: '12px', letterSpacing: '1px',
    },
    factorsGrid: {
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
    },
    factorItem: {
        background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '10px',
    },
    factorHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' },
    factorLabel: { fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' },
    factorValue: { fontSize: '0.8rem', fontWeight: 700 },
    factorTrack: { height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' },
    factorFill: { height: '100%', borderRadius: '2px', transition: 'width 0.5s ease' },
    controlRow: {
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px', background: 'rgba(0,0,0,0.3)',
        borderRadius: '10px', marginBottom: '8px',
        border: '1px solid rgba(255,255,255,0.05)',
    },
    controlInfo: { width: '80px' },
    controlName: { fontSize: '0.75rem', fontWeight: 600, color: '#fff' },
    controlStatus: { fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' },
    responseBar: { flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' },
    responsefill: { height: '100%', background: '#00d4ff', borderRadius: '3px', transition: 'width 0.3s ease' },
    toggleBtn: {
        padding: '6px 12px', border: '1px solid rgba(0,212,255,0.2)',
        borderRadius: '6px', background: 'rgba(0,212,255,0.1)',
        color: '#00d4ff', fontSize: '0.7rem', fontWeight: 700,
        cursor: 'pointer',
    },
}
