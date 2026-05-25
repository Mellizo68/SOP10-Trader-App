import { Router } from 'express'
import multer from 'multer'
import {
  uploadMedia,
  getMediaByTrade,
  deleteMedia,
  downloadMedia,
} from '../controllers/mediaController'

const router = Router({ mergeParams: true })

// Configure multer for file uploads
// Store in memory for processing, not on disk (disk storage handled by controller)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
})

/**
 * Trade Media Routes - Phase E: Trade Screenshots & Media Storage
 *
 * Routes (all under /api/trades/:id/media):
 * POST   /                          - Upload media file
 * GET    /                          - List media files (paginated)
 * DELETE /:mediaId                  - Delete media file
 * GET    /:mediaId/download         - Download/view media file
 */

/**
 * POST /api/trades/:id/media
 * Upload media file for a trade
 *
 * Body: multipart/form-data with 'file' field (image only)
 * Supported formats: JPEG, PNG, WebP, GIF
 * Max file size: 10MB
 * Max total per trade: 50MB
 *
 * Returns:
 * {
 *   success: boolean,
 *   data: {
 *     id: string,
 *     trade_id: string,
 *     media_type: string,
 *     file_name: string,
 *     file_size: number,
 *     file_path: string,
 *     mime_type: string,
 *     created_at: ISO timestamp,
 *     downloadUrl: string
 *   },
 *   message: string
 * }
 */
router.post('/', upload.single('file'), uploadMedia)

/**
 * GET /api/trades/:id/media
 * List all media for a trade with pagination
 *
 * Query params:
 * - limit: number (1-500, default 50)
 * - offset: number (default 0)
 *
 * Returns:
 * {
 *   success: boolean,
 *   data: array of media entries with downloadUrl,
 *   pagination: {
 *     limit, offset, total, page, pageCount, hasMore, hasPrevious
 *   }
 * }
 */
router.get('/', getMediaByTrade)

/**
 * DELETE /api/trades/:id/media/:mediaId
 * Delete media file and database entry
 *
 * Returns:
 * {
 *   success: boolean,
 *   message: string,
 *   mediaId: string
 * }
 */
router.delete('/:mediaId', deleteMedia)

/**
 * GET /api/trades/:id/media/:mediaId/download
 * Download or view media file
 *
 * Returns file with proper Content-Type and Content-Disposition headers
 * Can be viewed inline in browser or downloaded depending on client
 */
router.get('/:mediaId/download', downloadMedia)

export default router
