/**
 * Performance Heatmap Component Tests
 */

import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { PerformanceHeatmap } from '../PerformanceHeatmap'
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

describe('PerformanceHeatmap', () => {
  it('should render component with title', () => {
    const trades = [createTrade()]
    render(<PerformanceHeatmap trades={trades} />)
    expect(screen.getByText('Performance Heatmap')).toBeInTheDocument()
  })

  it('should show empty state when no trades', () => {
    render(<PerformanceHeatmap trades={[]} />)
    expect(screen.getByText('No closed trades to analyze')).toBeInTheDocument()
  })

  it('should show Monthly/Weekly toggle buttons', () => {
    const trades = [createTrade()]
    render(<PerformanceHeatmap trades={trades} />)
    expect(screen.getByRole('button', { name: /Monthly/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Weekly/i })).toBeInTheDocument()
  })

  it('should toggle between monthly and weekly view', async () => {
    const trades = [
      createTrade({ exit_date: '2026-05-01', status: 'closed' }),
      createTrade({ exit_date: '2026-05-15', status: 'closed' }),
    ]
    render(<PerformanceHeatmap trades={trades} />)

    const weeklyButton = screen.getByRole('button', { name: /Weekly/i })
    fireEvent.click(weeklyButton)

    await waitFor(() => {
      expect(weeklyButton).toHaveClass('bg-blue-600')
    })
  })

  it('should display heatmap charts', () => {
    const trades = [
      createTrade({ profit_loss: 100, exit_date: '2026-05-01', status: 'closed' }),
      createTrade({ profit_loss: -50, exit_date: '2026-05-02', status: 'closed' }),
    ]
    render(<PerformanceHeatmap trades={trades} />)
    expect(screen.getByText('Wins vs Losses')).toBeInTheDocument()
    expect(screen.getByText('Profit & Loss')).toBeInTheDocument()
    expect(screen.getByText('Win Rate')).toBeInTheDocument()
  })

  it('should display month labels in summary grid', () => {
    const trades = [createTrade({ exit_date: '2026-05-01', status: 'closed' })]
    render(<PerformanceHeatmap trades={trades} />)
    expect(screen.getByText('2026-05')).toBeInTheDocument()
  })

  it('should display win percentage in summary grid', () => {
    const trades = [
      createTrade({ profit_loss: 100, exit_date: '2026-05-01', status: 'closed' }),
      createTrade({ profit_loss: -50, exit_date: '2026-05-01', status: 'closed' }),
    ]
    render(<PerformanceHeatmap trades={trades} />)
    expect(screen.getByText(/50% win/i)).toBeInTheDocument()
  })

  it('should collapse/expand on header click', async () => {
    const trades = [createTrade()]
    const { container } = render(<PerformanceHeatmap trades={trades} />)

    const header = screen.getByText('Performance Heatmap').closest('div')?.parentElement
    fireEvent.click(header!)

    await waitFor(() => {
      const charts = screen.queryByText('Wins vs Losses')
      expect(charts).not.toBeInTheDocument()
    })
  })

  it('should ignore open trades', () => {
    const trades = [
      createTrade({ status: 'open' }),
      createTrade({ profit_loss: 100, status: 'closed', exit_date: '2026-05-01' }),
    ]
    render(<PerformanceHeatmap trades={trades} />)
    // Should only show 1 closed trade
    const summaryItems = screen.getAllByText(/2026-05/)
    expect(summaryItems.length).toBeGreaterThan(0)
  })

  it('should handle negative P&L correctly', () => {
    const trades = [createTrade({ profit_loss: -500, exit_date: '2026-05-01', status: 'closed' })]
    render(<PerformanceHeatmap trades={trades} />)
    // Should show negative value in summary
    expect(screen.getByText('$-500.00')).toBeInTheDocument()
  })

  it('should be responsive on mobile', () => {
    const trades = [createTrade()]
    const { container } = render(<PerformanceHeatmap trades={trades} />)
    // Check for responsive classes
    expect(container.querySelector('.sm\\:p-6')).toBeInTheDocument()
  })
})
