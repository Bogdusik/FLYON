#!/bin/bash

# Database backup script for FLYON
# Creates timestamped backups of PostgreSQL database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/flyon_backup_${TIMESTAMP}.sql"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# Database connection (from environment or defaults)
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_USER="${POSTGRES_USER:-flyon}"
DB_NAME="${POSTGRES_DB:-flyon}"

echo -e "${GREEN}🗄️  FLYON Database Backup${NC}"
echo ""

# Check if Docker container is running
if docker ps | grep -q "flyon-postgres"; then
    echo -e "${YELLOW}📦 Using Docker container: flyon-postgres${NC}"
    USE_DOCKER=true
else
    echo -e "${YELLOW}💻 Using local PostgreSQL${NC}"
    USE_DOCKER=false
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Perform backup
echo -e "${YELLOW}⏳ Creating backup...${NC}"

if [ "$USE_DOCKER" = true ]; then
    # Backup from Docker container
    docker exec flyon-postgres pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists > "$BACKUP_FILE"
else
    # Backup from local PostgreSQL
    PGPASSWORD="${POSTGRES_PASSWORD:-flyon_dev_password}" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --clean --if-exists > "$BACKUP_FILE"
fi

# Check if backup was successful
if [ $? -eq 0 ] && [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup created successfully!${NC}"
    echo -e "   File: ${BACKUP_FILE}"
    echo -e "   Size: ${BACKUP_SIZE}"
    
    # Compress backup
    echo -e "${YELLOW}🗜️  Compressing backup...${NC}"
    gzip -f "$BACKUP_FILE"
    COMPRESSED_FILE="${BACKUP_FILE}.gz"
    COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup compressed!${NC}"
    echo -e "   File: ${COMPRESSED_FILE}"
    echo -e "   Size: ${COMPRESSED_SIZE}"
else
    echo -e "${RED}❌ Backup failed!${NC}"
    exit 1
fi

# Clean up old backups
echo -e "${YELLOW}🧹 Cleaning up old backups (older than ${RETENTION_DAYS} days)...${NC}"
find "$BACKUP_DIR" -name "flyon_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
DELETED_COUNT=$(find "$BACKUP_DIR" -name "flyon_backup_*.sql.gz" -type f | wc -l)
echo -e "${GREEN}✅ Cleanup complete. ${DELETED_COUNT} backup(s) retained.${NC}"

echo ""
echo -e "${GREEN}🎉 Backup process completed!${NC}"
