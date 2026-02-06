import React, { useState } from 'react'

interface SettingsPanelProps {
    isOpen: boolean
    onClose: () => void
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'general' | 'sensors' | 'safety' | 'network' | 'controls'>('general')

    if (!isOpen) return null

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.titleRow}>
                        <span style={styles.icon}>⚙️</span>
                        <h2 style={styles.title}>SYSTEM CONFIGURATION</h2>
                    </div>
                    <button style={styles.closeBtn} onClick={onClose}>×</button>
                </div>

                {/* Sidebar + Content Layout */}
                <div style={styles.body}>
                    {/* Sidebar Nav */}
                    <div style={styles.sidebar}>
                        <NavButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} label="General" icon="🔧" />
                        <NavButton active={activeTab === 'sensors'} onClick={() => setActiveTab('sensors')} label="Sensors" icon="📡" />
                        <NavButton active={activeTab === 'safety'} onClick={() => setActiveTab('safety')} label="Safety AI" icon="🛡️" />
                        <NavButton active={activeTab === 'controls'} onClick={() => setActiveTab('controls')} label="Controls" icon="🎮" />
                        <NavButton active={activeTab === 'network'} onClick={() => setActiveTab('network')} label="Network" icon="🌐" />
                    </div>

                    {/* Main Content Area */}
                    <div style={styles.content}>
                        {activeTab === 'general' && <GeneralSettings />}
                        {activeTab === 'sensors' && <SensorSettings />}
                        {activeTab === 'safety' && <SafetySettings />}
                        {activeTab === 'controls' && <ControlsSettings />}
                        {activeTab === 'network' && <NetworkSettings />}
                    </div>
                </div>

                {/* Footer Actions */}
                <div style={styles.footer}>
                    <button style={styles.secondaryBtn} onClick={onClose}>Cancel</button>
                    <button style={styles.primaryBtn} onClick={onClose}>Save Changes</button>
                </div>
            </div>
        </div>
    )
}

// Sub-components for tabs
const GeneralSettings = () => (
    <div style={styles.tabContainer}>
        <h3 style={styles.tabTitle}>Dashboard Preferences</h3>
        <div style={styles.formGroup}>
            <label style={styles.label}>Theme Mode</label>
            <select style={styles.select}>
                <option>Dark (Motorsport)</option>
                <option>Light (Day Mode)</option>
                <option>High Contrast</option>
            </select>
        </div>
        <div style={styles.formGroup}>
            <label style={styles.label}>Unit System</label>
            <div style={styles.radioGroup}>
                <RadioOption label="Metric (km/h, °C)" checked />
                <RadioOption label="Imperial (mph, °F)" />
            </div>
        </div>
        <div style={styles.formGroup}>
            <label style={styles.label}>Refresh Rate</label>
            <input type="range" min="1" max="60" defaultValue="30" style={styles.range} />
            <div style={styles.rangeLabels}>
                <span>1Hz</span>
                <span>60Hz</span>
            </div>
        </div>
    </div>
)

const SensorSettings = () => (
    <div style={styles.tabContainer}>
        <h3 style={styles.tabTitle}>Sensor Communication</h3>
        <ToggleRow label="Auto-Connect Known Devices" checked />
        <ToggleRow label="Simulate Missing Sensors" checked />
        <ToggleRow label="Log Raw Data to Disk" checked />

        <div style={styles.divider} />

        <h4 style={styles.subTitle}>Sampling Frequencies</h4>
        <div style={styles.grid2}>
            <InputRow label="ECG (Hz)" value="250" />
            <InputRow label="EEG (Hz)" value="256" />
            <InputRow label="GSR (Hz)" value="50" />
            <InputRow label="Eye (Hz)" value="120" />
        </div>
    </div>
)

