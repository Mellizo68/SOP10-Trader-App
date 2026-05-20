import React, { useState, useEffect } from 'react'
import { TradeEntry, ValidationResult } from '../../types'
import { TradeJournalService } from '../../services/tradeJournalService'
import { Plus } from 'lucide-react'

interface TradeInputFormProps {
  validationResult?: ValidationResult
  onTradeCreated: (trade: TradeEntry) => void
}

const TradeInputForm: React.FC<TradeInputFormProps> = ({ validationResult, onTradeCreated }) => {
  const [formData, setFormData] = useState({
    symbol: '',
    strategy: '',
    strikePrice: '',
    delta: '',
    daysToExpiration: '',
    ivPercent: '',
    gexStatus: 'positivo' as 'positivo' | 'negativo',
    pvpStatus: '',
    vwapStatus: '',
    confluenceScore: '',
    entryPrice: '',
    takeProfit: '',
    stopLoss: '',
    comments: ''
  })

  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  // Auto-complete desde ValidationResult
  useEffect(() => {
    if (validationResult) {
      setFormData(prev => ({
        ...prev,
        confluenceScore: validationResult.confluenceScore.toString(),
        takeProfit: validationResult.targetTP.toString(),
        stopLoss: validationResult.targetSL.toString()
      }))
    }
  }, [validationResult])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage('')

    try {
      // Validaciones básicas
      if (!formData.symbol.trim()) {
        throw new Error('Symbol es requerido')
      }
      if (!formData.strategy.trim()) {
        throw new Error('Strategy es requerida')
      }
      if (!formData.entryPrice || parseFloat(formData.entryPrice) <= 0) {
        throw new Error('Entry Price debe ser mayor a 0')
      }

      const newTrade: Omit<TradeEntry, 'id' | 'entryNumber'> = {
        dateEntry: new Date(),
        symbol: formData.symbol.toUpperCase(),
        strategy: formData.strategy,
        strikePrice: parseFloat(formData.strikePrice) || 0,
        delta: parseFloat(formData.delta) || 0,
        daysToExpiration: parseInt(formData.daysToExpiration) || 0,
        ivPercent: parseFloat(formData.ivPercent) || 0,
        gexStatus: formData.gexStatus,
        pvpStatus: formData.pvpStatus,
        vwapStatus: formData.vwapStatus,
        confluenceScore: parseFloat(formData.confluenceScore) || 0,
        entryPrice: parseFloat(formData.entryPrice),
        takeProfit: parseFloat(formData.takeProfit) || 0,
        stopLoss: parseFloat(formData.stopLoss) || 0,
        status: 'open',
        comments: formData.comments,
        screenshots: []
      }

      const trade = TradeJournalService.createTrade(newTrade)
      setMessage(`✅ Trade creado exitosamente! ID: ${trade.id}`)

      // Resetear form
      setFormData({
        symbol: '',
        strategy: '',
        strikePrice: '',
        delta: '',
        daysToExpiration: '',
        ivPercent: '',
        gexStatus: 'positivo',
        pvpStatus: '',
        vwapStatus: '',
        confluenceScore: '',
        entryPrice: '',
        takeProfit: '',
        stopLoss: '',
        comments: ''
      })

      onTradeCreated(trade)

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMessage(''), 3000)
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-6">
      <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <Plus className="w-5 h-5" />
        Crear Nuevo Trade
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Mensaje de feedback */}
        {message && (
          <div className={`p-4 rounded-lg text-white ${message.includes('✅') ? 'bg-green-900/30 border border-green-500/30' : 'bg-red-900/30 border border-red-500/30'}`}>
            {message}
          </div>
        )}

        {/* Fila 1: Symbol, Strategy, Strike */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">Symbol *</label>
            <input
              type="text"
              name="symbol"
              value={formData.symbol}
              onChange={handleChange}
              placeholder="SPY"
              className="w-full bg-gray-700/50 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">Strategy *</label>
            <select
              name="strategy"
              value={formData.strategy}
              onChange={handleChange}
              className="w-full bg-gray-700/50 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">-- Selecciona --</option>
              <option value="BULL_PUT_SPREAD">Bull Put Spread</option>
              <option value="BEAR_CALL_SPREAD">Bear Call Spread</option>
              <option value="BULL_CALL_SPREAD">Bull Call Spread</option>
              <option value="BEAR_PUT_SPREAD">Bear Put Spread</option>
              <option value="IRON_CONDOR">Iron Condor</option>
              <option value="IRON_BUTTERFLY">Iron Butterfly</option>
              <option value="LONG_CALL">Long Call</option>
              <option value="LONG_PUT">Long Put</option>
              <option value="STRADDLE">Straddle</option>
              <option value="STRANGLE">Strangle</option>
              <option value="COLLAR">Collar</option>
              <option value="COVERED_CALL">Covered Call</option>
              <option value="PROTECTIVE_PUT">Protective Put</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">Strike Price</label>
            <input
              type="number"
              name="strikePrice"
              value={formData.strikePrice}
              onChange={handleChange}
              placeholder="450.00"
              step="0.01"
              className="w-full bg-gray-700/50 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Fila 2: Delta, DTE, IV */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">Delta</label>
            <input
              type="number"
              name="delta"
              value={formData.delta}
              onChange={handleChange}
              placeholder="0.25"
              step="0.01"
              className="w-full bg-gray-700/50 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">Days to Exp.</label>
            <input
              type="number"
              name="daysToExpiration"
              value={formData.daysToExpiration}
              onChange={handleChange}
              placeholder="35"
              className="w-full bg-gray-700/50 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">IV Percent</label>
            <input
              type="number"
              name="ivPercent"
              value={formData.ivPercent}
              onChange={handleChange}
              placeholder="65.5"
              step="0.1"
              className="w-full bg-gray-700/50 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Fila 3: Confluence, Entry, TP, SL */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">Confluence Score</label>
            <input
              type="number"
              name="confluenceScore"
              value={formData.confluenceScore}
              onChange={handleChange}
              placeholder="75"
              min="0"
              max="100"
              className="w-full bg-gray-700/50 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">Entry Price *</label>
            <input
              type="number"
              name="entryPrice"
              value={formData.entryPrice}
              onChange={handleChange}
              placeholder="1.50"
              step="0.01"
              className="w-full bg-gray-700/50 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">Take Profit</label>
            <input
              type="number"
              name="takeProfit"
              value={formData.takeProfit}
              onChange={handleChange}
              placeholder="0.75"
              step="0.01"
              className="w-full bg-gray-700/50 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">Stop Loss</label>
            <input
              type="number"
              name="stopLoss"
              value={formData.stopLoss}
              onChange={handleChange}
              placeholder="3.00"
              step="0.01"
              className="w-full bg-gray-700/50 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Fila 4: Status fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">GEX Status</label>
            <select
              name="gexStatus"
              value={formData.gexStatus}
              onChange={handleChange}
              className="w-full bg-gray-700/50 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="positivo">Positivo</option>
              <option value="negativo">Negativo</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">PVP Status</label>
            <input
              type="text"
              name="pvpStatus"
              value={formData.pvpStatus}
              onChange={handleChange}
              placeholder="En confluencia"
              className="w-full bg-gray-700/50 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">VWAP Status</label>
            <input
              type="text"
              name="vwapStatus"
              value={formData.vwapStatus}
              onChange={handleChange}
              placeholder="Arriba"
              className="w-full bg-gray-700/50 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Comments */}
        <div>
          <label className="block text-gray-300 text-sm font-semibold mb-2">Comments</label>
          <textarea
            name="comments"
            value={formData.comments}
            onChange={handleChange}
            placeholder="Notas sobre el trade..."
            rows={3}
            className="w-full bg-gray-700/50 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {submitting ? 'Guardando...' : 'Guardar Trade'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default TradeInputForm
