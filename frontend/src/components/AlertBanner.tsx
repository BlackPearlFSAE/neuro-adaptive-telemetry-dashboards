import React from 'react'

interface AlertBannerProps {
    alerts: Alert[]
    onDismiss: (alertId: string) => void
}

interface Alert {
    id: string
    level: 'info' | 'warning' | 'critical' | 'emergency'
    metric: string
    category: string
    message: string
    current_value: number
    threshold_value: number
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ alerts, onDismiss }) => {
    if (alerts.length === 0) return null

    const criticalAlerts = alerts.filter(a => a.level === 'critical' || a.level === 'emergency')
    const warningAlerts = alerts.filter(a => a.level === 'warning')

    const displayAlerts = [...criticalAlerts, ...warningAlerts].slice(0, 3)

    return (
        <div style={styles.container}>
            {displayAlerts.map(alert => (
                <div
                    key={alert.id}
                    style={{
                        ...styles.alert,
                        background: alert.level === 'critical' || alert.level === 'emergency'
                            ? 'rgba(255, 71, 87, 0.15)'
                            : 'rgba(255, 165, 2, 0.15)',
                        borderColor: alert.level === 'critical' || alert.level === 'emergency'
                            ? '#ff4757'
                            : '#ffa502'
                    }}
                >
                    <span style={styles.alertIcon}>
                        {alert.level === 'critical' || alert.level === 'emergency' ? '🚨' : '⚠️'}
                    </span>
                    <div style={styles.alertContent}>
                        <div style={styles.alertHeader}>
                            <span style={{
                                ...styles.alertLevel,
                                color: alert.level === 'critical' || alert.level === 'emergency' ? '#ff4757' : '#ffa502'
                            }}>
                                {alert.level.toUpperCase()}
                            </span>
                            <span style={styles.alertCategory}>{alert.category}</span>
                            <span style={styles.alertMetric}>
                                {alert.metric}: {alert.current_value} (threshold: {alert.threshold_value})
                            </span>
                        </div>
                        <p style={styles.alertMessage}>{alert.message}</p>
                    </div>
                    <button
                        style={styles.dismissBtn}
                        onClick={() => onDismiss(alert.id)}
                    >
                        ✕
                    </button>
                </div>
            ))}

            {alerts.length > 3 && (
                <div style={styles.moreAlerts}>
                    +{alerts.length - 3} more alert{alerts.length - 3 > 1 ? 's' : ''}
                </div>
            )}
        </div>
    )
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    alert: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '10px',
        border: '1px solid',
        animation: 'slideIn 0.3s ease',
    },
    alertIcon: {
        fontSize: '1.25rem',
        flexShrink: 0,
    },
    alertContent: {
        flex: 1,
        minWidth: 0,
    },
    alertHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '4px',
        flexWrap: 'wrap',
    },
    alertLevel: {
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.05em',
    },
    alertCategory: {
        fontSize: '0.7rem',
        color: 'rgba(255, 255, 255, 0.5)',
        padding: '2px 6px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
    },
    alertMetric: {
        fontSize: '0.7rem',
        color: 'rgba(255, 255, 255, 0.6)',
        fontFamily: "'Roboto Mono', monospace",
    },
    alertMessage: {
        margin: 0,
        fontSize: '0.8rem',
        color: 'rgba(255, 255, 255, 0.8)',
        lineHeight: 1.4,
    },
    dismissBtn: {
        width: '24px',
        height: '24px',
        borderRadius: '6px',
        border: 'none',
        background: 'rgba(255, 255, 255, 0.1)',
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '0.75rem',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'all 0.2s ease',
    },
    moreAlerts: {
        fontSize: '0.75rem',
        color: 'rgba(255, 255, 255, 0.4)',
        textAlign: 'center',
        padding: '4px',
    },
}
