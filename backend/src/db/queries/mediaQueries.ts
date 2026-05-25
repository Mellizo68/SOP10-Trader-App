/**
 * Media Database Queries
 *
 * Comprehensive media management for trades:
 * - Upload and store trade screenshots and files
 * - List media for a specific trade
 * - Delete media files
 * - Track media metadata
 *
 * All queries use prepared statements with numbered parameters ($1, $2, etc)
 * for security and performance.
 */

import pool from '../connection'
import { ApiError } from '../../middleware/errorHandler'
import { v4 as uuidv4 } from 'uuid'

/**
 * Media Entry Interface
 */
export interface MediaEntry {
  id: string
  trade_id: string
  media_type: string
  file_name: string
  file_size: number
  file_path: string
  s3_key?: string
  mime_type?: string
  created_at: Date
}

/**
 * Create media entry
 * Stores file metadata and updates trade's media count
 */
export async function queryCreateMedia(data: {
  trade_id: string
  media_type: string
  file_name: string
  file_size: number
  file_path: string
  s3_key?: string
  mime_type?: string
}): Promise<MediaEntry> {
  try {
    const id = uuidv4()
    const query = `
      INSERT INTO trade_media (id, trade_id, media_type, file_name, file_size, file_path, s3_key, mime_type, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      RETURNING id, trade_id, media_type, file_name, file_size, file_path, s3_key, mime_type, created_at
    `

    const result = await pool.query(query, [
      id,
      data.trade_id,
      data.media_type,
      data.file_name,
      data.file_size,
      data.file_path,
      data.s3_key || null,
      data.mime_type || null,
    ])

    const media = result.rows[0]

    // Update trade's media tracking
    await updateTradeMediaCount(data.trade_id)

    return {
      id: media.id,
      trade_id: media.trade_id,
      media_type: media.media_type,
      file_name: media.file_name,
      file_size: media.file_size,
      file_path: media.file_path,
      s3_key: media.s3_key,
      mime_type: media.mime_type,
      created_at: new Date(media.created_at),
    }
  } catch (error) {
    console.error('queryCreateMedia failed', {
      error: (error as Error).message,
    })
    throw new ApiError(500, 'Failed to store media')
  }
}

/**
 * Get all media for a trade
 */
export async function queryGetMediaByTradeId(
  trade_id: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ media: MediaEntry[]; total: number }> {
  try {
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM trade_media WHERE trade_id = $1`
    const countResult = await pool.query(countQuery, [trade_id])
    const total = parseInt(countResult.rows[0].total) || 0

    // Get paginated results
    const query = `
      SELECT id, trade_id, media_type, file_name, file_size, file_path, s3_key, mime_type, created_at
      FROM trade_media
      WHERE trade_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `

    const result = await pool.query(query, [trade_id, limit, offset])

    const media = result.rows.map((row: any) => ({
      id: row.id,
      trade_id: row.trade_id,
      media_type: row.media_type,
      file_name: row.file_name,
      file_size: row.file_size,
      file_path: row.file_path,
      s3_key: row.s3_key,
      mime_type: row.mime_type,
      created_at: new Date(row.created_at),
    }))

    return { media, total }
  } catch (error) {
    console.error('queryGetMediaByTradeId failed', {
      error: (error as Error).message,
    })
    throw new ApiError(500, 'Failed to fetch media')
  }
}

/**
 * Get single media entry by ID
 */
export async function queryGetMediaById(media_id: string): Promise<MediaEntry> {
  try {
    const query = `
      SELECT id, trade_id, media_type, file_name, file_size, file_path, s3_key, mime_type, created_at
      FROM trade_media
      WHERE id = $1
    `

    const result = await pool.query(query, [media_id])

    if (!result.rows[0]) {
      throw new ApiError(404, 'Media not found')
    }

    const row = result.rows[0]
    return {
      id: row.id,
      trade_id: row.trade_id,
      media_type: row.media_type,
      file_name: row.file_name,
      file_size: row.file_size,
      file_path: row.file_path,
      s3_key: row.s3_key,
      mime_type: row.mime_type,
      created_at: new Date(row.created_at),
    }
  } catch (error) {
    if (error instanceof ApiError) throw error
    console.error('queryGetMediaById failed', {
      error: (error as Error).message,
    })
    throw new ApiError(500, 'Failed to fetch media')
  }
}

/**
 * Delete media entry
 */
export async function queryDeleteMedia(media_id: string): Promise<void> {
  try {
    // Get media first to get trade_id
    const media = await queryGetMediaById(media_id)

    // Delete from database
    const query = `DELETE FROM trade_media WHERE id = $1`
    await pool.query(query, [media_id])

    // Update trade's media count
    await updateTradeMediaCount(media.trade_id)
  } catch (error) {
    if (error instanceof ApiError) throw error
    console.error('queryDeleteMedia failed', {
      error: (error as Error).message,
    })
    throw new ApiError(500, 'Failed to delete media')
  }
}

/**
 * Helper: Update trade's media count and has_media flag
 */
async function updateTradeMediaCount(trade_id: string): Promise<void> {
  try {
    const query = `
      UPDATE trades
      SET
        media_count = (SELECT COUNT(*) FROM trade_media WHERE trade_id = $1),
        has_media = (SELECT COUNT(*) > 0 FROM trade_media WHERE trade_id = $1)
      WHERE id = $1
    `
    await pool.query(query, [trade_id])
  } catch (error) {
    console.error('updateTradeMediaCount failed', {
      error: (error as Error).message,
    })
    // Don't throw - this is a background update
  }
}

/**
 * Get total media size for a trade
 */
export async function queryGetMediaTotalSize(trade_id: string): Promise<number> {
  try {
    const query = `
      SELECT COALESCE(SUM(file_size), 0) as total_size
      FROM trade_media
      WHERE trade_id = $1
    `

    const result = await pool.query(query, [trade_id])
    return parseInt(result.rows[0].total_size) || 0
  } catch (error) {
    console.error('queryGetMediaTotalSize failed', {
      error: (error as Error).message,
    })
    return 0
  }
}

export default {
  queryCreateMedia,
  queryGetMediaByTradeId,
  queryGetMediaById,
  queryDeleteMedia,
  queryGetMediaTotalSize,
}
