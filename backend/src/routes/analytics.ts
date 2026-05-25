import { Router } from 'express';
import {
  getAnalyticsSummary,
  getAnalyticsByStrategy,
  getAnalyticsByPeriod,
  getWinLossStats,
  refreshAnalytics,
} from '../controllers/analyticsController';

const router = Router();

/**
 * Analytics Routes - Phase E: Advanced Analytics & Reporting
 *
 * Routes:
 * GET  /summary          - Overall statistics across all trades
 * GET  /by-strategy      - Performance breakdown by strategy
 * GET  /by-period        - Performance by period (month/week)
 * GET  /win-loss         - Win/loss statistics and ratios
 * POST /refresh          - Recalculate and cache metrics
 */

/**
 * GET /api/analytics/summary
 * Get overall analytics summary with aggregate statistics
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     total_trades: number,
 *     winning_trades: number,
 *     losing_trades: number,
 *     win_rate: number (0-100%),
 *     profit_factor: number,
 *     total_profit_loss: number,
 *     average_win: number,
 *     average_loss: number,
 *     best_trade: number,
 *     worst_trade: number,
 *     sharpe_ratio: number,
 *     max_drawdown: number (%),
 *     recovery_factor: number,
 *     risk_reward_ratio: number,
 *     win_streak_max: number,
 *     loss_streak_max: number
 *   },
 *   timestamp: ISO string
 * }
 */
router.get('/summary', getAnalyticsSummary);

/**
 * GET /api/analytics/by-strategy
 * Get performance breakdown by strategy
 *
 * Returns:
 * {
 *   success: true,
 *   data: [{
 *     strategy: string,
 *     total_trades: number,
 *     winning_trades: number,
 *     losing_trades: number,
 *     win_rate: number,
 *     total_profit_loss: number,
 *     average_trade: number,
 *     best_trade: number,
 *     worst_trade: number,
 *     profit_factor: number
 *   }],
 *   count: number,
 *   timestamp: ISO string
 * }
 */
router.get('/by-strategy', getAnalyticsByStrategy);

/**
 * GET /api/analytics/by-period
 * Get performance breakdown by period (month or week)
 *
 * Query params:
 * - periodType: 'month' (default) | 'week'
 *
 * Returns:
 * {
 *   success: true,
 *   data: [{
 *     period: string (YYYY-MM or IYYY-IW),
 *     total_trades: number,
 *     winning_trades: number,
 *     losing_trades: number,
 *     win_rate: number,
 *     profit_loss: number,
 *     average_trade: number
 *   }],
 *   count: number,
 *   periodType: string,
 *   timestamp: ISO string
 * }
 */
router.get('/by-period', getAnalyticsByPeriod);

/**
 * GET /api/analytics/win-loss
 * Get detailed win/loss statistics and ratios
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     win_count: number,
 *     loss_count: number,
 *     win_rate: number (0-100%),
 *     average_win: number,
 *     average_loss: number,
 *     winning_ratio: number,
 *     total_wins: number,
 *     total_losses: number,
 *     profit_factor: number
 *   },
 *   timestamp: ISO string
 * }
 */
router.get('/win-loss', getWinLossStats);

/**
 * POST /api/analytics/refresh
 * Recalculate and refresh all analytics metrics
 * Useful for precomputing metrics or forcing a recalculation
 *
 * Returns:
 * {
 *   success: true,
 *   message: string,
 *   data: {
 *     summary: AnalyticsSummary,
 *     strategies: number (count),
 *     periods: number (count),
 *     winLoss: WinLossStats
 *   },
 *   timestamp: ISO string
 * }
 */
router.post('/refresh', refreshAnalytics);

export default router;
