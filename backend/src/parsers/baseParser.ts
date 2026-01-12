import { TelemetryInput } from '../types/database';

/**
 * Base parser interface for flight logs
 */
export interface LogParser {
  parse(fileContent: Buffer | string): Promise<TelemetryInput[]>;
  supportsFormat(filename: string, mimeType?: string): boolean;
}

/**
 * Base parser implementation
 */
export abstract class BaseParser implements LogParser {
  abstract parse(fileContent: Buffer | string): Promise<TelemetryInput[]>;
  
  abstract supportsFormat(filename: string, mimeType?: string): boolean;
  
  /**
   * Convert timestamp to ISO string
   */
  protected toISOString(timestamp: number | string | Date): string {
    if (typeof timestamp === 'string') {
      return new Date(timestamp).toISOString();
    }
    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }
    // Assume Unix timestamp in milliseconds
    return new Date(timestamp).toISOString();
  }
  
  /**
   * Validate telemetry point
   */
  protected validatePoint(point: Partial<TelemetryInput>): TelemetryInput | null {
    if (
      typeof point.latitude !== 'number' ||
      typeof point.longitude !== 'number' ||
      typeof point.altitude !== 'number' ||
      typeof point.battery !== 'number'
    ) {
      return null;
    }
    
    // Validate coordinates
    if (point.latitude < -90 || point.latitude > 90) return null;
    if (point.longitude < -180 || point.longitude > 180) return null;
    
    return point as TelemetryInput;
  }
}
