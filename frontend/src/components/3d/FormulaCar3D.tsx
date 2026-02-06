/**
 * FormulaCar3D.tsx
 * ================
 * Interactive 3D Formula EV car model matching BP16 CAD design
 * Built programmatically with Three.js/React Three Fiber
 */

import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { VehicleTelemetryData } from '../../types/telemetry'

// Component subsystem identifiers
export type Subsystem = 'chassis' | 'suspension_fl' | 'suspension_fr' | 'suspension_rl' | 'suspension_rr'
    | 'powertrain' | 'battery' | 'brakes' | 'aero_front' | 'aero_rear' | 'wheel_fl' | 'wheel_fr' | 'wheel_rl' | 'wheel_rr'

interface FormulaCar3DProps {
    telemetry: VehicleTelemetryData
    selectedComponent: Subsystem | null
    onSelectComponent: (component: Subsystem | null) => void
    hoverComponent: Subsystem | null
    onHoverComponent: (component: Subsystem | null) => void
}

// Status to color mapping
const getStatusColor = (status: string): string => {
    switch (status) {
        case 'critical': return '#ef4444'
        case 'warning': return '#f59e0b'
        case 'optimal': return '#10b981'
        default: return '#6b7280'
    }
}

const getTempColor = (temp: number, min: number = 20, max: number = 100): string => {
    const ratio = Math.min(1, Math.max(0, (temp - min) / (max - min)))
    if (ratio < 0.5) return '#10b981'
    if (ratio < 0.75) return '#f59e0b'
    return '#ef4444'
}

// Individual wheel component
const Wheel: React.FC<{
    position: [number, number, number]
    rpm: number
    temp: number
    isSelected: boolean
    isHovered: boolean
    onSelect: () => void
    onHover: (hover: boolean) => void
}> = ({ position, rpm, temp, isSelected, isHovered, onSelect, onHover }) => {
    const wheelRef = useRef<THREE.Group>(null)

    useFrame((_, delta) => {
        if (wheelRef.current) {
            // Rotate based on RPM (simplified)
            wheelRef.current.rotation.x += (rpm / 1000) * delta * 2
        }
    })

    const color = getTempColor(temp, 60, 120)
    const scale = isHovered ? 1.05 : 1

    return (
        <group
            ref={wheelRef}
            position={position}
            scale={scale}
            onClick={(e) => { e.stopPropagation(); onSelect() }}
            onPointerEnter={(e) => { e.stopPropagation(); onHover(true) }}
            onPointerLeave={() => onHover(false)}
        >
            {/* Tire */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.28, 0.28, 0.2, 24]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
            </mesh>
            {/* Rim */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.18, 0.18, 0.15, 8]} />
                <meshStandardMaterial
                    color={isSelected ? '#00d4ff' : color}
                    metalness={0.8}
                    roughness={0.2}
                    emissive={isSelected ? '#00d4ff' : '#000'}
                    emissiveIntensity={isSelected ? 0.3 : 0}
                />
            </mesh>
            {/* Brake disc glow */}
            <mesh rotation={[0, 0, Math.PI / 2]} position={[0.08, 0, 0]}>
                <cylinderGeometry args={[0.15, 0.15, 0.02, 16]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={temp > 80 ? 0.5 : 0.1}
                />
            </mesh>
        </group>
    )
}


