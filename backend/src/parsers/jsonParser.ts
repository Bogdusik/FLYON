import { BaseParser } from './baseParser';
import { TelemetryInput } from '../types/database';

/**
 * JSON log parser (for pre-formatted JSON logs)
 */
export class JSONParser extends BaseParser {
  supportsFormat(filename: string, mimeType?: string): boolean {
    return filename.toLowerCase().endsWith('.json') || mimeType === 'application/json';
  }
  
  async parse(fileContent: Buffer | string): Promise<TelemetryInput[]> {
    const content = typeof fileContent === 'string' ? fileContent : fileContent.toString('utf-8');
    const data = JSON.parse(content);
    
    // Handle array of points
    if (Array.isArray(data)) {
      return data
        .map(point => this.normalizePoint(point))
        .filter((point): point is TelemetryInput => point !== null);
    }
    
    // Handle object with points array
    if (data.points && Array.isArray(data.points)) {
      return data.points
        .map((point: any) => this.normalizePoint(point))
        .filter((point): point is TelemetryInput => point !== null);
    }
    
    // Handle single point
    const point = this.normalizePoint(data);
    return point ? [point] : [];
  }
  
  private normalizePoint(point: any): TelemetryInput | null {
    const normalized: Partial<TelemetryInput> = {
      latitude: point.latitude ?? point.lat ?? point.gps_lat,
      longitude: point.longitude ?? point.lon ?? point.lng ?? point.gps_lon,
      altitude: point.altitude ?? point.alt ?? point.gps_alt ?? 0,
      battery: point.battery ?? point.bat ?? point.battery_percent ?? 0,
      speed: point.speed ?? point.velocity ?? point.vel ?? 0,
      heading: point.heading ?? point.yaw ?? point.course,
      flightMode: point.flightMode ?? point.flight_mode ?? point.mode,
      armed: point.armed ?? point.is_armed ?? false,
    };
    
    // Handle timestamp
    if (point.timestamp) {
      normalized.timestamp = this.toISOString(point.timestamp);
    } else if (point.time) {
      normalized.timestamp = this.toISOString(point.time);
    } else if (point.date) {
      normalized.timestamp = this.toISOString(point.date);
    }
    
    return this.validatePoint(normalized);
  }
}
