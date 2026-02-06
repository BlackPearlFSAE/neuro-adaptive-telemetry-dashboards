import React from 'react'

export const PowerUnitMonitor: React.FC = () => {
    // Mock Data for detailed BMS
    const cells = Array.from({ length: 96 }, (_, i) => ({
        id: i,
        v: 3.8 + Math.random() * 0.4, // 3.8 - 4.2V
        t: 35 + Math.random() * 5
    }))

    const inverter = {
        temp: 65,
        flow: 12.5, // L/min (coolant)
        pwm: 85, // %
        dc_current: 240 // A
    }

    const maxCellTemp = Math.max(...cells.map(c => c.t))
    const minCellV = Math.min(...cells.map(c => c.v))

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span style={styles.icon}>🔋</span>
                <span style={styles.title}>POWER UNIT MONITOR</span>
                <span style={styles.badge}>HV ISOLATION: OK</span>
            </div>

            <div style={styles.grid}>
                {/* BMS Section */}
                <div style={styles.section}>
                    <h4 style={styles.subTitle}>Accu Pack (96s2p)</h4>
                    <div style={styles.statGrid}>
                        <StatBox label="Min Cell V" value={minCellV.toFixed(3)} unit="V" status={minCellV < 3.2 ? 'crit' : 'ok'} />
                        <StatBox label="Max Cell T" value={maxCellTemp.toFixed(1)} unit="°C" status={maxCellTemp > 55 ? 'warn' : 'ok'} />
                        <StatBox label="Pack Voltage" value="405.2" unit="V" status="ok" />
                        <StatBox label="Current" value="-125.4" unit="A" status="ok" />
                    </div>
                    {/* Visual Cell Map (Mini) */}
                    <div style={styles.cellMap}>
                        {cells.map(c => (
                            <div key={c.id} style={{
                                width: '3px', height: '8px',
                                background: c.v < 3.6 ? '#ff4757' : '#00ff88',
                                opacity: 0.7
                            }} />
                        ))}
                    </div>
                </div>

                {/* Inverter Section */}
                <div style={styles.section}>
                    <h4 style={styles.subTitle}>Inverter / Motor</h4>
                    <div style={styles.statGrid}>
                        <StatBox label="IGBT Temp" value={inverter.temp.toFixed(1)} unit="°C" status="ok" />
                        <StatBox label="DC Link" value={inverter.dc_current.toFixed(1)} unit="A" status="ok" />
                        <StatBox label="Duty Cycle" value={inverter.pwm.toFixed(0)} unit="%" status="ok" />
                        <StatBox label="Coolant Flow" value={inverter.flow.toFixed(1)} unit="L/m" status="ok" />
                    </div>
                </div>
            </div>
        </div>
    )
}

const StatBox = ({ label, value, unit, status }: any) => (
    <div style={{ ...styles.statBox, borderColor: status === 'crit' ? '#ff4757' : status === 'warn' ? '#fbbf24' : 'rgba(255,255,255,0.1)' }}>
        <span style={styles.statLabel}>{label}</span>
        <div style={styles.statValueRow}>
            <span style={{ ...styles.statValue, color: status === 'crit' ? '#ff4757' : '#fff' }}>{value}</span>
            <span style={styles.statUnit}>{unit}</span>
        </div>
    </div>
)

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        background: 'rgba(13, 33, 55, 0.6)',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        borderRadius: '12px',
        padding: '16px',
        flex: 1,
        display: 'flex', flexDirection: 'column'
    },
    header: {
        display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px'
    },
    icon: { fontSize: '1.2rem' },
    title: { fontSize: '0.9rem', fontWeight: 700, color: '#fff', letterSpacing: '1px', flex: 1 },
    badge: { fontSize: '0.7rem', color: '#00ff88', border: '1px solid #00ff88', padding: '2px 6px', borderRadius: '4px' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
    section: { display: 'flex', flexDirection: 'column', gap: '10px' },
    subTitle: { fontSize: '0.8rem', color: '#00d4ff', textTransform: 'uppercase' },
    statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
    statBox: {
        background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', border: '1px solid',
        display: 'flex', flexDirection: 'column', gap: '4px'
    },
    statLabel: { fontSize: '0.65rem', color: '#888' },
    statValueRow: { display: 'flex', alignItems: 'baseline', gap: '4px' },
    statValue: { fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace' },
    statUnit: { fontSize: '0.7rem', color: '#aaa' },
    cellMap: {
        marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '2px',
        padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px'
    }
}
