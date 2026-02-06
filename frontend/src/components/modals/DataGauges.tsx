/**
 * DataGauges.tsx
 * ==============
 * Advanced visualization components for the 3D Dashboard Data View
 * Includes: CircularGauge, LinearPowerBar, StatusLED, MiniSparkline
 */

import React, { useMemo } from 'react'

// ===== CIRCULAR GAUGE =====
interface CircularGaugeProps {
    value: number
    min?: number
    max: number
    label: string
    unit: string
    size?: number
    warning?: number
    critical?: number
    showTicks?: boolean
}

export const CircularGauge: React.FC<CircularGaugeProps> = ({
    value,
    min = 0,
    max,
    label,
    unit,
    size = 120,
    warning,
    critical,
    showTicks = true
}) => {
    const radius = size / 2 - 10
    const circumference = 2 * Math.PI * radius
    const angle = ((value - min) / (max - min)) * 270 // 270 degree arc
    // const offset = circumference - (angle / 360) * circumference

    // Determine color based on thresholds
    const getColor = () => {
        if (critical && value >= critical) return '#ef4444'
        if (warning && value >= warning) return '#f59e0b'
        return '#00d4ff'
    }

    // Generate tick marks
    const ticks = useMemo(() => {
        if (!showTicks) return []
        const tickCount = 10
        return Array.from({ length: tickCount + 1 }, (_, i) => {
            const tickAngle = 135 + (i / tickCount) * 270
            const tickValue = min + (i / tickCount) * (max - min)
            const isWarning = warning && tickValue >= warning
            const isCritical = critical && tickValue >= critical
            return { angle: tickAngle, value: tickValue, isWarning, isCritical }
        })
    }, [min, max, warning, critical, showTicks])

    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* Background arc */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                    strokeDasharray={`${(270 / 360) * circumference} ${circumference}`}
                    strokeDashoffset={0}
                    strokeLinecap="round"
                    transform={`rotate(135 ${size / 2} ${size / 2})`}
                />

                {/* Value arc with glow */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={getColor()}
                    strokeWidth="8"
                    strokeDasharray={`${(angle / 360) * circumference} ${circumference}`}
                    strokeDashoffset={0}
                    strokeLinecap="round"
                    transform={`rotate(135 ${size / 2} ${size / 2})`}
                    style={{
                        filter: `drop-shadow(0 0 6px ${getColor()})`,
                        transition: 'stroke-dasharray 0.3s ease-out'
                    }}
                />

                {/* Tick marks */}
                {ticks.map((tick, i) => {
                    const rad = (tick.angle * Math.PI) / 180
                    const x1 = size / 2 + (radius - 12) * Math.cos(rad)
                    const y1 = size / 2 + (radius - 12) * Math.sin(rad)
                    const x2 = size / 2 + (radius - 4) * Math.cos(rad)
                    const y2 = size / 2 + (radius - 4) * Math.sin(rad)
                    return (
                        <line
                            key={i}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={tick.isCritical ? '#ef4444' : tick.isWarning ? '#f59e0b' : 'rgba(255,255,255,0.3)'}
                            strokeWidth="2"
                        />
                    )
                })}
            </svg>

            {/* Value display */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -40%)',
                textAlign: 'center'
            }}>
                <div style={{
                    fontSize: size * 0.22,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    color: getColor(),
                    textShadow: `0 0 10px ${getColor()}`,
                    lineHeight: 1
                }}>
                    {typeof value === 'number' ? value.toFixed(0) : value}
                </div>
                <div style={{ fontSize: size * 0.1, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                    {unit}
                </div>
            </div>

            {/* Label */}
            <div style={{
                position: 'absolute',
                bottom: 8,
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: size * 0.09,
                color: 'rgba(255,255,255,0.6)',
                letterSpacing: '1px',
                textTransform: 'uppercase'
            }}>
                {label}
            </div>
        </div>
    )
}


// ===== LINEAR POWER BAR =====
interface LinearPowerBarProps {
    value: number
    max: number
    label: string
    unit?: string
    height?: number
    showReverse?: boolean  // For regen display
}

