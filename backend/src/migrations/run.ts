import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';

/**
 * Run database migrations
 * Reads SQL files from migrations directory and executes them in order
 */
async function runMigrations() {
  const migrationsDir = path.join(__dirname);
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`Running migration: ${file}`);
    
    try {
      await pool.query(sql);
      console.log(`✅ Migration ${file} completed`);
    } catch (error: any) {
      // Ignore "already exists" errors for idempotency
      if (error.message.includes('already exists')) {
        console.log(`⚠️  Migration ${file} already applied (skipping)`);
      } else {
        console.error(`❌ Migration ${file} failed:`, error.message);
        throw error;
      }
    }
  }

  console.log('✅ All migrations completed');
  await pool.end();
}

runMigrations().catch(console.error);
