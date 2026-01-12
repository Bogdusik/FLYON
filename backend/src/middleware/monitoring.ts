import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Monitoring middleware
 * Tracks API performance and usage
 */

interface RequestMetrics {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  timestamp: Date;
}

const metrics: RequestMetrics[] = [];
const MAX_METRICS = 1000; // Keep last 1000 requests

/**
 * Request monitoring middleware
 */
export function monitoringMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();
  const originalSend = res.send;

  // Override res.send to capture response
  res.send = function (body: any) {
    const duration = Date.now() - startTime;
    
    // Log slow requests (>1 second)
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        duration,
        ip: req.ip,
      });
    }
    
    // Store metrics
    metrics.push({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      timestamp: new Date(),
    });
    
    // Keep only last MAX_METRICS
    if (metrics.length > MAX_METRICS) {
      metrics.shift();
    }
    
    // Call original send
    return originalSend.call(this, body);
  };
  
  next();
}

/**
 * Get API metrics
 */
export function getMetrics(): {
  totalRequests: number;
  averageResponseTime: number;
  requestsByMethod: Record<string, number>;
  requestsByStatus: Record<string, number>;
  slowRequests: RequestMetrics[];
  recentRequests: RequestMetrics[];
} {
  const totalRequests = metrics.length;
  
  if (totalRequests === 0) {
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      requestsByMethod: {},
      requestsByStatus: {},
      slowRequests: [],
      recentRequests: [],
    };
  }
  
  const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
  const averageResponseTime = totalDuration / totalRequests;
  
  const requestsByMethod: Record<string, number> = {};
  const requestsByStatus: Record<string, number> = {};
  
  metrics.forEach(m => {
    requestsByMethod[m.method] = (requestsByMethod[m.method] || 0) + 1;
    requestsByStatus[m.statusCode] = (requestsByStatus[m.statusCode] || 0) + 1;
  });
  
  const slowRequests = metrics
    .filter(m => m.duration > 1000)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10);
  
  const recentRequests = metrics.slice(-20).reverse();
  
  return {
    totalRequests,
    averageResponseTime: Math.round(averageResponseTime),
    requestsByMethod,
    requestsByStatus,
    slowRequests,
    recentRequests,
  };
}

/**
 * Clear metrics
 */
export function clearMetrics(): void {
  metrics.length = 0;
}
