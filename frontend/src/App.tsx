import React, { useState, useEffect } from 'react'
import { Header } from './components/Header'
import { DriverCard } from './components/DriverCard'
import { EEGPanel } from './components/EEGPanel'
import { CircuitMap } from './components/CircuitMap'
import { AdaptiveIntervention } from './components/AdaptiveIntervention'
import { VehicleModal } from './components/modals/CADVehicleModal'
import { BiosignalsPanel } from './components/BiosignalsPanel'
import { BestPracticesModal } from './components/BestPracticesModal'
import { SettingsPanel } from './components/SettingsPanel'
import { VehicleTelemetry } from './components/VehicleTelemetry'
import { AlertBanner } from './components/AlertBanner'
import { MultiSensorStatus } from './components/MultiSensorStatus'
import { SafetyScoreGauge } from './components/SafetyScoreGauge'
import { SessionControls } from './components/SessionControls'
import { CameraGrid } from './components/CameraGrid'
import { WeatherWidget } from './components/WeatherWidget'
import { SteeringWidget } from './components/SteeringWidget'

import { EnergyStrategyWidget } from './components/EnergyStrategyWidget'
import { AlertHistoryPanel } from './components/AlertHistoryPanel'
import { GGDiagram } from './components/GGDiagram'
import { PowerUnitMonitor } from './components/PowerUnitMonitor'
import { ThermalManagementWidget } from './components/ThermalManagementWidget'
import { CircuitConfigurator } from './components/CircuitConfigurator'
import { HVBatteryChargingMonitor } from './components/HVBatteryChargingMonitor'
import { NeuroAdaptiveFeatures } from './components/NeuroAdaptiveFeatures'
import { SafetyTrendChart } from './components/SafetyTrendChart'
import { TeamManager } from './components/TeamManager'
import { EEGAnalyzeModal } from './components/modals/EEGAnalyzeModal'
import { ADASPanel } from './components/ADASPanel'
import { EnergyMeterPanel } from './components/EnergyMeterPanel'
import { CircuitProvider } from './contexts/CircuitContext'
import { useWebSocket, useDemoData } from './hooks/useWebSocket'
import { BiosignalsData, EmotionalStateData, TeamMember, VehicleTelemetryData } from './types/telemetry'

// VehicleData is now imported as VehicleTelemetryData from types

interface Alert {
    id: string
    level: 'info' | 'warning' | 'critical' | 'emergency'
    metric: string
    category: string
    message: string
    current_value: number
    threshold_value: number
}

