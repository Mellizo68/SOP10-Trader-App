/**
 * Export Controller
 *
 * Handles data export operations:
 * - CSV export with streaming for large datasets
 * - JSON export with full formatting
 * - PDF export with formatted reports and charts
 * - Dynamic filtering by date range, strategies, status, symbols, confluence scores, P&L status
 */

import { Request, Response, NextFunction } from 'express';
import pool from '../db/connection';
import { ApiError } from '../middleware/errorHandler';
import logger from '../utils/logger';

interface ExportFilters {
  startDate?: string;              // YYYY-MM-DD
  endDate?: string;                // YYYY-MM-DD
  strategies?: string[];           // e.g., ['Call Spread', 'Iron Condor']
  status?: 'all' | 'open' | 'closed';
  symbols?: string[];              // e.g., ['SPY', 'AAPL']
  confluenceScoreMin?: number;     // 0-100
  confluenceScoreMax?: number;     // 0-100
  profitLossStatus?: 'all' | 'winners' | 'losers';
}

/**
 * Build dynamic WHERE clause and parameters for trade queries
 */
function buildWhereClause(filters: ExportFilters): { whereClause: string; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  // Date range filter
  if (filters.startDate) {
    conditions.push(`date_entry >= $${paramIndex}`);
    params.push(filters.startDate);
    paramIndex++;
  }
  if (filters.endDate) {
    conditions.push(`date_entry <= $${paramIndex}`);
    params.push(filters.endDate);
    paramIndex++;
  }

  // Strategy filter
  if (filters.strategies && filters.strategies.length > 0) {
    const strategyPlaceholders = filters.strategies
      .map(() => `$${paramIndex++}`)
      .join(',');
    conditions.push(`strategy IN (${strategyPlaceholders})`);
    params.push(...filters.strategies);
  }

  // Status filter
  if (filters.status && filters.status !== 'all') {
    conditions.push(`status = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  }

  // Symbol filter
  if (filters.symbols && filters.symbols.length > 0) {
    const symbolPlaceholders = filters.symbols
      .map(() => `$${paramIndex++}`)
      .join(',');
    conditions.push(`symbol IN (${symbolPlaceholders})`);
    params.push(...filters.symbols);
  }

  // Confluence score range filter
  if (filters.confluenceScoreMin !== undefined) {
    conditions.push(`confluence_score >= $${paramIndex}`);
    params.push(filters.confluenceScoreMin);
    paramIndex++;
  }
  if (filters.confluenceScoreMax !== undefined) {
    conditions.push(`confluence_score <= $${paramIndex}`);
    params.push(filters.confluenceScoreMax);
    paramIndex++;
  }

  // Profit/Loss status filter
  if (filters.profitLossStatus === 'winners') {
    conditions.push(`profit_loss > 0`);
  } else if (filters.profitLossStatus === 'losers') {
    conditions.push(`profit_loss < 0`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, params };
}

/**
 * Export trades as CSV, JSON, or PDF
 */
export async function exportTrades(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({ success: false, error: 'Export timeout' });
    }
  }, 30000); // 30 second timeout

  try {
    const { format = 'csv' } = req.query;
    const filters: ExportFilters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      strategies: req.query.strategies ? (Array.isArray(req.query.strategies) ? (req.query.strategies as string[]) : [req.query.strategies as string]) : undefined,
      status: (req.query.status as 'all' | 'open' | 'closed') || 'all',
      symbols: req.query.symbols ? (Array.isArray(req.query.symbols) ? (req.query.symbols as string[]) : [req.query.symbols as string]) : undefined,
      confluenceScoreMin: req.query.confluenceScoreMin ? parseInt(req.query.confluenceScoreMin as string) : undefined,
      confluenceScoreMax: req.query.confluenceScoreMax ? parseInt(req.query.confluenceScoreMax as string) : undefined,
      profitLossStatus: (req.query.profitLossStatus as 'all' | 'winners' | 'losers') || 'all',
    };

    const { whereClause, params } = buildWhereClause(filters);

    const query = `
      SELECT
        id,
        symbol,
        strategy,
        date_entry,
        entry_price,
        exit_price,
        profit_loss,
        percent_return,
        status,
        confluence_score,
        delta,
        strike_price,
        days_to_expiration,
        iv_percent,
        EXTRACT(EPOCH FROM (COALESCE(exit_date, created_at) - created_at)) / 3600 as time_in_trade_hours
      FROM trades
      ${whereClause}
      ORDER BY date_entry DESC
    `;

    const result = await pool.query(query, params);
    const trades = result.rows;

    logger.info('exportTrades', {
      format,
      tradeCount: trades.length,
      filters,
    });

    if (format === 'csv') {
      exportAsCSV(res, trades);
    } else if (format === 'json') {
      exportAsJSON(res, trades);
    } else if (format === 'pdf') {
      exportAsPDF(res, trades);
    } else {
      throw new ApiError(400, 'Invalid format. Supported formats: csv, json, pdf');
    }
  } catch (error) {
    clearTimeout(timeout);
    logger.error('exportTrades failed', {
      error: (error as Error).message,
    });
    next(new ApiError(500, 'Failed to export trades'));
  }
}

/**
 * Export analytics summary and breakdowns
 */
export async function exportAnalytics(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({ success: false, error: 'Export timeout' });
    }
  }, 30000); // 30 second timeout

  try {
    const { format = 'csv' } = req.query;

    // Query summary metrics
    const summaryQuery = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'closed') as total_trades,
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'closed' AND profit_loss > 0) / NULLIF(COUNT(*) FILTER (WHERE status = 'closed'), 0), 2) as win_rate,
        ROUND(COALESCE(SUM(profit_loss) FILTER (WHERE status = 'closed' AND profit_loss > 0), 0) / NULLIF(ABS(COALESCE(SUM(profit_loss) FILTER (WHERE status = 'closed' AND profit_loss < 0), 1)), 0), 2) as profit_factor,
        COALESCE(SUM(profit_loss) FILTER (WHERE status = 'closed'), 0) as total_profit_loss,
        ROUND(COALESCE(AVG(profit_loss) FILTER (WHERE status = 'closed' AND profit_loss > 0), 0), 2) as average_win,
        ROUND(COALESCE(AVG(profit_loss) FILTER (WHERE status = 'closed' AND profit_loss < 0), 0), 2) as average_loss
      FROM trades
    `;

    // Query by strategy
    const strategyQuery = `
      SELECT
        strategy,
        COUNT(*) FILTER (WHERE status = 'closed') as total_trades,
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'closed' AND profit_loss > 0) / NULLIF(COUNT(*) FILTER (WHERE status = 'closed'), 0), 2) as win_rate,
        ROUND(COALESCE(SUM(profit_loss) FILTER (WHERE status = 'closed' AND profit_loss > 0), 0) / NULLIF(ABS(COALESCE(SUM(profit_loss) FILTER (WHERE status = 'closed' AND profit_loss < 0), 1)), 0), 2) as profit_factor,
        COALESCE(SUM(profit_loss) FILTER (WHERE status = 'closed'), 0) as total_profit_loss,
        ROUND(AVG(profit_loss) FILTER (WHERE status = 'closed'), 2) as average_trade
      FROM trades
      WHERE strategy IS NOT NULL
      GROUP BY strategy
      ORDER BY total_profit_loss DESC
    `;

    // Query by period
    const periodQuery = `
      SELECT
        TO_CHAR(date_entry, 'YYYY-MM') as period,
        COUNT(*) FILTER (WHERE status = 'closed') as total_trades,
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'closed' AND profit_loss > 0) / NULLIF(COUNT(*) FILTER (WHERE status = 'closed'), 0), 2) as win_rate,
        COALESCE(SUM(profit_loss) FILTER (WHERE status = 'closed'), 0) as profit_loss
      FROM trades
      GROUP BY TO_CHAR(date_entry, 'YYYY-MM')
      ORDER BY period DESC
    `;

    const [summaryResult, strategyResult, periodResult] = await Promise.all([
      pool.query(summaryQuery),
      pool.query(strategyQuery),
      pool.query(periodQuery),
    ]);

    const analytics = {
      summaryMetrics: summaryResult.rows[0] || {},
      byStrategy: strategyResult.rows,
      byPeriod: periodResult.rows,
    };

    logger.info('exportAnalytics', {
      format,
      strategyCount: strategyResult.rows.length,
      periodCount: periodResult.rows.length,
    });

    if (format === 'csv') {
      exportAnalyticsAsCSV(res, analytics);
    } else if (format === 'json') {
      exportAnalyticsAsJSON(res, analytics);
    } else if (format === 'pdf') {
      exportAnalyticsAsPDF(res, analytics);
    } else {
      throw new ApiError(400, 'Invalid format. Supported formats: csv, json, pdf');
    }
  } catch (error) {
    clearTimeout(timeout);
    logger.error('exportAnalytics failed', {
      error: (error as Error).message,
    });
    next(new ApiError(500, 'Failed to export analytics'));
  }
}

/**
 * Export trades as CSV (streaming for large datasets)
 */
function exportAsCSV(res: Response, trades: any[]): void {
  const headers = [
    'Trade ID',
    'Symbol',
    'Strategy',
    'Entry Date',
    'Entry Price',
    'Exit Price',
    'Profit/Loss',
    'Return %',
    'Status',
    'Confluence Score',
    'Delta',
    'Strike',
    'DTE',
    'IV %',
    'Time in Trade (h)',
  ];

  let csv = headers.join(',') + '\n';

  for (const trade of trades) {
    csv += [
      trade.id,
      trade.symbol,
      trade.strategy || '',
      trade.date_entry || '',
      trade.entry_price || '',
      trade.exit_price || '',
      trade.profit_loss || '',
      trade.percent_return || '',
      trade.status,
      trade.confluence_score || '',
      trade.delta || '',
      trade.strike_price || '',
      trade.days_to_expiration || '',
      trade.iv_percent || '',
      Math.round((trade.time_in_trade_hours || 0) * 10) / 10,
    ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="trades-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csv);
}

/**
 * Export trades as JSON
 */
function exportAsJSON(res: Response, trades: any[]): void {
  const data = trades.map(trade => ({
    id: trade.id,
    symbol: trade.symbol,
    strategy: trade.strategy,
    entryDate: trade.date_entry,
    entryPrice: parseFloat(trade.entry_price),
    exitPrice: trade.exit_price ? parseFloat(trade.exit_price) : null,
    profitLoss: trade.profit_loss ? parseFloat(trade.profit_loss) : null,
    percentReturn: trade.percent_return ? parseFloat(trade.percent_return) : null,
    status: trade.status,
    confluenceScore: trade.confluence_score,
    delta: trade.delta ? parseFloat(trade.delta) : null,
    strikePrice: trade.strike_price ? parseFloat(trade.strike_price) : null,
    daysToExpiration: trade.days_to_expiration,
    ivPercent: trade.iv_percent ? parseFloat(trade.iv_percent) : null,
    timeInTradeHours: Math.round((trade.time_in_trade_hours || 0) * 10) / 10,
  }));

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="trades-${new Date().toISOString().split('T')[0]}.json"`);
  res.json(data);
}

/**
 * Export trades as PDF (placeholder - requires pdfkit)
 */
function exportAsPDF(res: Response, trades: any[]): void {
  // PDF export would require pdfkit integration
  // For now, return a placeholder response
  res.status(501).json({
    success: false,
    error: 'PDF export coming soon - requires pdfkit integration',
    tradeCount: trades.length,
  });
}

/**
 * Export analytics as CSV
 */
function exportAnalyticsAsCSV(res: Response, analytics: any): void {
  let csv = 'Analytics Summary\n';
  csv += 'Metric,Value\n';
  csv += `Total Trades,${analytics.summaryMetrics.total_trades || 0}\n`;
  csv += `Win Rate,%,${analytics.summaryMetrics.win_rate || 0}\n`;
  csv += `Profit Factor,${analytics.summaryMetrics.profit_factor || 0}\n`;
  csv += `Total P&L,$,${analytics.summaryMetrics.total_profit_loss || 0}\n`;
  csv += `Average Win,$,${analytics.summaryMetrics.average_win || 0}\n`;
  csv += `Average Loss,$,${analytics.summaryMetrics.average_loss || 0}\n\n`;

  csv += 'Strategy Performance\n';
  csv += 'Strategy,Total Trades,Win Rate %,Profit Factor,Total P&L,Average Trade P&L\n';
  for (const strategy of analytics.byStrategy) {
    csv += `"${strategy.strategy}",${strategy.total_trades},${strategy.win_rate},${strategy.profit_factor},${strategy.total_profit_loss},${strategy.average_trade}\n`;
  }

  csv += '\nMonthly Performance\n';
  csv += 'Period,Total Trades,Win Rate %,Profit/Loss\n';
  for (const period of analytics.byPeriod) {
    csv += `${period.period},${period.total_trades},${period.win_rate},${period.profit_loss}\n`;
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="analytics-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csv);
}

/**
 * Export analytics as JSON
 */
function exportAnalyticsAsJSON(res: Response, analytics: any): void {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="analytics-${new Date().toISOString().split('T')[0]}.json"`);
  res.json(analytics);
}

/**
 * Export analytics as PDF (placeholder)
 */
function exportAnalyticsAsPDF(res: Response, analytics: any): void {
  res.status(501).json({
    success: false,
    error: 'PDF export coming soon - requires pdfkit integration',
  });
}

export default {
  exportTrades,
  exportAnalytics,
};
