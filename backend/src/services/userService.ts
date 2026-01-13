import { query } from '../config/database';
import { hashPassword, verifyPassword, generateUserToken, emailSchema, passwordSchema } from '../utils/auth';
import { User } from '../types/database';

/**
 * User service
 * Handles user registration, authentication, and management
 */

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

/**
 * Register a new user
 */
export async function registerUser(input: RegisterInput): Promise<AuthResponse> {
  // Validate input
  emailSchema.parse(input.email);
  passwordSchema.parse(input.password);

  // Check if user already exists
  const existing = await query('SELECT id FROM users WHERE email = $1', [input.email]);
  if (existing.rows.length > 0) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(input.password);

  // Create user
  const result = await query(
    `INSERT INTO users (email, password_hash, name)
     VALUES ($1, $2, $3)
     RETURNING id, email, name`,
    [input.email, passwordHash, input.name || null]
  );

  const user = result.rows[0];

  // Generate token
  const token = generateUserToken(user.id, user.email);

  // Update last login
  await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };
}

/**
 * Authenticate user and return token
 */
export async function loginUser(input: LoginInput): Promise<AuthResponse> {
  // Validate input
  emailSchema.parse(input.email);

  // Find user
  const result = await query(
    'SELECT id, email, name, password_hash, is_active FROM users WHERE email = $1',
    [input.email]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid email or password');
  }

  const user = result.rows[0];

  if (!user.is_active) {
    throw new Error('User account is inactive');
  }

  // Verify password
  const isValid = await verifyPassword(input.password, user.password_hash);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  // Generate token
  const token = generateUserToken(user.id, user.email);

  // Update last login
  await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const result = await query(
    'SELECT id, email, name, phone, avatar_url, created_at, updated_at, last_login, is_active FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as User;
}

/**
 * Update user profile
 */
export async function updateUser(
  userId: string,
  updates: { name?: string; phone?: string; avatar_url?: string }
): Promise<User> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }

  if (updates.phone !== undefined) {
    fields.push(`phone = $${paramIndex++}`);
    values.push(updates.phone || null);
  }

  if (updates.avatar_url !== undefined) {
    fields.push(`avatar_url = $${paramIndex++}`);
    values.push(updates.avatar_url || null);
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(userId);

  const result = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}
     RETURNING id, email, name, phone, avatar_url, created_at, updated_at, last_login, is_active`,
    values
  );

  return result.rows[0] as User;
}

/**
 * Delete user account (GDPR compliance)
 */
export async function deleteUser(userId: string): Promise<void> {
  // Cascade delete will handle related records (drones, flights, etc.)
  await query('DELETE FROM users WHERE id = $1', [userId]);
}
