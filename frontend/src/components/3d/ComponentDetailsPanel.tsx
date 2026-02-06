/**
 * ComponentDetailsPanel.tsx
 * =========================
 * Technician analysis panel showing selected component's real-time telemetry
 */

import React, { useState, useEffect, useRef } from 'react'
import { Subsystem } from './FormulaCar3D'
import { VehicleTelemetryData } from '../../types/telemetry'

interface ComponentDetailsPanelProps {
    selectedComponent: Subsystem | null
    telemetry: VehicleTelemetryData
    onClose: () => void
}

// Component metadata
const COMPONENT_INFO: Record<Subsystem, { name: string; icon: string; description: string }> = {
    chassis: { name: 'Space Frame', icon: '🏗️', description: 'Tubular steel chassis structure' },
    suspension_fl: { name: 'Suspension FL', icon: '🔧', description: 'Front-left double wishbone' },
    suspension_fr: { name: 'Suspension FR', icon: '🔧', description: 'Front-right double wishbone' },
    suspension_rl: { name: 'Suspension RL', icon: '🔧', description: 'Rear-left multilink' },
    suspension_rr: { name: 'Suspension RR', icon: '🔧', description: 'Rear-right multilink' },
    powertrain: { name: 'Powertrain', icon: '⚡', description: 'Electric motor + inverter' },
    battery: { name: 'HV Battery', icon: '🔋', description: '96-cell accumulator pack' },
    brakes: { name: 'Brake System', icon: '🛑', description: 'Hydraulic disc brakes' },
    aero_front: { name: 'Front Aero', icon: '💨', description: 'Nose cone + front wing' },
    aero_rear: { name: 'Rear Aero', icon: '💨', description: 'Rear wing + diffuser' },
    wheel_fl: { name: 'Wheel FL', icon: '⭕', description: 'Front-left tire assembly' },
    wheel_fr: { name: 'Wheel FR', icon: '⭕', description: 'Front-right tire assembly' },
    wheel_rl: { name: 'Wheel RL', icon: '⭕', description: 'Rear-left tire assembly' },
    wheel_rr: { name: 'Wheel RR', icon: '⭕', description: 'Rear-right tire assembly' }
}

// Mini sparkline chart
const Sparkline: React.FC<{ data: number[]; color: string; height?: number }> = ({ data, color, height = 30 }) => {
    const max = Math.max(...data, 1)
    const min = Math.min(...data, 0)
    const range = max - min || 1

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * 100
        const y = height - ((val - min) / range) * height
        return `${x},${y}`
    }).join(' ')

    return (
        <svg width="100%" height={height} style={{ display: 'block' }}>
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

// Metric row display
const MetricRow: React.FC<{
    label: string
    value: string | number
    unit?: string
    status?: 'optimal' | 'warning' | 'critical'
    history?: number[]
}> = ({ label, value, unit, status, history }) => {
    const statusColors = {
        optimal: '#10b981',
        warning: '#f59e0b',
        critical: '#ef4444'
    }

    return (
        <div style={styles.metricRow}>
            <div style={styles.metricLabel}>{label}</div>
            <div style={styles.metricValueContainer}>
                {history && history.length > 1 && (
                    <div style={styles.sparklineContainer}>
                        <Sparkline data={history} color={statusColors[status || 'optimal']} />
                    </div>
                )}
                <div style={{
                    ...styles.metricValue,
                    color: status ? statusColors[status] : '#fff'
                }}>
                    {typeof value === 'number' ? value.toFixed(1) : value}
                    {unit && <span style={styles.metricUnit}>{unit}</span>}
                </div>
            </div>
        </div>
    )
}

// Status indicator
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const colors: Record<string, string> = {
        optimal: '#10b981',
        warning: '#f59e0b',
        critical: '#ef4444'
    }

    return (
        <div style={{
            ...styles.statusBadge,
            backgroundColor: `${colors[status] || '#6b7280'}20`,
            borderColor: colors[status] || '#6b7280',
            color: colors[status] || '#6b7280'
        }}>
            <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: colors[status] || '#6b7280',
                marginRight: '6px'
            }} />
            {status.toUpperCase()}
        </div>
    )
}

