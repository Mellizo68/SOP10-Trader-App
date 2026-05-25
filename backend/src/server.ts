async function startServer() {
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
    'http://127.0.0.1:3000',                    // Local development alt
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

  // Register routes
  app.use('/api/trades', tradesRouter)
  app.use('/api/market', marketRouter)
  app.use('/api/stats', statsRouter)
  app.use('/api/analytics', analyticsRouter)
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

  // Start
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`)
  })
}

startServer().catch(err => {
  console.error('❌ Failed to start server:', err.message)
  process.exit(1)
})