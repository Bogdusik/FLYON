/**
 * PostGIS utility functions
 * Helper functions for working with PostGIS geometries
 */

/**
 * Create a PostGIS POINT from latitude and longitude
 */
export function createPoint(latitude: number, longitude: number): string {
  return `POINT(${longitude} ${latitude})`;
}

/**
 * Create a PostGIS LINESTRING from an array of points
 */
export function createLineString(points: Array<{ lat: number; lon: number }>): string {
  if (points.length < 2) {
    throw new Error('LineString requires at least 2 points');
  }
  const coords = points.map(p => `${p.lon} ${p.lat}`).join(', ');
  return `LINESTRING(${coords})`;
}

/**
 * Create a PostGIS POLYGON from an array of coordinates
 * Coordinates should form a closed ring (first point = last point)
 */
export function createPolygon(coordinates: Array<{ lat: number; lon: number }>): string {
  if (coordinates.length < 4) {
    throw new Error('Polygon requires at least 4 points (closed ring)');
  }
  // Ensure the polygon is closed
  const coords = [...coordinates];
  if (coords[0].lat !== coords[coords.length - 1].lat || 
      coords[0].lon !== coords[coords.length - 1].lon) {
    coords.push(coords[0]);
  }
  const coordString = coords.map(p => `${p.lon} ${p.lat}`).join(', ');
  return `POLYGON((${coordString}))`;
}

/**
 * Parse PostGIS POINT to { lat, lon }
 */
export function parsePoint(pointWkt: string): { lat: number; lon: number } {
  // POINT(lon lat) format
  const match = pointWkt.match(/POINT\(([^ ]+) ([^ ]+)\)/);
  if (!match) {
    throw new Error('Invalid POINT format');
  }
  return {
    lon: parseFloat(match[1]),
    lat: parseFloat(match[2]),
  };
}

/**
 * Calculate distance between two points in meters (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