// Cell Voltage Bar Chart
const CellVoltageChart: React.FC<{ voltages: number[] }> = ({ voltages }) => {
    if (!voltages || voltages.length === 0) return <div style={styles.noData}>No cell data available</div>

    const minV = 3.0
    const maxV = 4.2
    const avgV = voltages.reduce((a, b) => a + b, 0) / voltages.length
    const minCell = Math.min(...voltages)
    const maxCell = Math.max(...voltages)
    const diff = maxCell - minCell

    return (
        <div style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
                <span>Avg: {avgV.toFixed(3)}V</span>
                <span>Delta: {(diff * 1000).toFixed(0)}mV</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', height: '60px', gap: '1px', marginBottom: '8px' }}>
                {voltages.map((v, i) => {
                    const height = Math.max(0, Math.min(100, ((v - minV) / (maxV - minV)) * 100))
                    const color = v < 3.2 ? '#ef4444' : v > 4.15 ? '#f59e0b' : '#10b981'
                    return (
                        <div key={i} style={{
                            flex: 1,
                            backgroundColor: color,
                            height: `${height}%`,
                            opacity: 0.8,
                            minWidth: '2px'
                        }} title={`Cell ${i + 1}: ${v.toFixed(3)}V`} />
                    )
                })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                <span>Cell 1</span>
                <span>Cell 96</span>
            </div>
        </div>
    )
}

// Safety Flag Indicator
const SafetyChain: React.FC<{ safety: any }> = ({ safety }) => {
    if (!safety) return null
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            <Badge label="HV SYSTEM" active={safety.hv_on} color="#ef4444" />
            <Badge label="IMD OK" active={safety.imd_ok} color="#10b981" />
            <Badge label="BMS OK" active={safety.ams_ok} color="#10b981" />
            <Badge label="BSPD OK" active={safety.bspd_ok} color="#10b981" />
        </div>
    )
}

const Badge: React.FC<{ label: string, active: boolean, color: string }> = ({ label, active, color }) => (
    <div style={{
        padding: '6px',
        borderRadius: '4px',
        backgroundColor: active ? `${color}20` : 'rgba(255,255,255,0.05)',
        border: `1px solid ${active ? color : 'rgba(255,255,255,0.1)'}`,
        color: active ? color : 'rgba(255,255,255,0.3)',
        fontSize: '0.7rem',
        fontWeight: 600,
        textAlign: 'center'
    }}>
        {label}
    </div>
)

