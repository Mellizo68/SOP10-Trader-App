import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import { VolatilitySkew } from '../../types/advancedMetrics'

interface VolSkewChartProps {
  data: VolatilitySkew[] | null
  symbol: string
  isLoading?: boolean
}

export function VolSkewChart({ data, symbol, isLoading }: VolSkewChartProps) {
  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-slate-50 rounded-lg">
        <span className="text-slate-500">Loading volatility skew data...</span>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-slate-50 rounded-lg">
        <span className="text-slate-500">No volatility skew data available</span>
      </div>
    )
  }

  const sortedData = data.sort((a, b) => a.strikePrice - b.strikePrice)
  const chartData = sortedData.map(item => ({
    strike: item.strikePrice,
    callIV: parseFloat((item.callIV * 100).toFixed(2)),
    putIV: parseFloat((item.putIV * 100).toFixed(2)),
    skew: parseFloat((item.skewDifference * 100).toFixed(2))
  }))

  const avgSkew = (sortedData.reduce((a, b) => a + b.skewDifference, 0) / sortedData.length * 100).toFixed(2)
  const maxSkew = Math.max(...sortedData.map(d => d.skewDifference * 100))
  const minSkew = Math.min(...sortedData.map(d => d.skewDifference * 100))

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">IV Skew by Strike (Put IV - Call IV)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="strike"
              label={{ value: 'Strike Price', position: 'insideBottomRight', offset: -5 }}
            />
            <YAxis
              type="number"
              dataKey="skew"
              label={{ value: 'Skew (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              formatter={(value) => `${value.toFixed(2)}%`}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
            />
            <Scatter name="Volatility Skew" data={chartData} fill="#8b5cf6" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Call vs Put IV by Strike</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="strike" label={{ value: 'Strike', position: 'insideBottomRight', offset: -5 }} />
            <YAxis label={{ value: 'IV (%)', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              formatter={(value) => `${value.toFixed(2)}%`}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
            />
            <Legend />
            <Bar dataKey="callIV" fill="#3b82f6" name="Call IV" />
            <Bar dataKey="putIV" fill="#ef4444" name="Put IV" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-purple-50 p-3 rounded-lg">
          <div className="text-xs text-slate-600">Average Skew</div>
          <div className={`text-lg font-semibold ${parseFloat(avgSkew) > 0 ? 'text-red-900' : 'text-green-900'}`}>
            {avgSkew}%
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {parseFloat(avgSkew) > 0 ? 'Puts more expensive' : 'Calls more expensive'}
          </div>
        </div>
        <div className="bg-red-50 p-3 rounded-lg">
          <div className="text-xs text-slate-600">Max Skew</div>
          <div className="text-lg font-semibold text-red-900">{maxSkew.toFixed(2)}%</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="text-xs text-slate-600">Min Skew</div>
          <div className="text-lg font-semibold text-green-900">{minSkew.toFixed(2)}%</div>
        </div>
      </div>
    </div>
  )
}
