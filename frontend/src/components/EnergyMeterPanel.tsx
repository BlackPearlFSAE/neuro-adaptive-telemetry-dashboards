import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// Types
// ============================================================================

interface BMSStatus {
    pack_voltage: number;
    pack_current: number;
    pack_power: number;
    soc: number;
    soh: number;
    main_contactor: string;
    precharge_contactor: string;
    fuse_state: string;
    fuse_rating_a: number;
    coolant_inlet_temp: number;
    coolant_outlet_temp: number;
    coolant_flow_rate: number;
    pump_state: string;
    pump_rpm: number;
    enclosure_temp: number;
    cell_count: number;
    cell_min_voltage: number;
    cell_max_voltage: number;
    cell_avg_voltage: number;
    cell_delta_voltage: number;
    cell_min_temp: number;
    cell_max_temp: number;
    cells_balancing: number;
    energy_total_kwh: number;
    energy_remaining_kwh: number;
    range_estimate_km: number;
    power_to_motor: number;
    power_from_regen: number;
    power_aux_systems: number;
    fault_codes: string[];
    warnings: string[];
    timestamp: number;
}

// ============================================================================
// Gauge Component
// ============================================================================

interface GaugeProps {
    value: number;
    max: number;
    min?: number;
    label: string;
    unit: string;
    color: string;
    size?: number;
    showNegative?: boolean;
}

const CircularGauge: React.FC<GaugeProps> = ({
    value,
    max,
    min = 0,
    label,
    unit,
    color,
    size = 120,
    showNegative = false
}) => {
    const range = max - min;
    const normalizedValue = showNegative
        ? (value + max) / (2 * max)  // -max to +max range
        : (value - min) / range;
    const percentage = Math.max(0, Math.min(1, normalizedValue));
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const arcLength = circumference * 0.75; // 270 degree arc
    const offset = arcLength * (1 - percentage);

    return (
        <div style={{ textAlign: 'center' }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-135deg)' }}>
                {/* Background arc */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${arcLength} ${circumference}`}
                    strokeLinecap="round"
                />
                {/* Value arc */}
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${arcLength} ${circumference}`}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    initial={{ strokeDashoffset: arcLength }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 0.3 }}
                />
            </svg>
            <div style={{ marginTop: -size / 2 - 10, position: 'relative' }}>
                <div style={{ fontSize: size / 4, fontWeight: 'bold', color: '#fff', fontFamily: 'monospace' }}>
                    {value.toFixed(1)}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{unit}</div>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>{label}</div>
        </div>
    );
};

// ============================================================================
// Battery SOC Indicator
// ============================================================================

const BatteryIndicator: React.FC<{ soc: number; power: number }> = ({ soc, power }) => {
    const isCharging = power < 0;
    const isDischarging = power > 0;

    const getColor = () => {
        if (soc > 60) return '#00ff88';
        if (soc > 30) return '#fbbf24';
        return '#ff4757';
    };

    return (
        <div style={styles.batteryContainer}>
            <div style={styles.batteryWrapper}>
                {/* Battery body */}
                <div style={styles.batteryBody}>
                    <motion.div
                        style={{
                            ...styles.batteryFill,
                            background: `linear-gradient(180deg, ${getColor()} 0%, ${getColor()}88 100%)`,
                        }}
                        animate={{ height: `${soc}%` }}
                        transition={{ duration: 0.5 }}
                    />
                    {/* Charge indicator */}
                    {isCharging && (
                        <motion.div
                            style={styles.chargeIcon}
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ repeat: Infinity, duration: 1 }}
                        >
                            ⚡
                        </motion.div>
                    )}
                </div>
                {/* Battery cap */}
                <div style={styles.batteryCap} />
            </div>
            <div style={styles.batteryInfo}>
                <div style={{ fontSize: 28, fontWeight: 'bold', color: getColor(), fontFamily: 'monospace' }}>
                    {soc.toFixed(1)}%
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                    {isCharging ? '🔌 Charging' : isDischarging ? '🔋 Discharging' : '⏸️ Idle'}
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// Power Flow Visualization
// ============================================================================

