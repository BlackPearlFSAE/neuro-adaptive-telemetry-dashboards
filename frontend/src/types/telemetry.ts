// Telemetry data types for NATS v2.0 - Comprehensive Biosignal Monitoring

export interface DriverData {
    name: string
    mode: string
    heartRate: number
    stress: number
}

export interface EEGBands {
    delta: number
    theta: number
    alpha: number
    beta: number
    gamma: number
}

export interface EEGData {
    samplingRate: number
    status: string
    waveform: number[]
    thetaFocus: number
    betaStress: number
    bands?: EEGBands
    attention?: number
    meditation?: number
}

export interface TelemetrySyncData {
    status: string
    mTeslaPrediction: string
    predictionStatus: string
    circuit: string
    carPosition: number
}

export interface ThrottleCurvePoint {
    x: number
    y: number
}

export interface AdaptiveInterventionData {
    active: boolean
    throttleMapping: 'LINEAR' | 'PROGRESSIVE'
    throttleCurve: ThrottleCurvePoint[]
    cognitiveLoadHud: 'FULL' | 'REDUCED'
    hapticSteering: 'NOMINAL' | 'ENHANCED'
    suggestedIntervention?: string | null
    interventionNeeded?: boolean
}

// === Comprehensive Biosignal Types ===

export interface ECGData {
    waveform: number[]
    heartRate: number
    hrv: {
        rmssd: number
        sdnn: number
        lfHfRatio: number
    }
    quality: string
}

export interface EMGData {
    waveform: number[]
    rmsAmplitude: number
    fatigueIndex: number
    muscleGroups: {
        grip: number
        shoulder: number
        neck: number
    }
    quality: string
}

export interface GSRData {
    waveform: number[]
    skinConductance: number
    arousalIndex: number
    scrPeaks: number
    quality: string
}

export interface PPGData {
    waveform: number[]
    spo2: number
    pulseRate: number
    perfusionIndex: number
    quality: string
}

export interface EyeTrackingData {
    gazeX: number
    gazeY: number
    pupilLeft: number
    pupilRight: number
    blinkRate: number
    cognitiveLoad: number
    drowsiness: number
    quality: string
}

export interface RespirationData {
    waveform: number[]
    rate: number
    depth: number
    regularity: number
    phase: 'inhale' | 'exhale'
    quality: string
}

export interface TemperatureData {
    skin: number
    ambient: number
    thermalComfort: number
    quality: string
}

export interface EOGData {
    horizontalWaveform: number[]
    verticalWaveform: number[]
    saccadeCount: number
    microsleepDetected: boolean
    quality: string
}

export interface MotionData {
    acceleration: { x: number; y: number; z: number }
    gyro: { x: number; y: number; z: number }
    totalGForce: number
    quality: string
}

export interface BiosignalsData {
    ecg: ECGData
    emg: EMGData
    gsr: GSRData
    ppg: PPGData
    eyeTracking: EyeTrackingData
    respiration: RespirationData
    temperature: TemperatureData
    eog: EOGData
    motion: MotionData
}

// === Emotional State Prediction ===

export interface EmotionalStateData {
    stress: number
    focus: number
    fatigue: number
    alertness: number
    anxiety: number
    confidence: number
    frustration: number
    flowState: number
    overallReadiness: number
    safetyRisk: number
    primaryIndicators: string[]
}

// === Main Telemetry Interface ===

export interface TelemetryData {
    timestamp: string
    driver: DriverData
    eeg: EEGData
    telemetrySync: TelemetrySyncData
    adaptiveIntervention: AdaptiveInterventionData
    biosignals?: BiosignalsData
    emotionalState?: EmotionalStateData
    systemStatus: string

    // Vehicle Telemetry (Optional integration)
    motor?: VehicleMotor
    battery?: VehicleBattery
    brakes?: VehicleBrakes
    tires?: VehicleTires
    chassis?: VehicleChassis
    cellMonitoring?: CellMonitoring
}

