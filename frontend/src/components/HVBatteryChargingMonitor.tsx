import React, { useState, useEffect } from 'react'

/**
 * HV Battery & Charging System Monitor
 * Based on Tesla diagnostic interface design
 * Monitors: HV Battery, HVIL, Charge Port, Contactors, PCS
 */

interface ChargingSystemState {
    hvBattery: {
        rms: number
        minTemp: number
        maxTemp: number
        hvil: 'OK' | 'FAULT'
        status: 'optimal' | 'warning' | 'critical'
    }
    chargePort: {
        cableState: 'Disconnected' | 'Connected' | 'Latched'
        latchState: 'Open' | 'Engaged' | 'Fault'
        backCoverPresent: boolean
        handleButtonPressed: boolean
        acPinTemp: number
        dcPinTemp: number
        status: 'idle' | 'ready' | 'charging' | 'fault'
    }
    contactors: {
        packContactors: 'Open' | 'Closed' | 'Fault'
        fastChargeContactors: 'Open' | 'Closed' | 'Fault'
        prechargeRelay: 'Open' | 'Closed'
    }
    pcs: {
        mode: 'Idle' | 'AC Charging' | 'DC Fast Charge' | 'V2G'
        power: number // kW
        efficiency: number // %
        status: 'offline' | 'ready' | 'active' | 'fault'
    }
    cpl: {
        connected: boolean
        pilotSignal: number // %
        proximityDetected: boolean
    }
}

const getDefaultState = (): ChargingSystemState => ({
    hvBattery: {
        rms: 395.2,
        minTemp: 28,
        maxTemp: 32,
        hvil: 'OK',
        status: 'optimal'
    },
    chargePort: {
        cableState: 'Disconnected',
        latchState: 'Open',
        backCoverPresent: true,
        handleButtonPressed: false,
        acPinTemp: 31.87,
        dcPinTemp: 32.02,
        status: 'idle'
    },
    contactors: {
        packContactors: 'Closed',
        fastChargeContactors: 'Open',
        prechargeRelay: 'Closed'
    },
    pcs: {
        mode: 'Idle',
        power: 0,
        efficiency: 0,
        status: 'offline'
    },
    cpl: {
        connected: false,
        pilotSignal: 0,
        proximityDetected: false
    }
})