const PowerFlowDiagram: React.FC<{ status: BMSStatus }> = ({ status }) => {
    const { pack_power, power_to_motor, power_from_regen, power_aux_systems } = status;

    return (
        <div style={styles.powerFlowContainer}>
            <div style={styles.powerFlowTitle}>⚡ Power Flow</div>
            <div style={styles.powerFlowDiagram}>
                {/* Battery */}
                <div style={styles.powerNode}>
                    <div style={styles.powerNodeIcon}>🔋</div>
                    <div style={styles.powerNodeLabel}>Battery</div>
                </div>

                {/* Arrow to/from motor */}
                <motion.div
                    style={{
                        ...styles.powerArrow,
                        background: power_to_motor > 0
                            ? 'linear-gradient(90deg, #00d4ff, #00ff88)'
                            : 'linear-gradient(270deg, #00d4ff, #fbbf24)'
                    }}
                    animate={{
                        x: power_to_motor > 0 ? [0, 5, 0] : [0, -5, 0],
                        opacity: Math.abs(pack_power) > 1 ? 1 : 0.3
                    }}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                >
                    {power_to_motor > 0 ? '→' : power_from_regen > 0 ? '←' : '—'}
                </motion.div>

                {/* Motor */}
                <div style={styles.powerNode}>
                    <div style={styles.powerNodeIcon}>⚙️</div>
                    <div style={styles.powerNodeLabel}>Motor</div>
                </div>
            </div>

            {/* Power values */}
            <div style={styles.powerValues}>
                <div style={styles.powerValueItem}>
                    <span style={{ color: '#ff6b6b' }}>Discharge</span>
                    <span style={{ fontFamily: 'monospace', color: '#fff' }}>{power_to_motor.toFixed(1)} kW</span>
                </div>
                <div style={styles.powerValueItem}>
                    <span style={{ color: '#00ff88' }}>Regen</span>
                    <span style={{ fontFamily: 'monospace', color: '#fff' }}>{power_from_regen.toFixed(1)} kW</span>
                </div>
                <div style={styles.powerValueItem}>
                    <span style={{ color: '#fbbf24' }}>Aux</span>
                    <span style={{ fontFamily: 'monospace', color: '#fff' }}>{power_aux_systems.toFixed(1)} kW</span>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// BMS Schematic (Interactive)
// ============================================================================

const BMSSchematic: React.FC<{ status: BMSStatus; onComponentClick: (id: string) => void }> = ({
    status,
    onComponentClick
}) => {
    const getContactorColor = (state: string) => {
        switch (state) {
            case 'CLOSED': return '#00ff88';
            case 'OPEN': return '#666';
            case 'PRECHARGE': return '#fbbf24';
            case 'FAULT': return '#ff4757';
            default: return '#666';
        }
    };

    return (
        <svg width="100%" height="200" viewBox="0 0 400 200" style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12 }}>
            {/* Main contactor */}
            <g onClick={() => onComponentClick('main_contactor')} style={{ cursor: 'pointer' }}>
                <rect x="40" y="60" width="50" height="80" rx="5" fill={getContactorColor(status.main_contactor)} stroke="#fff" strokeWidth="2" />
                <text x="65" y="110" textAnchor="middle" fill="#0a1628" fontSize="10" fontWeight="bold">MAIN</text>
                <circle cx="65" cy="140" r="6" fill={status.main_contactor === 'CLOSED' ? '#00ff88' : '#ff4757'} />
            </g>

            {/* Precharge contactor */}
            <g onClick={() => onComponentClick('precharge')} style={{ cursor: 'pointer' }}>
                <rect x="110" y="70" width="40" height="60" rx="5" fill="#22c55e" stroke="#fff" strokeWidth="2" />
                <text x="130" y="105" textAnchor="middle" fill="#0a1628" fontSize="9" fontWeight="bold">PRE</text>
            </g>

            {/* Fuse */}
            <g onClick={() => onComponentClick('fuse')} style={{ cursor: 'pointer' }}>
                <rect x="170" y="75" width="40" height="50" rx="3" fill={status.fuse_state === 'OK' ? '#ef4444' : '#666'} stroke="#fff" strokeWidth="2" />
                <text x="190" y="105" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">FUSE</text>
            </g>

            {/* Current sensor (copper bus) */}
            <rect x="230" y="85" width="60" height="30" rx="3" fill="#b87333" stroke="#fff" strokeWidth="1" />
            <text x="260" y="105" textAnchor="middle" fill="#fff" fontSize="9">SENSE</text>

            {/* Pump */}
            <g onClick={() => onComponentClick('pump')} style={{ cursor: 'pointer' }}>
                <rect x="40" y="10" width="50" height="40" rx="5" fill="#0ea5e9" stroke="#fff" strokeWidth="2" />
                <text x="65" y="35" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">PUMP</text>
                <text x="65" y="48" textAnchor="middle" fill="#fff" fontSize="8">{status.pump_rpm} RPM</text>
            </g>

            {/* BMS Controller */}
            <g onClick={() => onComponentClick('bms')} style={{ cursor: 'pointer' }}>
                <rect x="310" y="60" width="70" height="80" rx="5" fill="#1e293b" stroke="#00d4ff" strokeWidth="2" />
                <text x="345" y="90" textAnchor="middle" fill="#00d4ff" fontSize="10" fontWeight="bold">BMS</text>
                {/* LED indicators */}
                {[0, 1, 2, 3, 4].map(i => (
                    <circle
                        key={i}
                        cx={320 + i * 12}
                        cy={115}
                        r="4"
                        fill={i < 3 ? '#00ff88' : (i === 3 && status.warnings.length > 0 ? '#fbbf24' : '#333')}
                    />
                ))}
                <text x="345" y="135" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8">
                    {status.cell_count} cells
                </text>
            </g>

            {/* Connection lines (busbars) */}
            <line x1="90" y1="100" x2="110" y2="100" stroke="#b87333" strokeWidth="4" />
            <line x1="150" y1="100" x2="170" y2="100" stroke="#b87333" strokeWidth="4" />
            <line x1="210" y1="100" x2="230" y2="100" stroke="#b87333" strokeWidth="4" />
            <line x1="290" y1="100" x2="310" y2="100" stroke="#333" strokeWidth="2" strokeDasharray="5,3" />

            {/* Coolant line */}
            <path d="M 65 50 Q 65 60 90 60 L 330 60" stroke="#0ea5e9" strokeWidth="2" strokeDasharray="4,2" fill="none" />
        </svg>
    );
};

