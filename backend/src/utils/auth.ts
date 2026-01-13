import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import env from '../config/env';

const JWT_SECRET = env.jwt.secret;
const JWT_EXPIRES_IN = env.jwt.expiresIn;
const JWT_DEVICE_TOKEN_EXPIRES_IN = env.jwt.deviceTokenExpiresIn;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token for user authentication
 */
export function generateUserToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email, type: 'user' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as SignOptions
  );
}

/**
 * Generate device token for drone telemetry authentication
 */
export function generateDeviceToken(droneId: string, userId: string): string {
  return jwt.sign(
    { droneId, userId, type: 'device' },
    JWT_SECRET,
    { expiresIn: JWT_DEVICE_TOKEN_EXPIRES_IN } as SignOptions
  );
}

/**
 * Verify and decode JWT token
 * @throws Error if token is invalid or expired
 */
export function verifyToken(token: string): { userId: string; email?: string; droneId?: string; type: string } {
  if (!token) {
    throw new Error('Token is required');
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Password validation schema
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Email validation schema
 */
export const emailSchema = z.string().email('Invalid email address');
