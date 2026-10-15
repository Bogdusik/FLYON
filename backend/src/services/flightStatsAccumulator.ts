import { calculateDistance, createPoint } from '../utils/postgis';

/**
 * Running flight statistics, updated one telemetry point at a time.
 *
 * Every aggregate the flight record needs is incremental: max/min against the running value, distance as a running
 * sum that only needs the previous point. That keeps live ingest O(1) per point instead of re-aggregating the whole
 * flight on every point (which made a flight O(N²) overall).
 */

export interface TelemetrySample {
  id: string;
  timestamp: Date;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  battery: number;
}

interface Position {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export interface FlightAccumulator {
  pointCount: number;
  distanceMeters: number;
  maxAltitude: number | null;
  maxSpeed: number | null;
  minBattery: number | null;
  first: Position | null;
  last: Position | null;
  prev: Position | null;
}

export interface FlightStats {
  durationSeconds: number | null;
  totalDistanceMeters: number;
  maxAltitude: number | null;
  maxSpeed: number | null;
  minBattery: number | null;
  startPosition: string | null;
  endPosition: string | null;
}

export function emptyAccumulator(): FlightAccumulator {
  return {
    pointCount: 0,
    distanceMeters: 0,
    maxAltitude: null,
    maxSpeed: null,
    minBattery: null,
    first: null,
    last: null,
    prev: null,
  };
}

const max = (current: number | null, value: number) => (current === null ? value : Math.max(current, value));
const min = (current: number | null, value: number) => (current === null ? value : Math.min(current, value));

/**
 * Adds one point. Distance follows arrival order (haversine on a sphere); start, end and duration follow timestamps,
 * so a late packet does not move them. The end-of-flight recompute in SQL settles both on the exact values.
 */
export function accumulate(acc: FlightAccumulator, sample: TelemetrySample): FlightAccumulator {
  const position: Position = {
    latitude: sample.latitude,
    longitude: sample.longitude,
    timestamp: sample.timestamp.getTime(),
  };

  if (acc.prev) {
    acc.distanceMeters += calculateDistance(acc.prev.latitude, acc.prev.longitude, position.latitude, position.longitude);
  }
  acc.maxAltitude = max(acc.maxAltitude, sample.altitude);
  acc.maxSpeed = max(acc.maxSpeed, sample.speed);
  acc.minBattery = min(acc.minBattery, sample.battery);
  if (!acc.first || position.timestamp < acc.first.timestamp) acc.first = position;
  if (!acc.last || position.timestamp >= acc.last.timestamp) acc.last = position;
  acc.prev = position;
  acc.pointCount += 1;
  return acc;
}

export function toFlightStats(acc: FlightAccumulator): FlightStats {
  return {
    durationSeconds:
      acc.first && acc.last ? Math.floor((acc.last.timestamp - acc.first.timestamp) / 1000) : null,
    totalDistanceMeters: acc.distanceMeters,
    maxAltitude: acc.maxAltitude,
    maxSpeed: acc.maxSpeed,
    minBattery: acc.minBattery,
    startPosition: acc.first ? createPoint(acc.first.latitude, acc.first.longitude) : null,
    endPosition: acc.last ? createPoint(acc.last.latitude, acc.last.longitude) : null,
  };
}
