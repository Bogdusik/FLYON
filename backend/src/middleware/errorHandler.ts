import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Database errors
  if (err.message.includes('duplicate key')) {
    res.status(409).json({ error: 'Resource already exists' });
    return;
  }

  if (err.message.includes('violates foreign key constraint')) {
    res.status(400).json({ error: 'Invalid reference' });
    return;
  }

  // Validation errors
  if (err.name === 'ValidationError' || err.name === 'ZodError') {
    res.status(400).json({ error: err.message });
    return;
  }

  // Default error
  const isProduction = process.env.NODE_ENV === 'production';
  res.status(500).json({
    error: isProduction 
      ? 'Internal server error' 
      : err.message,
  });
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
