import React, { useEffect, useState } from 'react'

interface SafetyTrendData {
    history: { time: string; score: number; cardiac: number; cognitive: number; visual: number; stress: number }[]
}

export const SafetyTrendChart: React.FC = () => {
    const [data, setData] = useState<SafetyTrendData['history']>([])

    useEffect(() => {
        // Simulate initial history data
        const initialData = Array.from({ length: 30 }, (_, i) => ({
            time: new Date(Date.now() - (29 - i) * 2000).toLocaleTimeString(),
            score: 75 + Math.random() * 20,
            cardiac: 80 + Math.random() * 15,
            cognitive: 70 + Math.random() * 20,
            visual: 85 + Math.random() * 10,
            stress: 60 + Math.random() * 30
        }))
        setData(initialData)

        // Real-time update simulation
        const interval = setInterval(() => {
            setData(prev => {
                const last = prev[prev.length - 1]
                const nextScore = Math.max(0, Math.min(100, last.score + (Math.random() - 0.5) * 5))
                const next = {
                    time: new Date().toLocaleTimeString(),
                    score: nextScore,
                    cardiac: Math.max(0, Math.min(100, last.cardiac + (Math.random() - 0.5) * 5)),
                    cognitive: Math.max(0, Math.min(100, last.cognitive + (Math.random() - 0.5) * 5)),
                    visual: Math.max(0, Math.min(100, last.visual + (Math.random() - 0.5) * 5)),
                    stress: Math.max(0, Math.min(100, last.stress + (Math.random() - 0.5) * 5))
                }
                return [...prev.slice(1), next]
            })
        }, 2000)

        return () => clearInterval(interval)
    }, [])

    const width = 800
    const height = 300
    const padding = 40

    // Helper to scale values
    const getX = (i: number) => padding + (i / (data.length - 1)) * (width - 2 * padding)
    const getY = (val: number) => height - padding - (val / 100) * (height - 2 * padding)

    const createPath = (key: keyof typeof data[0]) => {
        if (data.length === 0) return ''
        return data.map((d, i) =>
            (i === 0 ? 'M' : 'L') + ` ${getX(i).toFixed(1)} ${getY(d[key] as number).toFixed(1)}`
        ).join(' ')
    }

    const createAreaPath = (key: keyof typeof data[0]) => {
        if (data.length === 0) return ''
        const line = createPath(key)
        return `${line} L ${getX(data.length - 1)} ${height - padding} L ${padding} ${height - padding} Z`
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h3 style={styles.title}>📈 Safety Trend Analysis</h3>
                <div style={styles.legend}>
                    <div style={styles.legendItem}><span style={{ ...styles.dot, background: '#00ff88' }}></span>Score</div>
                    <div style={styles.legendItem}><span style={{ ...styles.dot, background: '#a855f7' }}></span>Cognitive</div>
                    <div style={styles.legendItem}><span style={{ ...styles.dot, background: '#ff4757' }}></span>Stress</div>
                </div>
            </div>

            <div style={styles.chartContainer}>
                <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
                    {/* Grid */}
                    <defs>
                        <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#00ff88" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#00ff88" stopOpacity="0" />
                        </linearGradient>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                        </pattern>
                    </defs>
                    <rect x={padding} y={padding} width={width - 2 * padding} height={height - 2 * padding} fill="url(#grid)" />

                    {/* Axes */}
                    <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.3)" />
                    <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(255,255,255,0.3)" />

                    {/* Y-Axis Labels */}
                    {[0, 25, 50, 75, 100].map(val => (
                        <g key={val}>
                            <line
                                x1={padding - 5} y1={getY(val)}
                                x2={padding} y2={getY(val)}
                                stroke="rgba(255,255,255,0.3)"
                            />
                            <text
                                x={padding - 10} y={getY(val)}
                                fill="rgba(255,255,255,0.5)"
                                fontSize="12"
                                textAnchor="end"
                                alignmentBaseline="middle"
                            >
                                {val}
                            </text>
                            <line
                                x1={padding} y1={getY(val)}
                                x2={width - padding} y2={getY(val)}
                                stroke="rgba(255,255,255,0.05)"
                                strokeDasharray="4,4"
                            />
                        </g>
                    ))}

                    {/* Data Paths */}
                    {/* Stress */}
                    <path d={createPath('stress')} fill="none" stroke="#ff4757" strokeWidth="2" opacity="0.6" strokeDasharray="5,5" />

                    {/* Cognitive */}
                    <path d={createPath('cognitive')} fill="none" stroke="#a855f7" strokeWidth="2" opacity="0.6" />

                    {/* Overall Score */}
                    <path d={createAreaPath('score')} fill="url(#scoreGradient)" />
                    <path d={createPath('score')} fill="none" stroke="#00ff88" strokeWidth="3" filter="drop-shadow(0 0 4px rgba(0,255,136,0.5))" />

                </svg>
            </div>
        </div>
    )
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        background: 'rgba(13,33,55,0.8)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid rgba(0,212,255,0.2)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    },
    title: {
        color: '#fff',
        margin: 0,
        fontSize: '1.1rem',
        fontWeight: 600,
        letterSpacing: '0.5px',
    },
    legend: {
        display: 'flex',
        gap: '16px',
    },
    legendItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        color: 'rgba(255,255,255,0.7)',
        fontSize: '0.8rem',
    },
    dot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
    },
    chartContainer: {
        flex: 1,
        minHeight: '200px',
    }
}
