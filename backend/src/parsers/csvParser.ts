import { BaseParser } from './baseParser';
import { TelemetryInput } from '../types/database';

/**
 * CSV log parser (for DJI and generic CSV logs)
 */
export class CSVParser extends BaseParser {
  supportsFormat(filename: string, mimeType?: string): boolean {
    return filename.toLowerCase().endsWith('.csv') || mimeType === 'text/csv';
  }
  
  async parse(fileContent: Buffer | string): Promise<TelemetryInput[]> {
    const content = typeof fileContent === 'string' ? fileContent : fileContent.toString('utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header and one data row');
    }
    
    // Parse header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const points: TelemetryInput[] = [];
    
    // Find column indices
    const latIdx = this.findColumn(header, ['lat', 'latitude', 'gps_lat']);
    const lonIdx = this.findColumn(header, ['lon', 'longitude', 'lng', 'gps_lon']);
    const altIdx = this.findColumn(header, ['alt', 'altitude', 'height', 'gps_alt']);
    const speedIdx = this.findColumn(header, ['speed', 'velocity', 'vel']);
    const batteryIdx = this.findColumn(header, ['battery', 'bat', 'voltage', 'vbat']);
    const timeIdx = this.findColumn(header, ['time', 'timestamp', 'date', 'datetime']);
    const headingIdx = this.findColumn(header, ['heading', 'yaw', 'course']);
    
    if (latIdx === -1 || lonIdx === -1 || altIdx === -1 || batteryIdx === -1) {
      throw new Error('CSV must contain latitude, longitude, altitude, and battery columns');
    }
    
    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      
      try {
        const lat = parseFloat(values[latIdx]);
        const lon = parseFloat(values[lonIdx]);
        const alt = parseFloat(values[altIdx]);
        const battery = parseFloat(values[batteryIdx]);
        
        if (isNaN(lat) || isNaN(lon) || isNaN(alt) || isNaN(battery)) {
          continue;
        }
        
        const point: Partial<TelemetryInput> = {
          latitude: lat,
          longitude: lon,
          altitude: alt,
          battery: Math.max(0, Math.min(100, battery)), // Clamp 0-100
          speed: speedIdx !== -1 ? parseFloat(values[speedIdx]) || 0 : 0,
          heading: headingIdx !== -1 ? parseFloat(values[headingIdx]) : undefined,
        };
        
        // Parse timestamp
        if (timeIdx !== -1) {
          const timeStr = values[timeIdx];
          try {
            point.timestamp = new Date(timeStr).toISOString();
          } catch {
            // If timestamp parsing fails, use current time
            point.timestamp = new Date().toISOString();
          }
        }
        
        const validated = this.validatePoint(point);
        if (validated) {
          points.push(validated);
        }
      } catch (err) {
        // Skip invalid rows
        continue;
      }
    }
    
    return points;
  }
  
  private findColumn(header: string[], possibleNames: string[]): number {
    for (const name of possibleNames) {
      const idx = header.indexOf(name);
      if (idx !== -1) return idx;
    }
    return -1;
  }
  
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }
}
