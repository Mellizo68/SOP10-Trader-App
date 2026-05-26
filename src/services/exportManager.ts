import { jsPDF } from 'jspdf'
import { TradeEntry, Statistics } from '../types'
import { TradeJournalService } from './tradeJournalService'

export interface ExportOptions {
  startDate?: Date
  endDate?: Date
  strategy?: string
  format: 'csv' | 'pdf'
  includeStats?: boolean
}

export class ExportManager {
  static filterTrades(trades: TradeEntry[], options: ExportOptions): TradeEntry[] {
    let filtered = trades

    if (options.startDate) {
      filtered = filtered.filter(t => new Date(t.dateEntry) >= options.startDate!)
    }

    if (options.endDate) {
      const endOfDay = new Date(options.endDate)
      endOfDay.setHours(23, 59, 59, 999)
      filtered = filtered.filter(t => new Date(t.dateEntry) <= endOfDay)
    }

    if (options.strategy) {
      filtered = filtered.filter(t => t.strategy === options.strategy)
    }

    return filtered.sort((a, b) => new Date(b.dateEntry).getTime() - new Date(a.dateEntry).getTime())
  }

  static exportToCSV(trades: TradeEntry[], options: ExportOptions): string {
    const filtered = this.filterTrades(trades, options)
    return TradeJournalService.exportToCSV(filtered)
  }

  static exportToPDF(trades: TradeEntry[], options: ExportOptions): void {
    const filtered = this.filterTrades(trades, options)
    const stats = TradeJournalService.calculateStatistics(filtered)

    const doc = new jsPDF()
    let yPosition = 15

    const pageHeight = doc.internal.pageSize.getHeight()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 10

    // Title
    doc.setFontSize(18)
    doc.text('Trade Export Report', margin, yPosition)
    yPosition += 10

    // Export metadata
    doc.setFontSize(10)
    doc.setTextColor(100)
    const exportDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    doc.text(`Generated: ${exportDate}`, margin, yPosition)
    yPosition += 5

    if (options.startDate || options.endDate) {
      const dateRange = [
        options.startDate?.toLocaleDateString('en-US'),
        options.endDate?.toLocaleDateString('en-US')
      ]
        .filter(Boolean)
        .join(' - ')
      doc.text(`Period: ${dateRange}`, margin, yPosition)
      yPosition += 5
    }

    if (options.strategy) {
      doc.text(`Strategy: ${options.strategy}`, margin, yPosition)
      yPosition += 5
    }

    doc.text(`Total Trades: ${filtered.length}`, margin, yPosition)
    yPosition += 8

    // Summary Statistics (if included)
    if (options.includeStats && filtered.length > 0) {
      doc.setFontSize(12)
      doc.setTextColor(0)
      doc.text('Summary Statistics', margin, yPosition)
      yPosition += 7

      doc.setFontSize(9)
      const statLabels = [
        `Win Rate: ${stats.winRate.toFixed(2)}%`,
        `Profit Factor: ${stats.profitFactor.toFixed(2)}`,
        `Avg Win: $${stats.averageProfit.toFixed(2)}`,
        `Avg Loss: $${stats.averageLoss.toFixed(2)}`,
        `Best Trade: $${stats.bestTrade.toFixed(2)}`,
        `Worst Trade: $${stats.worstTrade.toFixed(2)}`,
        `Total P/L: $${stats.totalProfitLoss.toFixed(2)}`
      ]

      statLabels.forEach((label, index) => {
        if (yPosition > pageHeight - 30) {
          doc.addPage()
          yPosition = margin
        }
        doc.text(label, margin + 5, yPosition)
        yPosition += 5
      })

      yPosition += 3
    }

    // Trades Table
    if (filtered.length > 0) {
      doc.setFontSize(11)
      doc.text('Trade Details', margin, yPosition)
      yPosition += 6

      doc.setFontSize(8)
      const columns = [
        'Date',
        'Symbol',
        'Strategy',
        'Entry',
        'Exit',
        'P/L',
        'Return %',
        'Status'
      ]

      const columnWidths = [18, 16, 16, 15, 15, 15, 15, 15]
      const rows = filtered.map(t => [
        new Date(t.dateEntry).toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: '2-digit'
        }),
        t.symbol,
        t.strategy || '-',
        `$${t.entryPrice.toFixed(2)}`,
        t.exitPrice ? `$${t.exitPrice.toFixed(2)}` : '-',
        t.profitLoss ? `$${t.profitLoss.toFixed(2)}` : '-',
        t.percentReturn ? `${t.percentReturn.toFixed(2)}%` : '-',
        t.status
      ])

      // Table header
      doc.setFillColor(41, 128, 185)
      doc.setTextColor(255)
      let xPos = margin

      columns.forEach((col, i) => {
        doc.text(col, xPos, yPosition, { maxWidth: columnWidths[i] - 1, align: 'center' })
        xPos += columnWidths[i]
      })

      yPosition += 6
      doc.setTextColor(0)

      // Table rows
      let rowIndex = 0
      rows.forEach(row => {
        if (yPosition > pageHeight - 15) {
          doc.addPage()
          yPosition = margin

          // Repeat header on new page
          doc.setFillColor(41, 128, 185)
          doc.setTextColor(255)
          xPos = margin
          columns.forEach((col, i) => {
            doc.text(col, xPos, yPosition, { maxWidth: columnWidths[i] - 1, align: 'center' })
            xPos += columnWidths[i]
          })
          yPosition += 6
          doc.setTextColor(0)
        }

        // Alternate row background
        if (rowIndex % 2 === 0) {
          doc.setFillColor(240, 240, 240)
          doc.rect(margin, yPosition - 4, pageWidth - 2 * margin, 5, 'F')
        }

        xPos = margin
        row.forEach((cell, i) => {
          const align = i >= 3 ? 'right' : 'left'
          doc.text(cell, xPos, yPosition, { maxWidth: columnWidths[i] - 1, align })
          xPos += columnWidths[i]
        })

        yPosition += 5
        rowIndex++
      })
    }

    // Footer
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 7, { align: 'center' })
    }

    // Download
    const fileName = `trades_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
  }

  static downloadFile(content: string, fileName: string, mimeType: string = 'text/csv'): void {
    const element = document.createElement('a')
    const file = new Blob([content], { type: mimeType })
    element.href = URL.createObjectURL(file)
    element.download = fileName
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    URL.revokeObjectURL(element.href)
  }

  static download(trades: TradeEntry[], options: ExportOptions): void {
    if (options.format === 'pdf') {
      this.exportToPDF(trades, options)
    } else {
      const csv = this.exportToCSV(trades, options)
      const fileName = `trades_${new Date().toISOString().split('T')[0]}.csv`
      this.downloadFile(csv, fileName, 'text/csv')
    }
  }
}
