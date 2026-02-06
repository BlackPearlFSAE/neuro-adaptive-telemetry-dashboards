import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface VehicleModalProps {
    isOpen: boolean
    onClose: () => void
}

export const VehicleModal: React.FC<VehicleModalProps> = ({ isOpen, onClose }) => {
    const [telemetry, setTelemetry] = useState<any>(null)
    const [logs, setLogs] = useState<string[]>([])
    const [selectedLog, setSelectedLog] = useState<string>('')
    const [isReplaying, setIsReplaying] = useState(false)
    const [progress, setProgress] = useState(0)
    const [powerMaps, setPowerMaps] = useState<any>({})

    // Fetch logs and power maps on mount
    useEffect(() => {
        if (isOpen) {
            fetch('/api/vehicle/list-logs')
                .then(res => res.json())
                .then(data => {
                    setLogs(data.logs || [])
                    if (data.logs?.length > 0) setSelectedLog(data.logs[0])
                })
            fetch('/api/vehicle/power-maps')
                .then(res => res.json())
                .then(data => setPowerMaps(data.maps || {}))
        }
    }, [isOpen])

    // Poll telemetry
    useEffect(() => {
        if (!isOpen) return

        const interval = setInterval(async () => {
            try {
                const res = await fetch('/api/vehicle')
                if (res.ok) {
                    const data = await res.json()
                    setTelemetry(data)
                    if (data.isReplay) {
                        setProgress((data.replayIndex / data.totalFrames) * 100)
                    }
                }
            } catch (e) {
                console.error("Telemetry fetch error", e)
            }
        }, 100)

        return () => clearInterval(interval)
    }, [isOpen])

    const handleLoadLog = async () => {
        if (!selectedLog) return
        await fetch(`/api/vehicle/load-log?filename=${selectedLog}`, { method: 'POST' })
        setIsReplaying(true)
    }

    const toggleReplay = async () => {
        const newState = !isReplaying
        await fetch(`/api/vehicle/replay?enabled=${newState}`, { method: 'POST' })
        setIsReplaying(newState)
    }

    const setMode = async (mode: string) => {
        await fetch(`/api/vehicle/set-mode?mode=${mode}`, { method: 'POST' })
    }

    const triggerPit = async () => {
        await fetch('/api/vehicle/pit-stop', { method: 'POST' })
    }

    const activateAttackMode = async () => {
        await fetch('/api/vehicle/attack-mode', { method: 'POST' })
    }

    const setRegenLevel = async (level: number) => {
        await fetch(`/api/vehicle/regen-level/${level}`, { method: 'POST' })
    }

    const setPowerMap = async (mapId: number) => {
        await fetch(`/api/vehicle/power-map/${mapId}`, { method: 'POST' })
    }

    if (!isOpen) return null

    // Status color helpers
    const getStatusColor = (val: boolean) => val ? '#10b981' : '#ef4444'
    const getTempColor = (temp: number) => {
        if (temp < 40) return '#3b82f6'
        if (temp < 90) return '#10b981'
        if (temp < 110) return '#f59e0b'
        return '#ef4444'
    }
    const getCellColor = (voltage: number) => {
        if (voltage < 3.3) return '#ef4444'
        if (voltage < 3.5) return '#f59e0b'
        if (voltage < 3.9) return '#10b981'
        return '#3b82f6'
    }

    const energy = telemetry?.energyManagement
    const powerMap = telemetry?.powerMap
    const cells = telemetry?.cellMonitoring

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={styles.overlay}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    style={styles.modal}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div style={styles.header}>
                        <div style={styles.titleBlock}>
                            <span style={styles.icon}>🏎️</span>
                            <h2 style={styles.title}>EV FORMULA TELEMETRY</h2>
                        </div>

                        {/* Replay Controls */}
                        <div style={styles.controls}>
                            <select
                                style={styles.select}
                                value={selectedLog}
                                onChange={e => setSelectedLog(e.target.value)}
                            >
                                {logs.map(log => <option key={log} value={log}>{log}</option>)}
                            </select>
                            <button style={styles.btnPrimary} onClick={handleLoadLog}>LOAD</button>
                            <button style={{ ...styles.btnControl, background: isReplaying ? '#ef4444' : '#10b981' }} onClick={toggleReplay}>
                                {isReplaying ? 'PAUSE' : 'PLAY'}
                            </button>
                            <div style={styles.progressBar}>
                                <div style={{ ...styles.progressFill, width: `${progress}%` }} />
                            </div>
                        </div>

                        {/* Mode Selectors */}
                        <div style={styles.modeControls}>
                            {['SAFETY', 'RACE', 'ATTACK', 'QUALI'].map(m => (
                                <button
                                    key={m}
                                    style={{
                                        ...styles.modeBtn,
                                        background: telemetry?.motor?.mode === m ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                                        color: telemetry?.motor?.mode === m ? '#000' : '#fff'
                                    }}
                                    onClick={() => setMode(m)}
                                >
                                    {m}
                                </button>
                            ))}
                            <button style={styles.pitBtn} onClick={triggerPit}>PIT BOX</button>
                        </div>

                        <button style={styles.closeButton} onClick={onClose}>×</button>
                    </div>

                    {/* Main Grid - 4 columns for more content */}
                    <div style={styles.grid}>

                        {/* Col 1: Powertrain */}
                        <div style={styles.column}>
                            <div style={styles.card}>
                                <h3 style={styles.cardTitle}>HV BATTERY</h3>
                                <div style={styles.metricRow}>
                                    <span style={styles.label}>VOLTAGE</span>
                                    <span style={styles.value}>{telemetry?.battery?.voltage ?? 0} V</span>
                                </div>
                                <div style={styles.metricRow}>
                                    <span style={styles.label}>CURRENT</span>
                                    <span style={styles.value}>{telemetry?.battery?.current ?? 0} A</span>
                                </div>
                                <div style={styles.metricRow}>
                                    <span style={styles.label}>SOC</span>
                                    <span style={{ ...styles.value, color: getTempColor(100 - (telemetry?.battery?.soc ?? 0)) }}>
                                        {telemetry?.battery?.soc ?? 0}%
                                    </span>
                                </div>
                            </div>

                            <div style={styles.card}>
                                <h3 style={styles.cardTitle}>MOTOR / INVERTER</h3>
                                <div style={styles.metricRow}>
                                    <span style={styles.label}>RPM</span>
                                    <span style={{ ...styles.value, fontFamily: 'monospace' }}>
                                        {telemetry?.motor?.rpm ?? 0}
                                    </span>
                                </div>
                                <div style={styles.metricRow}>
                                    <span style={styles.label}>POWER</span>
                                    <span style={styles.value}>{(telemetry?.motor?.power_kw ?? 0).toFixed(1)} kW</span>
                                </div>
                                <div style={styles.metricRow}>
                                    <span style={styles.label}>TEMP</span>
                                    <span style={{ ...styles.value, color: getTempColor(telemetry?.motor?.temperature ?? 0) }}>
                                        {telemetry?.motor?.temperature ?? 0}°C
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Col 2: Energy Management + Power Map */}
                        <div style={styles.column}>
                            {/* Attack Mode */}
                            <div style={{ ...styles.card, background: energy?.attack_mode_active ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.03)' }}>
                                <h3 style={styles.cardTitle}>⚡ ATTACK MODE</h3>
                                <button
                                    style={{
                                        ...styles.attackBtn,
                                        background: energy?.attack_mode_active ? '#f59e0b' : '#374151',
                                        opacity: energy?.attack_mode_activations >= 2 && !energy?.attack_mode_active ? 0.5 : 1
                                    }}
                                    onClick={activateAttackMode}
                                    disabled={energy?.attack_mode_activations >= 2 && !energy?.attack_mode_active}
                                >
                                    {energy?.attack_mode_active ? `ACTIVE: ${Math.round(energy?.attack_mode_remaining)}s` : 'ACTIVATE'}
                                </button>
                                <div style={styles.metricRow}>
                                    <span style={styles.label}>ACTIVATIONS</span>
                                    <span style={styles.value}>{energy?.attack_mode_activations ?? 0}/2</span>
                                </div>
                                <div style={styles.metricRow}>
                                    <span style={styles.label}>BOOST</span>
                                    <span style={{ ...styles.value, color: '#f59e0b' }}>+35 kW</span>
                                </div>
                            </div>

                            {/* Regen Level */}
                            <div style={styles.card}>
                                <h3 style={styles.cardTitle}>🔋 REGEN LEVEL</h3>
                                <div style={styles.regenSlider}>
                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(lvl => (
                                        <button
                                            key={lvl}
                                            style={{
                                                ...styles.regenBtn,
                                                background: (energy?.regen_level ?? 5) >= lvl ? '#3b82f6' : '#1e293b',
                                            }}
                                            onClick={() => setRegenLevel(lvl)}
                                        >
                                            {lvl}
                                        </button>
                                    ))}
                                </div>
                                <div style={styles.metricRow}>
                                    <span style={styles.label}>HARVEST</span>
                                    <span style={{ ...styles.value, color: '#3b82f6' }}>{energy?.harvest_rate ?? 0} kW</span>
                                </div>
                                <div style={styles.metricRow}>
                                    <span style={styles.label}>NET FLOW</span>
                                    <span style={{ ...styles.value, color: (energy?.net_energy_flow ?? 0) > 0 ? '#ef4444' : '#10b981' }}>
                                        {(energy?.net_energy_flow ?? 0) > 0 ? '+' : ''}{energy?.net_energy_flow ?? 0} kW
                                    </span>
                                </div>
                            </div>

                            {/* Power Map Selector */}
                            <div style={styles.card}>
                                <h3 style={styles.cardTitle}>🎛️ POWER MAP: {powerMap?.name ?? 'RACE'}</h3>
                                <div style={styles.powerMapGrid}>
                                    {Object.entries(powerMaps).map(([id, map]: [string, any]) => (
                                        <button
                                            key={id}
                                            style={{
                                                ...styles.mapBtn,
                                                background: powerMap?.map_id === Number(id) ? '#8b5cf6' : '#1e293b',
                                            }}
                                            onClick={() => setPowerMap(Number(id))}
                                            title={`${map.power_limit} kW · ${map.torque_pct}% Torque`}
                                        >
                                            {map.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Col 3: G-Force + Car */}
                        <div style={styles.centerColumn}>
                            <div style={styles.gForceContainer}>
                                <h4 style={styles.subHeader}>G-FORCE</h4>
                                <svg viewBox="-2 -2 4 4" style={styles.gForceSvg}>
                                    <circle cx="0" cy="0" r="1.5" fill="none" stroke="#333" strokeWidth="0.05" />
                                    <circle cx="0" cy="0" r="1.0" fill="none" stroke="#444" strokeWidth="0.05" />
                                    <circle cx="0" cy="0" r="0.5" fill="none" stroke="#444" strokeWidth="0.05" />
                                    <line x1="-1.5" y1="0" x2="1.5" y2="0" stroke="#333" strokeWidth="0.05" />
                                    <line x1="0" y1="-1.5" x2="0" y2="1.5" stroke="#333" strokeWidth="0.05" />
                                    <circle
                                        cx={telemetry?.chassis?.acceleration_g?.lateral ?? 0}
                                        cy={-(telemetry?.chassis?.acceleration_g?.longitudinal ?? 0)}
                                        r="0.15"
                                        fill="#f59e0b"
                                    />
                                </svg>
                                <div style={styles.gValues}>
                                    Lat: {telemetry?.chassis?.acceleration_g?.lateral ?? 0} |
                                    Long: {telemetry?.chassis?.acceleration_g?.longitudinal ?? 0}
                                </div>
                            </div>

                            <div style={styles.card}>
                                <h3 style={styles.cardTitle}>SAFETY LOOP</h3>
                                <div style={styles.safetyGrid}>
                                    <div style={{ ...styles.safetyInd, borderColor: getStatusColor(telemetry?.chassis?.safety?.hv_on) }}>HV</div>
                                    <div style={{ ...styles.safetyInd, borderColor: getStatusColor(telemetry?.chassis?.safety?.imd_ok) }}>IMD</div>
                                    <div style={{ ...styles.safetyInd, borderColor: getStatusColor(telemetry?.chassis?.safety?.ams_ok) }}>AMS</div>
                                    <div style={{ ...styles.safetyInd, borderColor: getStatusColor(telemetry?.chassis?.safety?.bspd_ok) }}>BSPD</div>
                                </div>
                            </div>
                        </div>

                        {/* Col 4: Cell Monitoring */}
                        <div style={styles.column}>
                            <div style={styles.card}>
                                <h3 style={styles.cardTitle}>🔬 CELL MONITORING ({cells?.cell_count ?? 96} CELLS)</h3>

                                {/* Cell Voltage Grid */}
                                <div style={styles.cellGrid}>
                                    {(cells?.cell_voltages?.slice(0, 48) ?? []).map((v: number, i: number) => (
                                        <div
                                            key={i}
                                            style={{
                                                ...styles.cellDot,
                                                background: getCellColor(v),
                                            }}
                                            title={`Cell ${i + 1}: ${v.toFixed(3)}V`}
                                        />
                                    ))}
                                </div>

                                <div style={styles.cellStats}>
                                    <div style={styles.metricRow}>
                                        <span style={styles.label}>V RANGE</span>
                                        <span style={styles.value}>
                                            {cells?.min_cell_voltage ?? 0}V - {cells?.max_cell_voltage ?? 0}V
                                        </span>
                                    </div>
                                    <div style={styles.metricRow}>
                                        <span style={styles.label}>Δ VOLTAGE</span>
                                        <span style={{ ...styles.value, color: (cells?.voltage_delta ?? 0) > 0.05 ? '#f59e0b' : '#10b981' }}>
                                            {(cells?.voltage_delta ?? 0).toFixed(3)}V
                                        </span>
                                    </div>
                                    <div style={styles.metricRow}>
                                        <span style={styles.label}>TEMP RANGE</span>
                                        <span style={styles.value}>
                                            {cells?.min_cell_temp ?? 0}°C - {cells?.max_cell_temp ?? 0}°C
                                        </span>
                                    </div>
                                    <div style={styles.metricRow}>
                                        <span style={styles.label}>BALANCING</span>
                                        <span style={{ ...styles.value, color: cells?.balancing_active ? '#f59e0b' : '#10b981' }}>
                                            {cells?.balancing_active ? 'ACTIVE' : 'IDLE'}
                                        </span>
                                    </div>
                                    <div style={styles.metricRow}>
                                        <span style={styles.label}>PACK HEALTH</span>
                                        <span style={{ ...styles.value, color: (cells?.pack_health_pct ?? 100) > 90 ? '#10b981' : '#f59e0b' }}>
                                            {cells?.pack_health_pct ?? 100}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div style={styles.card}>
                                <h3 style={styles.cardTitle}>PEDALS</h3>
                                <div style={styles.pedalRow}>
                                    <div style={styles.pedalLabel}>THR</div>
                                    <div style={styles.pedalTrack}>
                                        <div style={{ ...styles.pedalFill, width: `${telemetry?.chassis?.safety?.apps ?? 0}%`, background: '#10b981' }} />
                                    </div>
                                    <span style={styles.pedalVal}>{Math.round(telemetry?.chassis?.safety?.apps ?? 0)}%</span>
                                </div>
                                <div style={styles.pedalRow}>
                                    <div style={styles.pedalLabel}>BRK</div>
                                    <div style={styles.pedalTrack}>
                                        <div style={{ ...styles.pedalFill, width: `${telemetry?.chassis?.safety?.bpps ?? 0}%`, background: '#ef4444' }} />
                                    </div>
                                    <span style={styles.pedalVal}>{Math.round(telemetry?.chassis?.safety?.bpps ?? 0)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

const styles: { [key: string]: React.CSSProperties } = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    modal: { width: '1200px', height: '700px', background: 'linear-gradient(135deg, rgba(13, 18, 30, 0.98) 0%, rgba(10, 10, 15, 0.98) 100%)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' },
    header: { padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', flexWrap: 'wrap', gap: '10px' },
    titleBlock: { display: 'flex', alignItems: 'center', gap: '10px' },
    icon: { fontSize: '1.3rem' },
    title: { margin: 0, fontSize: '1.1rem', color: '#fff', letterSpacing: '1px', fontWeight: 600 },
    controls: { display: 'flex', alignItems: 'center', gap: '10px', flex: 1, marginLeft: '20px', marginRight: '15px' },
    modeControls: { display: 'flex', gap: '6px' },
    modeBtn: { border: '1px solid rgba(255,255,255,0.2)', padding: '5px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' },
    pitBtn: { background: '#ef4444', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' },
    select: { background: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '5px 10px', borderRadius: '4px', fontSize: '0.75rem' },
    btnPrimary: { background: '#3b82f6', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem' },
    btnControl: { color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', minWidth: '70px', fontSize: '0.75rem' },
    progressBar: { flex: 1, height: '5px', background: '#334155', borderRadius: '3px', overflow: 'hidden', minWidth: '60px' },
    progressFill: { height: '100%', background: '#60a5fa', transition: 'width 0.1s linear' },
    closeButton: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '22px', cursor: 'pointer' },

    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr 0.9fr 1.1fr', gap: '16px', padding: '16px', flex: 1, overflowY: 'auto' },
    column: { display: 'flex', flexDirection: 'column', gap: '14px' },
    centerColumn: { display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' },

    card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px' },
    cardTitle: { margin: '0 0 12px 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '1px', fontWeight: 600 },
    metricRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
    label: { fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' },
    value: { fontSize: '0.9rem', fontWeight: 600, color: '#fff' },

    // Attack Mode
    attackBtn: { width: '100%', padding: '12px', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', marginBottom: '10px', transition: 'all 0.2s' },

    // Regen Slider
    regenSlider: { display: 'flex', gap: '3px', marginBottom: '10px' },
    regenBtn: { flex: 1, padding: '6px 0', border: 'none', borderRadius: '3px', color: '#fff', fontWeight: 600, fontSize: '0.65rem', cursor: 'pointer' },

    // Power Map Grid
    powerMapGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' },
    mapBtn: { padding: '5px 2px', border: 'none', borderRadius: '3px', color: '#fff', fontWeight: 600, fontSize: '0.55rem', cursor: 'pointer', textAlign: 'center' },

    // G-Force
    gForceContainer: { width: '100%', height: '160px', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' },
    gForceSvg: { height: '140px', width: '140px' },
    subHeader: { position: 'absolute', top: 0, left: 10, margin: 0, fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' },
    gValues: { fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' },

    // Safety
    safetyGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
    safetyInd: { textAlign: 'center' as const, padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', border: '2px solid #333', color: '#fff', fontSize: '0.75rem', fontWeight: 700 },

    // Cells
    cellGrid: { display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2px', marginBottom: '10px' },
    cellDot: { width: '100%', paddingBottom: '100%', borderRadius: '2px' },
    cellStats: { marginTop: '8px' },

    // Pedals
    pedalRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' },
    pedalLabel: { width: '28px', fontSize: '0.65rem', color: '#888' },
    pedalTrack: { flex: 1, height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden' },
    pedalFill: { height: '100%' },
    pedalVal: { width: '30px', textAlign: 'right' as const, fontSize: '0.7rem', fontFamily: 'monospace', color: '#fff' }
}
