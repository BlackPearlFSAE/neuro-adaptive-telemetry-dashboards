import React from 'react'
import logo from '../assets/logo.png'
import { ThemeToggle } from './ThemeToggle'

interface HeaderProps {
    systemStatus: string
    onBestPracticesClick?: () => void
    onSettingsClick?: () => void
    onVehicleClick?: () => void
}

export const Header: React.FC<HeaderProps> = ({ systemStatus, onBestPracticesClick, onSettingsClick, onVehicleClick }) => {
    const isOnline = systemStatus === 'ONLINE'

    return (
        <header style={styles.header}>
            <div style={styles.brand}>
                <div style={styles.logo}>
                    <img src={logo} alt="Black Pearl Racing" style={{ height: '42px', width: 'auto' }} />
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                        <rect width="32" height="32" rx="8" fill="url(#logoGradient)" />
                        <path d="M8 16L16 8L24 16L16 24L8 16Z" fill="var(--bg-primary)" />
                        <path d="M12 16L16 12L20 16L16 20L12 16Z" fill="var(--accent-primary)" />
                        <defs>
                            <linearGradient id="logoGradient" x1="0" y1="0" x2="32" y2="32">
                                <stop stopColor="var(--accent-primary)" />
                                <stop offset="1" stopColor="var(--accent-secondary)" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
                <div style={styles.brandText}>
                    <span style={styles.brandName}>BLACK PEARL<span style={styles.brandAccent}> RACING</span></span>
                    <span style={styles.brandDivider}>|</span>
                    <span style={styles.brandSystem}>KMUTT </span>
                </div>
                <div style={styles.subtitle}>
                    FORMULA STUDENT TEAM • NEURO-ADAPTIVE TELEMETRY SYSTEM
                </div>
            </div>

            <div style={styles.rightSection}>
                {/* Theme Toggle */}
                <ThemeToggle />

                <div style={styles.statusContainer}>
                    <span style={styles.statusLabel}>SYSTEM STATUS</span>
                    <div style={styles.statusBadge}>
                        <span
                            style={{
                                ...styles.statusDot,
                                backgroundColor: isOnline ? 'var(--green-online)' : 'var(--red-alert)',
                                boxShadow: isOnline ? '0 0 10px var(--green-online)' : '0 0 10px var(--red-alert)'
                            }}
                        />
                        <span style={{
                            ...styles.statusText,
                            color: isOnline ? 'var(--green-online)' : 'var(--red-alert)'
                        }}>
                            {systemStatus}
                        </span>
                    </div>
                </div>

                <button style={styles.iconBtn} onClick={onVehicleClick} title="3D Vehicle Dashboard">
                    <span style={{ fontSize: '1.2rem' }}>🏎️</span>
                </button>
                <button style={styles.iconBtn} onClick={onSettingsClick} title="System Configuration">
                    <span style={{ fontSize: '1.2rem' }}>⚙️</span>
                </button>
                <button style={styles.iconBtn} onClick={() => window.dispatchEvent(new CustomEvent('nav-safety'))} title="Safety AI Monitor">
                    <span style={{ fontSize: '1.2rem' }}>🛡️</span>
                </button>
                <button style={styles.bestPracticesBtn} onClick={onBestPracticesClick}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                    </svg>
                    Best Practices
                </button>
            </div>
        </header>
    )
}

const styles: { [key: string]: React.CSSProperties } = {
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        background: 'var(--bg-card)',
        backdropFilter: 'blur(20px)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        transition: 'all 0.3s ease',
    },
    brand: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    logo: {
        display: 'flex',
        alignItems: 'center',
    },
    brandText: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    brandName: {
        fontSize: '1.25rem',
        fontWeight: 700,
        letterSpacing: '0.05em',
        color: 'var(--text-primary)',
    },
    brandAccent: {
        color: 'var(--accent-primary)',
    },
    brandDivider: {
        color: 'var(--text-muted)',
        fontWeight: 300,
    },
    brandSystem: {
        fontSize: '1.25rem',
        fontWeight: 600,
        color: 'var(--accent-secondary)',
    },
    subtitle: {
        fontSize: '0.65rem',
        color: 'var(--text-muted)',
        letterSpacing: '0.1em',
        marginLeft: '16px',
        paddingLeft: '16px',
        borderLeft: '1px solid var(--border-color)',
    },
    rightSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    statusContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '4px',
    },
    statusLabel: {
        fontSize: '0.65rem',
        color: 'var(--text-muted)',
        letterSpacing: '0.1em',
    },
    statusBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    statusDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        animation: 'pulse 2s ease-in-out infinite',
    },
    statusText: {
        fontFamily: "'Roboto Mono', monospace",
        fontSize: '0.875rem',
        fontWeight: 500,
    },
    iconBtn: {
        width: '40px',
        height: '40px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    bestPracticesBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
        border: 'none',
        borderRadius: '8px',
        color: '#ffffff',
        fontSize: '0.875rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
}
