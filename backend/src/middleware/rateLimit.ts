import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import env from '../config/env';

/**
 * Rate limiting middleware
 * Protects API from abuse and DDoS attacks
 */

const isDevelopment = env.nodeEnv === 'development';

// General API rate limiter
// Development: 1000 requests per 15 minutes (more lenient for testing)
// Production: 100 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 100, // Higher limit in development
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(req.rateLimit?.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 15 * 60),
    });
  },
  // Skip rate limiting in development if explicitly disabled
  skip: () => env.rateLimit.disabled,
});

// Strict rate limiter for authentication endpoints
// Development: 20 requests per 15 minutes
// Production: 5 requests per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 20 : 5, // Higher limit in development
  message: {
    error: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  skip: () => process.env.DISABLE_RATE_LIMIT === 'true',
});

// File upload rate limiter (10 uploads per hour)
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 uploads per hour
  message: {
    error: 'Too many file uploads, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Telemetry rate limiter (1000 points per minute - for real-time tracking)
export const telemetryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // Allow high frequency for real-time telemetry
  message: {
    error: 'Too many telemetry points, please reduce frequency.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// Batch telemetry rate limiter (10 batches per minute)
export const batchTelemetryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit to 10 batch uploads per minute
  message: {
    error: 'Too many batch telemetry uploads, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
