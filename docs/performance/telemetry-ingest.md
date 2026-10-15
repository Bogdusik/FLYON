# Telemetry ingest: incremental flight statistics

## The problem

Every live telemetry point called `updateFlightStats`, which recomputed the whole flight from the `telemetry` table:
aggregates over every stored point, then a `LAG` window with `ST_Distance` between every consecutive pair. Point *n*
re-read *n* rows and computed *n − 1* distances, so a 15-minute flight at 10 Hz (9,000 points) ran about 40.5 million
distance calculations (Σ 1..9,000) to keep one running total. Per-point cost grew with the length of the flight, and
the flight as a whole was O(N²). Indexes do not help: they speed up finding the rows, not the work done per row.

Write-up: [I Added Every Index, but My Telemetry Pipeline Was Still Quadratic](https://hackernoon.com/i-added-every-index-but-my-telemetry-pipeline-was-still-quadratic).

## The fix

- `services/flightStatsAccumulator.ts`: pure running aggregates (distance as a running sum, max altitude and speed,
  min battery, first and last point by timestamp).
- `services/flightStats.ts`:
  - `recordPoint` adds one stored point to its flight's accumulator and writes the flight row with **one `UPDATE`**.
    The first point of a flight, or the first after a restart, seeds the accumulator once from the stored telemetry.
  - `recomputeFlightStats` runs the full recompute (`updateFlightStats`) **once per flight**: after a log upload, on
    completion and on manual recalculation.
  - Both go through **one queue per flight**: writes for a flight never overlap, and the final recompute always lands
    after the points queued before it.
- Telemetry for a flight that is no longer active is rejected with `409` and gets no accumulator.

Distance on the live path is haversine (a sphere); the final recompute uses `ST_Distance` on `geography` (the WGS84
spheroid). The live value is within a fraction of a percent (0.23% in the run below) and the final recompute replaces
it with the exact one.

### Assumption: one backend instance

The accumulators and the per-flight queues live in the memory of the backend process. With two or more instances
behind a load balancer, each would keep its own accumulator for the same flight and their writes could interleave.
Before scaling out, move the accumulators to Redis (FLYON already runs it) or route each drone to one instance.

## Benchmark

`backend/scripts/bench-ingest.ts` ingests the same synthetic 15-minute flight twice against a real PostgreSQL + PostGIS:
first with the old path (insert, then the full recompute, per point), then with the new one (insert, then
`recordPoint`). Each per-point time includes the `INSERT` round trip. After the second run it calls
`recomputeFlightStats` once, as completion does, and compares the stored statistics.

Run on 2026-10-15, one run:

Points: 9000 (10 Hz, 15.0 min of flight)
PostgreSQL 14.9 · PostGIS 3.3.4 (`postgis/postgis:14-3.3` in Docker Desktop)
Node.js v24.14.0 · AMD Ryzen 9 7900X · Windows 11

Average time per point over each window of 500 points:

| Points ingested | Before: full recompute per point | After: incremental |
|---|---|---|
| 500 | 9.59 ms | 12.90 ms |
| 1,000 | 8.27 ms | 9.50 ms |
| 1,500 | 15.30 ms | 5.25 ms |
| 2,000 | 12.24 ms | 4.44 ms |
| 2,500 | 11.56 ms | 4.29 ms |
| 3,000 | 12.81 ms | 4.44 ms |
| 3,500 | 14.88 ms | 4.41 ms |
| 4,000 | 13.02 ms | 4.10 ms |
| 4,500 | 21.28 ms | 4.07 ms |
| 5,000 | 21.44 ms | 4.43 ms |
| 5,500 | 17.01 ms | 4.21 ms |
| 6,000 | 19.84 ms | 4.04 ms |
| 6,500 | 21.31 ms | 5.65 ms |
| 7,000 | 23.02 ms | 9.19 ms |
| 7,500 | 20.72 ms | 6.43 ms |
| 8,000 | 20.81 ms | 4.04 ms |
| 8,500 | 21.81 ms | 4.53 ms |
| 9,000 | 20.69 ms | 4.19 ms |
| **Whole flight** | **152.8 s** | **50.1 s** |

The old path grows with the number of points already stored (about 9 ms per point at the start, about 21 ms by the
end); the new one stays flat at about 4 ms, most of which is the `INSERT` itself. The first windows of the new path
are slower while the connection pool and caches warm up. Absolute times depend on the machine; the shape of the two
curves does not.

Stored flight statistics:

| Flight stats | Before (geodesic, per point) | After, live (haversine) | After, final recompute |
|---|---|---|---|
| Distance, m | 5606.99 | 5594.25 | 5606.99 |
| Duration, s | 899 | 899 | 899 |
| Max altitude, m | 65.00 | 65.00 | 65.00 |
| Max speed, m/s | 14.90 | 14.90 | 14.90 |
| Min battery, % | 30.01 | 30.01 | 30.01 |

## Reproduce

```bash
docker run -d --name flyon-bench -e POSTGRES_USER=flyon -e POSTGRES_PASSWORD=bench-only \
  -e POSTGRES_DB=flyon_bench -p 127.0.0.1:5440:5432 postgis/postgis:14-3.3

cd backend
export POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=5440 POSTGRES_USER=flyon POSTGRES_PASSWORD=bench-only \
  POSTGRES_DB=flyon_bench JWT_SECRET=bench-only-secret-at-least-32-characters-long LOG_LEVEL=error
npx tsx src/migrations/run.ts
npx tsx scripts/bench-ingest.ts 9000

docker rm -f flyon-bench
```

The benchmark is not part of CI: it needs PostGIS and takes a few minutes. CI runs lint and the unit tests, which
mock the database.

## Not changed here

- Log uploads above 5,957 points exceed the bind-parameter limit of one `INSERT`: [#7](https://github.com/Bogdusik/FLYON/issues/7).
- Migration 003 skips 7 of its 12 indexes because their names already exist: [#8](https://github.com/Bogdusik/FLYON/issues/8).
