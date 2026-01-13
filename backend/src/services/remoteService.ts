import { query } from '../config/database';

export interface Remote {
  id: string;
  user_id: string;
  type: 'radiomaster';
  name: string;
  model: string | null;
  status: 'connected' | 'disconnected' | 'connecting';
  last_connected: Date | null;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRemoteInput {
  type: 'radiomaster';
  name: string;
  model?: string;
  metadata?: Record<string, any>;
}

/**
 * Get all remotes for a user
 */
export async function getRemotesByUserId(userId: string): Promise<Remote[]> {
  const result = await query(
    `SELECT id, user_id, type, name, model, status, last_connected, metadata, created_at, updated_at
     FROM remotes
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows as Remote[];
}

/**
 * Get remote by ID
 */
export async function getRemoteById(remoteId: string, userId: string): Promise<Remote | null> {
  const result = await query(
    `SELECT id, user_id, type, name, model, status, last_connected, metadata, created_at, updated_at
     FROM remotes
     WHERE id = $1 AND user_id = $2`,
    [remoteId, userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as Remote;
}

/**
 * Create a new remote
 */
export async function createRemote(userId: string, input: CreateRemoteInput): Promise<Remote> {
  const result = await query(
    `INSERT INTO remotes (user_id, type, name, model, status, metadata)
     VALUES ($1, $2, $3, $4, 'disconnected', $5)
     RETURNING id, user_id, type, name, model, status, last_connected, metadata, created_at, updated_at`,
    [userId, input.type, input.name, input.model || null, JSON.stringify(input.metadata || {})]
  );

  return result.rows[0] as Remote;
}

/**
 * Update remote status
 */
export async function updateRemoteStatus(
  remoteId: string,
  userId: string,
  status: 'connected' | 'disconnected' | 'connecting'
): Promise<Remote> {
  const updates: string[] = ['status = $3'];
  const values: any[] = [remoteId, userId, status];
  const _paramIndex = 4; // Reserved for future use

  if (status === 'connected') {
    updates.push(`last_connected = NOW()`);
  }

  const result = await query(
    `UPDATE remotes
     SET ${updates.join(', ')}
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id, type, name, model, status, last_connected, metadata, created_at, updated_at`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error('Remote not found');
  }

  return result.rows[0] as Remote;
}

/**
 * Update remote metadata
 */
export async function updateRemoteMetadata(
  remoteId: string,
  userId: string,
  metadata: Record<string, any>
): Promise<Remote> {
  const result = await query(
    `UPDATE remotes
     SET metadata = $3
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id, type, name, model, status, last_connected, metadata, created_at, updated_at`,
    [remoteId, userId, JSON.stringify(metadata)]
  );

  if (result.rows.length === 0) {
    throw new Error('Remote not found');
  }

  return result.rows[0] as Remote;
}

/**
 * Delete remote
 */
export async function deleteRemote(remoteId: string, userId: string): Promise<void> {
  const result = await query(
    'DELETE FROM remotes WHERE id = $1 AND user_id = $2',
    [remoteId, userId]
  );

  if (result.rowCount === 0) {
    throw new Error('Remote not found');
  }
}
