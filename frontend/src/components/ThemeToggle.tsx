import { useTheme } from '../contexts/ThemeContext'

export function ThemeToggle() {
    const { toggleTheme, isDark } = useTheme()

    return (
        <button
            onClick={toggleTheme}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: isDark
                    ? 'linear-gradient(135deg, #1a1a1a, #333)'
                    : 'linear-gradient(135deg, #fff, #f5f5f5)',
                border: '1px solid var(--accent-primary)',
                borderRadius: '20px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 10px rgba(255, 136, 0, 0.2)',
            }}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} theme`}
        >
            {/* Sun/Moon Icon */}
            <span style={{
                fontSize: '1.1rem',
                filter: 'drop-shadow(0 0 4px var(--accent-primary))'
            }}>
                {isDark ? '🌙' : '☀️'}
            </span>

            {/* Toggle Track */}
            <div style={{
                width: '44px',
                height: '24px',
                background: isDark
                    ? 'linear-gradient(135deg, #1a1a1a, #2d2d2d)'
                    : 'linear-gradient(135deg, #e8e8e8, #fff)',
                borderRadius: '12px',
                position: 'relative',
                border: '2px solid var(--accent-primary)',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
            }}>
                {/* Toggle Knob */}
                <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: isDark ? '2px' : '20px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ff8800, #ff6600)',
                    boxShadow: '0 2px 8px rgba(255, 136, 0, 0.5)',
                    transition: 'left 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                }} />
            </div>

            {/* Theme Label */}
            <span style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-primary)',
                minWidth: '40px',
            }}>
                {isDark ? 'Dark' : 'Light'}
            </span>
        </button>
    )
}
