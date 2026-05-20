import React, { useMemo } from 'react'
import { TradeEntry, Statistics } from '../../types'
import { TradeJournalService } from '../../services/tradeJournalService'
import { TrendingUp, TrendingDown, Target, Award } from 'lucide-react'

interface OverviewTabProps {
  trades: TradeEntry[]
}

const OverviewTab: React.FC<OverviewTabProps> = ({ trades }) => {
  const stats: Statistics = useMemo(() => {
    return TradeJournalService.calculateStatistics(trades)
  }, [trades])

  const recentTrades = useMemo(() => {
    return trades
      .filter(t => t.status === 'closed')
      .sort((a, b) => new Date(b.exitDate || 0).getTime() - new Date(a.exitDate || 0).getTime())
      .slice(0, 5)
  }, [trades])

  const currentStreak = useMemo(() => {
    const closed = trades
      .filter(t => t.status === 'closed')
      .sort((a, b) => new Date(b.exitDate || 0).getTime() - new Date(a.exitDate || 0).getTime())

    let streak = 0
    for (const trade of closed) {
      if ((trade.profitLoss || 0) >= 0) {
        streak++
      } else {
        break
      }
    }
    return streak
  }, [trades])

  const bestStrategy = useMemo(() => {
    let best = { name: 'N/A', winRate: 0 }
    Object.entries(stats.byStrategy).forEach(([name, data]) => {
      if (data.winRate > best.winRate) {
        best = { name, winRate: data.winRate }
      }
    })
    return best
  }, [stats])

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Trades */}
        <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/10 border border-blue-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-300 font-semibold">Total Trades</h3>
            <Target className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-4xl font-bold text-white">{stats.totalTrades}</p>
          <p className="text-sm text-gray-400 mt-2">
            Open: {trades.filter(t => t.status === 'open').length}
          </p>
        </div>

        {/* Win Rate */}
        <div className="bg-gradient-to-br from-green-900/30 to-green-800/10 border border-green-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-300 font-semibold">Win Rate</h3>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-4xl font-bold text-white">{stats.winRate.toFixed(1)}%</p>
          <p className="text-sm text-gray-400 mt-2">
            {stats.winningTrades}W / {stats.losingTrades}L
          </p>
        </div>

        {/* Profit Factor */}
        <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/10 border border-purple-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-300 font-semibold">Profit Factor</h3>
            <Award className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-4xl font-bold text-white">{stats.profitFactor.toFixed(2)}</p>
          <p className="text-sm text-gray-400 mt-2">Ganancias / Pérdidas</p>
        </div>

        {/* Total P/L */}
        <div className={`bg-gradient-to-br ${stats.totalProfitLoss >= 0 ? 'from-emerald-900/30 to-emerald-800/10 border-emerald-500/30' : 'from-red-900/30 to-red-800/10 border-red-500/30'} border rounded-lg p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-300 font-semibold">Total P/L</h3>
            {stats.totalProfitLoss >= 0 ? (
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400" />
            )}
          </div>
          <p className={`text-4xl font-bold ${stats.totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ${stats.totalProfitLoss.toFixed(2)}
          </p>
          <p className="text-sm text-gray-400 mt-2">Acumulado</p>
        </div>

        {/* Avg Win */}
        <div className="bg-gradient-to-br from-cyan-900/30 to-cyan-800/10 border border-cyan-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-300 font-semibold">Avg Win</h3>
            <TrendingUp className="w-5 h-5 text-cyan-400" />
          </div>
          <p className="text-4xl font-bold text-white">${stats.averageProfit.toFixed(2)}</p>
          <p className="text-sm text-gray-400 mt-2">{stats.winningTrades} ganancias</p>
        </div>

        {/* Avg Loss */}
        <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/10 border border-orange-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-300 font-semibold">Avg Loss</h3>
            <TrendingDown className="w-5 h-5 text-orange-400" />
          </div>
          <p className="text-4xl font-bold text-white">-${stats.averageLoss.toFixed(2)}</p>
          <p className="text-sm text-gray-400 mt-2">{stats.losingTrades} pérdidas</p>
        </div>
      </div>

      {/* Best/Worst & Quick Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best/Worst Trades */}
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Extremos</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-gray-700">
              <span className="text-gray-300">Best Trade</span>
              <span className="text-emerald-400 font-bold">${stats.bestTrade.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Worst Trade</span>
              <span className="text-red-400 font-bold">-${Math.abs(stats.worstTrade).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Metrics</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-gray-700">
              <span className="text-gray-300">Best Strategy</span>
              <span className="text-blue-400 font-bold">{bestStrategy.name} ({bestStrategy.winRate.toFixed(1)}%)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Current Streak</span>
              <span className="text-cyan-400 font-bold">{currentStreak} 🔥</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Closed Trades */}
      {recentTrades.length > 0 && (
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">últimos 5 Trades Cerrados</h3>
          <div className="space-y-2">
            {recentTrades.map(trade => (
              <div key={trade.id} className="flex justify-between items-center p-3 bg-gray-900/50 rounded hover:bg-gray-900 transition-colors">
                <div>
                  <p className="text-white font-semibold">{trade.symbol} - {trade.strategy}</p>
                  <p className="text-gray-400 text-sm">{new Date(trade.exitDate || 0).toLocaleDateString('es-ES')}</p>
                </div>
                <p className={`text-lg font-bold ${(trade.profitLoss || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {(trade.profitLoss || 0) >= 0 ? '+' : ''}{trade.percentReturn?.toFixed(2)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {trades.length === 0 && (
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-12 text-center">
          <p className="text-gray-400 text-lg">📊 Sin trades registrados aún</p>
          <p className="text-gray-500 text-sm mt-2">Comienza creando un nuevo trade en la pestaña "Trades"</p>
        </div>
      )}
    </div>
  )
}

export default OverviewTab
