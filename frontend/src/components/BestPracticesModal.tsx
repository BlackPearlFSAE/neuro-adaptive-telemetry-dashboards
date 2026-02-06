import React, { useState, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, Float, Stars, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

interface BestPracticesModalProps {
    isOpen: boolean
    onClose: () => void
}

const BP16_GUIDELINES = [
    {
        id: "driver_monitoring",
        title: "Subject Monitoring",
        icon: "👤",
        color: "#00d4ff",
        pos: [2.5, 0, 0],
        guidelines: [
            "ECG/HRV @ 130Hz",
            "EEG Theta/Beta Ratio",
            "GSR Stress Detection",
            "Pupil Dilation Tracking"
        ]
    },
    {
        id: "intervention_protocol",
        title: "Intervention",
        icon: "⚡",
        color: "#ffda79",
        pos: [1.25, 2.165, 0],
        guidelines: [
            "L1: Visual Info",
            "L2: Audio Warning",
            "L3: Haptic Feedback",
            "L4: Control Override"
        ]
    },
    {
        id: "data_integrity",
        title: "Data Integrity",
        icon: "🔒",
        color: "#ffb142",
        pos: [-1.25, 2.165, 0],
        guidelines: [
            "GPS Timestamping",
            "Cloud Redundancy",
            "Signal Quality QC",
            "GDPR Compliance"
        ]
    },
    {
        id: "vehicle_integration",
        title: "Car Systems",
        icon: "🏎️",
        color: "#ff5252",
        pos: [-2.5, 0, 0],
        guidelines: [
            "CAN Bus @ 500kbps",
            "Motor Telemetry",
            "Brake-by-Wire",
            "G-Force Tracking"
        ]
    },
    {
        id: "ai_safety",
        title: "AI Safety",
        icon: "🧠",
        color: "#706fd3",
        pos: [-1.25, -2.165, 0],
        guidelines: [
            "Multi-modal Fusion",
            "Weighted Confidence",
            "Human Override",
            "Explainable Logs"
        ]
    },
    {
        id: "emergency_procedures",
        title: "Emergency",
        icon: "🚨",
        color: "#ff793f",
        pos: [1.25, -2.165, 0],
        guidelines: [
            "Microsleep Alert",
            "SpO2 < 92% Stop",
            "Signal Loss Check",
            "Medical Team Link"
        ]
    },
    {
        id: "team_management",
        title: "Team Ops",
        icon: "👥",
        color: "#00ff88",
        pos: [0, -3.5, 0],
        guidelines: [
            "Role Clarity",
            "Clear Comms",
            "Shift Rotation",
            "Debrief Protocol"
        ]
    }
]

// --- 3D Components ---

function CentralCore() {
    const meshRef = useRef<THREE.Mesh>(null)

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.005
            meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2
        }
    })

    return (
        <group>
            <mesh ref={meshRef}>
                <icosahedronGeometry args={[1, 1]} />
                <meshStandardMaterial
                    color="#000"
                    emissive="#00d4ff"
                    emissiveIntensity={0.8}
                    wireframe
                    transparent
                    opacity={0.8}
                />
            </mesh>
            <mesh>
                <sphereGeometry args={[0.5, 32, 32]} />
                <meshBasicMaterial color="#00d4ff" />
            </mesh>
            <pointLight distance={10} intensity={2} color="#00ffc7" />
        </group>
    )
}

function CategoryNode({ data, isSelected, onClick }: { data: any, isSelected: boolean, onClick: () => void }) {
    const meshRef = useRef<THREE.Mesh>(null)
    const [hovered, setHover] = useState(false)

    // Orbit logic
    useFrame((_state) => {
        if (meshRef.current && !isSelected) {
            // Simple slow orbit if needed, or static. Let's keep them static in formation for clarity 
            // but rotate the mesh itself
            meshRef.current.rotation.y += 0.01
            meshRef.current.rotation.z += 0.005
        }
    })

    const scale = isSelected ? 1.5 : (hovered ? 1.2 : 1)

    return (
        <group position={data.pos}>
            <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                <mesh
                    ref={meshRef}
                    onClick={(e) => { e.stopPropagation(); onClick() }}
                    onPointerOver={() => setHover(true)}
                    onPointerOut={() => setHover(false)}
                    scale={[scale, scale, scale]}
                >
                    <octahedronGeometry args={[0.6, 0]} />
                    <meshStandardMaterial
                        color={data.color}
                        emissive={data.color}
                        emissiveIntensity={isSelected || hovered ? 1 : 0.4}
                        wireframe
                    />
                </mesh>

                {/* Connector Line to Center */}
                <line>
                    <bufferGeometry attach="geometry" onUpdate={self => {
                        const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(-data.pos[0], -data.pos[1], -data.pos[2])]
                        self.setFromPoints(points)
                    }} />
                    <lineBasicMaterial attach="material" color={data.color} opacity={0.2} transparent />
                </line>

                {/* Label */}
                <Html distanceFactor={10} position={[0, -1, 0]} style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                    <div style={{
                        color: isSelected ? data.color : 'rgba(255,255,255,0.6)',
                        fontSize: '12px',
                        fontFamily: 'Orbitron, sans-serif',
                        textShadow: '0 0 5px rgba(0,0,0,0.8)',
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}>
                        {data.title}
                    </div>
                </Html>
            </Float>
        </group>
    )
}