// ============================================================================
// Cell Voltage Grid
// ============================================================================

const CellVoltageGrid: React.FC<{ status: BMSStatus }> = ({ status }) => {
    // const getVoltageColor = (v: number) => {
    //     const min = 3.0, max = 4.2;
    //     const normalized = (v - min) / (max - min);
    //     if (normalized > 0.8) return '#00ff88';
    //     if (normalized > 0.5) return '#fbbf24';
    //     return '#ff4757';
    // };

    return (
        <div style={styles.cellGrid}>
            <div style={styles.cellGridHeader}>
                <span>🔌 Cell Voltages</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{status.cell_count} cells</span>
            </div>
            <div style={styles.cellStats}>
                <div style={styles.cellStat}>
                    <span style={{ color: '#00ff88' }}>Max</span>
                    <span style={{ fontFamily: 'monospace' }}>{status.cell_max_voltage.toFixed(3)}V</span>
                </div>
                <div style={styles.cellStat}>
                    <span style={{ color: '#fff' }}>Avg</span>
                    <span style={{ fontFamily: 'monospace' }}>{status.cell_avg_voltage.toFixed(3)}V</span>
                </div>
                <div style={styles.cellStat}>
                    <span style={{ color: '#ff4757' }}>Min</span>
                    <span style={{ fontFamily: 'monospace' }}>{status.cell_min_voltage.toFixed(3)}V</span>
                </div>
                <div style={styles.cellStat}>
                    <span style={{ color: '#fbbf24' }}>Δ</span>
                    <span style={{ fontFamily: 'monospace' }}>{(status.cell_delta_voltage * 1000).toFixed(0)}mV</span>
                </div>
            </div>
            {status.cells_balancing > 0 && (
                <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 8 }}>
                    ⚖️ {status.cells_balancing} cells balancing
                </div>
            )}
        </div>
    );
};

// ============================================================================
// Thermal Panel
// ============================================================================

