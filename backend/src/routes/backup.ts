/**
 * Backup Routes
 *
 * Handles database backup and restore operations:
 * - POST /api/backup/create: Export all trades, journals, media to JSON with checksum
 * - POST /api/backup/restore: Import data from backup JSON with conflict resolution
 */

import { Router } from 'express'
import { createBackup, restoreBackup } from '../controllers/backupController'

const router = Router()

// Create backup
router.post('/create', createBackup)

// Restore backup
router.post('/restore', restoreBackup)

export default router
