import { TradeEntry, TradeFilter, Statistics } from '../types'
import { loadTrades, saveTrades } from '../utils/localStorage'
import { apiClient } from '../api/tradeClient'

export class TradeJournalService {
  /**
   * Crear un nuevo trade - guarda localmente e intenta sincronizar con API
   */
  static createTrade(data: Omit<TradeEntry, 'id' | 'entryNumber'>): TradeEntry {
    const trades = loadTrades()
    const newTrade: TradeEntry = {
      ...data,
      id: `TRADE-${String(trades.length + 1).padStart(4, '0')}`,
      entryNumber: trades.length + 1,
      status: 'open'
    }
    trades.push(newTrade)
    saveTrades(trades)

    // Intenta sincronizar con API en background (no bloquea UI)
    apiClient.createTrade(data).catch(error => {
      console.warn('Background sync failed:', error)
    })

    return newTrade
  }

  /**
   * Obtener un trade por ID (sincrónico para uso interno)
   */
  private static getTradeSync(id: string): TradeEntry | null {
    const trades = loadTrades()
    return trades.find(t => t.id === id) || null
  }

  /**
   * Obtener un trade por ID
   */
  static getTrade(id: string): TradeEntry | null {
    return this.getTradeSync(id)
  }

  /**
   * Obtener todos los trades (desde localStorage con sync automático)
   */
  static getAllTrades(): TradeEntry[] {
    const trades = loadTrades()
    // Intenta sincronizar en background
    apiClient.getTrades().then(apiTrades => {
      if (apiTrades && apiTrades.length > 0) {
        saveTrades(apiTrades)
      }
    }).catch(() => {
      // Silent fail - UI works with local data
    })
    return trades
  }

  /**
   * Actualizar un trade (sincrónico para uso interno)
   */
  private static updateTradeSync(id: string, data: Partial<TradeEntry>): TradeEntry | null {
    const trades = loadTrades()
    const index = trades.findIndex(t => t.id === id)
    if (index === -1) return null

    trades[index] = { ...trades[index], ...data, id, entryNumber: trades[index].entryNumber }
    saveTrades(trades)
    return trades[index]
  }

  /**
   * Actualizar un trade - guarda localmente e intenta sincronizar
   */
  static updateTrade(id: string, data: Partial<TradeEntry>): TradeEntry | null {
    const result = this.updateTradeSync(id, data)

    // Intenta sincronizar con API en background
    if (result) {
      apiClient.updateTrade(id, data).catch(error => {
        console.warn('Background sync failed:', error)
      })
    }

    return result
  }

  /**
   * Cerrar un trade - guarda localmente e intenta sincronizar
   */
  static closeTrade(
    id: string,
    exitPrice: number,
    exitDate: Date
  ): TradeEntry | null {
    const trade = this.getTradeSync(id)
    if (!trade) return null

    const profitLoss = exitPrice - trade.entryPrice
    const percentReturn = (profitLoss / trade.entryPrice) * 100

    const result = this.updateTradeSync(id, {
      status: 'closed',
      exitPrice,
      exitDate,
      profitLoss,
      percentReturn
    })

    // Intenta sincronizar con API en background
    if (result) {
      apiClient.closeTrade(id, exitPrice, exitDate).catch(error => {
        console.warn('Background sync failed:', error)
      })
    }

    return result
  }

  /**
   * Eliminar un trade
   */
  static deleteTrade(id: string): void {
    const trades = loadTrades()
    const filtered = trades.filter(t => t.id !== id)
    saveTrades(filtered)
  }

  /**
   * Obtener trades filtrados
   */
  static getFilteredTrades(filters: TradeFilter): TradeEntry[] {
    let trades = this.getAllTrades()

    // Filtrar por status
    if (filters.status) {
      trades = trades.filter(t => t.status === filters.status)
    }

    // Filtrar por strategy
    if (filters.strategy) {
      trades = trades.filter(t => t.strategy === filters.strategy)
    }

    // Filtrar por confluencia
    if (filters.confluenceMin !== undefined) {
      trades = trades.filter(t => t.confluenceScore >= filters.confluenceMin!)
    }
    if (filters.confluenceMax !== undefined) {
      trades = trades.filter(t => t.confluenceScore <= filters.confluenceMax!)
    }

    // Filtrar por Z-Score (nota: necesitamos agregar zScore a TradeEntry si no existe)
    if (filters.zScoreMin !== undefined || filters.zScoreMax !== undefined) {
      trades = trades.filter(t => {
        const zScore = (t as any).zScore
        if (zScore === undefined) return true
        if (filters.zScoreMin !== undefined && zScore < filters.zScoreMin) return false
        if (filters.zScoreMax !== undefined && zScore > filters.zScoreMax) return false
        return true
      })
    }

    // Filtrar por symbol (búsqueda)
    if (filters.searchSymbol) {
      trades = trades.filter(t =>
        t.symbol.toUpperCase().includes(filters.searchSymbol!.toUpperCase())
      )
    }

    return trades
  }

