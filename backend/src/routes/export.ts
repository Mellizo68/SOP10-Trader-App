/**
 * Export Routes
 *
 * Handles data export operations:
 * - CSV export with filtering
 * - JSON export with full formatting
 * - PDF export with formatted reports (placeholder)
 * - Analytics export
 */

import { Router } from 'express'
import { exportTrades, exportAnalytics } from '../controllers/exportController'

const router = Router()

// Export trades as CSV/JSON/PDF
router.get('/trades', exportTrades)

// Export analytics as CSV/JSON/PDF
router.get('/analytics', exportAnalytics)

export default router
