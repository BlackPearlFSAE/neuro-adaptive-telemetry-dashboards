import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useCircuit, CircuitData, Point } from '../contexts/CircuitContext'
import circuitImage from '../assets/circuit_map.jpeg'

export const CircuitConfigurator: React.FC = () => {
    const {
        activeCircuit,
        circuits,
        isLoading,
        analysisProgress,
        error,
        uploadAndAnalyze,
        activateCircuit
    } = useCircuit()

    const [mode, setMode] = useState<'view' | 'calibrate' | 'waypoints'>('view')
    const [waypoints, setWaypoints] = useState<Point[]>([])
    const [analyzedCircuit, setAnalyzedCircuit] = useState<CircuitData | null>(null)
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [circuitName, setCircuitName] = useState('')

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [imageLoaded, setImageLoaded] = useState(false)
    const imgRef = useRef<HTMLImageElement>(new Image())

    // Load default or uploaded image
    useEffect(() => {
        const src = uploadedImageUrl || circuitImage
        imgRef.current.src = src
        imgRef.current.onload = () => {
            setImageLoaded(true)
            draw()
        }
    }, [uploadedImageUrl])

    useEffect(() => {
        if (imageLoaded) draw()
    }, [mode, waypoints, imageLoaded, analyzedCircuit])

    const draw = () => {
        const ctx = canvasRef.current?.getContext('2d')
        if (!ctx || !imageLoaded) return

        const w = ctx.canvas.width
        const h = ctx.canvas.height

        ctx.clearRect(0, 0, w, h)

        // Draw Circuit Image (Dimmed)
        ctx.globalAlpha = 0.4
        const scaleBy = Math.min(w / imgRef.current.width, h / imgRef.current.height)
        const dw = imgRef.current.width * scaleBy
        const dy = imgRef.current.height * scaleBy
        const dx = (w - dw) / 2
        const dy_pos = (h - dy) / 2

        ctx.drawImage(imgRef.current, dx, dy_pos, dw, dy)
        ctx.globalAlpha = 1.0

        // Draw Analyzed Path (if available)
        if (analyzedCircuit?.svgPath) {
            ctx.strokeStyle = '#00d4ff'
            ctx.lineWidth = 3
            ctx.globalAlpha = 0.8
            const path2d = new Path2D(analyzedCircuit.svgPath)
            ctx.stroke(path2d)
            ctx.globalAlpha = 1.0
        }

        // Draw Waypoints
        const displayWaypoints = analyzedCircuit?.waypoints.length
            ? analyzedCircuit.waypoints
            : waypoints

        if (displayWaypoints.length > 0) {
            ctx.strokeStyle = '#00ff88'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(displayWaypoints[0].x, displayWaypoints[0].y)
            for (let i = 1; i < displayWaypoints.length; i++) {
                ctx.lineTo(displayWaypoints[i].x, displayWaypoints[i].y)
            }
            if (mode === 'view') ctx.closePath()
            ctx.stroke()

            // Points
            ctx.fillStyle = '#fff'
            displayWaypoints.forEach(p => {
                ctx.beginPath()
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
                ctx.fill()
            })
        }

        // Draw analysis overlay
        if (isLoading && analysisProgress) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
            ctx.fillRect(0, 0, w, h)

            ctx.fillStyle = '#00d4ff'
            ctx.font = 'bold 16px Outfit'
            ctx.textAlign = 'center'
            ctx.fillText('🔬 ' + analysisProgress, w / 2, h / 2)

            // Progress bar
            ctx.fillStyle = 'rgba(0, 212, 255, 0.3)'
            ctx.fillRect(w * 0.2, h / 2 + 20, w * 0.6, 8)
            ctx.fillStyle = '#00d4ff'
            const progress = analysisProgress.includes('complete') ? 1 : 0.6
            ctx.fillRect(w * 0.2, h / 2 + 20, w * 0.6 * progress, 8)
        }
    }

    const handleCanvasClick = (e: React.MouseEvent) => {
        if (mode !== 'waypoints') return
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        setWaypoints([...waypoints, { x, y }])
    }

    // Drag and drop handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback(() => {
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        const file = e.dataTransfer.files[0]
        if (file && file.type.startsWith('image/')) {
            await processFile(file)
        }
    }, [circuitName])

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            await processFile(file)
        }
    }

    const processFile = async (file: File) => {
        // Show local preview
        const reader = new FileReader()
        reader.onload = (e) => {
            setUploadedImageUrl(e.target?.result as string)
        }
        reader.readAsDataURL(file)

        // Analyze with backend
        const name = circuitName || file.name.replace(/\.[^/.]+$/, '')
        const result = await uploadAndAnalyze(file, name)
        if (result) {
            setAnalyzedCircuit(result)
            setCircuitName(result.name)
        }
    }

    const handleApplyToOverview = async () => {
        if (analyzedCircuit) {
            const success = await activateCircuit(analyzedCircuit.id)
            if (success) {
                // Show success feedback
                draw()
            }
        }
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span style={styles.icon}>📐</span>
                <span style={styles.title}>CIRCUIT GEOMETRY CONFIGURATOR</span>
                <div style={styles.toolbar}>
                    <button style={{ ...styles.toolBtn, opacity: mode === 'view' ? 1 : 0.5 }} onClick={() => setMode('view')}>👁️ View</button>
                    <button style={{ ...styles.toolBtn, opacity: mode === 'waypoints' ? 1 : 0.5 }} onClick={() => setMode('waypoints')}>📍 Add Waypoints</button>
                    <button style={styles.toolBtn} onClick={() => { setWaypoints([]); setAnalyzedCircuit(null); setUploadedImageUrl(null) }}>Clear</button>
                </div>
            </div>

            {/* Upload Zone */}
            <div
                style={{
                    ...styles.uploadZone,
                    borderColor: isDragging ? '#00ff88' : 'rgba(0, 212, 255, 0.3)',
                    background: isDragging ? 'rgba(0, 255, 136, 0.1)' : 'rgba(0, 0, 0, 0.2)'
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                />
                <span style={styles.uploadIcon}>{isDragging ? '📥' : '🖼️'}</span>
                <span style={styles.uploadText}>
                    {isDragging ? 'Drop circuit image here' : 'Drag & drop circuit image or click to upload'}
                </span>
                <input
                    type="text"
                    placeholder="Circuit name (optional)"
                    value={circuitName}
                    onChange={(e) => setCircuitName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    style={styles.nameInput}
                />
            </div>

            {/* Canvas */}
            <div style={styles.canvasContainer}>
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={450}
                    style={{ cursor: mode === 'waypoints' ? 'crosshair' : 'default' }}
                    onClick={handleCanvasClick}
                />
            </div>

            {/* Error Banner */}
            {error && (
                <div style={styles.errorBanner}>
                    ⚠️ {error}
                </div>
            )}

            {/* Analysis Results */}
            {analyzedCircuit && (
                <div style={styles.resultsPanel}>
                    <div style={styles.resultItem}>
                        <span style={styles.resultLabel}>Track Length</span>
                        <span style={styles.resultValue}>{(analyzedCircuit.metrics.lengthM / 1000).toFixed(2)} km</span>
                    </div>
                    <div style={styles.resultItem}>
                        <span style={styles.resultLabel}>Corners</span>
                        <span style={styles.resultValue}>{analyzedCircuit.metrics.cornerCount}</span>
                    </div>
                    <div style={styles.resultItem}>
                        <span style={styles.resultLabel}>Waypoints</span>
                        <span style={styles.resultValue}>{analyzedCircuit.waypoints.length}</span>
                    </div>
                    <div style={styles.resultItem}>
                        <span style={styles.resultLabel}>Straights</span>
                        <span style={styles.resultValue}>{(analyzedCircuit.metrics.straightPercentage * 100).toFixed(0)}%</span>
                    </div>
                </div>
            )}

            <div style={styles.footer}>
                <div style={styles.stat}>
                    <span>Active Circuit:</span>
                    <span style={{ color: '#00d4ff' }}>{activeCircuit?.name || 'None'}</span>
                </div>
                <div style={styles.stat}>
                    <span>Waypoints:</span>
                    <span style={{ color: '#fbbf24' }}>{analyzedCircuit?.waypoints.length || waypoints.length}</span>
                </div>

                {analyzedCircuit && (
                    <button
                        style={styles.applyBtn}
                        onClick={handleApplyToOverview}
                        disabled={isLoading}
                    >
                        {isLoading ? '⏳ Applying...' : '🎯 Apply to Overview'}
                    </button>
                )}

                <button style={styles.actionBtn}>Export Configuration</button>
            </div>

            {/* Available Circuits List */}
            {circuits.length > 1 && (
                <div style={styles.circuitList}>
                    <span style={styles.circuitListTitle}>Available Circuits:</span>
                    {circuits.map(c => (
                        <button
                            key={c.id}
                            style={{
                                ...styles.circuitBtn,
                                background: c.isActive ? 'rgba(0, 255, 136, 0.2)' : 'rgba(0, 212, 255, 0.1)',
                                borderColor: c.isActive ? '#00ff88' : 'rgba(0, 212, 255, 0.3)'
                            }}
                            onClick={() => activateCircuit(c.id)}
                        >
                            {c.isActive ? '✓ ' : ''}{c.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        background: 'rgba(13, 33, 55, 0.8)',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex', flexDirection: 'column', gap: '16px'
    },
    header: {
        display: 'flex', alignItems: 'center', gap: '12px',
        borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px'
    },
    icon: { fontSize: '1.2rem' },
    title: { fontSize: '0.9rem', fontWeight: 700, color: '#fff', letterSpacing: '1px', flex: 1 },
    toolbar: { display: 'flex', gap: '8px' },
    toolBtn: {
        padding: '6px 12px', borderRadius: '4px', border: 'none',
        background: 'rgba(0,212,255,0.2)', color: '#fff', cursor: 'pointer', fontSize: '0.8rem'
    },
    uploadZone: {
        border: '2px dashed rgba(0, 212, 255, 0.3)',
        borderRadius: '8px',
        padding: '20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
    },
    uploadIcon: { fontSize: '2rem' },
    uploadText: { color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem' },
    nameInput: {
        background: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '4px',
        padding: '6px 12px',
        color: '#fff',
        fontSize: '0.85rem',
        width: '200px',
        textAlign: 'center'
    },
    canvasContainer: {
        background: '#0a0a0a', borderRadius: '8px', overflow: 'hidden',
        border: '1px solid #333', display: 'flex', justifyContent: 'center'
    },
    errorBanner: {
        background: 'rgba(255, 71, 87, 0.2)',
        border: '1px solid rgba(255, 71, 87, 0.5)',
        borderRadius: '6px',
        padding: '10px 16px',
        color: '#ff4757',
        fontSize: '0.85rem'
    },
    resultsPanel: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        background: 'rgba(0, 255, 136, 0.05)',
        border: '1px solid rgba(0, 255, 136, 0.2)',
        borderRadius: '8px',
        padding: '12px'
    },
    resultItem: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
    },
    resultLabel: { fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.5)' },
    resultValue: { fontSize: '1rem', fontWeight: 700, color: '#00ff88', fontFamily: 'monospace' },
    footer: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '0.8rem', color: '#aaa', flexWrap: 'wrap', gap: '10px'
    },
    stat: { display: 'flex', gap: '8px' },
    applyBtn: {
        padding: '10px 20px',
        background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
        color: '#0a1628',
        fontWeight: 'bold',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        transition: 'transform 0.2s ease'
    },
    actionBtn: {
        padding: '8px 16px', background: '#00ff88', color: '#000', fontWeight: 'bold',
        border: 'none', borderRadius: '4px', cursor: 'pointer'
    },
    circuitList: {
        display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        paddingTop: '12px'
    },
    circuitListTitle: { color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.8rem' },
    circuitBtn: {
        padding: '6px 12px',
        border: '1px solid',
        borderRadius: '4px',
        background: 'rgba(0, 212, 255, 0.1)',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '0.8rem'
    }
}
