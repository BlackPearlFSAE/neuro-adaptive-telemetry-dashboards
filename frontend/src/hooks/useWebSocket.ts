import { useState, useEffect, useRef, useCallback } from 'react'
import { TelemetryData, InterventionUpdate } from '../types/telemetry'

// Get WebSocket URL from localStorage or use default
const getWsUrl = (): string => {
    try {
        return localStorage.getItem('nats_ws_url') || 'ws://localhost:8001/ws'
    } catch {
        return 'ws://localhost:8001/ws'
    }
}

export function useWebSocket() {
    const [data, setData] = useState<TelemetryData | null>(null)
    const [connected, setConnected] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const wsRef = useRef<WebSocket | null>(null)
    const reconnectTimeoutRef = useRef<number | null>(null)

    const connect = useCallback(() => {
        try {
            const wsUrl = getWsUrl()
            const ws = new WebSocket(wsUrl)
            wsRef.current = ws

            ws.onopen = () => {
                console.log('WebSocket connected')
                setConnected(true)
                setError(null)
            }

            ws.onmessage = (event) => {
                try {
                    const telemetry = JSON.parse(event.data) as TelemetryData
                    setData(telemetry)
                } catch (e) {
                    console.error('Failed to parse telemetry data:', e)
                }
            }

            ws.onerror = () => {
                setError('WebSocket connection error')
                setConnected(false)
            }

            ws.onclose = () => {
                console.log('WebSocket disconnected')
                setConnected(false)

                // Attempt to reconnect after 2 seconds
                reconnectTimeoutRef.current = window.setTimeout(() => {
                    console.log('Attempting to reconnect...')
                    connect()
                }, 2000)
            }
        } catch (e) {
            setError('Failed to create WebSocket connection')
            setConnected(false)
        }
    }, [])

    const sendUpdate = useCallback((update: InterventionUpdate) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(update))
        }
    }, [])

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
        }
        if (wsRef.current) {
            wsRef.current.close()
            wsRef.current = null
        }
    }, [])

    useEffect(() => {
        connect()

        const handleConfigUpdate = () => {
            console.log('♻️ Configuration updated. Reconnecting...')
            disconnect()
            setTimeout(connect, 100)
        }

        window.addEventListener('nats-config-updated', handleConfigUpdate)

        return () => {
            disconnect()
            window.removeEventListener('nats-config-updated', handleConfigUpdate)
        }
    }, [connect, disconnect])

    return { data, connected, error, sendUpdate }
}

// Demo mode hook for when backend is not available
export function useDemoData(): TelemetryData {
    const [data, setData] = useState<TelemetryData>(generateDemoData())

    useEffect(() => {
        const interval = setInterval(() => {
            setData(generateDemoData())
        }, 100)

        return () => clearInterval(interval)
    }, [])

    return data
}

// @ts-ignore
import { DEMO_REPLAY_LOGS } from '../data/demoReplayData'

let demoTimeOffset = 0
let replayIndex = 0
let currentLogFile = ''

// Reset replay when config changes
if (typeof window !== 'undefined') {
    window.addEventListener('nats-config-updated', () => {
        const newLog = localStorage.getItem('nats_demo_log_file') || 'datalog_000.csv'
        if (newLog !== currentLogFile) {
            currentLogFile = newLog
            replayIndex = 0
            console.log(`Switched simulation log to: ${newLog}`)
        }
    })
}

