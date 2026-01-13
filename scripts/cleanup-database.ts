#!/usr/bin/env ts-node

/**
 * Database Cleanup Script
 * 
 * This script will:
 * - Delete all flights (active and completed)
 * - Delete all drones
 * - Clean up related data (telemetry, betaflight configs, etc.)
 * 
 * WARNING: This will permanently delete all data!
 */

import path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from backend directory
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

// Import after dotenv is configured
import { pool } from '../backend/src/config/database';

async function cleanupDatabase() {
  console.log('🧹 Starting database cleanup...\n');

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection established\n');

    // Start transaction for safety
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      console.log('📊 Checking current data...');
      
      // Count current data
      const flightsCount = await client.query('SELECT COUNT(*) FROM flights');
      const dronesCount = await client.query('SELECT COUNT(*) FROM drones');
      const telemetryCount = await client.query('SELECT COUNT(*) FROM telemetry');
      
      console.log(`   Flights: ${flightsCount.rows[0].count}`);
      console.log(`   Drones: ${dronesCount.rows[0].count}`);
      console.log(`   Telemetry points: ${telemetryCount.rows[0].count}\n`);

      if (parseInt(flightsCount.rows[0].count) === 0 && parseInt(dronesCount.rows[0].count) === 0) {
        console.log('✅ Database is already clean!\n');
        await client.query('ROLLBACK');
        return;
      }

      console.log('🗑️  Deleting data...\n');

      // Delete in correct order (respecting foreign key constraints)
      // 1. Delete telemetry (referenced by flights)
      console.log('   Deleting telemetry...');
      const telemetryResult = await client.query('DELETE FROM telemetry');
      console.log(`   ✅ Deleted ${telemetryResult.rowCount} telemetry points`);

      // 2. Delete blackbox logs (referenced by flights)
      console.log('   Deleting blackbox logs...');
      try {
        const blackboxResult = await client.query('DELETE FROM blackbox_logs');
        console.log(`   ✅ Deleted ${blackboxResult.rowCount} blackbox logs`);
      } catch (err: any) {
        if (err.message.includes('does not exist')) {
          console.log('   ⚠️  Blackbox logs table does not exist (skipping)');
        } else {
          throw err;
        }
      }

      // 3. Delete betaflight configs (referenced by drones)
      console.log('   Deleting betaflight configs...');
      try {
        const betaflightResult = await client.query('DELETE FROM betaflight_configs');
        console.log(`   ✅ Deleted ${betaflightResult.rowCount} betaflight configs`);
      } catch (err: any) {
        if (err.message.includes('does not exist')) {
          console.log('   ⚠️  Betaflight configs table does not exist (skipping)');
        } else {
          throw err;
        }
      }

      // 4. Delete betaflight config history (referenced by drones)
      console.log('   Deleting betaflight config history...');
      try {
        const betaflightHistoryResult = await client.query('DELETE FROM betaflight_config_history');
        console.log(`   ✅ Deleted ${betaflightHistoryResult.rowCount} betaflight config history entries`);
      } catch (err: any) {
        if (err.message.includes('does not exist')) {
          console.log('   ⚠️  Betaflight config history table does not exist (skipping)');
        } else {
          throw err;
        }
      }

      // 5. Delete flights (CASCADE will handle related data)
      console.log('   Deleting flights...');
      const flightsResult = await client.query('DELETE FROM flights');
      console.log(`   ✅ Deleted ${flightsResult.rowCount} flights`);

      // 6. Delete drones (CASCADE will handle related data)
      console.log('   Deleting drones...');
      const dronesResult = await client.query('DELETE FROM drones');
      console.log(`   ✅ Deleted ${dronesResult.rowCount} drones`);

      // 7. Delete remotes (optional, but clean)
      console.log('   Deleting remotes...');
      try {
        const remotesResult = await client.query('DELETE FROM remotes');
        console.log(`   ✅ Deleted ${remotesResult.rowCount} remotes`);
      } catch (err: any) {
        if (err.message.includes('does not exist')) {
          console.log('   ⚠️  Remotes table does not exist (skipping)');
        } else {
          throw err;
        }
      }

      // 8. Delete shared flights (if any)
      console.log('   Deleting shared flights...');
      try {
        const sharedFlightsResult = await client.query('DELETE FROM shared_flights');
        console.log(`   ✅ Deleted ${sharedFlightsResult.rowCount} shared flights`);
      } catch (err: any) {
        if (err.message.includes('does not exist')) {
          console.log('   ⚠️  Shared flights table does not exist (skipping)');
        } else {
          throw err;
        }
      }

      // Commit transaction
      await client.query('COMMIT');
      console.log('\n✅ Database cleanup completed successfully!\n');

      // Verify cleanup
      console.log('📊 Verifying cleanup...');
      const finalFlightsCount = await client.query('SELECT COUNT(*) FROM flights');
      const finalDronesCount = await client.query('SELECT COUNT(*) FROM drones');
      const finalTelemetryCount = await client.query('SELECT COUNT(*) FROM telemetry');
      
      console.log(`   Flights: ${finalFlightsCount.rows[0].count}`);
      console.log(`   Drones: ${finalDronesCount.rows[0].count}`);
      console.log(`   Telemetry points: ${finalTelemetryCount.rows[0].count}\n`);

      if (parseInt(finalFlightsCount.rows[0].count) === 0 && 
          parseInt(finalDronesCount.rows[0].count) === 0 &&
          parseInt(finalTelemetryCount.rows[0].count) === 0) {
        console.log('✅ Database is now clean!\n');
      } else {
        console.log('⚠️  Some data may still remain. Please check manually.\n');
      }

    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Error during cleanup:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run cleanup
cleanupDatabase().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
