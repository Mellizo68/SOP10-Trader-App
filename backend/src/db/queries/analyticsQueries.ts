/**
 * Analytics Database Queries
 *
 * Comprehensive trading statistics and performance analysis:
 * - Win/loss rates and profit factors
 * - Strategy performance breakdown
 * - Monthly/period-based analysis
 * - Streaks, drawdowns, and risk metrics
 * - Cached summary calculations
 *
 * All queries use prepared statements with numbered parameters ($1, $2, etc)
 * for security and performance.
 */

import pool from '../connection';
import { ApiError } from '../../middleware/errorHandler'

/**
 * Analytics Summary Interface
 */
export interface AnalyticsSummary {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number; // Percentage 0-100
  profit_factor: number;
  total_profit_loss: number;
  average_win: number;
  average_loss: number;
  best_trade: number;
  worst_trade: number;
  sharpe_ratio: number;
  max_drawdown: number;
  recovery_factor: number;
  risk_reward_ratio: number;
  win_streak_max: number;
  loss_streak_max: number;
}

/**
 * Strategy Performance
 */
export interface StrategyPerformance {
  strategy: string;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_profit_loss: number;
  average_trade: number;
  best_trade: number;
  worst_trade: number;
  profit_factor: number;
}

/**
 * Period Performance
 */
export interface PeriodPerformance {
  period: string; // YYYY-MM format
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  profit_loss: number;
  average_trade: number;
}

/**
 * Win/Loss Statistics
 */
export interface WinLossStats {
  win_count: number;
  loss_count: number;
  win_rate: number;
  average_win: number;
  average_loss: number;
  winning_ratio: number; // Average win / Average loss
  total_wins: number;
  total_losses: number;
  profit_factor: number;
}

/**
 * GET overall analytics summary
 * Calculates aggregate statistics across all closed trades
 */
