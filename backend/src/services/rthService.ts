import { query } from '../config/database';
import { calculateDistance } from '../utils/postgis';
import { broadcastRTHCommand } from '../websocket';
import logger from '../utils/logger';

/**
 * RTH (Return to Home) Service
 * Handles automatic return-to-home logic when battery is low
 */

export interface RTHCalculation {
  shouldReturn: boolean;
  distanceToHome: number; // meters
  estimatedTimeToHome: number; // seconds
  batteryNeeded: number; // percentage needed to return
  currentBattery: number;
  batteryMargin: number; // safety margin percentage
  weatherFactor: number; // 0-1, affects battery consumption (wind, etc.)
  urgency: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

export interface WeatherConditions {
  windSpeed: number; // m/s
  windDirection: number; // degrees
  temperature: number; // celsius
  humidity: number; // percentage
  pressure: number; // hPa
  visibility: number; // meters
}

/**
 * Get weather conditions for a location (simplified - in production use real API)
 */
export async function getWeatherConditions(
  _latitude: number,
  _longitude: number
): Promise<WeatherConditions> {
  // TODO: Integrate with real weather API (OpenWeatherMap, etc.)
  // For now, return default conditions
  // Parameters prefixed with _ to indicate they're reserved for future use
  return {
    windSpeed: 5, // m/s - moderate wind
    windDirection: 180, // degrees
    temperature: 20, // celsius
    humidity: 60, // percentage
    pressure: 1013.25, // hPa
    visibility: 10000, // meters
  };
}

/**
 * Calculate weather impact factor on battery consumption
 * Higher wind = more battery needed
 */
function calculateWeatherFactor(weather: WeatherConditions, heading: number): number {
  // Wind resistance factor (0.8 to 1.5)
  // If flying against wind, more battery needed
  const windAngle = Math.abs(weather.windDirection - heading);
  const windComponent = Math.cos((windAngle * Math.PI) / 180) * weather.windSpeed;
  
  // Base factor: 1.0 (no wind impact)
  // Against wind: up to 1.5x battery consumption
  // With wind: down to 0.8x battery consumption
  let factor = 1.0;
  
  if (windComponent > 0) {
    // Flying against wind
    factor = 1.0 + (windComponent / 20) * 0.5; // Max 1.5x at 20 m/s headwind
  } else {
    // Flying with wind
    factor = 1.0 + (windComponent / 20) * 0.2; // Min 0.8x at 20 m/s tailwind
  }
  
  // Temperature impact (cold = less efficient battery)
  if (weather.temperature < 0) {
    factor *= 1.2; // 20% more consumption in cold
  } else if (weather.temperature > 30) {
    factor *= 1.1; // 10% more consumption in heat
  }
  
  return Math.max(0.7, Math.min(1.6, factor)); // Clamp between 0.7 and 1.6
}

/**
 * Calculate RTH requirements for current flight position
 */
export async function calculateRTH(
  flightId: string,
  currentLat: number,
  currentLon: number,
  currentBattery: number,
  currentSpeed: number,
  _currentHeading: number | null,
  currentAltitude: number
): Promise<RTHCalculation> {
  try {
    // Get flight start position (home position)
    const flightResult = await query(
      `SELECT 
        ST_X(start_position) as start_lon,
        ST_Y(start_position) as start_lat,
        drone_id
      FROM flights
      WHERE id = $1`,
      [flightId]
    );

    if (flightResult.rows.length === 0 || !flightResult.rows[0].start_lat) {
      throw new Error('Flight not found or no start position');
    }

    const homeLat = parseFloat(flightResult.rows[0].start_lat);
    const homeLon = parseFloat(flightResult.rows[0].start_lon);

    // Calculate distance to home
    const distanceToHome = calculateDistance(currentLat, currentLon, homeLat, homeLon);

    // Get weather conditions
    const weather = await getWeatherConditions(currentLat, currentLon);
    
    // Calculate heading to home
    const headingToHome = calculateBearing(currentLat, currentLon, homeLat, homeLon);
    
    // Calculate weather factor for return journey
    const weatherFactor = calculateWeatherFactor(weather, headingToHome);

    // Estimate battery consumption per meter (base: ~0.01% per 100m at 10m/s)
    // Adjust for altitude (higher = less efficient), speed, and weather
    const baseConsumptionPerMeter = 0.0001; // 0.01% per 100m
    const altitudeFactor = 1 + (currentAltitude / 1000) * 0.1; // 10% more per 1000m
    const speedFactor = currentSpeed > 0 ? Math.max(0.8, Math.min(1.5, 10 / currentSpeed)) : 1.0;
    
    const consumptionPerMeter = baseConsumptionPerMeter * altitudeFactor * speedFactor * weatherFactor;
    
    // Calculate battery needed for return
    const batteryNeeded = distanceToHome * consumptionPerMeter;
    
    // Add safety margin (20% extra)
    const safetyMargin = batteryNeeded * 0.2;
    const totalBatteryNeeded = batteryNeeded + safetyMargin;

    // Estimate time to return (assuming average speed of 8 m/s, adjusted for wind)
    const averageReturnSpeed = Math.max(5, currentSpeed * (1 - (weather.windSpeed / 30))); // Wind reduces speed
    const estimatedTimeToHome = distanceToHome / averageReturnSpeed;

    // Determine urgency
    let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let shouldReturn = false;
    let message = '';

    const batteryMargin = currentBattery - totalBatteryNeeded;

    if (currentBattery < 15) {
      urgency = 'critical';
      shouldReturn = true;
      message = `CRITICAL: Battery at ${currentBattery.toFixed(1)}%. Immediate RTH required!`;
    } else if (batteryMargin < 5) {
      urgency = 'high';
      shouldReturn = true;
      message = `WARNING: Low battery margin (${batteryMargin.toFixed(1)}%). RTH recommended.`;
    } else if (batteryMargin < 10) {
      urgency = 'medium';
      shouldReturn = true;
      message = `CAUTION: Battery margin low (${batteryMargin.toFixed(1)}%). Consider RTH.`;
    } else if (batteryMargin < 15) {
      urgency = 'low';
      shouldReturn = false;
      message = `Battery sufficient for return (${batteryMargin.toFixed(1)}% margin).`;
    } else {
      urgency = 'low';
      shouldReturn = false;
      message = `Battery healthy (${batteryMargin.toFixed(1)}% margin).`;
    }

    return {
      shouldReturn,
      distanceToHome,
      estimatedTimeToHome,
      batteryNeeded: totalBatteryNeeded,
      currentBattery,
      batteryMargin,
      weatherFactor,
      urgency,
      message,
    };
  } catch (error: any) {
    logger.error('Failed to calculate RTH', { flightId, error: error.message });
    throw error;
  }
}

/**
 * Calculate bearing (heading) from point A to point B
 */
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  bearing = (bearing + 360) % 360; // Normalize to 0-360

