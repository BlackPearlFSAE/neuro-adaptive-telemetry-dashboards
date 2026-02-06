/**
 * VehicleScene.tsx
 * =================
 * Three.js Canvas wrapper with camera controls, lighting, and post-processing
 */

import React, { Suspense, useRef, useState, Component, ErrorInfo, ReactNode } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Grid, Html } from '@react-three/drei'
import * as THREE from 'three'
import { FormulaCar3D, Subsystem } from './FormulaCar3D'
import { VehicleTelemetryData } from '../../types/telemetry'

// Error Boundary for 3D Canvas
interface ErrorBoundaryProps {
    children: ReactNode
    fallback?: ReactNode
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
}

class CanvasErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('3D Canvas Error:', error, errorInfo)
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'radial-gradient(ellipse at center, #0d1b2a 0%, #0a0f18 100%)',
                    color: '#fff',
                    padding: '40px'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px' }}>
                        3D Visualization Error
                    </div>
                    <div style={{
                        fontSize: '0.85rem',
                        color: '#ef4444',
                        background: 'rgba(0,0,0,0.3)',
                        padding: '8px',
                        borderRadius: '4px',
                        marginBottom: '8px',
                        fontFamily: 'monospace',
                        maxWidth: '80%'
                    }}>
                        {this.state.error?.toString()}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', textAlign: 'center', maxWidth: '400px' }}>
                        Unable to load 3D vehicle model. This may be due to WebGL compatibility or missing resources.
                    </div>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        style={{
                            marginTop: '20px',
                            padding: '10px 24px',
                            background: '#00d4ff',
                            color: '#000',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Retry
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}


// Camera preset positions
type CameraPreset = 'isometric' | 'front' | 'side' | 'top' | 'rear'

const CAMERA_PRESETS: Record<CameraPreset, { position: [number, number, number]; target: [number, number, number] }> = {
    isometric: { position: [3, 2, 3], target: [0, 0.2, 0] },
    front: { position: [0, 0.8, 4], target: [0, 0.2, 0] },
    side: { position: [4, 0.5, 0], target: [0, 0.2, 0] },
    top: { position: [0, 5, 0], target: [0, 0, 0] },
    rear: { position: [0, 1, -4], target: [0, 0.2, 0] }
}

interface VehicleSceneProps {
    telemetry: VehicleTelemetryData
    selectedComponent: Subsystem | null
    onSelectComponent: (component: Subsystem | null) => void
    cameraPreset: CameraPreset
    showGrid: boolean
    showEffects: boolean
}

// Loading spinner for Suspense
const Loader: React.FC = () => (
    <Html center>
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            color: '#00d4ff'
        }}>
            <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(0, 212, 255, 0.2)',
                borderTop: '3px solid #00d4ff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
            }} />
            <span style={{ fontSize: '0.8rem', letterSpacing: '0.1em' }}>LOADING 3D MODEL...</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    </Html>
)

// Camera controller for smooth transitions
const CameraController: React.FC<{ preset: CameraPreset }> = ({ preset }) => {
    const { camera } = useThree()
    const targetPos = useRef(new THREE.Vector3(...CAMERA_PRESETS[preset].position))

    useFrame(() => {
        const target = CAMERA_PRESETS[preset].position
        targetPos.current.set(...target)
        camera.position.lerp(targetPos.current, 0.05)
        camera.lookAt(...CAMERA_PRESETS[preset].target)
    })

    return null
}

// Ground grid with measurements
const MeasurementGrid: React.FC<{ visible: boolean }> = ({ visible }) => {
    if (!visible) return null

    return (
        <group>
            <Grid
                position={[0, 0, 0]}
                args={[10, 10]}
                cellSize={0.5}
                cellThickness={0.5}
                cellColor="#1e3a5f"
                sectionSize={1}
                sectionThickness={1}
                sectionColor="#00d4ff"
                fadeDistance={15}
                fadeStrength={1}
                followCamera={false}
                infiniteGrid
            />

            {/* Dimension markers */}
            {[0, 1, 2, 3, 4].map((i) => (
                <Html key={i} position={[i - 2, 0.01, 2.5]} style={{ pointerEvents: 'none' }}>
                    <span style={{
                        color: 'rgba(0, 212, 255, 0.6)',
                        fontSize: '0.6rem',
                        fontFamily: 'monospace'
                    }}>
                        {(i - 2)}m
                    </span>
                </Html>
            ))}
        </group>
    )
}

// Scene content
const SceneContent: React.FC<{
    telemetry: VehicleTelemetryData
    selectedComponent: Subsystem | null
    onSelectComponent: (component: Subsystem | null) => void
    cameraPreset: CameraPreset
    showGrid: boolean
    showEffects: boolean
}> = ({ telemetry, selectedComponent, onSelectComponent, cameraPreset, showGrid, showEffects: _showEffects }) => {
    const [hoverComponent, setHoverComponent] = useState<Subsystem | null>(null)

    return (
        <>
            {/* Camera */}
            <PerspectiveCamera makeDefault position={[3, 2, 3]} fov={45} />
            <CameraController preset={cameraPreset} />

            {/* Controls */}
            <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                minDistance={2}
                maxDistance={10}
                minPolarAngle={0.1}
                maxPolarAngle={Math.PI / 2 - 0.1}
                target={[0, 0.2, 0]}
            />

            {/* Lighting - Enhanced to compensate for removed Environment */}
            <ambientLight intensity={0.5} />
            <directionalLight
                position={[5, 10, 5]}
                intensity={1.5}
                castShadow
                shadow-mapSize={[2048, 2048]}
            />
            <directionalLight position={[-5, 5, -5]} intensity={0.6} />
            <directionalLight position={[0, 8, -5]} intensity={0.4} color="#94a3b8" />
            <pointLight position={[0, 3, 0]} intensity={0.6} color="#00d4ff" />
            <hemisphereLight args={['#87ceeb', '#362312', 0.5]} />

            {/* Simple Ground Plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[20, 20]} />
                <meshStandardMaterial
                    color="#0a1628"
                    roughness={0.9}
                    metalness={0.1}
                    transparent
                    opacity={0.8}
                />
            </mesh>

            {/* Grid */}
            <MeasurementGrid visible={showGrid} />

            {/* Car Model */}
            <Suspense fallback={<Loader />}>
                <FormulaCar3D
                    telemetry={telemetry}
                    selectedComponent={selectedComponent}
                    onSelectComponent={onSelectComponent}
                    hoverComponent={hoverComponent}
                    onHoverComponent={setHoverComponent}
                />
            </Suspense>

            {/* Post-processing - only if supported */}
            {/* <Effects enabled={showEffects} /> - Temporarily disabled for stability debugging */}
        </>
    )
}

export const VehicleScene: React.FC<VehicleSceneProps> = (props) => {
    return (
        <div style={{
            width: '100%',
            height: '100%',
            background: 'radial-gradient(ellipse at center, #0d1b2a 0%, #0a0f18 100%)'
        }}>
            <CanvasErrorBoundary>
                <Canvas
                    shadows
                    dpr={[1, 2]}
                    gl={{
                        antialias: true,
                        alpha: false,
                        powerPreference: 'high-performance'
                    }}
                    onPointerMissed={() => props.onSelectComponent(null)}
                >
                    <SceneContent {...props} />
                </Canvas>
            </CanvasErrorBoundary>
        </div>
    )
}

export type { CameraPreset }
export default VehicleScene
