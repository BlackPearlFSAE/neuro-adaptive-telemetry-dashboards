import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Types
export interface Point {
    x: number
    y: number
}

export interface Sector {
    name: string
    start: number
    end: number
    color: string
}

export interface TrackMetrics {
    lengthM: number
    cornerCount: number
    avgCornerRadius: number
    straightPercentage: number
}

export interface CircuitData {
    id: string
    name: string
    svgPath: string
    waypoints: Point[]
    trackPoints: { x: number; y: number; sector: number }[]
    sectors: Sector[]
    metrics: TrackMetrics
    imageData?: string
    viewbox: string
}

interface CircuitContextType {
    activeCircuit: CircuitData | null
    circuits: { id: string; name: string; isActive: boolean }[]
    isLoading: boolean
    analysisProgress: string
    error: string | null
    uploadAndAnalyze: (file: File, name?: string) => Promise<CircuitData | null>
    activateCircuit: (circuitId: string) => Promise<boolean>
    refreshCircuits: () => Promise<void>
}

const CircuitContext = createContext<CircuitContextType | null>(null)

// Default Silverstone circuit (fallback when backend unavailable)
const DEFAULT_SILVERSTONE: CircuitData = {
    id: 'silverstone',
    name: 'Silverstone',
    svgPath: `M 180 200 
        L 220 180 Q 250 170 280 175 
        L 350 195 Q 380 200 400 220 
        L 420 260 Q 430 290 420 320 
        L 400 350 Q 380 370 350 375 
        L 280 365 Q 250 360 230 340 
        L 200 300 Q 180 270 175 240 
        Z`,
    waypoints: [],
    trackPoints: [
        { x: 180, y: 200, sector: 1 }, { x: 200, y: 188, sector: 1 },
        { x: 230, y: 178, sector: 1 }, { x: 270, y: 177, sector: 1 },
        { x: 310, y: 185, sector: 1 }, { x: 350, y: 197, sector: 2 },
        { x: 385, y: 212, sector: 2 }, { x: 408, y: 235, sector: 2 },
        { x: 420, y: 265, sector: 2 }, { x: 425, y: 300, sector: 2 },
        { x: 415, y: 330, sector: 3 }, { x: 395, y: 355, sector: 3 },
        { x: 365, y: 370, sector: 3 }, { x: 325, y: 370, sector: 3 },
        { x: 285, y: 362, sector: 3 }, { x: 250, y: 350, sector: 1 },
        { x: 220, y: 325, sector: 1 }, { x: 200, y: 290, sector: 1 },
        { x: 180, y: 250, sector: 1 }, { x: 175, y: 220, sector: 1 },
    ],
    sectors: [
        { name: 'Sector 1', start: 0, end: 0.33, color: '#a855f7' },
        { name: 'Sector 2', start: 0.33, end: 0.66, color: '#22d3ee' },
        { name: 'Sector 3', start: 0.66, end: 1, color: '#4ade80' },
    ],
    metrics: {
        lengthM: 5891,
        cornerCount: 18,
        avgCornerRadius: 85,
        straightPercentage: 0.35
    },
    viewbox: '130 130 340 280'
}

export const CircuitProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [activeCircuit, setActiveCircuit] = useState<CircuitData | null>(DEFAULT_SILVERSTONE)
    const [circuits, setCircuits] = useState<{ id: string; name: string; isActive: boolean }[]>([
        { id: 'silverstone', name: 'Silverstone', isActive: true }
    ])
    const [isLoading, setIsLoading] = useState(false)
    const [analysisProgress, setAnalysisProgress] = useState('')
    const [error, setError] = useState<string | null>(null)

    // Fetch active circuit and list on mount
    useEffect(() => {
        refreshCircuits()
        fetchActiveCircuit()
    }, [])

    const fetchActiveCircuit = async () => {
        try {
            const res = await fetch('/api/circuit/active')
            if (res.ok) {
                const data = await res.json()
                if (!data.error) {
                    setActiveCircuit(data)
                }
            }
        } catch {
            // Use default Silverstone
            console.log('Using default Silverstone circuit')
        }
    }

    const refreshCircuits = async () => {
        try {
            const res = await fetch('/api/circuit/list')
            if (res.ok) {
                const data = await res.json()
                setCircuits(data.circuits || [])
            }
        } catch {
            // Keep current list
        }
    }

    const uploadAndAnalyze = async (file: File, name?: string): Promise<CircuitData | null> => {
        setIsLoading(true)
        setError(null)
        setAnalysisProgress('Uploading image...')

        try {
            const formData = new FormData()
            formData.append('file', file)
            if (name) {
                formData.append('name', name)
            }

            setAnalysisProgress('Analyzing track contours...')
            await new Promise(r => setTimeout(r, 500)) // Brief display

            const res = await fetch('/api/circuit/analyze', {
                method: 'POST',
                body: formData
            })

            setAnalysisProgress('Extracting waypoints...')

            if (!res.ok) {
                throw new Error(`Analysis failed: ${res.statusText}`)
            }

            const data = await res.json()

            setAnalysisProgress('Generating path data...')
            await new Promise(r => setTimeout(r, 300))

            if (data.success && data.circuit) {
                await refreshCircuits()
                setAnalysisProgress('Analysis complete!')
                return data.circuit as CircuitData
            }
            throw new Error('Invalid response from server')
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Upload failed'
            setError(message)
            setAnalysisProgress('')
            return null
        } finally {
            setIsLoading(false)
        }
    }

    const activateCircuit = async (circuitId: string): Promise<boolean> => {
        setIsLoading(true)
        setError(null)
        setAnalysisProgress('Activating circuit...')

        try {
            const res = await fetch(`/api/circuit/activate/${circuitId}`, {
                method: 'POST'
            })

            if (!res.ok) {
                throw new Error(`Activation failed: ${res.statusText}`)
            }

            const data = await res.json()
            if (data.success && data.circuit) {
                setActiveCircuit(data.circuit)
                await refreshCircuits()
                setAnalysisProgress(data.autonomousUpdated ? 'Circuit activated! Waypoints synced to Autonomous.' : 'Circuit activated!')
                return true
            }
            throw new Error(data.error || 'Activation failed')
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Activation failed'
            setError(message)
            setAnalysisProgress('')
            return false
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <CircuitContext.Provider value={{
            activeCircuit,
            circuits,
            isLoading,
            analysisProgress,
            error,
            uploadAndAnalyze,
            activateCircuit,
            refreshCircuits
        }}>
            {children}
        </CircuitContext.Provider>
    )
}

export const useCircuit = () => {
    const context = useContext(CircuitContext)
    if (!context) {
        throw new Error('useCircuit must be used within a CircuitProvider')
    }
    return context
}

export default CircuitContext
