import React from 'react'

export const EnergyStrategyWidget: React.FC = () => {
    // Simulated prediction data
    const lapCount = 20
    const currentLap = 12
    const history = Array.from({ length: currentLap }, (_, i) => 100 - (i * 3.5)) // past consumption
    const prediction = Array.from({ length: lapCount - currentLap + 1 }, (_, i) => 100 - ((currentLap + i) * 3.5)) // predictive

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span style={styles.icon}>⚡</span>
                <span style={styles.title}>ENERGY STRATEGY</span>
                <span style={styles.badge}>TARGET: +2.5%</span>
            </div>

            <div style={styles.chartContainer}>
                {/* Simple visualization using bars for now, could be SVG line chart */}
                <div style={styles.graph}>
                    {/* Y-axis lines */}
                    <div style={{ ...styles.gridLine, bottom: '25%' }} />
                    <div style={{ ...styles.gridLine, bottom: '50%' }} />
                    <div style={{ ...styles.gridLine, bottom: '75%' }} />

                    {/* Historical Usage */}
                    {history.map((soc, i) => (
                        <div key={`h-${i}`} style={{
                            ...styles.bar,
                            height: `${soc}%`,
                            left: `${(i / lapCount) * 100}%`,
                            background: 'linear-gradient(to top, #00d4ff, #00ff88)'
                        }} />
                    ))}

                    {/* Predicted Usage (Ghost bars) */}
                    {prediction.map((soc, i) => (
                        <div key={`p-${i}`} style={{
                            ...styles.bar,
                            height: `${soc}%`,
                            left: `${((currentLap + i) / lapCount) * 100}%`,
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderTop: '2px dashed #fbbf24'
                        }} />
                    ))}

                    {/* Target Line */}
                    <div style={styles.targetLine} />
                </div>
            </div>

            <div style={styles.metrics}>
                <div style={styles.metric}>
                    <span style={styles.label}>Cons/Lap</span>
                    <span style={styles.value}>3.5%</span>
                </div>
                <div style={styles.metric}>
                    <span style={styles.label}>Proj. Finish</span>
                    <span style={{ ...styles.value, color: '#fbbf24' }}>12%</span>
                </div>
                <div style={styles.metric}>
                    <span style={styles.label}>Mode Rec.</span>
                    <span style={{ ...styles.value, color: '#00ff88' }}>PUSH</span>
                </div>
            </div>
        </div>
    )
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        background: 'linear-gradient(135deg, rgba(13, 33, 55, 0.95) 0%, rgba(10, 22, 40, 0.98) 100%)',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        height: '240px',
        display: 'flex', flexDirection: 'column'
    },
    header: {
        display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px'
    },
    icon: { fontSize: '1.2rem' },
    title: {
        fontSize: '0.75rem', fontWeight: 700, color: '#fff', letterSpacing: '1px', flex: 1
    },
    badge: {
        fontSize: '0.65rem', fontWeight: 700, background: 'rgba(0, 255, 136, 0.2)',
        color: '#00ff88', padding: '4px 8px', borderRadius: '4px'
    },
    chartContainer: {
        flex: 1, position: 'relative', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)'
    },
    graph: {
        width: '100%', height: '100%', position: 'relative'
    },
    gridLine: {
        position: 'absolute', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.05)'
    },
    bar: {
        position: 'absolute', bottom: 0, width: '3%', borderRadius: '2px 2px 0 0', opacity: 0.8
    },
    targetLine: {
        position: 'absolute', top: 0, bottom: 0, right: '35%',
        borderRight: '1px dashed rgba(255, 255, 255, 0.3)'
    },
    metrics: {
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px'
    },
    metric: {
        display: 'flex', flexDirection: 'column', gap: '4px'
    },
    label: {
        fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)'
    },
    value: {
        fontSize: '1rem', fontWeight: 700, color: '#fff', fontFamily: 'monospace'
    }
}