const SafetySettings = () => (
    <div style={styles.tabContainer}>
        <h3 style={styles.tabTitle}>AI Intervention Thresholds</h3>
        <div style={styles.warningBox}>
            ⚠️ Adjusting these values affects automated safety protocols.
        </div>

        <div style={styles.formGroup}>
            <label style={styles.label}>Max Heart Rate (BPM)</label>
            <input type="number" defaultValue="185" style={styles.input} />
        </div>
        <div style={styles.formGroup}>
            <label style={styles.label}>Fatigue Trigger Level (%)</label>
            <input type="range" defaultValue="80" style={styles.range} />
        </div>

        <div style={styles.divider} />

        <h4 style={styles.subTitle}>Automated Responses</h4>
        <ToggleRow label="Auto-Throttle Limit" checked />
        <ToggleRow label="Haptic Warnings" checked />
        <ToggleRow label="Pit Crew Alerts" checked />
    </div>
)

const NetworkSettings = () => (
    <div style={styles.tabContainer}>
        <h3 style={styles.tabTitle}>Telemetry Stream</h3>
        <InputRow label="WebSocket URL" value="ws://localhost:8000/ws" />
        <InputRow label="API Endpoint" value="http://localhost:8000/api" />
        <ToggleRow label="Enable SSL/TLS" />
        <div style={styles.statusRow}>
            <span>Status:</span>
            <span style={{ color: '#00ff88', fontWeight: 'bold' }}>● Connected</span>
        </div>
    </div>
)

const ControlsSettings = () => (
    <div style={styles.tabContainer}>
        <h3 style={styles.tabTitle}>Steering & Inputs</h3>
        <div style={styles.formGroup}>
            <label style={styles.label}>Steering Ratio (1:x)</label>
            <input type="range" min="8" max="20" defaultValue="12" style={styles.range} />
            <div style={styles.rangeLabels}>
                <span>Fast (8:1)</span>
                <span>Slow (20:1)</span>
            </div>
        </div>
        <div style={styles.formGroup}>
            <label style={styles.label}>Max Steering Lock (°)</label>
            <input type="range" min="180" max="540" defaultValue="360" style={styles.range} />
            <div style={styles.rangeLabels}>
                <span>180°</span>
                <span>540°</span>
            </div>
        </div>

        <div style={styles.divider} />

        <h4 style={styles.subTitle}>Feedback & Assist</h4>
        <ToggleRow label="Force Feedback (FFB)" checked />
        <ToggleRow label="Auto-Clutch" />
        <ToggleRow label="Traction Control Assist" checked />

        <div style={styles.formGroup}>
            <label style={styles.label}>FFB Strength (%)</label>
            <input type="range" defaultValue="75" style={styles.range} />
        </div>

        <div style={styles.divider} />

        <h4 style={styles.subTitle}>Strategy & Energy</h4>
        <ToggleRow label="Predictive Energy Mode" checked />
        <InputRow label="Target SOC Consumption/Lap" value="3.5%" />
        <InputRow label="Lap Delta Reference" value="Personal Best" />
    </div>
)

// UI Components
const NavButton = ({ active, onClick, label, icon }: any) => (
    <button
        style={{ ...styles.navBtn, ...(active ? styles.navBtnActive : {}) }}
        onClick={onClick}
    >
        <span style={styles.navIcon}>{icon}</span>
        {label}
    </button>
)

const ToggleRow = ({ label, checked }: any) => (
    <div style={styles.toggleRow}>
        <span style={styles.toggleLabel}>{label}</span>
        <div style={{ ...styles.toggleSwitch, background: checked ? '#00d4ff' : 'rgba(255,255,255,0.1)' }}>
            <div style={{ ...styles.toggleKnob, transform: checked ? 'translateX(20px)' : 'translateX(0)' }} />
        </div>
    </div>
)

const RadioOption = ({ label, checked }: any) => (
    <label style={styles.radioLabel}>
        <input type="radio" checked={checked} readOnly />
        <span style={styles.radioText}>{label}</span>
    </label>
)

