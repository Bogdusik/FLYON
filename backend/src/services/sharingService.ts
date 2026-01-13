/**
 * Flight sharing and public profiles service
 */

import { query } from '../config/database';
import { randomBytes } from 'crypto';

/**
 * Create a shareable link for a flight
 */
export async function createFlightShare(
  flightId: string,
  userId: string,
  isPublic: boolean = true,
  expiresInDays?: number
): Promise<{ share_token: string; share_url: string }> {
  // Verify flight belongs to user
  const flightCheck = await query(
    'SELECT id FROM flights WHERE id = $1 AND user_id = $2',
    [flightId, userId]
  );

  if (flightCheck.rows.length === 0) {
    throw new Error('Flight not found');
  }

  // Generate unique token
  const shareToken = randomBytes(32).toString('hex');
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  await query(
    `INSERT INTO flight_shares (flight_id, user_id, share_token, is_public, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (share_token) DO NOTHING`,
    [flightId, userId, shareToken, isPublic, expiresAt]
  );

  const shareUrl = `/shared/flights/${shareToken}`;

  return { share_token: shareToken, share_url: shareUrl };
}

/**
 * Get flight by share token
 */
export async function getFlightByShareToken(shareToken: string): Promise<any> {
  const result = await query(
    `SELECT fs.*, f.*
     FROM flight_shares fs
     JOIN flights f ON f.id = fs.flight_id
     WHERE fs.share_token = $1
       AND fs.is_public = true
       AND (fs.expires_at IS NULL OR fs.expires_at > NOW())`,
    [shareToken]
  );

  if (result.rows.length === 0) {
    return null;
  }

  // Increment view count
  await query(
    'UPDATE flight_shares SET view_count = view_count + 1 WHERE share_token = $1',
    [shareToken]
  );

  return result.rows[0];
}

/**
 * Get user's shared flights
 */
export async function getUserSharedFlights(userId: string): Promise<any[]> {
  const result = await query(
    `SELECT fs.*, f.session_id, f.started_at, f.duration_seconds
     FROM flight_shares fs
     JOIN flights f ON f.id = fs.flight_id
     WHERE fs.user_id = $1
     ORDER BY fs.created_at DESC`,
    [userId]
  );

  return result.rows;
}

/**
 * Delete flight share
 */
export async function deleteFlightShare(shareToken: string, userId: string): Promise<void> {
  await query(
    'DELETE FROM flight_shares WHERE share_token = $1 AND user_id = $2',
    [shareToken, userId]
  );
}

/**
 * Check and unlock achievements
 */
export async function checkAchievements(userId: string): Promise<any[]> {
  const newAchievements: any[] = [];

  // Get user stats
  const stats = await query(
    `SELECT 
      COUNT(*) as total_flights,
      SUM(duration_seconds) as total_time,
      MAX(max_speed_mps) as max_speed,
      MAX(max_altitude_meters) as max_altitude
     FROM flights
     WHERE user_id = $1 AND status = 'completed'`,
    [userId]
  );

  const statsData = stats.rows[0];

  // Check for achievements
  const achievements = [
    {
      type: 'first_flight',
      condition: parseInt(statsData.total_flights) >= 1,
      data: { flights: parseInt(statsData.total_flights) },
    },
    {
      type: '10_flights',
      condition: parseInt(statsData.total_flights) >= 10,
      data: { flights: parseInt(statsData.total_flights) },
    },
    {
      type: '100_flights',
      condition: parseInt(statsData.total_flights) >= 100,
      data: { flights: parseInt(statsData.total_flights) },
    },
    {
      type: 'speed_demon',
      condition: parseFloat(statsData.max_speed) >= 50,
      data: { max_speed: parseFloat(statsData.max_speed) },
    },
    {
      type: 'high_flyer',
      condition: parseFloat(statsData.max_altitude) >= 100,
      data: { max_altitude: parseFloat(statsData.max_altitude) },
    },
  ];

  for (const achievement of achievements) {
    if (achievement.condition) {
      // Check if already unlocked
      const existing = await query(
        'SELECT id FROM user_achievements WHERE user_id = $1 AND achievement_type = $2',
        [userId, achievement.type]
      );

      if (existing.rows.length === 0) {
        // Unlock achievement
        await query(
          `INSERT INTO user_achievements (user_id, achievement_type, achievement_data)
           VALUES ($1, $2, $3)`,
          [userId, achievement.type, JSON.stringify(achievement.data)]
        );

        newAchievements.push({
          type: achievement.type,
          data: achievement.data,
        });
      }
    }
  }

  return newAchievements;
}

/**
 * Get user achievements
 */
export async function getUserAchievements(userId: string): Promise<any[]> {
  const result = await query(
    `SELECT achievement_type, achievement_data, unlocked_at
     FROM user_achievements
     WHERE user_id = $1
     ORDER BY unlocked_at DESC`,
    [userId]
  );

  return result.rows;
}

/**
 * Update public profile settings
 */
export async function updatePublicProfile(
  userId: string,
  settings: {
    is_public?: boolean;
    profile_bio?: string;
    profile_avatar_url?: string;
  }
): Promise<void> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (settings.is_public !== undefined) {
    updates.push(`is_public_profile = $${paramIndex++}`);
    values.push(settings.is_public);
  }

  if (settings.profile_bio !== undefined) {
    updates.push(`profile_bio = $${paramIndex++}`);
    values.push(settings.profile_bio);
  }

  if (settings.profile_avatar_url !== undefined) {
    updates.push(`profile_avatar_url = $${paramIndex++}`);
    values.push(settings.profile_avatar_url);
  }

  if (updates.length === 0) return;

  values.push(userId);
  await query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
    values
  );
}
