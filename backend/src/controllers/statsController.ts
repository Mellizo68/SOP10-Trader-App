import { Request, Response } from 'express'
import { query } from '../db/connection'
import { Statistics, StrategyStats, ConfluenceStats } from '../types'

export class StatsController {
  static async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      // Get all closed trades
      const result = await query(
        `SELECT * FROM trades WHERE status = 'closed' ORDER BY exit_date DESC`
      )

      const closedTrades = result.rows

      if (closedTrades.length === 0) {
        const emptyStats: Statistics = {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          averageProfit: 0,
          averageLoss: 0,
          profitFactor: 0,
          totalProfitLoss: 0,
          bestTrade: 0,
          worstTrade: 0,
          byStrategy: {},
          byConfluenceScore: {
            high: { winRate: 0, avgProfit: 0 },
            medium: { winRate: 0, avgProfit: 0 },
            low: { winRate: 0, avgProfit: 0 }
          }
        }
        res.json({ success: true, data: emptyStats })
        return
      }

      // Get all trades for total count
      const allTradesResult = await query('SELECT COUNT(*) as count FROM trades')
      const totalTrades = parseInt(allTradesResult.rows[0].count)

      // Calculate statistics
      const winningTrades = closedTrades.filter((t: any) => parseFloat(t.profit_loss) >= 0)
      const losingTrades = closedTrades.filter((t: any) => parseFloat(t.profit_loss) < 0)

      const totalProfits = winningTrades.reduce((sum: number, t: any) => sum + parseFloat(t.profit_loss), 0)
      const totalLosses = Math.abs(losingTrades.reduce((sum: number, t: any) => sum + parseFloat(t.profit_loss), 0))

      const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0
      const averageProfit = winningTrades.length > 0 ? totalProfits / winningTrades.length : 0
      const averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0
      const profitFactor = totalLosses > 0 ? totalProfits / totalLosses : totalProfits > 0 ? Infinity : 0

      const bestTrade = Math.max(...closedTrades.map((t: any) => parseFloat(t.profit_loss)))
      const worstTrade = Math.min(...closedTrades.map((t: any) => parseFloat(t.profit_loss)))

      // Calculate by strategy
      const byStrategy: Record<string, StrategyStats> = {}
      closedTrades.forEach((trade: any) => {
        if (!byStrategy[trade.strategy]) {
          byStrategy[trade.strategy] = { count: 0, winRate: 0, avgProfitLoss: 0 }
        }
        byStrategy[trade.strategy].count++
      })

      for (const strategy in byStrategy) {
        const strategyTrades = closedTrades.filter((t: any) => t.strategy === strategy)
        const wins = strategyTrades.filter((t: any) => parseFloat(t.profit_loss) >= 0).length
        const totalProfit = strategyTrades.reduce((sum: number, t: any) => sum + parseFloat(t.profit_loss), 0)

        byStrategy[strategy].winRate = Math.round((wins / strategyTrades.length) * 10000) / 100
        byStrategy[strategy].avgProfitLoss = Math.round((totalProfit / strategyTrades.length) * 100) / 100
      }

      // Calculate by confluence
      const high = closedTrades.filter((t: any) => t.confluence_score >= 80)
      const medium = closedTrades.filter((t: any) => t.confluence_score >= 65 && t.confluence_score < 80)
      const low = closedTrades.filter((t: any) => t.confluence_score < 65)

      const calculateConfluenceStats = (group: any[]) => {
        if (group.length === 0) {
          return { winRate: 0, avgProfit: 0 }
        }
        const wins = group.filter((t: any) => parseFloat(t.profit_loss) >= 0).length
        const totalProfit = group.reduce((sum: number, t: any) => sum + parseFloat(t.profit_loss), 0)
        return {
          winRate: Math.round((wins / group.length) * 10000) / 100,
          avgProfit: Math.round((totalProfit / group.length) * 100) / 100
        }
      }

      const byConfluenceScore: ConfluenceStats = {
        high: calculateConfluenceStats(high),
        medium: calculateConfluenceStats(medium),
        low: calculateConfluenceStats(low)
      }

      const stats: Statistics = {
        totalTrades,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        winRate: Math.round(winRate * 100) / 100,
        averageProfit: Math.round(averageProfit * 100) / 100,
        averageLoss: Math.round(averageLoss * 100) / 100,
        profitFactor: isFinite(profitFactor) ? Math.round(profitFactor * 100) / 100 : 0,
        totalProfitLoss: Math.round((totalProfits - totalLosses) * 100) / 100,
        bestTrade: Math.round(bestTrade * 100) / 100,
        worstTrade: Math.round(worstTrade * 100) / 100,
        byStrategy,
        byConfluenceScore
      }

      res.json({ success: true, data: stats })
    } catch (error) {
      console.error('Error calculating statistics:', error)
      res.status(500).json({ success: false, error: 'Failed to calculate statistics' })
    }
  }

  static async getStrategyStats(req: Request, res: Response): Promise<void> {
    try {
      const result = await query(
        `SELECT strategy,
                COUNT(*) as count,
                SUM(CASE WHEN profit_loss >= 0 THEN 1 ELSE 0 END) as wins,
                AVG(profit_loss) as avg_profit
         FROM trades
         WHERE status = 'closed'
         GROUP BY strategy
         ORDER BY count DESC`
      )

      const strategies: Record<string, StrategyStats> = {}
      result.rows.forEach((row: any) => {
        strategies[row.strategy] = {
          count: row.count,
          winRate: Math.round((row.wins / row.count) * 10000) / 100,
          avgProfitLoss: Math.round(parseFloat(row.avg_profit) * 100) / 100
        }
      })

      res.json({ success: true, data: strategies })
    } catch (error) {
      console.error('Error getting strategy stats:', error)
      res.status(500).json({ success: false, error: 'Failed to get strategy stats' })
    }
  }

  static async getConfluenceStats(req: Request, res: Response): Promise<void> {
    try {
      const result = await query(
        `SELECT
          CASE
            WHEN confluence_score >= 80 THEN 'high'
            WHEN confluence_score >= 65 THEN 'medium'
            ELSE 'low'
          END as confluence_level,
          COUNT(*) as count,
          SUM(CASE WHEN profit_loss >= 0 THEN 1 ELSE 0 END) as wins,
          AVG(profit_loss) as avg_profit
         FROM trades
         WHERE status = 'closed'
         GROUP BY confluence_level`
      )

      const confluenceStats: Record<string, any> = {
        high: { winRate: 0, avgProfit: 0 },
        medium: { winRate: 0, avgProfit: 0 },
        low: { winRate: 0, avgProfit: 0 }
      }

      result.rows.forEach((row: any) => {
        confluenceStats[row.confluence_level] = {
          winRate: Math.round((row.wins / row.count) * 10000) / 100,
          avgProfit: Math.round(parseFloat(row.avg_profit) * 100) / 100
        }
      })

      res.json({ success: true, data: confluenceStats })
    } catch (error) {
      console.error('Error getting confluence stats:', error)
      res.status(500).json({ success: false, error: 'Failed to get confluence stats' })
    }
  }
}
