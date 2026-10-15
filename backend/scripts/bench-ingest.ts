/**
 * Telemetry ingest benchmark: the old per-point full recompute against the incremental live stats.
 *
 * Needs PostgreSQL + PostGIS with the migrations applied (see docs/performance/telemetry-ingest.md for the exact
 * commands). Usage: npx tsx scripts/bench-ingest.ts [points=9000]
 */
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { pool, query } from '../src/config/database';
import { recomputeFlightStats, recordPoint, updateFlightStats } from '../src/services/flightStats';
import { TelemetrySample } from '../src/services/flightStatsAccumulator';
import { createPoint } from '../src/utils/postgis';

const POINTS = Number(process.argv[2] ?? 9000);
const WINDOW = 500;
const START = Date.UTC(2026, 9, 6, 12, 0, 0);

/** A 10 Hz flight: a slow loop around Dumfries with changing altitude, speed and battery. */
function sample(i: number): Omit<TelemetrySample, 'id'> {
  const angle = (i / POINTS) * Math.PI * 4;
  return {
    timestamp: new Date(START + i * 100),
    latitude: 55.07 + Math.sin(angle) * 0.004,
    longitude: -3.6 + Math.cos(angle) * 0.007,
    altitude: 40 + Math.sin(i / 50) * 25,
    speed: 6 + (i % 90) / 10,
    battery: 100 - (i / POINTS) * 70,
  };
}

async function insertPoint(flightId: string, droneId: string, s: Omit<TelemetrySample, 'id'>): Promise<string> {
  const result = await query(
    `INSERT INTO telemetry (
      flight_id, drone_id, timestamp, position, altitude_meters,
      speed_mps, heading_degrees, battery_percent, flight_mode,
      is_armed, raw_data
    ) VALUES ($1, $2, $3, ST_GeomFromText($4, 4326), $5, $6, $7, $8, $9, $10, $11)
    RETURNING id`,
    [flightId, droneId, s.timestamp, createPoint(s.latitude, s.longitude), s.altitude, s.speed, null, s.battery, null, true, '{}']
  );
  return result.rows[0].id;
}

interface FlightRow {
  duration_seconds: number;
  total_distance_meters: string;
  max_altitude_meters: string;
  max_speed_mps: string;
  min_battery_percent: string;
}

async function readFlight(flightId: string): Promise<FlightRow> {
  const result = await query(
    `SELECT duration_seconds, total_distance_meters, max_altitude_meters, max_speed_mps, min_battery_percent
     FROM flights WHERE id = $1`,
    [flightId]
  );
  return result.rows[0];
}

async function run(mode: 'before' | 'after', userId: string, droneId: string) {
  const flight = await query(
    `INSERT INTO flights (drone_id, user_id, session_id, started_at, status)
     VALUES ($1, $2, $3, $4, 'active') RETURNING id`,
    [droneId, userId, `bench-${mode}-${Date.now()}`, new Date(START)]
  );
  const flightId: string = flight.rows[0].id;

  const perPoint: number[] = [];
  const started = performance.now();
  for (let i = 0; i < POINTS; i++) {
    const s = sample(i);
    const t0 = performance.now();
    const id = await insertPoint(flightId, droneId, s);
    if (mode === 'before') await updateFlightStats(flightId);
    else await recordPoint(flightId, { id, ...s });
    perPoint.push(performance.now() - t0);
  }
  const totalSeconds = (performance.now() - started) / 1000;

  const windows: Array<{ upTo: number; avgMs: number }> = [];
  for (let from = 0; from < POINTS; from += WINDOW) {
    const slice = perPoint.slice(from, from + WINDOW);
    windows.push({ upTo: from + slice.length, avgMs: slice.reduce((a, b) => a + b, 0) / slice.length });
  }
  return { flightId, totalSeconds, windows, live: await readFlight(flightId) };
}

async function main() {
  const versions = await query(`SELECT version() AS pg, PostGIS_Lib_Version() AS postgis`);
  const user = await query(
    `INSERT INTO users (email, password_hash, name) VALUES ($1, 'x', 'bench') RETURNING id`,
    [`bench-${Date.now()}@example.invalid`]
  );
  const userId: string = user.rows[0].id;
  const drone = await query(
    `INSERT INTO drones (user_id, name, device_token) VALUES ($1, 'bench', $2) RETURNING id`,
    [userId, `bench-${Date.now()}`]
  );
  const droneId: string = drone.rows[0].id;

  try {
    const before = await run('before', userId, droneId);
    const after = await run('after', userId, droneId);
    await recomputeFlightStats(after.flightId);
    const afterFinal = await readFlight(after.flightId);

    const ms = (n: number) => n.toFixed(2);
    const lines = [
      `Points: ${POINTS} (10 Hz, ${(POINTS / 600).toFixed(1)} min of flight)`,
      `PostgreSQL: ${versions.rows[0].pg.split(',')[0]} · PostGIS ${versions.rows[0].postgis}`,
      `Node.js ${process.version} · ${os.cpus()[0].model} · ${os.platform()}`,
      '',
      '| Points ingested | Before: full recompute per point | After: incremental |',
      '|---|---|---|',
      ...before.windows.map(
        (w, i) => `| ${w.upTo.toLocaleString('en-GB')} | ${ms(w.avgMs)} ms | ${ms(after.windows[i].avgMs)} ms |`
      ),
      `| **Whole flight** | **${before.totalSeconds.toFixed(1)} s** | **${after.totalSeconds.toFixed(1)} s** |`,
      '',
      '| Flight stats | Before (geodesic, per point) | After, live (haversine) | After, final recompute |',
      '|---|---|---|---|',
      `| Distance, m | ${before.live.total_distance_meters} | ${after.live.total_distance_meters} | ${afterFinal.total_distance_meters} |`,
      `| Duration, s | ${before.live.duration_seconds} | ${after.live.duration_seconds} | ${afterFinal.duration_seconds} |`,
      `| Max altitude, m | ${before.live.max_altitude_meters} | ${after.live.max_altitude_meters} | ${afterFinal.max_altitude_meters} |`,
      `| Max speed, m/s | ${before.live.max_speed_mps} | ${after.live.max_speed_mps} | ${afterFinal.max_speed_mps} |`,
      `| Min battery, % | ${before.live.min_battery_percent} | ${after.live.min_battery_percent} | ${afterFinal.min_battery_percent} |`,
    ];
    process.stdout.write(`${lines.join('\n')}\n`);
  } finally {
    await query(`DELETE FROM users WHERE id = $1`, [userId]);
    await pool.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exit(1);
});
