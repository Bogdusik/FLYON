import { query } from '../config/database';
import { DangerZone } from '../types/database';

/**
 * Danger zone cache
 * Caches danger zones to reduce database queries
 */

interface CachedZone {
  zone: DangerZone;
  timestamp: number;
}

const zoneCache = new Map<string, CachedZone[]>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached danger zones for user
 */
export async function getCachedDangerZones(userId?: string): Promise<DangerZone[]> {
  const cacheKey = userId || 'public';
  const cached = zoneCache.get(cacheKey);
  const now = Date.now();

  // Check if cache is valid
  if (cached && cached.length > 0 && (now - cached[0].timestamp) < CACHE_TTL) {
    return cached.map(c => c.zone);
  }

  // Cache miss - fetch from database
  let sql = `
    SELECT 
      id, user_id, name, description, zone_type,
      ST_AsText(geometry) as geometry,
      altitude_limit_meters, is_active, is_public, metadata,
      created_at, updated_at
    FROM danger_zones
    WHERE is_active = true
      AND (is_public = true OR user_id = $1)
    ORDER BY zone_type, name
  `;

  const result = await query(sql, [userId || null]);
  const zones = result.rows as DangerZone[];

  // Update cache
  zoneCache.set(cacheKey, zones.map(zone => ({
    zone,
    timestamp: now,
  })));

  return zones;
}

/**
 * Invalidate danger zone cache
 */
export function invalidateDangerZoneCache(userId?: string): void {
  if (userId) {
    zoneCache.delete(userId);
    zoneCache.delete('public'); // Also invalidate public cache
  } else {
    zoneCache.clear(); // Clear all if no userId specified
  }
}

/**
 * Clear expired cache entries
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, zones] of zoneCache.entries()) {
    if (zones.length > 0 && (now - zones[0].timestamp) >= CACHE_TTL) {
      zoneCache.delete(key);
    }
  }
}, 10 * 60 * 1000); // Every 10 minutes
