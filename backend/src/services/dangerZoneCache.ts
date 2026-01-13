import { query } from '../config/database';
import { DangerZone } from '../types/database';
import { cache } from '../config/redis';

/**
 * Danger zone cache
 * Caches danger zones to reduce database queries
 * Uses Redis if available, falls back to in-memory cache
 */

interface CachedZone {
  zone: DangerZone;
  timestamp: number;
}

const zoneCache = new Map<string, CachedZone[]>();
const CACHE_TTL = 5 * 60; // 5 minutes in seconds (for Redis)
const MEMORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds (for in-memory)

/**
 * Get cached danger zones for user
 * Uses Redis if available, falls back to in-memory cache
 */
export async function getCachedDangerZones(userId?: string): Promise<DangerZone[]> {
  const cacheKey = `danger_zones:${userId || 'public'}`;

  // Try Redis first
  const redisCached = await cache.get<DangerZone[]>(cacheKey);
  if (redisCached) {
    return redisCached;
  }

  // Fallback to in-memory cache
  const memoryCached = zoneCache.get(cacheKey);
  const now = Date.now();

  if (memoryCached && memoryCached.length > 0 && (now - memoryCached[0].timestamp) < MEMORY_CACHE_TTL) {
    return memoryCached.map(c => c.zone);
  }

  // Cache miss - fetch from database
  const sql = `
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

  // Update both caches
  await cache.set(cacheKey, zones, CACHE_TTL);
  zoneCache.set(cacheKey, zones.map(zone => ({
    zone,
    timestamp: now,
  })));

  return zones;
}

/**
 * Invalidate danger zone cache
 */
export async function invalidateDangerZoneCache(userId?: string): Promise<void> {
  if (userId) {
    // Invalidate Redis cache
    await cache.delete(`danger_zones:${userId}`);
    await cache.delete('danger_zones:public');
    
    // Invalidate in-memory cache
    zoneCache.delete(`danger_zones:${userId}`);
    zoneCache.delete('danger_zones:public');
  } else {
    // Clear all Redis cache
    await cache.deletePattern('danger_zones:*');
    
    // Clear all in-memory cache
    zoneCache.clear();
  }
}

/**
 * Clear expired in-memory cache entries
 * Redis handles TTL automatically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, zones] of zoneCache.entries()) {
    if (zones.length > 0 && (now - zones[0].timestamp) >= MEMORY_CACHE_TTL) {
      zoneCache.delete(key);
    }
  }
}, 10 * 60 * 1000); // Every 10 minutes