export const LinearPowerBar: React.FC<LinearPowerBarProps> = ({
    value,
    max,
    label,
    unit = 'kW',
    height = 24,
    showReverse = true
}) => {
    const isRegen = value < 0
    const absValue = Math.abs(value)
    const percentage = Math.min((absValue / max) * 100, 100)

    const gradientColor = isRegen
        ? 'linear-gradient(90deg, #10b981, #34d399)'  // Green for regen
        : 'linear-gradient(90deg, #00d4ff, #f59e0b, #ef4444)'  // Blue to red for motoring

    return (
        <div style={{ marginBottom: 12 }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 4,
                fontSize: '0.75rem'
            }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</span>
                <span style={{
                    color: isRegen ? '#10b981' : '#00d4ff',
                    fontFamily: 'monospace',
                    fontWeight: 600
                }}>
                    {isRegen ? '↓ ' : '↑ '}{absValue.toFixed(1)} {unit}
                </span>
            </div>
            <div style={{
                width: '100%',
                height,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: height / 2,
                overflow: 'hidden',
                position: 'relative',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                {showReverse && (
                    <div style={{
                        position: 'absolute',
                        left: '50%',
                        top: 0,
                        bottom: 0,
                        width: 2,
                        background: 'rgba(255,255,255,0.2)'
                    }} />
                )}
                <div style={{
                    width: showReverse ? `${percentage / 2}%` : `${percentage}%`,
                    height: '100%',
                    background: gradientColor,
                    borderRadius: height / 2,
                    transition: 'width 0.2s ease-out',
                    marginLeft: showReverse && !isRegen ? '50%' : 0,
                    marginRight: showReverse && isRegen ? 0 : undefined,
                    transform: showReverse && isRegen ? 'translateX(0)' : undefined,
                    boxShadow: `0 0 10px ${isRegen ? '#10b981' : '#00d4ff'}40`
                }} />
            </div>
        </div>
    )
}


// ===== STATUS LED =====
interface StatusLEDProps {
    status: 'off' | 'ready' | 'run' | 'warning' | 'fault'
    label: string
    size?: number
}

export const StatusLED: React.FC<StatusLEDProps> = ({ status, label, size = 16 }) => {
    const colors: Record<string, { bg: string; glow: string }> = {
        off: { bg: '#374151', glow: 'none' },
        ready: { bg: '#3b82f6', glow: '0 0 12px #3b82f6' },
        run: { bg: '#10b981', glow: '0 0 12px #10b981' },
        warning: { bg: '#f59e0b', glow: '0 0 12px #f59e0b' },
        fault: { bg: '#ef4444', glow: '0 0 12px #ef4444' }
    }

    const { bg, glow } = colors[status] || colors.off

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: 6,
            border: `1px solid ${bg}40`
        }}>
            <div style={{
                width: size,
                height: size,
                borderRadius: '50%',
                background: bg,
                boxShadow: glow,
                animation: status === 'fault' ? 'pulse 1s infinite' : undefined
            }} />
            <span style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: bg,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
            }}>
                {label}
            </span>
            <style>
                {`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}
            </style>
        </div>
    )
}


// ===== MINI SPARKLINE =====
interface MiniSparklineProps {
    data: number[]
    color?: string
    width?: number
    height?: number
}

export const MiniSparkline: React.FC<MiniSparklineProps> = ({
    data,
    color = '#00d4ff',
    width = 60,
    height = 20
}) => {
    if (!data || data.length < 2) return null

    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = max - min || 1

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width
        const y = height - ((val - min) / range) * (height - 4) - 2
        return `${x},${y}`
    }).join(' ')

    return (
        <svg width={width} height={height} style={{ display: 'block' }}>
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: `drop-shadow(0 0 3px ${color})` }}
            />
        </svg>
    )
}


// ===== PHASE CURRENT DISPLAY =====
interface PhaseCurrentDisplayProps {
    u: number
    v: number
    w: number
    max?: number
}

export const PhaseCurrentDisplay: React.FC<PhaseCurrentDisplayProps> = ({
    u, v, w, max = 300
}) => {
    const phases = [
        { label: 'U', value: u, color: '#ef4444' },
        { label: 'V', value: v, color: '#10b981' },
        { label: 'W', value: w, color: '#3b82f6' }
    ]

    return (
        <div style={{ display: 'flex', gap: 8 }}>
            {phases.map(phase => (
                <div key={phase.label} style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '8px 4px',
                    background: `${phase.color}10`,
                    borderRadius: 6,
                    border: `1px solid ${phase.color}40`
                }}>
                    <div style={{
                        fontSize: '0.65rem',
                        color: phase.color,
                        fontWeight: 600,
                        marginBottom: 4
                    }}>
                        I{phase.label}
                    </div>
                    <div style={{
                        fontSize: '0.9rem',
                        fontFamily: 'monospace',
                        color: '#fff',
                        fontWeight: 600
                    }}>
                        {phase.value.toFixed(0)}
                        <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)' }}> A</span>
                    </div>
                    {/* Mini bar */}
                    <div style={{
                        width: '100%',
                        height: 4,
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: 2,
                        marginTop: 6,
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${(Math.abs(phase.value) / max) * 100}%`,
                            height: '100%',
                            background: phase.color,
                            borderRadius: 2,
                            boxShadow: `0 0 6px ${phase.color}`
                        }} />
                    </div>
                </div>
            ))}
        </div>
    )
}

export default {
    CircularGauge,
    LinearPowerBar,
    StatusLED,
    MiniSparkline,
    PhaseCurrentDisplay
}
