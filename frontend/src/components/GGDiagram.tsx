import React, { useEffect, useRef } from 'react'

interface Props {
    accel: { lateral: number; longitudinal: number }
}

export const GGDiagram: React.FC<Props> = ({ accel }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const w = canvas.width
        const h = canvas.height
        const centerX = w / 2
        const centerY = h / 2
        const scale = w / 4 // 1G = 1/4 width (so 2G covers half width)

        // Clear
        ctx.clearRect(0, 0, w, h)

        // Draw Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.1)'
        ctx.lineWidth = 1

        // Circles for 1G, 2G
        ctx.beginPath()
        ctx.arc(centerX, centerY, scale, 0, Math.PI * 2)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(centerX, centerY, scale * 2, 0, Math.PI * 2)
        ctx.stroke()

        // Crosshairs
        ctx.beginPath()
        ctx.moveTo(centerX, 0)
        ctx.lineTo(centerX, h)
        ctx.moveTo(0, centerY)
        ctx.lineTo(w, centerY)
        ctx.stroke()

        // Draw G-Force Dot
        // Note: Layout: +Long (Accel) = Up, -Long (Brake) = Down
        //       +Lat (Right) = Right, -Lat (Left) = Left
        const x = centerX + (accel.lateral * scale)
        const y = centerY - (accel.longitudinal * scale) // Invert Y because canvas Y is down

        // Trails could be added with a history buffer, for now just current dot
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, Math.PI * 2)
        ctx.fillStyle = '#00ff88'
        ctx.shadowColor = '#00ff88'
        ctx.shadowBlur = 10
        ctx.fill()
        ctx.shadowBlur = 0

        // Labels
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.font = '10px monospace'
        ctx.fillText('1G', centerX + scale + 2, centerY - 2)
        ctx.fillText('2G', centerX + scale * 2 - 10, centerY - 2)

    }, [accel])

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span style={styles.icon}>🎯</span>
                <span style={styles.title}>G-G DIAGRAM</span>
            </div>
            <div style={styles.canvasWrapper}>
                <canvas ref={canvasRef} width={240} height={240} />
            </div>
            <div style={styles.footer}>
                <div style={styles.stat}>
                    <span>LAT:</span>
                    <span style={{ color: '#00d4ff' }}>{accel.lateral.toFixed(2)}G</span>
                </div>
                <div style={styles.stat}>
                    <span>LONG:</span>
                    <span style={{ color: '#00d4ff' }}>{accel.longitudinal.toFixed(2)}G</span>
                </div>
            </div>
        </div>
    )
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        background: 'rgba(13, 33, 55, 0.6)',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex', flexDirection: 'column', alignItems: 'center'
    },
    header: {
        width: '100%', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px',
        borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px'
    },
    icon: { fontSize: '1.2rem' },
    title: { fontSize: '0.9rem', fontWeight: 700, color: '#fff', letterSpacing: '1px' },
    canvasWrapper: {
        background: 'radial-gradient(circle at center, rgba(0,212,255,0.05) 0%, transparent 70%)',
        borderRadius: '50%',
        marginBottom: '10px'
    },
    footer: {
        width: '100%', display: 'flex', justifyContent: 'space-between',
        fontSize: '0.8rem', color: '#aaa', fontFamily: 'monospace'
    },
    stat: { display: 'flex', gap: '5px' }
}
