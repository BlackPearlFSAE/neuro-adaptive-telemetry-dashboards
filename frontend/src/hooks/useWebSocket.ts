import { useState, useEffect, useRef, useCallback } from 'react'
import { TelemetryData, InterventionUpdate } from '../types/telemetry'

const WS_URL = 'ws://localhost:8001/ws'

export function useWebSocket() {
    const [data, setData] = useState<TelemetryData | null>(null)
    const [connected, setConnected] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const wsRef = useRef<WebSocket | null>(null)
    const reconnectTimeoutRef = useRef<number | null>(null)

    const connect = useCallback(() => {
        try {
            const ws = new WebSocket(WS_URL)
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
        return () => {
            disconnect()
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

let demoTimeOffset = 0

function generateDemoData(): TelemetryData {
    demoTimeOffset += 0.1

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
            status: 'LIVE',
            mTeslaPrediction: 'Optimal',
            predictionStatus: 'ACTIVE',
            circuit: 'SILVERSTONE',
            carPosition: (demoTimeOffset * 0.02) % 1
        },
        adaptiveIntervention: {
            active: true,
            throttleMapping: 'LINEAR',
            throttleCurve,
            cognitiveLoadHud: 'FULL',
            hapticSteering: 'NOMINAL'
        },
        systemStatus: 'ONLINE'
    }
}
