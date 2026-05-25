import { Request, Response } from 'express';
import logger from '../utils/logger';
import {
  queryGetAllTrades,
  queryGetTradeById,
  queryCreateTrade,
  queryUpdateTrade,
  queryDeleteTrade,
  queryCloseTrade,
  queryGetTradeCount,
  Trade,
} from '../db/queries/tradesQueries';
import {
  validateTradeCreation,
  validateTradeUpdate,
  validateTradeClose,
  validatePaginationFilter,
} from '../utils/validators';
import { ApiError } from '../middleware/errorHandler';

/**
 * Trades Controller - Phase 5 Complete Implementation
 *
 * Implements 6 CRUD endpoints:
 * 1. GET /api/trades - List with pagination
 * 2. POST /api/trades - Create trade
 * 3. GET /api/trades/:id - Get single trade
 * 4. PUT /api/trades/:id - Update trade
 * 5. DELETE /api/trades/:id - Delete trade
 * 6. PUT /api/trades/:id/close - Close trade with P&L
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
export const getTrades = async (req: Request, res: Response) => {
  try {
    // Validate pagination and filter parameters (validator now handles string->number conversion)
    validatePaginationFilter(req.query);

    // Parse pagination parameters
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 500);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    // Parse filter parameters
    const filters = {
      status: req.query.status as 'open' | 'closed' | undefined,
      strategy: req.query.strategy as string | undefined,
      symbol: req.query.symbol as string | undefined,
      dateStart: req.query.dateStart as string | undefined,
      dateEnd: req.query.dateEnd as string | undefined,
    };

    // Query trades with filters
    const { trades, total } = await queryGetAllTrades(limit, offset, filters);

    // Calculate pagination metadata
    const page = Math.floor(offset / limit) + 1;
    const pageCount = Math.ceil(total / limit);
    const hasMore = offset + limit < total;
    const hasPrevious = offset > 0;

    logger.info('GET /api/trades', {
      limit,
      offset,
      page,
      total,
      returnedCount: trades.length,
      filters,
    });

    res.json({
      success: true,
      data: trades,
      pagination: {
        limit,
        offset,
        total,
        page,
        pageCount,
        hasMore,
        hasPrevious,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      });
    }
    logger.error('GET /api/trades error', {
      error: (error as Error).message,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trades',
    });
  }
};

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
export const createTrade = async (req: Request, res: Response) => {
  try {
    // Validate trade creation data
    validateTradeCreation(req.body);

    // Create trade in database
    const trade = await queryCreateTrade(req.body);

    logger.info('POST /api/trades - Trade created', {
      id: trade.id,
      symbol: trade.symbol,
      entryPrice: trade.entry_price,
      strategy: trade.strategy,
    });

    res.status(201).json({
      success: true,
      data: trade,
      message: 'Trade created successfully',
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      });
    }
    logger.error('POST /api/trades error', {
      error: (error as Error).message,
      body: req.body,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create trade',
    });
  }
};

/**
 * GET /api/trades/:id
 * Get single trade by ID
 */
export const getTradeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Trade ID is required',
      });
    }

    const trade = await queryGetTradeById(id);

    logger.info('GET /api/trades/:id', { id });

    res.json({
      success: true,
      data: trade,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      });
    }
    logger.error('GET /api/trades/:id error', {
      error: (error as Error).message,
      id: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trade',
    });
  }
};

/**
 * PUT /api/trades/:id
 * Update trade
 *
 * Body: Partial trade object with fields to update
 * All fields are optional
 */
export const updateTrade = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Trade ID is required',
      });
    }

    // Validate update data
    validateTradeUpdate(req.body);

    // Update trade in database
    const trade = await queryUpdateTrade(id, req.body);

    logger.info('PUT /api/trades/:id - Trade updated', {
      id,
      updates: Object.keys(req.body),
    });

    res.json({
      success: true,
      data: trade,
      message: 'Trade updated successfully',
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      });
    }
    logger.error('PUT /api/trades/:id error', {
      error: (error as Error).message,
      id: req.params.id,
      body: req.body,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update trade',
    });
  }
};

/**
 * DELETE /api/trades/:id
 * Delete trade
 */
export const deleteTrade = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Trade ID is required',
      });
    }

    await queryDeleteTrade(id);

    logger.info('DELETE /api/trades/:id - Trade deleted', { id });

    res.json({
      success: true,
      message: 'Trade deleted successfully',
      id,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      });
    }
    logger.error('DELETE /api/trades/:id error', {
      error: (error as Error).message,
      id: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to delete trade',
    });
  }
};

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
export const closeTrade = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { exit_price, exit_date } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Trade ID is required',
      });
    }

    // Validate close data
    validateTradeClose(exit_price, exit_date);

    // Close trade with P&L calculation
    const trade = await queryCloseTrade(id, exit_price, exit_date);

    logger.info('PUT /api/trades/:id/close - Trade closed', {
      id,
      exitPrice: exit_price,
      profitLoss: trade.profit_loss,
      percentReturn: trade.percent_return,
    });

    res.json({
      success: true,
      data: trade,
      message: 'Trade closed successfully',
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      });
    }
    logger.error('PUT /api/trades/:id/close error', {
      error: (error as Error).message,
      id: req.params.id,
      body: req.body,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to close trade',
    });
  }
};
