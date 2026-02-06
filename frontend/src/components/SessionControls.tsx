import React, { useState, useEffect } from 'react'

interface SessionStatus {
    is_recording: boolean
    session: {
        session_id: string
        driver_name: string
        track_name: string
        start_time: number
        total_frames: number
    } | null
    frame_count: number
}

export const SessionControls: React.FC = () => {
    const [status, setStatus] = useState<SessionStatus | null>(null)
    const [elapsed, setElapsed] = useState<string>('00:00')

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch('/api/session/status')
                if (res.ok) {
                    setStatus(await res.json())
                }
            } catch { }
        }

        fetchStatus()
        const interval = setInterval(fetchStatus, 1000)
        return () => clearInterval(interval)
    }, [])

    // Elapsed time calculator
    useEffect(() => {
        if (!status?.is_recording || !status?.session?.start_time) {
            setElapsed('00:00')
            return
        }

        const updateElapsed = () => {
            const now = Date.now() / 1000
            const diff = now - status.session!.start_time
            const mins = Math.floor(diff / 60)
            const secs = Math.floor(diff % 60)
            setElapsed(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`)
        }

        updateElapsed()
        const timer = setInterval(updateElapsed, 1000)
        return () => clearInterval(timer)
    }, [status?.is_recording, status?.session?.start_time])

    const handleStart = async () => {
        await fetch('/api/session/start?driver=Test&track=Silverstone', { method: 'POST' })
    }

    const handleStop = async () => {
        await fetch('/api/session/stop', { method: 'POST' })
    }

    const isRecording = status?.is_recording || false

    return (
        <div style={styles.container}>
            <div style={styles.left}>
                {/* Recording Indicator */}
                <div style={{
                    ...styles.recordDot,
                    background: isRecording ? '#ff4757' : 'rgba(255,255,255,0.2)',
                    animation: isRecording ? 'pulse 1s infinite' : 'none'
                }} />

                <div style={styles.info}>
                    <div style={styles.label}>
                        {isRecording ? 'RECORDING' : 'STANDBY'}
                    </div>
                    {isRecording && (
                        <div style={styles.stats}>
                            <span style={styles.time}>{elapsed}</span>
                            <span style={styles.frames}>{status?.frame_count || 0} frames</span>
                        </div>
                    )}
                </div>
            </div>

            <div style={styles.right}>
                {!isRecording ? (
                    <button style={styles.startBtn} onClick={handleStart}>
                        ▶ START SESSION
                    </button>
                ) : (
                    <button style={styles.stopBtn} onClick={handleStop}>
                        ■ STOP
                    </button>
                )}
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    )
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        background: 'rgba(13, 33, 55, 0.9)',
        borderRadius: '10px',
        border: '1px solid rgba(0, 212, 255, 0.2)',
    },
    left: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    recordDot: {
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        boxShadow: '0 0 10px rgba(255, 71, 87, 0.5)',
    },
    info: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    label: {
        fontSize: '0.8rem',
        fontWeight: 700,
        color: '#fff',
        letterSpacing: '1px',
    },
    stats: {
        display: 'flex',
        gap: '12px',
    },
    time: {
        fontSize: '0.75rem',
        color: '#00d4ff',
        fontFamily: 'monospace',
        fontWeight: 600,
    },
    frames: {
        fontSize: '0.7rem',
        color: 'rgba(255,255,255,0.5)',
    },
    right: {
        display: 'flex',
        gap: '8px',
    },
    startBtn: {
        padding: '8px 16px',
        border: 'none',
        borderRadius: '6px',
        background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
        color: '#0d2137',
        fontSize: '0.75rem',
        fontWeight: 700,
        cursor: 'pointer',
        letterSpacing: '1px',
    },
    stopBtn: {
        padding: '8px 16px',
        border: 'none',
        borderRadius: '6px',
        background: '#ff4757',
        color: '#fff',
        fontSize: '0.75rem',
        fontWeight: 700,
        cursor: 'pointer',
        letterSpacing: '1px',
    },
}
