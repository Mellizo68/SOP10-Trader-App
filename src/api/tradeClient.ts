import { TradeEntry, Statistics } from '../types'

const API_BASE_URL = ((import.meta as any).env.VITE_API_URL as string) || 'http://localhost:5000/api'

/**
 * Trade API Client - Handles communication with backend API
 * Includes offline-first fallback to localStorage
 */
export class TradeAPIClient {
  private baseURL: string

  constructor() {
    this.baseURL = API_BASE_URL
  }

  /**
   * Check if API is available
   */
  private async isOnline(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL.replace('/api', '')}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * GET /api/trades
   */
  async getTrades(filters?: {
    status?: 'open' | 'closed' | 'cancelled'
    limit?: number
    offset?: number
  }): Promise<TradeEntry[]> {
    try {
      const isOnline = await this.isOnline()

      if (!isOnline) {
        console.log('API offline - using cached data from localStorage')
        return this.getTradesFromCache()
      }

      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.offset) params.append('offset', filters.offset.toString())

      const response = await fetch(`${this.baseURL}/trades?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) throw new Error('Failed to fetch trades')

      const data = await response.json()
      const trades = data.data || []

      // Update local cache
      this.updateTradeCache(trades)

      return trades
    } catch (error) {
      console.error('Error fetching trades:', error)
      return this.getTradesFromCache()
    }
  }

  /**
   * GET /api/trades/:id
   */
  async getTrade(id: string): Promise<TradeEntry | null> {
    try {
      const isOnline = await this.isOnline()

      if (!isOnline) {
        return this.getTradeFromCache(id)
      }

      const response = await fetch(`${this.baseURL}/trades/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) return null

      const data = await response.json()
      return data.data || null
    } catch (error) {
      console.error('Error fetching trade:', error)
      return this.getTradeFromCache(id)
    }
  }

  /**
   * POST /api/trades
   */
  async createTrade(data: Omit<TradeEntry, 'id' | 'entryNumber'>): Promise<TradeEntry> {
    try {
      const isOnline = await this.isOnline()

      if (!isOnline) {
        console.log('API offline - saving trade locally')
        return this.createTradeLocally(data)
      }

      const response = await fetch(`${this.baseURL}/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) throw new Error('Failed to create trade')

      const result = await response.json()
      const trade = result.data

      // Update cache
      const trades = this.getTradesFromCache()
      trades.push(trade)
      this.updateTradeCache(trades)

      // Mark sync as complete
      this.markTradeAsSynced(trade.id)

      return trade
    } catch (error) {
      console.error('Error creating trade:', error)
      return this.createTradeLocally(data)
    }
  }

  /**
   * PUT /api/trades/:id
   */
  async updateTrade(id: string, data: Partial<TradeEntry>): Promise<TradeEntry | null> {
    try {
      const isOnline = await this.isOnline()

      if (!isOnline) {
        return this.updateTradeLocally(id, data)
      }

      const response = await fetch(`${this.baseURL}/trades/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) return null

      const result = await response.json()
      const trade = result.data

      // Update cache
      const trades = this.getTradesFromCache()
      const index = trades.findIndex(t => t.id === id)
      if (index >= 0) {
        trades[index] = trade
        this.updateTradeCache(trades)
      }

      return trade
    } catch (error) {
      console.error('Error updating trade:', error)
      return this.updateTradeLocally(id, data)
    }
  }

  /**
   * PUT /api/trades/:id/close
   */
  async closeTrade(id: string, exitPrice: number, exitDate: Date): Promise<TradeEntry | null> {
    try {
      const isOnline = await this.isOnline()

      if (!isOnline) {
        return this.closeTradeLocally(id, exitPrice, exitDate)
      }

      const response = await fetch(`${this.baseURL}/trades/${id}/close`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exitPrice,
          exitDate: exitDate.toISOString()
        })
      })

      if (!response.ok) return null

      const result = await response.json()
      const trade = result.data

      // Update cache
      const trades = this.getTradesFromCache()
      const index = trades.findIndex(t => t.id === id)
      if (index >= 0) {
        trades[index] = trade
        this.updateTradeCache(trades)
      }

      return trade
    } catch (error) {
      console.error('Error closing trade:', error)
      return this.closeTradeLocally(id, exitPrice, exitDate)
    }
  }

  /**
   * DELETE /api/trades/:id
   */
  async deleteTrade(id: string): Promise<boolean> {
    try {
      const isOnline = await this.isOnline()

      if (!isOnline) {
        console.log('API offline - deleting trade locally')
        return this.deleteTradeLocally(id)
      }

      const response = await fetch(`${this.baseURL}/trades/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) return false

      // Remove from cache
      const trades = this.getTradesFromCache()
      const filtered = trades.filter(t => t.id !== id)
      this.updateTradeCache(filtered)

      return true
    } catch (error) {
      console.error('Error deleting trade:', error)
      return this.deleteTradeLocally(id)
    }
  }

  /**
   * GET /api/stats
   */
  async getStatistics(): Promise<Statistics | null> {
    try {
      const isOnline = await this.isOnline()

      if (!isOnline) {
        console.log('API offline - calculating stats from cache')
        return this.calculateStatsLocally()
      }

      const response = await fetch(`${this.baseURL}/stats`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) return null

      const data = await response.json()
      return data.data || null
    } catch (error) {
      console.error('Error fetching statistics:', error)
      return this.calculateStatsLocally()
    }
  }

  /**
   * Sync all pending trades from localStorage to API
   * Called on app startup and when coming online
   */
  async syncLocalStorageToAPI(): Promise<{ synced: number; errors: number }> {
    try {
      const isOnline = await this.isOnline()

      if (!isOnline) {
        console.log('API is offline - sync skipped')
        return { synced: 0, errors: 0 }
      }

      const pendingTrades = this.getPendingTrades()

      if (pendingTrades.length === 0) {
        console.log('No trades to sync')
        return { synced: 0, errors: 0 }
      }

      console.log(`Syncing ${pendingTrades.length} pending trades...`)

      let synced = 0
      let errors = 0

      for (const trade of pendingTrades) {
        try {
          const response = await fetch(`${this.baseURL}/trades`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(trade)
          })

          if (response.ok) {
            this.markTradeAsSynced(trade.id)
            synced++
          } else {
            errors++
          }
        } catch {
          errors++
        }
      }

      console.log(`Sync complete: ${synced} synced, ${errors} errors`)
      return { synced, errors }
    } catch (error) {
      console.error('Sync error:', error)
      return { synced: 0, errors: 1 }
    }
  }

  // ============= Local Cache Methods =============

  private getTradesFromCache(): TradeEntry[] {
    try {
      const cached = localStorage.getItem('sop10_trades_cache')
      return cached ? JSON.parse(cached) : []
    } catch {
      return []
    }
  }

  private updateTradeCache(trades: TradeEntry[]): void {
    localStorage.setItem('sop10_trades_cache', JSON.stringify(trades))
  }

  private getTradeFromCache(id: string): TradeEntry | null {
    const trades = this.getTradesFromCache()
    return trades.find(t => t.id === id) || null
  }

  private createTradeLocally(data: Omit<TradeEntry, 'id' | 'entryNumber'>): TradeEntry {
    const trades = this.getTradesFromCache()
    const entryNumber = trades.length + 1
    const id = `TRADE-${String(entryNumber).padStart(4, '0')}`

    const trade: TradeEntry = {
      ...data,
      id,
      entryNumber,
      status: 'open'
    }

    trades.push(trade)
    this.updateTradeCache(trades)

    // Mark as pending sync
    this.markTradeAsPending(id)

    return trade
  }

  private updateTradeLocally(id: string, data: Partial<TradeEntry>): TradeEntry | null {
    const trades = this.getTradesFromCache()
    const index = trades.findIndex(t => t.id === id)

    if (index === -1) return null

    trades[index] = { ...trades[index], ...data }
    this.updateTradeCache(trades)

    // Mark as pending sync
    this.markTradeAsPending(id)

    return trades[index]
  }

  private closeTradeLocally(id: string, exitPrice: number, exitDate: Date): TradeEntry | null {
    const trades = this.getTradesFromCache()
    const trade = trades.find(t => t.id === id)

    if (!trade) return null

    const profitLoss = exitPrice - trade.entryPrice
    const percentReturn = (profitLoss / trade.entryPrice) * 100

    const updatedTrade: TradeEntry = {
      ...trade,
      status: 'closed',
      exitPrice,
      exitDate,
      profitLoss,
      percentReturn
    }

    const index = trades.findIndex(t => t.id === id)
    trades[index] = updatedTrade
    this.updateTradeCache(trades)

    // Mark as pending sync
    this.markTradeAsPending(id)

    return updatedTrade
  }

  private deleteTradeLocally(id: string): boolean {
    const trades = this.getTradesFromCache()
    const filtered = trades.filter(t => t.id !== id)

    if (filtered.length === trades.length) {
      return false // Trade not found
    }

    this.updateTradeCache(filtered)

    // Mark as pending sync
    this.markTradeAsPending(id)

    return true
  }

  private calculateStatsLocally(): Statistics | null {
    const trades = this.getTradesFromCache()
    const closedTrades = trades.filter(t => t.status === 'closed')

    if (closedTrades.length === 0) {
      return {
        totalTrades: trades.length,
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
    }

    // Calculate basic stats
    const winningTrades = closedTrades.filter(t => (t.profitLoss || 0) >= 0)
    const losingTrades = closedTrades.filter(t => (t.profitLoss || 0) < 0)

    const totalProfits = winningTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0)
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0))

    const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0
    const averageProfit = winningTrades.length > 0 ? totalProfits / winningTrades.length : 0
    const averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0
    const profitFactor = totalLosses > 0 ? totalProfits / totalLosses : totalProfits > 0 ? Infinity : 0

    const bestTrade = closedTrades.length > 0 ? Math.max(...closedTrades.map(t => t.profitLoss || 0)) : 0
    const worstTrade = closedTrades.length > 0 ? Math.min(...closedTrades.map(t => t.profitLoss || 0)) : 0

    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: Math.round(winRate * 100) / 100,
      averageProfit: Math.round(averageProfit * 100) / 100,
      averageLoss: Math.round(averageLoss * 100) / 100,
      profitFactor: isFinite(profitFactor) ? Math.round(profitFactor * 100) / 100 : 0,
      totalProfitLoss: Math.round((totalProfits - totalLosses) * 100) / 100,
      bestTrade: Math.round(bestTrade * 100) / 100,
      worstTrade: Math.round(worstTrade * 100) / 100,
      byStrategy: {},
      byConfluenceScore: {
        high: { winRate: 0, avgProfit: 0 },
        medium: { winRate: 0, avgProfit: 0 },
        low: { winRate: 0, avgProfit: 0 }
      }
    }
  }

  // ============= Sync Tracking =============

  private markTradeAsPending(id: string): void {
    let pending = JSON.parse(localStorage.getItem('sop10_pending_syncs') || '[]')
    if (!pending.includes(id)) {
      pending.push(id)
      localStorage.setItem('sop10_pending_syncs', JSON.stringify(pending))
    }
  }

  private markTradeAsSynced(id: string): void {
    let pending = JSON.parse(localStorage.getItem('sop10_pending_syncs') || '[]')
    pending = pending.filter((pid: string) => pid !== id)
    localStorage.setItem('sop10_pending_syncs', JSON.stringify(pending))
  }

  private getPendingTrades(): TradeEntry[] {
    const pending = JSON.parse(localStorage.getItem('sop10_pending_syncs') || '[]')
    const trades = this.getTradesFromCache()
    return trades.filter(t => pending.includes(t.id))
  }
}

// Export singleton instance
export const apiClient = new TradeAPIClient()
