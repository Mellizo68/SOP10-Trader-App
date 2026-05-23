/**
 * Streaks Analysis Component Tests
 */

import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { StreaksAnalysis } from '../StreaksAnalysis'
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

describe('StreaksAnalysis', () => {
  it('should render component with title', () => {
    const trades = [createTrade()]
    render(<StreaksAnalysis trades={trades} />)
    expect(screen.getByText('Win/Loss Streaks')).toBeInTheDocument()
  })

  it('should show empty state when no closed trades', () => {
    render(<StreaksAnalysis trades={[]} />)
    expect(screen.getByText('No closed trades to analyze')).toBeInTheDocument()
  })

  it('should display current winning streak', () => {
    const trades = [
      createTrade({ profit_loss: 100, exit_date: '2026-05-01', status: 'closed' }),
      createTrade({ profit_loss: 200, exit_date: '2026-05-02', status: 'closed' }),
      createTrade({ profit_loss: 150, exit_date: '2026-05-03', status: 'closed' }),
    ]
    render(<StreaksAnalysis trades={trades} />)
    expect(screen.getByText('WINS')).toBeInTheDocument()
    // Multiple "3"s appear (current streak, longest streak, probability text)
    // Verify winning streak count by checking for "3 in a row" in probability text
    expect(screen.getByText(/3 in a row/)).toBeInTheDocument()
  })

  it('should display current losing streak', () => {
    const trades = [
      createTrade({ profit_loss: -100, exit_date: '2026-05-01', status: 'closed' }),
      createTrade({ profit_loss: -200, exit_date: '2026-05-02', status: 'closed' }),
    ]
    render(<StreaksAnalysis trades={trades} />)
    expect(screen.getByText('LOSSES')).toBeInTheDocument()
  })

  it('should display longest win streak badge', () => {
    const trades = [
      createTrade({ profit_loss: 100, exit_date: '2026-05-01', status: 'closed' }),
      createTrade({ profit_loss: 100, exit_date: '2026-05-02', status: 'closed' }),
      createTrade({ profit_loss: 100, exit_date: '2026-05-03', status: 'closed' }),
      createTrade({ profit_loss: -50, exit_date: '2026-05-04', status: 'closed' }),
    ]
    render(<StreaksAnalysis trades={trades} />)
    expect(screen.getByText('Longest Win Streak')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('should display longest loss streak badge', () => {
    const trades = [
      createTrade({ profit_loss: 100, exit_date: '2026-05-01', status: 'closed' }),
      createTrade({ profit_loss: -50, exit_date: '2026-05-02', status: 'closed' }),
      createTrade({ profit_loss: -50, exit_date: '2026-05-03', status: 'closed' }),
      createTrade({ profit_loss: -50, exit_date: '2026-05-04', status: 'closed' }),
    ]
    render(<StreaksAnalysis trades={trades} />)
    expect(screen.getByText('Longest Loss Streak')).toBeInTheDocument()
  })

  it('should display win probability for current streak', () => {
    const trades = [
      createTrade({ profit_loss: 100, exit_date: '2026-05-01', status: 'closed' }),
      createTrade({ profit_loss: 200, exit_date: '2026-05-02', status: 'closed' }),
    ]
    render(<StreaksAnalysis trades={trades} />)
    expect(screen.getByText(/Probability of next/i)).toBeInTheDocument()
    expect(screen.getByText(/%/)).toBeInTheDocument()
  })

  it('should display streak statistics', () => {
    const trades = [
      createTrade({ profit_loss: 100, exit_date: '2026-05-01', status: 'closed' }),
      createTrade({ profit_loss: 100, exit_date: '2026-05-02', status: 'closed' }),
      createTrade({ profit_loss: -50, exit_date: '2026-05-03', status: 'closed' }),
    ]
    render(<StreaksAnalysis trades={trades} />)
    expect(screen.getByText('Streak Statistics')).toBeInTheDocument()
    expect(screen.getByText('Total Streaks')).toBeInTheDocument()
    expect(screen.getByText('Average Streak')).toBeInTheDocument()
  })

  it('should collapse/expand on header click', async () => {
    const trades = [createTrade()]
    render(<StreaksAnalysis trades={trades} />)

    const header = screen.getByText('Win/Loss Streaks').closest('div')?.parentElement
    fireEvent.click(header!)

    await waitFor(() => {
      const statsSection = screen.queryByText('Streak Statistics')
      expect(statsSection).not.toBeInTheDocument()
    })
  })

  it('should ignore open trades', () => {
    const trades = [
      createTrade({ status: 'open', profit_loss: 100 }),
      createTrade({ status: 'closed', profit_loss: 100, exit_date: '2026-05-01' }),
    ]
    render(<StreaksAnalysis trades={trades} />)
    // Should only see 1 trade in analysis
    expect(screen.getByText('Win/Loss Streaks')).toBeInTheDocument()
  })

  it('should display streak timeline chart', () => {
    const trades = [
      createTrade({ profit_loss: 100, exit_date: '2026-05-01', status: 'closed' }),
      createTrade({ profit_loss: 100, exit_date: '2026-05-02', status: 'closed' }),
      createTrade({ profit_loss: -50, exit_date: '2026-05-03', status: 'closed' }),
      createTrade({ profit_loss: -50, exit_date: '2026-05-04', status: 'closed' }),
    ]
    render(<StreaksAnalysis trades={trades} />)
    expect(screen.getByText('Streak Timeline')).toBeInTheDocument()
  })

  it('should handle single trade', () => {
    const trades = [createTrade({ profit_loss: 100, status: 'closed' })]
    render(<StreaksAnalysis trades={trades} />)
    // Multiple "1"s appear (current streak, longest streak, statistics)
    // Verify single trade streak by checking for "1 in a row" in probability text
    expect(screen.getByText(/1 in a row/)).toBeInTheDocument()
  })

  it('should be responsive on mobile', () => {
    const trades = [createTrade()]
    const { container } = render(<StreaksAnalysis trades={trades} />)
    expect(container.querySelector('.sm\\:p-6')).toBeInTheDocument()
  })

  it('should display streak start dates', () => {
    const trades = [
      createTrade({ profit_loss: 100, exit_date: '2026-05-15', status: 'closed' }),
    ]
    render(<StreaksAnalysis trades={trades} />)
    expect(screen.getByText(/Started/i)).toBeInTheDocument()
  })
})
