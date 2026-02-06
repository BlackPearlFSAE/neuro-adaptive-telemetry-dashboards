import React, { useState, useEffect } from 'react'

/**
 * Thermal Management System Widget
 * Exact replica of Tesla TMS diagnostic interface
 * Based on IMG_7349.jpg reference
 */

interface TMSData {
    ambient_temp: number
    radiator_fan_rpm: number
    five_way_valve: string
    chiller_active: boolean
    powertrain_loop: {
        name: string
        inlet_temp: number
        outlet_temp: number
        flow_rate: number
        pump_rpm: number
        status: string
    }
    battery_loop: {
        name: string
        inlet_temp: number
        outlet_temp: number
        flow_rate: number
        pump_rpm: number
        status: string
    }
    components: {
        pcs: number
        dcdc: number
        charger: number
        front_inverter: number
        rear_inverter: number
        hv_battery: number
        autopilot: number
        infotainment: number
    }
}

export const ThermalManagementWidget: React.FC = () => {
    const [tms, setTms] = useState<TMSData | null>(null)
    const [animOffset, setAnimOffset] = useState(0)

    // Animate coolant flow
    useEffect(() => {
        const anim = setInterval(() => {
            setAnimOffset(prev => (prev + 3) % 60)
        }, 50)
        return () => clearInterval(anim)
    }, [])

    useEffect(() => {
        const fetchTMS = async () => {
            try {
                const res = await fetch('/api/thermal')
                if (res.ok) setTms(await res.json())
            } catch {
                setTms(getMockData())
            }
        }
        fetchTMS()
        const interval = setInterval(fetchTMS, 1000)
        return () => clearInterval(interval)
    }, [])

    if (!tms) return <div style={styles.loading}>Loading TMS...</div>

    const handlePurge = () => fetch('/api/thermal/purge', { method: 'POST' }).catch(() => { })
    const handleFillDrain = () => fetch('/api/thermal/fill-drain', { method: 'POST' }).catch(() => { })
    const handleValveTest = () => fetch('/api/thermal/valve-test', { method: 'POST' }).catch(() => { })

    // Pipe color - cyan/turquoise like Tesla
    const pipeColor = '#00c8e0'
    const pipeWidth = 14

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span style={styles.icon}>🌡️</span>
                <span style={styles.title}>THERMAL MANAGEMENT SYSTEM</span>
                <span style={{ ...styles.badge, background: tms.chiller_active ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.1)' }}>
                    {tms.chiller_active ? '❄️ CHILLER ACTIVE' : 'CHILLER OFF'}
                </span>
            </div>

            {/* Main Schematic - Exact Tesla Layout */}
            <div style={styles.schematicWrapper}>
                <svg width="100%" height="500" viewBox="0 0 800 550" style={{ background: '#0a0a0a', borderRadius: '12px' }}>
                    <defs>
                        {/* Animated dash pattern */}
                        <pattern id="flow" width="20" height="20" patternUnits="userSpaceOnUse">
                            <circle cx="10" cy="10" r="3" fill="rgba(255,255,255,0.4)" />
                        </pattern>
                    </defs>

                    {/* ===== AMBIENT AIR (TOP CENTER) ===== */}
                    <text x="400" y="25" textAnchor="middle" fill="#00ff88" fontSize="13" fontWeight="bold">
                        🌡️ Ambient Air: {tms.ambient_temp.toFixed(0)}°C
                    </text>

                    {/* ===== RADIATOR (TOP CENTER) ===== */}
                    <g transform="translate(340, 40)">
                        <rect width="120" height="50" rx="8" fill="rgba(0,0,0,0.6)" stroke="#444" strokeWidth="2" />
                        <text x="60" y="22" textAnchor="middle" fill="#fff" fontSize="11">🌀 Radiator</text>
                        <text x="60" y="40" textAnchor="middle" fill={tms.radiator_fan_rpm > 0 ? '#00d4ff' : '#666'} fontSize="12" fontWeight="bold">
                            Fan: {tms.radiator_fan_rpm} RPM
                        </text>
                        {/* Fan icons */}
                        <g transform="translate(95, 25)">
                            <circle r="12" fill="none" stroke="#444" strokeWidth="1" />
                            {tms.radiator_fan_rpm > 0 && (
                                <g>
                                    <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="1s" repeatCount="indefinite" />
                                    <line x1="-8" y1="0" x2="8" y2="0" stroke="#00d4ff" strokeWidth="2" />
                                    <line x1="0" y1="-8" x2="0" y2="8" stroke="#00d4ff" strokeWidth="2" />
                                </g>
                            )}
                        </g>
                    </g>

                    {/* ===== SUPERMANIFOLD LABEL ===== */}
                    <text x="50" y="105" fill="#555" fontSize="10" fontStyle="italic">Supermanifold</text>

                    {/* ===== PT PUMP (LEFT) ===== */}
                    <g transform="translate(80, 160)">
                        <circle r="28" fill="#1a1a2e" stroke="#00d4ff" strokeWidth="2" />
                        <text x="0" y="-8" textAnchor="middle" fill="#fff" fontSize="9">⚙️ PT Pump</text>
                        <text x="0" y="8" textAnchor="middle" fill="#888" fontSize="9">RPM:</text>
                        <text x="0" y="22" textAnchor="middle" fill="#00d4ff" fontSize="13" fontWeight="bold">{tms.powertrain_loop.pump_rpm}</text>
                    </g>

                    {/* ===== 5-WAY VALVE (CENTER) ===== */}
                    <g transform="translate(400, 160)">
                        <circle r="35" fill="#1a1a2e" stroke="#fbbf24" strokeWidth="3" />
                        <text x="0" y="-10" textAnchor="middle" fill="#fff" fontSize="10">🔄 5-Way Valve</text>
                        <text x="0" y="25" textAnchor="middle" fill="#fbbf24" fontSize="14" fontWeight="bold">{tms.five_way_valve}</text>
                    </g>

                    {/* ===== CHILLER (RIGHT TOP) ===== */}
                    <g transform="translate(620, 115)">
                        <rect width="100" height="45" rx="6"
                            fill={tms.chiller_active ? 'rgba(0,212,255,0.15)' : 'rgba(0,0,0,0.4)'}
                            stroke={tms.chiller_active ? '#00d4ff' : '#444'} strokeWidth="2" />
                        <text x="50" y="20" textAnchor="middle" fill="#fff" fontSize="10">❄️ Chiller</text>
                        <text x="50" y="36" textAnchor="middle" fill={tms.chiller_active ? '#ff6b6b' : '#666'} fontSize="10" fontWeight="bold">
                            Refrigerant
                        </text>
                    </g>

                    {/* ===== BATTERY PUMP (RIGHT) ===== */}
                    <g transform="translate(550, 200)">
                        <circle r="28" fill="#1a1a2e" stroke="#00d4ff" strokeWidth="2" />
                        <text x="0" y="-8" textAnchor="middle" fill="#fff" fontSize="9">⚙️ Battery Pump</text>
                        <text x="0" y="8" textAnchor="middle" fill="#888" fontSize="9">RPM:</text>
                        <text x="0" y="22" textAnchor="middle" fill="#00d4ff" fontSize="13" fontWeight="bold">{tms.battery_loop.pump_rpm}</text>
                    </g>

                    {/* ===== COOLANT BOTTLE (CENTER BOTTOM) ===== */}
                    <g transform="translate(360, 240)">
                        <rect width="80" height="45" rx="6" fill="rgba(0,100,100,0.3)" stroke="#008888" strokeWidth="2" />
                        <text x="40" y="20" textAnchor="middle" fill="#00d4ff" fontSize="10">Coolant</text>
                        <text x="40" y="36" textAnchor="middle" fill="#00d4ff" fontSize="11" fontWeight="bold">Bottle</text>
                    </g>

                    {/* ===== PT LOOP INLET (LEFT BOTTOM) ===== */}
                    <g transform="translate(40, 250)">
                        <rect width="100" height="55" rx="6" fill="rgba(0,0,0,0.5)" stroke="#00d4ff" strokeWidth="1" />
                        <text x="50" y="17" textAnchor="middle" fill="#888" fontSize="9">⚡ PT Loop Inlet</text>
                        <text x="50" y="34" textAnchor="middle" fill="#00ff88" fontSize="12" fontWeight="bold">
                            Temp: {tms.powertrain_loop.inlet_temp.toFixed(0)}°C
                        </text>
                        <text x="50" y="48" textAnchor="middle" fill="#00d4ff" fontSize="10">
                            Flow: {tms.powertrain_loop.flow_rate.toFixed(0)}LPM
                        </text>
                    </g>

                    {/* ===== BATTERY LOOP INLET (RIGHT BOTTOM) ===== */}
                    <g transform="translate(660, 250)">
                        <rect width="100" height="55" rx="6" fill="rgba(0,0,0,0.5)" stroke="#00d4ff" strokeWidth="1" />
                        <text x="50" y="17" textAnchor="middle" fill="#888" fontSize="9">🔋 Battery Loop Inlet</text>
                        <text x="50" y="34" textAnchor="middle" fill="#00ff88" fontSize="12" fontWeight="bold">
                            Temp: {tms.battery_loop.inlet_temp.toFixed(0)}°C
                        </text>
                        <text x="50" y="48" textAnchor="middle" fill="#00d4ff" fontSize="10">
                            Flow: {tms.battery_loop.flow_rate.toFixed(0)}LPM
                        </text>
                    </g>

                    {/* ===== COOLANT PIPES - MAIN FIGURE-8 LAYOUT ===== */}

                    {/* PT Loop - Left side pipe (bottom to pump to valve) */}
                    <path
                        d={`M 90 280 
                            L 90 190 
                            L 90 160 
                            Q 90 130, 120 130 
                            L 200 130
                            Q 250 130, 280 140
                            L 365 160`}
                        fill="none" stroke={pipeColor} strokeWidth={pipeWidth} strokeLinecap="round" strokeLinejoin="round" opacity="0.85"
                    />
                    {/* Animated flow */}
                    <path
                        d="M 90 280 L 90 160 Q 90 130, 120 130 L 200 130 Q 250 130, 280 140 L 365 160"
                        fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={pipeWidth - 4} strokeLinecap="round"
                        strokeDasharray="10 30" strokeDashoffset={-animOffset}
                    />

                    {/* Top connection to radiator */}
                    <path
                        d="M 400 125 L 400 90"
                        fill="none" stroke={pipeColor} strokeWidth={pipeWidth} strokeLinecap="round"
                    />

                    {/* Battery Loop - Right side pipe (valve to pump to bottom) */}
                    <path
                        d={`M 435 160 
                            Q 480 140, 520 140
                            L 550 140
                            L 550 170`}
                        fill="none" stroke={pipeColor} strokeWidth={pipeWidth} strokeLinecap="round" strokeLinejoin="round" opacity="0.85"
                    />
                    {/* Chiller connection */}
                    <path
                        d="M 550 140 Q 580 130, 620 130"
                        fill="none" stroke={pipeColor} strokeWidth={pipeWidth} strokeLinecap="round" opacity="0.85"
                    />

                    {/* Battery loop bottom */}
                    <path
                        d="M 550 230 L 550 280 L 710 280"
                        fill="none" stroke={pipeColor} strokeWidth={pipeWidth} strokeLinecap="round" strokeLinejoin="round" opacity="0.85"
                    />
                    {/* Animated flow */}
                    <path
                        d="M 435 160 Q 480 140, 520 140 L 550 170"
                        fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={pipeWidth - 4} strokeLinecap="round"
                        strokeDasharray="10 30" strokeDashoffset={-animOffset}
                    />

                    {/* Return pipes (darker) */}
                    <path
                        d="M 140 280 L 200 280 L 200 200 L 280 200 L 365 175"
                        fill="none" stroke={pipeColor} strokeWidth={pipeWidth} strokeLinecap="round" strokeLinejoin="round" opacity="0.5"
                    />
                    <path
                        d="M 435 175 L 480 200 L 520 200 L 600 200 L 660 280"
                        fill="none" stroke={pipeColor} strokeWidth={pipeWidth} strokeLinecap="round" strokeLinejoin="round" opacity="0.5"
                    />

                    {/* ===== POWERTRAIN LOOP COMPONENTS (BOTTOM LEFT) ===== */}
                    <g transform="translate(30, 330)">
                        <rect width="200" height="160" rx="8" fill="rgba(0,0,0,0.4)" stroke="#333" />
                        <text x="10" y="20" fill="#888" fontSize="11">Powertrain Loop</text>

                        {/* PCS */}
                        <rect x="10" y="35" width="50" height="22" rx="3" fill="rgba(0,0,0,0.5)" stroke="#555" />
                        <text x="35" y="50" textAnchor="middle" fill="#aaa" fontSize="9">PCS</text>
                        <rect x="65" y="35" width="50" height="22" rx="3" fill="rgba(0,0,0,0.5)" stroke="#555" />
                        <text x="90" y="50" textAnchor="middle" fill="#aaa" fontSize="9">DCDC</text>

                        <circle cx="35" cy="70" r="5" fill="#00d4ff" />
                        <text x="48" y="74" fill="#fff" fontSize="10">{tms.components.pcs.toFixed(0)}°C</text>
                        <circle cx="90" cy="70" r="5" fill="#00d4ff" />
                        <text x="103" y="74" fill="#fff" fontSize="10">{tms.components.dcdc.toFixed(0)}°C</text>

                        {/* Charger */}
                        <rect x="120" y="35" width="55" height="22" rx="3" fill="rgba(0,0,0,0.5)" stroke="#555" />
                        <text x="147" y="50" textAnchor="middle" fill="#aaa" fontSize="9">Charger</text>
                        <circle cx="147" cy="70" r="5" fill="#00d4ff" />
                        <text x="160" y="74" fill="#fff" fontSize="10">{tms.components.charger.toFixed(0)}°C</text>

                        {/* Drive Inverters */}
                        <text x="10" y="100" fill="#ff6b6b" fontSize="9">⚡ Rear Drive Inverter</text>
                        <circle cx="140" cy="96" r="5" fill={tms.components.rear_inverter > 40 ? '#fbbf24' : '#00d4ff'} />
                        <text x="155" y="100" fill="#fff" fontSize="10">{tms.components.rear_inverter.toFixed(0)}°C</text>

                        <text x="10" y="120" fill="#ff6b6b" fontSize="9">⚡ Front Drive Inverter</text>
                        <circle cx="140" cy="116" r="5" fill={tms.components.front_inverter > 40 ? '#fbbf24' : '#00d4ff'} />
                        <text x="155" y="120" fill="#fff" fontSize="10">{tms.components.front_inverter.toFixed(0)}°C</text>
                    </g>

                    {/* ===== BATTERY LOOP COMPONENTS (BOTTOM RIGHT) ===== */}
                    <g transform="translate(570, 330)">
                        <rect width="200" height="160" rx="8" fill="rgba(0,0,0,0.4)" stroke="#333" />
                        <text x="10" y="20" fill="#888" fontSize="11">Battery Loop</text>

                        {/* Autopilot */}
                        <rect x="10" y="35" width="85" height="22" rx="3" fill="rgba(0,0,0,0.5)" stroke="#555" />
                        <text x="52" y="50" textAnchor="middle" fill="#aaa" fontSize="9">Autopilot</text>
                        <circle cx="120" cy="46" r="5" fill={tms.components.autopilot > 55 ? '#ff4757' : '#00d4ff'} />
                        <text x="135" y="50" fill="#fff" fontSize="10">{tms.components.autopilot.toFixed(0)}°C</text>

                        {/* Infotainment */}
                        <rect x="10" y="65" width="85" height="22" rx="3" fill="rgba(0,0,0,0.5)" stroke="#555" />
                        <text x="52" y="80" textAnchor="middle" fill="#aaa" fontSize="9">Infotainment</text>
                        <circle cx="120" cy="76" r="5" fill="#00d4ff" />
                        <text x="135" y="80" fill="#fff" fontSize="10">{tms.components.infotainment.toFixed(0)}°C</text>

                        {/* HV Battery */}
                        <rect x="10" y="100" width="180" height="45" rx="4" fill="rgba(0,255,136,0.1)" stroke="#00ff88" strokeWidth="2" />
                        <text x="20" y="118" fill="#fff" fontSize="10">🔋 HV Battery</text>
                        <text x="100" y="135" textAnchor="start" fill="#fff" fontSize="11">Max</text>
                        <text x="100" y="118" textAnchor="start" fill="#00ff88" fontSize="14" fontWeight="bold">{tms.components.hv_battery.toFixed(0)}°C</text>
                        <text x="155" y="118" fill="#888" fontSize="9">Min</text>
                    </g>
                </svg>
            </div>

            {/* Control Buttons (matching Tesla layout) */}
            <div style={styles.controls}>
                <button style={styles.controlBtn} onClick={handlePurge}>
                    Coolant Purge Start
                </button>
                <button style={styles.controlBtn} onClick={handleFillDrain}>
                    Start Coolant Fill/Drain
                </button>
                <button style={styles.controlBtn} onClick={handleValveTest}>
                    Coolant Valve Test
                </button>
            </div>
        </div>
    )
}

