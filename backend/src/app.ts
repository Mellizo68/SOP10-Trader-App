import express from 'express'
import cors from 'cors'
import tradesRoutes from './routes/trades'
import statsRoutes from './routes/stats'
import { errorHandler } from './middleware/errorHandler'

const app = express()

// Middleware
app.use(express.json())
app.use(cors())

// Routes
app.use('/api/trades', tradesRoutes)
app.use('/api/stats', statsRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling middleware
app.use(errorHandler)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' })
})

export default app
