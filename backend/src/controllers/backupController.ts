/**
 * Backup Controller
 *
 * Handles database backup and restore operations:
 * - Create backup: Export all trades, journals, and media to JSON with SHA256 checksum
 * - Restore backup: Import data from backup JSON with conflict resolution
 * - Admin-only operations with password verification
 */

import { Request, Response, NextFunction } from 'express'
import { createHash } from 'crypto'
import pool from '../db/connection'
import { ApiError } from '../middleware/errorHandler'
import logger from '../utils/logger'

/**
 * Timing-safe password comparison
 */
function timingSafeCompare(provided: string, actual: string): boolean {
  if (provided.length !== actual.length) {
    return false
  }
  let result = 0
  for (let i = 0; i < provided.length; i++) {
    result |= provided.charCodeAt(i) ^ actual.charCodeAt(i)
  }
  return result === 0
}

/**
 * Calculate SHA256 checksum
 */
function calculateChecksum(data: string): string {
  return createHash('sha256').update(data).digest('hex')
}

/**
 * Create database backup as JSON file
 */
export async function createBackup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { includeTrades = true, includeJournals = true, includeMedia = true } = req.body || {}

    logger.info('createBackup', {
      includeTrades,
      includeJournals,
      includeMedia,
    })

    const backup: any = {
      version: '1.0',
      timestamp: new Date().toISOString(),
    }

    // Fetch trades if requested
    if (includeTrades) {
      const tradesResult = await pool.query('SELECT * FROM trades ORDER BY created_at DESC')
      backup.trades = tradesResult.rows
    }

    // Fetch journals if requested
    if (includeJournals) {
      const journalsResult = await pool.query('SELECT * FROM trade_journals ORDER BY created_at DESC')
      backup.journals = journalsResult.rows
    }

    // Fetch media if requested
    if (includeMedia) {
      const mediaResult = await pool.query('SELECT * FROM trade_media ORDER BY created_at DESC')
      backup.media = mediaResult.rows
    }

    // Calculate metadata
    backup.metadata = {
      tradeCount: (backup.trades || []).length,
      journalCount: (backup.journals || []).length,
      mediaCount: (backup.media || []).length,
    }

    // Calculate checksum
    const dataString = JSON.stringify(backup)
    backup.checksum = calculateChecksum(dataString)

    const filename = `sop10-backup-${new Date().toISOString().split('T')[0]}-${Date.now()}.json`
    const fileSize = Buffer.byteLength(dataString)

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.json({
      success: true,
      filename,
      size: fileSize,
      checksum: backup.checksum,
      message: `Backup created: ${backup.metadata.tradeCount} trades, ${backup.metadata.journalCount} journals, ${backup.metadata.mediaCount} media`,
      backup,
    })
  } catch (error) {
    logger.error('createBackup failed', {
      error: (error as Error).message,
    })
    next(new ApiError(500, 'Failed to create backup'))
  }
}

/**
 * Restore database from backup JSON file
 */
