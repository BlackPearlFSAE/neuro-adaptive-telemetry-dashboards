/**
 * VehicleModal.tsx
 * ================
 * Premium 3D CAD-style Vehicle Dashboard with Real-time Telemetry Sync
 * BP16 EV Formula - Global Technician Analysis System
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { VehicleScene, ComponentDetailsPanel, Subsystem, VehicleTelemetryData, CameraPreset } from '../3d'

interface VehicleModalProps {
    isOpen: boolean
    onClose: () => void
}

// View modes
type ViewMode = '3d' | 'data' | 'split'

export const VehicleModal: React.FC<VehicleModalProps> = ({ isOpen, onClose }) => {
    // State
    const [telemetry, setTelemetry] = useState<any>(null)
    const [logs, setLogs] = useState<string[]>([])
    const [selectedLog, setSelectedLog] = useState<string>('')
    const [isReplaying, setIsReplaying] = useState(false)
    const [progress, setProgress] = useState(0)
    const [powerMaps, setPowerMaps] = useState<any>({})

    // 3D State
    const [selectedComponent, setSelectedComponent] = useState<Subsystem | null>(null)
    const [cameraPreset, setCameraPreset] = useState<CameraPreset>('isometric')
    const [viewMode, setViewMode] = useState<ViewMode>('3d')
    const [showGrid, setShowGrid] = useState(true)
    const [showEffects, setShowEffects] = useState(true)

    // WebSocket ref for 60Hz updates
    const wsRef = useRef<WebSocket | null>(null)
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // WebSocket connection for real-time telemetry
    const connectWebSocket = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return

        try {
            const wsUrl = `ws://${window.location.hostname}:8001/ws/vehicle`
            wsRef.current = new WebSocket(wsUrl)

            wsRef.current.onopen = () => {
                console.log('🚗 Vehicle WebSocket connected (60Hz)')
            }

            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    setTelemetry(data)
                    if (data.isReplay) {
                        setProgress((data.replayIndex / data.totalFrames) * 100)
                    }
                } catch (e) {
                    console.error('WebSocket parse error', e)
                }
            }

            wsRef.current.onclose = () => {
                console.log('Vehicle WebSocket disconnected, reconnecting...')
                reconnectTimeoutRef.current = setTimeout(connectWebSocket, 2000)
            }

            wsRef.current.onerror = (err) => {
                console.error('WebSocket error', err)
                wsRef.current?.close()
            }
        } catch (e) {
            // Fallback to polling if WebSocket fails
            console.log('WebSocket unavailable, using polling fallback')
        }
    }, [])

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

            // Try WebSocket first, fallback to polling
            connectWebSocket()
        }

        return () => {
            wsRef.current?.close()
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
            }
        }
    }, [isOpen, connectWebSocket])

    // Polling fallback if WebSocket not available
    useEffect(() => {
        if (!isOpen) return

        // Only poll if WebSocket is not connected
        const interval = setInterval(async () => {
            if (wsRef.current?.readyState !== WebSocket.OPEN) {
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
            }
        }, 100)

        return () => clearInterval(interval)
    }, [isOpen])

    // Control handlers
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

    const energy = telemetry?.energyManagement
    const powerMap = telemetry?.powerMap
    // Cell monitoring data available via telemetry?.cellMonitoring if needed

    // Convert telemetry to 3D component format
    const telemetryData: VehicleTelemetryData = {
        motor: telemetry?.motor,
        battery: telemetry?.battery,
        brakes: telemetry?.brakes,
        tires: telemetry?.tires,
        chassis: telemetry?.chassis,
        overallStatus: telemetry?.overallStatus
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={styles.overlay}
                onClick={(e) => {
                    // Only close when clicking directly on overlay, not bubbled events
                    if (e.target === e.currentTarget) {
                        onClose()
                    }
                }}
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
                            <div>
                                <h2 style={styles.title}>BP16 EV FORMULA</h2>
                                <span style={styles.subtitle}>3D CAD TECHNICIAN DASHBOARD</span>
                            </div>
                        </div>

                        {/* View Mode Toggle */}
                        <div style={styles.viewToggle}>
                            {(['3d', 'data', 'split'] as ViewMode[]).map(mode => (
                                <button
                                    key={mode}
                                    style={{
                                        ...styles.viewBtn,
                                        background: viewMode === mode ? '#00d4ff' : 'rgba(255,255,255,0.1)',
                                        color: viewMode === mode ? '#000' : '#fff'
                                    }}
                                    onClick={() => setViewMode(mode)}
                                >
                                    {mode === '3d' ? '🎮 3D' : mode === 'data' ? '📊 Data' : '⚡ Split'}
                                </button>
                            ))}
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

                    {/* Main Content */}
                    <div style={styles.mainContent}>
                        {/* Left Sidebar - Camera & Options (only in 3D/Split mode) */}
                        {(viewMode === '3d' || viewMode === 'split') && (
                            <div style={styles.leftSidebar}>
                                <div style={styles.sidebarSection}>
                                    <h4 style={styles.sidebarTitle}>CAMERA</h4>
                                    {(['isometric', 'front', 'side', 'top', 'rear'] as CameraPreset[]).map(preset => (
                                        <button
                                            key={preset}
                                            style={{
                                                ...styles.cameraBtn,
                                                background: cameraPreset === preset ? 'rgba(0, 212, 255, 0.2)' : 'transparent',
                                                borderColor: cameraPreset === preset ? '#00d4ff' : 'rgba(255,255,255,0.1)'
                                            }}
                                            onClick={() => setCameraPreset(preset)}
                                        >
                                            {preset.charAt(0).toUpperCase() + preset.slice(1)}
                                        </button>
                                    ))}
                                </div>

                                <div style={styles.sidebarSection}>
                                    <h4 style={styles.sidebarTitle}>OPTIONS</h4>
                                    <label style={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={showGrid}
                                            onChange={e => setShowGrid(e.target.checked)}
                                        />
                                        Show Grid
                                    </label>
                                    <label style={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={showEffects}
                                            onChange={e => setShowEffects(e.target.checked)}
                                        />
                                        Effects
                                    </label>
                                </div>

                                <div style={styles.sidebarSection}>
                                    <h4 style={styles.sidebarTitle}>STATUS</h4>
                                    <div style={{
                                        ...styles.statusIndicator,
                                        borderColor: telemetry?.overallStatus === 'optimal' ? '#10b981' :
                                            telemetry?.overallStatus === 'warning' ? '#f59e0b' : '#ef4444'
                                    }}>
                                        {telemetry?.overallStatus?.toUpperCase() || 'LOADING'}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3D Viewport */}
                        {(viewMode === '3d' || viewMode === 'split') && (
                            <div style={{
                                ...styles.viewport,
                                flex: viewMode === 'split' ? 1 : 2
                            }}>
                                <VehicleScene
                                    telemetry={telemetryData}
                                    selectedComponent={selectedComponent}
                                    onSelectComponent={setSelectedComponent}
                                    cameraPreset={cameraPreset}
                                    showGrid={showGrid}
                                    showEffects={showEffects}
                                />
                            </div>
                        )}

                        {/* Right Panel - Component Details or Data Grid */}
                        <div style={{
                            ...styles.rightPanel,
                            width: viewMode === 'data' ? '100%' : '300px'
                        }}>
                            {(viewMode === '3d' || viewMode === 'split') && (
                                <ComponentDetailsPanel
                                    selectedComponent={selectedComponent}
                                    telemetry={telemetryData}
                                    onClose={() => setSelectedComponent(null)}
                                />
                            )}

                            {/* Data Grid (shown in data/split mode) */}
                            {(viewMode === 'data' || viewMode === 'split') && (
                                <div style={styles.dataGrid}>
                                    {/* HV Battery Card */}
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

                                    {/* Motor Card */}
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

                                    {/* Attack Mode Card */}
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
                                    </div>

                                    {/* Regen Level Card */}
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
                                    </div>

                                    {/* Safety Loop Card */}
                                    <div style={styles.card}>
                                        <h3 style={styles.cardTitle}>SAFETY LOOP</h3>
                                        <div style={styles.safetyGrid}>
                                            <div style={{ ...styles.safetyInd, borderColor: getStatusColor(telemetry?.chassis?.safety?.hv_on) }}>HV</div>
                                            <div style={{ ...styles.safetyInd, borderColor: getStatusColor(telemetry?.chassis?.safety?.imd_ok) }}>IMD</div>
                                            <div style={{ ...styles.safetyInd, borderColor: getStatusColor(telemetry?.chassis?.safety?.ams_ok) }}>AMS</div>
                                            <div style={{ ...styles.safetyInd, borderColor: getStatusColor(telemetry?.chassis?.safety?.bspd_ok) }}>BSPD</div>
                                        </div>
                                    </div>

                                    {/* Power Map Card */}
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
                            )}
                        </div>
                    </div>

                    {/* Footer Status Bar */}
                    <div style={styles.footer}>
                        <div style={styles.footerItem}>
                            <span style={styles.footerLabel}>SPEED</span>
                            <span style={styles.footerValue}>{telemetry?.chassis?.speed_kph?.toFixed(0) ?? 0} km/h</span>
                        </div>
                        <div style={styles.footerItem}>
                            <span style={styles.footerLabel}>LAP</span>
                            <span style={styles.footerValue}>{telemetry?.lap?.current ?? 1}</span>
                        </div>
                        <div style={styles.footerItem}>
                            <span style={styles.footerLabel}>G-FORCE</span>
                            <span style={styles.footerValue}>
                                {telemetry?.chassis?.acceleration_g?.lateral?.toFixed(1) ?? 0}G / {telemetry?.chassis?.acceleration_g?.longitudinal?.toFixed(1) ?? 0}G
                            </span>
                        </div>
                        <div style={styles.footerItem}>
                            <span style={styles.footerLabel}>ENERGY</span>
                            <span style={styles.footerValue}>{telemetry?.battery?.soc?.toFixed(0) ?? 0}%</span>
                        </div>
                        <div style={{
                            ...styles.wsStatus,
                            background: wsRef.current?.readyState === WebSocket.OPEN ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            borderColor: wsRef.current?.readyState === WebSocket.OPEN ? '#10b981' : '#ef4444'
                        }}>
                            {wsRef.current?.readyState === WebSocket.OPEN ? '● 60Hz LIVE' : '○ POLLING'}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

const styles: { [key: string]: React.CSSProperties } = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.9)',
        backdropFilter: 'blur(12px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    modal: {
        width: '95vw',
        height: '90vh',
        maxWidth: '1600px',
        background: 'linear-gradient(135deg, rgba(13, 18, 30, 0.98) 0%, rgba(10, 10, 15, 0.98) 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 0 60px rgba(0, 212, 255, 0.15)'
    },
    header: {
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        flexWrap: 'wrap',
        gap: '10px',
        background: 'rgba(0,0,0,0.3)'
    },
    titleBlock: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    icon: {
        fontSize: '1.8rem'
    },
    title: {
        margin: 0,
        fontSize: '1.1rem',
        color: '#fff',
        letterSpacing: '2px',
        fontWeight: 700
    },
    subtitle: {
        fontSize: '0.65rem',
        color: '#00d4ff',
        letterSpacing: '1px'
    },
    viewToggle: {
        display: 'flex',
        gap: '4px',
        background: 'rgba(0,0,0,0.3)',
        padding: '4px',
        borderRadius: '8px'
    },
    viewBtn: {
        padding: '6px 12px',
        border: 'none',
        borderRadius: '6px',
        fontSize: '0.75rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    controls: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flex: 1,
        marginLeft: '20px',
        marginRight: '15px'
    },
    modeControls: {
        display: 'flex',
        gap: '4px'
    },
    modeBtn: {
        border: '1px solid rgba(255,255,255,0.2)',
        padding: '5px 10px',
        borderRadius: '4px',
        fontSize: '0.65rem',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    pitBtn: {
        background: '#ef4444',
        border: 'none',
        color: 'white',
        padding: '5px 10px',
        borderRadius: '4px',
        fontSize: '0.65rem',
        fontWeight: 700,
        cursor: 'pointer'
    },
    select: {
        background: '#1e293b',
        color: '#fff',
        border: '1px solid #334155',
        padding: '5px 10px',
        borderRadius: '4px',
        fontSize: '0.75rem'
    },
    btnPrimary: {
        background: '#3b82f6',
        color: '#fff',
        border: 'none',
        padding: '5px 12px',
        borderRadius: '4px',
        fontWeight: 600,
        cursor: 'pointer',
        fontSize: '0.75rem'
    },
    btnControl: {
        color: '#fff',
        border: 'none',
        padding: '5px 12px',
        borderRadius: '4px',
        fontWeight: 600,
        cursor: 'pointer',
        minWidth: '60px',
        fontSize: '0.75rem'
    },
    progressBar: {
        flex: 1,
        height: '5px',
        background: '#334155',
        borderRadius: '3px',
        overflow: 'hidden',
        minWidth: '60px'
    },
    progressFill: {
        height: '100%',
        background: 'linear-gradient(90deg, #00d4ff, #00ffc7)',
        transition: 'width 0.1s linear'
    },
    closeButton: {
        background: 'none',
        border: 'none',
        color: 'rgba(255,255,255,0.5)',
        fontSize: '24px',
        cursor: 'pointer'
    },

    // Main content layout
    mainContent: {
        display: 'flex',
        flex: 1,
        overflow: 'hidden'
    },
    leftSidebar: {
        width: '140px',
        padding: '16px',
        borderRight: '1px solid rgba(255,255,255,0.1)',
        overflowY: 'auto',
        background: 'rgba(0,0,0,0.2)'
    },
    sidebarSection: {
        marginBottom: '20px'
    },
    sidebarTitle: {
        fontSize: '0.65rem',
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: '1px',
        marginBottom: '10px'
    },
    cameraBtn: {
        width: '100%',
        padding: '8px',
        marginBottom: '4px',
        border: '1px solid',
        borderRadius: '6px',
        background: 'transparent',
        color: '#fff',
        fontSize: '0.75rem',
        cursor: 'pointer',
        textAlign: 'left' as const,
        transition: 'all 0.2s'
    },
    checkboxLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: 'rgba(255,255,255,0.7)',
        fontSize: '0.75rem',
        marginBottom: '8px',
        cursor: 'pointer'
    },
    statusIndicator: {
        padding: '8px 12px',
        border: '2px solid',
        borderRadius: '6px',
        textAlign: 'center' as const,
        color: '#fff',
        fontSize: '0.75rem',
        fontWeight: 700
    },
    viewport: {
        flex: 2,
        position: 'relative' as const,
        minHeight: '400px'
    },
    rightPanel: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '12px',
        padding: '16px',
        overflowY: 'auto',
        borderLeft: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(0,0,0,0.2)'
    },
    dataGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px'
    },

    // Cards
    card: {
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px',
        padding: '12px'
    },
    cardTitle: {
        margin: '0 0 12px 0',
        fontSize: '0.7rem',
        color: 'rgba(255,255,255,0.45)',
        letterSpacing: '1px',
        fontWeight: 600
    },
    metricRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
    },
    label: {
        fontSize: '0.75rem',
        color: 'rgba(255,255,255,0.55)'
    },
    value: {
        fontSize: '0.9rem',
        fontWeight: 600,
        color: '#fff'
    },
    attackBtn: {
        width: '100%',
        padding: '10px',
        border: 'none',
        borderRadius: '6px',
        color: '#fff',
        fontWeight: 700,
        fontSize: '0.85rem',
        cursor: 'pointer',
        marginBottom: '10px'
    },
    regenSlider: {
        display: 'flex',
        gap: '2px',
        marginBottom: '10px'
    },
    regenBtn: {
        flex: 1,
        padding: '6px 0',
        border: 'none',
        borderRadius: '3px',
        color: '#fff',
        fontWeight: 600,
        fontSize: '0.6rem',
        cursor: 'pointer'
    },
    safetyGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '6px'
    },
    safetyInd: {
        textAlign: 'center' as const,
        padding: '6px',
        borderRadius: '4px',
        background: 'rgba(0,0,0,0.2)',
        border: '2px solid #333',
        color: '#fff',
        fontSize: '0.7rem',
        fontWeight: 700
    },
    powerMapGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '3px'
    },
    mapBtn: {
        padding: '4px 2px',
        border: 'none',
        borderRadius: '3px',
        color: '#fff',
        fontWeight: 600,
        fontSize: '0.5rem',
        cursor: 'pointer',
        textAlign: 'center' as const
    },

    // Footer
    footer: {
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        padding: '10px 20px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(0,0,0,0.3)'
    },
    footerItem: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '2px'
    },
    footerLabel: {
        fontSize: '0.6rem',
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: '0.5px'
    },
    footerValue: {
        fontSize: '0.9rem',
        fontWeight: 600,
        color: '#fff',
        fontFamily: "'Roboto Mono', monospace"
    },
    wsStatus: {
        marginLeft: 'auto',
        padding: '4px 10px',
        borderRadius: '4px',
        fontSize: '0.7rem',
        fontWeight: 600,
        border: '1px solid'
    }
}

export default VehicleModal
