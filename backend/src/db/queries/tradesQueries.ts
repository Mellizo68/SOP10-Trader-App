/**
 * Trades Database Queries
 *
 * Complete CRUD operations for trades table with:
 * - Parameterized queries to prevent SQL injection
 * - Error handling with detailed logging
 * - Pagination support with filters
 * - P&L calculations on close
 * - Proper timestamp management
 *
 * All queries use prepared statements with numbered parameters ($1, $2, etc)
 * for security and performance.
 */

import pool from '../connection';
import { ApiError } from '../../middleware/errorHandler'

/**
 * Trade interface matching database schema
 */
export interface Trade {
  id: string;
  entry_number: number;
  date_entry: string;
  symbol: string;
  strategy: string;
  strike_price?: number;
  delta?: number;
  days_to_expiration?: number;
  iv_percent?: number;
  gex_status?: string;
  pvp_status?: string;
  vwap_status?: string;
  confluence_score?: number;
  entry_price: number;
  take_profit?: number;
  stop_loss?: number;
  status: 'open' | 'closed';
  exit_price?: number;
  exit_date?: string;
  profit_loss?: number;
  percent_return?: number;
  comments?: string;
  created_at: string;
  updated_at: string;
}

/**
 * GET all trades with pagination and filtering
 *
 * Supports filtering by:
 * - status: 'open' or 'closed'
 * - strategy: specific strategy name
 * - symbol: specific symbol
 * - date_range: start and end dates
 *
 * Returns paginated results with total count
 */
export async function queryGetAllTrades(
  limit: number = 50,
  offset: number = 0,
  filters: {
    status?: 'open' | 'closed';
    strategy?: string;
    symbol?: string;
    dateStart?: string;
    dateEnd?: string;
  } = {}
): Promise<{ trades: Trade[]; total: number }> {
  try {
    // Build WHERE clause based on filters
    const whereClauses: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters.status) {
      whereClauses.push(`status = $${paramCount++}`);
      params.push(filters.status);
    }

    if (filters.strategy) {
      whereClauses.push(`strategy = $${paramCount++}`);
      params.push(filters.strategy);
    }

    if (filters.symbol) {
      whereClauses.push(`symbol = $${paramCount++}`);
      params.push(filters.symbol);
    }

    if (filters.dateStart) {
      whereClauses.push(`date_entry >= $${paramCount++}`);
      params.push(filters.dateStart);
    }

    if (filters.dateEnd) {
      whereClauses.push(`date_entry <= $${paramCount++}`);
      params.push(filters.dateEnd);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM trades ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    params.push(limit);
    params.push(offset);
    const selectQuery = `
      SELECT * FROM trades
      ${whereClause}
      ORDER BY date_entry DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const result = await pool.query(selectQuery, params);

    return {
      trades: result.rows as Trade[],
      total,
    };
  } catch (error) {
    console.error('queryGetAllTrades failed', {
      error: (error as Error).message,
      limit,
      offset,
      filters,
    });
    throw new ApiError(500, 'Failed to fetch trades');
  }
}

/**
 * GET single trade by ID
 */
export async function queryGetTradeById(id: string): Promise<Trade> {
  try {
    const result = await pool.query('SELECT * FROM trades WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      throw new ApiError(404, `Trade with ID ${id} not found`);
    }

    return result.rows[0] as Trade;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('queryGetTradeById failed', {
      error: (error as Error).message,
      id,
    });
    throw new ApiError(500, 'Failed to fetch trade');
  }
}

/**
 * CREATE new trade
 *
 * Auto-generates:
 * - id: UUID-like string
 * - entry_number: auto-increment (gets max + 1)
 * - created_at: NOW()
 * - updated_at: NOW()
 * - status: 'open' (default)
 */
export async function queryCreateTrade(data: Partial<Trade>): Promise<Trade> {
  try {
    // Get next entry_number
    const maxResult = await pool.query('SELECT COALESCE(MAX(entry_number), 0) as max_number FROM trades');
    const nextEntryNumber = maxResult.rows[0].max_number + 1;

    // Generate unique ID
    const id = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const query = `
      INSERT INTO trades (
        id, entry_number, date_entry, symbol, strategy, strike_price,
        delta, days_to_expiration, iv_percent, gex_status, pvp_status,
        vwap_status, confluence_score, entry_price, take_profit, stop_loss,
        status, comments, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, NOW(), NOW()
      )
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      nextEntryNumber,
      data.date_entry || new Date().toISOString(),
      data.symbol,
      data.strategy,
      data.strike_price || null,
      data.delta || null,
      data.days_to_expiration || null,
      data.iv_percent || null,
      data.gex_status || null,
      data.pvp_status || null,
      data.vwap_status || null,
      data.confluence_score || null,
      data.entry_price,
      data.take_profit || null,
      data.stop_loss || null,
      'open', // Default status
      data.comments || null,
    ]);

    console.error('Trade created', {
      id,
      symbol: data.symbol,
      entryNumber: nextEntryNumber,
      entryPrice: data.entry_price,
    });

    return result.rows[0] as Trade;
  } catch (error) {
    console.error('queryCreateTrade failed', {
      error: (error as Error).message,
      data,
    });
    throw new ApiError(500, 'Failed to create trade');
  }
}

