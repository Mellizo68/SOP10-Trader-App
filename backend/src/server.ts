async function startServer() {
  // Import EVERYTHING inside the function - nothing at module level
  const express = (await import('express')).default
  const cors = (await import('cors')).default
  const compression = (await import('compression')).default

  const PORT = process.env.PORT || 3000
  const app = express()

  // Middleware
  app.use(express.json())
  app.use(cors())
  app.use(compression({ level: 6, threshold: 1024 }))

  // Import routes
  const tradesRouter = (await import('./routes/trades.js')).default
  const marketRouter = (await import('./routes/market.js')).default
  const statsRouter = (await import('./routes/stats.js')).default

  // Register routes
  app.use('/api/trades', tradesRouter)
  app.use('/api/market', marketRouter)
  app.use('/api/stats', statsRouter)

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

  // Start
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`)
  })
}

startServer().catch(err => {
  console.error('❌ Failed to start server:', err.message)
  process.exit(1)
})