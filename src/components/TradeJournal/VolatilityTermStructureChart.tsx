import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { VolatilityTermStructure } from '../../types/advancedMetrics'

interface VolatilityTermStructureChartProps {
  data: VolatilityTermStructure[] | null
  symbol: string
  isLoading?: boolean
}

export function VolatilityTermStructureChart({ data, symbol, isLoading }: VolatilityTermStructureChartProps) {
  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-slate-50 rounded-lg">
        <span className="text-slate-500">Loading volatility term structure...</span>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-slate-50 rounded-lg">
        <span className="text-slate-500">No volatility term structure data available</span>
      </div>
    )
  }

  const chartData = data
    .sort((a, b) => a.daysToExpiration - b.daysToExpiration)
    .map(item => ({
      expiration: item.expirationDate,
      dte: item.daysToExpiration,
      iv: parseFloat((item.iv * 100).toFixed(2))
    }))

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Implied Volatility Term Structure</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="expiration"
              label={{ value: 'Expiration Date', position: 'insideBottomRight', offset: -5 }}
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              label={{ value: 'IV (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value) => `${value.toFixed(2)}%`}
              labelFormatter={(label) => `DTE: ${label}`}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="iv"
              stroke="#3b82f6"
              name="Implied Volatility"
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-xs text-slate-600">Short Term (DTE &lt; 30)</div>
          <div className="text-lg font-semibold text-blue-900">
            {data.filter(d => d.daysToExpiration < 30).length > 0
              ? (data.filter(d => d.daysToExpiration < 30).reduce((a, b) => a + b.iv, 0) / data.filter(d => d.daysToExpiration < 30).length * 100).toFixed(2)
              : 'N/A'}
            %
          </div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="text-xs text-slate-600">Mid Term (30-90 DTE)</div>
          <div className="text-lg font-semibold text-green-900">
            {data.filter(d => d.daysToExpiration >= 30 && d.daysToExpiration <= 90).length > 0
              ? (data.filter(d => d.daysToExpiration >= 30 && d.daysToExpiration <= 90).reduce((a, b) => a + b.iv, 0) / data.filter(d => d.daysToExpiration >= 30 && d.daysToExpiration <= 90).length * 100).toFixed(2)
              : 'N/A'}
            %
          </div>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg">
          <div className="text-xs text-slate-600">Long Term (&gt; 90 DTE)</div>
          <div className="text-lg font-semibold text-purple-900">
            {data.filter(d => d.daysToExpiration > 90).length > 0
              ? (data.filter(d => d.daysToExpiration > 90).reduce((a, b) => a + b.iv, 0) / data.filter(d => d.daysToExpiration > 90).length * 100).toFixed(2)
              : 'N/A'}
            %
          </div>
        </div>
      </div>
    </div>
  )
}