  /**
   * Calcular estadísticas generales (sincrónico, funciona con trades cargados localmente)
   */
  static calculateStatistics(trades?: TradeEntry[]): Statistics {
    const allTrades = trades || loadTrades()
    const closedTrades = allTrades.filter(t => t.status === 'closed')

    const winningTrades = closedTrades.filter(t => (t.profitLoss || 0) >= 0)
    const losingTrades = closedTrades.filter(t => (t.profitLoss || 0) < 0)

    const totalProfits = winningTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0)
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0))

    const winRate = closedTrades.length > 0
      ? (winningTrades.length / closedTrades.length) * 100
      : 0

    const averageProfit = winningTrades.length > 0
      ? totalProfits / winningTrades.length
      : 0

    const averageLoss = losingTrades.length > 0
      ? totalLosses / losingTrades.length
      : 0

    const profitFactor = totalLosses > 0 ? totalProfits / totalLosses : (totalProfits > 0 ? Infinity : 0)

    const bestTrade = closedTrades.length > 0
      ? Math.max(...closedTrades.map(t => t.profitLoss || 0))
      : 0

    const worstTrade = closedTrades.length > 0
      ? Math.min(...closedTrades.map(t => t.profitLoss || 0))
      : 0

    return {
      totalTrades: allTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: Math.round(winRate * 100) / 100,
      averageProfit: Math.round(averageProfit * 100) / 100,
      averageLoss: Math.round(averageLoss * 100) / 100,
      profitFactor: isFinite(profitFactor) ? Math.round(profitFactor * 100) / 100 : 0,
      totalProfitLoss: Math.round(totalProfits - totalLosses),
      bestTrade: Math.round(bestTrade * 100) / 100,
      worstTrade: Math.round(worstTrade * 100) / 100,
      byStrategy: this.calculateByStrategy(closedTrades),
      byConfluenceScore: this.calculateByConfluence(closedTrades)
    }
  }

  /**
   * Calcular estadísticas por estrategia
   */
  private static calculateByStrategy(
    trades: TradeEntry[]
  ): { [key: string]: { count: number; winRate: number; avgProfitLoss: number } } {
    const strategies = new Map<string, TradeEntry[]>()

    // Agrupar por estrategia
    trades.forEach(t => {
      if (!strategies.has(t.strategy)) {
        strategies.set(t.strategy, [])
      }
      strategies.get(t.strategy)!.push(t)
    })

    const result: { [key: string]: { count: number; winRate: number; avgProfitLoss: number } } = {}

    strategies.forEach((strategyTrades, strategy) => {
      const winningCount = strategyTrades.filter(t => (t.profitLoss || 0) >= 0).length
      const winRate = (winningCount / strategyTrades.length) * 100
      const avgProfitLoss = strategyTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0) / strategyTrades.length

      result[strategy] = {
        count: strategyTrades.length,
        winRate: Math.round(winRate * 100) / 100,
        avgProfitLoss: Math.round(avgProfitLoss * 100) / 100
      }
    })

    return result
  }

  /**
   * Calcular estadísticas por confluencia
   */
  private static calculateByConfluence(trades: TradeEntry[]) {
    const high = trades.filter(t => t.confluenceScore >= 80)
    const medium = trades.filter(t => t.confluenceScore >= 65 && t.confluenceScore < 80)
    const low = trades.filter(t => t.confluenceScore < 65)

    const calculateStats = (group: TradeEntry[]) => {
      if (group.length === 0) {
        return { winRate: 0, avgProfit: 0 }
      }
      const winning = group.filter(t => (t.profitLoss || 0) >= 0).length
      const totalProfit = group.reduce((sum, t) => sum + (t.profitLoss || 0), 0)
      return {
        winRate: Math.round((winning / group.length) * 100 * 100) / 100,
        avgProfit: Math.round((totalProfit / group.length) * 100) / 100
      }
    }

    return {
      high: calculateStats(high),
      medium: calculateStats(medium),
      low: calculateStats(low)
    }
  }

  /**
   * Exportar trades a CSV
   */
  static exportToCSV(trades?: TradeEntry[]): string {
    const allTrades = trades || this.getAllTrades()

    if (allTrades.length === 0) {
      return 'No trades to export'
    }

    const headers = [
      'ID',
      'Date Entry',
      'Symbol',
      'Strategy',
      'Strike Price',
      'Delta',
      'DTE',
      'IV%',
      'Confluence Score',
      'Entry Price',
      'Take Profit',
      'Stop Loss',
      'Status',
      'Exit Price',
      'Exit Date',
      'P/L',
      '% Return',
      'Comments'
    ]

    const rows = allTrades.map(t => [
      t.id,
      new Date(t.dateEntry).toLocaleDateString('es-ES'),
      t.symbol,
      t.strategy,
      t.strikePrice,
      t.delta,
      t.daysToExpiration,
      t.ivPercent,
      t.confluenceScore,
      t.entryPrice,
      t.takeProfit,
      t.stopLoss,
      t.status,
      t.exitPrice || '',
      t.exitDate ? new Date(t.exitDate).toLocaleDateString('es-ES') : '',
      t.profitLoss || '',
      t.percentReturn || '',
      t.comments
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return csvContent
  }

  /**
   * Obtener número del próximo trade
   */
  static getNextTradeNumber(): number {
    const trades = loadTrades()
    return trades.length + 1
  }

  /**
   * Sincronizar trades pendientes del localStorage con la API
   */
  static async syncPendingTrades(): Promise<{ synced: number; errors: number }> {
    return await apiClient.syncLocalStorageToAPI()
  }
}
