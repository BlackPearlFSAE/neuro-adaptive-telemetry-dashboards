import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// Types
// ============================================================================

interface Threat {
    object_class: string;
    distance: number;
    ttc: number;
    level: 'NONE' | 'INFO' | 'WARNING' | 'DANGER' | 'CRITICAL';
}

interface ADASState {
    timestamp: number;
    frame_id: number;
    warning_level: string;
    warning_message: string;
    threats: Threat[];
    brake_assist: boolean;
    lane_status: string;
    center_offset: number;
    suggested_steering: number;
    lane_confidence: number;
    min_distance: number;
    distance_zone: string;
    fps: number;
    processing_time_ms: number;
}

interface ProcessingStatus {
    status: 'idle' | 'loading_model' | 'processing' | 'completed' | 'error';
    current_video: string | null;
    processed_frames: number;
    total_frames: number;
    progress: number;
}

// ============================================================================
// Sub-Components
// ============================================================================

const WarningLevelBadge = ({ level }: { level: string }) => {
    const colors: Record<string, { bg: string; text: string; glow: string }> = {
        NONE: { bg: 'bg-gray-700', text: 'text-gray-400', glow: '' },
        INFO: { bg: 'bg-blue-600', text: 'text-blue-100', glow: '' },
        WARNING: { bg: 'bg-yellow-500', text: 'text-yellow-900', glow: 'shadow-yellow-500/50' },
        DANGER: { bg: 'bg-orange-600', text: 'text-white', glow: 'shadow-orange-500/50 shadow-lg' },
        CRITICAL: { bg: 'bg-red-600', text: 'text-white', glow: 'shadow-red-500/60 shadow-xl animate-pulse' },
    };

    const style = colors[level] || colors.NONE;

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${style.bg} ${style.text} ${style.glow}`}>
            {level}
        </span>
    );
};

const ThreatCard = ({ threat }: { threat: Threat }) => {
    const levelColors: Record<string, string> = {
        NONE: 'border-gray-600',
        INFO: 'border-blue-500',
        WARNING: 'border-yellow-500',
        DANGER: 'border-orange-500',
        CRITICAL: 'border-red-500 animate-pulse',
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`bg-gray-800/80 rounded-lg p-3 border-l-4 ${levelColors[threat.level]}`}
        >
            <div className="flex justify-between items-center">
                <span className="font-semibold text-white capitalize">{threat.object_class}</span>
                <WarningLevelBadge level={threat.level} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                    <span className="text-gray-400">Distance</span>
                    <div className="text-lg font-mono text-white">{threat.distance}m</div>
                </div>
                <div>
                    <span className="text-gray-400">TTC</span>
                    <div className="text-lg font-mono text-cyan-400">{threat.ttc}s</div>
                </div>
            </div>
        </motion.div>
    );
};

const LaneIndicator = ({ status, offset, steering, confidence }: {
    status: string;
    offset: number;
    steering: number;
    confidence: number;
}) => {
    const getStatusColor = () => {
        switch (status) {
            case 'centered': return 'text-green-400';
            case 'drifting_left':
            case 'drifting_right': return 'text-yellow-400';
            case 'departed_left':
            case 'departed_right': return 'text-red-400';
            default: return 'text-gray-500';
        }
    };

    const getStatusIcon = () => {
        if (status.includes('left')) return '←';
        if (status.includes('right')) return '→';
        return '↑';
    };

    return (
        <div className="bg-gray-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-gray-400 text-sm font-medium">Lane Keeping</h3>
                <span className={`text-2xl ${getStatusColor()}`}>{getStatusIcon()}</span>
            </div>

            {/* Lane visualization */}
            <div className="relative h-16 mb-3">
                <div className="absolute inset-x-4 top-1/2 h-1 bg-gray-600 rounded" />
                <div className="absolute inset-x-4 top-1/2 h-1 flex items-center justify-center">
                    <motion.div
                        animate={{ x: offset * 50 }}
                        className="w-4 h-4 bg-cyan-500 rounded-full shadow-lg shadow-cyan-500/50"
                    />
                </div>
                <div className="absolute left-4 top-1/2 w-1 h-8 -translate-y-1/2 bg-white/30 rounded" />
                <div className="absolute right-4 top-1/2 w-1 h-8 -translate-y-1/2 bg-white/30 rounded" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                    <span className="text-gray-500">Status</span>
                    <div className={`font-medium ${getStatusColor()}`}>{status.replace('_', ' ')}</div>
                </div>
                <div>
                    <span className="text-gray-500">Suggested</span>
                    <div className="font-mono text-white">{steering > 0 ? '+' : ''}{steering}°</div>
                </div>
            </div>

            {/* Confidence bar */}
            <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Confidence</span>
                    <span>{(confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${confidence * 100}%` }}
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                    />
                </div>
            </div>
        </div>
    );
};

