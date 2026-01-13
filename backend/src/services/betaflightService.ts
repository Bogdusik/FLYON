/**
 * Betaflight configuration and blackbox log service
 */

import { query } from '../config/database';

export interface BetaflightConfig {
  pid: {
    roll: { p: number; i: number; d: number };
    pitch: { p: number; i: number; d: number };
    yaw: { p: number; i: number; d: number };
  };
  rates: {
    roll: number;
    pitch: number;
    yaw: number;
    tpa_breakpoint?: number;
    tpa_rate?: number;
  };
  filters: {
    gyro_lowpass?: number;
    gyro_lowpass2?: number;
    dterm_lowpass?: number;
    dterm_lowpass2?: number;
    gyro_notch?: { freq: number; cutoff: number };
    dterm_notch?: { freq: number; cutoff: number };
  };
  motor: {
    min_throttle?: number;
    max_throttle?: number;
    motor_pwm_rate?: number;
  };
  battery: {
    voltage_scale?: number;
    current_scale?: number;
  };
  raw_config: Record<string, any>;
}

export interface BlackboxAnalysis {
  flight_time: number;
  max_gforce: number;
  avg_gforce: number;
  vibrations: {
    gyro: { x: number; y: number; z: number };
    accel: { x: number; y: number; z: number };
  };
  pid_performance: {
    roll: { overshoot: number; oscillations: number };
    pitch: { overshoot: number; oscillations: number };
    yaw: { overshoot: number; oscillations: number };
  };
  issues: Array<{
    type: 'vibration' | 'oscillation' | 'overshoot' | 'noise';
    severity: 'low' | 'medium' | 'high';
    description: string;
    timestamp?: number;
  }>;
  recommendations: string[];
}

/**
 * Parse Betaflight diff/dump file
 */
export function parseBetaflightConfig(configText: string): BetaflightConfig {
  const lines = configText.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  const config: BetaflightConfig = {
    pid: { roll: { p: 0, i: 0, d: 0 }, pitch: { p: 0, i: 0, d: 0 }, yaw: { p: 0, i: 0, d: 0 } },
    rates: { roll: 0, pitch: 0, yaw: 0 },
    filters: {},
    motor: {},
    battery: {},
    raw_config: {},
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Parse PID
    const pidMatch = trimmed.match(/^set\s+pid_profile\s*=\s*(\d+)/i);
    if (pidMatch) {
      // PID profile number
      continue;
    }

    // PID values
    const rollPMatch = trimmed.match(/^set\s+pid_roll_p\s*=\s*(\d+)/i);
    if (rollPMatch) config.pid.roll.p = parseInt(rollPMatch[1]);

    const rollIMatch = trimmed.match(/^set\s+pid_roll_i\s*=\s*(\d+)/i);
    if (rollIMatch) config.pid.roll.i = parseInt(rollIMatch[1]);

    const rollDMatch = trimmed.match(/^set\s+pid_roll_d\s*=\s*(\d+)/i);
    if (rollDMatch) config.pid.roll.d = parseInt(rollDMatch[1]);

    const pitchPMatch = trimmed.match(/^set\s+pid_pitch_p\s*=\s*(\d+)/i);
    if (pitchPMatch) config.pid.pitch.p = parseInt(pitchPMatch[1]);

    const pitchIMatch = trimmed.match(/^set\s+pid_pitch_i\s*=\s*(\d+)/i);
    if (pitchIMatch) config.pid.pitch.i = parseInt(pitchIMatch[1]);

    const pitchDMatch = trimmed.match(/^set\s+pid_pitch_d\s*=\s*(\d+)/i);
    if (pitchDMatch) config.pid.pitch.d = parseInt(pitchDMatch[1]);

    const yawPMatch = trimmed.match(/^set\s+pid_yaw_p\s*=\s*(\d+)/i);
    if (yawPMatch) config.pid.yaw.p = parseInt(yawPMatch[1]);

    const yawIMatch = trimmed.match(/^set\s+pid_yaw_i\s*=\s*(\d+)/i);
    if (yawIMatch) config.pid.yaw.i = parseInt(yawIMatch[1]);

    const yawDMatch = trimmed.match(/^set\s+pid_yaw_d\s*=\s*(\d+)/i);
    if (yawDMatch) config.pid.yaw.d = parseInt(yawDMatch[1]);

    // Rates
    const rollRateMatch = trimmed.match(/^set\s+roll_rate\s*=\s*(\d+)/i);
    if (rollRateMatch) config.rates.roll = parseInt(rollRateMatch[1]);

    const pitchRateMatch = trimmed.match(/^set\s+pitch_rate\s*=\s*(\d+)/i);
    if (pitchRateMatch) config.rates.pitch = parseInt(pitchRateMatch[1]);

    const yawRateMatch = trimmed.match(/^set\s+yaw_rate\s*=\s*(\d+)/i);
    if (yawRateMatch) config.rates.yaw = parseInt(yawRateMatch[1]);

    // Filters
    const gyroLowpassMatch = trimmed.match(/^set\s+gyro_lowpass\d*_hz\s*=\s*(\d+)/i);
    if (gyroLowpassMatch) {
      if (!config.filters.gyro_lowpass) {
        config.filters.gyro_lowpass = parseInt(gyroLowpassMatch[1]);
      } else {
        config.filters.gyro_lowpass2 = parseInt(gyroLowpassMatch[1]);
      }
    }

    const dtermLowpassMatch = trimmed.match(/^set\s+dterm_lowpass\d*_hz\s*=\s*(\d+)/i);
    if (dtermLowpassMatch) {
      if (!config.filters.dterm_lowpass) {
        config.filters.dterm_lowpass = parseInt(dtermLowpassMatch[1]);
      } else {
        config.filters.dterm_lowpass2 = parseInt(dtermLowpassMatch[1]);
      }
    }

    // Store all raw config
    const setMatch = trimmed.match(/^set\s+(\w+)\s*=\s*(.+)$/i);
    if (setMatch) {
      const key = setMatch[1];
      const value = setMatch[2].trim();
      config.raw_config[key] = value;
    }
  }

  return config;
}