  return bearing;
}

/**
 * Trigger automatic RTH for a flight
 */
export async function triggerRTH(flightId: string, droneId: string, reason: string): Promise<void> {
  try {
    // Get home position
    const flightResult = await query(
      `SELECT 
        ST_X(start_position) as start_lon,
        ST_Y(start_position) as start_lat
      FROM flights
      WHERE id = $1`,
      [flightId]
    );

    if (flightResult.rows.length === 0 || !flightResult.rows[0].start_lat) {
      throw new Error('Flight not found or no start position');
    }

    const homeLat = parseFloat(flightResult.rows[0].start_lat);
    const homeLon = parseFloat(flightResult.rows[0].start_lon);

    // Broadcast RTH command via WebSocket
    broadcastRTHCommand(flightId, {
      command: 'RTH',
      target_latitude: homeLat,
      target_longitude: homeLon,
      reason,
      timestamp: new Date().toISOString(),
    });

    // Log RTH event
    logger.info('RTH triggered', {
      flightId,
      droneId,
      reason,
      homeLat,
      homeLon,
    });

    // Add risk event to flight
    // Create the risk event object in TypeScript to avoid PostgreSQL parameter type issues
    const riskEvent = {
      type: 'rth_triggered',
      severity: 'warning',
      message: reason,
      timestamp: new Date().toISOString(),
    };

    // Get current risk_events, append new event, and update
    // This avoids PostgreSQL parameter type inference issues with jsonb_build_object
    const currentEventsResult = await query(
      `SELECT COALESCE(risk_events, '[]'::jsonb) as risk_events FROM flights WHERE id = $1::uuid`,
      [flightId]
    );

    // Parse the JSONB result - PostgreSQL returns it as a parsed object
    let currentEvents: any[] = [];
    try {
      const riskEventsData = currentEventsResult.rows[0]?.risk_events;
      if (riskEventsData) {
        // If it's already parsed (from PostgreSQL), use it directly
        // If it's a string, parse it
        currentEvents = typeof riskEventsData === 'string' 
          ? JSON.parse(riskEventsData)
          : riskEventsData;
        
        // Ensure it's an array
        if (!Array.isArray(currentEvents)) {
          currentEvents = [];
        }
      }
    } catch (err) {
      // If parsing fails, start with empty array
      currentEvents = [];
    }

    // Append new event
    const updatedEvents = [...currentEvents, riskEvent];

    // Update with the new array
    await query(
      `UPDATE flights 
       SET risk_events = $1::jsonb
       WHERE id = $2::uuid`,
      [JSON.stringify(updatedEvents), flightId]
    );
  } catch (error: any) {
    logger.error('Failed to trigger RTH', { flightId, error: error.message });
    throw error;
  }
}
