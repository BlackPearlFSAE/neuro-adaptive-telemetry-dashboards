import { useState, useEffect, useRef } from 'react'

export interface VehicleTelemetryData {
    motor: { rpm: number; power_kw: number; temperature: number; status: string }
    battery: { soc: number; voltage: number; temperature: number; status: string }
    brakes: { front_left_temp: number; front_right_temp: number; rear_left_temp: number; rear_right_temp: number; status: string }
    tires: {
        front_left: { temp: number; wear: number }
        front_right: { temp: number; wear: number }
        rear_left: { temp: number; wear: number }
        rear_right: { temp: number; wear: number }
        status: string
    }
    chassis: {
        speed_kph: number
        steering_angle?: number
        throttle_position?: number
        brake_position?: number
        acceleration_g: { lateral: number; longitudinal: number }
    }
    lap: { current: number; stint: number; progress: number }
    overallStatus: string
}

const WS_PORT = 8001 // Standardized backend port
const WS_PATH = '/ws/vehicle'

export const useVehicleWebSocket = () => {
    const [data, setData] = useState<VehicleTelemetryData | null>(null)
    const [connected, setConnected] = useState(false)
    const wsRef = useRef<WebSocket | null>(null)
    const retryTimeoutRef = useRef<number | null>(null)

    useEffect(() => {
        const connect = () => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
            const wsUrl = `${protocol}//${window.location.hostname}:${WS_PORT}${WS_PATH}`

            const ws = new WebSocket(wsUrl)
            wsRef.current = ws

            ws.onopen = () => {
                console.log('Vehicle 60Hz Stream Connected')
                setConnected(true)
                if (retryTimeoutRef.current) {
                    clearTimeout(retryTimeoutRef.current)
                    retryTimeoutRef.current = null
                }
            }

            ws.onmessage = (event) => {
                try {
                    const vehicleData = JSON.parse(event.data)
                    setData(vehicleData)
                } catch (err) {
                    console.error('Vehicle telemetry parse error:', err)
                }
            }

            ws.onclose = () => {
                setConnected(false)
                // Retry connection every 2 seconds if vehicle page is active
                retryTimeoutRef.current = window.setTimeout(connect, 2000)
            }

            ws.onerror = (err) => {
                console.error('Vehicle WebSocket error:', err)
                ws.close()
            }
        }

        connect()

        return () => {
            if (wsRef.current) {
                wsRef.current.close()
            }
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current)
            }
        }
    }, [])

    return { data, connected }
}
