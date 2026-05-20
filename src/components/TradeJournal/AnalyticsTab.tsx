import React, { useMemo } from 'react'
import { TradeEntry } from '../../types'
import { TradeJournalService } from '../../services/tradeJournalService'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface AnalyticsTabProps {
  trades: TradeEntry[]
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ trades }) => {
  const closedTrades = useMemo(() => {
    return trades.filter(t => t.status === 'closed').sort((a, b) => new Date(a.exitDate || 0).getTime() - new Date(b.exitDate || 0).getTime())
  }, [trades])

  const stats = useMemo(() => {
    return TradeJournalService.calculateStatistics(trades)
  }, [trades])

  // Data para Equity Curve
  const equityCurveData = useMemo(() => {
    let cumulative = 0
    return closedTrades.map(trade => {
      cumulative += trade.profitLoss || 0
      return {
        date: new Date(trade.exitDate || 0).toLocaleDateString('es-ES'),
        cumulative: cumulative,
        tradeId: trade.id
      }
    })
  }, [closedTrades])

  // Data para P&L Distribution
  const plDistributionData = useMemo(() => {
    const bins = {
      'Major Loss': 0,
      'Loss': 0,
      'Small Loss': 0,
      'Breakeven': 0,
      'Small Win': 0,
      'Win': 0,
      'Major Win': 0
    }

    closedTrades.forEach(trade => {
      const pl = trade.profitLoss || 0
      if (pl < -100) bins['Major Loss']++
      else if (pl < -25) bins['Loss']++
      else if (pl < 0) bins['Small Loss']++
      else if (pl === 0) bins['Breakeven']++
      else if (pl < 25) bins['Small Win']++
      else if (pl < 100) bins['Win']++
      else bins['Major Win']++
    })

    return Object.entries(bins).map(([name, count]) => ({ name, value: count }))
  }, [closedTrades])

  // Data para Strategy Breakdown
  const strategyData = useMemo(() => {
    return Object.entries(stats.byStrategy).map(([strategy, data]) => ({
      name: strategy.replace(/_/g, ' '),
      count: data.count,
      winRate: data.winRate,
      avgProfit: data.avgProfitLoss
    }))
  }, [stats])

  // Colors para pie chart
  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']

  return (
    <div className="space-y-8">
      {/* Equity Curve */}
      {equityCurveData.length > 0 && (
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">📈 Equity Curve</h3>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={equityCurveData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" tick={{ fill: '#9ca3af' }} />
                <YAxis tick={{ fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* P&L Distribution */}
      {plDistributionData.some(d => d.value > 0) && (
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">📊 P&L Distribution</h3>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={plDistributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af' }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Strategy Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strategy Stats Table */}
        {strategyData.length > 0 && (
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">📋 Por Estrategia</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2 px-2 text-gray-300 font-semibold">Estrategia</th>
                    <th className="text-center py-2 px-2 text-gray-300 font-semibold">Trades</th>
                    <th className="text-center py-2 px-2 text-gray-300 font-semibold">Win %</th>
                    <th className="text-right py-2 px-2 text-gray-300 font-semibold">Avg P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {strategyData.map(strategy => (
                    <tr key={strategy.name} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                      <td className="py-2 px-2 text-gray-300 text-xs">{strategy.name}</td>
                      <td className="py-2 px-2 text-center text-white font-semibold">{strategy.count}</td>
                      <td className={`py-2 px-2 text-center font-semibold ${strategy.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {strategy.winRate.toFixed(1)}%
                      </td>
                      <td className={`py-2 px-2 text-right font-semibold ${strategy.avgProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${strategy.avgProfit.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Strategy Pie Chart */}
        {strategyData.length > 0 && (
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">🥧 Distribución de Estrategias</h3>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={strategyData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, count }) => `${name} (${count})`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {strategyData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    labelStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Confluence Analysis */}
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">🎯 Por Nivel de Confluencia</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* High Confluence */}
          <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
            <h4 className="text-emerald-400 font-semibold mb-3">High (80-100)</h4>
            <div className="space-y-2">
              <div>
                <p className="text-gray-400 text-sm">Win Rate</p>
                <p className="text-emerald-400 text-xl font-bold">{stats.byConfluenceScore.high.winRate.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Avg P/L</p>
                <p className="text-white font-semibold">${stats.byConfluenceScore.high.avgProfit.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Medium Confluence */}
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
            <h4 className="text-yellow-400 font-semibold mb-3">Medium (65-79)</h4>
            <div className="space-y-2">
              <div>
                <p className="text-gray-400 text-sm">Win Rate</p>
                <p className="text-yellow-400 text-xl font-bold">{stats.byConfluenceScore.medium.winRate.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Avg P/L</p>
                <p className="text-white font-semibold">${stats.byConfluenceScore.medium.avgProfit.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Low Confluence */}
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <h4 className="text-red-400 font-semibold mb-3">Low (&lt;65)</h4>
            <div className="space-y-2">
              <div>
                <p className="text-gray-400 text-sm">Win Rate</p>
                <p className="text-red-400 text-xl font-bold">{stats.byConfluenceScore.low.winRate.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Avg P/L</p>
                <p className="text-white font-semibold">${stats.byConfluenceScore.low.avgProfit.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-400 mb-4">💡 Insights</h3>
        <div className="space-y-2 text-gray-300">
          {stats.byConfluenceScore.high.winRate >= stats.byConfluenceScore.medium.winRate &&
           stats.byConfluenceScore.high.winRate >= stats.byConfluenceScore.low.winRate && (
            <p>✅ Mayor win rate en confluencia <strong>HIGH</strong> - Mantén enfoque en setups de alta confluencia</p>
          )}
          {stats.byConfluenceScore.medium.winRate >= stats.byConfluenceScore.high.winRate &&
           stats.byConfluenceScore.medium.winRate >= stats.byConfluenceScore.low.winRate && (
            <p>✅ Mayor win rate en confluencia <strong>MEDIUM</strong> - Los setups moderados son más consistentes</p>
          )}
          {stats.byConfluenceScore.low.winRate >= stats.byConfluenceScore.high.winRate &&
           stats.byConfluenceScore.low.winRate >= stats.byConfluenceScore.medium.winRate && (
            <p>⚠️ Mayor win rate en confluencia <strong>LOW</strong> - Considera revisar criterios de confluencia</p>
          )}

          {Object.entries(stats.byStrategy).length > 0 && (
            <p>📊 Implementando {Object.keys(stats.byStrategy).length} estrategias diferentes con {closedTrades.length} trades cerrados</p>
          )}

          {stats.profitFactor > 2 && (
            <p>🚀 Excelente Profit Factor ({stats.profitFactor.toFixed(2)}) - Sistema muy rentable</p>
          )}
          {stats.profitFactor > 1.5 && stats.profitFactor <= 2 && (
            <p>✅ Buen Profit Factor ({stats.profitFactor.toFixed(2)}) - Sistema rentable</p>
          )}
          {stats.profitFactor > 1 && stats.profitFactor <= 1.5 && (
            <p>⚠️ Profit Factor bajo ({stats.profitFactor.toFixed(2)}) - Necesita mejora</p>
          )}
        </div>
      </div>

      {closedTrades.length === 0 && (
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-12 text-center">
          <p className="text-gray-400">📊 Sin trades cerrados para analizar</p>
        </div>
      )}
    </div>
  )
}

export default AnalyticsTab
