import { Request, Response } from 'express'
import { query } from '../db/connection'
import { validateTrade, validateCloseRequest, validatePaginationParams } from '../utils/validators'
import { mapRowToTrade, buildWhereClause } from '../utils/db-utils'
import { TradeEntry, TradeFilter, PaginatedResponse } from '../types'
import { ApiError } from '../middleware/errorHandler'

export class TradesController {
  static async getAllTrades(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0
      const status = (req.query.status as string | undefined) as 'open' | 'closed' | 'cancelled' | undefined

      const { limit: validLimit, offset: validOffset } = validatePaginationParams(limit, offset)

      const filters: TradeFilter = { status, limit: validLimit, offset: validOffset }
      const { whereClause, params } = buildWhereClause(filters)

      // Get total count
      const countResult = await query(`SELECT COUNT(*) as count FROM trades ${whereClause}`, params)
      const total = parseInt(countResult.rows[0].count)

      // Get paginated trades
      const result = await query(
        `SELECT * FROM trades ${whereClause} ORDER BY date_entry DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, validLimit, validOffset]
      )

      const trades = result.rows.map(mapRowToTrade)

      const response: PaginatedResponse<TradeEntry> = {
        data: trades,
        total,
        page: Math.floor(validOffset / validLimit) + 1,
        pageSize: validLimit
      }

      res.json({ success: true, ...response })
    } catch (error) {
      console.error('Error fetching trades:', error)
      res.status(500).json({ success: false, error: 'Failed to fetch trades' })
    }
  }

  static async getTradeById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      const result = await query('SELECT * FROM trades WHERE id = $1', [id])

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Trade not found' })
        return
      }

      const trade = mapRowToTrade(result.rows[0])
      res.json({ success: true, data: trade })
    } catch (error) {
      console.error('Error fetching trade:', error)
      res.status(500).json({ success: false, error: 'Failed to fetch trade' })
    }
  }

  static async createTrade(req: Request, res: Response): Promise<void> {
    try {
      const data: Partial<TradeEntry> = req.body

      validateTrade(data)

      // Generate ID and entry number
      const countResult = await query('SELECT COUNT(*) as count FROM trades')
      const entryNumber = parseInt(countResult.rows[0].count) + 1
      const id = `TRADE-${String(entryNumber).padStart(4, '0')}`

      const insertResult = await query(
        `INSERT INTO trades (
          id, entry_number, date_entry, symbol, strategy, strike_price, delta,
          days_to_expiration, iv_percent, gex_status, pvp_status, vwap_status,
          confluence_score, entry_price, take_profit, stop_loss, status, comments
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *`,
        [
          id,
          entryNumber,
          data.dateEntry || new Date(),
          data.symbol,
          data.strategy,
          data.strikePrice || null,
          data.delta || null,
          data.daysToExpiration || null,
          data.ivPercent || null,
          data.gexStatus || null,
          data.pvpStatus || null,
          data.vwapStatus || null,
          data.confluenceScore || 0,
          data.entryPrice,
          data.takeProfit || null,
          data.stopLoss || null,
          'open',
          data.comments || null
        ]
      )

      const trade = mapRowToTrade(insertResult.rows[0])
      res.status(201).json({ success: true, data: trade })
    } catch (error) {
      console.error('Error creating trade:', error)
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ success: false, error: error.message })
      } else {
        res.status(500).json({ success: false, error: 'Failed to create trade' })
      }
    }
  }

  static async updateTrade(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const data: Partial<TradeEntry> = req.body

      if (Object.keys(data).length === 0) {
        res.status(400).json({ success: false, error: 'No fields to update' })
        return
      }

      // Build dynamic update query
      const fields: string[] = []
      const values: any[] = []
      let paramIndex = 1

      if (data.symbol) {
        fields.push(`symbol = $${paramIndex}`)
        values.push(data.symbol)
        paramIndex++
      }

      if (data.strategy) {
        fields.push(`strategy = $${paramIndex}`)
        values.push(data.strategy)
        paramIndex++
      }

      if (data.confluenceScore !== undefined) {
        fields.push(`confluence_score = $${paramIndex}`)
        values.push(data.confluenceScore)
        paramIndex++
      }

      if (data.comments !== undefined) {
        fields.push(`comments = $${paramIndex}`)
        values.push(data.comments)
        paramIndex++
      }

      fields.push(`updated_at = NOW()`)

      values.push(id)

      const updateQuery = `UPDATE trades SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`

      const result = await query(updateQuery, values)

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Trade not found' })
        return
      }

      const trade = mapRowToTrade(result.rows[0])
      res.json({ success: true, data: trade })
    } catch (error) {
      console.error('Error updating trade:', error)
      res.status(500).json({ success: false, error: 'Failed to update trade' })
    }
  }

  static async closeTrade(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const { exitPrice, exitDate } = req.body

      validateCloseRequest(exitPrice, exitDate)

      // Fetch the trade
      const tradeResult = await query('SELECT * FROM trades WHERE id = $1', [id])

      if (tradeResult.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Trade not found' })
        return
      }

      const trade = mapRowToTrade(tradeResult.rows[0])
      const profitLoss = exitPrice - trade.entryPrice
      const percentReturn = (profitLoss / trade.entryPrice) * 100

      // Update trade
      const updateResult = await query(
        `UPDATE trades
         SET status = 'closed', exit_price = $1, exit_date = $2,
             profit_loss = $3, percent_return = $4, updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [exitPrice, new Date(exitDate), profitLoss, percentReturn, id]
      )

      const closedTrade = mapRowToTrade(updateResult.rows[0])
      res.json({ success: true, data: closedTrade })
    } catch (error) {
      console.error('Error closing trade:', error)
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ success: false, error: error.message })
      } else {
        res.status(500).json({ success: false, error: 'Failed to close trade' })
      }
    }
  }

  static async deleteTrade(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      const result = await query('DELETE FROM trades WHERE id = $1 RETURNING id', [id])

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Trade not found' })
        return
      }

      res.json({ success: true, data: { deletedId: id } })
    } catch (error) {
      console.error('Error deleting trade:', error)
      res.status(500).json({ success: false, error: 'Failed to delete trade' })
    }
  }
}
