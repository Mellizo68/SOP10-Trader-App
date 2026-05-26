import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Level2OrderBookProps {
  bids: Array<{ price: number; volume: number }> | null
  asks: Array<{ price: number; volume: number }> | null
  symbol: string
  isLoading?: boolean
}

export function Level2OrderBook({ bids, asks, symbol, isLoading }: Level2OrderBookProps) {
  if (isLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-slate-50 rounded-lg">
        <span className="text-slate-500">Loading order book data...</span>
      </div>
    )
  }

  if (!bids || !asks || (bids.length === 0 && asks.length === 0)) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-slate-50 rounded-lg">
        <span className="text-slate-500">No level 2 order book data available</span>
      </div>
    )
  }

  const sortedBids = bids.sort((a, b) => b.price - a.price).slice(0, 10)
  const sortedAsks = asks.sort((a, b) => a.price - b.price).slice(0, 10)

  const maxBidVolume = Math.max(...sortedBids.map(b => b.volume))
  const maxAskVolume = Math.max(...sortedAsks.map(a => a.volume))

  const totalBidVolume = sortedBids.reduce((a, b) => a + b.volume, 0)
  const totalAskVolume = sortedAsks.reduce((a, b) => a + b.volume, 0)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Level 2 Order Book - {symbol}</h3>

        <div className="grid grid-cols-2 gap-6">
          {/* Bids */}
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm font-semibold text-green-900 mb-3">Bids (Buy Orders)</div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {sortedBids.map((bid, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <div className="flex-1">
                    <div className="text-green-900 font-medium">${bid.price.toFixed(2)}</div>
                  </div>
                  <div className="w-32">
                    <div
                      className="h-6 bg-green-200 rounded-r"
                      style={{
                        width: `${(bid.volume / maxBidVolume) * 100}%`
                      }}
                    ></div>
                  </div>
                  <div className="text-slate-600 font-mono w-16 text-right">{bid.volume.toFixed(0)}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-green-200">
              <div className="text-xs text-slate-600">Total Bid Volume: {totalBidVolume.toFixed(0)}</div>
            </div>
          </div>

          {/* Asks */}
          <div className="bg-red-50 rounded-lg p-4">
            <div className="text-sm font-semibold text-red-900 mb-3">Asks (Sell Orders)</div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {sortedAsks.map((ask, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <div className="flex-1">
                    <div className="text-red-900 font-medium">${ask.price.toFixed(2)}</div>
                  </div>
                  <div className="w-32">
                    <div
                      className="h-6 bg-red-200 rounded-r"
                      style={{
                        width: `${(ask.volume / maxAskVolume) * 100}%`
                      }}
                    ></div>
                  </div>
                  <div className="text-slate-600 font-mono w-16 text-right">{ask.volume.toFixed(0)}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-red-200">
              <div className="text-xs text-slate-600">Total Ask Volume: {totalAskVolume.toFixed(0)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Spread Analysis */}
      {sortedBids.length > 0 && sortedAsks.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-xs text-slate-600">Bid/Ask Spread</div>
            <div className="text-lg font-semibold text-blue-900">
              ${(sortedAsks[0].price - sortedBids[0].price).toFixed(2)}
            </div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="text-xs text-slate-600">Spread %</div>
            <div className="text-lg font-semibold text-purple-900">
              {((sortedAsks[0].price - sortedBids[0].price) / sortedBids[0].price * 100).toFixed(3)}%
            </div>
          </div>
          <div className="bg-indigo-50 p-3 rounded-lg">
            <div className="text-xs text-slate-600">Mid Price</div>
            <div className="text-lg font-semibold text-indigo-900">
              ${((sortedAsks[0].price + sortedBids[0].price) / 2).toFixed(2)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
