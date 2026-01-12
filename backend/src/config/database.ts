import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

/**
 * Database connection pool
 * Uses PostGIS for geospatial queries
 */
export const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'flyon',
  password: process.env.POSTGRES_PASSWORD || 'flyon_dev_password',
  database: process.env.POSTGRES_DB || 'flyon',
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
    console.log('✅ Database connected:', result.rows[0]);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

/**
 * Execute a query with error handling
 */
export async function query(text: string, params?: any[]): Promise<pg.QueryResult> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // Only log slow queries (>50ms) or important queries to reduce noise
    if (duration > 50 || text.includes('SELECT') && text.includes('users') && text.includes('WHERE id')) {
      console.log('Executed query', { 
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''), 
        duration, 
        rows: res.rowCount 
      });
    }
    return res;
  } catch (error) {
    console.error('Query error', { text, error });
    throw error;
  }
}
