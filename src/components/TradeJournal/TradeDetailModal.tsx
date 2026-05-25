import React, { useState, useEffect } from 'react'
import { TradeEntry, MediaEntry } from '../../types'
import { TradeJournalService } from '../../services/tradeJournalService'
import { X, CheckCircle } from 'lucide-react'
import { MediaUploadDropzone, MediaGallery } from '../Media'
import { TradeJournalNotes } from './TradeJournalNotes'
import { apiClient } from '../../api/tradeClient'

interface TradeDetailModalProps {
  trade: TradeEntry
  onClose: () => void
}

const TradeDetailModal: React.FC<TradeDetailModalProps> = ({ trade, onClose }) => {
  const [exitPrice, setExitPrice] = useState(trade.exitPrice?.toString() || '')
  const [exitDate, setExitDate] = useState(
    trade.exitDate ? new Date(trade.exitDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  )
  const [closing, setClosing] = useState(false)
  const [message, setMessage] = useState('')
  const [media, setMedia] = useState<MediaEntry[]>([])
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [mediaError, setMediaError] = useState('')

  // Load media files for the trade
  useEffect(() => {
    const loadMedia = async () => {
      try {
        setLoadingMedia(true)
        const result = await apiClient.getMedia(trade.id)
        setMedia(result.media)
      } catch (error) {
        console.error('Error loading media:', error)
        // Don't show error to user, just fail silently
      } finally {
        setLoadingMedia(false)
      }
    }

    loadMedia()
  }, [trade.id])

  const calculatedPL = exitPrice ? parseFloat(exitPrice) - trade.entryPrice : null
  const calculatedPercent = calculatedPL ? (calculatedPL / trade.entryPrice) * 100 : null

  const handleCloseTrade = async () => {
    if (!exitPrice || !exitDate) {
      setMessage('❌ Exit Price y Exit Date son requeridos')
      return
    }

    setClosing(true)
    setMessage('')

    try {
      const exitPriceNum = parseFloat(exitPrice)
      if (exitPriceNum <= 0) {
        throw new Error('Exit Price debe ser mayor a 0')
      }

      // Call API to close trade
      await apiClient.closeTrade(trade.id, exitPriceNum, new Date(exitDate))

      setMessage(`✅ Trade cerrado exitosamente!`)
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`)
    } finally {
      setClosing(false)
    }
  }

  const handleMediaUploaded = (uploadedMedia: MediaEntry) => {
    setMedia([uploadedMedia, ...media])
    setMediaError('')
  }

  const handleMediaDeleted = (mediaId: string) => {
    setMedia(media.filter(m => m.id !== mediaId))
  }

  const handleMediaError = (error: string) => {
    setMediaError(error)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {trade.symbol} - {trade.strategy.replace(/_/g, ' ')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Mensaje */}
        {message && (
          <div className={`p-4 rounded-lg text-white mb-6 ${message.includes('✅') ? 'bg-green-900/30 border border-green-500/30' : 'bg-red-900/30 border border-red-500/30'}`}>
            {message}
          </div>
        )}

        {/* Entry Details */}
        <div className="bg-gray-800/30 rounded-lg p-6 mb-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Detalles de Entrada</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Entry Date</p>
              <p className="text-white font-semibold">{new Date(trade.dateEntry).toLocaleDateString('es-ES')}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Strike Price</p>
              <p className="text-white font-semibold">${trade.strikePrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Entry Price</p>
              <p className="text-cyan-400 font-semibold">${trade.entryPrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Delta</p>
              <p className="text-white font-semibold">{trade.delta.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">DTE</p>
              <p className="text-white font-semibold">{trade.daysToExpiration} días</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">IV Percent</p>
              <p className="text-white font-semibold">{trade.ivPercent.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Confluence Score</p>
              <p className="text-blue-400 font-semibold">{trade.confluenceScore}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">GEX Status</p>
              <p className={`font-semibold ${trade.gexStatus === 'positivo' ? 'text-emerald-400' : 'text-red-400'}`}>
                {trade.gexStatus.charAt(0).toUpperCase() + trade.gexStatus.slice(1)}
              </p>
            </div>
          </div>
        </div>

        {/* Target Info */}
        <div className="bg-gray-800/30 rounded-lg p-6 mb-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Targets</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Take Profit</p>
              <p className="text-emerald-400 font-semibold">${trade.takeProfit.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Stop Loss</p>
              <p className="text-red-400 font-semibold">${trade.stopLoss.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Exit Section - Only if open */}
        {trade.status === 'open' && (
          <div className="bg-blue-900/20 rounded-lg p-6 mb-6 border border-blue-500/30">
            <h3 className="text-lg font-semibold text-white mb-4">Cerrar Trade</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">Exit Price *</label>
                <input
                  type="number"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  placeholder="Exit price"
                  step="0.01"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">Exit Date</label>
                <input
                  type="date"
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* P/L Preview */}
            {calculatedPL !== null && (
              <div className="bg-gray-800/50 rounded p-4 mb-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Profit/Loss</p>
                    <p className={`text-xl font-bold ${calculatedPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {calculatedPL >= 0 ? '+' : ''}{calculatedPL.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Return %</p>
                    <p className={`text-xl font-bold ${calculatedPercent! >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {calculatedPercent! >= 0 ? '+' : ''}{calculatedPercent!.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">vs TP/SL</p>
                    <p className="text-white text-xl font-bold">
                      {parseFloat(exitPrice || '0') <= trade.takeProfit ? '✅ TP' : parseFloat(exitPrice || '0') >= trade.stopLoss ? '❌ SL' : '⚪ Entre'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleCloseTrade}
              disabled={closing || !exitPrice}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              {closing ? 'Cerrando...' : 'Cerrar Trade'}
            </button>
          </div>
        )}

        {/* Exit Details - If already closed */}
        {trade.status === 'closed' && trade.exitPrice && (
          <div className="bg-gray-800/30 rounded-lg p-6 mb-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">Detalles de Salida</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Exit Date</p>
                <p className="text-white font-semibold">{new Date(trade.exitDate || 0).toLocaleDateString('es-ES')}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Exit Price</p>
                <p className="text-white font-semibold">${trade.exitPrice.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Profit/Loss</p>
                <p className={`font-semibold ${(trade.profitLoss || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {(trade.profitLoss || 0) >= 0 ? '+' : ''}${trade.profitLoss?.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Return</p>
                <p className={`font-semibold ${(trade.percentReturn || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {(trade.percentReturn || 0) >= 0 ? '+' : ''}{trade.percentReturn?.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Comments */}
        {trade.comments && (
          <div className="bg-gray-800/30 rounded-lg p-6 mb-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">Comentarios</h3>
            <p className="text-gray-300">{trade.comments}</p>
          </div>
        )}

        {/* Media Section */}
        <div className="bg-gray-800/30 rounded-lg p-6 mb-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Trade Media</h3>

          {mediaError && (
            <div className="bg-red-900/30 border border-red-500/30 text-red-400 text-sm p-3 rounded mb-4">
              {mediaError}
            </div>
          )}

          {/* Upload Section */}
          <div className="mb-6">
            <p className="text-gray-400 text-sm mb-3">Upload screenshots or charts for this trade</p>
            <MediaUploadDropzone
              tradeId={trade.id}
              onMediaUploaded={handleMediaUploaded}
              onError={handleMediaError}
            />
          </div>

          {/* Gallery Section */}
          {media.length > 0 && (
            <div>
              <p className="text-gray-400 text-sm mb-3">{media.length} file{media.length !== 1 ? 's' : ''} uploaded</p>
              <MediaGallery
                tradeId={trade.id}
                media={media}
                onMediaDeleted={handleMediaDeleted}
                onError={handleMediaError}
                isLoading={loadingMedia}
              />
            </div>
          )}
        </div>

        {/* Trade Journals Section */}
        <div className="mb-6">
          <TradeJournalNotes
            tradeId={trade.id}
            tradeSymbol={trade.symbol}
          />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}

export default TradeDetailModal