export async function restoreBackup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { backup, adminPassword, conflictResolution = 'skip' } = req.body

    // Verify admin password
    const expectedPassword = process.env.ADMIN_PASSWORD || 'default-password'
    if (!timingSafeCompare(adminPassword || '', expectedPassword)) {
      throw new ApiError(401, 'Invalid admin password')
    }

    if (!backup) {
      throw new ApiError(400, 'No backup data provided')
    }

    logger.info('restoreBackup', {
      conflictResolution,
      tradeCount: (backup.trades || []).length,
      journalCount: (backup.journals || []).length,
      mediaCount: (backup.media || []).length,
    })

    // Verify checksum
    const backupCopy = { ...backup }
    const providedChecksum = backupCopy.checksum
    delete backupCopy.checksum
    const calculatedChecksum = calculateChecksum(JSON.stringify(backupCopy))

    if (providedChecksum !== calculatedChecksum) {
      throw new ApiError(400, 'Backup checksum verification failed - data may be corrupted')
    }

    let recordsRestored = 0
    let conflicts = 0
    let skipped = 0

    // Restore trades
    if (backup.trades && Array.isArray(backup.trades)) {
      for (const trade of backup.trades) {
        // Check if trade exists
        const existsResult = await pool.query('SELECT id FROM trades WHERE id = $1', [trade.id])
        if (existsResult.rows.length > 0) {
          conflicts++
          if (conflictResolution === 'overwrite') {
            // Update existing trade
            const setClause = Object.keys(trade)
              .filter((k) => k !== 'id')
              .map((k, i) => `${k} = $${i + 2}`)
              .join(', ')
            const values = Object.values(trade).filter((_, i) => Object.keys(trade)[i] !== 'id')
            await pool.query(`UPDATE trades SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [
              trade.id,
              ...values,
            ])
            recordsRestored++
          } else {
            skipped++
          }
        } else {
          // Insert new trade
          const columns = Object.keys(trade).join(', ')
          const placeholders = Object.keys(trade)
            .map((_, i) => `$${i + 1}`)
            .join(', ')
          await pool.query(`INSERT INTO trades (${columns}) VALUES (${placeholders})`, Object.values(trade))
          recordsRestored++
        }
      }
    }

    // Restore journals
    if (backup.journals && Array.isArray(backup.journals)) {
      for (const journal of backup.journals) {
        const existsResult = await pool.query('SELECT id FROM trade_journals WHERE id = $1', [journal.id])
        if (existsResult.rows.length > 0) {
          conflicts++
          if (conflictResolution === 'overwrite') {
            const setClause = Object.keys(journal)
              .filter((k) => k !== 'id')
              .map((k, i) => `${k} = $${i + 2}`)
              .join(', ')
            const values = Object.values(journal).filter((_, i) => Object.keys(journal)[i] !== 'id')
            await pool.query(`UPDATE trade_journals SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [
              journal.id,
              ...values,
            ])
            recordsRestored++
          } else {
            skipped++
          }
        } else {
          const columns = Object.keys(journal).join(', ')
          const placeholders = Object.keys(journal)
            .map((_, i) => `$${i + 1}`)
            .join(', ')
          await pool.query(`INSERT INTO trade_journals (${columns}) VALUES (${placeholders})`, Object.values(journal))
          recordsRestored++
        }
      }
    }

    // Restore media
    if (backup.media && Array.isArray(backup.media)) {
      for (const media of backup.media) {
        const existsResult = await pool.query('SELECT id FROM trade_media WHERE id = $1', [media.id])
        if (existsResult.rows.length > 0) {
          conflicts++
          if (conflictResolution === 'overwrite') {
            const setClause = Object.keys(media)
              .filter((k) => k !== 'id')
              .map((k, i) => `${k} = $${i + 2}`)
              .join(', ')
            const values = Object.values(media).filter((_, i) => Object.keys(media)[i] !== 'id')
            await pool.query(`UPDATE trade_media SET ${setClause} WHERE id = $1`, [media.id, ...values])
            recordsRestored++
          } else {
            skipped++
          }
        } else {
          const columns = Object.keys(media).join(', ')
          const placeholders = Object.keys(media)
            .map((_, i) => `$${i + 1}`)
            .join(', ')
          await pool.query(`INSERT INTO trade_media (${columns}) VALUES (${placeholders})`, Object.values(media))
          recordsRestored++
        }
      }
    }

    res.json({
      success: true,
      recordsRestored,
      conflicts,
      skipped,
      message: `Restore complete: ${recordsRestored} records restored, ${conflicts} conflicts (${conflictResolution}), ${skipped} skipped`,
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error)
    }
    logger.error('restoreBackup failed', {
      error: (error as Error).message,
    })
    next(new ApiError(500, 'Failed to restore backup'))
  }
}

export default {
  createBackup,
  restoreBackup,
}
