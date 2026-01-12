import { query } from '../config/database';
import { Flight, Telemetry } from '../types/database';

/**
 * Export service for KML/GPX export
 */

/**
 * Export flight to KML format
 */
export async function exportFlightToKML(flightId: string, userId: string): Promise<string> {
  const flight = await query(
    `SELECT * FROM flights WHERE id = $1 AND user_id = $2`,
    [flightId, userId]
  );

  if (flight.rows.length === 0) {
    throw new Error('Flight not found');
  }

  const telemetry = await query(
    `SELECT 
      timestamp,
      ST_X(position) as longitude,
      ST_Y(position) as latitude,
      altitude_meters,
      speed_mps,
      battery_percent
    FROM telemetry
    WHERE flight_id = $1
    ORDER BY timestamp ASC`,
    [flightId]
  );

  const flightData = flight.rows[0];
  const points = telemetry.rows;

  // Generate KML
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${flightData.session_id}</name>
    <description>Flight from ${new Date(flightData.started_at).toISOString()}</description>
    <Placemark>
      <name>Flight Path</name>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>
`;

  for (const point of points) {
    kml += `          ${point.longitude},${point.latitude},${point.altitude_meters || 0}\n`;
  }

  kml += `        </coordinates>
      </LineString>
      <Style>
        <LineStyle>
          <color>ff0000ff</color>
          <width>3</width>
        </LineStyle>
      </Style>
    </Placemark>
  </Document>
</kml>`;

  return kml;
}

/**
 * Export flight to GPX format
 */
export async function exportFlightToGPX(flightId: string, userId: string): Promise<string> {
  const flight = await query(
    `SELECT * FROM flights WHERE id = $1 AND user_id = $2`,
    [flightId, userId]
  );

  if (flight.rows.length === 0) {
    throw new Error('Flight not found');
  }

  const telemetry = await query(
    `SELECT 
      timestamp,
      ST_X(position) as longitude,
      ST_Y(position) as latitude,
      altitude_meters,
      speed_mps,
      battery_percent
    FROM telemetry
    WHERE flight_id = $1
    ORDER BY timestamp ASC`,
    [flightId]
  );

  const flightData = flight.rows[0];
  const points = telemetry.rows;

  // Generate GPX
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="FLYON" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${flightData.session_id}</name>
    <time>${new Date(flightData.started_at).toISOString()}</time>
  </metadata>
  <trk>
    <name>${flightData.session_id}</name>
    <trkseg>
`;

  for (const point of points) {
    gpx += `      <trkpt lat="${point.latitude}" lon="${point.longitude}">
        <ele>${point.altitude_meters || 0}</ele>
        <time>${new Date(point.timestamp).toISOString()}</time>
        <extensions>
          <speed>${point.speed_mps || 0}</speed>
          <battery>${point.battery_percent || 0}</battery>
        </extensions>
      </trkpt>
`;
  }

  gpx += `    </trkseg>
  </trk>
</gpx>`;

  return gpx;
}
