import React, { useState } from 'react'
import { X, Download } from 'lucide-react'
import { TradeEntry } from '../../types'
import { ExportManager, ExportOptions } from '../../services/exportManager'

interface ExportDialogProps {
  trades: TradeEntry[]
  isOpen: boolean
  onClose: () => void
  strategies: string[]
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  trades,
  isOpen,
  onClose,
  strategies
}) => {
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [strategy, setStrategy] = useState('')
  const [includeStats, setIncludeStats] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const options: ExportOptions = {
        format,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        strategy: strategy || undefined,
        includeStats
      }

      ExportManager.download(trades, options)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export trades')
    } finally {
      setIsExporting(false)
      onClose()
    }
  }

  if (!isOpen) return null

  const filteredCount = ExportManager.filterTrades(trades, {
    format,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    strategy: strategy || undefined
  }).length

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-96 border border-slate-700">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Download className="w-5 h-5 text-cyan-400" />
            Export Trades
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Export Format
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={e => setFormat(e.target.value as 'csv' | 'pdf')}
                  className="w-4 h-4"
                />
                <span className="text-gray-300">CSV (Spreadsheet)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="pdf"
                  checked={format === 'pdf'}
                  onChange={e => setFormat(e.target.value as 'csv' | 'pdf')}
                  className="w-4 h-4"
                />
                <span className="text-gray-300">PDF (Report)</span>
              </label>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Date Range (Optional)
            </label>
            <div className="space-y-2">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                placeholder="Start Date"
              />
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                placeholder="End Date"
              />
            </div>
          </div>

          {/* Strategy Filter */}
          {strategies.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Strategy (Optional)
              </label>
              <select
                value={strategy}
                onChange={e => setStrategy(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="">All Strategies</option>
                {strategies.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Include Statistics (PDF only) */}
          {format === 'pdf' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeStats}
                onChange={e => setIncludeStats(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-300">Include Summary Statistics</span>
            </label>
          )}

          {/* Preview */}
          <div className="bg-slate-700 rounded px-3 py-2 text-sm text-gray-300">
            <div>
              <span className="font-semibold text-cyan-400">{filteredCount}</span> trades will be
              exported
            </div>
            {startDate && (
              <div>
                From{' '}
                <span className="font-semibold text-cyan-400">
                  {new Date(startDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {endDate && (
              <div>
                To{' '}
                <span className="font-semibold text-cyan-400">
                  {new Date(endDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {strategy && (
              <div>
                Strategy:{' '}
                <span className="font-semibold text-cyan-400">{strategy}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg bg-slate-700 text-white font-semibold hover:bg-slate-600 transition disabled:opacity-50"
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || filteredCount === 0}
            className="flex-1 px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold hover:bg-cyan-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  )
}