export async function queryAnalyticsSummary(): Promise<AnalyticsSummary> {
  try {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'closed') as total_trades,
        COUNT(*) FILTER (WHERE status = 'closed' AND profit_loss > 0) as winning_trades,
        COUNT(*) FILTER (WHERE status = 'closed' AND profit_loss < 0) as losing_trades,
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE status = 'closed' AND profit_loss > 0) /
          NULLIF(COUNT(*) FILTER (WHERE status = 'closed'), 0),
          2
        ) as win_rate,
        ROUND(
          COALESCE(SUM(profit_loss) FILTER (WHERE status = 'closed' AND profit_loss > 0), 0) /
          NULLIF(ABS(COALESCE(SUM(profit_loss) FILTER (WHERE status = 'closed' AND profit_loss < 0), 1)), 0),
          2
        ) as profit_factor,
        COALESCE(SUM(profit_loss) FILTER (WHERE status = 'closed'), 0) as total_profit_loss,
        ROUND(
          COALESCE(AVG(profit_loss) FILTER (WHERE status = 'closed' AND profit_loss > 0), 0),
          2
        ) as average_win,
        ROUND(
          COALESCE(AVG(profit_loss) FILTER (WHERE status = 'closed' AND profit_loss < 0), 0),
          2
        ) as average_loss,
        COALESCE(MAX(profit_loss) FILTER (WHERE status = 'closed'), 0) as best_trade,
        COALESCE(MIN(profit_loss) FILTER (WHERE status = 'closed'), 0) as worst_trade,
        COALESCE(MAX(win_streak), 0) as win_streak_max,
        COALESCE(MAX(loss_streak), 0) as loss_streak_max
      FROM trades
    `;

    const result = await pool.query(query);
    const row = result.rows[0];

    // Calculate derived metrics
    const avgWin = parseFloat(row.average_win) || 0;
    const avgLoss = parseFloat(row.average_loss) || 0;
    const totalPL = parseFloat(row.total_profit_loss) || 0;

    const sharpeRatio = calculateSharpeRatio(totalPL, row.total_trades);
    const maxDrawdown = await queryMaxDrawdown();
    const recoveryFactor = avgLoss !== 0 ? totalPL / Math.abs(avgLoss) : 0;
    const riskRewardRatio = avgLoss !== 0 ? avgWin / Math.abs(avgLoss) : 0;

    return {
      total_trades: parseInt(row.total_trades) || 0,
      winning_trades: parseInt(row.winning_trades) || 0,
      losing_trades: parseInt(row.losing_trades) || 0,
      win_rate: parseFloat(row.win_rate) || 0,
      profit_factor: parseFloat(row.profit_factor) || 0,
      total_profit_loss: totalPL,
      average_win: avgWin,
      average_loss: avgLoss,
      best_trade: parseFloat(row.best_trade) || 0,
      worst_trade: parseFloat(row.worst_trade) || 0,
      sharpe_ratio: sharpeRatio,
      max_drawdown: maxDrawdown,
      recovery_factor: Math.round(recoveryFactor * 100) / 100,
      risk_reward_ratio: Math.round(riskRewardRatio * 100) / 100,
      win_streak_max: parseInt(row.win_streak_max) || 0,
      loss_streak_max: parseInt(row.loss_streak_max) || 0,
    };
  } catch (error) {
    console.error('queryAnalyticsSummary failed', {
      error: (error as Error).message,
    });
    throw new ApiError(500, 'Failed to calculate analytics summary');
  }
}

/**
 * GET performance breakdown by strategy
 */
export async function queryAnalyticsByStrategy(): Promise<StrategyPerformance[]> {
  try {
    const query = `
      SELECT
        strategy,
        COUNT(*) FILTER (WHERE status = 'closed') as total_trades,
        COUNT(*) FILTER (WHERE status = 'closed' AND profit_loss > 0) as winning_trades,
        COUNT(*) FILTER (WHERE status = 'closed' AND profit_loss < 0) as losing_trades,
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE status = 'closed' AND profit_loss > 0) /
          NULLIF(COUNT(*) FILTER (WHERE status = 'closed'), 0),
          2
        ) as win_rate,
        COALESCE(SUM(profit_loss) FILTER (WHERE status = 'closed'), 0) as total_profit_loss,
        ROUND(AVG(profit_loss) FILTER (WHERE status = 'closed'), 2) as average_trade,
        COALESCE(MAX(profit_loss) FILTER (WHERE status = 'closed'), 0) as best_trade,
        COALESCE(MIN(profit_loss) FILTER (WHERE status = 'closed'), 0) as worst_trade,
        ROUND(
          COALESCE(SUM(profit_loss) FILTER (WHERE status = 'closed' AND profit_loss > 0), 0) /
          NULLIF(ABS(COALESCE(SUM(profit_loss) FILTER (WHERE status = 'closed' AND profit_loss < 0), 1)), 0),
          2
        ) as profit_factor
      FROM trades
      WHERE strategy IS NOT NULL
      GROUP BY strategy
      ORDER BY total_profit_loss DESC, win_rate DESC
    `;

    const result = await pool.query(query);
    return result.rows.map(row => ({
      strategy: row.strategy,
      total_trades: parseInt(row.total_trades) || 0,
      winning_trades: parseInt(row.winning_trades) || 0,
      losing_trades: parseInt(row.losing_trades) || 0,
      win_rate: parseFloat(row.win_rate) || 0,
      total_profit_loss: parseFloat(row.total_profit_loss) || 0,
      average_trade: parseFloat(row.average_trade) || 0,
      best_trade: parseFloat(row.best_trade) || 0,
      worst_trade: parseFloat(row.worst_trade) || 0,
      profit_factor: parseFloat(row.profit_factor) || 0,
    }));
  } catch (error) {
    console.error('queryAnalyticsByStrategy failed', {
      error: (error as Error).message,
    });
    throw new ApiError(500, 'Failed to calculate strategy analytics');
  }
}

/**
 * GET performance by period (month)
 */
export async function queryAnalyticsByPeriod(
  periodType: 'month' | 'week' = 'month'
): Promise<PeriodPerformance[]> {
  try {
    const dateFormat = periodType === 'month' ? 'YYYY-MM' : 'IYYY-IW';
    const query = `
      SELECT
        TO_CHAR(date_entry, $1) as period,
        COUNT(*) FILTER (WHERE status = 'closed') as total_trades,
        COUNT(*) FILTER (WHERE status = 'closed' AND profit_loss > 0) as winning_trades,
        COUNT(*) FILTER (WHERE status = 'closed' AND profit_loss < 0) as losing_trades,
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE status = 'closed' AND profit_loss > 0) /
          NULLIF(COUNT(*) FILTER (WHERE status = 'closed'), 0),
          2
        ) as win_rate,
        COALESCE(SUM(profit_loss) FILTER (WHERE status = 'closed'), 0) as profit_loss,
        ROUND(AVG(profit_loss) FILTER (WHERE status = 'closed'), 2) as average_trade
      FROM trades
      GROUP BY TO_CHAR(date_entry, $1)
      ORDER BY period DESC
    `;

    const result = await pool.query(query, [dateFormat]);
    return result.rows.map(row => ({
      period: row.period,
      total_trades: parseInt(row.total_trades) || 0,
      winning_trades: parseInt(row.winning_trades) || 0,
      losing_trades: parseInt(row.losing_trades) || 0,
      win_rate: parseFloat(row.win_rate) || 0,
      profit_loss: parseFloat(row.profit_loss) || 0,
      average_trade: parseFloat(row.average_trade) || 0,
    }));
  } catch (error) {
    console.error('queryAnalyticsByPeriod failed', {
      error: (error as Error).message,
    });
    throw new ApiError(500, 'Failed to calculate period analytics');
  }
}

/**
 * GET win/loss statistics
 */
export async function queryWinLossStats(): Promise<WinLossStats> {
  try {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'closed' AND profit_loss > 0) as win_count,
        COUNT(*) FILTER (WHERE status = 'closed' AND profit_loss < 0) as loss_count,
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE status = 'closed' AND profit_loss > 0) /
          NULLIF(COUNT(*) FILTER (WHERE status = 'closed'), 0),
          2
        ) as win_rate,
        ROUND(
          AVG(profit_loss) FILTER (WHERE status = 'closed' AND profit_loss > 0),
          2
        ) as average_win,
        ROUND(
          AVG(profit_loss) FILTER (WHERE status = 'closed' AND profit_loss < 0),
          2
        ) as average_loss,
        COALESCE(SUM(profit_loss) FILTER (WHERE status = 'closed' AND profit_loss > 0), 0) as total_wins,
        COALESCE(SUM(profit_loss) FILTER (WHERE status = 'closed' AND profit_loss < 0), 0) as total_losses,
        ROUND(
          COALESCE(SUM(profit_loss) FILTER (WHERE status = 'closed' AND profit_loss > 0), 0) /
          NULLIF(ABS(COALESCE(SUM(profit_loss) FILTER (WHERE status = 'closed' AND profit_loss < 0), 1)), 0),
          2
        ) as profit_factor
      FROM trades
    `;

    const result = await pool.query(query);
    const row = result.rows[0];
    const avgWin = parseFloat(row.average_win) || 0;
    const avgLoss = parseFloat(row.average_loss) || 0;

    return {
      win_count: parseInt(row.win_count) || 0,
      loss_count: parseInt(row.loss_count) || 0,
      win_rate: parseFloat(row.win_rate) || 0,
      average_win: avgWin,
      average_loss: avgLoss,
      winning_ratio: avgLoss !== 0 ? Math.round((avgWin / Math.abs(avgLoss)) * 100) / 100 : 0,
      total_wins: parseFloat(row.total_wins) || 0,
      total_losses: parseFloat(row.total_losses) || 0,
      profit_factor: parseFloat(row.profit_factor) || 0,
    };
  } catch (error) {
    console.error('queryWinLossStats failed', {
      error: (error as Error).message,
    });
    throw new ApiError(500, 'Failed to calculate win/loss statistics');
  }
}

