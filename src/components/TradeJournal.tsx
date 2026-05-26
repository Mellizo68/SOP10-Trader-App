import React, { useState, useEffect, lazy, Suspense } from 'react'
import { TradeEntry, ValidationResult } from '../types'
import { TradeJournalService } from '../services/tradeJournalService'
import { apiClient } from '../api/tradeClient'
import { loadTrades, clearTrades } from '../utils/localStorage'
import { BarChart3, Download, Trash2 } from 'lucide-react'
import { LoadingSpinner } from './LoadingSpinner'
import { ExportDialog } from './TradeJournal/ExportDialog'

// Lazy-loaded components
// These are split into separate chunks and loaded on-demand when tabs are activated
// Expected impact: 15-20% reduction in initial bundle size
const TradeInputForm = lazy(() => import('./TradeJournal/TradeInputForm'))
const TradeHistoryTable = lazy(() => import('./TradeJournal/TradeHistoryTable'))
const OverviewTab = lazy(() => import('./TradeJournal/OverviewTab'))
const MarketAnalysisTab = lazy(() => import('./TradeJournal/MarketAnalysisTab'))

interface TradeJournalProps {
  validationResult?: ValidationResult
  onTradeCreated?: (trade: TradeEntry) => void
}

const TradeJournal: React.FC<TradeJournalProps> = ({ validationResult, onTradeCreated }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'trades' | 'market-analysis'>('overview')
  const [trades, setTrades] = useState<TradeEntry[]>([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isExportOpen, setIsExportOpen] = useState(false)

  // Cargar trades from API (with localStorage fallback)
  useEffect(() => {
    const loadTradesFromAPI = async () => {
      try {
        const loadedTrades = await apiClient.getTrades({ limit: 500 })
        setTrades(loadedTrades)
      } catch (error) {
        console.error('Error loading trades from API:', error)
        // Fallback to localStorage
        const cachedTrades = loadTrades()
        setTrades(cachedTrades)
      }
    }

    loadTradesFromAPI()
  }, [refreshTrigger])

  const handleTradeCreated = (trade: TradeEntry) => {
    setTrades([...trades, trade])
    setRefreshTrigger(prev => prev + 1)
    if (onTradeCreated) {
      onTradeCreated(trade)
    }
  }

  const handleTradeUpdated = () => {
    setRefreshTrigger(prev => prev + 1)
  }


  const handleClearAll = () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar TODOS los trades? Esta acción no se puede deshacer.')) {
      clearTrades()
      setTrades([])
      setRefreshTrigger(prev => prev + 1)
    }
  }

  const strategies = Array.from(new Set(trades.map(t => t.strategy).filter(Boolean)))

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <BarChart3 className="w-10 h-10 text-blue-500" />
            📓 Trade Journal
          </h1>
          <p className="text-gray-400">Registra, analiza y mejora tus operaciones</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'overview'
                ? 'text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab('trades')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'trades'
                ? 'text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            📈 Trades
          </button>
          <button
            onClick={() => setActiveTab('market-analysis')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'market-analysis'
                ? 'text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            📊 Market Data
          </button>
        </div>

        {/* Tab Content */}
        <div className="mb-8">
          {activeTab === 'overview' && (
            <Suspense fallback={<LoadingSpinner message="Loading Overview..." />}>
              <OverviewTab trades={trades} />
            </Suspense>
          )}
          {activeTab === 'trades' && (
            <Suspense fallback={<LoadingSpinner message="Loading Trades..." />}>
              <div className="space-y-6">
                <TradeInputForm
                  validationResult={validationResult}
                  onTradeCreated={handleTradeCreated}
                />
                <TradeHistoryTable
                  trades={trades}
                  onTradeUpdated={handleTradeUpdated}
                />
              </div>
            </Suspense>
          )}
          {activeTab === 'market-analysis' && (
            <Suspense fallback={<LoadingSpinner message="Loading Market Data..." />}>
              <MarketAnalysisTab symbol="SPY" />
            </Suspense>
          )}
        </div>

        {/* Action Bar */}
        <div className="flex gap-4 justify-end">
          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            <Download className="w-5 h-5" />
            Export
          </button>
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            <Trash2 className="w-5 h-5" />
            Clear All
          </button>
        </div>

        <ExportDialog
          trades={trades}
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          strategies={strategies}
        />

        {/* Info */}
        <div className="mt-8 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <p className="text-gray-300 text-sm">
            <strong>Total Trades:</strong> {trades.length} |
            <strong className="ml-4">Open:</strong> {trades.filter(t => t.status === 'open').length} |
            <strong className="ml-4">Closed:</strong> {trades.filter(t => t.status === 'closed').length}
          </p>
        </div>
      </div>
    </div>
  )
}

export default TradeJournal
