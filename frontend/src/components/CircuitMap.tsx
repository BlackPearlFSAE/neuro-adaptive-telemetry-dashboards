import React, { useState, useEffect } from 'react'
import { TelemetrySyncData } from '../types/telemetry'
import { useCircuit } from '../contexts/CircuitContext'

interface CircuitMapProps {
    telemetrySync: TelemetrySyncData
}

// Silverstone circuit path
const SILVERSTONE_PATH = `
  M 180 200 
  L 220 180 Q 250 170 280 175 
  L 350 195 Q 380 200 400 220 
  L 420 260 Q 430 290 420 320 
  L 400 350 Q 380 370 350 375 
  L 280 365 Q 250 360 230 340 
  L 200 300 Q 180 270 175 240 
  Z
`

// Track position points for car
const TRACK_POINTS = [
    { x: 180, y: 200, sector: 1 }, { x: 200, y: 188, sector: 1 }, { x: 230, y: 178, sector: 1 },
    { x: 270, y: 177, sector: 1 }, { x: 310, y: 185, sector: 1 }, { x: 350, y: 197, sector: 2 },
    { x: 385, y: 212, sector: 2 }, { x: 408, y: 235, sector: 2 }, { x: 420, y: 265, sector: 2 },
    { x: 425, y: 300, sector: 2 }, { x: 415, y: 330, sector: 3 }, { x: 395, y: 355, sector: 3 },
    { x: 365, y: 370, sector: 3 }, { x: 325, y: 370, sector: 3 }, { x: 285, y: 362, sector: 3 },
    { x: 250, y: 350, sector: 1 }, { x: 220, y: 325, sector: 1 }, { x: 200, y: 290, sector: 1 },
    { x: 180, y: 250, sector: 1 }, { x: 175, y: 220, sector: 1 },
]

// getCarPosition moved inline to getCarPositionDynamic

export const CircuitMap: React.FC<CircuitMapProps> = ({ telemetrySync }) => {
    const { activeCircuit } = useCircuit()
    const [speed, setSpeed] = useState(0)
    const [battery, setBattery] = useState(78)
    const [energy, setEnergy] = useState(0)

    // Get track data from active circuit or fallback to defaults
    const trackPath = activeCircuit?.svgPath || SILVERSTONE_PATH
    const trackPoints = activeCircuit?.trackPoints || TRACK_POINTS
    const circuitName = activeCircuit?.name || 'SILVERSTONE'
    const viewBox = activeCircuit?.viewbox || '130 130 340 280'

    // Dynamic car position calculator using active circuit's track points
    const getCarPositionDynamic = (progress: number): { x: number, y: number, sector: number } => {
        const points = trackPoints
        if (points.length === 0) return { x: 300, y: 250, sector: 1 }

        const idx = Math.floor(progress * (points.length - 1))
        const nextIdx = Math.min(idx + 1, points.length - 1)
        const t = (progress * (points.length - 1)) - idx

        return {
            x: points[idx].x + (points[nextIdx].x - points[idx].x) * t,
            y: points[idx].y + (points[nextIdx].y - points[idx].y) * t,
            sector: points[idx].sector
        }
    }

    // Simulate live data
    useEffect(() => {
        const interval = setInterval(() => {
            setSpeed(120 + Math.random() * 80)
            setBattery(prev => Math.max(20, prev - 0.05 + Math.random() * 0.03))
            setEnergy(Math.random() * 100 - 50) // -50 to +50 kW
        }, 500)
        return () => clearInterval(interval)
    }, [])

    const carPos = getCarPositionDynamic(telemetrySync.carPosition)

    const getSectorColor = (sector: number) => {
        if (activeCircuit?.sectors?.[sector - 1]) {
            return activeCircuit.sectors[sector - 1].color
        }
        const colors = ['#a855f7', '#22d3ee', '#4ade80']
        return colors[sector - 1] || colors[0]
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.titleSection}>
                    <h3 style={styles.title}>🏁 {circuitName.toUpperCase()} CIRCUIT</h3>
                    <span style={styles.subtitle}>Live Telemetry Sync</span>
                </div>
                <div style={styles.statusBadge}>
                    <span style={styles.statusDot}>◉</span>
                    <span>{telemetrySync.predictionStatus}</span>
                </div>
            </div>

            {/* Main Map Area */}
            <div style={styles.mapArea}>
                <svg viewBox={viewBox} style={styles.svg}>
                    {/* Track background */}
                    <path d={trackPath} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="25" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Track racing line */}
                    <path d={trackPath} fill="none" stroke="rgba(0, 212, 255, 0.4)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Sector highlights */}
                    <circle cx="280" cy="175" r="6" fill={getSectorColor(1)} opacity="0.8" />
                    <circle cx="420" cy="280" r="6" fill={getSectorColor(2)} opacity="0.8" />
                    <circle cx="320" cy="370" r="6" fill={getSectorColor(3)} opacity="0.8" />

                    {/* Sector labels */}
                    <text x="280" y="160" fill={getSectorColor(1)} fontSize="10" fontWeight="600" textAnchor="middle">S1</text>
                    <text x="438" y="280" fill={getSectorColor(2)} fontSize="10" fontWeight="600" textAnchor="start">S2</text>
                    <text x="320" y="390" fill={getSectorColor(3)} fontSize="10" fontWeight="600" textAnchor="middle">S3</text>

                    {/* Car position */}
                    <g transform={`translate(${carPos.x}, ${carPos.y})`}>
                        {/* Glow effect */}
                        <circle r="18" fill="rgba(0, 255, 136, 0.2)" />
                        <circle r="12" fill="rgba(0, 255, 136, 0.4)" />
                        {/* Car dot */}
                        <circle r="7" fill="#00ff88" stroke="#fff" strokeWidth="2" />
                        {/* Car number */}
                        <text y="3" textAnchor="middle" fill="#0a1628" fontSize="8" fontWeight="800">88</text>
                    </g>
                </svg>

                {/* Speed Overlay */}
                <div style={styles.speedOverlay}>
                    <span style={styles.speedValue}>{Math.round(speed)}</span>
                    <span style={styles.speedUnit}>KPH</span>
                </div>
            </div>

            {/* Telemetry Strip */}
            <div style={styles.telemetryStrip}>
                {/* Sector Times */}
                <div style={styles.sectorBox}>
                    <div style={styles.sectorHeader}>SECTOR TIMES</div>
                    <div style={styles.sectorRow}>
                        <SectorTime sector={1} time="28.456" delta="-0.2" />
                        <SectorTime sector={2} time="33.821" delta="+0.1" />
                        <SectorTime sector={3} time="27.102" delta="-0.4" />
                    </div>
                </div>

                {/* EV Metrics */}
                <div style={styles.evMetrics}>
                    <EVMetric icon="🔋" label="SOC" value={battery.toFixed(1)} unit="%" color={battery > 50 ? '#4ade80' : battery > 25 ? '#fbbf24' : '#ff4757'} />
                    <EVMetric icon="⚡" label="Power" value={energy > 0 ? `+${energy.toFixed(0)}` : energy.toFixed(0)} unit="kW" color={energy > 0 ? '#4ade80' : '#22d3ee'} />
                    <EVMetric icon="🌡️" label="Motor" value="68" unit="°C" color="#fbbf24" />
                </div>
            </div>

            {/* Current Sector Indicator */}
            <div style={{
                ...styles.currentSector,
                background: getSectorColor(carPos.sector) + '20',
                borderColor: getSectorColor(carPos.sector)
            }}>
                <span style={{ color: getSectorColor(carPos.sector) }}>SECTOR {carPos.sector}</span>
            </div>
        </div>
    )
}

