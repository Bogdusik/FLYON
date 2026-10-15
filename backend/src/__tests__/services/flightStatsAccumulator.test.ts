import {
  accumulate,
  emptyAccumulator,
  TelemetrySample,
  toFlightStats,
} from '../../services/flightStatsAccumulator';
import { calculateDistance } from '../../utils/postgis';

function flight(count: number): TelemetrySample[] {
  const start = Date.UTC(2026, 9, 6, 12, 0, 0);
  return Array.from({ length: count }, (_, i) => ({
    id: `t${i}`,
    timestamp: new Date(start + i * 100),
    latitude: 55.07 + Math.sin(i / 40) * 0.002,
    longitude: -3.6 + i * 0.00002,
    altitude: 20 + Math.sin(i / 25) * 15,
    speed: 5 + (i % 37) * 0.3,
    battery: 100 - i * 0.01,
  }));
}

/** The answer the old per-point SQL gave, computed the slow way: over every point, in timestamp order. */
function recomputeFromScratch(points: TelemetrySample[]) {
  const ordered = [...points].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  let distance = 0;
  for (let i = 1; i < ordered.length; i++) {
    distance += calculateDistance(
      ordered[i - 1].latitude,
      ordered[i - 1].longitude,
      ordered[i].latitude,
      ordered[i].longitude
    );
  }
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  return {
    durationSeconds: Math.floor((last.timestamp.getTime() - first.timestamp.getTime()) / 1000),
    totalDistanceMeters: distance,
    maxAltitude: Math.max(...ordered.map((p) => p.altitude)),
    maxSpeed: Math.max(...ordered.map((p) => p.speed)),
    minBattery: Math.min(...ordered.map((p) => p.battery)),
    startPosition: `POINT(${first.longitude} ${first.latitude})`,
    endPosition: `POINT(${last.longitude} ${last.latitude})`,
  };
}

describe('flight stats accumulator', () => {
  it('gives the same stats as recomputing the whole flight after every point', () => {
    const points = flight(9000);
    const acc = emptyAccumulator();
    for (let n = 1; n <= points.length; n++) {
      accumulate(acc, points[n - 1]);
      if (n === 1 || n === 500 || n === 9000) {
        const expected = recomputeFromScratch(points.slice(0, n));
        const actual = toFlightStats(acc);
        expect(actual.totalDistanceMeters).toBeCloseTo(expected.totalDistanceMeters, 6);
        expect({ ...actual, totalDistanceMeters: 0 }).toEqual({ ...expected, totalDistanceMeters: 0 });
      }
    }
  });

  it('starts empty: no duration, no distance, no positions', () => {
    expect(toFlightStats(emptyAccumulator())).toEqual({
      durationSeconds: null,
      totalDistanceMeters: 0,
      maxAltitude: null,
      maxSpeed: null,
      minBattery: null,
      startPosition: null,
      endPosition: null,
    });
  });

  it('takes start, end and duration from timestamps, not from arrival order', () => {
    const [a, b, c] = flight(3);
    const acc = emptyAccumulator();
    accumulate(acc, b);
    accumulate(acc, a);
    accumulate(acc, c);
    const stats = toFlightStats(acc);
    expect(stats.startPosition).toBe(`POINT(${a.longitude} ${a.latitude})`);
    expect(stats.endPosition).toBe(`POINT(${c.longitude} ${c.latitude})`);
    expect(stats.durationSeconds).toBe(0);
  });
});
