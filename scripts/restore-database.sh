#!/bin/bash

# Database restore script for FLYON
# Restores PostgreSQL database from backup file

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backup file is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Backup file not specified${NC}"
    echo "Usage: $0 <backup_file.sql.gz or backup_file.sql>"
    exit 1
fi

BACKUP_FILE="$1"

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Error: Backup file not found: ${BACKUP_FILE}${NC}"
    exit 1
fi

# Database connection (from environment or defaults)
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_USER="${POSTGRES_USER:-flyon}"
DB_NAME="${POSTGRES_DB:-flyon}"

echo -e "${YELLOW}⚠️  WARNING: This will replace all data in the database!${NC}"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}❌ Restore cancelled${NC}"
    exit 0
fi

echo -e "${GREEN}🗄️  FLYON Database Restore${NC}"
echo ""

# Check if Docker container is running
if docker ps | grep -q "flyon-postgres"; then
    echo -e "${YELLOW}📦 Using Docker container: flyon-postgres${NC}"
    USE_DOCKER=true
else
    echo -e "${YELLOW}💻 Using local PostgreSQL${NC}"
    USE_DOCKER=false
fi

# Determine if file is compressed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo -e "${YELLOW}🗜️  Decompressing backup...${NC}"
    TEMP_FILE=$(mktemp)
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
    RESTORE_FILE="$TEMP_FILE"
else
    RESTORE_FILE="$BACKUP_FILE"
fi

# Perform restore
echo -e "${YELLOW}⏳ Restoring database...${NC}"

if [ "$USE_DOCKER" = true ]; then
    # Restore to Docker container
    docker exec -i flyon-postgres psql -U "$DB_USER" -d "$DB_NAME" < "$RESTORE_FILE"
else
    # Restore to local PostgreSQL
    PGPASSWORD="${POSTGRES_PASSWORD:-flyon_dev_password}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "$RESTORE_FILE"
fi

# Cleanup temp file if created
if [ -n "$TEMP_FILE" ] && [ -f "$TEMP_FILE" ]; then
    rm "$TEMP_FILE"
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database restored successfully!${NC}"
else
    echo -e "${RED}❌ Restore failed!${NC}"
    exit 1
fi