// Sub-components
const SectorTime = ({ sector, time, delta }: { sector: number; time: string; delta: string }) => {
    const colors = ['#a855f7', '#22d3ee', '#4ade80']
    const isPositive = delta.startsWith('+')

    return (
        <div style={styles.sectorTime}>
            <span style={{ ...styles.sectorLabel, color: colors[sector - 1] }}>S{sector}</span>
            <span style={styles.sectorValue}>{time}</span>
            <span style={{ ...styles.sectorDelta, color: isPositive ? '#ff4757' : '#00ff88' }}>{delta}</span>
        </div>
    )
}

const EVMetric = ({ icon, label, value, unit, color }: { icon: string; label: string; value: string; unit: string; color: string }) => (
    <div style={styles.evMetric}>
        <span style={styles.evIcon}>{icon}</span>
        <div style={styles.evData}>
            <span style={styles.evLabel}>{label}</span>
            <span style={{ ...styles.evValue, color }}>{value}<small>{unit}</small></span>
        </div>
    </div>
)

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        background: 'linear-gradient(135deg, rgba(13, 33, 55, 0.95) 0%, rgba(10, 22, 40, 0.98) 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        padding: '20px',
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
    },
    titleSection: { display: 'flex', flexDirection: 'column', gap: '2px' },
    title: { fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 },
    subtitle: { fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' },
    statusBadge: {
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '6px 12px', borderRadius: '12px',
        background: 'rgba(0, 255, 136, 0.1)',
        color: '#00ff88', fontSize: '0.7rem', fontWeight: 600,
    },
    statusDot: { animation: 'pulse 2s infinite' },
    mapArea: {
        flex: 1,
        position: 'relative',
        minHeight: '200px',
    },
    svg: {
        width: '100%',
        height: '100%',
    },
    speedOverlay: {
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'rgba(0,0,0,0.7)',
        padding: '10px 16px',
        borderRadius: '10px',
        border: '1px solid rgba(0,212,255,0.3)',
    },
    speedValue: { fontSize: '1.8rem', fontWeight: 800, color: '#fff', fontFamily: 'monospace' },
    speedUnit: { fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' },
    telemetryStrip: {
        display: 'flex',
        gap: '12px',
        marginTop: '15px',
    },
    sectorBox: {
        flex: 1,
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '10px',
        padding: '12px',
    },
    sectorHeader: { fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', letterSpacing: '1px' },
    sectorRow: { display: 'flex', justifyContent: 'space-between' },
    sectorTime: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' },
    sectorLabel: { fontSize: '0.7rem', fontWeight: 700 },
    sectorValue: { fontSize: '0.85rem', fontWeight: 600, color: '#fff', fontFamily: 'monospace' },
    sectorDelta: { fontSize: '0.65rem', fontWeight: 600 },
    evMetrics: {
        display: 'flex',
        gap: '10px',
    },
    evMetric: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '10px',
        padding: '8px 12px',
    },
    evIcon: { fontSize: '1.2rem' },
    evData: { display: 'flex', flexDirection: 'column' },
    evLabel: { fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' },
    evValue: { fontSize: '0.9rem', fontWeight: 700, fontFamily: 'monospace' },
    currentSector: {
        position: 'absolute',
        top: '60px',
        right: '20px',
        padding: '6px 12px',
        borderRadius: '8px',
        border: '1px solid',
        fontSize: '0.7rem',
        fontWeight: 700,
    },
}