function Scene({ selectedId, onSelect }: { selectedId: string | null, onSelect: (id: string | null) => void }) {
    useThree()

    useFrame(() => {
        // Smooth camera movement could go here if we wanted cinematics
        // vector3.lerp...
    })

    return (
        <>
            <PerspectiveCamera makeDefault position={[0, 0, 8]} />
            <OrbitControls enableZoom={false} autoRotate={!selectedId} autoRotateSpeed={0.5} />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

            <CentralCore />

            {BP16_GUIDELINES.map((item) => (
                <CategoryNode
                    key={item.id}
                    data={item}
                    isSelected={selectedId === item.id}
                    onClick={() => onSelect(selectedId === item.id ? null : item.id)}
                />
            ))}
        </>
    )
}


export const BestPracticesModal: React.FC<BestPracticesModalProps> = ({ isOpen, onClose }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const selectedItem = BP16_GUIDELINES.find(i => i.id === selectedId)

    if (!isOpen) return null

    return (
        <div style={styles.overlay}>
            <div style={styles.container}>
                {/* 3D Scene Layer */}
                <div style={styles.sceneContainer}>
                    <Canvas>
                        <Scene selectedId={selectedId} onSelect={setSelectedId} />
                    </Canvas>
                </div>

                {/* Header Layer */}
                <div style={styles.header}>
                    <div style={styles.titleBlock}>
                        <h2 style={styles.title}>BP16 NEURO-ADAPTIVE STANDARDS</h2>
                        <span style={styles.subtitle}>INTERACTIVE VISUALIZER</span>
                    </div>
                    <button style={styles.closeBtn} onClick={onClose}>EXIT VISUALIZER</button>
                </div>

                {/* Details Overlay Layer */}
                {selectedItem && (
                    <div style={styles.detailsPanel}>
                        <div style={{ ...styles.detailsHeader, borderLeft: `4px solid ${selectedItem.color}` }}>
                            <span style={{ fontSize: '2rem', marginRight: '10px' }}>{selectedItem.icon}</span>
                            <h3 style={{ margin: 0, color: selectedItem.color }}>{selectedItem.title}</h3>
                        </div>
                        <ul style={styles.guidelineList}>
                            {selectedItem.guidelines.map((g, i) => (
                                <li key={i} style={styles.guidelineItem}>
                                    <span style={{ color: selectedItem.color, marginRight: '8px' }}>▹</span>
                                    {g}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Footer Instructions */}
                {!selectedItem && (
                    <div style={styles.footerInstruction}>
                        Click on a node to view guidelines • Drag to rotate
                    </div>
                )}
            </div>
        </div>
    )
}

const styles: { [key: string]: React.CSSProperties } = {
    overlay: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: '#050510',
        zIndex: 2000,
    },
    container: {
        width: '100%',
        height: '100%',
        position: 'relative'
    },
    sceneContainer: {
        position: 'absolute',
        top: 0, left: 0, width: '100%', height: '100%',
        zIndex: 1
    },
    header: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        padding: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        zIndex: 10,
        pointerEvents: 'none' // Let clicks pass through to canvas
    },
    titleBlock: {
        pointerEvents: 'auto'
    },
    title: {
        margin: 0,
        color: '#fff',
        fontSize: '1.5rem',
        letterSpacing: '2px',
        textShadow: '0 0 10px rgba(0, 212, 255, 0.5)'
    },
    subtitle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: '0.8rem',
        letterSpacing: '3px'
    },
    closeBtn: {
        pointerEvents: 'auto',
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
        color: '#fff',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.8rem',
        letterSpacing: '1px',
        backdropFilter: 'blur(5px)'
    },
    detailsPanel: {
        position: 'absolute',
        bottom: '40px',
        left: '40px',
        width: '300px',
        background: 'rgba(10, 20, 40, 0.85)',
        backdropFilter: 'blur(15px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '20px',
        zIndex: 10,
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        animation: 'slideUp 0.3s ease-out'
    },
    detailsHeader: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '16px',
        paddingLeft: '12px'
    },
    guidelineList: {
        listStyle: 'none',
        padding: 0,
        margin: 0
    },
    guidelineItem: {
        color: '#ccc',
        fontSize: '0.9rem',
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center'
    },
    footerInstruction: {
        position: 'absolute',
        bottom: '20px',
        width: '100%',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.4)',
        fontSize: '0.8rem',
        letterSpacing: '1px',
        zIndex: 5,
        pointerEvents: 'none'
    }
}
