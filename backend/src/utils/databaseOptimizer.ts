import { query } from '../config/database';
import logger from './logger';

/**
 * Database query optimizer utilities
 * Helps identify and optimize slow queries
 */

export interface QueryStats {
  query: string;
  duration: number;
  rows: number;
  timestamp: Date;
}

const slowQueries: QueryStats[] = [];
const SLOW_QUERY_THRESHOLD = 100; // 100ms

/**
 * Log slow queries for analysis
 */
export function logSlowQuery(stats: QueryStats): void {
  if (stats.duration > SLOW_QUERY_THRESHOLD) {
    slowQueries.push(stats);
    
    // Keep only last 100 slow queries
    if (slowQueries.length > 100) {
      slowQueries.shift();
    }

    logger.warn('Slow query detected', {
      duration: stats.duration,
      rows: stats.rows,
      query: stats.query.substring(0, 200),
    });
  }
}

/**
 * Get slow queries for analysis
 */
export function getSlowQueries(): QueryStats[] {
  return [...slowQueries];
}

/**
 * Analyze query performance using EXPLAIN ANALYZE
 * Use this for optimizing specific queries
 */
export async function analyzeQuery(sql: string, params: any[] = []): Promise<any> {
  try {
    const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`;
    const result = await query(explainQuery, params);
    
    if (result.rows.length > 0) {
      return JSON.parse(result.rows[0]['QUERY PLAN']);
    }
    
    return null;
  } catch (error: any) {
    logger.error('Query analysis failed', { error: error.message, sql: sql.substring(0, 200) });
    return null;
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<any> {
  try {
    const stats = await query(`
      SELECT 
        schemaname,
        tablename,
        n_live_tup as row_count,
        n_dead_tup as dead_rows,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC
      LIMIT 20
    `);

    return stats.rows;
  } catch (error: any) {
    logger.error('Failed to get database stats', { error: error.message });
    return [];
  }
}
