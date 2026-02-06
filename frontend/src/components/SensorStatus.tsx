import React, { useState, useEffect } from 'react'

interface HRVData {
    rmssd: number
    sdnn: number
    stress_index: number
}

interface HeartSensorData {
    bpm: number
    connected: boolean
    mode: 'live' | 'simulation'
    sensor_contact: boolean
    hrv: HRVData
    rr_intervals: number[]
}

interface SensorStatusProps {
    onHeartData?: (data: HeartSensorData) => void
}

export const SensorStatus: React.FC<SensorStatusProps> = ({ onHeartData }) => {
    const [heartData, setHeartData] = useState<HeartSensorData | null>(null)
    const [isReconnecting, setIsReconnecting] = useState(false)
    const [expanded, setExpanded] = useState(false)

    useEffect(() => {
        const fetchHeartData = async () => {
            try {
                const res = await fetch('/api/biosignal/heart')
                if (res.ok) {
                    const data = await res.json()
                    setHeartData(data)
                    onHeartData?.(data)
                }
            } catch {
                // Backend not available
            }
        }

        fetchHeartData()
        const interval = setInterval(fetchHeartData, 1000)
        return () => clearInterval(interval)
    }, [onHeartData])

    const handleReconnect = async () => {
        setIsReconnecting(true)
        try {
            await fetch('/api/biosignal/heart/reconnect', { method: 'POST' })
        } catch { }
        setTimeout(() => setIsReconnecting(false), 3000)
    }

    const isLive = heartData?.mode === 'live'
    const stressLevel = heartData?.hrv?.stress_index ?? 0

    return (
        <div style={styles.container}>
            {/* Compact View */}
            <div style={styles.header} onClick={() => setExpanded(!expanded)}>
                <div style={styles.headerLeft}>
                    <span style={{
                        ...styles.statusDot,
                        background: isLive ? '#00ff88' : '#ffa502',
                        boxShadow: isLive ? '0 0 10px #00ff88' : '0 0 10px #ffa502'
                    }} />
                    <span style={styles.sensorName}>Polar H10</span>
                    <span style={styles.modeTag}>{isLive ? 'LIVE' : 'SIM'}</span>
                </div>
                <div style={styles.headerRight}>
                    {heartData && (
                        <>
                            <span style={styles.bpmValue}>{heartData.bpm}</span>
                            <span style={styles.bpmUnit}>BPM</span>
                            <span style={{
                                ...styles.stressIndicator,
                                background: stressLevel > 0.7 ? '#ff4757' : stressLevel > 0.4 ? '#ffa502' : '#00ff88'
                            }}>
                                {stressLevel > 0.7 ? '⚠️' : stressLevel > 0.4 ? '😐' : '✓'}
                            </span>
                        </>
                    )}
                    <span style={styles.expandIcon}>{expanded ? '▼' : '▶'}</span>
                </div>
            </div>

            {/* Expanded Details */}
            {expanded && heartData && (
                <div style={styles.details}>
                    <div style={styles.detailGrid}>
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>HRV RMSSD</span>
                            <span style={styles.detailValue}>{heartData.hrv?.rmssd?.toFixed(1) ?? '—'} ms</span>
                        </div>
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>SDNN</span>
                            <span style={styles.detailValue}>{heartData.hrv?.sdnn?.toFixed(1) ?? '—'} ms</span>
                        </div>
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Stress Index</span>
                            <span style={{
                                ...styles.detailValue,
                                color: stressLevel > 0.7 ? '#ff4757' : stressLevel > 0.4 ? '#ffa502' : '#00ff88'
                            }}>
                                {(stressLevel * 100).toFixed(0)}%
                            </span>
                        </div>
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Contact</span>
                            <span style={styles.detailValue}>
                                {heartData.sensor_contact ? '✓ Good' : '✗ Lost'}
                            </span>
                        </div>
                    </div>

                    {/* RR Interval mini visualization */}
                    <div style={styles.rrSection}>
                        <span style={styles.rrLabel}>RR Intervals</span>
                        <div style={styles.rrBar}>
                            {(heartData.rr_intervals || []).slice(-10).map((rr, i) => (
                                <div
                                    key={i}
                                    style={{
                                        ...styles.rrSegment,
                                        height: `${Math.min(100, (rr / 1200) * 100)}%`,
                                        background: rr > 1000 ? '#00ff88' : rr < 600 ? '#ff4757' : '#00d4ff'
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Reconnect Button (if not live) */}
                    {!isLive && (
                        <button
                            style={{
                                ...styles.reconnectBtn,
                                opacity: isReconnecting ? 0.5 : 1
                            }}
                            onClick={handleReconnect}
                            disabled={isReconnecting}
                        >
                            {isReconnecting ? '🔄 Scanning...' : '🔗 Connect Real Sensor'}
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        background: 'rgba(13, 33, 55, 0.8)',
        borderRadius: '12px',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        overflow: 'hidden',
        marginBottom: '12px',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        cursor: 'pointer',
        transition: 'background 0.2s',
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    statusDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
    },
    sensorName: {
        fontSize: '0.875rem',
        fontWeight: 600,
        color: '#fff',
    },
    modeTag: {
        fontSize: '0.65rem',
        padding: '2px 6px',
        borderRadius: '4px',
        background: 'rgba(0, 212, 255, 0.2)',
        color: '#00d4ff',
        fontWeight: 600,
    },
    headerRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    bpmValue: {
        fontSize: '1.5rem',
        fontWeight: 700,
        color: '#ff4757',
        fontFamily: "'Roboto Mono', monospace",
    },
    bpmUnit: {
        fontSize: '0.75rem',
        color: 'rgba(255, 255, 255, 0.5)',
    },
    stressIndicator: {
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.75rem',
    },
    expandIcon: {
        fontSize: '0.75rem',
        color: 'rgba(255, 255, 255, 0.4)',
        marginLeft: '8px',
    },
    details: {
        padding: '0 16px 16px',
        borderTop: '1px solid rgba(0, 212, 255, 0.1)',
    },
    detailGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginTop: '12px',
    },
    detailItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    detailLabel: {
        fontSize: '0.65rem',
        color: 'rgba(255, 255, 255, 0.5)',
        textTransform: 'uppercase',
    },
    detailValue: {
        fontSize: '0.875rem',
        fontWeight: 600,
        color: '#fff',
        fontFamily: "'Roboto Mono', monospace",
    },
    rrSection: {
        marginTop: '16px',
    },
    rrLabel: {
        fontSize: '0.65rem',
        color: 'rgba(255, 255, 255, 0.5)',
        textTransform: 'uppercase',
    },
    rrBar: {
        display: 'flex',
        alignItems: 'flex-end',
        height: '30px',
        gap: '3px',
        marginTop: '6px',
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '4px',
        padding: '4px',
    },
    rrSegment: {
        flex: 1,
        borderRadius: '2px',
        minHeight: '4px',
        transition: 'height 0.3s ease',
    },
    reconnectBtn: {
        width: '100%',
        marginTop: '12px',
        padding: '10px',
        border: '1px dashed rgba(0, 212, 255, 0.4)',
        borderRadius: '8px',
        background: 'transparent',
        color: '#00d4ff',
        fontSize: '0.875rem',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
}

export default SensorStatus
