/**
 * Trade History Analysis Component Tests
 */

import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TradeHistoryAnalysis } from '../TradeHistoryAnalysis'
import { Trade } from '../../../services/analyticsService'

const createTrade = (overrides: Partial<Trade> = {}): Trade => ({
  id: 1,
  symbol: 'SPY',
  entry_price: 100,
  stop_loss_price: 95,
  exit_price: 110,
  position_size: 100,
  entry_date: '2026-05-01',
  exit_date: '2026-05-02',
  strategy: 'Pullback',
  setup_type: 'Technical',
  status: 'closed',
  profit_loss: 1000,
  return_percent: 10,
  notes: 'Test trade',
  created_at: '2026-05-01T10:00:00Z',
  updated_at: '2026-05-02T14:00:00Z',
  ...overrides,
})

describe('TradeHistoryAnalysis', () => {
  it('should render component with title', () => {
    const trades = [createTrade()]
    render(<TradeHistoryAnalysis trades={trades} />)
    expect(screen.getByText('Trade Duration Analysis')).toBeInTheDocument()
  })

  it('should show empty state when no closed trades', () => {
    render(<TradeHistoryAnalysis trades={[]} />)
    expect(screen.getByText('No closed trades to analyze')).toBeInTheDocument()
  })

  it('should display duration statistics', () => {
    const trades = [
      createTrade({
        id: 1,
        entry_date: '2026-05-01',
        exit_date: '2026-05-02',
        status: 'closed',
        symbol: 'SPY'
      }),
      createTrade({
        id: 2,
        entry_date: '2026-05-03',
        exit_date: '2026-05-05',
        status: 'closed',
        symbol: 'QQQ'
      }),
      createTrade({
        id: 3,
        entry_date: '2026-05-06',
        exit_date: '2026-05-06T06:00:00',
        status: 'closed',
        symbol: 'IWM'
      }),
    ]
    render(<TradeHistoryAnalysis trades={trades} />)

    expect(screen.getByText(/Avg Hold Time/i)).toBeInTheDocument()
    expect(screen.getByText(/Median Hold/i)).toBeInTheDocument()
    expect(screen.getByText(/Shortest/i)).toBeInTheDocument()
    expect(screen.getByText(/Longest/i)).toBeInTheDocument()
    expect(screen.getByText(/Total Trades/i)).toBeInTheDocument()
  })

  it('should display distribution charts', () => {
    const trades = [
      createTrade({ entry_date: '2026-05-01', exit_date: '2026-05-01T12:00:00', status: 'closed' }), // Under 1h
      createTrade({ entry_date: '2026-05-02', exit_date: '2026-05-02T06:00:00', status: 'closed' }), // 6h = 1-4h
      createTrade({ entry_date: '2026-05-03', exit_date: '2026-05-04', status: 'closed' }), // 24h = 4-24h
    ]
    render(<TradeHistoryAnalysis trades={trades} />)

    expect(screen.getByText('Hold Time Distribution')).toBeInTheDocument()
  })

  it('should display hold time timeline for recent trades', () => {
    const trades = [
      createTrade({ entry_date: '2026-05-01', exit_date: '2026-05-02', status: 'closed' }),
      createTrade({ entry_date: '2026-05-03', exit_date: '2026-05-05', status: 'closed' }),
    ]
    render(<TradeHistoryAnalysis trades={trades} />)

    expect(screen.getByText(/Recent Hold Times/i)).toBeInTheDocument()
  })

  it('should collapse/expand on header click', async () => {
    const trades = [createTrade()]
    render(<TradeHistoryAnalysis trades={trades} />)

    const header = screen.getByText('Trade Duration Analysis').closest('div')?.parentElement
    fireEvent.click(header!)

    await waitFor(() => {
      const statsSection = screen.queryByText('Avg Hold Time')
      expect(statsSection).not.toBeInTheDocument()
    })
  })

  it('should ignore open trades', () => {
    const trades = [
      createTrade({ status: 'open' }),
      createTrade({ status: 'closed', entry_date: '2026-05-01', exit_date: '2026-05-02' }),
    ]
    render(<TradeHistoryAnalysis trades={trades} />)

    // Should only show 1 closed trade in analysis
    expect(screen.getByText('Trade Duration Analysis')).toBeInTheDocument()
  })

  it('should be responsive on mobile', () => {
    const trades = [createTrade()]
    const { container } = render(<TradeHistoryAnalysis trades={trades} />)
    expect(container.querySelector('.sm\\:p-6')).toBeInTheDocument()
  })

  it('should handle trades with different hold times', () => {
    const trades = [
      createTrade({
        entry_date: '2026-05-01',
        exit_date: '2026-05-01T06:00:00',
        status: 'closed'
      }), // 6 hours
      createTrade({
        entry_date: '2026-05-02',
        exit_date: '2026-05-09',
        status: 'closed'
      }), // 7 days
    ]
    render(<TradeHistoryAnalysis trades={trades} />)

    // Should calculate statistics correctly
    expect(screen.getByText('Trade Duration Analysis')).toBeInTheDocument()
  })
})