export const HVBatteryChargingMonitor: React.FC = () => {
    const [state, setState] = useState<ChargingSystemState>(getDefaultState())
    const [isCharging, setIsCharging] = useState(false)

    // Simulate charging system updates
    useEffect(() => {
        const interval = setInterval(() => {
            setState(prev => {
                const newState = { ...prev }

                // Simulate temperature fluctuations
                newState.hvBattery.minTemp = 26 + Math.random() * 4
                newState.hvBattery.maxTemp = newState.hvBattery.minTemp + 2 + Math.random() * 3
                newState.hvBattery.rms = 390 + Math.random() * 15

                // Pin temperatures
                newState.chargePort.acPinTemp = 30 + Math.random() * 5
                newState.chargePort.dcPinTemp = 30 + Math.random() * 5

                // Charging simulation
                if (isCharging) {
                    newState.chargePort.cableState = 'Latched'
                    newState.chargePort.latchState = 'Engaged'
                    newState.chargePort.status = 'charging'
                    newState.contactors.fastChargeContactors = 'Closed'
                    newState.pcs.mode = 'DC Fast Charge'
                    newState.pcs.power = 120 + Math.random() * 30
                    newState.pcs.efficiency = 94 + Math.random() * 4
                    newState.pcs.status = 'active'
                    newState.cpl.connected = true
                    newState.cpl.pilotSignal = 100
                    newState.cpl.proximityDetected = true
                }

                return newState
            })
        }, 500)

        return () => clearInterval(interval)
    }, [isCharging])

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'optimal':
            case 'ready':
            case 'active':
            case 'OK':
            case 'Closed':
            case 'Engaged':
            case 'Latched':
            case 'Connected':
                return '#00ff88'
            case 'warning':
            case 'idle':
            case 'Open':
            case 'Disconnected':
                return '#fbbf24'
            case 'critical':
            case 'fault':
            case 'FAULT':
            case 'Fault':
                return '#ff4757'
            default:
                return '#8b8b8b'
        }
    }

    const StatusIndicator = ({ status, label }: { status: string; label: string }) => (
        <div style={styles.statusRow}>
            <span style={{ ...styles.statusDot, background: getStatusColor(status) }} />
            <span style={{ color: getStatusColor(status) }}>{label}</span>
        </div>
    )

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <span style={styles.icon}>🔋</span>
                    <span style={styles.title}>HV BATTERY & CHARGING SYSTEM</span>
                </div>
                <div style={styles.headerRight}>
                    <button
                        style={{
                            ...styles.chargeBtn,
                            background: isCharging ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 187, 36, 0.2)',
                            borderColor: isCharging ? '#00ff88' : '#fbbf24'
                        }}
                        onClick={() => setIsCharging(!isCharging)}
                    >
                        {isCharging ? '⚡ Charging...' : '🔌 Start Charge'}
                    </button>
                </div>
            </div>

            {/* Main Content - Visual Diagram */}
            <div style={styles.diagramContainer}>
                <svg viewBox="0 0 700 350" style={styles.svg}>
                    {/* Background Grid */}
                    <defs>
                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,212,255,0.05)" strokeWidth="0.5" />
                        </pattern>
                    </defs>
                    <rect width="700" height="350" fill="url(#grid)" />

                    {/* HV Battery Pack (Left) */}
                    <g transform="translate(40, 80)">
                        <rect width="140" height="180" rx="10"
                            fill="rgba(0, 255, 136, 0.05)"
                            stroke={getStatusColor(state.hvBattery.status)}
                            strokeWidth="2" />
                        <text x="70" y="-10" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">HV Battery</text>

                        {/* Battery cells visual */}
                        {[0, 1, 2, 3, 4].map(i => (
                            <rect key={i} x="15" y={20 + i * 30} width="110" height="22" rx="3"
                                fill="rgba(0, 255, 136, 0.2)" stroke="#00ff88" strokeWidth="1" />
                        ))}

                        {/* RMS Voltage */}
                        <text x="70" y="195" textAnchor="middle" fill="#00d4ff" fontSize="11">
                            RMS: {state.hvBattery.rms.toFixed(1)}V
                        </text>
                    </g>

                    {/* Temperature Display */}
                    <g transform="translate(200, 80)">
                        <rect width="80" height="60" rx="6" fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.2)" />
                        <text x="40" y="18" textAnchor="middle" fill="#aaa" fontSize="9">Min Temp</text>
                        <text x="40" y="35" textAnchor="middle" fill="#00d4ff" fontSize="14" fontWeight="bold">
                            {state.hvBattery.minTemp.toFixed(0)}°C
                        </text>
                        <text x="40" y="52" textAnchor="middle" fill="#aaa" fontSize="9">Max: {state.hvBattery.maxTemp.toFixed(0)}°C</text>
                    </g>

                    {/* HVIL Status */}
                    <g transform="translate(200, 155)">
                        <rect width="80" height="40" rx="6"
                            fill={state.hvBattery.hvil === 'OK' ? 'rgba(0,255,136,0.1)' : 'rgba(255,71,87,0.1)'}
                            stroke={getStatusColor(state.hvBattery.hvil)} strokeWidth="1.5" />
                        <text x="40" y="18" textAnchor="middle" fill="#aaa" fontSize="9">HVIL</text>
                        <text x="40" y="32" textAnchor="middle" fill={getStatusColor(state.hvBattery.hvil)} fontSize="12" fontWeight="bold">
                            {state.hvBattery.hvil}
                        </text>
                    </g>

                    {/* CPL (Charge Port Connection) */}
                    <g transform="translate(200, 210)">
                        <rect width="80" height="40" rx="6"
                            fill={state.cpl.connected ? 'rgba(0,255,136,0.1)' : 'rgba(139,139,139,0.1)'}
                            stroke={state.cpl.connected ? '#00ff88' : '#8b8b8b'} strokeWidth="1.5" />
                        <text x="40" y="18" textAnchor="middle" fill="#aaa" fontSize="9">CPL Signal</text>
                        <text x="40" y="32" textAnchor="middle" fill={state.cpl.connected ? '#00ff88' : '#8b8b8b'} fontSize="12" fontWeight="bold">
                            {state.cpl.pilotSignal}%
                        </text>
                    </g>

                    {/* Contactors Section */}
                    <g transform="translate(310, 80)">
                        <rect width="100" height="110" rx="8" fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.1)" />
                        <text x="50" y="20" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">CONTACTORS</text>

                        {/* Pack Contactors */}
                        <circle cx="25" cy="45" r="8" fill={getStatusColor(state.contactors.packContactors)} opacity="0.3" />
                        <circle cx="25" cy="45" r="5" fill={getStatusColor(state.contactors.packContactors)} />
                        <text x="38" y="48" fill="#aaa" fontSize="9">Pack</text>

                        {/* Fast Charge */}
                        <circle cx="25" cy="70" r="8" fill={getStatusColor(state.contactors.fastChargeContactors)} opacity="0.3" />
                        <circle cx="25" cy="70" r="5" fill={getStatusColor(state.contactors.fastChargeContactors)} />
                        <text x="38" y="73" fill="#aaa" fontSize="9">Fast Chg</text>

                        {/* Precharge */}
                        <circle cx="25" cy="95" r="8" fill={getStatusColor(state.contactors.prechargeRelay)} opacity="0.3" />
                        <circle cx="25" cy="95" r="5" fill={getStatusColor(state.contactors.prechargeRelay)} />
                        <text x="38" y="98" fill="#aaa" fontSize="9">Precharge</text>
                    </g>

                    {/* PCS (Power Conversion System) */}
                    <g transform="translate(310, 205)">
                        <rect width="100" height="55" rx="6"
                            fill={state.pcs.status === 'active' ? 'rgba(0,212,255,0.1)' : 'rgba(0,0,0,0.3)'}
                            stroke={state.pcs.status === 'active' ? '#00d4ff' : 'rgba(255,255,255,0.1)'} strokeWidth="1.5" />
                        <text x="50" y="18" textAnchor="middle" fill="#aaa" fontSize="9">PCS</text>
                        <text x="50" y="35" textAnchor="middle" fill={state.pcs.status === 'active' ? '#00d4ff' : '#8b8b8b'} fontSize="11" fontWeight="bold">
                            {state.pcs.mode}
                        </text>
                        {state.pcs.status === 'active' && (
                            <text x="50" y="50" textAnchor="middle" fill="#00ff88" fontSize="10">
                                {state.pcs.power.toFixed(0)} kW
                            </text>
                        )}
                    </g>

                    {/* Connection Lines */}
                    <path d="M 180 170 L 200 170" stroke="rgba(0,212,255,0.5)" strokeWidth="3" strokeDasharray={isCharging ? "0" : "5,5"}>
                        {isCharging && <animate attributeName="stroke-dashoffset" values="10;0" dur="0.5s" repeatCount="indefinite" />}
                    </path>
                    <path d="M 280 170 L 310 170" stroke="rgba(0,212,255,0.5)" strokeWidth="3" strokeDasharray={isCharging ? "0" : "5,5"} />
                    <path d="M 410 135 L 440 135 L 440 230 L 510 230" stroke="rgba(0,212,255,0.5)" strokeWidth="2" />

                    {/* Charge Port (Right) */}
                    <g transform="translate(500, 100)">
                        <rect width="160" height="180" rx="10" fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
                        <text x="80" y="25" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">Charge Port</text>

                        {/* Cable connector visual */}
                        <rect x="40" y="40" width="80" height="50" rx="8"
                            fill={state.chargePort.cableState !== 'Disconnected' ? 'rgba(0,255,136,0.1)' : 'rgba(0,0,0,0.3)'}
                            stroke={getStatusColor(state.chargePort.cableState)} strokeWidth="2" />
                        <circle cx="60" cy="65" r="8" fill={state.chargePort.cableState !== 'Disconnected' ? '#00ff88' : '#333'} />
                        <circle cx="100" cy="65" r="8" fill={state.chargePort.cableState !== 'Disconnected' ? '#00ff88' : '#333'} />

                        {/* Status Labels */}
                        <text x="15" y="115" fill="#aaa" fontSize="9">Cable:</text>
                        <text x="55" y="115" fill={getStatusColor(state.chargePort.cableState)} fontSize="9" fontWeight="bold">
                            {state.chargePort.cableState}
                        </text>

                        <text x="15" y="132" fill="#aaa" fontSize="9">Latch:</text>
                        <text x="55" y="132" fill={getStatusColor(state.chargePort.latchState)} fontSize="9" fontWeight="bold">
                            {state.chargePort.latchState}
                        </text>

                        <text x="15" y="149" fill="#aaa" fontSize="9">AC Pin:</text>
                        <text x="60" y="149" fill="#00d4ff" fontSize="9">{state.chargePort.acPinTemp.toFixed(1)}°C</text>

                        <text x="15" y="166" fill="#aaa" fontSize="9">DC Pin:</text>
                        <text x="60" y="166" fill="#00d4ff" fontSize="9">{state.chargePort.dcPinTemp.toFixed(1)}°C</text>
                    </g>

                    {/* Legend */}
                    <g transform="translate(20, 315)">
                        <circle cx="10" cy="10" r="5" fill="#00ff88" />
                        <text x="22" y="14" fill="#aaa" fontSize="9">Active/OK</text>
                        <circle cx="90" cy="10" r="5" fill="#fbbf24" />
                        <text x="102" y="14" fill="#aaa" fontSize="9">Idle/Open</text>
                        <circle cx="170" cy="10" r="5" fill="#ff4757" />
                        <text x="182" y="14" fill="#aaa" fontSize="9">Fault</text>
                    </g>
                </svg>
            </div>

            {/* Bottom Status Bar */}
            <div style={styles.statusBar}>
                <StatusIndicator status={state.hvBattery.status} label={`HV Battery: ${state.hvBattery.status.toUpperCase()}`} />
                <StatusIndicator status={state.contactors.packContactors} label={`Pack Contactors: ${state.contactors.packContactors}`} />
                <StatusIndicator status={state.pcs.status} label={`PCS: ${state.pcs.mode}`} />
                <StatusIndicator status={state.chargePort.status} label={`Charge Port: ${state.chargePort.status.toUpperCase()}`} />

                <button style={styles.resetBtn}>
                    🔄 ECU Reset
                </button>
            </div>
        </div>
    )
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        background: 'linear-gradient(135deg, rgba(13, 33, 55, 0.95) 0%, rgba(10, 22, 40, 0.98) 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        paddingBottom: '12px'
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    headerRight: {
        display: 'flex',
        gap: '10px'
    },
    icon: { fontSize: '1.5rem' },
    title: {
        fontSize: '1rem',
        fontWeight: 700,
        color: '#fff',
        letterSpacing: '1.5px'
    },
    chargeBtn: {
        padding: '8px 16px',
        border: '1px solid',
        borderRadius: '6px',
        background: 'rgba(255, 187, 36, 0.2)',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: 600,
        transition: 'all 0.2s ease'
    },
    diagramContainer: {
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '12px',
        padding: '10px',
        minHeight: '350px'
    },
    svg: {
        width: '100%',
        height: '100%'
    },
    statusBar: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        flexWrap: 'wrap',
        padding: '12px',
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '8px'
    },
    statusRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.8rem'
    },
    statusDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        animation: 'pulse 2s infinite'
    },
    resetBtn: {
        marginLeft: 'auto',
        padding: '6px 12px',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '4px',
        background: 'rgba(0, 0, 0, 0.3)',
        color: '#aaa',
        cursor: 'pointer',
        fontSize: '0.8rem'
    }
}

export default HVBatteryChargingMonitor
