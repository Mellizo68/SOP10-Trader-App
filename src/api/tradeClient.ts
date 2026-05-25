import { TradeEntry, Statistics, JournalEntry } from '../types'

const API_BASE_URL = ((import.meta as any).env.VITE_API_URL as string) || 'http://localhost:8080/api'

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
   * Transform API response fields from snake_case to camelCase
   * API returns: entry_price, exit_price, date_entry, etc.
   * Components expect: entryPrice, exitPrice, dateEntry, etc.
   * Also converts string numbers to actual numbers for numeric fields
   */
  private mapTradeFields(apiTrade: any): TradeEntry {
    return {
      id: apiTrade.id,
      entryNumber: apiTrade.entry_number,
      dateEntry: new Date(apiTrade.date_entry),
      symbol: apiTrade.symbol,
      strategy: apiTrade.strategy,
      strikePrice: apiTrade.strike_price ? parseFloat(apiTrade.strike_price) : null,
      delta: apiTrade.delta ? parseFloat(apiTrade.delta) : null,
      daysToExpiration: apiTrade.days_to_expiration ? parseInt(apiTrade.days_to_expiration, 10) : null,
      ivPercent: apiTrade.iv_percent ? parseFloat(apiTrade.iv_percent) : null,
      gexStatus: apiTrade.gex_status,
      pvpStatus: apiTrade.pvp_status,
      vwapStatus: apiTrade.vwap_status,
      confluenceScore: apiTrade.confluence_score ? parseInt(apiTrade.confluence_score, 10) : null,
      entryPrice: apiTrade.entry_price ? parseFloat(apiTrade.entry_price) : 0,
      takeProfit: apiTrade.take_profit ? parseFloat(apiTrade.take_profit) : null,
      stopLoss: apiTrade.stop_loss ? parseFloat(apiTrade.stop_loss) : null,
      status: apiTrade.status,
      exitPrice: apiTrade.exit_price ? parseFloat(apiTrade.exit_price) : undefined,
      exitDate: apiTrade.exit_date ? new Date(apiTrade.exit_date) : undefined,
      profitLoss: apiTrade.profit_loss ? parseFloat(apiTrade.profit_loss) : undefined,
      percentReturn: apiTrade.percent_return ? parseFloat(apiTrade.percent_return) : undefined,
      comments: apiTrade.comments || '',
      screenshots: []
    }
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
      const apiTrades = data.data || []

      // Map snake_case API fields to camelCase
      const trades = apiTrades.map((trade: any) => this.mapTradeFields(trade))

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
      const apiTrade = data.data
      if (!apiTrade) return null

      // Map snake_case API fields to camelCase
      return this.mapTradeFields(apiTrade)
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
        return this.createTradeLocally(data)
      }

      const response = await fetch(`${this.baseURL}/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) throw new Error('Failed to create trade')

      const result = await response.json()
      const apiTrade = result.data

      // Map snake_case API fields to camelCase
      const trade = this.mapTradeFields(apiTrade)

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
      const apiTrade = result.data

      // Map snake_case API fields to camelCase
      const trade = this.mapTradeFields(apiTrade)

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
          exit_price: exitPrice,
          exit_date: exitDate.toISOString()
        })
      })

      if (!response.ok) return null

      const result = await response.json()
      const apiTrade = result.data

      // Map snake_case API fields to camelCase
      const trade = this.mapTradeFields(apiTrade)

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
        return { synced: 0, errors: 0 }
      }

      const pendingTrades = this.getPendingTrades()

      if (pendingTrades.length === 0) {
        return { synced: 0, errors: 0 }
      }


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

  /**
   * Journal API Methods - Phase E: Trade Journals & Notes
   */

  /**
   * POST /api/trades/:id/journals
   * Create new journal entry
   */
  async createJournal(
    tradeId: string,
    data: { content: string; section_type: 'setup' | 'execution' | 'review' | 'lesson' }
  ): Promise<any> {
    try {
      const isOnline = await this.isOnline()

      if (!isOnline) {
        console.warn('API offline: Journal entry will sync when online')
        return { ...data, id: `journal_${Date.now()}`, trade_id: tradeId, created_at: new Date(), updated_at: new Date() }
      }

      const response = await fetch(`${this.baseURL}/trades/${tradeId}/journals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) throw new Error('Failed to create journal entry')

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Error creating journal entry:', error)
      throw error
    }
  }

  /**
   * GET /api/trades/:id/journals
   * Get all journal entries for a trade
   */
  async getJournals(tradeId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      const isOnline = await this.isOnline()

      if (!isOnline) {
        return []
      }

      const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() })

      const response = await fetch(`${this.baseURL}/trades/${tradeId}/journals?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) throw new Error('Failed to fetch journal entries')

      const data = await response.json()
      return data.data || []
    } catch (error) {
      console.error('Error fetching journal entries:', error)
      return []
    }
  }

  /**
   * GET /api/trades/:id/journals/:journalId
   * Get single journal entry
   */
  async getJournal(tradeId: string, journalId: string): Promise<any | null> {
    try {
      const isOnline = await this.isOnline()

      if (!isOnline) {
        return null
      }

      const response = await fetch(`${this.baseURL}/trades/${tradeId}/journals/${journalId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) return null

      const data = await response.json()
      return data.data || null
    } catch (error) {
      console.error('Error fetching journal entry:', error)
      return null
    }
  }

  /**
   * PUT /api/trades/:id/journals/:journalId
   * Update journal entry
   */
  async updateJournal(
    tradeId: string,
    journalId: string,
    data: Partial<{ content: string; section_type: 'setup' | 'execution' | 'review' | 'lesson' }>
  ): Promise<any | null> {
    try {
      const isOnline = await this.isOnline()

      if (!isOnline) {
        console.warn('API offline: Journal update will sync when online')
        return null
      }

      const response = await fetch(`${this.baseURL}/trades/${tradeId}/journals/${journalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) throw new Error('Failed to update journal entry')

      const result = await response.json()
      return result.data || null
    } catch (error) {
      console.error('Error updating journal entry:', error)
      throw error
    }
  }

  /**
   * DELETE /api/trades/:id/journals/:journalId
   * Delete journal entry
   */
  async deleteJournal(tradeId: string, journalId: string): Promise<boolean> {
    try {
      const isOnline = await this.isOnline()

      if (!isOnline) {
        console.warn('API offline: Journal deletion will sync when online')
        return true
      }

      const response = await fetch(`${this.baseURL}/trades/${tradeId}/journals/${journalId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) throw new Error('Failed to delete journal entry')

      return true
    } catch (error) {
      console.error('Error deleting journal entry:', error)
      throw error
    }
  }

  /**
   * Analytics Methods - Phase E: Advanced Analytics & Reporting
   */

  /**
   * GET /api/analytics/summary
   * Get overall analytics summary
   */
  async getAnalyticsSummary(): Promise<any> {
    try {
      const isOnline = await this.isOnline()

      if (!isOnline) {
        console.warn('API offline: Unable to fetch analytics summary')
        return null
      }

      const response = await fetch(`${this.baseURL}/analytics/summary`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) throw new Error('Failed to fetch analytics summary')

      const data = await response.json()
      return data.data || null
    } catch (error) {
      console.error('Error fetching analytics summary:', error)
      throw error
    }
  }

  /**
   * GET /api/analytics/by-strategy
   * Get performance breakdown by strategy
   */
  async getAnalyticsByStrategy(): Promise<any[]> {
    try {
      const isOnline = await this.isOnline()

      if (!isOnline) {
        console.warn('API offline: Unable to fetch strategy analytics')
        return []
      }

      const response = await fetch(`${this.baseURL}/analytics/by-strategy`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) throw new Error('Failed to fetch strategy analytics')

      const data = await response.json()
      return data.data || []
    } catch (error) {
      console.error('Error fetching strategy analytics:', error)
      throw error
    }
  }

  /**
   * GET /api/analytics/by-period
   * Get performance by period (month or week)
   */
  async getAnalyticsByPeriod(periodType: 'month' | 'week' = 'month'): Promise<any[]> {
    try {
      const isOnline = await this.isOnline()

      if (!isOnline) {
        console.warn('API offline: Unable to fetch period analytics')
        return []
      }

      const params = new URLSearchParams()
      params.append('periodType', periodType)

      const response = await fetch(`${this.baseURL}/analytics/by-period?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) throw new Error('Failed to fetch period analytics')

      const data = await response.json()
      return data.data || []
    } catch (error) {
      console.error('Error fetching period analytics:', error)
      throw error
    }
  }

  /**
   * GET /api/analytics/win-loss
   * Get win/loss statistics and ratios
   */
  async getWinLossStats(): Promise<any> {
    try {
      const isOnline = await this.isOnline()

      if (!isOnline) {
        console.warn('API offline: Unable to fetch win/loss statistics')
        return null
      }

      const response = await fetch(`${this.baseURL}/analytics/win-loss`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) throw new Error('Failed to fetch win/loss statistics')

      const data = await response.json()
      return data.data || null
    } catch (error) {
      console.error('Error fetching win/loss statistics:', error)
      throw error
    }
  }

  /**
   * POST /api/analytics/refresh
   * Recalculate and refresh analytics metrics
   */
  async refreshAnalytics(): Promise<any> {
    try {
      const isOnline = await this.isOnline()

      if (!isOnline) {
        console.warn('API offline: Unable to refresh analytics')
        return null
      }

      const response = await fetch(`${this.baseURL}/analytics/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) throw new Error('Failed to refresh analytics')

      const data = await response.json()
      return data.data || null
    } catch (error) {
      console.error('Error refreshing analytics:', error)
      throw error
    }
  }

  /**
   * Media API Methods - Phase E: Trade Screenshots & Media Storage
   */

  /**
   * POST /api/trades/:id/media
   * Upload media file (image) for a trade
   *
   * @param tradeId - Trade ID
   * @param file - File object from file input
   * @returns Media entry with download URL
   */
  async uploadMedia(tradeId: string, file: File): Promise<any> {
    try {
      const isOnline = await this.isOnline()

      if (!isOnline) {
        console.warn('API offline: Media upload will sync when online')
        return {
          id: `media_${Date.now()}`,
          trade_id: tradeId,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          created_at: new Date(),
          downloadUrl: URL.createObjectURL(file)
        }
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${this.baseURL}/trades/${tradeId}/media`, {
        method: 'POST',
        body: formData
        // Don't set Content-Type header - browser will set it with boundary
      })

      if (!response.ok) throw new Error('Failed to upload media')

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Error uploading media:', error)
      throw error
    }
  }

  /**
   * GET /api/trades/:id/media
   * Get all media files for a trade
   *
   * @param tradeId - Trade ID
   * @param limit - Max items per page (default 50)
   * @param offset - Pagination offset (default 0)
   * @returns Media entries with download URLs
   */
  async getMedia(
    tradeId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ media: any[]; total: number; pagination: any }> {
    try {
      const isOnline = await this.isOnline()

      if (!isOnline) {
        return { media: [], total: 0, pagination: { limit, offset, total: 0, page: 1, pageCount: 0, hasMore: false, hasPrevious: false } }
      }

      const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() })

      const response = await fetch(`${this.baseURL}/trades/${tradeId}/media?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) throw new Error('Failed to fetch media')

      const data = await response.json()
      return {
        media: data.data || [],
        total: data.pagination?.total || 0,
        pagination: data.pagination || {}
      }
    } catch (error) {
      console.error('Error fetching media:', error)
      throw error
    }
  }

  /**
   * DELETE /api/trades/:id/media/:mediaId
   * Delete media file
   *
   * @param tradeId - Trade ID
   * @param mediaId - Media ID
   * @returns Success status
   */
  async deleteMedia(tradeId: string, mediaId: string): Promise<boolean> {
    try {
      const isOnline = await this.isOnline()

      if (!isOnline) {
        console.warn('API offline: Media deletion will sync when online')
        return true
      }

      const response = await fetch(`${this.baseURL}/trades/${tradeId}/media/${mediaId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) throw new Error('Failed to delete media')

      return true
    } catch (error) {
      console.error('Error deleting media:', error)
      throw error
    }
  }

  /**
   * GET /api/trades/:id/media/:mediaId/download
   * Download or view media file
   *
   * @param tradeId - Trade ID
   * @param mediaId - Media ID
   * @returns Download URL (can be used as href or img src)
   */
  downloadMediaUrl(tradeId: string, mediaId: string): string {
    return `${this.baseURL}/trades/${tradeId}/media/${mediaId}/download`
  }
}

// Export singleton instance
export const apiClient = new TradeAPIClient()