/**
 * UPDATE trade by ID
 *
 * Updates specified fields and sets updated_at to NOW()
 * Ignores: id, entry_number, created_at (immutable fields)
 */
export async function queryUpdateTrade(id: string, data: Partial<Trade>): Promise<Trade> {
  try {
    // Build dynamic UPDATE clause
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    // Whitelist of updatable fields
    const updatableFields = [
      'date_entry',
      'symbol',
      'strategy',
      'strike_price',
      'delta',
      'days_to_expiration',
      'iv_percent',
      'gex_status',
      'pvp_status',
      'vwap_status',
      'confluence_score',
      'entry_price',
      'take_profit',
      'stop_loss',
      'status',
      'exit_price',
      'exit_date',
      'comments',
    ];

    updatableFields.forEach((field) => {
      if (field in data && data[field as keyof Trade] !== undefined) {
        updates.push(`${field} = $${paramCount++}`);
        params.push(data[field as keyof Trade]);
      }
    });

    if (updates.length === 0) {
      return queryGetTradeById(id); // Return current trade if no updates
    }

    // Always update updated_at
    updates.push(`updated_at = NOW()`);
    params.push(id); // For WHERE clause

    const query = `
      UPDATE trades
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      throw new ApiError(404, `Trade with ID ${id} not found`);
    }

    console.error('Trade updated', {
      id,
      updates: Object.keys(data),
    });

    return result.rows[0] as Trade;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('queryUpdateTrade failed', {
      error: (error as Error).message,
      id,
      data,
    });
    throw new ApiError(500, 'Failed to update trade');
  }
}

/**
 * DELETE trade by ID
 *
 * Cascades to screenshots table (ON DELETE CASCADE)
 */
export async function queryDeleteTrade(id: string): Promise<void> {
  try {
    const result = await pool.query('DELETE FROM trades WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      throw new ApiError(404, `Trade with ID ${id} not found`);
    }

    console.error('Trade deleted', { id });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('queryDeleteTrade failed', {
      error: (error as Error).message,
      id,
    });
    throw new ApiError(500, 'Failed to delete trade');
  }
}

/**
 * CLOSE trade and calculate P&L
 *
 * Sets:
 * - status: 'closed'
 * - exit_price: provided price
 * - exit_date: provided date or NOW()
 * - profit_loss: exit_price - entry_price
 * - percent_return: (profit_loss / entry_price) * 100
 * - updated_at: NOW()
 */
export async function queryCloseTrade(
  id: string,
  exitPrice: number,
  exitDate: string = new Date().toISOString()
): Promise<Trade> {
  try {
    // Get current trade to get entry_price for P&L calculation
    const currentTrade = await queryGetTradeById(id);

    const profitLoss = exitPrice - currentTrade.entry_price;
    const percentReturn = (profitLoss / currentTrade.entry_price) * 100;

    const query = `
      UPDATE trades
      SET
        status = 'closed',
        exit_price = $2,
        exit_date = $3,
        profit_loss = $4,
        percent_return = $5,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id, exitPrice, exitDate, profitLoss, percentReturn]);

    console.error('Trade closed with P&L', {
      id,
      exitPrice,
      profitLoss,
      percentReturn,
    });

    return result.rows[0] as Trade;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('queryCloseTrade failed', {
      error: (error as Error).message,
      id,
      exitPrice,
    });
    throw new ApiError(500, 'Failed to close trade');
  }
}

/**
 * GET total trade count
 *
 * Useful for pagination metadata
 */
export async function queryGetTradeCount(filters: {
  status?: 'open' | 'closed';
  strategy?: string;
  symbol?: string;
} = {}): Promise<number> {
  try {
    const whereClauses: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters.status) {
      whereClauses.push(`status = $${paramCount++}`);
      params.push(filters.status);
    }

    if (filters.strategy) {
      whereClauses.push(`strategy = $${paramCount++}`);
      params.push(filters.strategy);
    }

    if (filters.symbol) {
      whereClauses.push(`symbol = $${paramCount++}`);
      params.push(filters.symbol);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const query = `SELECT COUNT(*) as count FROM trades ${whereClause}`;

    const result = await pool.query(query, params);
    const count = parseInt(result.rows[0].count, 10);

    console.error('queryGetTradeCount', { count, filters });

    return count;
  } catch (error) {
    console.error('queryGetTradeCount failed', {
      error: (error as Error).message,
      filters,
    }); 
    throw new ApiError(500, 'Failed to count trades');
  }
}

export default {
  queryGetAllTrades,
  queryGetTradeById,
  queryCreateTrade,
  queryUpdateTrade,
  queryDeleteTrade,
  queryCloseTrade,
  queryGetTradeCount,
};