// Main chassis frame - BP16 Style Tubular Space Frame
const ChassisFrame: React.FC<{
    isSelected: boolean
    isHovered: boolean
    onSelect: () => void
    onHover: (hover: boolean) => void
}> = ({ isSelected, isHovered, onSelect, onHover }) => {
    const frameColor = '#f97316' // BP16 Orange
    const highlightColor = isSelected ? '#00d4ff' : (isHovered ? '#fbbf24' : frameColor)
    const tubeRadius = 0.018

    return (
        <group
            onClick={(e) => { e.stopPropagation(); onSelect() }}
            onPointerEnter={(e) => { e.stopPropagation(); onHover(true) }}
            onPointerLeave={() => onHover(false)}
        >
            {/* Main Roll Hoop */}
            <mesh position={[0, 0.55, -0.25]} rotation={[0, 0, 0]}>
                <torusGeometry args={[0.38, tubeRadius, 8, 24, Math.PI]} />
                <meshStandardMaterial color={highlightColor} metalness={0.5} roughness={0.5} />
            </mesh>

            {/* Main Roll Hoop Vertical Supports */}
            {[-0.38, 0.38].map((x, i) => (
                <mesh key={`mh-support-${i}`} position={[x, 0.28, -0.25]} rotation={[0, 0, 0]}>
                    <cylinderGeometry args={[tubeRadius, tubeRadius, 0.55, 8]} />
                    <meshStandardMaterial color={highlightColor} metalness={0.5} roughness={0.5} />
                </mesh>
            ))}

            {/* Main Roll Hoop Diagonal Braces */}
            {[-1, 1].map((sign, i) => (
                <mesh key={`mh-brace-${i}`} position={[sign * 0.2, 0.45, -0.15]} rotation={[0.3, 0, sign * 0.5]}>
                    <cylinderGeometry args={[tubeRadius * 0.8, tubeRadius * 0.8, 0.5, 6]} />
                    <meshStandardMaterial color={highlightColor} metalness={0.5} roughness={0.5} />
                </mesh>
            ))}

            {/* Front Roll Hoop */}
            <mesh position={[0, 0.38, 0.55]} rotation={[0, 0, 0]}>
                <torusGeometry args={[0.28, tubeRadius * 0.9, 8, 20, Math.PI]} />
                <meshStandardMaterial color={highlightColor} metalness={0.5} roughness={0.5} />
            </mesh>

            {/* Front Roll Hoop Supports */}
            {[-0.28, 0.28].map((x, i) => (
                <mesh key={`fh-support-${i}`} position={[x, 0.2, 0.55]} rotation={[0, 0, 0]}>
                    <cylinderGeometry args={[tubeRadius * 0.9, tubeRadius * 0.9, 0.38, 8]} />
                    <meshStandardMaterial color={highlightColor} metalness={0.5} roughness={0.5} />
                </mesh>
            ))}

            {/* Side Impact Structure - Left */}
            <mesh position={[-0.38, 0.18, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[tubeRadius, tubeRadius, 1.3, 8]} />
                <meshStandardMaterial color={highlightColor} metalness={0.5} roughness={0.5} />
            </mesh>
            {/* Side Impact Structure - Right */}
            <mesh position={[0.38, 0.18, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[tubeRadius, tubeRadius, 1.3, 8]} />
                <meshStandardMaterial color={highlightColor} metalness={0.5} roughness={0.5} />
            </mesh>

            {/* Lower Side Rails */}
            {[-0.35, 0.35].map((x, i) => (
                <mesh key={`lower-rail-${i}`} position={[x, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[tubeRadius, tubeRadius, 1.6, 8]} />
                    <meshStandardMaterial color={highlightColor} metalness={0.5} roughness={0.5} />
                </mesh>
            ))}

            {/* Triangulated Cross Braces */}
            {[[-0.35, 0.35, 0.3], [0.35, -0.35, 0.3], [-0.35, 0.35, -0.3], [0.35, -0.35, -0.3]].map(([x1, x2, z], i) => (
                <mesh key={`cross-${i}`} position={[(x1 + x2) / 2, 0.12, z]} rotation={[0, 0, Math.atan2(0, x2 - x1)]}>
                    <cylinderGeometry args={[tubeRadius * 0.7, tubeRadius * 0.7, 0.7, 6]} />
                    <meshStandardMaterial color={highlightColor} metalness={0.5} roughness={0.5} />
                </mesh>
            ))}

            {/* Rear Subframe Rails */}
            {[-0.3, 0.3].map((x, i) => (
                <mesh key={`rear-rail-${i}`} position={[x, 0.12, -0.7]} rotation={[0.2, 0, 0]}>
                    <cylinderGeometry args={[tubeRadius, tubeRadius, 0.5, 8]} />
                    <meshStandardMaterial color={highlightColor} metalness={0.5} roughness={0.5} />
                </mesh>
            ))}

            {/* Floor Pan - Carbon fiber look */}
            <mesh position={[0, 0.04, 0.05]}>
                <boxGeometry args={[0.68, 0.015, 1.5]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.6} />
            </mesh>

            {/* Cockpit Side Panels */}
            {[-0.34, 0.34].map((x, i) => (
                <mesh key={`cockpit-${i}`} position={[x, 0.2, 0.15]}>
                    <boxGeometry args={[0.02, 0.25, 0.6]} />
                    <meshStandardMaterial color="#2a2a2a" metalness={0.3} roughness={0.7} />
                </mesh>
            ))}
        </group>
    )
}

// Battery pack
const BatteryPack: React.FC<{
    soc: number
    temp: number
    status: string
    isSelected: boolean
    isHovered: boolean
    onSelect: () => void
    onHover: (hover: boolean) => void
}> = ({ soc, status, isSelected, isHovered, onSelect, onHover }) => {
    const color = getStatusColor(status)
    const scale = isHovered ? 1.02 : 1

    return (
        <group
            position={[0, 0.15, -0.1]}
            scale={scale}
            onClick={(e) => { e.stopPropagation(); onSelect() }}
            onPointerEnter={(e) => { e.stopPropagation(); onHover(true) }}
            onPointerLeave={() => onHover(false)}
        >
            {/* Main battery box */}
            <mesh>
                <boxGeometry args={[0.5, 0.18, 0.8]} />
                <meshStandardMaterial
                    color={isSelected ? '#00d4ff' : '#1e293b'}
                    metalness={0.5}
                    roughness={0.4}
                    emissive={isSelected ? '#00d4ff' : color}
                    emissiveIntensity={isSelected ? 0.3 : 0.1}
                />
            </mesh>

            {/* SOC indicator bar */}
            <mesh position={[0, 0.1, 0]}>
                <boxGeometry args={[0.48 * (soc / 100), 0.02, 0.05]} />
                <meshStandardMaterial
                    color={soc > 30 ? '#10b981' : soc > 15 ? '#f59e0b' : '#ef4444'}
                    emissive={soc > 30 ? '#10b981' : soc > 15 ? '#f59e0b' : '#ef4444'}
                    emissiveIntensity={0.5}
                />
            </mesh>

            {/* Cooling fins */}
            {[-0.15, 0, 0.15].map((z, i) => (
                <mesh key={i} position={[0.26, 0, z]}>
                    <boxGeometry args={[0.01, 0.15, 0.08]} />
                    <meshStandardMaterial color="#374151" />
                </mesh>
            ))}
        </group>
    )
}

// Motor/Powertrain
const Powertrain: React.FC<{
    rpm: number
    power: number
    temp: number
    status: string
    isSelected: boolean
    isHovered: boolean
    onSelect: () => void
    onHover: (hover: boolean) => void
}> = ({ rpm, power: _power, temp, status, isSelected, isHovered: _isHovered, onSelect, onHover }) => {
    const motorRef = useRef<THREE.Mesh>(null)
    const color = getStatusColor(status)

    useFrame((_, delta) => {
        if (motorRef.current) {
            // Visual rotation effect
            motorRef.current.rotation.z += (rpm / 5000) * delta
        }
    })

    return (
        <group
            position={[0, 0.18, -0.7]}
            onClick={(e) => { e.stopPropagation(); onSelect() }}
            onPointerEnter={(e) => { e.stopPropagation(); onHover(true) }}
            onPointerLeave={() => onHover(false)}
        >
            {/* Motor housing */}
            <mesh ref={motorRef} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.12, 0.12, 0.25, 16]} />
                <meshStandardMaterial
                    color={isSelected ? '#00d4ff' : '#374151'}
                    metalness={0.8}
                    roughness={0.2}
                    emissive={isSelected ? '#00d4ff' : color}
                    emissiveIntensity={isSelected ? 0.4 : (temp > 80 ? 0.3 : 0.1)}
                />
            </mesh>

            {/* Inverter */}
            <mesh position={[0.2, 0.05, 0.1]}>
                <boxGeometry args={[0.12, 0.1, 0.15]} />
                <meshStandardMaterial
                    color="#1e293b"
                    metalness={0.6}
                    emissive={color}
                    emissiveIntensity={0.2}
                />
            </mesh>

            {/* Cooling pipes */}
            <mesh position={[-0.15, -0.05, 0]} rotation={[0, 0, Math.PI / 4]}>
                <cylinderGeometry args={[0.015, 0.015, 0.2, 8]} />
                <meshStandardMaterial color="#3b82f6" metalness={0.4} />
            </mesh>
        </group>
    )
}

// Aerodynamic bodywork - BP16 Carbon Fiber Style
const Aero: React.FC<{
    type: 'front' | 'rear'
    isSelected: boolean
    isHovered: boolean
    onSelect: () => void
    onHover: (hover: boolean) => void
}> = ({ type, isSelected, isHovered, onSelect, onHover }) => {
    const scale = isHovered ? 1.02 : 1
    // Carbon fiber appearance
    const carbonColor = '#1a1a1a'
    const carbonMetalness = 0.35
    const carbonRoughness = 0.55

    if (type === 'front') {
        return (
            <group
                position={[0, 0.08, 1.15]}
                scale={scale}
                onClick={(e) => { e.stopPropagation(); onSelect() }}
                onPointerEnter={(e) => { e.stopPropagation(); onHover(true) }}
                onPointerLeave={() => onHover(false)}
            >
                {/* Main Nose Cone - Carbon fiber monocoque */}
                <mesh rotation={[Math.PI / 2 - 0.1, 0, 0]}>
                    <coneGeometry args={[0.28, 0.7, 12]} />
                    <meshStandardMaterial
                        color={isSelected ? '#00d4ff' : carbonColor}
                        metalness={carbonMetalness}
                        roughness={carbonRoughness}
                        emissive={isSelected ? '#00d4ff' : '#000'}
                        emissiveIntensity={isSelected ? 0.3 : 0}
                    />
                </mesh>

                {/* Nose Cone Tip */}
                <mesh position={[0, 0, 0.55]} rotation={[Math.PI / 2, 0, 0]}>
                    <coneGeometry args={[0.08, 0.25, 8]} />
                    <meshStandardMaterial color={carbonColor} metalness={carbonMetalness} roughness={carbonRoughness} />
                </mesh>

                {/* Front Wing Main Plane */}
                <mesh position={[0, -0.06, 0.15]}>
                    <boxGeometry args={[0.9, 0.015, 0.18]} />
                    <meshStandardMaterial color={carbonColor} metalness={carbonMetalness} roughness={carbonRoughness} />
                </mesh>

                {/* Front Wing Flaps */}
                <mesh position={[0, -0.03, 0.25]} rotation={[-0.15, 0, 0]}>
                    <boxGeometry args={[0.85, 0.012, 0.08]} />
                    <meshStandardMaterial color={carbonColor} metalness={carbonMetalness} roughness={carbonRoughness} />
                </mesh>

                {/* Front Wing Endplates */}
                {[-0.45, 0.45].map((x, i) => (
                    <mesh key={`fw-ep-${i}`} position={[x, -0.04, 0.2]}>
                        <boxGeometry args={[0.015, 0.1, 0.2]} />
                        <meshStandardMaterial color={carbonColor} metalness={carbonMetalness} roughness={carbonRoughness} />
                    </mesh>
                ))}
            </group>
        )
    }

    // Rear aero - BP16 style rear bodywork
    return (
        <group
            position={[0, 0.08, -1.15]}
            scale={scale}
            onClick={(e) => { e.stopPropagation(); onSelect() }}
            onPointerEnter={(e) => { e.stopPropagation(); onHover(true) }}
            onPointerLeave={() => onHover(false)}
        >
            {/* Rear Bodywork / Diffuser Housing */}
            <mesh rotation={[-Math.PI / 2 + 0.15, 0, 0]}>
                <coneGeometry args={[0.32, 0.6, 10]} />
                <meshStandardMaterial
                    color={isSelected ? '#00d4ff' : carbonColor}
                    metalness={carbonMetalness}
                    roughness={carbonRoughness}
                    emissive={isSelected ? '#00d4ff' : '#000'}
                    emissiveIntensity={isSelected ? 0.3 : 0}
                />
            </mesh>

            {/* Rear Wing Main Plane */}
            <mesh position={[0, 0.42, 0.05]}>
                <boxGeometry args={[0.75, 0.018, 0.14]} />
                <meshStandardMaterial color={carbonColor} metalness={carbonMetalness} roughness={carbonRoughness} />
            </mesh>

            {/* Rear Wing Upper Flap */}
            <mesh position={[0, 0.48, 0]} rotation={[-0.2, 0, 0]}>
                <boxGeometry args={[0.7, 0.012, 0.1]} />
                <meshStandardMaterial color={carbonColor} metalness={carbonMetalness} roughness={carbonRoughness} />
            </mesh>

            {/* Rear Wing Endplates */}
            {[-0.38, 0.38].map((x, i) => (
                <mesh key={`rw-ep-${i}`} position={[x, 0.38, 0.02]}>
                    <boxGeometry args={[0.018, 0.2, 0.18]} />
                    <meshStandardMaterial color={carbonColor} metalness={carbonMetalness} roughness={carbonRoughness} />
                </mesh>
            ))}

            {/* Wing Supports */}
            {[-0.2, 0.2].map((x, i) => (
                <mesh key={`wing-support-${i}`} position={[x, 0.25, -0.05]} rotation={[0.1, 0, 0]}>
                    <cylinderGeometry args={[0.012, 0.012, 0.35, 6]} />
                    <meshStandardMaterial color={carbonColor} metalness={0.5} roughness={0.4} />
                </mesh>
            ))}
        </group>
    )
}

// Sidepod - BP16 Style with radiator inlets
const Sidepod: React.FC<{
    side: 'left' | 'right'
}> = ({ side }) => {
    const xPos = side === 'left' ? -0.42 : 0.42
    const carbonColor = '#1a1a1a'

    return (
        <group position={[xPos, 0.14, -0.15]}>
            {/* Main Sidepod Body */}
            <mesh>
                <boxGeometry args={[0.12, 0.22, 0.7]} />
                <meshStandardMaterial color={carbonColor} metalness={0.35} roughness={0.55} />
            </mesh>

            {/* Radiator Inlet Opening */}
            <mesh position={[0, 0.02, 0.32]}>
                <boxGeometry args={[0.08, 0.12, 0.08]} />
                <meshStandardMaterial color="#0a0a0a" metalness={0.2} roughness={0.8} />
            </mesh>

            {/* Sidepod Undercut */}
            <mesh position={[0, -0.08, 0.1]} rotation={[0.15, 0, 0]}>
                <boxGeometry args={[0.11, 0.05, 0.45]} />
                <meshStandardMaterial color="#0f0f0f" metalness={0.3} roughness={0.6} />
            </mesh>
        </group>
    )
}

const SuspensionArm: React.FC<{
    start: [number, number, number]
    end: [number, number, number]
    color: string
}> = ({ start, end, color }) => {
    // Safety check for identical points to prevent NaN
    if (Math.abs(start[0] - end[0]) < 0.001 &&
        Math.abs(start[1] - end[1]) < 0.001 &&
        Math.abs(start[2] - end[2]) < 0.001) return null

    const startVec = new THREE.Vector3(...start)
    const endVec = new THREE.Vector3(...end)
    const direction = new THREE.Vector3().subVectors(endVec, startVec)
    const length = direction.length()

    if (length < 0.001) return null

    // Midpoint
    const position = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5)

    // Create a cylinder that points from start to end
    // Default cylinder is aligned with Y axis.
    // We can use lookAt, but we need to rotate it 90 deg along X because lookAt typically points Z.
    // EASIER WAY: Use a Group to rotate the cylinder, then lookAt with the Group.
    // Or just use quaternion setFromUnitVectors but with a fallback up vector?

    // Safer approach: Use lookAt then rotate x 90 deg.
    // Since R3F / Three objects look down -Z by default, and cylinder is Y-aligned...
    // Let's stick to quaternion but with a fallback for the parallel case which handles the anti-parallel issue.

    const quaternion = new THREE.Quaternion()
    try {
        const up = new THREE.Vector3(0, 1, 0)
        // Check for edge case where direction is parallel/antiparallel to Up
        if (Math.abs(direction.clone().normalize().dot(up)) > 0.99) {
            // Use a different up vector creates stable rotation
            quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
        } else {
            quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
        }
    } catch (e) {
        return null
    }

    return (
        <mesh position={position} quaternion={quaternion}>
            <cylinderGeometry args={[0.012, 0.012, length, 6]} />
            <meshStandardMaterial color={color} metalness={0.4} roughness={0.6} />
        </mesh>
    )
}


