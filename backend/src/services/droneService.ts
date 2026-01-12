import { query } from '../config/database';
import { generateDeviceToken } from '../utils/auth';
import { Drone } from '../types/database';
import { v4 as uuidv4 } from 'uuid';

/**
 * Drone service
 * Handles drone registration, management, and device tokens
 */

export interface CreateDroneInput {
  name: string;
  model?: string;
  manufacturer?: string;
  firmware_version?: string;
  metadata?: Record<string, any>;
}

export interface UpdateDroneInput {
  name?: string;
  model?: string;
  manufacturer?: string;
  firmware_version?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a new drone for a user
 */
export async function createDrone(userId: string, input: CreateDroneInput): Promise<Drone> {
  // Generate device token
  const droneId = uuidv4();
  const deviceToken = generateDeviceToken(droneId, userId);

  const result = await query(
    `INSERT INTO drones (id, user_id, name, model, manufacturer, firmware_version, device_token, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      droneId,
      userId,
      input.name,
      input.model || null,
      input.manufacturer || null,
      input.firmware_version || null,
      deviceToken,
      JSON.stringify(input.metadata || {}),
    ]
  );

  return result.rows[0] as Drone;
}

/**
 * Get all drones for a user
 */
export async function getUserDrones(userId: string): Promise<Drone[]> {
  const result = await query(
    'SELECT * FROM drones WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC',
    [userId]
  );

  return result.rows as Drone[];
}

/**
 * Get drone by ID (with user ownership check)
 */
export async function getDroneById(droneId: string, userId: string): Promise<Drone | null> {
  const result = await query(
    'SELECT * FROM drones WHERE id = $1 AND user_id = $2',
    [droneId, userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as Drone;
}

/**
 * Update drone
 */
export async function updateDrone(
  droneId: string,
  userId: string,
  input: UpdateDroneInput
): Promise<Drone> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(input.name);
  }
  if (input.model !== undefined) {
    fields.push(`model = $${paramIndex++}`);
    values.push(input.model);
  }
  if (input.manufacturer !== undefined) {
    fields.push(`manufacturer = $${paramIndex++}`);
    values.push(input.manufacturer);
  }
  if (input.firmware_version !== undefined) {
    fields.push(`firmware_version = $${paramIndex++}`);
    values.push(input.firmware_version);
  }
  if (input.metadata !== undefined) {
    fields.push(`metadata = $${paramIndex++}`);
    values.push(JSON.stringify(input.metadata));
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(droneId, userId);

  const result = await query(
    `UPDATE drones SET ${fields.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error('Drone not found');
  }

  return result.rows[0] as Drone;
}

/**
 * Regenerate device token for a drone
 */
export async function regenerateDeviceToken(droneId: string, userId: string): Promise<string> {
  const drone = await getDroneById(droneId, userId);
  if (!drone) {
    throw new Error('Drone not found');
  }

  const newToken = generateDeviceToken(droneId, userId);

  await query('UPDATE drones SET device_token = $1 WHERE id = $2', [newToken, droneId]);

  return newToken;
}

/**
 * Delete (deactivate) a drone
 */
export async function deleteDrone(droneId: string, userId: string): Promise<void> {
  const result = await query(
    'UPDATE drones SET is_active = false WHERE id = $1 AND user_id = $2',
    [droneId, userId]
  );

  if (result.rowCount === 0) {
    throw new Error('Drone not found');
  }
}
