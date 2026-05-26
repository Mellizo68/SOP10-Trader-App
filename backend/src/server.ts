async function initializeDatabase() {
  // Initialize database schema before starting server
  console.log('🔄 Initializing database...')

  try {
    const pkg = await import('pg')
    const { Pool } = pkg.default

    const connectionString = process.env.DATABASE_URL || 'postgresql://trader:tradersecret@localhost:5432/sop10_trader'

    console.log('📌 Connecting to database:', connectionString.split('@')[1] || 'localhost')

    const pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 5000, // 5 second timeout for initial connection
      ssl: { rejectUnauthorized: false }, // Required for Render's managed PostgreSQL
    })

    let client
    try {
      client = await pool.connect()
      console.log('✅ Database connected successfully')
    } catch (connError) {
      console.error('❌ Failed to connect to database:', (connError as Error).message)
      console.log('⚠️  Continuing with server startup (database will be created on first request)')
      await pool.end()
      return // Return gracefully instead of exiting
    }

    // Create trades table
    try {
      await client.query(`
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
    `)

    // Add journal_count column if it doesn't exist
    await client.query(`
      ALTER TABLE trades
      ADD COLUMN IF NOT EXISTS journal_count INTEGER DEFAULT 0;
    `)

    // Create trade_journals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS trade_journals (
        id VARCHAR(255) PRIMARY KEY,
        trade_id VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        section_type VARCHAR(50) NOT NULL CHECK (section_type IN ('setup', 'execution', 'review', 'lesson')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE
      );
    `)

    // Create trade_media table
    await client.query(`
      CREATE TABLE IF NOT EXISTS trade_media (
        id VARCHAR(255) PRIMARY KEY,
        trade_id VARCHAR(255) NOT NULL,
        media_type VARCHAR(50) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size INTEGER NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE
      );
    `)

    // Add has_media column if it doesn't exist
    await client.query(`
      ALTER TABLE trades
      ADD COLUMN IF NOT EXISTS has_media BOOLEAN DEFAULT FALSE;
    `)

    // Create indices
    const createIndicesSQL = `
      CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
      CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
      CREATE INDEX IF NOT EXISTS idx_trades_date_entry ON trades(date_entry);
      CREATE INDEX IF NOT EXISTS idx_trades_created ON trades(created_at);
      CREATE INDEX IF NOT EXISTS idx_trades_profit_loss ON trades(profit_loss);
      CREATE INDEX IF NOT EXISTS idx_trades_win_loss ON trades(profit_loss) WHERE status = 'closed';
      CREATE INDEX IF NOT EXISTS idx_journals_trade_id ON trade_journals(trade_id);
      CREATE INDEX IF NOT EXISTS idx_journals_created ON trade_journals(created_at);
      CREATE INDEX IF NOT EXISTS idx_media_trade_id ON trade_media(trade_id);
      CREATE INDEX IF NOT EXISTS idx_media_created ON trade_media(created_at);
      CREATE INDEX IF NOT EXISTS idx_trades_has_media ON trades(has_media);
    `

      const statements = createIndicesSQL.split(';').filter((s: string) => s.trim())
      for (const statement of statements) {
        await client.query(statement)
      }

      console.log('✅ Database schema created/verified')
    } catch (tableError) {
      console.error('⚠️  Error creating tables:', (tableError as Error).message)
      console.log('⚠️  Continuing - tables may already exist or will be created later')
    } finally {
      if (client) client.release()
      await pool.end()
    }

    console.log('✅ Database initialization complete')
  } catch (error) {
    console.error('❌ Database initialization failed:', error instanceof Error ? error.message : error)
    throw error
  }
}

async function startServer() {
  // Load environment variables from .env file
  const dotenv = (await import('dotenv')).default
  dotenv.config()

  // Initialize database first (non-blocking - continues even if DB init fails)
  try {
    await initializeDatabase()
  } catch (error) {
    console.error('⚠️  Database initialization error:', error instanceof Error ? error.message : error)
    console.log('⚠️  Continuing server startup - database may be initialized later')
  }

  // Import EVERYTHING inside the function - nothing at module level
  const express = (await import('express')).default
  const cors = (await import('cors')).default
  const compression = (await import('compression')).default

  const PORT = process.env.PORT || 8080
  const app = express()

  // Middleware
  app.use(express.json())

  // Configure CORS for production and development
  const allowedOrigins = [
    'https://sop10-trader-app.vercel.app',     // Production frontend
    'http://localhost:3000',                    // Local development
    'http://localhost:3001',                    // Local development (Vite alt port)
    'http://localhost:3002',                    // Local development (Vite alt port 2)
    'http://localhost:3003',                    // Local development (Vite alt port 3)
    'http://localhost:3005',                    // Local development (Vite port)
    'http://127.0.0.1:3000',                    // Local development alt
    'http://127.0.0.1:3001',                    // Local development alt port
    'http://127.0.0.1:3002',                    // Local development alt port 2
    'http://127.0.0.1:3003',                    // Local development alt port 3
    'http://127.0.0.1:3005',                    // Local development alt (Vite port)
  ]

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('CORS not allowed'))
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }))

  app.use(compression({ level: 6, threshold: 1024 }))

  // Import routes
  const tradesRouter = (await import('./routes/trades.js')).default
  const marketRouter = (await import('./routes/market.js')).default
  const statsRouter = (await import('./routes/stats.js')).default
  const discoveryRouter = (await import('./routes/discovery.js')).default
  const historicalRouter = (await import('./routes/historical.js')).default
  const backtestingRouter = (await import('./routes/backtesting.js')).default
  const analyticsRouter = (await import('./routes/analytics.js')).default
  const exportRouter = (await import('./routes/export.js')).default
  const backupRouter = (await import('./routes/backup.js')).default

  // Register routes
  app.use('/api/trades', tradesRouter)
  app.use('/api/market', marketRouter)
  app.use('/api/stats', statsRouter)
  app.use('/api/analytics', analyticsRouter)
  app.use('/api/export', exportRouter)
  app.use('/api/backup', backupRouter)
  app.use('/api', discoveryRouter)
  app.use('/api', historicalRouter)
  app.use('/api', backtestingRouter)

  // Health endpoints
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  app.get('/metrics', async (req, res) => {
    try {
      const { metrics } = await import('./utils/metrics.js')
      res.json(metrics.getMetrics())
    } catch {
      res.status(500).json({ error: 'Metrics unavailable' })
    }
  })

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Not found' })
  })

  // Global error handler (ensures CORS headers on errors)
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Global error handler:', err)
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error',
    })
  })

  // Start REST API
  app.listen(PORT, () => {
    console.log(`✅ REST API running on http://localhost:${PORT}`)
  })

  // Start WebSocket server for real-time market data
  try {
    const { getWebSocketServer } = await import('./websocket/server.js')
    const wsPort = process.env.WS_PORT ? parseInt(process.env.WS_PORT, 10) : 8081
    getWebSocketServer(wsPort)
    console.log(`✅ WebSocket server running on ws://localhost:${wsPort}`)
  } catch (error) {
    console.warn('⚠️  WebSocket server failed to start:', error instanceof Error ? error.message : error)
  }
}

startServer().catch(err => {
  console.error('❌ Failed to start server:', err.message)
  process.exit(1)
})