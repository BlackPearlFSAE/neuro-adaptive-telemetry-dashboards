import React, { useState } from 'react'
import { VehicleScene, ComponentDetailsPanel, Subsystem } from './3d'
import { VehicleTelemetryData } from '../types/telemetry'

interface VehicleTelemetryProps {
    vehicle: VehicleTelemetryData
}

export const VehicleTelemetry: React.FC<VehicleTelemetryProps> = ({ vehicle }) => {
    const [selectedSystem, setSelectedSystem] = useState<Subsystem | null>('powertrain')
    const [cameraPreset, setCameraPreset] = useState<'isometric' | 'side' | 'top'>('isometric')

    // Map tabs to subsystems
    const tabs: { id: Subsystem; label: string }[] = [
        { id: 'powertrain', label: 'MOTOR' },
        { id: 'battery', label: 'BATTERY' },
        { id: 'brakes', label: 'BRAKES' },
        { id: 'wheel_fl', label: 'TIRES' }
    ]

    return (
        <div style={styles.container}>
            {/* Header Overlay */}
            <div style={styles.header}>
                <div style={styles.titleSection}>
                    <h2 style={styles.title}>VEHICLE TELEMETRY</h2>
                    <span style={styles.subtitle}>Formula EV Systems Monitor</span>
                </div>
                <div style={styles.lapInfo}>
                    <div style={styles.lapBadge}>
                        <span style={styles.lapLabel}>LAP</span>
                        <span style={styles.lapNumber}>{vehicle?.lap?.current ?? 0}</span>
                    </div>
                    <div style={styles.speedGauge}>
                        <span style={styles.speedValue}>{vehicle?.chassis?.speed_kph?.toFixed(0) ?? 0}</span>
                        <span style={styles.speedUnit}>KPH</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div style={styles.content}>

                {/* 3D Scene Layer */}
                <div style={styles.sceneContainer}>
                    <VehicleScene
                        telemetry={vehicle}
                        selectedComponent={selectedSystem}
                        onSelectComponent={setSelectedSystem}
                        cameraPreset={cameraPreset}
                        showGrid={true}
                        showEffects={true}
                    />
                </div>

                {/* Right Floating Panel */}
                <div style={styles.rightPanel}>
                    {/* Camera Controls Mini */}
                    <div style={styles.camControls}>
                        <button onClick={() => setCameraPreset('isometric')} style={{ ...styles.camBtn, opacity: cameraPreset === 'isometric' ? 1 : 0.5 }}>ISO</button>
                        <button onClick={() => setCameraPreset('side')} style={{ ...styles.camBtn, opacity: cameraPreset === 'side' ? 1 : 0.5 }}>SIDE</button>
                        <button onClick={() => setCameraPreset('top')} style={{ ...styles.camBtn, opacity: cameraPreset === 'top' ? 1 : 0.5 }}>TOP</button>
                    </div>

                    {/* Component Tabs */}
                    <div style={styles.tabsRow}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                style={{
                                    ...styles.tabBtn,
                                    borderColor: selectedSystem === tab.id ? '#00d4ff' : 'rgba(255,255,255,0.2)',
                                    color: selectedSystem === tab.id ? '#00d4ff' : 'rgba(255,255,255,0.6)',
                                    background: selectedSystem === tab.id ? 'rgba(0,212,255,0.1)' : 'transparent'
                                }}
                                onClick={() => setSelectedSystem(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Details Panel */}
                    <div style={styles.detailsWrapper}>
                        <ComponentDetailsPanel
                            selectedComponent={selectedSystem}
                            telemetry={vehicle}
                            onClose={() => setSelectedSystem(null)}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, rgba(13, 33, 55, 0.95) 0%, rgba(10, 22, 40, 0.98) 100%)',
        borderRadius: '16px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
        pointerEvents: 'none' // Let clicks pass through to canvas
    },
    titleSection: { pointerEvents: 'auto' },
    title: { fontSize: '1.25rem', fontWeight: 800, color: '#fff', letterSpacing: '2px', margin: 0 },
    subtitle: { fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' },
    lapInfo: { display: 'flex', gap: '24px', pointerEvents: 'auto' },
    lapBadge: { textAlign: 'center', background: 'rgba(0,212,255,0.1)', padding: '6px 12px', borderRadius: '8px' },
    lapLabel: { display: 'block', fontSize: '0.6rem', color: '#00d4ff' },
    lapNumber: { fontSize: '1.4rem', fontWeight: 800, color: '#fff', fontFamily: 'monospace' },
    speedGauge: { textAlign: 'center' },
    speedValue: { fontSize: '2rem', fontWeight: 800, color: '#fff', lineHeight: 1 },
    speedUnit: { fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' },

    content: {
        flex: 1,
        position: 'relative',
        display: 'flex'
    },
    sceneContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%'
    },
    rightPanel: {
        position: 'absolute',
        top: '100px',
        right: '24px',
        width: '320px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        zIndex: 20
    },
    camControls: {
        display: 'flex',
        gap: '8px',
        justifyContent: 'flex-end',
        marginBottom: '8px'
    },
    camBtn: {
        background: 'rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.2)',
        color: '#fff',
        borderRadius: '4px',
        padding: '4px 8px',
        fontSize: '0.6rem',
        cursor: 'pointer'
    },
    tabsRow: {
        display: 'flex',
        gap: '8px',
        background: 'rgba(0,0,0,0.4)',
        padding: '8px',
        borderRadius: '8px',
        backdropFilter: 'blur(10px)'
    },
    tabBtn: {
        flex: 1,
        padding: '8px 0',
        border: '1px solid',
        borderRadius: '6px',
        fontSize: '0.7rem',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    detailsWrapper: {
        // ComponentDetailsPanel has its own styling, just wrapper
    }
}
