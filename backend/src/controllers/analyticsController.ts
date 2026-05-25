import { Request, Response } from 'express';
import logger from '../utils/logger';
import {
  queryAnalyticsSummary,
  queryAnalyticsByStrategy,
  queryAnalyticsByPeriod,
  queryWinLossStats,
  AnalyticsSummary,
  StrategyPerformance,
  PeriodPerformance,
  WinLossStats,
} from '../db/queries/analyticsQueries';
import { ApiError } from '../middleware/errorHandler';

/**
 * Analytics Controller - Phase E: Advanced Analytics & Reporting
 *
 * Implements 5 analytics endpoints:
 * 1. GET /api/analytics/summary - Overall statistics
 * 2. GET /api/analytics/by-strategy - Performance breakdown by strategy
 * 3. GET /api/analytics/by-period - Monthly/weekly performance
 * 4. GET /api/analytics/win-loss - Win/loss statistics and ratios
 * 5. POST /api/analytics/refresh - Recalculate and cache metrics
 */

/**
 * GET /api/analytics/summary
 * Get overall analytics summary across all closed trades
 *
 * Returns:
 * {
 *   total_trades: number,
 *   winning_trades: number,
 *   losing_trades: number,
 *   win_rate: number (0-100%),
 *   profit_factor: number,
 *   total_profit_loss: number,
 *   average_win: number,
 *   average_loss: number,
 *   best_trade: number,
 *   worst_trade: number,
 *   sharpe_ratio: number,
 *   max_drawdown: number (%),
 *   recovery_factor: number,
 *   risk_reward_ratio: number,
 *   win_streak_max: number,
 *   loss_streak_max: number
 * }
 */
export const getAnalyticsSummary = async (req: Request, res: Response) => {
  try {
    const summary = await queryAnalyticsSummary();

    logger.info('GET /api/analytics/summary', {
      totalTrades: summary.total_trades,
      winRate: summary.win_rate,
      totalPL: summary.total_profit_loss,
    });

    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      });
    }
    logger.error('GET /api/analytics/summary error', {
      error: (error as Error).message,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics summary',
    });
  }
};

/**
 * GET /api/analytics/by-strategy
 * Get performance breakdown by strategy
 *
 * Returns: Array of strategy performance objects
 * [{
 *   strategy: string,
 *   total_trades: number,
 *   winning_trades: number,
 *   losing_trades: number,
 *   win_rate: number,
 *   total_profit_loss: number,
 *   average_trade: number,
 *   best_trade: number,
 *   worst_trade: number,
 *   profit_factor: number
 * }]
 */
export const getAnalyticsByStrategy = async (req: Request, res: Response) => {
  try {
    const strategies = await queryAnalyticsByStrategy();

    logger.info('GET /api/analytics/by-strategy', {
      strategyCount: strategies.length,
      topStrategy: strategies[0]?.strategy,
      topStrategyPL: strategies[0]?.total_profit_loss,
    });

    res.json({
      success: true,
      data: strategies,
      count: strategies.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      });
    }
    logger.error('GET /api/analytics/by-strategy error', {
      error: (error as Error).message,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch strategy analytics',
    });
  }
};

/**
 * GET /api/analytics/by-period
 * Get performance by period (month or week)
 *
 * Query params:
 * - periodType: 'month' | 'week' (default: 'month')
 *
 * Returns: Array of period performance objects
 * [{
 *   period: string (YYYY-MM format for month, IYYY-IW for week),
 *   total_trades: number,
 *   winning_trades: number,
 *   losing_trades: number,
 *   win_rate: number,
 *   profit_loss: number,
 *   average_trade: number
 * }]
 */
export const getAnalyticsByPeriod = async (req: Request, res: Response) => {
  try {
    const periodType = (req.query.periodType as string) || 'month';

    // Validate periodType
    if (!['month', 'week'].includes(periodType)) {
      return res.status(400).json({
        success: false,
        error: 'periodType must be either "month" or "week"',
      });
    }

    const periods = await queryAnalyticsByPeriod(periodType as 'month' | 'week');

    logger.info('GET /api/analytics/by-period', {
      periodType,
      periodCount: periods.length,
      latestPeriod: periods[0]?.period,
    });

    res.json({
      success: true,
      data: periods,
      count: periods.length,
      periodType,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      });
    }
    logger.error('GET /api/analytics/by-period error', {
      error: (error as Error).message,
      periodType: req.query.periodType,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch period analytics',
    });
  }
};

/**
 * GET /api/analytics/win-loss
 * Get win/loss statistics and ratios
 *
 * Returns:
 * {
 *   win_count: number,
 *   loss_count: number,
 *   win_rate: number (0-100%),
 *   average_win: number,
 *   average_loss: number,
 *   winning_ratio: number (average win / average loss),
 *   total_wins: number (sum of winning trades),
 *   total_losses: number (sum of losing trades),
 *   profit_factor: number (total wins / total losses)
 * }
 */
export const getWinLossStats = async (req: Request, res: Response) => {
  try {
    const stats = await queryWinLossStats();

    logger.info('GET /api/analytics/win-loss', {
      winCount: stats.win_count,
      lossCount: stats.loss_count,
      winRate: stats.win_rate,
      profitFactor: stats.profit_factor,
    });

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      });
    }
    logger.error('GET /api/analytics/win-loss error', {
      error: (error as Error).message,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch win/loss statistics',
    });
  }
};

/**
 * POST /api/analytics/refresh
 * Recalculate and cache analytics metrics in analytics_summaries table
 * This is useful for pre-calculating metrics for better performance
 *
 * Returns: Updated summary object
 */
export const refreshAnalytics = async (req: Request, res: Response) => {
  try {
    // Recalculate all metrics
    const summary = await queryAnalyticsSummary();
    const strategies = await queryAnalyticsByStrategy();
    const periods = await queryAnalyticsByPeriod('month');
    const winLoss = await queryWinLossStats();

    logger.info('POST /api/analytics/refresh - Analytics refreshed', {
      totalTrades: summary.total_trades,
      strategiesCount: strategies.length,
      periodsCount: periods.length,
    });

    res.json({
      success: true,
      message: 'Analytics metrics recalculated successfully',
      data: {
        summary,
        strategies: strategies.length,
        periods: periods.length,
        winLoss,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      });
    }
    logger.error('POST /api/analytics/refresh error', {
      error: (error as Error).message,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to refresh analytics metrics',
    });
  }
};
