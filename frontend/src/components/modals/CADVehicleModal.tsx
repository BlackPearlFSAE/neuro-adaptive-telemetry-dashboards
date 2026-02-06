/**
 * VehicleModal.tsx
 * ================
 * Premium 3D CAD-style Vehicle Dashboard with Real-time Telemetry Sync
 * BP16 EV Formula - Global Technician Analysis System
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { VehicleScene, ComponentDetailsPanel, Subsystem, VehicleTelemetryData, CameraPreset } from '../3d'
import { CircularGauge, LinearPowerBar, StatusLED, PhaseCurrentDisplay } from './DataGauges'

interface VehicleModalProps {
    isOpen: boolean
    onClose: () => void
    demoTelemetry?: any // Telemetry from useDemoData for GitHub Pages fallback
}

// View modes
type ViewMode = '3d' | 'data' | 'split'

export const VehicleModal: React.FC<VehicleModalProps> = ({ isOpen, onClose, demoTelemetry }) => {
    // State - use demoTelemetry as initial fallback
    const [telemetry, setTelemetry] = useState<any>(demoTelemetry || null)
    const [usingDemoFallback, setUsingDemoFallback] = useState(false)
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

    // Demo data generator - defined before WebSocket to be used in onmessage
    const generateDemoTelemetry = useCallback(() => {
        const time = Date.now() / 1000
        const speedCycle = (Math.sin(time * 0.2) + 1) / 2
        const rpm = 2000 + speedCycle * 8000 + Math.random() * 500
        const torque = (rpm / 12000) * 230 * 0.9
        const power = (rpm * torque) / 9549

        return {
            motor: {
                rpm,
                temperature: 45 + (rpm / 12000) * 40,
                torque_nm: torque,
                power_kw: power,
                efficiency: 94 + Math.sin(time) * 2,
                mode: 'RACE',
                status: 'optimal',
                inverter: {
                    status: 'RUN',
                    dc_bus_voltage: 380 + Math.sin(time * 0.5) * 5,
                    igbt_temp: 50 + (power / 80) * 30,
                    switching_freq: 16000 + Math.random() * 100,
                    fault_code: 0,
                    phase_u: power * 2.5,
                    phase_v: power * 2.55,
                    phase_w: power * 2.45
                }
            },
            battery: {
                voltage: 380 + Math.cos(time * 0.1) * 10,
                current: power * 2.8,
                soc: 85 - (time % 3600) / 60,
                health_soh: 98.5,
                status: 'optimal'
            },
            chassis: {
                speed_kph: speedCycle * 140,
                status: 'optimal',
                suspension_travel: { fl: 0, fr: 0, rl: 0, rr: 0 },
                acceleration_g: {
                    lateral: Math.sin(time * 0.5) * 1.5,
                    longitudinal: Math.cos(time * 0.2) * 0.8
                },
                downforce_kg: (speedCycle * 140) * 1.5,
                safety: {
                    hv_on: true,
                    imd_ok: true,
                    ams_ok: true,
                    bspd_ok: true
                }
            },
            brakes: {
                bias_percent: 58,
                pressure_front: 0,
                pressure_rear: 0,
                temp_fl: 150, temp_fr: 150, temp_rl: 120, temp_rr: 120
            },
            tires: {
                fl: { temp: 85, pressure: 1.8, wear: 95 },
                fr: { temp: 88, pressure: 1.8, wear: 94 },
                rl: { temp: 92, pressure: 1.9, wear: 92 },
                rr: { temp: 91, pressure: 1.9, wear: 91 }
            },
            energyManagement: {
                attack_mode_active: false,
                attack_mode_activations: 1,
                attack_mode_remaining: 0,
                regen_level: 5
            },
            powerMap: {
                id: 1,
                name: 'RACE',
                map_id: 1
            },
            lap: {
                current: 5,
                last_time: 84.5,
                best_time: 83.2
            },
            overallStatus: 'optimal',
            timestamp: Date.now()
        }
    }, [])

    // Simulation Loop: drives animation when in demo fallback mode
    useEffect(() => {
        // Force demo mode if on GitHub Pages or if explicitly requested
        if (window.location.hostname.includes('github.io') || window.location.hostname.includes('vercel.app')) {
            setUsingDemoFallback(true)
        }

        if (!usingDemoFallback) return

        const interval = setInterval(() => {
            // Check if we have external demo prop (from NeuroAdaptive) OR use internal generator
            // We prioritize Internal Generator for the Modal because it runs at 60fps/30fps 
            // vs the prop which might be slower from the parent App

            // However, if the parent is passing specific scenario data, we should use it.
            // For now, let's mix: if demoTelemetry is provided AND has changing data, use it.
            // Otherwise, generate our own physics for smooth gauge movement.

            setTelemetry(generateDemoTelemetry())
        }, 33) // ~30Hz update rate for smooth animation

        return () => clearInterval(interval)
    }, [usingDemoFallback, generateDemoTelemetry])

    // WebSocket connection for real-time telemetry
    const connectWebSocket = useCallback(() => {
        // constant check for static deployment
        if (window.location.hostname.includes('github.io')) {
            setUsingDemoFallback(true)
            return
        }

        if (wsRef.current?.readyState === WebSocket.OPEN) return

        try {
            const wsUrl = `ws://${window.location.hostname}:8001/ws/vehicle`
            wsRef.current = new WebSocket(wsUrl)

            wsRef.current.onopen = () => {
                console.log('🚗 Vehicle WebSocket connected (60Hz)')
                // If connected, we are no longer using demo fallback
                setUsingDemoFallback(false)
            }

            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)

                    // Check for zero data (server connected but no vehicle telemetry)
                    // If backend sends empty struct, wait for valid data or use fallback
                    const isZeroData = data.motor?.rpm === 0 && data.battery?.voltage === 0

                    if (isZeroData) {
                        // Keep using fallback until we get real values
                        // But allow the WEBSOCKET to stay open to receive them when they start
                    } else {
                        // Real data received! Switch off simulation
                        if (usingDemoFallback) setUsingDemoFallback(false)

                        setTelemetry(data)
                        if (data.isReplay) {
                            setProgress((data.replayIndex / data.totalFrames) * 100)
                        }
                    }
                } catch (e) {
                    console.error('WebSocket parse error', e)
                }
            }

            wsRef.current.onclose = () => {
                // console.log('Vehicle WebSocket disconnected')
                // Do not aggressively reconnect in this demo version to avoid console spam
                // reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000)
                setUsingDemoFallback(true)
            }

            wsRef.current.onerror = (err) => {
                // console.error('WebSocket error', err)
                wsRef.current?.close()
                setUsingDemoFallback(true)
            }
        } catch (e) {
            // Fallback to polling if WebSocket fails
            console.log('WebSocket unavailable, using polling fallback')
            setUsingDemoFallback(true)
        }
    }, [usingDemoFallback])

    // Fetch logs and power maps on mount
    useEffect(() => {
        if (isOpen) {
            // Fast failure for GitHub Pages to avoid 404 console errors
            if (window.location.hostname.includes('github.io')) {
                setUsingDemoFallback(true)
                return
            }

            // Try to fetch from backend, but gracefully handle failures
            fetch('/api/vehicle/list-logs')
                .then(res => res.ok ? res.json() : Promise.reject())
                .then(data => {
                    setLogs(data.logs || [])
                    if (data.logs?.length > 0) setSelectedLog(data.logs[0])
                })
                .catch(() => {
                    // Backend unavailable - using demo mode
                    setUsingDemoFallback(true)
                })

            fetch('/api/vehicle/power-maps')
                .then(res => res.ok ? res.json() : Promise.reject())
                .then(data => setPowerMaps(data.maps || {}))
                .catch(() => { /* silently ignore */ })

            // Try WebSocket first, fallback to demo data
            connectWebSocket()
        }

        return () => {
            wsRef.current?.close()
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
            }
        }
    }, [isOpen, connectWebSocket])

    // Sync demoTelemetry prop if we are strictly using parent data
    // Sync demoTelemetry prop if we are strictly using parent data
    // This useEffect is now primarily for when demoTelemetry is provided externally (e.g., from NeuroAdaptive)
    // and we are in a fallback state. The internal simulation loop handles generateDemoTelemetry.
    useEffect(() => {
        // CONFLICT RESOLUTION:
        // App.tsx passes 'demoTelemetry' which updates at ~10Hz. 
        // Our internal interval runs at ~30Hz (see above).
        // If we allow this effect to run, it overwrites our smooth internal physics with choppy data, causing "flickering".
        // FIX: Only use external prop if it's a specific REPLAY or if we are NOT in our own fallback mode.
        // Actually, for GitHub Pages demo, we ALWAYS want the internal generator.

        if (demoTelemetry && !usingDemoFallback && demoTelemetry.isReplay) {
            setTelemetry(demoTelemetry)
        }
    }, [demoTelemetry, usingDemoFallback])

    // Polling fallback - simplified to mostly trigger demo mode if API fails
    useEffect(() => {
        if (!isOpen || usingDemoFallback) return

        const interval = setInterval(async () => {
            if (wsRef.current?.readyState !== WebSocket.OPEN) {
                if (window.location.hostname.includes('github.io')) {
                    setUsingDemoFallback(true)
                    return
                }

                // Otherwise try fetching
                try {
                    const controller = new AbortController()
                    const timeoutId = setTimeout(() => controller.abort(), 800) // Fast timeout

                    const res = await fetch('/api/vehicle', { signal: controller.signal })
                    clearTimeout(timeoutId)

                    if (res.ok) {
                        const data = await res.json()
                        const isZeroData = data.motor?.rpm === 0 && data.battery?.voltage === 0

                        if (isZeroData) {
                            // Backend sending empty data, use simulation
                            // Don't setUsingDemoFallback(true) permanently here, just use data
                            setTelemetry(generateDemoTelemetry())
                        } else {
                            setTelemetry(data)
                        }
                    } else {
                        throw new Error('API Error')
                    }
                } catch (e) {
                    // Backend unavailable, switch to demo fallback
                    setUsingDemoFallback(true)
                    setTelemetry(generateDemoTelemetry())
                }
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [isOpen, usingDemoFallback, generateDemoTelemetry])

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

                                    {/* ===== ADVANCED MOTOR / INVERTER CARD ===== */}
                                    <div style={{ ...styles.card, gridColumn: 'span 2' }}>
                                        <h3 style={styles.cardTitle}>⚡ MOTOR / INVERTER ADVANCED</h3>
                                        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                                            {/* RPM Gauge */}
                                            <CircularGauge
                                                value={telemetry?.motor?.rpm ?? 0}
                                                max={12000}
                                                label="RPM"
                                                unit="rpm"
                                                size={100}
                                                warning={9000}
                                                critical={11000}
                                            />

                                            {/* Efficiency Gauge */}
                                            <CircularGauge
                                                value={telemetry?.motor?.efficiency ?? 95}
                                                max={100}
                                                label="EFFICIENCY"
                                                unit="%"
                                                size={100}
                                                warning={85}
                                                critical={75}
                                            />

                                            {/* Right side metrics */}
                                            <div style={{ flex: 1, minWidth: 150 }}>
                                                {/* Power Bar */}
                                                <LinearPowerBar
                                                    value={telemetry?.motor?.power_kw ?? 0}
                                                    max={80}
                                                    label="POWER OUTPUT"
                                                    unit="kW"
                                                />

                                                {/* Torque */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>TORQUE</span>
                                                    <span style={{ color: '#00d4ff', fontFamily: 'monospace', fontWeight: 600 }}>
                                                        {(telemetry?.motor?.torque_nm ?? 0).toFixed(1)} Nm
                                                    </span>
                                                </div>

                                                {/* Motor Temp */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>MOTOR TEMP</span>
                                                    <span style={{
                                                        color: getTempColor(telemetry?.motor?.temperature ?? 0),
                                                        fontFamily: 'monospace',
                                                        fontWeight: 600
                                                    }}>
                                                        {(telemetry?.motor?.temperature ?? 0).toFixed(1)}°C
                                                    </span>
                                                </div>

                                                {/* Inverter Status LED */}
                                                <StatusLED
                                                    status={telemetry?.motor?.inverter?.status === 'RUN' ? 'run' :
                                                        telemetry?.motor?.inverter?.status === 'READY' ? 'ready' : 'off'}
                                                    label={telemetry?.motor?.inverter?.status ?? 'OFF'}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* ===== INVERTER DIAGNOSTICS CARD ===== */}
                                    <div style={{ ...styles.card, gridColumn: 'span 2' }}>
                                        <h3 style={styles.cardTitle}>🔧 INVERTER DIAGNOSTICS</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                            {/* Left: DC Bus & IGBT */}
                                            <div>
                                                <div style={styles.metricRow}>
                                                    <span style={styles.label}>DC BUS VOLTAGE</span>
                                                    <span style={{ ...styles.value, color: '#8b5cf6' }}>
                                                        {(telemetry?.motor?.inverter?.dc_bus_voltage ?? 0).toFixed(1)} V
                                                    </span>
                                                </div>
                                                <div style={styles.metricRow}>
                                                    <span style={styles.label}>IGBT TEMP</span>
                                                    <span style={{
                                                        ...styles.value,
                                                        color: getTempColor(telemetry?.motor?.inverter?.igbt_temp ?? 0)
                                                    }}>
                                                        {(telemetry?.motor?.inverter?.igbt_temp ?? 0).toFixed(1)}°C
                                                    </span>
                                                </div>
                                                <div style={styles.metricRow}>
                                                    <span style={styles.label}>SWITCHING FREQ</span>
                                                    <span style={styles.value}>
                                                        {(telemetry?.motor?.inverter?.switching_freq ?? 0) / 1000} kHz
                                                    </span>
                                                </div>
                                                <div style={styles.metricRow}>
                                                    <span style={styles.label}>FAULT CODE</span>
                                                    <span style={{
                                                        ...styles.value,
                                                        color: (telemetry?.motor?.inverter?.fault_code ?? 0) === 0 ? '#10b981' : '#ef4444'
                                                    }}>
                                                        {(telemetry?.motor?.inverter?.fault_code ?? 0) === 0 ? 'NO FAULT' : `0x${(telemetry?.motor?.inverter?.fault_code ?? 0).toString(16).toUpperCase()}`}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Right: Phase Currents */}
                                            <div>
                                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginBottom: 8, letterSpacing: '1px' }}>
                                                    PHASE CURRENTS
                                                </div>
                                                <PhaseCurrentDisplay
                                                    u={telemetry?.motor?.inverter?.phase_u ?? 0}
                                                    v={telemetry?.motor?.inverter?.phase_v ?? 0}
                                                    w={telemetry?.motor?.inverter?.phase_w ?? 0}
                                                    max={200}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* ===== BRAKE & TIRE THERMALS ===== */}
                                    <div style={{ ...styles.card, gridColumn: 'span 2' }}>
                                        <h3 style={styles.cardTitle}>🌡️ BRAKE & TIRE THERMALS</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                            {/* Brakes */}
                                            <div>
                                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: 12, letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 4 }}>BRAKE DISC TEMP</div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, rowGap: 8 }}>
                                                    {[
                                                        { label: 'FL', val: telemetry?.brakes?.temp_fl },
                                                        { label: 'FR', val: telemetry?.brakes?.temp_fr },
                                                        { label: 'RL', val: telemetry?.brakes?.temp_rl },
                                                        { label: 'RR', val: telemetry?.brakes?.temp_rr }
                                                    ].map((item, i) => (
                                                        <div key={i} style={styles.metricRow}>
                                                            <span style={{ ...styles.label, minWidth: 20 }}>{item.label}</span>
                                                            <span style={{
                                                                ...styles.value,
                                                                color: getTempColor(item.val ?? 0)
                                                            }}>
                                                                {(item.val ?? 0).toFixed(0)}°C
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Tires */}
                                            <div>
                                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: 12, letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 4 }}>TIRE SURFACE TEMP</div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, rowGap: 8 }}>
                                                    {[
                                                        { label: 'FL', val: telemetry?.tires?.fl?.temp },
                                                        { label: 'FR', val: telemetry?.tires?.fr?.temp },
                                                        { label: 'RL', val: telemetry?.tires?.rl?.temp },
                                                        { label: 'RR', val: telemetry?.tires?.rr?.temp }
                                                    ].map((item, i) => (
                                                        <div key={i} style={styles.metricRow}>
                                                            <span style={{ ...styles.label, minWidth: 20 }}>{item.label}</span>
                                                            <span style={{
                                                                ...styles.value,
                                                                color: getTempColor(item.val ?? 0)
                                                            }}>
                                                                {(item.val ?? 0).toFixed(0)}°C
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
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