const getMockData = (): TMSData => ({
    ambient_temp: 28.0,
    radiator_fan_rpm: 0,
    five_way_valve: "Series",
    chiller_active: false,
    powertrain_loop: { name: "Powertrain", inlet_temp: 29, outlet_temp: 35, flow_rate: 5, pump_rpm: 1590, status: "normal" },
    battery_loop: { name: "Battery", inlet_temp: 30, outlet_temp: 33, flow_rate: 5, pump_rpm: 1560, status: "normal" },
    components: {
        pcs: 30,
        dcdc: 29,
        charger: 28,
        front_inverter: 33,
        rear_inverter: 35,
        hv_battery: 30,
        autopilot: 52,
        infotainment: 38
    }
})

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        background: 'linear-gradient(135deg, rgba(13, 33, 55, 0.95) 0%, rgba(10, 22, 40, 0.98) 100%)',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex', flexDirection: 'column', gap: '16px'
    },
    loading: { color: '#888', textAlign: 'center', padding: '40px' },
    header: {
        display: 'flex', alignItems: 'center', gap: '12px',
        borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px'
    },
    icon: { fontSize: '1.5rem' },
    title: { fontSize: '1rem', fontWeight: 700, color: '#fff', letterSpacing: '1.5px', flex: 1 },
    badge: {
        fontSize: '0.75rem', fontWeight: 600, color: '#00d4ff', padding: '6px 12px', borderRadius: '6px',
        border: '1px solid rgba(0,212,255,0.3)'
    },
    schematicWrapper: {
        borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)'
    },
    controls: {
        display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap'
    },
    controlBtn: {
        padding: '12px 24px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
        background: 'rgba(0,0,0,0.4)', color: '#fff', fontWeight: 600,
        cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s',
    }
}
