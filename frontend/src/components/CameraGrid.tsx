import React, { useState } from 'react'

interface CameraView {
    id: string
    label: string
    position: string
    icon: string
    active: boolean
}

const CAMERA_POSITIONS: CameraView[] = [
    { id: 'front', label: 'Front', position: 'Hood Camera', icon: '⬆️', active: true },
    { id: 'front-left', label: 'Front Left', position: 'Left Mirror', icon: '↖️', active: true },
    { id: 'front-right', label: 'Front Right', position: 'Right Mirror', icon: '↗️', active: true },
    { id: 'left', label: 'Left Side', position: 'Left Sidepod', icon: '⬅️', active: true },
    { id: 'right', label: 'Right Side', position: 'Right Sidepod', icon: '➡️', active: true },
    { id: 'rear-left', label: 'Rear Left', position: 'DRS Zone', icon: '↙️', active: true },
    { id: 'rear-right', label: 'Rear Right', position: 'Diffuser', icon: '↘️', active: true },
    { id: 'rear', label: 'Rear', position: 'Rear Wing', icon: '⬇️', active: true },
]

export const CameraGrid: React.FC = () => {
    const [selectedCamera, setSelectedCamera] = useState<string | null>(null)
    const [gridMode, setGridMode] = useState<'grid' | 'single'>('grid')

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.titleSection}>
                    <span style={styles.title}>📹 VEHICLE CAMERAS</span>
                    <span style={styles.subtitle}>8-View Surround Monitor</span>
                </div>
                <div style={styles.controls}>
                    <button
                        style={{ ...styles.modeBtn, ...(gridMode === 'grid' ? styles.modeBtnActive : {}) }}
                        onClick={() => setGridMode('grid')}
                    >
                        ⊞ Grid
                    </button>
                    <button
                        style={{ ...styles.modeBtn, ...(gridMode === 'single' ? styles.modeBtnActive : {}) }}
                        onClick={() => setGridMode('single')}
                    >
                        ◻ Focus
                    </button>
                </div>
            </div>

            {/* Camera Layout */}
            <div style={styles.layout}>
                {/* Center Vehicle Diagram */}
                <div style={styles.vehicleCenter}>
                    <svg viewBox="0 0 120 200" style={styles.vehicleSvg}>
                        {/* Car body outline */}
                        <path
                            d="M60 10 L85 40 L90 60 L90 140 L85 160 L75 180 L45 180 L35 160 L30 140 L30 60 L35 40 Z"
                            fill="rgba(0, 212, 255, 0.1)"
                            stroke="#00d4ff"
                            strokeWidth="2"
                        />
                        {/* Front wing */}
                        <rect x="20" y="15" width="80" height="8" rx="2" fill="#00d4ff" opacity="0.5" />
                        {/* Rear wing */}
                        <rect x="25" y="175" width="70" height="10" rx="2" fill="#00d4ff" opacity="0.5" />
                        {/* Cockpit */}
                        <ellipse cx="60" cy="80" rx="15" ry="25" fill="rgba(0, 255, 136, 0.3)" stroke="#00ff88" />
                        {/* Wheels */}
                        <ellipse cx="25" cy="55" rx="8" ry="15" fill="#333" stroke="#00d4ff" />
                        <ellipse cx="95" cy="55" rx="8" ry="15" fill="#333" stroke="#00d4ff" />
                        <ellipse cx="25" cy="150" rx="8" ry="15" fill="#333" stroke="#00d4ff" />
                        <ellipse cx="95" cy="150" rx="8" ry="15" fill="#333" stroke="#00d4ff" />
                        {/* Camera indicators */}
                        {CAMERA_POSITIONS.map((cam) => {
                            const positions: { [key: string]: { x: number, y: number } } = {
                                'front': { x: 60, y: 5 },
                                'front-left': { x: 15, y: 30 },
                                'front-right': { x: 105, y: 30 },
                                'left': { x: 10, y: 100 },
                                'right': { x: 110, y: 100 },
                                'rear-left': { x: 15, y: 170 },
                                'rear-right': { x: 105, y: 170 },
                                'rear': { x: 60, y: 195 },
                            }
                            const pos = positions[cam.id]
                            return (
                                <circle
                                    key={cam.id}
                                    cx={pos.x}
                                    cy={pos.y}
                                    r="6"
                                    fill={selectedCamera === cam.id ? '#00ff88' : '#00d4ff'}
                                    opacity={0.8}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => {
                                        setSelectedCamera(cam.id)
                                        setGridMode('single')
                                    }}
                                />
                            )
                        })}
                    </svg>
                </div>

                {/* Camera Grid */}
                <div style={{
                    ...styles.cameraGrid,
                    gridTemplateColumns: gridMode === 'grid' ? 'repeat(4, 1fr)' : '1fr',
                    gridTemplateRows: gridMode === 'grid' ? 'repeat(2, 1fr)' : '1fr',
                }}>
                    {(gridMode === 'grid' ? CAMERA_POSITIONS : CAMERA_POSITIONS.filter(c => c.id === (selectedCamera || 'front'))).map(cam => (
                        <div
                            key={cam.id}
                            style={{
                                ...styles.cameraCard,
                                ...(selectedCamera === cam.id ? styles.cameraCardSelected : {})
                            }}
                            onClick={() => {
                                setSelectedCamera(cam.id)
                                if (gridMode === 'grid') setGridMode('single')
                            }}
                        >
                            {/* Camera Feed Placeholder */}
                            <div style={styles.cameraFeed}>
                                <div style={styles.feedPlaceholder}>
                                    <span style={styles.feedIcon}>{cam.icon}</span>
                                    <span style={styles.feedStatus}>LIVE</span>
                                </div>
                                {/* Noise overlay for realism */}
                                <div style={styles.noiseOverlay} />
                            </div>

                            {/* Camera Info */}
                            <div style={styles.cameraInfo}>
                                <span style={styles.cameraLabel}>{cam.label}</span>
                                <span style={styles.cameraPosition}>{cam.position}</span>
                            </div>

                            {/* Status indicator */}
                            <div style={styles.statusDot} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Status Bar */}
            <div style={styles.statusBar}>
                <div style={styles.statusItem}>
                    <span style={styles.statusLabel}>Active Cameras</span>
                    <span style={styles.statusValue}>8/8</span>
                </div>
                <div style={styles.statusItem}>
                    <span style={styles.statusLabel}>Frame Rate</span>
                    <span style={styles.statusValue}>30 FPS</span>
                </div>
                <div style={styles.statusItem}>
                    <span style={styles.statusLabel}>Latency</span>
                    <span style={styles.statusValue}>&lt;50ms</span>
                </div>
                <div style={styles.statusItem}>
                    <span style={styles.statusLabel}>Recording</span>
                    <span style={{ ...styles.statusValue, color: '#ff4757' }}>● REC</span>
                </div>
            </div>
        </div>
    )
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        background: 'linear-gradient(135deg, rgba(13, 33, 55, 0.95) 0%, rgba(20, 40, 65, 0.95) 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        padding: '20px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(10px)',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    },
    titleSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    title: {
        fontSize: '1.1rem',
        fontWeight: 700,
        color: '#fff',
        letterSpacing: '1px',
    },
    subtitle: {
        fontSize: '0.75rem',
        color: 'rgba(255,255,255,0.5)',
    },
    controls: {
        display: 'flex',
        gap: '8px',
    },
    modeBtn: {
        padding: '8px 16px',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        borderRadius: '6px',
        background: 'transparent',
        color: 'rgba(255,255,255,0.6)',
        fontSize: '0.8rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    modeBtnActive: {
        background: 'rgba(0, 212, 255, 0.2)',
        color: '#00d4ff',
        borderColor: '#00d4ff',
    },
    layout: {
        display: 'flex',
        gap: '20px',
        flex: 1,
        minHeight: 0,
    },
    vehicleCenter: {
        width: '150px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    vehicleSvg: {
        width: '100%',
        height: 'auto',
    },
    cameraGrid: {
        flex: 1,
        display: 'grid',
        gap: '12px',
        minHeight: 0,
    },
    cameraCard: {
        position: 'relative',
        background: 'rgba(0, 0, 0, 0.4)',
        borderRadius: '10px',
        border: '1px solid rgba(0, 212, 255, 0.15)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        flexDirection: 'column',
    },
    cameraCardSelected: {
        borderColor: '#00ff88',
        boxShadow: '0 0 20px rgba(0, 255, 136, 0.2)',
    },
    cameraFeed: {
        flex: 1,
        position: 'relative',
        background: 'linear-gradient(180deg, #1a1a2e 0%, #0d1117 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80px',
    },
    feedPlaceholder: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
    },
    feedIcon: {
        fontSize: '2rem',
        opacity: 0.4,
    },
    feedStatus: {
        fontSize: '0.6rem',
        padding: '2px 8px',
        background: 'rgba(0, 255, 136, 0.2)',
        color: '#00ff88',
        borderRadius: '10px',
        fontWeight: 600,
    },
    noiseOverlay: {
        position: 'absolute',
        inset: 0,
        background: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
        opacity: 0.03,
        pointerEvents: 'none',
    },
    cameraInfo: {
        padding: '8px 10px',
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cameraLabel: {
        fontSize: '0.75rem',
        fontWeight: 600,
        color: '#fff',
    },
    cameraPosition: {
        fontSize: '0.65rem',
        color: 'rgba(255,255,255,0.4)',
    },
    statusDot: {
        position: 'absolute',
        top: '8px',
        right: '8px',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: '#00ff88',
        boxShadow: '0 0 8px #00ff88',
    },
    statusBar: {
        display: 'flex',
        justifyContent: 'space-around',
        padding: '12px 0 0',
        marginTop: '15px',
        borderTop: '1px solid rgba(0, 212, 255, 0.1)',
    },
    statusItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
    },
    statusLabel: {
        fontSize: '0.65rem',
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
    },
    statusValue: {
        fontSize: '0.85rem',
        fontWeight: 600,
        color: '#00d4ff',
        fontFamily: 'monospace',
    },
}
