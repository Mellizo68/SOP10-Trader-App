import { Router } from 'express';
import {
  getTrades,
  createTrade,
  getTradeById,
  updateTrade,
  deleteTrade,
  closeTrade,
} from '../controllers/tradesController';

const router = Router();

/**
 * Trades Routes - Phase 5 Complete Implementation
 *
 * Routes:
 * GET    /api/trades              - List all trades with pagination
 * POST   /api/trades              - Create new trade
 * GET    /api/trades/:id          - Get single trade by ID
 * PUT    /api/trades/:id          - Update trade
 * DELETE /api/trades/:id          - Delete trade
 * PUT    /api/trades/:id/close    - Close trade and calculate P&L
 */

/**
 * GET /api/trades
 * List all trades with pagination and filtering
 *
 * Query params:
 * - limit: number (1-500, default 50)
 * - offset: number (default 0)
 * - sort: string (default 'date_entry')
 * - direction: 'ASC' | 'DESC' (default 'DESC')
 * - status: 'open' | 'closed' (optional filter)
 * - strategy: string (optional filter)
 * - symbol: string (optional filter)
 * - dateStart: ISO date string (optional filter)
 * - dateEnd: ISO date string (optional filter)
 */
router.get('/', getTrades);

/**
 * POST /api/trades
 * Create new trade
 *
 * Body:
 * {
 *   symbol: string (required),
 *   strategy: string (required),
 *   entry_price: number (required),
 *   date_entry: ISO date (optional, defaults to now),
 *   ...other optional fields
 * }
 */
router.post('/', createTrade);

/**
 * GET /api/trades/:id
 * Get single trade by ID
 */
router.get('/:id', getTradeById);

/**
 * PUT /api/trades/:id
 * Update trade
 *
 * Body: Partial trade object with fields to update
 * All fields are optional
 */
router.put('/:id', updateTrade);

/**
 * DELETE /api/trades/:id
 * Delete trade
 */
router.delete('/:id', deleteTrade);

/**
 * PUT /api/trades/:id/close
 * Close trade and calculate P&L
 *
 * Body:
 * {
 *   exit_price: number (required),
 *   exit_date: ISO date string (optional, defaults to now)
 * }
 *
 * Calculates:
 * - profit_loss = exit_price - entry_price
 * - percent_return = (profit_loss / entry_price) * 100
 */
router.put('/:id/close', closeTrade);

export default router;
