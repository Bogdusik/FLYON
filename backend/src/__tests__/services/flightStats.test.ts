jest.mock('../../config/database', () => ({
  query: jest.fn(),
}));

import { query } from '../../config/database';
import {
  liveFlightCount,
  recomputeFlightStats,
  recordPoint,
  resetLiveFlightStatsForTests,
} from '../../services/flightStats';
import { TelemetrySample } from '../../services/flightStatsAccumulator';
import { calculateDistance } from '../../utils/postgis';

const mockQuery = query as jest.MockedFunction<typeof query>;
const FLIGHT = 'flight-1';

let table: TelemetrySample[];
let status: string;
let seedReads: number;
let liveUpdates: unknown[][];
let fullUpdates: number;
let updateLog: string[];
let updateDelayMs: number;
let inFlight: number;
let maxInFlight: number;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function point(i: number): TelemetrySample {
  return {
    id: `t${i}`,
    timestamp: new Date(Date.UTC(2026, 9, 6, 12) + i * 100),
    latitude: 55.07 + i * 0.00001,
    longitude: -3.6 + i * 0.00002,
    altitude: 20 + (i % 7),
    speed: 4 + (i % 5),
    battery: 100 - i * 0.01,
  };
}

function bruteForceDistance(points: TelemetrySample[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    d += calculateDistance(points[i - 1].latitude, points[i - 1].longitude, points[i].latitude, points[i].longitude);
  }
  return d;
}

/** Inserts the row (as the ingest path does) and then hands the point to the live stats. */
function ingest(i: number): Promise<void> {
  const p = point(i);
  table.push(p);
  return recordPoint(FLIGHT, p);
}

beforeEach(() => {
  resetLiveFlightStatsForTests();
  table = [];
  status = 'active';
  seedReads = 0;
  liveUpdates = [];
  fullUpdates = 0;
  updateLog = [];
  updateDelayMs = 0;
  inFlight = 0;
  maxInFlight = 0;

  mockQuery.mockReset();
  mockQuery.mockImplementation((async (sql: string, params?: unknown[]) => {
    if (sql.includes('SELECT status FROM flights')) {
      return { rows: [{ status }], rowCount: 1 };
    }
    if (sql.includes('live-seed')) {
      seedReads += 1;
      return {
        rows: [...table]
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
          .map((p) => ({
            id: p.id,
            timestamp: p.timestamp.toISOString(),
            latitude: String(p.latitude),
            longitude: String(p.longitude),
            altitude_meters: String(p.altitude),
            speed_mps: String(p.speed),
            battery_percent: String(p.battery),
          })),
        rowCount: table.length,
      };
    }
    if (sql.includes('live-stats')) {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await sleep(updateDelayMs);
      liveUpdates.push(params ?? []);
      updateLog.push('live');
      inFlight -= 1;
      return { rows: [], rowCount: 1 };
    }
    // The full recompute (updateFlightStats): answer its reads, record its write.
    if (sql.includes('COUNT(*) as point_count')) {
      return { rows: [{ point_count: String(table.length), first_timestamp: null, last_timestamp: null }], rowCount: 1 };
    }
    if (sql.includes('ordered_telemetry')) return { rows: [{ total_distance: '0' }], rowCount: 1 };
    if (sql.includes('ST_AsText(position) as position')) return { rows: [], rowCount: 0 };
    if (sql.includes('UPDATE flights SET')) {
      fullUpdates += 1;
      updateLog.push('full');
      return { rows: [], rowCount: 1 };
    }
    throw new Error(`Unexpected query: ${sql}`);
  }) as unknown as typeof query);
});

describe('live flight stats', () => {
  it('reads the flight once, then costs one UPDATE per point and no telemetry scan', async () => {
    for (let i = 0; i < 100; i++) await ingest(i);
    expect(seedReads).toBe(1);
    expect(liveUpdates).toHaveLength(100);
  });

  it('writes the same totals a full recomputation would give', async () => {
    for (let i = 0; i < 50; i++) await ingest(i);
    const [duration, distance, maxAltitude, maxSpeed, minBattery, start, end, id] = liveUpdates[49];
    expect(id).toBe(FLIGHT);
    expect(duration).toBe(4);
    expect(distance as number).toBeCloseTo(bruteForceDistance(table), 6);
    expect(maxAltitude).toBe(Math.max(...table.map((p) => p.altitude)));
    expect(maxSpeed).toBe(Math.max(...table.map((p) => p.speed)));
    expect(minBattery).toBe(Math.min(...table.map((p) => p.battery)));
    expect(start).toBe(`POINT(${table[0].longitude} ${table[0].latitude})`);
    expect(end).toBe(`POINT(${table[49].longitude} ${table[49].latitude})`);
  });

  it('never runs two writes for one flight at once, so an older snapshot cannot land last', async () => {
    updateDelayMs = 5;
    await Promise.all([0, 1, 2, 3, 4].map((i) => ingest(i)));
    expect(maxInFlight).toBe(1);
    const distances = liveUpdates.map((u) => u[1] as number);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    expect(distances[4]).toBeCloseTo(bruteForceDistance(table), 6);
  });

  it('after a restart, seeds from the table once without counting the seeded points twice', async () => {
    for (let i = 0; i < 50; i++) table.push(point(i)); // stored before the restart
    await ingest(50);
    await ingest(51);
    expect(seedReads).toBe(1);
    expect(liveUpdates[1][1] as number).toBeCloseTo(bruteForceDistance(table), 6);
  });

  it('queues the final recompute behind pending points; later points for the finished flight are dropped', async () => {
    await ingest(0);
    updateDelayMs = 5;
    const pending = ingest(1);
    status = 'completed';
    const final = recomputeFlightStats(FLIGHT);
    await Promise.all([pending, final]);
    expect(updateLog).toEqual(['live', 'live', 'full']);
    expect(liveFlightCount()).toBe(0);

    await recordPoint(FLIGHT, point(2));
    expect(updateLog).toEqual(['live', 'live', 'full']);
    expect(fullUpdates).toBe(1);
    expect(liveFlightCount()).toBe(0);
  });
});
