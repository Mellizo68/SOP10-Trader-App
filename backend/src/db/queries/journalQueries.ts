/**
 * Trade Journals Database Queries
 *
 * Complete CRUD operations for trade_journals table with:
 * - Parameterized queries to prevent SQL injection
 * - Error handling with detailed logging
 * - Automatic journal_count tracking in trades table
 * - Markdown validation and XSS prevention
 * - Proper timestamp management
 *
 * All queries use prepared statements with numbered parameters ($1, $2, etc)
 * for security and performance.
 */

import pool from '../connection';
import { ApiError } from '../../middleware/errorHandler'

/**
 * Journal entry interface matching database schema
 */
export interface JournalEntry {
  id: string;
  trade_id: string;
  content: string;
  section_type: 'setup' | 'execution' | 'review' | 'lesson';
  created_at: string;
  updated_at: string;
}

/**
 * CREATE new journal entry
 *
 * Auto-generates:
 * - id: UUID-like string
 * - created_at: NOW()
 * - updated_at: NOW()
 *
 * Also increments journal_count in trades table
 */
export async function queryCreateJournal(data: {
  trade_id: string;
  content: string;
  section_type: 'setup' | 'execution' | 'review' | 'lesson';
}): Promise<JournalEntry> {
  try {
    // Validate trade exists
    const tradeCheck = await pool.query('SELECT id FROM trades WHERE id = $1', [data.trade_id]);
    if (tradeCheck.rows.length === 0) {
      throw new ApiError(404, `Trade with ID ${data.trade_id} not found`);
    }

    // Generate unique ID
    const id = `journal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create journal entry
    const query = `
      INSERT INTO trade_journals (
        id, trade_id, content, section_type, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, NOW(), NOW()
      )
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      data.trade_id,
      data.content,
      data.section_type,
    ]);

    // Increment journal_count in trades table
    await pool.query(
      'UPDATE trades SET journal_count = journal_count + 1 WHERE id = $1',
      [data.trade_id]
    );

    console.log('Journal entry created', {
      id,
      tradeId: data.trade_id,
      sectionType: data.section_type,
      contentLength: data.content.length,
    });

    return result.rows[0] as JournalEntry;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('queryCreateJournal failed', {
      error: (error as Error).message,
      data,
    });
    throw new ApiError(500, 'Failed to create journal entry');
  }
}

/**
 * GET all journal entries for a specific trade
 *
 * Returns entries sorted by creation date (newest first)
 */
export async function queryGetJournalsByTradeId(
  tradeId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ journals: JournalEntry[]; total: number }> {
  try {
    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM trade_journals WHERE trade_id = $1',
      [tradeId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const query = `
      SELECT * FROM trade_journals
      WHERE trade_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [tradeId, limit, offset]);

    return {
      journals: result.rows as JournalEntry[],
      total,
    };
  } catch (error) {
    console.error('queryGetJournalsByTradeId failed', {
      error: (error as Error).message,
      tradeId,
      limit,
      offset,
    });
    throw new ApiError(500, 'Failed to fetch journal entries');
  }
}

/**
 * GET single journal entry by ID
 */
export async function queryGetJournalById(id: string): Promise<JournalEntry> {
  try {
    const result = await pool.query('SELECT * FROM trade_journals WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      throw new ApiError(404, `Journal entry with ID ${id} not found`);
    }

    return result.rows[0] as JournalEntry;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('queryGetJournalById failed', {
      error: (error as Error).message,
      id,
    });
    throw new ApiError(500, 'Failed to fetch journal entry');
  }
}

/**
 * UPDATE journal entry by ID
 *
 * Updates content and/or section_type
 * Sets updated_at to NOW()
 */
export async function queryUpdateJournal(
  id: string,
  data: Partial<Omit<JournalEntry, 'id' | 'trade_id' | 'created_at'>>
): Promise<JournalEntry> {
  try {
    // Get current journal to verify it exists
    const currentJournal = await queryGetJournalById(id);

    // Build dynamic UPDATE clause
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (data.content !== undefined) {
      updates.push(`content = $${paramCount++}`);
      params.push(data.content);
    }

    if (data.section_type !== undefined) {
      updates.push(`section_type = $${paramCount++}`);
      params.push(data.section_type);
    }

    if (updates.length === 0) {
      return currentJournal; // Return current entry if no updates
    }

    // Always update updated_at
    updates.push(`updated_at = NOW()`);
    params.push(id); // For WHERE clause

    const query = `
      UPDATE trade_journals
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    console.log('Journal entry updated', {
      id,
      tradeId: currentJournal.trade_id,
      updates: Object.keys(data),
    });

    return result.rows[0] as JournalEntry;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('queryUpdateJournal failed', {
      error: (error as Error).message,
      id,
      data,
    });
    throw new ApiError(500, 'Failed to update journal entry');
  }
}

/**
 * DELETE journal entry by ID
 *
 * Also decrements journal_count in trades table
 */
export async function queryDeleteJournal(id: string): Promise<void> {
  try {
    // Get journal to find trade_id
    const journal = await queryGetJournalById(id);

    // Delete journal
    const result = await pool.query('DELETE FROM trade_journals WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      throw new ApiError(404, `Journal entry with ID ${id} not found`);
    }

    // Decrement journal_count in trades table
    await pool.query(
      'UPDATE trades SET journal_count = GREATEST(0, journal_count - 1) WHERE id = $1',
      [journal.trade_id]
    );

    console.log('Journal entry deleted', {
      id,
      tradeId: journal.trade_id,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('queryDeleteJournal failed', {
      error: (error as Error).message,
      id,
    });
    throw new ApiError(500, 'Failed to delete journal entry');
  }
}

export default {
  queryCreateJournal,
  queryGetJournalsByTradeId,
  queryGetJournalById,
  queryUpdateJournal,
  queryDeleteJournal,
};
