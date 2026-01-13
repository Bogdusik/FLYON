import pg from 'pg';
import logger from '../utils/logger';
import env from './env';

const { Pool } = pg;

/**
 * Database connection pool
 * Uses PostGIS for geospatial queries
 */
export const pool = new Pool({
  host: env.postgres.host,
  port: env.postgres.port,
  user: env.postgres.user,
  password: env.postgres.password,
  database: env.postgres.database,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Test database connection
 */
export async function testConnection(): Promise<void> {
  try {
    const result = await pool.query('SELECT NOW(), PostGIS_version()');
    logger.info('✅ Database connected', { 
      postgisVersion: result.rows[0]?.postgis_version 
    });
  } catch (error: any) {
    logger.error('❌ Database connection failed', { 
      error: error.message,
      stack: error.stack 
    });
    throw error;
  }
}

/**
 * Execute a query with error handling and performance monitoring
 */
export async function query(text: string, params?: any[]): Promise<pg.QueryResult> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries for optimization
    if (duration > 100) {
      logger.warn('Slow query detected', { 
        text: text.substring(0, 200) + (text.length > 200 ? '...' : ''), 
        duration, 
        rows: res.rowCount,
        params: params?.length || 0,
      });
    } else if (duration > 50) {
      logger.debug('Query executed', { 
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''), 
        duration, 
        rows: res.rowCount 
      });
    }
    
    return res;
  } catch (error: any) {
    const duration = Date.now() - start;
    logger.error('Query error', { 
      text: text.substring(0, 200),
      error: error.message,
      code: error.code,
      duration,
      params: params?.length || 0,
    });
    throw error;
  }
}
