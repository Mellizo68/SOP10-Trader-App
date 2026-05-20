import { TradeEntry } from '../types'
import { QueryResult } from 'pg'

export const mapRowToTrade = (row: any): TradeEntry => {
  return {
    id: row.id,
    entryNumber: row.entry_number,
    dateEntry: new Date(row.date_entry),
    symbol: row.symbol,
    strategy: row.strategy,
    strikePrice: parseFloat(row.strike_price),
    delta: parseFloat(row.delta),
    daysToExpiration: row.days_to_expiration,
    ivPercent: parseFloat(row.iv_percent),
    gexStatus: row.gex_status,
    pvpStatus: row.pvp_status,
    vwapStatus: row.vwap_status,
    confluenceScore: row.confluence_score,
    entryPrice: parseFloat(row.entry_price),
    takeProfit: parseFloat(row.take_profit),
    stopLoss: parseFloat(row.stop_loss),
    status: row.status,
    exitPrice: row.exit_price ? parseFloat(row.exit_price) : undefined,
    exitDate: row.exit_date ? new Date(row.exit_date) : undefined,
    profitLoss: row.profit_loss ? parseFloat(row.profit_loss) : undefined,
    percentReturn: row.percent_return ? parseFloat(row.percent_return) : undefined,
    comments: row.comments,
    screenshots: row.screenshots ? JSON.parse(row.screenshots) : undefined
  }
}

export const buildWhereClause = (
  filters: any
): { whereClause: string; params: any[] } => {
  const conditions: string[] = []
  const params: any[] = []
  let paramIndex = 1

  if (filters.status) {
    conditions.push(`status = $${paramIndex}`)
    params.push(filters.status)
    paramIndex++
  }

  if (filters.strategy) {
    conditions.push(`strategy = $${paramIndex}`)
    params.push(filters.strategy)
    paramIndex++
  }

  if (filters.confluenceMin !== undefined) {
    conditions.push(`confluence_score >= $${paramIndex}`)
    params.push(filters.confluenceMin)
    paramIndex++
  }

  if (filters.confluenceMax !== undefined) {
    conditions.push(`confluence_score <= $${paramIndex}`)
    params.push(filters.confluenceMax)
    paramIndex++
  }

  if (filters.searchSymbol) {
    conditions.push(`symbol ILIKE $${paramIndex}`)
    params.push(`%${filters.searchSymbol}%`)
    paramIndex++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  return { whereClause, params }
}
