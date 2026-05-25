import { Request, Response } from 'express';
import logger from '../utils/logger';
import {
  queryCreateJournal,
  queryGetJournalsByTradeId,
  queryGetJournalById,
  queryUpdateJournal,
  queryDeleteJournal,
  JournalEntry,
} from '../db/queries/journalQueries';
import { ApiError } from '../middleware/errorHandler';

/**
 * Journals Controller - Phase E: Trade Journals & Notes
 *
 * Implements 5 CRUD endpoints:
 * 1. POST /api/trades/:id/journals - Create journal entry
 * 2. GET /api/trades/:id/journals - List journal entries for trade
 * 3. GET /api/trades/:id/journals/:journalId - Get single entry
 * 4. PUT /api/trades/:id/journals/:journalId - Update journal entry
 * 5. DELETE /api/trades/:id/journals/:journalId - Delete journal entry
 */

/**
 * POST /api/trades/:id/journals
 * Create new journal entry for a trade
 *
 * Body:
 * {
 *   content: string (required, markdown text),
 *   section_type: 'setup' | 'execution' | 'review' | 'lesson' (required)
 * }
 */
export const createJournal = async (req: Request, res: Response) => {
  try {
    const { id: tradeId } = req.params;
    const { content, section_type } = req.body;

    // Validate required fields
    if (!tradeId) {
      return res.status(400).json({
        success: false,
        error: 'Trade ID is required',
      });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Content is required and must be a non-empty string',
      });
    }

    if (!section_type || !['setup', 'execution', 'review', 'lesson'].includes(section_type)) {
      return res.status(400).json({
        success: false,
        error: 'section_type must be one of: setup, execution, review, lesson',
      });
    }

    // Create journal entry
    const journal = await queryCreateJournal({
      trade_id: tradeId,
      content,
      section_type,
    });

    logger.info('POST /api/trades/:id/journals - Journal entry created', {
      journalId: journal.id,
      tradeId,
      sectionType: section_type,
      contentLength: content.length,
    });

    res.status(201).json({
      success: true,
      data: journal,
      message: 'Journal entry created successfully',
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      });
    }
    logger.error('POST /api/trades/:id/journals error', {
      error: (error as Error).message,
      tradeId: req.params.id,
      body: req.body,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create journal entry',
    });
  }
};

/**
 * GET /api/trades/:id/journals
 * List all journal entries for a specific trade
 *
 * Query params:
 * - limit: number (1-500, default 50)
 * - offset: number (default 0)
 */
export const getJournalsByTrade = async (req: Request, res: Response) => {
  try {
    const { id: tradeId } = req.params;

    if (!tradeId) {
      return res.status(400).json({
        success: false,
        error: 'Trade ID is required',
      });
    }

    // Parse pagination parameters
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 500);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    // Fetch journal entries
    const { journals, total } = await queryGetJournalsByTradeId(tradeId, limit, offset);

    // Calculate pagination metadata
    const page = Math.floor(offset / limit) + 1;
    const pageCount = Math.ceil(total / limit);
    const hasMore = offset + limit < total;
    const hasPrevious = offset > 0;

    logger.info('GET /api/trades/:id/journals', {
      tradeId,
      limit,
      offset,
      page,
      total,
      returnedCount: journals.length,
    });

    res.json({
      success: true,
      data: journals,
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
    logger.error('GET /api/trades/:id/journals error', {
      error: (error as Error).message,
      tradeId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch journal entries',
    });
  }
};

/**
 * GET /api/trades/:id/journals/:journalId
 * Get single journal entry by ID
 */
export const getJournalById = async (req: Request, res: Response) => {
  try {
    const { id: tradeId, journalId } = req.params;

    if (!tradeId || !journalId) {
      return res.status(400).json({
        success: false,
        error: 'Trade ID and Journal ID are required',
      });
    }

    const journal = await queryGetJournalById(journalId);

    // Verify journal belongs to the specified trade
    if (journal.trade_id !== tradeId) {
      return res.status(404).json({
        success: false,
        error: 'Journal entry not found for this trade',
      });
    }

    logger.info('GET /api/trades/:id/journals/:journalId', {
      tradeId,
      journalId,
    });

    res.json({
      success: true,
      data: journal,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      });
    }
    logger.error('GET /api/trades/:id/journals/:journalId error', {
      error: (error as Error).message,
      tradeId: req.params.id,
      journalId: req.params.journalId,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch journal entry',
    });
  }
};

/**
 * PUT /api/trades/:id/journals/:journalId
 * Update journal entry
 *
 * Body (all optional):
 * {
 *   content?: string (markdown text),
 *   section_type?: 'setup' | 'execution' | 'review' | 'lesson'
 * }
 */
export const updateJournal = async (req: Request, res: Response) => {
  try {
    const { id: tradeId, journalId } = req.params;
    const { content, section_type } = req.body;

    if (!tradeId || !journalId) {
      return res.status(400).json({
        success: false,
        error: 'Trade ID and Journal ID are required',
      });
    }

    // Validate update data
    if (section_type && !['setup', 'execution', 'review', 'lesson'].includes(section_type)) {
      return res.status(400).json({
        success: false,
        error: 'section_type must be one of: setup, execution, review, lesson',
      });
    }

    if (content !== undefined && (typeof content !== 'string' || content.trim().length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Content must be a non-empty string if provided',
      });
    }

    // Get current journal to verify it exists and belongs to trade
    const currentJournal = await queryGetJournalById(journalId);
    if (currentJournal.trade_id !== tradeId) {
      return res.status(404).json({
        success: false,
        error: 'Journal entry not found for this trade',
      });
    }

    // Update journal
    const journal = await queryUpdateJournal(journalId, {
      content,
      section_type,
    });

    logger.info('PUT /api/trades/:id/journals/:journalId - Journal updated', {
      journalId,
      tradeId,
      updates: Object.keys(req.body),
    });

    res.json({
      success: true,
      data: journal,
      message: 'Journal entry updated successfully',
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      });
    }
    logger.error('PUT /api/trades/:id/journals/:journalId error', {
      error: (error as Error).message,
      tradeId: req.params.id,
      journalId: req.params.journalId,
      body: req.body,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update journal entry',
    });
  }
};

/**
 * DELETE /api/trades/:id/journals/:journalId
 * Delete journal entry
 */
export const deleteJournal = async (req: Request, res: Response) => {
  try {
    const { id: tradeId, journalId } = req.params;

    if (!tradeId || !journalId) {
      return res.status(400).json({
        success: false,
        error: 'Trade ID and Journal ID are required',
      });
    }

    // Get current journal to verify it exists and belongs to trade
    const journal = await queryGetJournalById(journalId);
    if (journal.trade_id !== tradeId) {
      return res.status(404).json({
        success: false,
        error: 'Journal entry not found for this trade',
      });
    }

    // Delete journal
    await queryDeleteJournal(journalId);

    logger.info('DELETE /api/trades/:id/journals/:journalId - Journal deleted', {
      journalId,
      tradeId,
    });

    res.json({
      success: true,
      message: 'Journal entry deleted successfully',
      journalId,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      });
    }
    logger.error('DELETE /api/trades/:id/journals/:journalId error', {
      error: (error as Error).message,
      tradeId: req.params.id,
      journalId: req.params.journalId,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to delete journal entry',
    });
  }
};
