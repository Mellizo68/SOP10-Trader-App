import React, { useState, useMemo, useEffect } from 'react'
import { TradeEntry, TradeFilter } from '../../types'
import { TradeJournalService } from '../../services/tradeJournalService'
import { apiClient } from '../../api/tradeClient'
import TradeDetailModal from './TradeDetailModal'
import { ChevronDown, ChevronUp, Eye, Trash2, Check } from 'lucide-react'
import { FixedSizeList as List } from 'react-window'

interface TradeHistoryTableProps {
  trades: TradeEntry[]
  onTradeUpdated: () => void
}

type SortField = keyof TradeEntry | 'profitLoss' | 'percentReturn'
type SortOrder = 'asc' | 'desc'

const TradeHistoryTableComponent: React.FC<TradeHistoryTableProps> = ({ trades, onTradeUpdated }) => {
  const [filters, setFilters] = useState<TradeFilter>({})
  const [sortField, setSortField] = useState<SortField>('dateEntry')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [selectedTrade, setSelectedTrade] = useState<TradeEntry | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [closingTradeId, setClosingTradeId] = useState<string | null>(null)
  const [closeExitPrice, setCloseExitPrice] = useState<string>('')

  const filteredTrades = useMemo(() => {
    // Start with trades prop (not from service)
    let result = [...trades]

    // Apply filters
    if (filters.status) {
      result = result.filter(t => t.status === filters.status)
    }

    if (filters.strategy) {
      result = result.filter(t => t.strategy === filters.strategy)
    }

    if (filters.confluenceMin !== undefined) {
      result = result.filter(t => t.confluenceScore >= filters.confluenceMin)
    }

    if (filters.confluenceMax !== undefined) {
      result = result.filter(t => t.confluenceScore <= filters.confluenceMax)
    }

    if (filters.symbolSearch) {
      const search = filters.symbolSearch.toLowerCase()
      result = result.filter(t =>
        t.symbol.toLowerCase().includes(search) ||
        t.strategy.toLowerCase().includes(search)
      )
    }

    // Sorting
    result.sort((a, b) => {
      let aVal = a[sortField as keyof TradeEntry]
      let bVal = b[sortField as keyof TradeEntry]

      // Handle special fields
      if (sortField === 'profitLoss') {
        aVal = a.profitLoss || 0
        bVal = b.profitLoss || 0
      } else if (sortField === 'percentReturn') {
        aVal = a.percentReturn || 0
        bVal = b.percentReturn || 0
      }

      // Handle dates
      if (aVal instanceof Date && bVal instanceof Date) {
        aVal = aVal.getTime()
        bVal = bVal.getTime()
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }

      const numA = Number(aVal) || 0
      const numB = Number(bVal) || 0
      return sortOrder === 'asc' ? numA - numB : numB - numA
    })

    return result
  }, [filters, sortField, sortOrder, trades])

  const strategies = useMemo(() => {
    return Array.from(new Set(trades.map(t => t.strategy))).sort()
  }, [trades])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const handleSelectTrade = (trade: TradeEntry) => {
    setSelectedTrade(trade)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedTrade(null)
    onTradeUpdated()
  }

  const handleDeleteTrade = async (tradeId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este trade?')) {
      return
    }

    try {
      // Since we don't have a DELETE endpoint in the trades controller yet,
      // we'll use TradeJournalService for now (this would be replaced with API call in Phase 5.4)
      TradeJournalService.deleteTrade(tradeId)
      onTradeUpdated()
    } catch (error) {
      console.error('Error deleting trade:', error)
      alert('Error al eliminar el trade')
    }
  }

  const handleCloseTrade = async (tradeId: string, exitPrice: number) => {
    try {
      const exitDate = new Date()
      await apiClient.closeTrade(tradeId, exitPrice, exitDate)
      setClosingTradeId(null)
      setCloseExitPrice('')
      onTradeUpdated()
    } catch (error) {
      console.error('Error closing trade:', error)
      alert('Error al cerrar el trade')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="w-4 h-4 text-gray-500" />
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 text-blue-400" /> : <ChevronDown className="w-4 h-4 text-blue-400" />
  }

  return (
    <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-6">
      <h3 className="text-xl font-semibold text-white mb-6">Histórico de Trades</h3>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 pb-6 border-b border-gray-700">
        {/* Status Filter */}
        <div>
          <label htmlFor="filterStatus" className="text-gray-400 text-sm block mb-2">Status</label>
          <select
            id="filterStatus"
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: (e.target.value as any) || undefined })}
            className="w-full bg-gray-700/50 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">Todos</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Strategy Filter */}
        <div>
          <label htmlFor="filterStrategy" className="text-gray-400 text-sm block mb-2">Strategy</label>
          <select
            id="filterStrategy"
            value={filters.strategy || ''}
            onChange={(e) => setFilters({ ...filters, strategy: e.target.value || undefined })}
            className="w-full bg-gray-700/50 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">Todos</option>
            {strategies.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Confluence Filter */}
        <div>
          <label htmlFor="filterConfluence" className="text-gray-400 text-sm block mb-2">Confluence</label>
          <select
            id="filterConfluence"
            value={`${filters.confluenceMin || ''}-${filters.confluenceMax || ''}`}
            onChange={(e) => {
              const [min, max] = e.target.value.split('-')
              setFilters({
                ...filters,
                confluenceMin: min ? parseFloat(min) : undefined,
                confluenceMax: max ? parseFloat(max) : undefined
              })
            }}
            className="w-full bg-gray-700/50 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="-">Todos</option>
            <option value="80-100">High (80-100)</option>
            <option value="65-79">Medium (65-79)</option>
            <option value="0-64">Low (&lt;65)</option>
          </select>
        </div>

        {/* Symbol Search */}
        <div>
          <label htmlFor="filterSymbol" className="text-gray-400 text-sm block mb-2">Symbol</label>
          <input
            id="filterSymbol"
            type="text"
            value={filters.searchSymbol || ''}
            onChange={(e) => setFilters({ ...filters, searchSymbol: e.target.value || undefined })}
            placeholder="SPY..."
            className="w-full bg-gray-700/50 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Tabla */}
      {filteredTrades.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No hay trades con estos filtros</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {/* Header with sort controls */}
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">
                  <button onClick={() => handleSort('dateEntry')} className="flex items-center gap-1 hover:text-white">
                    Fecha <SortIcon field="dateEntry" />
                  </button>
                </th>
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">
                  <button onClick={() => handleSort('symbol')} className="flex items-center gap-1 hover:text-white">
                    Symbol <SortIcon field="symbol" />
                  </button>
                </th>
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">Strategy</th>
                <th className="text-right py-3 px-4 text-gray-300 font-semibold">
                  <button onClick={() => handleSort('entryPrice')} className="flex items-center justify-end gap-1 hover:text-white">
                    Entry <SortIcon field="entryPrice" />
                  </button>
                </th>
                <th className="text-right py-3 px-4 text-gray-300 font-semibold">Exit</th>
                <th className="text-right py-3 px-4 text-gray-300 font-semibold">
                  <button onClick={() => handleSort('profitLoss')} className="flex items-center justify-end gap-1 hover:text-white">
                    P/L <SortIcon field="profitLoss" />
                  </button>
                </th>
                <th className="text-right py-3 px-4 text-gray-300 font-semibold">
                  <button onClick={() => handleSort('percentReturn')} className="flex items-center justify-end gap-1 hover:text-white">
                    % <SortIcon field="percentReturn" />
                  </button>
                </th>
                <th className="text-center py-3 px-4 text-gray-300 font-semibold">Conf.</th>
                <th className="text-center py-3 px-4 text-gray-300 font-semibold">Status</th>
                <th className="text-center py-3 px-4 text-gray-300 font-semibold">Actions</th>
              </tr>
            </thead>
          </table>

          {/* Virtualized rows container */}
          <div style={{ width: '100%', height: '600px' }}>
            <List
              height={600}
              itemCount={filteredTrades.length}
              itemSize={44}
              width="100%"
              itemData={{
                trades: filteredTrades,
                onSelectTrade: handleSelectTrade,
                onDeleteTrade: handleDeleteTrade,
                onCloseTrade: (trade: TradeEntry) => {
                  setClosingTradeId(trade.id)
                },
              }}
            >
              {({ index, style, data }) => {
                const trade = data.trades[index];
                return (
                  <div style={style}>
                    <table className="w-full text-sm border-collapse">
                      <tbody>
                        <tr className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors h-full">
                          <td className="py-3 px-4 text-gray-300">
                            {new Date(trade.dateEntry).toLocaleDateString('es-ES')}
                          </td>
                          <td className="py-3 px-4 text-white font-semibold">{trade.symbol}</td>
                          <td className="py-3 px-4 text-gray-300">{trade.strategy.replace(/_/g, ' ')}</td>
                          <td className="py-3 px-4 text-right text-cyan-400 font-semibold">
                            ${trade.entryPrice.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-300">
                            {trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : '-'}
                          </td>
                          <td className={`py-3 px-4 text-right font-semibold ${(trade.profitLoss || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {trade.profitLoss ? `${(trade.profitLoss || 0) >= 0 ? '+' : ''}$${trade.profitLoss.toFixed(2)}` : '-'}
                          </td>
                          <td className={`py-3 px-4 text-right font-semibold ${(trade.percentReturn || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {trade.percentReturn ? `${(trade.percentReturn || 0) >= 0 ? '+' : ''}${trade.percentReturn.toFixed(2)}%` : '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                              trade.confluenceScore >= 80 ? 'bg-emerald-900/50 text-emerald-400' :
                              trade.confluenceScore >= 65 ? 'bg-yellow-900/50 text-yellow-400' :
                              'bg-red-900/50 text-red-400'
                            }`}>
                              {trade.confluenceScore}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                              trade.status === 'open' ? 'bg-blue-900/50 text-blue-400' :
                              trade.status === 'closed' ? 'bg-gray-700/50 text-gray-300' :
                              'bg-orange-900/50 text-orange-400'
                            }`}>
                              {trade.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center space-x-1">
                            <button
                              onClick={() => data.onSelectTrade(trade)}
                              className="inline-flex items-center gap-1 bg-blue-600/50 hover:bg-blue-600 text-blue-300 px-2 py-1 rounded transition-colors text-xs"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {trade.status === 'open' && (
                              <>
                                <button
                                  onClick={() => {
                                    data.onCloseTrade(trade)
                                  }}
                                  className="inline-flex items-center gap-1 bg-green-600/50 hover:bg-green-600 text-green-300 px-2 py-1 rounded transition-colors text-xs"
                                  title="Close trade"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => data.onDeleteTrade(trade.id)}
                                  className="inline-flex items-center gap-1 bg-red-600/50 hover:bg-red-600 text-red-300 px-2 py-1 rounded transition-colors text-xs"
                                  title="Delete trade"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              }}
            </List>
          </div>
        </div>
      )}

      {/* Close Trade Modal */}
      {closingTradeId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold text-white mb-4">Close Trade</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">Exit Price</label>
                <input
                  type="number"
                  value={closeExitPrice}
                  onChange={(e) => setCloseExitPrice(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>
              <div className="flex gap-4 justify-end">
                <button
                  onClick={() => {
                    setClosingTradeId(null)
                    setCloseExitPrice('')
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (closeExitPrice && closingTradeId) {
                      handleCloseTrade(closingTradeId, parseFloat(closeExitPrice))
                    }
                  }}
                  disabled={!closeExitPrice}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded transition-colors"
                >
                  Close Trade
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trade Detail Modal */}
      {showModal && selectedTrade && (
        <TradeDetailModal
          trade={selectedTrade}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}

/**
 * Memoized version of TradeHistoryTable
 * Only re-renders if trades array content changes or onTradeUpdated callback changes
 * Prevents unnecessary re-renders of large trade list when parent updates
 * Expected impact: 80-90% reduction in re-renders for large trade lists
 */
const TradeHistoryTable = React.memo(
  TradeHistoryTableComponent,
  (prevProps, nextProps) => {
    // Check if callbacks are the same
    if (prevProps.onTradeUpdated !== nextProps.onTradeUpdated) {
      return false; // Callback changed, re-render needed
    }

    // Quick array length check
    if (prevProps.trades.length !== nextProps.trades.length) {
      return false; // Different array length, re-render needed
    }

    // Deep compare trades array content
    for (let i = 0; i < prevProps.trades.length; i++) {
      const prev = prevProps.trades[i];
      const next = nextProps.trades[i];

      // Compare key properties that affect rendering
      if (
        prev.id !== next.id ||
        prev.symbol !== next.symbol ||
        prev.dateEntry !== next.dateEntry ||
        prev.strategy !== next.strategy ||
        prev.entryPrice !== next.entryPrice ||
        prev.exitPrice !== next.exitPrice ||
        prev.profitLoss !== next.profitLoss ||
        prev.percentReturn !== next.percentReturn ||
        prev.confluenceScore !== next.confluenceScore ||
        prev.status !== next.status
      ) {
        return false; // Content changed, re-render needed
      }
    }

    return true; // Props are equal, skip re-render
  }
);

export default TradeHistoryTable
