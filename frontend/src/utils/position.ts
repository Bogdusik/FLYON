/**
 * Utility functions for position parsing
 */

/**
 * Parse PostGIS WKT POINT string to lat/lon
 * @param wkt - WKT string like "POINT(longitude latitude)"
 * @returns Object with lat and lon, or null if parsing fails
 */
export function parsePosition(wkt: string): { lat: number; lon: number } | null {
  if (!wkt) return null;
  
  const match = wkt.match(/POINT\(([^ ]+) ([^ ]+)\)/);
  if (!match) return null;
  
  const lon = parseFloat(match[1]);
  const lat = parseFloat(match[2]);
  
  // Validate coordinates
  if (isNaN(lat) || isNaN(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  
  return { lat, lon };
}
