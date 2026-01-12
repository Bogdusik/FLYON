# Docker Container Cleanup

## Which PostgreSQL Container to Keep?

For FLYON, you need:
- ✅ **flyon-postgres** (postgis/postgis:14-3.3) - **KEEP THIS ONE**
  - This is the correct container with PostGIS extension
  - Required for geospatial data (flight paths, danger zones)
  - Currently running and healthy

You can remove:
- ❌ **chat-backend-postgres-1** (postgres:15) - **REMOVE THIS**
  - This is from another project (chat-backend)
  - Doesn't have PostGIS extension
  - Not needed for FLYON

## How to Remove Unnecessary Containers

### Option 1: Via Docker Desktop
1. Find "chat-backend-postgres-1" in the list
2. Click the trash can icon (🗑️) to delete it
3. Confirm deletion

### Option 2: Via Command Line
```bash
docker rm chat-backend-postgres-1
```

## Current FLYON Containers

After cleanup, you should have:
- ✅ **flyon-postgres** - PostgreSQL with PostGIS
- ✅ **flyon-redis** - Redis cache

Both should be running and healthy.

## Verify

Check your containers:
```bash
docker ps --filter "name=flyon"
```

Should show:
- flyon-postgres (healthy)
- flyon-redis (healthy)
