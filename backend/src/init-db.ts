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

    // Add journal_count column if it doesn't exist
    const addJournalCountSQL = `
      ALTER TABLE trades
      ADD COLUMN IF NOT EXISTS journal_count INTEGER DEFAULT 0;
    `;
    await client.query(addJournalCountSQL);
    console.log('✅ Trades table extended with journal_count');

    // Create trade_journals table
    const createJournalsTableSQL = `
      CREATE TABLE IF NOT EXISTS trade_journals (
        id VARCHAR(255) PRIMARY KEY,
        trade_id VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        section_type VARCHAR(50) NOT NULL CHECK (section_type IN ('setup', 'execution', 'review', 'lesson')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE
      );
    `;
    await client.query(createJournalsTableSQL);
    console.log('✅ Trade journals table created/verified');

    // Add analytics metrics columns to trades table
    const addAnalyticsColumnsSQL = `
      ALTER TABLE trades
      ADD COLUMN IF NOT EXISTS risk_reward_ratio NUMERIC(10, 2),
      ADD COLUMN IF NOT EXISTS entry_quality_score INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS time_in_trade_hours NUMERIC(8, 2),
      ADD COLUMN IF NOT EXISTS max_drawdown_pct NUMERIC(8, 4),
      ADD COLUMN IF NOT EXISTS win_streak INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS loss_streak INTEGER DEFAULT 0;
    `;
    await client.query(addAnalyticsColumnsSQL);
    console.log('✅ Analytics columns added to trades table');

    // Add media tracking to trades table
    const addMediaColumnsSQL = `
      ALTER TABLE trades
      ADD COLUMN IF NOT EXISTS has_media BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS media_count INTEGER DEFAULT 0;
    `;
    await client.query(addMediaColumnsSQL);
    console.log('✅ Media tracking columns added to trades table');

    // Create analytics_summaries table for cached statistics
    const createAnalyticsSummariesSQL = `
      CREATE TABLE IF NOT EXISTS analytics_summaries (
        id VARCHAR(255) PRIMARY KEY,
        total_trades INTEGER DEFAULT 0,
        winning_trades INTEGER DEFAULT 0,
        losing_trades INTEGER DEFAULT 0,
        win_rate NUMERIC(5, 2) DEFAULT 0,
        profit_factor NUMERIC(8, 2) DEFAULT 0,
        total_profit_loss NUMERIC(12, 2) DEFAULT 0,
        average_win NUMERIC(12, 2),
        average_loss NUMERIC(12, 2),
        best_trade NUMERIC(12, 2),
        worst_trade NUMERIC(12, 2),
        sharpe_ratio NUMERIC(5, 2),
        max_drawdown NUMERIC(5, 2),
        recovery_factor NUMERIC(5, 2),
        risk_reward_ratio NUMERIC(5, 2),
        win_streak_max INTEGER DEFAULT 0,
        loss_streak_max INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await client.query(createAnalyticsSummariesSQL);
    console.log('✅ Analytics summaries table created/verified');

    // Create trade_media table for storing trade screenshots and media
    const createMediaTableSQL = `
      CREATE TABLE IF NOT EXISTS trade_media (
        id VARCHAR(255) PRIMARY KEY,
        trade_id VARCHAR(255) NOT NULL,
        media_type VARCHAR(50) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size INTEGER NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        s3_key VARCHAR(500),
        mime_type VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE
      );
    `;
    await client.query(createMediaTableSQL);
    console.log('✅ Trade media table created/verified');

    // Create indices for performance
    const createIndicesSQL = `
      CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
      CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
      CREATE INDEX IF NOT EXISTS idx_trades_created ON trades(created_at);
      CREATE INDEX IF NOT EXISTS idx_trades_entry_number ON trades(entry_number);
      CREATE INDEX IF NOT EXISTS idx_trades_strategy ON trades(strategy);
      CREATE INDEX IF NOT EXISTS idx_journals_trade_id ON trade_journals(trade_id);
      CREATE INDEX IF NOT EXISTS idx_journals_created ON trade_journals(created_at);
      CREATE INDEX IF NOT EXISTS idx_trades_profit_loss ON trades(profit_loss);
      CREATE INDEX IF NOT EXISTS idx_trades_win_loss ON trades(profit_loss) WHERE status = 'closed';
      CREATE INDEX IF NOT EXISTS idx_media_trade_id ON trade_media(trade_id);
      CREATE INDEX IF NOT EXISTS idx_media_created ON trade_media(created_at);
      CREATE INDEX IF NOT EXISTS idx_trades_has_media ON trades(has_media);
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
