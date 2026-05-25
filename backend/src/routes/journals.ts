import { Router } from 'express';
import {
  createJournal,
  getJournalsByTrade,
  getJournalById,
  updateJournal,
  deleteJournal,
} from '../controllers/journalsController';

const router = Router({ mergeParams: true });

/**
 * Trade Journals Routes - Phase E: Trade Journals & Notes
 *
 * Routes (all under /api/trades/:id/journals):
 * POST   /                          - Create journal entry
 * GET    /                          - List journal entries (paginated)
 * GET    /:journalId                - Get single journal entry
 * PUT    /:journalId                - Update journal entry
 * DELETE /:journalId                - Delete journal entry
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
 *
 * Returns:
 * {
 *   id: string,
 *   trade_id: string,
 *   content: string,
 *   section_type: string,
 *   created_at: ISO timestamp,
 *   updated_at: ISO timestamp
 * }
 */
router.post('/', createJournal);

/**
 * GET /api/trades/:id/journals
 * List all journal entries for a trade with pagination
 *
 * Query params:
 * - limit: number (1-500, default 50)
 * - offset: number (default 0)
 *
 * Returns paginated array of journal entries with metadata
 */
router.get('/', getJournalsByTrade);

/**
 * GET /api/trades/:id/journals/:journalId
 * Get single journal entry by ID
 *
 * Returns:
 * {
 *   id: string,
 *   trade_id: string,
 *   content: string,
 *   section_type: string,
 *   created_at: ISO timestamp,
 *   updated_at: ISO timestamp
 * }
 */
router.get('/:journalId', getJournalById);

/**
 * PUT /api/trades/:id/journals/:journalId
 * Update journal entry
 *
 * Body (all optional):
 * {
 *   content?: string (markdown text),
 *   section_type?: 'setup' | 'execution' | 'review' | 'lesson'
 * }
 *
 * Returns updated journal entry
 */
router.put('/:journalId', updateJournal);

/**
 * DELETE /api/trades/:id/journals/:journalId
 * Delete journal entry
 *
 * Returns success message with deleted journal ID
 */
router.delete('/:journalId', deleteJournal);

export default router;