export const ComponentDetailsPanel: React.FC<ComponentDetailsPanelProps> = ({
    selectedComponent,
    telemetry,
    onClose
}) => {
    // History buffers for sparklines
    const [history, setHistory] = useState<{ [key: string]: number[] }>({})
    const historyRef = useRef<{ [key: string]: number[] }>({})

    // Update history on telemetry change
    useEffect(() => {
        if (!selectedComponent || !telemetry) return

        const newHistory = { ...historyRef.current }
        const maxPoints = 50 // Increased for smoother history

        const pushData = (key: string, value: number) => {
            if (!newHistory[key]) newHistory[key] = []
            newHistory[key] = [...newHistory[key].slice(-maxPoints + 1), value]
        }

        // Add current values to history based on component type
        if (selectedComponent === 'powertrain' && telemetry.motor) {
            pushData('motor_rpm', telemetry.motor.rpm)
            pushData('motor_temp', telemetry.motor.temperature)
            pushData('motor_torque', telemetry.motor.torque_nm)
        }

        if (selectedComponent === 'battery' && telemetry.battery) {
            pushData('battery_soc', telemetry.battery.soc)
            pushData('battery_current', telemetry.battery.current)
        }

        // Suspension history
        if (selectedComponent?.startsWith('suspension') && telemetry.chassis) {
            const corner = selectedComponent.split('_')[1]
            const travel = (telemetry.chassis.suspension_travel as any)?.[corner] || 0
            pushData(`suspension_${corner}`, travel)
        }

        historyRef.current = newHistory
        setHistory(newHistory)
    }, [telemetry, selectedComponent])

    if (!selectedComponent) {
        return (
            <div style={styles.emptyPanel}>
                <div style={styles.emptyIcon}>👆</div>
                <div style={styles.emptyText}>Click a component to inspect</div>
                <div style={styles.emptySubtext}>Hover to highlight • Click to select</div>
            </div>
        )
    }

    const info = COMPONENT_INFO[selectedComponent]

    // Get component-specific telemetry
    const getComponentTelemetry = (): React.ReactNode => {
        switch (selectedComponent) {
            case 'powertrain':
                if (!telemetry.motor) return <div style={styles.noData}>No motor data</div>
                return (
                    <>
                        <MetricRow
                            label="RPM"
                            value={telemetry.motor.rpm}
                            history={history.motor_rpm}
                            status={telemetry.motor.status as any}
                        />
                        <MetricRow
                            label="Torque"
                            value={telemetry.motor.torque_nm} // New Metric
                            unit="Nm"
                            history={history.motor_torque}
                            status="optimal"
                        />
                        <MetricRow
                            label="Power"
                            value={telemetry.motor.power_kw}
                            unit="kW"
                            status={telemetry.motor.status as any}
                        />
                        <MetricRow
                            label="Efficiency"
                            value={telemetry.motor.efficiency || 95} // New Metric
                            unit="%"
                            status="optimal"
                        />
                        <MetricRow
                            label="Inverter Mode"
                            value={telemetry.motor.inv_mode || 'RUN'} // New Metric
                            status="optimal"
                        />
                        <MetricRow
                            label="Temperature"
                            value={telemetry.motor.temperature}
                            unit="°C"
                            history={history.motor_temp}
                            status={telemetry.motor.temperature > 90 ? 'critical' : telemetry.motor.temperature > 80 ? 'warning' : 'optimal'}
                        />
                        <StatusBadge status={telemetry.motor.status} />
                    </>
                )

            case 'battery':
                if (!telemetry.battery) return <div style={styles.noData}>No battery data</div>
                return (
                    <>
                        <div style={styles.sectionTitle}>PACK STATUS</div>
                        <MetricRow
                            label="SoC"
                            value={telemetry.battery.soc}
                            unit="%"
                            history={history.battery_soc}
                            status={telemetry.battery.soc < 15 ? 'critical' : telemetry.battery.soc < 30 ? 'warning' : 'optimal'}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <MetricRow label="Voltage" value={telemetry.battery.voltage} unit="V" status="optimal" />
                            <MetricRow label="Current" value={telemetry.battery.current} unit="A" history={history.battery_current} status="optimal" />
                        </div>

                        <div style={styles.sectionTitle}>CELL MONITORING</div>
                        {/* Cell Voltage Map */}
                        {telemetry.cellMonitoring && (
                            <CellVoltageChart voltages={telemetry.cellMonitoring.voltages} />
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <MetricRow label="Min Cell" value={telemetry.cellMonitoring?.min_voltage || 0} unit="V" status="optimal" />
                            <MetricRow label="Max Cell" value={telemetry.cellMonitoring?.max_voltage || 0} unit="V" status="optimal" />
                        </div>
                        <MetricRow label="Pack Health (SOH)" value={telemetry.battery.health_soh || 100} unit="%" status="optimal" />

                        <StatusBadge status={telemetry.battery.status} />
                    </>
                )

            case 'suspension_fl':
            case 'suspension_fr':
            case 'suspension_rl':
            case 'suspension_rr':
                const suspCorner = selectedComponent.split('_')[1]
                const travel = (telemetry.chassis?.suspension_travel as any)?.[suspCorner] || 0
                // Calculate pseudo-velocity from history
                const hist = history[`suspension_${suspCorner}`]
                const velocity = hist && hist.length > 1 ? (Math.abs(hist[hist.length - 1] - hist[hist.length - 2]) * 60) : 0 // approx mm/s

                return (
                    <>
                        <MetricRow
                            label="Travel"
                            value={travel}
                            unit="mm"
                            history={hist}
                            status={Math.abs(travel) > 25 ? 'warning' : 'optimal'}
                        />
                        <MetricRow
                            label="Damper Velocity"
                            value={velocity.toFixed(0)}
                            unit="mm/s"
                            status="optimal"
                        />
                        <div style={styles.infoText}>Double Wishbone Geometry</div>
                        <div style={{ ...styles.infoText, color: '#f59e0b' }}>
                            {Math.abs(travel) > 20 ? 'High Load Detected' : 'Nominal Load'}
                        </div>
                    </>
                )

            case 'wheel_fl':
            case 'wheel_fr':
            case 'wheel_rl':
            case 'wheel_rr':
                const cornerMap = { wheel_fl: 'front_left', wheel_fr: 'front_right', wheel_rl: 'rear_left', wheel_rr: 'rear_right' }
                const corner = cornerMap[selectedComponent] as keyof typeof telemetry.tires
                if (!telemetry.tires) return <div style={styles.noData}>No tire data</div>
                const tireData = (telemetry.tires as any)[corner]
                const brakeTemp = telemetry.brakes ? (telemetry.brakes as any)[`${corner}_temp`] : 0
                return (
                    <>
                        <MetricRow
                            label="Tire Temp"
                            value={tireData?.temp || 0}
                            unit="°C"
                            status={tireData?.temp > 110 ? 'critical' : tireData?.temp > 100 ? 'warning' : 'optimal'}
                        />
                        <MetricRow label="Pressure" value={tireData?.pressure || 0} unit="bar" status="optimal" />
                        <MetricRow label="Wear" value={tireData?.wear || 0} unit="%" status={tireData?.wear < 30 ? 'warning' : 'optimal'} />
                        <div style={styles.divider} />
                        <div style={styles.sectionTitle}>BRAKE ASSEMBLY</div>
                        <MetricRow
                            label="Disc Temp"
                            value={brakeTemp}
                            unit="°C"
                            status={brakeTemp > 750 ? 'critical' : brakeTemp > 650 ? 'warning' : 'optimal'}
                        />
                    </>
                )

            case 'brakes':
                if (!telemetry.brakes) return <div style={styles.noData}>No brake data</div>
                return (
                    <>
                        <MetricRow label="Bias (Front)" value={telemetry.brakes.bias_percent} unit="%" status="optimal" />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <MetricRow label="Front Press." value={telemetry.brakes.pressure_front} unit="bar" status="optimal" />
                            <MetricRow label="Rear Press." value={telemetry.brakes.pressure_rear} unit="bar" status="optimal" />
                        </div>
                        <div style={styles.infoText}>Hydraulic System OK</div>
                    </>
                )

            case 'chassis':
                if (!telemetry.chassis) return <div style={styles.noData}>No chassis data</div>
                return (
                    <>
                        {telemetry.chassis.safety && <SafetyChain safety={telemetry.chassis.safety} />}
                        <MetricRow label="Speed" value={telemetry.chassis.speed_kph} unit="km/h" status="optimal" />
                        <MetricRow label="Lat G" value={telemetry.chassis.acceleration_g?.lateral || 0} unit="G" status="optimal" />
                        <MetricRow label="Long G" value={telemetry.chassis.acceleration_g?.longitudinal || 0} unit="G" status="optimal" />
                        <MetricRow label="Downforce" value={telemetry.chassis.downforce_kg || 0} unit="kg" status="optimal" />
                    </>
                )

            case 'aero_front':
            case 'aero_rear':
                return (
                    <>
                        <MetricRow label="Downforce" value={telemetry.chassis?.speed_kph ? (telemetry.chassis.speed_kph ** 2 * 0.005).toFixed(0) : 0} unit="kg" status="optimal" />
                        <MetricRow label="Drag Coef" value="0.95" status="optimal" />
                        <div style={styles.infoText}>Aerodynamic elements calculated dynamically</div>
                    </>
                )

            default:
                return <div style={styles.noData}>No telemetry available for this component</div>
        }
    }

    return (
        <div style={styles.panel}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <span style={styles.icon}>{info.icon}</span>
                    <div>
                        <div style={styles.componentName}>{info.name}</div>
                        <div style={styles.componentDesc}>{info.description}</div>
                    </div>
                </div>
                <button style={styles.closeBtn} onClick={onClose}>×</button>
            </div>

            {/* Telemetry Data */}
            <div style={styles.content}>
                {getComponentTelemetry()}
            </div>

            {/* Footer Actions */}
            <div style={styles.footer}>
                <button style={styles.actionBtn}>
                    📋 Export Data
                </button>
                <button style={styles.actionBtn}>
                    🚩 Flag Issue
                </button>
            </div>
        </div>
    )
}

const styles: { [key: string]: React.CSSProperties } = {
    panel: {
        width: '280px',
        background: 'rgba(13, 18, 30, 0.95)',
        borderRadius: '12px',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(10px)'
    },
    emptyPanel: {
        width: '280px',
        padding: '40px 20px',
        background: 'rgba(13, 18, 30, 0.95)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        textAlign: 'center',
        backdropFilter: 'blur(10px)'
    },
    emptyIcon: {
        fontSize: '2rem',
        marginBottom: '12px',
        opacity: 0.5
    },
    emptyText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '0.9rem',
        marginBottom: '4px'
    },
    emptySubtext: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: '0.75rem'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
    },
    headerLeft: {
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start'
    },
    icon: {
        fontSize: '1.5rem'
    },
    componentName: {
        color: '#fff',
        fontSize: '1rem',
        fontWeight: 600
    },
    componentDesc: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '0.75rem',
        marginTop: '2px'
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '1.5rem',
        cursor: 'pointer',
        padding: '0',
        lineHeight: 1
    },
    content: {
        padding: '16px',
        flex: 1
    },
    metricRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
    },
    metricLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: '0.8rem'
    },
    metricValueContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    sparklineContainer: {
        width: '60px',
        height: '20px'
    },
    metricValue: {
        fontFamily: "'Roboto Mono', monospace",
        fontSize: '0.95rem',
        fontWeight: 600
    },
    metricUnit: {
        fontSize: '0.7rem',
        marginLeft: '2px',
        opacity: 0.7
    },
    statusBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: '4px',
        fontSize: '0.7rem',
        fontWeight: 600,
        border: '1px solid',
        marginTop: '8px'
    },
    noData: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: '0.85rem',
        textAlign: 'center',
        padding: '20px'
    },
    infoText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: '0.75rem',
        fontStyle: 'italic',
        marginTop: '8px'
    },
    footer: {
        display: 'flex',
        gap: '8px',
        padding: '12px 16px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
    },
    divider: {
        height: '1px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        margin: '12px 0'
    },
    sectionTitle: {
        fontSize: '0.7rem',
        fontWeight: 700,
        color: '#00d4ff',
        marginBottom: '8px',
        letterSpacing: '0.05em',
        textTransform: 'uppercase'
    },
    actionBtn: {
        flex: 1,
        padding: '8px',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '6px',
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '0.75rem',
        cursor: 'pointer',
        transition: 'all 0.2s'
    }
}

export default ComponentDetailsPanel
