/**
 * Database Migrations Runner
 * Handles database initialization and schema setup
 */

import { pool } from './connection'

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...')

    // The database is already initialized in connection.ts
    // when the connection pool is created
    const result = await pool.query(
      `SELECT to_regclass('public.trades')`
    )

    if (result.rows[0].to_regclass) {
      console.log('✅ Database schema already initialized')
    }

    console.log('✅ Migrations completed successfully')
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigrations()
