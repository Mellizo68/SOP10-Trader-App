import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import OverviewTab from '../OverviewTab'
import { TradeEntry } from '../../../types'
import * as TradeJournalModule from '../../../services/tradeJournalService'

// Mock TradeJournalService
vi.mock('../../../services/tradeJournalService', () => ({
  TradeJournalService: {
    calculateStatistics: vi.fn(),
  },
}))

describe('OverviewTab Component', () => {
  const mockStats = {
    totalTrades: 10,
    winningTrades: 6,
    losingTrades: 4,
    winRate: 60,
    averageProfit: 25,
    averageLoss: 15,
    profitFactor: 2.5,
    totalProfitLoss: 90,
    bestTrade: 100,
    worstTrade: -50,
    byStrategy: {
      'Call_Spread': {
        count: 5,
        winRate: 80,
        avgProfitLoss: 30,
      },
      'Put_Spread': {
        count: 5,
        winRate: 40,
        avgProfitLoss: 15,
      },
    },
    byConfluenceScore: {
      high: { winRate: 75, avgProfit: 40 },
      medium: { winRate: 60, avgProfit: 25 },
      low: { winRate: 40, avgProfit: 10 },
    },
  }

  const mockTrades: TradeEntry[] = [
    {
      id: '1',
      entryNumber: 1,
      symbol: 'SPY',
      entryPrice: 100,
      entryDate: '2026-05-20T00:00:00Z',
      exitPrice: 110,
      exitDate: '2026-05-21T00:00:00Z',
      profitLoss: 10,
      percentReturn: 10,
      strategy: 'Call_Spread',
      setupType: 'bullish',
      confluenceScore: 85,
      notes: 'Test trade 1',
      status: 'closed',
    },
    {
      id: '2',
      entryNumber: 2,
      symbol: 'QQQ',
      entryPrice: 100,
      entryDate: '2026-05-19T00:00:00Z',
      exitPrice: 95,
      exitDate: '2026-05-20T00:00:00Z',
      profitLoss: -5,
      percentReturn: -5,
      strategy: 'Put_Spread',
      setupType: 'bearish',
      confluenceScore: 45,
      notes: 'Test trade 2',
      status: 'closed',
    },
    {
      id: '3',
      entryNumber: 3,
      symbol: 'IWM',
      entryPrice: 100,
      entryDate: '2026-05-18T00:00:00Z',
      exitPrice: 120,
      exitDate: '2026-05-19T00:00:00Z',
      profitLoss: 20,
      percentReturn: 20,
      strategy: 'Call_Spread',
      setupType: 'bullish',
      confluenceScore: 90,
      notes: 'Test trade 3',
      status: 'closed',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(TradeJournalModule.TradeJournalService, 'calculateStatistics').mockReturnValue(
      mockStats
    )
  })

  describe('Stats Cards Rendering', () => {
    it('should render all stats cards with correct values', () => {
      render(<OverviewTab trades={mockTrades} />)

      // Total Trades card
      expect(screen.getByText('Total Trades')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument()

      // Win Rate card
      expect(screen.getByText('Win Rate')).toBeInTheDocument()
      expect(screen.getByText('60.0%')).toBeInTheDocument()

      // Profit Factor card
      expect(screen.getByText('Profit Factor')).toBeInTheDocument()
      expect(screen.getByText('2.50')).toBeInTheDocument()

      // Total P/L card
      expect(screen.getByText('Total P/L')).toBeInTheDocument()
      expect(screen.getByText('$90.00')).toBeInTheDocument()

      // Avg Win card
      expect(screen.getByText('Avg Win')).toBeInTheDocument()
      expect(screen.getByText('$25.00')).toBeInTheDocument()

      // Avg Loss card
      expect(screen.getByText('Avg Loss')).toBeInTheDocument()
      expect(screen.getByText('-$15.00')).toBeInTheDocument()
    })

    it('should display win/loss ratio correctly', () => {
      render(<OverviewTab trades={mockTrades} />)

      const winLossText = screen.getByText('6W / 4L')
      expect(winLossText).toBeInTheDocument()
    })

    it('should display open trades count in Total Trades card', () => {
      const tradesWithOpen = [
        ...mockTrades,
        {
          id: '4',
          entryNumber: 4,
          symbol: 'AAPL',
          entryPrice: 100,
          entryDate: '2026-05-20T00:00:00Z',
          exitPrice: null,
          exitDate: null,
          profitLoss: null,
          percentReturn: null,
          strategy: 'Call_Spread',
          setupType: 'bullish',
          confluenceScore: 75,
          notes: 'Open trade',
          status: 'open',
        },
      ]

      render(<OverviewTab trades={tradesWithOpen} />)

      expect(screen.getByText(/Open: 1/)).toBeInTheDocument()
    })

    it('should color-code P/L card green when profitable', () => {
      render(<OverviewTab trades={mockTrades} />)

      const plValue = screen.getByText('$90.00')
      expect(plValue).toHaveClass('text-emerald-400')
    })

    it('should color-code P/L card red when unprofitable', () => {
      vi.spyOn(TradeJournalModule.TradeJournalService, 'calculateStatistics').mockReturnValue({
        ...mockStats,
        totalProfitLoss: -50,
      })

      render(<OverviewTab trades={mockTrades} />)

      const plValue = screen.getByText('-$50.00')
      expect(plValue).toHaveClass('text-red-400')
    })
  })

  describe('Extremos Section', () => {
    it('should display best and worst trade values', () => {
      render(<OverviewTab trades={mockTrades} />)

      expect(screen.getByText('Extremos')).toBeInTheDocument()
      expect(screen.getByText('Best Trade')).toBeInTheDocument()
      expect(screen.getByText('$100.00')).toBeInTheDocument()
      expect(screen.getByText('Worst Trade')).toBeInTheDocument()
      expect(screen.getByText('-$50.00')).toBeInTheDocument()
    })

    it('should color best trade green and worst trade red', () => {
      render(<OverviewTab trades={mockTrades} />)

      const bestTradeValue = screen.getAllByText('$100.00')[0]
      expect(bestTradeValue).toHaveClass('text-emerald-400')

      const worstTradeValue = screen.getByText('-$50.00')
      expect(worstTradeValue).toHaveClass('text-red-400')
    })
  })

  describe('Quick Metrics Section', () => {
    it('should display best strategy with win rate', () => {
      render(<OverviewTab trades={mockTrades} />)

      expect(screen.getByText('Quick Metrics')).toBeInTheDocument()
      expect(screen.getByText('Best Strategy')).toBeInTheDocument()
      // Strategy name includes underscores from backend
      const quickMetricsSection = screen.getByText('Quick Metrics').closest('div')
      const strategyElement = quickMetricsSection?.querySelector('span.text-blue-400') ||
                             Array.from(screen.getAllByText(/Call_Spread/)).find(el =>
                               el.parentElement?.textContent?.includes('80.0%')
                             )
      expect(strategyElement?.textContent).toContain('Call_Spread')
      // Check that the win rate percentage appears nearby
      expect(strategyElement?.parentElement?.textContent).toContain('80.0%')
    })

    it('should display current winning streak', () => {
      render(<OverviewTab trades={mockTrades} />)

      expect(screen.getByText('Current Streak')).toBeInTheDocument()
      expect(screen.getByText(/1 🔥/)).toBeInTheDocument()
    })

    it('should calculate streak correctly with all winning trades', () => {
      const allWinningTrades: TradeEntry[] = [
        {
          ...mockTrades[0],
          id: '1',
          profitLoss: 10,
          exitDate: '2026-05-21T00:00:00Z',
        },
        {
          ...mockTrades[0],
          id: '2',
          profitLoss: 20,
          exitDate: '2026-05-20T00:00:00Z',
        },
        {
          ...mockTrades[0],
          id: '3',
          profitLoss: 15,
          exitDate: '2026-05-19T00:00:00Z',
        },
      ]

      render(<OverviewTab trades={allWinningTrades} />)

      expect(screen.getByText('Current Streak')).toBeInTheDocument()
      // The streak value and emoji are in different elements
      const streakElement = screen.getByText('Current Streak').parentElement?.parentElement
      expect(streakElement?.textContent).toContain('3')
      expect(streakElement?.textContent).toContain('🔥')
    })

    it('should reset streak on losing trade', () => {
      const mixedTrades: TradeEntry[] = [
        {
          ...mockTrades[0],
          id: '1',
          profitLoss: 10,
          exitDate: '2026-05-21T00:00:00Z',
        },
        {
          ...mockTrades[0],
          id: '2',
          profitLoss: -5,
          exitDate: '2026-05-20T00:00:00Z',
        },
      ]

      render(<OverviewTab trades={mixedTrades} />)

      // The streak value and emoji are in different elements, so check textContent
      const streakElement = screen.getByText('Current Streak').parentElement?.parentElement
      expect(streakElement?.textContent).toContain('0')
      expect(streakElement?.textContent).toContain('🔥')
    })
  })

  describe('Recent Trades Section', () => {
    it('should display recent closed trades when they exist', () => {
      render(<OverviewTab trades={mockTrades} />)

      expect(screen.getByText('últimos 5 Trades Cerrados')).toBeInTheDocument()
      expect(screen.getByText(/SPY - Call_Spread/)).toBeInTheDocument()
      expect(screen.getByText(/QQQ - Put_Spread/)).toBeInTheDocument()
      expect(screen.getByText(/IWM - Call_Spread/)).toBeInTheDocument()
    })

    it('should display profit as green and positive', () => {
      render(<OverviewTab trades={mockTrades} />)

      const spyTradeReturn = screen.getByText('+10.00%')
      expect(spyTradeReturn).toHaveClass('text-emerald-400')
    })

    it('should display loss as red and negative', () => {
      render(<OverviewTab trades={mockTrades} />)

      const qqqTradeReturn = screen.getByText('-5.00%')
      expect(qqqTradeReturn).toHaveClass('text-red-400')
    })

    it('should show only last 5 trades when more exist', () => {
      const manyTrades = Array.from({ length: 10 }, (_, i) => ({
        ...mockTrades[0],
        id: `${i}`,
        symbol: `SYM${i}`,
        exitDate: new Date(2026, 4, 21 - i).toISOString(),
      }))

      render(<OverviewTab trades={manyTrades} />)

      // Should show exactly 5 most recent trades
      const symbolsShown = manyTrades.slice(0, 5).map(t => t.symbol)
      symbolsShown.forEach(symbol => {
        expect(screen.getByText(new RegExp(symbol))).toBeInTheDocument()
      })

      // Should not show 6th+ trades
      expect(screen.queryByText(/SYM5/)).not.toBeInTheDocument()
    })

    it('should not display recent trades section when no closed trades', () => {
      const openOnlyTrades: TradeEntry[] = [
        {
          ...mockTrades[0],
          status: 'open',
          exitPrice: null,
          exitDate: null,
        },
      ]

      render(<OverviewTab trades={openOnlyTrades} />)

      expect(screen.queryByText('últimos 5 Trades Cerrados')).not.toBeInTheDocument()
    })

    it('should format dates in Spanish locale', () => {
      render(<OverviewTab trades={mockTrades} />)

      // Check if date is formatted (avoiding exact date format dependency)
      const dateElements = screen.getAllByText(/\d+\/\d+\/\d+/)
      expect(dateElements.length).toBeGreaterThan(0)
    })
  })

  describe('Empty State', () => {
    it('should display empty state when no trades exist', () => {
      vi.spyOn(TradeJournalModule.TradeJournalService, 'calculateStatistics').mockReturnValue({
        ...mockStats,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
      })

      render(<OverviewTab trades={[]} />)

      expect(screen.getByText('📊 Sin trades registrados aún')).toBeInTheDocument()
      expect(
        screen.getByText('Comienza creando un nuevo trade en la pestaña "Trades"')
      ).toBeInTheDocument()
    })

    it('should not display recent trades section when empty state shown', () => {
      render(<OverviewTab trades={[]} />)

      expect(screen.queryByText('últimos 5 Trades Cerrados')).not.toBeInTheDocument()
    })
  })

  describe('Statistics Calculation', () => {
    it('should call TradeJournalService.calculateStatistics with trades array', () => {
      render(<OverviewTab trades={mockTrades} />)

      expect(TradeJournalModule.TradeJournalService.calculateStatistics).toHaveBeenCalledWith(
        mockTrades
      )
    })

    it('should recalculate stats when trades change', () => {
      const { rerender } = render(<OverviewTab trades={mockTrades} />)

      expect(TradeJournalModule.TradeJournalService.calculateStatistics).toHaveBeenCalledWith(
        mockTrades
      )

      const newTrades = [...mockTrades, mockTrades[0]]
      rerender(<OverviewTab trades={newTrades} />)

      expect(TradeJournalModule.TradeJournalService.calculateStatistics).toHaveBeenLastCalledWith(
        newTrades
      )
    })
  })

  describe('Currency Formatting', () => {
    it('should format all currency values with dollar sign and two decimals', () => {
      render(<OverviewTab trades={mockTrades} />)

      expect(screen.getByText('$90.00')).toBeInTheDocument()
      expect(screen.getByText('$25.00')).toBeInTheDocument()
      expect(screen.getByText('-$15.00')).toBeInTheDocument()
      expect(screen.getByText('$100.00')).toBeInTheDocument()
    })
  })

  describe('Percentage Formatting', () => {
    it('should format percentages with one decimal place', () => {
      render(<OverviewTab trades={mockTrades} />)

      expect(screen.getByText('60.0%')).toBeInTheDocument()
      // Strategy name uses underscores from backend (Call_Spread)
      const callSpreadElement = screen.getAllByText(/Call_Spread/).find(el =>
        el.textContent?.includes('80.0%')
      )
      expect(callSpreadElement).toBeInTheDocument()
      expect(callSpreadElement?.textContent).toContain('Call_Spread')
      expect(callSpreadElement?.textContent).toContain('80.0%')
    })

    it('should format recent trade returns with two decimals and + sign for positive', () => {
      render(<OverviewTab trades={mockTrades} />)

      expect(screen.getByText('+10.00%')).toBeInTheDocument()
      expect(screen.getByText('+20.00%')).toBeInTheDocument()
    })

    it('should format recent trade returns without + sign for negative', () => {
      render(<OverviewTab trades={mockTrades} />)

      expect(screen.getByText('-5.00%')).toBeInTheDocument()
    })
  })
})
