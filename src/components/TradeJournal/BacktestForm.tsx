import React, { useState, useEffect } from 'react'
import { Play, Loader } from 'lucide-react'

interface BacktestFormProps {
  symbol?: string
  onBacktestComplete?: (result: any) => void
}

interface Strategy {
  name: string
  description: string
  type: string
  legCount: number
}

const STRATEGY_NAMES = [
  { id: 'iron_condor', label: 'Iron Condor' },
  { id: 'long_straddle', label: 'Long Straddle' },
  { id: 'short_straddle', label: 'Short Straddle' },
  { id: 'bull_call_spread', label: 'Bull Call Spread' },
  { id: 'bear_call_spread', label: 'Bear Call Spread' },
  { id: 'bull_put_spread', label: 'Bull Put Spread' },
]

/**
 * Backtest Form Component
 * Allows users to configure and run options strategy backtests
 */
export const BacktestForm: React.FC<BacktestFormProps> = ({ symbol = 'SPY', onBacktestComplete }) => {
  // Form state
  const [formSymbol, setFormSymbol] = useState(symbol)
  const [strategy, setStrategy] = useState('iron_condor')
  const [entryDate, setEntryDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })
  const [exitDate, setExitDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 1)
    return date.toISOString().split('T')[0]
  })

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [availableStrategies, setAvailableStrategies] = useState<Strategy[]>([])

  // Load available strategies on mount
  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        const response = await fetch('/api/backtest/strategies')
        const data = await response.json()
        if (data.success && Array.isArray(data.data)) {
          setAvailableStrategies(data.data)
        }
      } catch (e) {
        console.error('Failed to load strategies:', e)
      }
    }

    fetchStrategies()
  }, [])

  const handleRunBacktest = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formSymbol || !strategy || !entryDate || !exitDate) {
      setError('Please fill in all required fields')
      return
    }

    if (new Date(entryDate) >= new Date(exitDate)) {
      setError('Entry date must be before exit date')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/backtest/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: formSymbol.toUpperCase(),
          strategy,
          entryDate,
          exitDate,
          parameters: {},
        }),
      })

      const data = await response.json()

      if (data.success) {
        setResult(data.data)
        onBacktestComplete?.(data.data)
      } else {
        setError(data.error || 'Backtest failed')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to run backtest')
    } finally {
      setLoading(false)
    }
  }

  const selectedStrategyInfo = availableStrategies.find(s => s.name.toLowerCase().replace(/\s+/g, '_') === strategy)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <h3 className="font-bold text-lg text-gray-900">📊 Run Backtest</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {result ? (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded p-4">
            <p className="font-semibold text-green-800">✅ Backtest Completed</p>
            <p className="text-sm text-green-700 mt-1">ID: {result.backtestId}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-600">Total P&L</p>
              <p className={`font-bold text-lg ${result.metrics.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${result.metrics.totalPnL.toFixed(2)}
              </p>
            </div>

            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-600">Win Rate</p>
              <p className="font-bold text-lg text-blue-600">{result.metrics.winRate.toFixed(1)}%</p>
            </div>

            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-600">Total Trades</p>
              <p className="font-bold text-lg text-gray-900">{result.metrics.totalTrades}</p>
            </div>

            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-600">Profit Factor</p>
              <p className="font-bold text-lg text-gray-900">{result.metrics.profitFactor.toFixed(2)}</p>
            </div>
          </div>

          <button
            onClick={() => setResult(null)}
            className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold rounded transition"
          >
            Clear Results
          </button>
        </div>
      ) : (
        <form onSubmit={handleRunBacktest} className="space-y-4">
          {/* Symbol Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Symbol</label>
            <input
              type="text"
              value={formSymbol}
              onChange={e => setFormSymbol(e.target.value.toUpperCase())}
              placeholder="e.g., SPY, QQQ"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-semibold"
            />
          </div>

          {/* Strategy Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Strategy</label>
            <select
              value={strategy}
              onChange={e => setStrategy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            >
              {STRATEGY_NAMES.map(s => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>

            {selectedStrategyInfo && (
              <p className="text-xs text-gray-600 mt-1">{selectedStrategyInfo.description}</p>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Entry Date</label>
              <input
                type="date"
                value={entryDate}
                onChange={e => setEntryDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Exit Date</label>
              <input
                type="date"
                value={exitDate}
                onChange={e => setExitDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition"
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Running Backtest...
              </>
            ) : (
              <>
                <Play size={18} />
                Run Backtest
              </>
            )}
          </button>
        </form>
      )}
    </div>
  )
}

export default BacktestForm