const ThermalPanel: React.FC<{ status: BMSStatus }> = ({ status }) => {
    const getTempColor = (temp: number) => {
        if (temp > 45) return '#ff4757';
        if (temp > 35) return '#fbbf24';
        return '#00ff88';
    };

    return (
        <div style={styles.thermalPanel}>
            <div style={styles.thermalTitle}>🌡️ Thermal Management</div>
            <div style={styles.thermalGrid}>
                <div style={styles.thermalItem}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Coolant In</div>
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: '#0ea5e9', fontFamily: 'monospace' }}>
                        {status.coolant_inlet_temp.toFixed(1)}°C
                    </div>
                </div>
                <div style={styles.thermalItem}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Coolant Out</div>
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: '#f97316', fontFamily: 'monospace' }}>
                        {status.coolant_outlet_temp.toFixed(1)}°C
                    </div>
                </div>
                <div style={styles.thermalItem}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Cell Max</div>
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: getTempColor(status.cell_max_temp), fontFamily: 'monospace' }}>
                        {status.cell_max_temp.toFixed(1)}°C
                    </div>
                </div>
                <div style={styles.thermalItem}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Flow Rate</div>
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: '#00d4ff', fontFamily: 'monospace' }}>
                        {status.coolant_flow_rate.toFixed(1)} L/m
                    </div>
                </div>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 10 }}>
                Pump: <span style={{ color: status.pump_state === 'HIGH' ? '#ff4757' : '#00ff88' }}>{status.pump_state}</span> ({status.pump_rpm} RPM)
            </div>
        </div>
    );
};

// ============================================================================
// Main Component
// ============================================================================