function App() {
    const { data: wsData, connected, sendUpdate } = useWebSocket()
    const demoData = useDemoData()

    const [activeTab, setActiveTab] = useState<'overview' | 'biosignals' | 'vehicle' | 'safety' | 'cameras' | 'strategy' | 'engineering' | 'team' | 'adas' | 'energy'>('overview')
    const [showBestPractices, setShowBestPractices] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [showVehicleModal, setShowVehicleModal] = useState(false)
    const [showEEGModal, setShowEEGModal] = useState(false)
    const [alerts, setAlerts] = useState<Alert[]>([])
    const [vehicleData, setVehicleData] = useState<VehicleTelemetryData | null>(null)
    const [fusedSensors, setFusedSensors] = useState<any>(null)

    // Team State
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
        {
            id: 'd1', name: 'Alex Rivera', role: 'Driver', experience: '4 Years', status: 'Active',
            stats: { races: 24, podiums: 8, avgLapTime: '1:24.5' }, avatarColor: '#00d4ff'
        },
        {
            id: 'd2', name: 'Sarah Chen', role: 'Driver', experience: '2 Years', status: 'Resting',
            stats: { races: 12, podiums: 2, avgLapTime: '1:25.2' }, avatarColor: '#ff4757'
        },
        {
            id: 'e1', name: 'Marcus Weber', role: 'Race Engineer', experience: '8 Years', status: 'Active',
            stats: { races: 150, podiums: 45 }, avatarColor: '#ffa502'
        },
    ])

    const [opMode, setOpMode] = useState(() => localStorage.getItem('nats_operation_mode') || 'auto')

    useEffect(() => {
        const handleConfigUpdate = () => {
            setOpMode(localStorage.getItem('nats_operation_mode') || 'auto')
        }
        window.addEventListener('nats-config-updated', handleConfigUpdate)
        return () => window.removeEventListener('nats-config-updated', handleConfigUpdate)
    }, [])

    // Determine Source Data based on Operation Mode
    let data = demoData // Default fallback

    if (opMode === 'live') {
        // In Live mode, only use WS data. If null, use a "Waiting" state placeholder or keep last known?
        // For safety, we use demoData structure but check connected status
        if (wsData) {
            data = wsData
        } else {
            // Waiting for stream... keep structure but maybe valid "empty" values?
            // Actually, showing "Connected, Waiting..." is better. 
            // We'll reuse demoData structure but mark status.
            data = { ...demoData, systemStatus: connected ? 'WAITING FOR STREAM' : 'DISCONNECTED' }
        }
    } else if (opMode === 'demo') {
        data = demoData
    } else {
        // Auto: Use WS if available and connected, else Demo
        data = connected && wsData ? wsData : demoData
    }

    // Sync Vehicle Data from high-frequency stream (WS or Demo)
    useEffect(() => {
        // If the main data stream contains vehicle telemetry (from Demo or improved WS), use it directly
        // This provides 60Hz/10Hz updates vs 1Hz polling
        if (data && (data.motor || data.chassis)) {
            setVehicleData(prev => ({
                ...getDefaultVehicleData(), // Ensure defaults
                ...prev,
                ...data as unknown as VehicleTelemetryData // Overlay stream data
            }))
        }
    }, [data])

    // Poll vehicle telemetry (Fallback / Low Frequency)
    useEffect(() => {
        if (opMode === 'demo') return // Skip polling in demo mode

        const fetchVehicle = async () => {
            try {
                const res = await fetch('/api/vehicle')
                if (res.ok) {
                    const apiData = await res.json()
                    // Only update if we aren't getting high-freq data from WS
                    if (!data?.motor) {
                        setVehicleData(apiData)
                    }
                }
            } catch {
                if (opMode !== 'demo') {
                    // Only fallback to static default if NOT in demo (demo uses generated data)
                    // setVehicleData(getDefaultVehicleData()) 
                }
            }
        }

        fetchVehicle()
        const interval = setInterval(fetchVehicle, 1000)
        return () => clearInterval(interval)
    }, [opMode, data?.motor])

    useEffect(() => {
        const handleNavSafety = () => setActiveTab('safety')
        window.addEventListener('nav-safety', handleNavSafety)
        return () => window.removeEventListener('nav-safety', handleNavSafety)
    }, [])

    // Fetch alerts
    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const res = await fetch('/api/alerts')
                if (res.ok) {
                    const data = await res.json()
                    setAlerts(data.alerts || [])
                }
            } catch {
                setAlerts([])
            }
        }

        fetchAlerts()
        const interval = setInterval(fetchAlerts, 2000)
        return () => clearInterval(interval)
    }, [])

    const handleInterventionUpdate = (update: Parameters<typeof sendUpdate>[0]) => {
        if (connected) {
            sendUpdate(update)
        }
    }

    const handleDismissAlert = async (alertId: string) => {
        try {
            await fetch(`/api/alerts/${alertId}/dismiss`, { method: 'POST' })
            setAlerts(prev => prev.filter(a => a.id !== alertId))
        } catch {
            setAlerts(prev => prev.filter(a => a.id !== alertId))
        }
    }

    const handleOpenBestPractices = () => {
        setShowBestPractices(true)
    }

    // Default biosignals for demo mode
    const defaultBiosignals: BiosignalsData = {
        ecg: { waveform: [], heartRate: 90, hrv: { rmssd: 35, sdnn: 45, lfHfRatio: 1.5 }, quality: 'good' },
        emg: { waveform: [], rmsAmplitude: 75, fatigueIndex: 0.2, muscleGroups: { grip: 0.5, shoulder: 0.4, neck: 0.35 }, quality: 'good' },
        gsr: { waveform: [], skinConductance: 4.5, arousalIndex: 0.3, scrPeaks: 5, quality: 'good' },
        ppg: { waveform: [], spo2: 98, pulseRate: 88, perfusionIndex: 4.2, quality: 'good' },
        eyeTracking: { gazeX: 0.5, gazeY: 0.4, pupilLeft: 4.5, pupilRight: 4.4, blinkRate: 18, cognitiveLoad: 0.4, drowsiness: 0.15, quality: 'good' },
        respiration: { waveform: [], rate: 14, depth: 0.8, regularity: 0.85, phase: 'inhale', quality: 'good' },
        temperature: { skin: 34.2, ambient: 25.0, thermalComfort: 0.75, quality: 'good' },
        eog: { horizontalWaveform: [], verticalWaveform: [], saccadeCount: 25, microsleepDetected: false, quality: 'good' },
        motion: { acceleration: { x: 0.5, y: 0.3, z: 1.0 }, gyro: { x: 5, y: 3, z: 10 }, totalGForce: 1.2, quality: 'good' }
    }

    const defaultEmotionalState: EmotionalStateData = {
        stress: 0.3,
        focus: 0.7,
        fatigue: 0.2,
        alertness: 0.8,
        anxiety: 0.25,
        confidence: 0.75,
        frustration: 0.15,
        flowState: 0.6,
        overallReadiness: 0.82,
        safetyRisk: 0.18,
        primaryIndicators: []
    }

    const biosignals = (data as any).biosignals || defaultBiosignals
    const emotionalState = (data as any).emotionalState || defaultEmotionalState

    // Override with real sensor data if available
    if (fusedSensors) {
        // Cardiac
        if (fusedSensors.heart.connected) {
            biosignals.ecg.heartRate = fusedSensors.heart.bpm
        }
        // Neurology
        if (fusedSensors.eeg.connected) {
            emotionalState.focus = fusedSensors.eeg.focus
        }
        // Visual
        if (fusedSensors.eye.connected) {
            biosignals.eyeTracking.drowsiness = fusedSensors.eye.drowsiness
        }
        // Vitals
        if (fusedSensors.vitals.connected) {
            emotionalState.stress = fusedSensors.vitals.stress
        }
    }

    // Derive active driver
    const activeDriver = teamMembers.find(m => m.role === 'Driver' && m.status === 'Active')

    return (
        <CircuitProvider>
            {/* Alert Banner */}
            {alerts.length > 0 && (
                <div style={styles.alertSection}>
                    <AlertBanner alerts={alerts} onDismiss={handleDismissAlert} />
                </div>
            )}

            {/* Header */}
            <div style={styles.dashboard}>
                <div style={styles.header}>
                    <Header
                        systemStatus={data.systemStatus}
                        onBestPracticesClick={handleOpenBestPractices}
                        onSettingsClick={() => setShowSettings(true)}
                        onVehicleClick={() => setShowVehicleModal(true)}
                    />
                </div>

                {/* Sensor + Session Controls */}
                <div style={{ padding: '0 20px', display: 'flex', gap: '15px', alignItems: 'stretch' }}>
                    <div style={{ flex: 1 }}>
                        <MultiSensorStatus onDataUpdate={setFusedSensors} />
                    </div>
                    <div style={{ width: '320px' }}>
                        <SessionControls />
                    </div>
                </div>

                {/* Tab Switcher */}
                <div style={styles.tabBar}>
                    <button
                        style={{ ...styles.tab, ...(activeTab === 'overview' ? styles.tabActive : {}) }}
                        onClick={() => setActiveTab('overview')}
                    >
                        🎯 Overview
                    </button>
                    <button
                        style={{ ...styles.tab, ...(activeTab === 'biosignals' ? styles.tabActive : {}) }}
                        onClick={() => setActiveTab('biosignals')}
                    >
                        📊 Biosignals
                    </button>
                    <button
                        style={{ ...styles.tab, ...(showVehicleModal ? styles.tabActive : {}) }}
                        onClick={() => setShowVehicleModal(true)}
                    >
                        🏎️ Vehicle
                    </button>
                    <button
                        style={{ ...styles.tab, ...(activeTab === 'safety' ? styles.tabActive : {}) }}
                        onClick={() => setActiveTab('safety')}
                    >
                        🛡️ Safety AI
                    </button>
                    <button
                        style={{ ...styles.tab, ...(activeTab === 'cameras' ? styles.tabActive : {}) }}
                        onClick={() => setActiveTab('cameras')}
                    >
                        📹 Cameras
                    </button>
                    <button
                        style={{ ...styles.tab, ...(activeTab === 'strategy' ? styles.tabActive : {}) }}
                        onClick={() => setActiveTab('strategy')}
                    >
                        ⚡ Strategy
                    </button>
                    <button
                        style={{ ...styles.tab, ...(activeTab === 'engineering' ? styles.tabActive : {}) }}
                        onClick={() => setActiveTab('engineering')}
                    >
                        🔧 Engineering
                    </button>
                    <button
                        style={{ ...styles.tab, ...(activeTab === 'team' ? styles.tabActive : {}) }}
                        onClick={() => setActiveTab('team')}
                    >
                        👥 Team
                    </button>
                    <button
                        style={{ ...styles.tab, ...(activeTab === 'adas' ? styles.tabActive : {}) }}
                        onClick={() => setActiveTab('adas')}
                    >
                        🚗 ADAS
                    </button>
                    <button
                        style={{ ...styles.tab, ...(activeTab === 'energy' ? styles.tabActive : {}) }}
                        onClick={() => setActiveTab('energy')}
                    >
                        ⚡ Energy
                    </button>
                </div>

                {/* Main Content */}
                {activeTab === 'overview' ? (
                    <div style={styles.content}>
                        <div style={styles.leftColumn}>
                            <DriverCard driver={{
                                ...data.driver,
                                name: activeDriver ? activeDriver.name : data.driver.name
                            }} />
                            <WeatherWidget />
                            <EEGPanel eeg={data.eeg} onAnalyzeClick={() => setShowEEGModal(true)} />
                        </div>
                        <div style={styles.centerColumn}>
                            <CircuitMap telemetrySync={data.telemetrySync} />
                        </div>
                        <div style={styles.rightColumn}>
                            <AdaptiveIntervention
                                intervention={data.adaptiveIntervention}
                                onUpdate={handleInterventionUpdate}
                            />
                            <SteeringWidget />
                        </div>
                    </div>
                ) : activeTab === 'biosignals' ? (
                    <div style={styles.biosignalsView}>
                        <BiosignalsPanel biosignals={biosignals} emotionalState={emotionalState} />
                        <NeuroAdaptiveFeatures />
                    </div>
                ) : activeTab === 'vehicle' ? (
                    <div style={styles.vehicleView}>
                        {vehicleData && <VehicleTelemetry vehicle={vehicleData} />}
                    </div>
                ) : activeTab === 'safety' ? (
                    <div style={styles.safetyView}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', padding: '20px' }}>
                            <SafetyScoreGauge />
                            <SafetyTrendChart />
                        </div>
                    </div>
                ) : activeTab === 'cameras' ? (
                    <div style={styles.camerasView}>
                        <CameraGrid />
                    </div>
                ) : activeTab === 'strategy' ? (
                    <div style={styles.strategyView}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '24px', padding: '24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <EnergyStrategyWidget />
                                {/* Lap Delta placeholder */}
                                <div style={{ background: 'rgba(13,33,55,0.6)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(0,212,255,0.2)' }}>
                                    <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '10px' }}>⏱️ Lap Delta</h3>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#00ff88', fontFamily: 'monospace' }}>-0.124s</div>
                                    <div style={{ fontSize: '0.8rem', color: '#aaa' }}>VS BEST LAP (L10)</div>
                                </div>
                            </div>
                            <AlertHistoryPanel alerts={alerts} />
                        </div>
                    </div>
                ) : activeTab === 'team' ? (
                    <div style={{ flex: 1, padding: '24px' }}>
                        <TeamManager members={teamMembers} onUpdate={setTeamMembers} />
                    </div>
                ) : activeTab === 'adas' ? (
                    <div style={styles.adasView}>
                        <ADASPanel />
                    </div>
                ) : activeTab === 'energy' ? (
                    <div style={styles.adasView}>
                        <EnergyMeterPanel />
                    </div>
                ) : (
                    <div style={styles.engineeringView}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px', height: '100%', overflowY: 'auto' }}>
                            {/* Top Row: Dynamics & Power */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <GGDiagram accel={vehicleData?.chassis?.acceleration_g || { lateral: 0, longitudinal: 0 }} />
                                    <div style={{ background: 'rgba(13,33,55,0.6)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(0,212,255,0.2)', flex: 1 }}>
                                        <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '10px' }}>🌡️ Tire Thermal Map</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', height: '100%' }}>
                                            <div style={{ background: 'linear-gradient(to bottom, #ff4757, #ffa502)', borderRadius: '4px', opacity: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>FL 88°C</div>
                                            <div style={{ background: 'linear-gradient(to bottom, #ff4757, #ffa502)', borderRadius: '4px', opacity: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>FR 86°C</div>
                                            <div style={{ background: 'linear-gradient(to top, #2ed573, #ffa502)', borderRadius: '4px', opacity: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>RL 82°C</div>
                                            <div style={{ background: 'linear-gradient(to top, #2ed573, #ffa502)', borderRadius: '4px', opacity: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>RR 81°C</div>
                                        </div>
                                    </div>
                                </div>
                                <PowerUnitMonitor />
                            </div>

                            {/* Bottom Row: Thermal Management System */}
                            <ThermalManagementWidget />

                            {/* Phase 17: Circuit Configurator */}
                            <CircuitConfigurator />

                            {/* Phase 18: HV Battery & Charging System Monitor */}
                            <HVBatteryChargingMonitor />
                        </div>
                    </div>
                )}

                {/* Connection Status */}
                <div style={{
                    ...styles.connectionBanner,
                    background: connected ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 165, 2, 0.15)',
                    borderColor: connected ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 165, 2, 0.3)',
                    color: connected ? '#00ff88' : '#ffa502'
                }}>
                    <span style={styles.connectionIcon}>◉</span>
                    {connected ? 'Live Data • NATS v3.0' : 'Demo Mode'}
                </div>

                {/* Best Practices Modal */}
                <BestPracticesModal isOpen={showBestPractices} onClose={() => setShowBestPractices(false)} />
                <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
                <VehicleModal isOpen={showVehicleModal} onClose={() => setShowVehicleModal(false)} demoTelemetry={data} />
                <EEGAnalyzeModal isOpen={showEEGModal} onClose={() => setShowEEGModal(false)} data={data.eeg} />
            </div>
        </CircuitProvider>
    )
}

function getDefaultVehicleData(): VehicleTelemetryData {
    return {
        motor: {
            rpm: 12500,
            power_kw: 450,
            torque_nm: 350,
            temperature: 72,
            efficiency: 94,
            mode: 'RACE',
            inv_mode: 'TORQUE',
            map_setting: 3,
            status: 'optimal'
        },
        battery: {
            soc: 78,
            voltage: 850,
            current: 120,
            power_kw: 102,
            temperature: 35,
            min_cell_temp: 32,
            max_cell_temp: 38,
            health_soh: 98,
            status: 'optimal'
        },
        brakes: {
            front_left_temp: 520,
            front_right_temp: 510,
            rear_left_temp: 420,
            rear_right_temp: 415,
            pressure_front: 85,
            pressure_rear: 65,
            bias_percent: 58,
            status: 'optimal'
        },
        tires: {
            front_left: { temp: 88, pressure: 1.8, wear: 85 },
            front_right: { temp: 86, pressure: 1.8, wear: 87 },
            rear_left: { temp: 82, pressure: 1.65, wear: 90 },
            rear_right: { temp: 81, pressure: 1.65, wear: 92 },
            status: 'optimal'
        },
        chassis: {
            speed_kph: 245,
            steering_angle: 0,
            throttle_position: 85,
            brake_position: 0,
            acceleration_g: { lateral: 1.5, longitudinal: 0.8, vertical: 1.0 },
            suspension_travel: { fl: 45, fr: 47, rl: 42, rr: 40 },
            downforce_kg: 850
        },
        aero: {
            front_wing: { downforce_kg: 250, drag_n: 100, efficiency: 95 },
            rear_wing: { downforce_kg: 400, drag_n: 180, efficiency: 90, drs_active: false, drs_flap_angle: 18 },
            diffuser: { downforce_kg: 200, expansion_ratio: 2.8, ground_clearance_mm: 35 },
            total_downforce_kg: 850,
            total_drag_n: 280,
            aero_balance: 42,
            ride_height_front_mm: 30,
            ride_height_rear_mm: 45
        },
        lap: {
            current: 12,
            best: 89.5,
            last: 90.2,
            delta: -0.7,
            sector1: 28.5,
            sector2: 33.8,
            sector3: 27.9
        },
        overallStatus: 'optimal'
    }
}

const styles: { [key: string]: React.CSSProperties } = {
    dashboard: {
        minHeight: '100vh',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    alertSection: {
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '400px',
        zIndex: 100,
    },
    header: {
        width: '100%',
    },
    tabBar: {
        display: 'flex',
        gap: '8px',
        padding: '4px',
        background: 'var(--bg-card)',
        borderRadius: '12px',
        width: 'fit-content',
        border: '1px solid var(--border-color)',
    },
    tab: {
        padding: '10px 20px',
        border: 'none',
        borderRadius: '8px',
        background: 'transparent',
        color: 'var(--text-muted)',
        fontSize: '0.875rem',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontFamily: "'Outfit', sans-serif",
    },
    tabActive: {
        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
        color: '#ffffff',
    },
    content: {
        display: 'grid',
        gridTemplateColumns: '300px 1fr 340px',
        gap: '24px',
        flex: 1,
    },
    leftColumn: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
    },
    centerColumn: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
    },
    rightColumn: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
    },
    biosignalsView: {
        flex: 1,
        maxWidth: '900px',
    },
    vehicleView: {
        flex: 1,
        maxWidth: '700px',
    },
    safetyView: {
        flex: 1,
        padding: '0 20px',
    },
    camerasView: {
        flex: 1,
        padding: '0 20px',
        minHeight: '500px',
    },
    strategyView: {
        flex: 1,
        minHeight: '500px',
    },
    engineeringView: {
        flex: 1,
        minHeight: '500px',
    },
    adasView: {
        flex: 1,
        padding: '0 20px',
        minHeight: '600px',
        background: 'linear-gradient(180deg, rgba(13,33,55,0.4) 0%, rgba(0,0,0,0.2) 100%)',
        borderRadius: '16px',
    },
    connectionBanner: {
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        border: '1px solid',
        borderRadius: '8px',
        fontSize: '0.875rem',
        fontWeight: 500,
    },
    connectionIcon: {
        animation: 'pulse 2s ease-in-out infinite',
    },
}

export default App