// Suspension Assembly - Double Wishbone
const SuspensionAssembly: React.FC<{
    position: [number, number, number]
    side: 'left' | 'right'
    isFront: boolean
    isSelected: boolean
    isHovered: boolean
    onSelect: () => void
    onHover: (hover: boolean) => void
}> = ({ position, side, isFront, isSelected, isHovered, onSelect, onHover }) => {
    const chassisMountX = side === 'left' ? -0.25 : 0.25
    const chassisMountZ = isFront ? 0.55 : -0.55

    // Relative position from wheel to chassis
    // position is the WHEEL position. We need to draw arms back to the chassis (0,0,0ish)
    // We render this relative to the WHEEL or absolute?
    // Let's render absolute, but using the passed wheel position as the end point

    // Simplified: Render a group at chassis mount, pointing to wheel
    const wheelX = position[0]
    const wheelY = position[1]
    const wheelZ = position[2]

    const color = isSelected ? '#00d4ff' : (isHovered ? '#fbbf24' : '#374151')

    return (
        <group
            onClick={(e) => { e.stopPropagation(); onSelect() }}
            onPointerEnter={(e) => { e.stopPropagation(); onHover(true) }}
            onPointerLeave={() => onHover(false)}
        >
            {/* Upper A-Arm */}
            <SuspensionArm
                start={[chassisMountX, 0.35, chassisMountZ + 0.1]}
                end={[wheelX, wheelY + 0.1, wheelZ]}
                color={color}
            />
            <SuspensionArm
                start={[chassisMountX, 0.35, chassisMountZ - 0.1]}
                end={[wheelX, wheelY + 0.1, wheelZ]}
                color={color}
            />

            {/* Lower A-Arm */}
            <SuspensionArm
                start={[chassisMountX, 0.15, chassisMountZ + 0.15]}
                end={[wheelX, wheelY - 0.1, wheelZ]}
                color={color}
            />
            <SuspensionArm
                start={[chassisMountX, 0.15, chassisMountZ - 0.15]}
                end={[wheelX, wheelY - 0.1, wheelZ]}
                color={color}
            />

            {/* Pushrod / Damper */}
            <SuspensionArm
                start={[chassisMountX, 0.45, chassisMountZ]}
                end={[wheelX, wheelY, wheelZ]}
                color="#9ca3af" // Siver for pushrod
            />

            {/* Upright */}
            <mesh position={[wheelX, wheelY, wheelZ]}>
                <boxGeometry args={[0.05, 0.25, 0.15]} />
                <meshStandardMaterial color="#1f2937" metalness={0.8} />
            </mesh>
        </group>
    )

}