export const EnergyMeterPanel: React.FC = () => {
    const [status, setStatus] = useState<BMSStatus | null>(null);
    const [connected, setConnected] = useState(false);
    const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
    const [demoMode, setDemoMode] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    // Demo data generator
    const generateDemoData = useCallback((): BMSStatus => ({
        pack_voltage: 350 + Math.random() * 10,
        pack_current: -50 + Math.random() * 150,
        pack_power: -20 + Math.random() * 60,
        soc: 60 + Math.random() * 20,
        soh: 98.5,
        main_contactor: 'CLOSED',
        precharge_contactor: 'CLOSED',
        fuse_state: 'OK',
        fuse_rating_a: 250,
        coolant_inlet_temp: 22 + Math.random() * 5,
        coolant_outlet_temp: 28 + Math.random() * 5,
        coolant_flow_rate: 4 + Math.random() * 2,
        pump_state: 'MEDIUM',
        pump_rpm: 2000 + Math.floor(Math.random() * 1000),
        enclosure_temp: 30 + Math.random() * 5,
        cell_count: 96,
        cell_min_voltage: 3.65 + Math.random() * 0.05,
        cell_max_voltage: 3.70 + Math.random() * 0.05,
        cell_avg_voltage: 3.68 + Math.random() * 0.02,
        cell_delta_voltage: 0.03 + Math.random() * 0.04,
        cell_min_temp: 28 + Math.random() * 3,
        cell_max_temp: 33 + Math.random() * 5,
        cells_balancing: Math.floor(Math.random() * 4),
        energy_total_kwh: 6.5,
        energy_remaining_kwh: 4 + Math.random() * 2,
        range_estimate_km: 15 + Math.random() * 10,
        power_to_motor: Math.max(0, -20 + Math.random() * 60),
        power_from_regen: Math.random() * 15,
        power_aux_systems: 0.4 + Math.random() * 0.2,
        fault_codes: [],
        warnings: Math.random() > 0.8 ? ['High cell temp'] : [],
        timestamp: Date.now()
    }), []);

    // WebSocket connection with robust offline fallback
    useEffect(() => {
        let isMounted = true;
        let ws: WebSocket | null = null;
        let reconnectTimer: number | null = null;
        let fallbackTimer: number | null = null;

        const startDemoMode = () => {
            if (!isMounted) return;
            console.log("⚡ Switching to Demo Mode (Offline/GitHub Pages)");
            setDemoMode(true);
            setStatus(generateDemoData());
        };

        const connect = () => {
            if (!isMounted) return;

            // 1. Immediate check: GitHub Pages always uses Demo
            if (window.location.hostname.includes('github.io')) {
                startDemoMode();
                return;
            }

            // 2. Fallback timeout: If not connected within 3s, force Demo
            // This handles local backend down, network timeouts, etc.
            if (!fallbackTimer) {
                fallbackTimer = window.setTimeout(() => {
                    console.warn("⚠️ Connection timed out, forcing Demo Mode");
                    if (ws) ws.close();
                    startDemoMode();
                }, 3000);
            }

            try {
                // Determine URL
                let wsUrl = 'ws://localhost:8001/ws/energy';
                try {
                    const stored = localStorage.getItem('nats_ws_url');
                    if (stored) wsUrl = stored.replace(/\/ws$/, '/ws/energy');
                    else if (window.location.hostname && window.location.hostname !== 'localhost') {
                        wsUrl = `ws://${window.location.hostname}:8001/ws/energy`;
                    }
                } catch { /* ignore */ }

                console.log(`🔌 Connecting to Energy BMS at ${wsUrl}...`);
                ws = new WebSocket(wsUrl);
                wsRef.current = ws;

                ws.onopen = () => {
                    if (!isMounted) return;
                    console.log("✅ BMS Connected");
                    setConnected(true);
                    setDemoMode(false);
                    // Clear fallback timer on successful connection
                    if (fallbackTimer) clearTimeout(fallbackTimer);
                };

                ws.onmessage = (e) => {
                    if (!isMounted) return;
                    try {
                        const data = JSON.parse(e.data);
                        setStatus(data);
                    } catch (err) {
                        console.error("Failed to parse BMS data", err);
                    }
                };

                ws.onerror = (e) => {
                    console.error("❌ BMS WebSocket Error", e);
                };

                ws.onclose = () => {
                    if (!isMounted) return;
                    console.log("⚠️ BMS Disconnected");
                    setConnected(false);

                    // If we were already in demo mode or fallback triggered, don't spam reconnect
                    if (demoMode) return;

                    // Retry connection if not yet timed out
                    reconnectTimer = window.setTimeout(connect, 2000);
                };

            } catch (err) {
                console.error("Failed to create WebSocket", err);
                // If immediate failure (e.g. security block), connection retry will handle it via onclose 
                // or fallback timer will catch it.
            }
        };

        connect();

        return () => {
            isMounted = false;
            if (ws) ws.close();
            if (reconnectTimer) clearTimeout(reconnectTimer);
            if (fallbackTimer) clearTimeout(fallbackTimer);
        };
    }, [generateDemoData]);

    // Demo mode updates
    useEffect(() => {
        if (demoMode) {
            const interval = setInterval(() => setStatus(generateDemoData()), 500);
            return () => clearInterval(interval);
        }
    }, [demoMode, generateDemoData]);

    const handleComponentClick = (id: string) => {
        setSelectedComponent(id === selectedComponent ? null : id);
    };

    if (!status) {
        return (
            <div style={styles.loading}>
                <div style={{ fontSize: 48 }}>⚡</div>
                <div>Connecting to BMS...</div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h2 style={styles.title}>
                        ⚡ Energy Meter
                        <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: connected ? '#00ff88' : demoMode ? '#fbbf24' : '#ff4757',
                            display: 'inline-block', marginLeft: 8
                        }} />
                        {demoMode && <span style={styles.demoBadge}>DEMO</span>}
                    </h2>
                    <p style={styles.subtitle}>Battery Management System Monitor</p>
                </div>
                <div style={styles.rangeDisplay}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Range</div>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#00d4ff', fontFamily: 'monospace' }}>
                        {status.range_estimate_km.toFixed(1)} km
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div style={styles.mainGrid}>
                {/* Left: Gauges */}
                <div style={styles.gaugesSection}>
                    <div style={styles.gaugeRow}>
                        <CircularGauge value={status.pack_voltage} max={420} min={280} label="Pack Voltage" unit="V" color="#00d4ff" />
                        <CircularGauge value={status.pack_current} max={300} min={-100} label="Current" unit="A" color={status.pack_current > 0 ? '#ff6b6b' : '#00ff88'} showNegative />
                        <CircularGauge value={Math.abs(status.pack_power)} max={50} label="Power" unit="kW" color="#a855f7" />
                    </div>
                    <BatteryIndicator soc={status.soc} power={status.pack_power} />
                </div>

                {/* Center: Schematic + Power Flow */}
                <div style={styles.centerSection}>
                    <div style={styles.schematicCard}>
                        <div style={styles.cardTitle}>🔌 BMS Schematic</div>
                        <BMSSchematic status={status} onComponentClick={handleComponentClick} />
                    </div>
                    <PowerFlowDiagram status={status} />
                </div>

                {/* Right: Cells + Thermal */}
                <div style={styles.rightSection}>
                    <CellVoltageGrid status={status} />
                    <ThermalPanel status={status} />
                </div>
            </div>

            {/* Warnings */}
            <AnimatePresence>
                {status.warnings.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        style={styles.warningBanner}
                    >
                        ⚠️ {status.warnings.join(' | ')}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ============================================================================
// Styles
// ============================================================================

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        padding: 24,
        minHeight: '100%',
        background: 'linear-gradient(135deg, rgba(10, 22, 40, 0.9) 0%, rgba(13, 33, 55, 0.9) 100%)',
    },
    loading: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: 'rgba(255,255,255,0.6)', gap: 16
    },
    header: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24,
    },
    title: {
        fontSize: 24, fontWeight: 'bold', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8
    },
    subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0' },
    demoBadge: {
        fontSize: 10, background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24',
        padding: '2px 8px', borderRadius: 4, marginLeft: 8
    },
    rangeDisplay: { textAlign: 'right' as const },
    mainGrid: { display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: 20 },
    gaugesSection: { display: 'flex', flexDirection: 'column', gap: 20 },
    gaugeRow: { display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 16 },
    centerSection: { display: 'flex', flexDirection: 'column', gap: 16 },
    rightSection: { display: 'flex', flexDirection: 'column', gap: 16 },
    schematicCard: {
        background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16,
        border: '1px solid rgba(0, 212, 255, 0.2)'
    },
    cardTitle: { fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 12 },
    batteryContainer: { display: 'flex', alignItems: 'center', gap: 20, justifyContent: 'center' },
    batteryWrapper: { position: 'relative' },
    batteryBody: {
        width: 60, height: 120, border: '3px solid #fff', borderRadius: 8,
        position: 'relative', overflow: 'hidden', background: 'rgba(0,0,0,0.3)'
    },
    batteryFill: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        borderRadius: '0 0 4px 4px'
    },
    batteryCap: {
        width: 24, height: 8, background: '#fff', borderRadius: '4px 4px 0 0',
        margin: '0 auto', marginBottom: -2
    },
    chargeIcon: {
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        fontSize: 24, color: '#fff', textShadow: '0 0 10px #fbbf24'
    },
    batteryInfo: { textAlign: 'center' as const },
    powerFlowContainer: {
        background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16,
        border: '1px solid rgba(0, 212, 255, 0.2)'
    },
    powerFlowTitle: { fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 12 },
    powerFlowDiagram: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 },
    powerNode: { textAlign: 'center' as const },
    powerNodeIcon: { fontSize: 32 },
    powerNodeLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
    powerArrow: {
        width: 60, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 4, color: '#fff', fontWeight: 'bold', fontSize: 20
    },
    powerValues: { display: 'flex', justifyContent: 'space-around', marginTop: 16 },
    powerValueItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: 12 },
    cellGrid: {
        background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16,
        border: '1px solid rgba(0, 212, 255, 0.2)'
    },
    cellGridHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontWeight: 600, color: '#fff' },
    cellStats: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 },
    cellStat: { display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' },
    thermalPanel: {
        background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16,
        border: '1px solid rgba(0, 212, 255, 0.2)'
    },
    thermalTitle: { fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 12 },
    thermalGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 },
    thermalItem: { textAlign: 'center' as const, padding: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 8 },
    warningBanner: {
        marginTop: 20, padding: 12, background: 'rgba(251, 191, 36, 0.2)',
        border: '1px solid #fbbf24', borderRadius: 8, color: '#fbbf24', textAlign: 'center'
    }
};

export default EnergyMeterPanel;
