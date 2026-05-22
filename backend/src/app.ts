import express from 'express'
import cors from 'cors'
import compression from 'compression'
import tradesRoutes from './routes/trades.js'
import statsRoutes from './routes/stats.js'
import marketRoutes from './routes/market.js'
import { errorHandler } from './middleware/errorHandler.js'
import { requestLogger } from './middleware/requestLogger.js'
import { sentryErrorHandler } from './middleware/sentryErrorHandler.js'
import { HealthController } from './controllers/healthController.js'
import * as Sentry from '@sentry/node'

const app = express()

// Middleware
app.use(express.json())
app.use(cors())
// Response compression (gzip/brotli) - 70% payload reduction
app.use(
  compression({
    level: 6, // 0-9, balance between speed (6) and compression (9)
    threshold: 1024, // Only compress responses > 1KB
  })
)
app.use(requestLogger)

// Sentry middleware
app.use(Sentry.Handlers.requestHandler())
app.use(Sentry.Handlers.errorHandler())

// Routes
app.use('/api/trades', tradesRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/market', marketRoutes)

// Health check endpoints
app.get('/health', HealthController.checkHealth)
app.get('/metrics', HealthController.getMetrics)
app.get('/metrics/prometheus', HealthController.getPrometheusMetrics)

// Error handling middleware
app.use(sentryErrorHandler)
app.use(errorHandler)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' })
})

export default app
