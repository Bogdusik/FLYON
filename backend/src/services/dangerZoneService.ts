import { query } from '../config/database';
import { createPolygon } from '../utils/postgis';
import { DangerZone } from '../types/database';
import { getCachedDangerZones, invalidateDangerZoneCache } from './dangerZoneCache';

/**
 * Danger zone service
 * Handles user-defined and community danger zones
 */

export interface CreateDangerZoneInput {
  name: string;
  description?: string;
  zone_type: 'user' | 'community' | 'airport' | 'restricted';
  coordinates: Array<{ lat: number; lon: number }>; // Polygon coordinates
  altitude_limit_meters?: number;
  is_public?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateDangerZoneInput {
  name?: string;
  description?: string;
  coordinates?: Array<{ lat: number; lon: number }>;
  altitude_limit_meters?: number;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Create a danger zone
 */
export async function createDangerZone(
  userId: string | null,
  input: CreateDangerZoneInput
): Promise<DangerZone> {
  if (input.coordinates.length < 4) {
    throw new Error('Polygon requires at least 4 coordinates');
  }

  const geometry = createPolygon(input.coordinates);

  const result = await query(
    `INSERT INTO danger_zones (
      user_id, name, description, zone_type, geometry,
      altitude_limit_meters, is_public, metadata
    ) VALUES ($1, $2, $3, $4, ST_GeomFromText($5, 4326), $6, $7, $8)
    RETURNING 
      id, user_id, name, description, zone_type,
      ST_AsText(geometry) as geometry,
      altitude_limit_meters, is_active, is_public, metadata,
      created_at, updated_at`,
    [
      userId,
      input.name,
      input.description || null,
      input.zone_type,
      geometry,
      input.altitude_limit_meters || null,
      input.is_public || false,
      JSON.stringify(input.metadata || {}),
    ]
  );

  // Invalidate cache when new zone is created
  await invalidateDangerZoneCache(userId || undefined);

  return result.rows[0] as DangerZone;
}

/**
 * Get all danger zones (user's zones + public community zones)
 * Uses cache for better performance
 */
export async function getDangerZones(userId?: string): Promise<DangerZone[]> {
  // Use cached version for better performance
  return await getCachedDangerZones(userId);
}

/**
 * Get danger zone by ID
 */
export async function getDangerZoneById(
  zoneId: string,
  userId?: string
): Promise<DangerZone | null> {
  const result = await query(
    `SELECT 
      id, user_id, name, description, zone_type,
      ST_AsText(geometry) as geometry,
      altitude_limit_meters, is_active, is_public, metadata,
      created_at, updated_at
    FROM danger_zones
    WHERE id = $1 AND (is_public = true OR user_id = $2)`,
    [zoneId, userId || null]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as DangerZone;
}

/**
 * Update danger zone
 */
export async function updateDangerZone(
  zoneId: string,
  userId: string,
  input: UpdateDangerZoneInput
): Promise<DangerZone> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(input.name);
  }

  if (input.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(input.description);
  }

  if (input.coordinates !== undefined) {
    if (input.coordinates.length < 4) {
      throw new Error('Polygon requires at least 4 coordinates');
    }
    const geometry = createPolygon(input.coordinates);
    fields.push(`geometry = ST_GeomFromText($${paramIndex++}, 4326)`);
    values.push(geometry);
  }

  if (input.altitude_limit_meters !== undefined) {
    fields.push(`altitude_limit_meters = $${paramIndex++}`);
    values.push(input.altitude_limit_meters);
  }

  if (input.is_active !== undefined) {
    fields.push(`is_active = $${paramIndex++}`);
    values.push(input.is_active);
  }

  if (input.metadata !== undefined) {
    fields.push(`metadata = $${paramIndex++}`);
    values.push(JSON.stringify(input.metadata));
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(zoneId, userId);

  const result = await query(
    `UPDATE danger_zones SET ${fields.join(', ')}
     WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
     RETURNING 
      id, user_id, name, description, zone_type,
      ST_AsText(geometry) as geometry,
      altitude_limit_meters, is_active, is_public, metadata,
      created_at, updated_at`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error('Danger zone not found');
  }

  // Invalidate cache when zone is updated
  invalidateDangerZoneCache(userId);

  return result.rows[0] as DangerZone;
}

/**
 * Delete danger zone
 */
export async function deleteDangerZone(zoneId: string, userId: string): Promise<void> {
  const result = await query(
    'UPDATE danger_zones SET is_active = false WHERE id = $1 AND user_id = $2',
    [zoneId, userId]
  );

  // Invalidate cache when zone is deleted
  invalidateDangerZoneCache(userId);

  if (result.rowCount === 0) {
    throw new Error('Danger zone not found');
  }
}