const InputRow = ({ label, value }: any) => (
    <div style={styles.inputRow}>
        <label style={styles.inputLabel}>{label}</label>
        <input type="text" defaultValue={value} style={styles.input} />
    </div>
)

const styles: { [key: string]: React.CSSProperties } = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    modal: {
        width: '800px', height: '600px',
        background: 'linear-gradient(135deg, #0a1628 0%, #0d2137 100%)',
        borderRadius: '20px', border: '1px solid rgba(0, 212, 255, 0.3)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
    },
    header: {
        padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    },
    titleRow: { display: 'flex', alignItems: 'center', gap: '12px' },
    icon: { fontSize: '1.5rem' },
    title: { fontSize: '1.2rem', fontWeight: 700, color: '#fff', letterSpacing: '1px', margin: 0 },
    closeBtn: {
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
        fontSize: '1.5rem', cursor: 'pointer', padding: '0 10px',
    },
    body: { flex: 1, display: 'flex', overflow: 'hidden' },
    sidebar: {
        width: '200px', background: 'rgba(0,0,0,0.2)',
        padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px',
    },
    content: { flex: 1, padding: '30px', overflowY: 'auto' },
    footer: {
        padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', justifyContent: 'flex-end', gap: '12px',
        background: 'rgba(0,0,0,0.2)',
    },
    navBtn: {
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '12px', borderRadius: '10px', border: 'none',
        background: 'transparent', color: 'rgba(255,255,255,0.6)',
        fontSize: '0.9rem', cursor: 'pointer', textAlign: 'left',
        transition: 'all 0.2s',
    },
    navBtnActive: {
        background: 'rgba(0, 212, 255, 0.1)', color: '#00d4ff', fontWeight: 600,
    },
    navIcon: { fontSize: '1.1rem' },
    tabTitle: { fontSize: '1.1rem', color: '#fff', marginBottom: '20px', borderBottom: '2px solid #00d4ff', display: 'inline-block', paddingBottom: '5px' },
    subTitle: { fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', marginTop: '20px', marginBottom: '10px' },
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' },
    select: {
        width: '100%', padding: '10px', borderRadius: '8px',
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
        color: '#fff', fontSize: '0.9rem', outline: 'none',
    },
    input: {
        width: '100%', padding: '10px', borderRadius: '8px',
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
        color: '#fff', fontSize: '0.9rem', outline: 'none', fontFamily: 'monospace',
    },
    range: { width: '100%', accentColor: '#00d4ff' },
    rangeLabels: { display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' },
    radioGroup: { display: 'flex', gap: '20px' },
    radioLabel: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },
    radioText: { fontSize: '0.9rem', color: '#fff' },
    toggleRow: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
    },
    toggleLabel: { fontSize: '0.9rem', color: '#fff' },
    toggleSwitch: {
        width: '44px', height: '24px', borderRadius: '12px',
        position: 'relative', transition: 'background 0.3s',
    },
    toggleKnob: {
        width: '20px', height: '20px', borderRadius: '50%',
        background: '#fff', position: 'absolute', top: '2px', left: '2px',
        transition: 'transform 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
    },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
    inputRow: { marginBottom: '15px' },
    inputLabel: { display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' },
    warningBox: {
        background: 'rgba(255, 165, 2, 0.15)', border: '1px solid #ffa502',
        borderRadius: '8px', padding: '12px', color: '#ffa502', fontSize: '0.85rem',
        marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px',
    },
    divider: { height: '1px', background: 'rgba(255,255,255,0.1)', margin: '20px 0' },
    statusRow: { marginTop: '10px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', display: 'flex', gap: '10px' },
    primaryBtn: {
        padding: '10px 24px', borderRadius: '8px', border: 'none',
        background: 'linear-gradient(135deg, #00d4ff, #00ff88)', color: '#0a1628',
        fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
    },
    secondaryBtn: {
        padding: '10px 24px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
        background: 'transparent', color: '#fff',
        fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem',
    },
}