function generateDemoData(): TelemetryData {
    demoTimeOffset += 0.1

    // Determine active log file
    const selectedLog = localStorage.getItem('nats_demo_log_file') || 'datalog_000.csv'
    if (selectedLog !== currentLogFile) {
        currentLogFile = selectedLog
        replayIndex = 0
    }

    // Get replay frame from the selected log
    const logData = DEMO_REPLAY_LOGS[selectedLog] || DEMO_REPLAY_LOGS['datalog_000.csv'] || []

    // Safety check for empty logs
    if (logData.length === 0) {
        // Fallback if no data
        return {
            timestamp: new Date().toISOString(),
            systemStatus: 'DEMO Telemetry',
            driver: { name: 'Unknown', mode: 'Offline', heartRate: 0, stress: 0 },
            eeg: { samplingRate: 0, status: 'Offline', waveform: [], thetaFocus: 0, betaStress: 0 },
            telemetrySync: { status: 'OFF', mTeslaPrediction: '-', predictionStatus: '-', circuit: '-', carPosition: 0 },
            adaptiveIntervention: { active: false, throttleMapping: 'LINEAR', throttleCurve: [], cognitiveLoadHud: 'REDUCED', hapticSteering: 'NOMINAL' }
        } as TelemetryData
    }

    const replayFrame = logData[replayIndex % logData.length]
    replayIndex++

    const waveform: number[] = []
    for (let i = 0; i < 100; i++) {
        const t = demoTimeOffset + i * 0.01
        const theta = 0.4 * Math.sin(2 * Math.PI * 6 * t)
        const alpha = 0.3 * Math.sin(2 * Math.PI * 10 * t)
        const beta = 0.2 * Math.sin(2 * Math.PI * 20 * t)
        const noise = 0.1 * (Math.random() - 0.5)
        waveform.push(theta + alpha + beta + noise)
    }

    const throttleCurve = []
    for (let i = 0; i < 20; i++) {
        const x = i / 19
        throttleCurve.push({ x, y: x }) // Linear
    }

    return {
        timestamp: new Date().toISOString(),
        driver: {
            name: 'L. Hamilton',
            mode: 'Sim',
            heartRate: 90 + Math.floor(5 * Math.sin(demoTimeOffset * 0.5)),
            stress: Math.round((0.18 + 0.05 * Math.sin(demoTimeOffset * 0.3)) * 100) / 100
        },
        eeg: {
            samplingRate: 1.5,
            status: 'Nominal',
            waveform,
            thetaFocus: 0.65 + 0.1 * Math.sin(demoTimeOffset * 0.2),
            betaStress: 0.35 + 0.08 * Math.sin(demoTimeOffset * 0.25)
        },
        telemetrySync: {
            status: 'REPLAY',
            mTeslaPrediction: 'Optimal',
            predictionStatus: 'ACTIVE',
            circuit: 'SILVERSTONE',
            carPosition: (replayIndex / logData.length) % 1
        },
        adaptiveIntervention: {
            active: true,
            throttleMapping: 'LINEAR',
            throttleCurve,
            cognitiveLoadHud: 'FULL',
            hapticSteering: 'NOMINAL'
        },
        systemStatus: 'ONLINE',
        // Vehicle Physical Telemetry (Simulated)
        motor: {
            rpm: 8000 + Math.floor(4000 * Math.sin(demoTimeOffset * 0.3)),
            temperature: 65 + 15 * Math.sin(demoTimeOffset * 0.1),
            power_kw: 120 + 80 * Math.sin(demoTimeOffset * 0.3),
            torque_nm: 350 + 100 * Math.cos(demoTimeOffset * 0.3),
            efficiency: 96,
            inv_mode: 'RUN',
            status: 'optimal'
        },
        battery: {
            soc: 85 - (demoTimeOffset * 0.05) % 85,
            voltage: 395 + 10 * Math.sin(demoTimeOffset * 0.1),
            current: -150 + 100 * Math.sin(demoTimeOffset * 0.2), // Negative = Discharge
            temperature: 45 + 5 * Math.sin(demoTimeOffset * 0.05),
            status: 'optimal',
            health_soh: 98
        },
        chassis: {
            speed_kph: 150 + 50 * Math.sin(demoTimeOffset * 0.3),
            suspension_travel: {
                fl: 10 + 5 * Math.random(),
                fr: 10 + 5 * Math.random(),
                rl: 12 + 5 * Math.random(),
                rr: 12 + 5 * Math.random()
            },
            acceleration_g: {
                longitudinal: 1.5 * Math.sin(demoTimeOffset * 0.5),
                lateral: 2.0 * Math.cos(demoTimeOffset * 0.4),
                vertical: 1.0 // Unused
            },
            safety: {
                hv_on: true,
                imd_ok: true,
                ams_ok: true,
                bspd_ok: true,
                apps: 50 + 40 * Math.sin(demoTimeOffset * 0.3),
                bpps: Math.max(0, -20 * Math.sin(demoTimeOffset * 0.3)) // Brake when accel is low
            }
        },
        tires: {
            front_left: { temp: 85 + 10 * Math.sin(demoTimeOffset * 0.1), pressure: 2.1, wear: 95 },
            front_right: { temp: 88 + 10 * Math.sin(demoTimeOffset * 0.12), pressure: 2.1, wear: 94 },
            rear_left: { temp: 92 + 15 * Math.sin(demoTimeOffset * 0.15), pressure: 1.9, wear: 90 },
            rear_right: { temp: 90 + 15 * Math.sin(demoTimeOffset * 0.14), pressure: 1.9, wear: 89 }
        },
        brakes: {
            bias_percent: 54,
            pressure_front: 30 + 30 * Math.max(0, -Math.sin(demoTimeOffset * 0.3)),
            pressure_rear: 25 + 25 * Math.max(0, -Math.sin(demoTimeOffset * 0.3))
        },
        cellMonitoring: {
            cell_count: 96,
            voltages: Array(96).fill(0).map((_, i) => 3.8 + 0.1 * Math.sin(demoTimeOffset * 0.1 + i * 0.1)),
            min_voltage: 3.7,
            max_voltage: 3.9,
            voltage_delta: 0.2,
            min_cell_temp: 40,
            max_cell_temp: 48,
            balancing_active: true,
            pack_health_pct: 98
        },
        // Inject Real CSV Replay Data (overrides above defaults)
        ...replayFrame
    }
}
