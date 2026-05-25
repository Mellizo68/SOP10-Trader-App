import { Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import logger from '../utils/logger'
import {
  queryCreateMedia,
  queryGetMediaByTradeId,
  queryGetMediaById,
  queryDeleteMedia,
  queryGetMediaTotalSize,
  MediaEntry,
} from '../db/queries/mediaQueries'
import { ApiError } from '../middleware/errorHandler'

/**
 * Media Controller - Phase E: Trade Screenshots & Media Storage
 *
 * Implements 3 CRUD endpoints for media management:
 * 1. POST /api/trades/:id/media - Upload media file
 * 2. GET /api/trades/:id/media - List media files
 * 3. DELETE /api/trades/:id/media/:mediaId - Delete media file
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB per file
const MAX_TOTAL_SIZE = 50 * 1024 * 1024 // 50MB per trade
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'media')

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

/**
 * POST /api/trades/:id/media
 * Upload media file for a trade
 *
 * Body: multipart/form-data with 'file' field
 */
export const uploadMedia = async (req: Request, res: Response) => {
  try {
    const { id: tradeId } = req.params

    if (!tradeId) {
      return res.status(400).json({
        success: false,
        error: 'Trade ID is required',
      })
    }

    // Check if file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided',
      })
    }

    const { originalname, mimetype, size, buffer } = req.file

    // Validate file size
    if (size > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
      })
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'Only image files are allowed (JPEG, PNG, WebP, GIF)',
      })
    }

    // Check total size for trade
    const totalSize = await queryGetMediaTotalSize(tradeId)
    if (totalSize + size > MAX_TOTAL_SIZE) {
      return res.status(400).json({
        success: false,
        error: `Total media size for this trade would exceed ${MAX_TOTAL_SIZE / 1024 / 1024}MB limit`,
      })
    }

    // Save file to disk
    const fileExtension = path.extname(originalname)
    const fileName = `${tradeId}-${Date.now()}${fileExtension}`
    const filePath = path.join(UPLOAD_DIR, fileName)

    fs.writeFileSync(filePath, buffer)

    // Create media entry in database
    const media = await queryCreateMedia({
      trade_id: tradeId,
      media_type: 'screenshot',
      file_name: originalname,
      file_size: size,
      file_path: filePath,
      mime_type: mimetype,
    })

    logger.info('POST /api/trades/:id/media - Media uploaded', {
      mediaId: media.id,
      tradeId,
      fileName: originalname,
      fileSize: size,
    })

    res.status(201).json({
      success: true,
      data: {
        ...media,
        downloadUrl: `/api/trades/${tradeId}/media/${media.id}/download`,
      },
      message: 'Media uploaded successfully',
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      })
    }
    logger.error('POST /api/trades/:id/media error', {
      error: (error as Error).message,
      tradeId: req.params.id,
    })
    res.status(500).json({
      success: false,
      error: 'Failed to upload media',
    })
  }
}

/**
 * GET /api/trades/:id/media
 * List all media for a trade
 *
 * Query params:
 * - limit: number (1-500, default 50)
 * - offset: number (default 0)
 */
export const getMediaByTrade = async (req: Request, res: Response) => {
  try {
    const { id: tradeId } = req.params

    if (!tradeId) {
      return res.status(400).json({
        success: false,
        error: 'Trade ID is required',
      })
    }

    // Parse pagination parameters
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 500)
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0)

    // Fetch media
    const { media, total } = await queryGetMediaByTradeId(tradeId, limit, offset)

    // Add download URLs
    const mediaWithUrls = media.map((m) => ({
      ...m,
      downloadUrl: `/api/trades/${tradeId}/media/${m.id}/download`,
    }))

    // Calculate pagination metadata
    const page = Math.floor(offset / limit) + 1
    const pageCount = Math.ceil(total / limit)
    const hasMore = offset + limit < total
    const hasPrevious = offset > 0

    logger.info('GET /api/trades/:id/media', {
      tradeId,
      limit,
      offset,
      total,
      returnedCount: media.length,
    })

    res.json({
      success: true,
      data: mediaWithUrls,
      pagination: {
        limit,
        offset,
        total,
        page,
        pageCount,
        hasMore,
        hasPrevious,
      },
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      })
    }
    logger.error('GET /api/trades/:id/media error', {
      error: (error as Error).message,
      tradeId: req.params.id,
    })
    res.status(500).json({
      success: false,
      error: 'Failed to fetch media',
    })
  }
}

/**
 * DELETE /api/trades/:id/media/:mediaId
 * Delete media file
 */
export const deleteMedia = async (req: Request, res: Response) => {
  try {
    const { id: tradeId, mediaId } = req.params

    if (!tradeId || !mediaId) {
      return res.status(400).json({
        success: false,
        error: 'Trade ID and Media ID are required',
      })
    }

    // Get media first to verify it belongs to trade
    const media = await queryGetMediaById(mediaId)
    if (media.trade_id !== tradeId) {
      return res.status(404).json({
        success: false,
        error: 'Media not found for this trade',
      })
    }

    // Delete file from disk
    if (fs.existsSync(media.file_path)) {
      fs.unlinkSync(media.file_path)
    }

    // Delete from database
    await queryDeleteMedia(mediaId)

    logger.info('DELETE /api/trades/:id/media/:mediaId - Media deleted', {
      mediaId,
      tradeId,
    })

    res.json({
      success: true,
      message: 'Media deleted successfully',
      mediaId,
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      })
    }
    logger.error('DELETE /api/trades/:id/media/:mediaId error', {
      error: (error as Error).message,
      tradeId: req.params.id,
      mediaId: req.params.mediaId,
    })
    res.status(500).json({
      success: false,
      error: 'Failed to delete media',
    })
  }
}

/**
 * GET /api/trades/:id/media/:mediaId/download
 * Download/view media file
 */
export const downloadMedia = async (req: Request, res: Response) => {
  try {
    const { id: tradeId, mediaId } = req.params

    if (!tradeId || !mediaId) {
      return res.status(400).json({
        success: false,
        error: 'Trade ID and Media ID are required',
      })
    }

    // Get media
    const media = await queryGetMediaById(mediaId)
    if (media.trade_id !== tradeId) {
      return res.status(404).json({
        success: false,
        error: 'Media not found for this trade',
      })
    }

    // Check if file exists
    if (!fs.existsSync(media.file_path)) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
      })
    }

    // Send file
    res.setHeader('Content-Type', media.mime_type || 'application/octet-stream')
    res.setHeader('Content-Disposition', `inline; filename="${media.file_name}"`)
    res.sendFile(media.file_path)

    logger.info('GET /api/trades/:id/media/:mediaId/download', {
      mediaId,
      tradeId,
      fileName: media.file_name,
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      })
    }
    logger.error('GET /api/trades/:id/media/:mediaId/download error', {
      error: (error as Error).message,
      tradeId: req.params.id,
      mediaId: req.params.mediaId,
    })
    res.status(500).json({
      success: false,
      error: 'Failed to download media',
    })
  }
}