/**
 * Analyze blackbox log (simplified - full implementation would need blackbox decoder)
 */
export function analyzeBlackboxLog(blackboxData: any): BlackboxAnalysis {
  // This is a simplified analyzer - full implementation would decode .bbl binary format
  const analysis: BlackboxAnalysis = {
    flight_time: 0,
    max_gforce: 0,
    avg_gforce: 0,
    vibrations: {
      gyro: { x: 0, y: 0, z: 0 },
      accel: { x: 0, y: 0, z: 0 },
    },
    pid_performance: {
      roll: { overshoot: 0, oscillations: 0 },
      pitch: { overshoot: 0, oscillations: 0 },
      yaw: { overshoot: 0, oscillations: 0 },
    },
    issues: [],
    recommendations: [],
  };

  // Placeholder analysis - would need actual blackbox decoder
  if (blackboxData && typeof blackboxData === 'object') {
    analysis.flight_time = blackboxData.flight_time || 0;
    analysis.max_gforce = blackboxData.max_gforce || 0;
    analysis.avg_gforce = blackboxData.avg_gforce || 0;
  }

  return analysis;
}

/**
 * Compare two Betaflight configurations
 */
export function compareConfigs(config1: BetaflightConfig, config2: BetaflightConfig): {
  differences: Array<{ key: string; old: any; new: any }>;
  summary: string;
} {
  const differences: Array<{ key: string; old: any; new: any }> = [];

  // Compare PID
  if (JSON.stringify(config1.pid) !== JSON.stringify(config2.pid)) {
    differences.push({
      key: 'pid',
      old: config1.pid,
      new: config2.pid,
    });
  }

  // Compare rates
  if (JSON.stringify(config1.rates) !== JSON.stringify(config2.rates)) {
    differences.push({
      key: 'rates',
      old: config1.rates,
      new: config2.rates,
    });
  }

  // Compare filters
  if (JSON.stringify(config1.filters) !== JSON.stringify(config2.filters)) {
    differences.push({
      key: 'filters',
      old: config1.filters,
      new: config2.filters,
    });
  }

  const summary = differences.length === 0
    ? 'Configurations are identical'
    : `${differences.length} difference(s) found`;

  return { differences, summary };
}

/**
 * Get PID tuning recommendations
 */
export function getPIDRecommendations(config: BetaflightConfig, blackboxAnalysis?: BlackboxAnalysis): string[] {
  const recommendations: string[] = [];

  if (!blackboxAnalysis) {
    return ['Upload blackbox log for detailed recommendations'];
  }

  // Check for oscillations
  if (blackboxAnalysis.pid_performance.roll.oscillations > 50) {
    recommendations.push('High roll oscillations detected - consider reducing roll P or D gain');
  }

  if (blackboxAnalysis.pid_performance.pitch.oscillations > 50) {
    recommendations.push('High pitch oscillations detected - consider reducing pitch P or D gain');
  }

  // Check for overshoot
  if (blackboxAnalysis.pid_performance.roll.overshoot > 20) {
    recommendations.push('Roll overshoot detected - consider increasing roll D or reducing P');
  }

  if (blackboxAnalysis.pid_performance.pitch.overshoot > 20) {
    recommendations.push('Pitch overshoot detected - consider increasing pitch D or reducing P');
  }

  // Check vibrations
  const totalVibration = 
    blackboxAnalysis.vibrations.gyro.x +
    blackboxAnalysis.vibrations.gyro.y +
    blackboxAnalysis.vibrations.gyro.z;

  if (totalVibration > 100) {
    recommendations.push('High vibrations detected - check motor balance and propellers');
    recommendations.push('Consider increasing gyro lowpass filter frequency');
  }

  if (recommendations.length === 0) {
    recommendations.push('Configuration looks good! No major issues detected.');
  }

  return recommendations;
}

/**
 * Save Betaflight config to database
 */
export async function saveBetaflightConfig(
  droneId: string,
  userId: string,
  config: BetaflightConfig,
  configText: string
): Promise<string> {
  const result = await query(
    `INSERT INTO betaflight_configs (drone_id, user_id, config_data, config_text, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id`,
    [droneId, userId, JSON.stringify(config), configText]
  );

  return result.rows[0].id;
}

/**
 * Get Betaflight config history for drone
 */
export async function getBetaflightConfigHistory(droneId: string, userId: string): Promise<any[]> {
  const result = await query(
    `SELECT id, config_data, created_at
     FROM betaflight_configs
     WHERE drone_id = $1 AND user_id = $2
     ORDER BY created_at DESC
     LIMIT 50`,
    [droneId, userId]
  );

  return result.rows.map(row => ({
    id: row.id,
    config: row.config_data,
    created_at: row.created_at,
  }));
}