// Main FormulaCar3D Component
export const FormulaCar3D: React.FC<FormulaCar3DProps> = ({
    telemetry,
    selectedComponent,
    onSelectComponent,
    hoverComponent,
    onHoverComponent
}) => {
    const groupRef = useRef<THREE.Group>(null)

    // Helper to sanitize numbers
    const safeNum = (val: any, fallback: number) => {
        const num = Number(val)
        return Number.isFinite(num) ? num : fallback
    }

    // Extract telemetry with robust defaults
    const motorRpm = safeNum(telemetry?.motor?.rpm, 0)
    const motorTemp = safeNum(telemetry?.motor?.temperature, 60)
    const motorPower = safeNum(telemetry?.motor?.power_kw, 0)
    const motorStatus = telemetry?.motor?.status || 'optimal'

    const batterySoc = safeNum(telemetry?.battery?.soc, 80)
    const batteryTemp = safeNum(telemetry?.battery?.temperature, 35)
    // const batteryStatus = telemetry?.battery?.status || 'optimal' // Unused

    const tireTemps = {
        fl: safeNum(telemetry?.tires?.front_left?.temp, 85),
        fr: safeNum(telemetry?.tires?.front_right?.temp, 85),
        rl: safeNum(telemetry?.tires?.rear_left?.temp, 82),
        rr: safeNum(telemetry?.tires?.rear_right?.temp, 82)
    }

    // Safely access nested suspension travel
    const st = telemetry?.chassis?.suspension_travel
    const suspensionTravel = {
        fl: safeNum(st?.fl, 10),
        fr: safeNum(st?.fr, 10),
        rl: safeNum(st?.rl, 12),
        rr: safeNum(st?.rr, 12)
    }

    // Wheel positions with suspension travel - Safe calculation
    const wheelPositions: { [key: string]: [number, number, number] } = {
        fl: [-0.55, 0.28 - (suspensionTravel.fl - 10) * 0.005, 0.75],
        fr: [0.55, 0.28 - (suspensionTravel.fr - 10) * 0.005, 0.75],
        rl: [-0.55, 0.28 - (suspensionTravel.rl - 12) * 0.005, -0.75],
        rr: [0.55, 0.28 - (suspensionTravel.rr - 12) * 0.005, -0.75]
    }

    // Verify positions are not NaN
    Object.keys(wheelPositions).forEach(k => {
        const pos = wheelPositions[k]
        if (pos.some(v => !Number.isFinite(v))) {
            // Fallback if calculation failed
            if (k.includes('f')) wheelPositions[k] = [k.includes('l') ? -0.55 : 0.55, 0.28, 0.75]
            else wheelPositions[k] = [k.includes('l') ? -0.55 : 0.55, 0.28, -0.75]
        }
    })

    return (
        <group ref={groupRef}>
            {/* Chassis Frame */}
            <ChassisFrame
                isSelected={selectedComponent === 'chassis'}
                isHovered={hoverComponent === 'chassis'}
                onSelect={() => onSelectComponent('chassis')}
                onHover={(hover) => onHoverComponent(hover ? 'chassis' : null)}
            />

            {/* Battery Pack */}
            <BatteryPack
                soc={batterySoc}
                temp={batteryTemp}
                status={telemetry?.battery?.status || 'optimal'}
                isSelected={selectedComponent === 'battery'}
                isHovered={hoverComponent === 'battery'}
                onSelect={() => onSelectComponent('battery')}
                onHover={(hover) => onHoverComponent(hover ? 'battery' : null)}
            />

            {/* Powertrain */}
            <Powertrain
                rpm={motorRpm}
                power={motorPower}
                temp={motorTemp}
                status={motorStatus}
                isSelected={selectedComponent === 'powertrain'}
                isHovered={hoverComponent === 'powertrain'}
                onSelect={() => onSelectComponent('powertrain')}
                onHover={(hover) => onHoverComponent(hover ? 'powertrain' : null)}
            />

            {/* Aero - Front */}
            <Aero
                type="front"
                isSelected={selectedComponent === 'aero_front'}
                isHovered={hoverComponent === 'aero_front'}
                onSelect={() => onSelectComponent('aero_front')}
                onHover={(hover) => onHoverComponent(hover ? 'aero_front' : null)}
            />

            {/* Aero - Rear */}
            <Aero
                type="rear"
                isSelected={selectedComponent === 'aero_rear'}
                isHovered={hoverComponent === 'aero_rear'}
                onSelect={() => onSelectComponent('aero_rear')}
                onHover={(hover) => onHoverComponent(hover ? 'aero_rear' : null)}
            />

            {/* Sidepods */}
            <Sidepod side="left" />
            <Sidepod side="right" />

            {/* Sidepods */}
            <Sidepod side="left" />
            <Sidepod side="right" />

            {/* Suspension Systems */}
            <SuspensionAssembly
                position={wheelPositions.fl} // Connects to wheel
                side="left"
                isFront={true}
                isSelected={selectedComponent === 'suspension_fl'}
                isHovered={hoverComponent === 'suspension_fl'}
                onSelect={() => onSelectComponent('suspension_fl')}
                onHover={(hover) => onHoverComponent(hover ? 'suspension_fl' : null)}
            />
            <SuspensionAssembly
                position={wheelPositions.fr}
                side="right"
                isFront={true}
                isSelected={selectedComponent === 'suspension_fr'}
                isHovered={hoverComponent === 'suspension_fr'}
                onSelect={() => onSelectComponent('suspension_fr')}
                onHover={(hover) => onHoverComponent(hover ? 'suspension_fr' : null)}
            />
            <SuspensionAssembly
                position={wheelPositions.rl}
                side="left"
                isFront={false}
                isSelected={selectedComponent === 'suspension_rl'}
                isHovered={hoverComponent === 'suspension_rl'}
                onSelect={() => onSelectComponent('suspension_rl')}
                onHover={(hover) => onHoverComponent(hover ? 'suspension_rl' : null)}
            />
            <SuspensionAssembly
                position={wheelPositions.rr}
                side="right"
                isFront={false}
                isSelected={selectedComponent === 'suspension_rr'}
                isHovered={hoverComponent === 'suspension_rr'}
                onSelect={() => onSelectComponent('suspension_rr')}
                onHover={(hover) => onHoverComponent(hover ? 'suspension_rr' : null)}
            />

            {/* Wheels */}
            <Wheel
                position={wheelPositions.fl}
                rpm={motorRpm}
                temp={tireTemps.fl}
                isSelected={selectedComponent === 'wheel_fl'}
                isHovered={hoverComponent === 'wheel_fl'}
                onSelect={() => onSelectComponent('wheel_fl')}
                onHover={(hover) => onHoverComponent(hover ? 'wheel_fl' : null)}
            />
            <Wheel
                position={wheelPositions.fr}
                rpm={motorRpm}
                temp={tireTemps.fr}
                isSelected={selectedComponent === 'wheel_fr'}
                isHovered={hoverComponent === 'wheel_fr'}
                onSelect={() => onSelectComponent('wheel_fr')}
                onHover={(hover) => onHoverComponent(hover ? 'wheel_fr' : null)}
            />
            <Wheel
                position={wheelPositions.rl}
                rpm={motorRpm}
                temp={tireTemps.rl}
                isSelected={selectedComponent === 'wheel_rl'}
                isHovered={hoverComponent === 'wheel_rl'}
                onSelect={() => onSelectComponent('wheel_rl')}
                onHover={(hover) => onHoverComponent(hover ? 'wheel_rl' : null)}
            />
            <Wheel
                position={wheelPositions.rr}
                rpm={motorRpm}
                temp={tireTemps.rr}
                isSelected={selectedComponent === 'wheel_rr'}
                isHovered={hoverComponent === 'wheel_rr'}
                onSelect={() => onSelectComponent('wheel_rr')}
                onHover={(hover) => onHoverComponent(hover ? 'wheel_rr' : null)}
            />
        </group>
    )
}

export default FormulaCar3D
