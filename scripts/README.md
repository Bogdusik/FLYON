# FLYON Scripts

Helper scripts for development, deployment, and database management.

## Available Scripts

### Setup & Start Scripts

- **`start-all.sh`** - Start all services (Docker, backend, frontend)
- **`start-backend.sh`** - Start backend server only
- **`start-frontend.sh`** - Start frontend server only
- **`start.sh`** - Quick start script
- **`check-setup.sh`** - Verify setup and dependencies

### Database Management

- **`cleanup-database.sh`** - **Delete ALL flights, drones, and related data from database** ⚠️
- **`cleanup-database.ts`** - TypeScript version of cleanup script (for non-Docker setups)
- **`quick_delete_flights.sh`** - Quick delete flights only (legacy, use cleanup-database.sh instead)

### Flight Simulation Scripts

- **`simulate_15min_flight.py`** - Simulate a 15-minute real-time flight with RTH logic
  - See [README_FLIGHT_SIMULATION.md](./README_FLIGHT_SIMULATION.md) for details
- **`test_live_flight.py`** - Create a test flight for live view testing
- **`test_live_flight.sh`** - Shell wrapper for test_live_flight.py
- **`send_continuous_telemetry.py`** - Send continuous telemetry to keep a flight active

### Telemetry Scripts

Located in `scripts/telemetry/`:

- **`send_flight_path.py`** - Send multiple telemetry points to create a flight path (uses one session)
- **`test_telemetry.sh`** - Send a single test telemetry point
- **`send_telemetry_example.sh`** - Example script for sending telemetry

## Usage

Make scripts executable:
```bash
chmod +x scripts/*.sh scripts/telemetry/*.sh
```

### Database Cleanup

⚠️ **WARNING: This will permanently delete ALL data!**

```bash
# Using Docker (recommended)
./scripts/cleanup-database.sh

# Using TypeScript (for non-Docker setups)
npx ts-node scripts/cleanup-database.ts
```

### Flight Simulation

```bash
# Simulate 15-minute flight
python3 scripts/simulate_15min_flight.py

# With custom device token
python3 scripts/simulate_15min_flight.py YOUR_DEVICE_TOKEN
```

### Start Services

```bash
./scripts/start-all.sh
```

## Script Details

### cleanup-database.sh / cleanup-database.ts
**⚠️ DANGER: This deletes ALL flights, drones, telemetry, and related data!**

Completely cleans the database by:
- Deleting all telemetry points
- Deleting all flights (active and completed)
- Deleting all drones
- Deleting related data (betaflight configs, blackbox logs, remotes, shared flights)

### start-all.sh
Starts Docker containers, runs migrations, and starts both backend and frontend servers.

### check-setup.sh
Checks if all prerequisites are installed and configured correctly.

### simulate_15min_flight.py
Sends telemetry data every second for 15 minutes, simulating a real flight with:
- Realistic battery consumption
- Altitude variation
- Automatic RTH when battery is low
- Flight path to destination and back home

See [README_FLIGHT_SIMULATION.md](./README_FLIGHT_SIMULATION.md) for full documentation.

---

For more information, see the main [README.md](../README.md).
