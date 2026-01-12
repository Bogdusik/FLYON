# FLYON Scripts

Helper scripts for development and deployment.

## Available Scripts

### Setup & Start Scripts

- **`start-all.sh`** - Start all services (Docker, backend, frontend)
- **`start-backend.sh`** - Start backend server only
- **`start-frontend.sh`** - Start frontend server only
- **`start.sh`** - Quick start script
- **`check-setup.sh`** - Verify setup and dependencies
- **`quick_delete_flights.sh`** - Delete all flights from database (for testing)

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

Run a script:
```bash
./scripts/start-all.sh
./scripts/telemetry/send_flight_path.py
```

## Script Details

### start-all.sh
Starts Docker containers, runs migrations, and starts both backend and frontend servers.

### check-setup.sh
Checks if all prerequisites are installed and configured correctly.

### send_flight_path.py
Sends 15 telemetry points with different coordinates to create a visible flight path. All points use the same session_id, so they appear in one flight.

---

For more information, see the main [README.md](../README.md).
