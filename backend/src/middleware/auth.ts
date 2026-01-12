import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';
import { query } from '../config/database';

// Simple in-memory cache for user authentication (5 minutes TTL)
interface UserCacheEntry {
  isActive: boolean;
  timestamp: number;
}

const userCache = new Map<string, UserCacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Express middleware to authenticate user requests
 * Expects JWT token in Authorization header: "Bearer <token>"
 */
export async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (decoded.type !== 'user') {
      res.status(403).json({ error: 'Invalid token type' });
      return;
    }

    // Check cache first
    const cached = userCache.get(decoded.userId);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      // Use cached data (cache hit)
      if (!cached.isActive) {
        res.status(403).json({ error: 'User account is inactive' });
        return;
      }
      
      // Attach user info to request
      (req as any).user = {
        id: decoded.userId,
        email: decoded.email,
      };
      
      next();
      return;
    }

    // Verify user exists and is active (only if not cached or cache expired)
    // This is a cache miss - will query database
    const result = await query(
      'SELECT id, email, name, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const isActive = result.rows[0].is_active;
    
    // Update cache
    userCache.set(decoded.userId, {
      isActive,
      timestamp: now,
    });

    if (!isActive) {
      res.status(403).json({ error: 'User account is inactive' });
      return;
    }

    // Attach user info to request
    (req as any).user = {
      id: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Authentication failed' });
  }
}

// Clean up old cache entries periodically (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [userId, entry] of userCache.entries()) {
    if ((now - entry.timestamp) >= CACHE_TTL) {
      userCache.delete(userId);
    }
  }
}, 10 * 60 * 1000);

/**
 * Express middleware to authenticate device tokens (for telemetry)
 * Expects token in Authorization header or as query parameter
 */
export async function authenticateDevice(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined;

    // Try Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.query.token) {
      // Fallback to query parameter for telemetry endpoints
      token = req.query.token as string;
    }

    if (!token) {
      res.status(401).json({ error: 'Missing device token' });
      return;
    }

    const decoded = verifyToken(token);

    if (decoded.type !== 'device') {
      res.status(403).json({ error: 'Invalid token type' });
      return;
    }

    // Verify drone exists and is active
    const result = await query(
      'SELECT id, user_id, name, is_active FROM drones WHERE id = $1 AND device_token = $2',
      [decoded.droneId, token]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid device token' });
      return;
    }

    if (!result.rows[0].is_active) {
      res.status(403).json({ error: 'Drone is inactive' });
      return;
    }

    // Attach device info to request
    (req as any).device = {
      droneId: decoded.droneId,
      userId: decoded.userId,
    };

    next();
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Device authentication failed' });
  }
}