const DistanceGauge = ({ distance, zone }: { distance: number; zone: string }) => {
    const zoneColors: Record<string, { ring: string; text: string }> = {
        danger: { ring: 'stroke-red-500', text: 'text-red-400' },
        warning: { ring: 'stroke-yellow-500', text: 'text-yellow-400' },
        safe: { ring: 'stroke-green-500', text: 'text-green-400' },
    };

    const style = zoneColors[zone] || zoneColors.safe;
    const percentage = Math.min(100, (distance / 30) * 100);

    return (
        <div className="bg-gray-800/80 rounded-xl p-4 text-center">
            <h3 className="text-gray-400 text-sm font-medium mb-3">Closest Object</h3>

            <div className="relative w-24 h-24 mx-auto">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle
                        className="stroke-gray-700"
                        strokeWidth="3"
                        fill="none"
                        r="15.5"
                        cx="18"
                        cy="18"
                    />
                    <motion.circle
                        className={style.ring}
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                        r="15.5"
                        cx="18"
                        cy="18"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: percentage / 100 }}
                        transition={{ duration: 0.5 }}
                        style={{
                            strokeDasharray: '100',
                            strokeDashoffset: 100 - percentage
                        }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-2xl font-bold ${style.text}`}>{distance}</span>
                    <span className="text-xs text-gray-500">meters</span>
                </div>
            </div>

            <div className={`mt-2 text-sm font-medium ${style.text} uppercase`}>
                {zone}
            </div>
        </div>
    );
};

const VideoUpload = ({ onUpload }: { onUpload: (file: File) => void }) => {
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('video/')) {
            onUpload(file);
        }
    };

    return (
        <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`
        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
        transition-all duration-200
        ${isDragging ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-600 hover:border-gray-500'}
      `}
        >
            <input
                ref={inputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
            />
            <div className="text-4xl mb-2">🎬</div>
            <div className="text-gray-400">Drop video here or click to upload</div>
            <div className="text-gray-600 text-sm mt-1">Supports MP4, WebM, MOV</div>
        </div>
    );
};

// ============================================================================
// Main Component
// ============================================================================

export const ADASPanel = () => {
    const [adasState, setAdasState] = useState<ADASState | null>(null);
    const [status, setStatus] = useState<ProcessingStatus>({
        status: 'idle',
        current_video: null,
        processed_frames: 0,
        total_frames: 0,
        progress: 0,
    });
    const [wsConnected, setWsConnected] = useState(false);
    const [demoMode, setDemoMode] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    // Demo data for GitHub Pages (no backend)
    const generateDemoData = useCallback((): ADASState => ({
        timestamp: Date.now(),
        frame_id: Math.floor(Math.random() * 1000),
        warning_level: ['NONE', 'INFO', 'WARNING'][Math.floor(Math.random() * 3)],
        warning_message: 'Demo mode - simulated ADAS data',
        threats: [
            { object_class: 'car', distance: 12 + Math.random() * 8, ttc: 2 + Math.random() * 2, level: 'WARNING' },
            { object_class: 'pedestrian', distance: 25 + Math.random() * 10, ttc: 5 + Math.random() * 3, level: 'INFO' },
        ],
        brake_assist: false,
        lane_status: ['centered', 'drifting_left', 'drifting_right'][Math.floor(Math.random() * 3)],
        center_offset: (Math.random() - 0.5) * 0.6,
        suggested_steering: (Math.random() - 0.5) * 10,
        lane_confidence: 0.7 + Math.random() * 0.3,
        min_distance: 8 + Math.random() * 12,
        distance_zone: 'warning',
        fps: 15 + Math.random() * 10,
        processing_time_ms: 50 + Math.random() * 50,
    }), []);

    // WebSocket connection with demo fallback
    useEffect(() => {
        // Check if we're on GitHub Pages (static site)
        const isGitHubPages = window.location.hostname.includes('github.io');

        if (isGitHubPages) {
            // Enable demo mode for GitHub Pages
            setDemoMode(true);
            setAdasState(generateDemoData());

            // Simulate updates
            const interval = setInterval(() => {
                setAdasState(generateDemoData());
            }, 1000);

            return () => clearInterval(interval);
        }

        const wsHost = window.location.hostname || 'localhost';
        const wsUrl = `ws://${wsHost}:8001/ws/adas`;

        let connectionAttempts = 0;
        const maxAttempts = 3;

        const connect = () => {
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                setWsConnected(true);
                setDemoMode(false);
                connectionAttempts = 0;
                console.log('🚗 ADAS WebSocket connected');
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'status') {
                    setStatus(data.data);
                } else {
                    setAdasState(data);
                }
            };

            ws.onclose = () => {
                setWsConnected(false);
                connectionAttempts++;

                if (connectionAttempts >= maxAttempts) {
                    // Fall back to demo mode
                    setDemoMode(true);
                    setAdasState(generateDemoData());
                    console.log('🚗 ADAS: Switched to demo mode (no backend)');
                } else {
                    setTimeout(connect, 3000);
                }
            };

            ws.onerror = () => {
                ws.close();
            };

            wsRef.current = ws;
        };

        connect();

        return () => {
            wsRef.current?.close();
        };
    }, [generateDemoData]);

    // Demo mode auto-update
    useEffect(() => {
        if (demoMode && !wsConnected) {
            const interval = setInterval(() => {
                setAdasState(generateDemoData());
            }, 1500);
            return () => clearInterval(interval);
        }
    }, [demoMode, wsConnected, generateDemoData]);

    const handleVideoUpload = useCallback(async (file: File) => {
        if (demoMode) {
            // Simulate processing in demo mode
            setStatus(prev => ({ ...prev, status: 'processing', progress: 0 }));
            let progress = 0;
            const interval = setInterval(() => {
                progress += 5;
                setStatus(prev => ({ ...prev, progress, processed_frames: progress, total_frames: 100 }));
                if (progress >= 100) {
                    clearInterval(interval);
                    setStatus(prev => ({ ...prev, status: 'completed' }));
                }
            }, 200);
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('http://localhost:8001/api/adas/upload-video', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();

            if (data.success) {
                // Start processing
                await fetch(`http://localhost:8001/api/adas/process?video_path=${encodeURIComponent(data.file_path)}`, {
                    method: 'POST',
                });
            }
        } catch (err) {
            console.error('Upload failed:', err);
        }
    }, [demoMode]);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        🚗 ADAS Vision
                        <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : demoMode ? 'bg-yellow-500' : 'bg-red-500'}`} />
                        {demoMode && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">DEMO</span>}
                    </h2>
                    <p className="text-gray-500 text-sm">Advanced Driver Assistance System</p>
                </div>

                {adasState && (
                    <div className="text-right">
                        <div className="text-sm text-gray-500">Processing</div>
                        <div className="text-lg font-mono text-cyan-400">{adasState.fps.toFixed(0)} FPS</div>
                    </div>
                )}
            </div>

            {/* Critical Warning Banner */}
            <AnimatePresence>
                {adasState?.brake_assist && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-red-600 rounded-xl p-4 text-center animate-pulse"
                    >
                        <div className="text-3xl font-black text-white">⚠️ BRAKE ASSIST ACTIVATED</div>
                        <div className="text-red-100">{adasState.warning_message}</div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            {status.status === 'idle' && !adasState ? (
                <VideoUpload onUpload={handleVideoUpload} />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Threats Panel */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-gray-800/60 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-gray-300 font-medium">Active Threats</h3>
                                {adasState && <WarningLevelBadge level={adasState.warning_level} />}
                            </div>

                            <div className="space-y-3">
                                <AnimatePresence>
                                    {adasState?.threats.map((threat, i) => (
                                        <ThreatCard key={i} threat={threat} />
                                    ))}
                                </AnimatePresence>

                                {(!adasState?.threats || adasState.threats.length === 0) && (
                                    <div className="text-center text-gray-500 py-8">
                                        No active threats detected
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Processing Progress */}
                        {status.status === 'processing' && (
                            <div className="bg-gray-800/60 rounded-xl p-4">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-400">Processing Video</span>
                                    <span className="text-cyan-400">{status.progress.toFixed(1)}%</span>
                                </div>
                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                                        animate={{ width: `${status.progress}%` }}
                                    />
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Frame {status.processed_frames} / {status.total_frames}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Side Panel */}
                    <div className="space-y-4">
                        <DistanceGauge
                            distance={adasState?.min_distance || 0}
                            zone={adasState?.distance_zone || 'safe'}
                        />

                        <LaneIndicator
                            status={adasState?.lane_status || 'no_lane'}
                            offset={adasState?.center_offset || 0}
                            steering={adasState?.suggested_steering || 0}
                            confidence={adasState?.lane_confidence || 0}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ADASPanel;
