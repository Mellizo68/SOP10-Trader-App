/**
 * Database Initialization Script
 * Creates trades table if it doesn't exist
 */

import pkg from 'pg';
const { Pool } = pkg;

async function initDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://trader:tradersecret@localhost:5432/sop10_trader',
  });

  try {
    const client = await pool.connect();

    console.log('🔄 Checking/Creating trades table...');

    // Create trades table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS trades (
        id VARCHAR(255) PRIMARY KEY,
        entry_number INTEGER UNIQUE NOT NULL,
        date_entry DATE NOT NULL DEFAULT CURRENT_DATE,
        symbol VARCHAR(20) NOT NULL,
        strategy VARCHAR(100),
        strike_price NUMERIC(10, 2),
        delta NUMERIC(5, 3),
        days_to_expiration INTEGER,
        iv_percent NUMERIC(5, 2),
        gex_status VARCHAR(50),
        pvp_status VARCHAR(50),
        vwap_status VARCHAR(50),
        confluence_score INTEGER,
        entry_price NUMERIC(12, 2) NOT NULL,
        take_profit NUMERIC(12, 2),
        stop_loss NUMERIC(12, 2),
        status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
        exit_price NUMERIC(12, 2),
        exit_date DATE,
        profit_loss NUMERIC(12, 2),
        percent_return NUMERIC(8, 4),
        comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createTableSQL);
    console.log('✅ Trades table created/verified');

    // Create indices for performance
    const createIndicesSQL = `
      CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
      CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
      CREATE INDEX IF NOT EXISTS idx_trades_created ON trades(created_at);
      CREATE INDEX IF NOT EXISTS idx_trades_entry_number ON trades(entry_number);
    `;

    const statements = createIndicesSQL.split(';').filter(s => s.trim());
    for (const statement of statements) {
      await client.query(statement);
    }
    console.log('✅ Indices created/verified');

    // Verify table structure
    const tableInfo = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'trades'
      ORDER BY ordinal_position
    `);

    console.log('📋 Trades table structure:');
    tableInfo.rows.forEach((row) => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    client.release();
    await pool.end();
    console.log('✅ Database initialization complete!');
  } catch (error) {
    console.error('❌ Database initialization failed');
    if (error instanceof Error) {
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
    } else {
      console.error('Unknown error:', error);
    }
    process.exit(1);
  }
}

initDatabase();