export interface InterventionUpdate {
    throttleMapping?: 'LINEAR' | 'PROGRESSIVE'
    cognitiveLoadHud?: 'FULL' | 'REDUCED'
    hapticSteering?: 'NOMINAL' | 'ENHANCED'
}

// Signal quality levels
export type SignalQuality = 'excellent' | 'good' | 'moderate' | 'poor' | 'no_signal'

// Device configuration types
export interface DeviceConfig {
    type: string
    connection: string
    pythonLib: string
    sampleRate: number | Record<string, number>
}

// === Vehicle Telemetry ===

export interface VehicleMotor {
    rpm: number
    power_kw: number
    torque_nm: number
    temperature: number
    efficiency: number
    mode: string
    inv_mode: string
    map_setting: number
    status: string
}

export interface VehicleBattery {
    soc: number
    voltage: number
    current: number
    power_kw: number
    temperature: number
    min_cell_temp: number
    max_cell_temp: number
    health_soh: number
    status: string
}

export interface VehicleBrakes {
    front_left_temp: number
    front_right_temp: number
    rear_left_temp: number
    rear_right_temp: number
    pressure_front: number
    pressure_rear: number
    bias_percent: number
    status: string
}

export interface VehicleTire {
    temp: number
    pressure: number
    wear: number
    slip_ratio?: number
    camber?: number
}

export interface VehicleTires {
    front_left: VehicleTire
    front_right: VehicleTire
    rear_left: VehicleTire
    rear_right: VehicleTire
    status: string
}

export interface VehicleChassis {
    speed_kph: number
    steering_angle: number
    throttle_position: number
    brake_position: number
    acceleration_g: {
        lateral: number
        longitudinal: number
        vertical: number
    }
    suspension_travel: {
        fl: number
        fr: number
        rl: number
        rr: number
    }
    downforce_kg: number
    drs_status?: boolean
    safety?: {
        hv_on: boolean
        imd_ok: boolean
        ams_ok: boolean;
        bspd_ok: boolean;
    }
}

export interface AeroComponent {
    downforce_kg: number
    drag_n: number
    angle_deg?: number
    aoa_deg?: number
    efficiency: number
    cl?: number
    cd?: number
    ld_ratio?: number
    surface_temp_c?: number
}

export interface RearWing extends AeroComponent {
    drs_active: boolean
    drs_flap_angle: number
}

export interface Diffuser {
    downforce_kg: number
    expansion_ratio: number
    ground_clearance_mm: number
}

export interface AeroTelemetry {
    front_wing: AeroComponent
    rear_wing: RearWing
    diffuser: Diffuser
    total_downforce_kg: number
    total_drag_n: number
    aero_balance: number // % front
    ride_height_front_mm: number
    ride_height_rear_mm: number
}

export interface EnergyManagement {
    regen_level: number
    attack_mode_active: boolean
    attack_mode_remaining: number
    attack_mode_activations: number
    energy_used_kwh: number
    laps_remaining_est: number
}

export interface PowerMap {
    map_id: number
    name: string
    power_limit: number
    torque_pct: number
    throttle_response: string
}

export interface CellMonitoring {
    voltages: number[]
    min_voltage: number
    max_voltage: number
    balance_active: boolean
}

export interface LapData {
    current: number
    best: number
    last: number
    delta: number
    sector1: number
    sector2: number
    sector3: number
}

export interface TeamMember {
    id: string
    name: string
    role: 'Driver' | 'Race Engineer' | 'Strategist' | 'Data Analyst'
    experience: string
    status: 'Active' | 'Resting' | 'Simulator'
    stats: {
        races: number
        podiums: number
        avgLapTime?: string
    }
    avatarColor: string
}

export interface VehicleTelemetryData {
    timestamp?: string
    motor?: VehicleMotor
    battery?: VehicleBattery
    brakes?: VehicleBrakes
    tires?: VehicleTires
    chassis?: VehicleChassis
    aero?: AeroTelemetry
    energyManagement?: EnergyManagement
    powerMap?: PowerMap
    cellMonitoring?: CellMonitoring
    lap?: LapData
    overallStatus?: string
    isReplay?: boolean
    replayIndex?: number
    totalFrames?: number
}