/**
 * Calculate max drawdown (helper)
 */
async function queryMaxDrawdown(): Promise<number> {
  try {
    const query = `
      WITH cumulative_pl AS (
        SELECT
          created_at,
          SUM(COALESCE(profit_loss, 0)) OVER (ORDER BY created_at) as cumulative_profit
        FROM trades
        WHERE status = 'closed'
        ORDER BY created_at
      ),
      running_max AS (
        SELECT
          cumulative_profit,
          MAX(cumulative_profit) OVER (ORDER BY cumulative_profit) as peak
        FROM cumulative_pl
      )
      SELECT
        ROUND(
          100.0 * MIN(cumulative_profit - peak) / NULLIF(MAX(peak), 0),
          2
        ) as max_drawdown
      FROM running_max
      WHERE peak > 0
    `;

    const result = await pool.query(query);
    return Math.abs(parseFloat(result.rows[0]?.max_drawdown) || 0);
  } catch (error) {
    console.error('queryMaxDrawdown failed', { error: (error as Error).message });
    return 0;
  }
}

/**
 * Calculate Sharpe ratio (helper)
 * Simplified version: (Average Return) / (Standard Deviation of Returns)
 */
function calculateSharpeRatio(totalPL: number, tradeCount: number): number {
  if (tradeCount === 0) return 0;
  const avgReturn = totalPL / tradeCount;
  // Approximate standard deviation (simplified)
  const stdDev = Math.sqrt(Math.abs(totalPL)) / Math.sqrt(tradeCount);
  return stdDev !== 0 ? Math.round((avgReturn / stdDev) * 100) / 100 : 0;
}

export default {
  queryAnalyticsSummary,
  queryAnalyticsByStrategy,
  queryAnalyticsByPeriod,
  queryWinLossStats,
};
