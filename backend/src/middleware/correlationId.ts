import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Correlation ID middleware
 * Adds unique request ID for tracing requests across services
 */

const CORRELATION_ID_HEADER = 'x-correlation-id';

export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Get correlation ID from header or generate new one
  const correlationId = req.headers[CORRELATION_ID_HEADER] as string || uuidv4();

  // Attach to request for use in handlers
  (req as any).correlationId = correlationId;

  // Add to response header
  res.setHeader(CORRELATION_ID_HEADER, correlationId);

  next();
}

/**
 * Get correlation ID from request
 */
export function getCorrelationId(req: Request): string {
  return (req as any).correlationId || 'unknown';
}
