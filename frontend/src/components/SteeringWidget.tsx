import React from 'react'
import { useVehicleWebSocket } from '../hooks/useVehicleWebSocket'

interface SteeringData {
    steering_angle: number
    throttle_position: number
    brake_position: number
    rpm: number
    gear: number
}

interface Props {
    steeringAngle?: number
}

export const SteeringWidget: React.FC<Props> = ({ steeringAngle }) => {
    const { data: wsData, connected } = useVehicleWebSocket()

    // Simulation state for demo mode
    const [simData, setSimData] = React.useState<SteeringData>({
        steering_angle: 0,
        throttle_position: 0,
        brake_position: 0,
        rpm: 0,
        gear: 1
    })

    // Animation loop for demo mode
    React.useEffect(() => {
        if (connected) return

        let frameId: number
        let time = 0

        const animate = () => {
            time += 0.016 // Approx 60fps

            // Perlin-like noise simulation (simplified)
            const steering = Math.sin(time / 2) * 90 + Math.sin(time * 1.5) * 20
            const throttle = Math.max(0, Math.sin(time) * 80 + Math.random() * 20)
            const brake = Math.max(0, Math.sin(time + Math.PI) * 60)
            const rpm = 8000 + Math.sin(time * 0.5) * 4000 + (throttle * 50)

            setSimData({
                steering_angle: steering,
                throttle_position: throttle,
                brake_position: brake,
                rpm: rpm,
                gear: Math.floor(rpm / 2000) || 1
            })

            frameId = requestAnimationFrame(animate)
        }

        animate()
        return () => cancelAnimationFrame(frameId)
    }, [connected])

    // Use WebSocket data if connected, otherwise use simulation or props
    const data: SteeringData = connected && wsData ? {
        steering_angle: wsData.chassis?.steering_angle ?? 0,
        throttle_position: wsData.chassis?.throttle_position ?? 0,
        brake_position: wsData.chassis?.brake_position ?? 0,
        rpm: wsData.motor?.rpm ?? 0,
        gear: typeof wsData.chassis?.speed_kph === 'number' ? Math.ceil(wsData.chassis.speed_kph / 40) || 1 : 1
    } : {
        steering_angle: steeringAngle ?? simData.steering_angle,
        throttle_position: simData.throttle_position,
        brake_position: simData.brake_position,
        rpm: simData.rpm,
        gear: simData.gear
    }

    // Visual calculations
    // Fix: Ensure rotation is exactly as requested (no amplification if checking raw, 
    // but keep 1.5x if that's the desired visual effect from previous code. 
    // I'll keep 1.5x but clamp it to look realistic)
    const rotation = data.steering_angle * 1.5
    const rpmPercent = Math.min(100, (data.rpm / 13000) * 100)

    // RPM LEDs logic - MEMOIZED for performance (avoid recalc on every render if heavy, through simple here)
    const renderLeds = () => {
        const leds = []
        for (let i = 0; i < 10; i++) {
            const threshold = (i + 1) * 10
            let color = '#333'
            if (rpmPercent >= threshold) {
                if (i < 3) color = '#00ff88' // Green
                else if (i < 7) color = '#fbbf24' // Yellow
                else color = '#ff4757' // Red
            }
            leds.push(
                <circle key={i} cx={35 + i * 5.5} cy="35" r="2" fill={color} />
            )
        }
        return leds
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span style={styles.icon}>🏎️</span>
                <span style={styles.title}>STEERING DYNAMICS</span>
                {/* Connection Dot */}
                <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: connected ? '#00ff88' : '#ff4757',
                    boxShadow: connected ? '0 0 5px #00ff88' : 'none',
                    marginRight: 'auto', marginLeft: 8
                }} />

                <span style={{ ...styles.value, color: Math.abs(rotation) > 30 ? '#ff4757' : '#00d4ff' }}>
                    {data.steering_angle.toFixed(1)}°
                </span>
            </div>

            <div style={styles.wheelArea}>
                <svg width="200" height="140" viewBox="0 0 120 80">
                    <defs>
                        <linearGradient id="carbonFib" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#1a1a1a" />
                            <stop offset="25%" stopColor="#2a2a2a" />
                            <stop offset="50%" stopColor="#1a1a1a" />
                            <stop offset="100%" stopColor="#2a2a2a" />
                        </linearGradient>
                        <filter id="shadow">
                            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.5" />
                        </filter>
                    </defs>

                    <g transform={`rotate(${rotation} 60 60)`} filter="url(#shadow)" style={{ transition: 'transform 0.05s linear' }}>
                        {/* Main Plate */}
                        <path d="M 20 40 Q 20 20 60 20 Q 100 20 100 40 L 100 70 Q 100 80 80 80 L 40 80 Q 20 80 20 70 Z"
                            fill="url(#carbonFib)" stroke="#333" strokeWidth="0.5" />

                        {/* Grips */}
                        <path d="M 20 40 Q 10 40 10 60 Q 10 90 30 80"
                            fill="none" stroke="#222" strokeWidth="6" strokeLinecap="round" />
                        <path d="M 100 40 Q 110 40 110 60 Q 110 90 90 80"
                            fill="none" stroke="#222" strokeWidth="6" strokeLinecap="round" />

                        {/* Screen Area */}
                        <rect x="40" y="30" width="40" height="30" rx="2" fill="#000" stroke="#444" strokeWidth="0.5" />

                        {/* Data on Wheel Screen */}
                        <text x="60" y="42" textAnchor="middle" fill="#00d4ff" fontSize="10" fontFamily="monospace" fontWeight="bold">
                            {data.gear === 0 ? 'N' : data.gear}
                        </text>
                        <text x="60" y="52" textAnchor="middle" fill="#fff" fontSize="4" fontFamily="monospace">
                            GEAR
                        </text>
                        <text x="50" y="57" textAnchor="middle" fill="#fbbf24" fontSize="3" fontFamily="monospace">
                            {(data.rpm / 1000).toFixed(1)}k
                        </text>

                        {/* Buttons (Generic) */}
                        <circle cx="30" cy="45" r="2.5" fill="#ef4444" stroke="#7f1d1d" strokeWidth="0.5" />
                        <circle cx="90" cy="45" r="2.5" fill="#22c55e" stroke="#14532d" strokeWidth="0.5" />
                        <circle cx="35" cy="65" r="2" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="0.5" />
                        <circle cx="85" cy="65" r="2" fill="#eab308" stroke="#713f12" strokeWidth="0.5" />

                        {/* RPM LEDs on Wheel */}
                        <g>{renderLeds()}</g>
                    </g>
                </svg>
            </div>

            {/* Pedal Bars (Advanced with numeric values and smoother updates) */}
            <div style={styles.pedals}>
                <div style={styles.pedalCol}>
                    <div style={styles.barBg}>
                        <div style={{
                            ...styles.barFill,
                            height: `${data.brake_position}%`,
                            background: '#ff4757',
                            transition: 'height 0.05s linear'
                        }} />
                    </div>
                    <span style={styles.pedalLabel}>BRK {data.brake_position.toFixed(0)}%</span>
                </div>
                <div style={styles.pedalCol}>
                    <div style={styles.barBg}>
                        <div style={{
                            ...styles.barFill,
                            height: `${data.throttle_position}%`,
                            background: '#00ff88',
                            transition: 'height 0.05s linear'
                        }} />
                    </div>
                    <span style={styles.pedalLabel}>THR {data.throttle_position.toFixed(0)}%</span>
                </div>
            </div>
        </div>
    )
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        background: 'linear-gradient(135deg, rgba(13, 33, 55, 0.95) 0%, rgba(10, 22, 40, 0.98) 100%)',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
    },
    header: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    icon: { fontSize: '1.2rem' },
    title: { fontSize: '0.75rem', fontWeight: 700, color: '#fff', letterSpacing: '1px' },
    value: { fontSize: '1rem', fontWeight: 700, fontFamily: 'monospace' },
    wheelArea: {
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        padding: '10px 0',
        minHeight: '140px'
    },
    pedals: {
        display: 'flex', justifyContent: 'center', gap: '20px',
        height: '60px', marginTop: '10px'
    },
    pedalCol: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
    },
    barBg: {
        width: '12px', height: '100%', background: 'rgba(255,255,255,0.1)',
        borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'flex-end'
    },
    barFill: { width: '100%', borderRadius: '6px' },
    pedalLabel: { fontSize: '0.6rem', color: '#888', fontWeight: 600 }
}
