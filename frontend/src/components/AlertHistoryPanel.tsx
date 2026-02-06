import React from 'react'

interface Alert {
    id: string
    level: 'info' | 'warning' | 'critical' | 'emergency'
    metric: string
    category: string
    message: string
    current_value: number
    threshold_value: number
    timestamp?: string // Assuming standard alerts might not have this, mock it
}

interface AlertHistoryPanelProps {
    alerts: Alert[] // Pass ALL alerts (active + historical if backend supported, for now using active)
}

export const AlertHistoryPanel: React.FC<AlertHistoryPanelProps> = ({ alerts }) => {
    // Mock history for demo (since we don't have a full backend history endpoint yet)
    const mockHistory = [
        { id: 'h1', level: 'info', metric: 'System', message: 'Session started', timestamp: '10:00:01' },
        { id: 'h2', level: 'warning', metric: 'Tires', message: 'Cold tires detected', timestamp: '10:02:15' },
        { id: 'h3', level: 'critical', metric: 'Brakes', message: 'Front-Left locking', timestamp: '10:05:30' },
        { id: 'h4', level: 'info', metric: 'Radio', message: 'Pit confirm needed', timestamp: '10:08:00' },
    ]

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span style={styles.icon}>📋</span>
                <span style={styles.title}>SYSTEM LOGS & ALERTS</span>
            </div>

            <div style={styles.list}>
                <div style={styles.listHeader}>
                    <span style={{ flex: 1 }}>Time</span>
                    <span style={{ flex: 1 }}>Level</span>
                    <span style={{ flex: 1 }}>System</span>
                    <span style={{ flex: 3 }}>Message</span>
                </div>

                {/* Active Alerts */}
                {alerts.map(alert => (
                    <div key={alert.id} style={{ ...styles.row, borderLeft: `3px solid ${getLevelColor(alert.level)}` }}>
                        <span style={styles.cell}>ACTIVE</span>
                        <span style={{ ...styles.cell, color: getLevelColor(alert.level) }}>{alert.level.toUpperCase()}</span>
                        <span style={styles.cell}>{alert.category}</span>
                        <span style={styles.cell}>{alert.message} ({alert.current_value})</span>
                    </div>
                ))}

                {/* Historical Log */}
                {mockHistory.map(log => (
                    <div key={log.id} style={{ ...styles.row, opacity: 0.6 }}>
                        <span style={styles.cell}>{log.timestamp}</span>
                        <span style={{ ...styles.cell, color: getLevelColor(log.level as any) }}>{log.level.toUpperCase()}</span>
                        <span style={styles.cell}>{log.metric}</span>
                        <span style={styles.cell}>{log.message}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

const getLevelColor = (level: string) => {
    switch (level) {
        case 'info': return '#00d4ff'
        case 'warning': return '#fbbf24'
        case 'critical': return '#ff4757'
        case 'emergency': return '#ff0000'
        default: return '#fff'
    }
}

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
    title: { fontSize: '0.9rem', fontWeight: 700, color: '#fff', letterSpacing: '1px' },
    list: {
        display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto'
    },
    listHeader: {
        display: 'flex', padding: '8px',
        fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase'
    },
    row: {
        display: 'flex', padding: '10px 8px',
        background: 'rgba(255,255,255,0.03)', borderRadius: '6px',
        fontSize: '0.85rem', color: '#fff', alignItems: 'center'
    },
    cell: { flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', },
}
