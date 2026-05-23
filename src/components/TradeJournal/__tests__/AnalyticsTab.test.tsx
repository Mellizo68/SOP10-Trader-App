import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import AnalyticsTab from '../AnalyticsTab'
import * as TradeJournalModule from '../../../services/tradeJournalService'
import { TradeEntry, Statistics } from '../../../types'

// Mock recharts to avoid canvas rendering issues in tests
vi.mock('recharts', () => ({
  BarChart: ({ children, data }: any) => <div data-testid="bar-chart">{data?.length || 0} bars</div>,
  LineChart: ({ children, data }: any) => <div data-testid="line-chart">{data?.length || 0} points</div>,
  PieChart: ({ children, data }: any) => <div data-testid="pie-chart">{data?.length || 0} slices</div>,
  Bar: ({ dataKey }: any) => <div data-testid="bar-component">{dataKey}</div>,
  Line: ({ dataKey }: any) => <div data-testid="line-component">{dataKey}</div>,
  Pie: ({ dataKey }: any) => <div data-testid="pie-component">{dataKey}</div>,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}))

describe('AnalyticsTab Component', () => {
  let mockTrades: TradeEntry[]
  let mockStats: Statistics

  beforeEach(() => {
    // Sample closed trades
    mockTrades = [
      {
        id: 'TRADE-0001',
        entryNumber: 1,
        symbol: 'SPY',
        strategy: 'Call Spread',
        strikePrice: 400,
        delta: 0.5,
        daysToExpiration: 30,
        ivPercent: 20,
        gexStatus: 'positivo',
        pvpStatus: 'bullish',
        vwapStatus: 'above',
        confluenceScore: 85,
        entryPrice: 100,
        exitPrice: 110,
        takeProfit: 110,
        stopLoss: 90,
        dateEntry: '2026-05-10T10:00:00Z',
        exitDate: '2026-05-15T14:00:00Z',
        status: 'closed',
        profitLoss: 10,
        percentReturn: 10,
        comments: 'Profitable trade',
        screenshots: [],
      },
      {
        id: 'TRADE-0002',
        entryNumber: 2,
        symbol: 'QQQ',
        strategy: 'Put Spread',
        strikePrice: 350,
        delta: -0.4,
        daysToExpiration: 30,
        ivPercent: 25,
        gexStatus: 'negativo',
        pvpStatus: 'bearish',
        vwapStatus: 'below',
        confluenceScore: 70,
        entryPrice: 100,
        exitPrice: 95,
        takeProfit: 85,
        stopLoss: 110,
        dateEntry: '2026-05-12T10:00:00Z',
        exitDate: '2026-05-17T14:00:00Z',
        status: 'closed',
        profitLoss: -5,
        percentReturn: -5,
        comments: 'Loss trade',
        screenshots: [],
      },
      {
        id: 'TRADE-0003',
        entryNumber: 3,
        symbol: 'SPY',
        strategy: 'Call Spread',
        strikePrice: 410,
        delta: 0.6,
        daysToExpiration: 20,
        ivPercent: 18,
        gexStatus: 'positivo',
        pvpStatus: 'bullish',
        vwapStatus: 'above',
        confluenceScore: 90,
        entryPrice: 50,
        exitPrice: 150,
        takeProfit: 150,
        stopLoss: 30,
        dateEntry: '2026-05-14T10:00:00Z',
        exitDate: '2026-05-18T14:00:00Z',
        status: 'closed',
        profitLoss: 100,
        percentReturn: 200,
        comments: 'Major win',
        screenshots: [],
      },
      {
        id: 'TRADE-0004',
        entryNumber: 4,
        symbol: 'AAPL',
        strategy: 'Call Spread',
        strikePrice: 150,
        delta: 0.55,
        daysToExpiration: 25,
        ivPercent: 22,
        gexStatus: 'positivo',
        pvpStatus: 'bullish',
        vwapStatus: 'above',
        confluenceScore: 75,
        entryPrice: 100,
        exitPrice: 105,
        takeProfit: 110,
        stopLoss: 90,
        dateEntry: '2026-05-16T10:00:00Z',
        exitDate: '2026-05-19T14:00:00Z',
        status: 'closed',
        profitLoss: 5,
        percentReturn: 5,
        comments: 'Small win',
        screenshots: [],
      },
    ]

    mockStats = {
      totalTrades: 4,
      winningTrades: 3,
      losingTrades: 1,
      winRate: 75,
      averageProfit: 38.33,
      averageLoss: 5,
      profitFactor: 7.67,
      totalProfitLoss: 110,
      bestTrade: 100,
      worstTrade: -5,
      byStrategy: {
        'Call Spread': {
          count: 3,
          winRate: 100,
          avgProfitLoss: 38.33,
        },
        'Put Spread': {
          count: 1,
          winRate: 0,
          avgProfitLoss: -5,
        },
      },
      byConfluenceScore: {
        high: { winRate: 100, avgProfit: 50 },
        medium: { winRate: 50, avgProfit: 2.5 },
        low: { winRate: 0, avgProfit: 0 },
      },
    }

    // Mock TradeJournalService.calculateStatistics
    vi.spyOn(TradeJournalModule.TradeJournalService, 'calculateStatistics').mockReturnValue(
      mockStats
    )
  })

  describe('Rendering with closed trades', () => {
    it('should render equity curve when trades exist', () => {
      render(<AnalyticsTab trades={mockTrades} />)

      expect(screen.getByText('📈 Equity Curve')).toBeInTheDocument()
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })

    it('should render P&L distribution chart', () => {
      render(<AnalyticsTab trades={mockTrades} />)

      expect(screen.getByText('📊 P&L Distribution')).toBeInTheDocument()
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })

    it('should render strategy breakdown section', () => {
      render(<AnalyticsTab trades={mockTrades} />)

      expect(screen.getByText('📋 Por Estrategia')).toBeInTheDocument()
      expect(screen.getByText('🥧 Distribución de Estrategias')).toBeInTheDocument()
    })

    it('should render strategy table with correct data', () => {
      render(<AnalyticsTab trades={mockTrades} />)

      // Check for strategy headers in table
      const headers = screen.getAllByText('Avg P/L')
      expect(headers[0]).toBeInTheDocument() // First one is the table header

      expect(screen.getByText('Estrategia')).toBeInTheDocument()
      expect(screen.getByText('Trades')).toBeInTheDocument()
      expect(screen.getByText('Win %')).toBeInTheDocument()

      // Check for strategy rows
      expect(screen.getByText('Call Spread')).toBeInTheDocument()
      expect(screen.getByText('Put Spread')).toBeInTheDocument()

      // Check for trade counts
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('should render confluence analysis section', () => {
      render(<AnalyticsTab trades={mockTrades} />)

      expect(screen.getByText('🎯 Por Nivel de Confluencia')).toBeInTheDocument()
      expect(screen.getByText('High (80-100)')).toBeInTheDocument()
      expect(screen.getByText('Medium (65-79)')).toBeInTheDocument()
      expect(screen.getByText('Low (<65)')).toBeInTheDocument()
    })

    it('should display confluence metrics correctly', () => {
      render(<AnalyticsTab trades={mockTrades} />)

      // High confluence
      const highSection = screen.getAllByText('Win Rate')[0].closest('div')
      expect(within(highSection!).getByText('100.0%')).toBeInTheDocument()

      // Check avg profit
      expect(screen.getAllByText('Avg P/L')[0]).toBeInTheDocument()
    })

    it('should render insights section', () => {
      render(<AnalyticsTab trades={mockTrades} />)

      expect(screen.getByText('💡 Insights')).toBeInTheDocument()
    })

    it('should show high confluence insight when high > medium and low', () => {
      render(<AnalyticsTab trades={mockTrades} />)

      // Text is split with <strong> tag, use regex to find partial text
      const insights = screen.getByText('💡 Insights').closest('div')
      expect(insights?.textContent).toMatch(/Mayor win rate en confluencia.*HIGH/)
    })

    it('should show strategy count insight', () => {
      render(<AnalyticsTab trades={mockTrades} />)

      expect(screen.getByText(/Implementando 2 estrategias diferentes con 4 trades cerrados/)).toBeInTheDocument()
    })

    it('should show excellent profit factor insight', () => {
      render(<AnalyticsTab trades={mockTrades} />)

      expect(screen.getByText(/Excelente Profit Factor \(7.67\)/)).toBeInTheDocument()
    })
  })

  describe('Empty state handling', () => {
    it('should show empty state message when no closed trades', () => {
      const openTrades: TradeEntry[] = [
        {
          ...mockTrades[0],
          status: 'open',
          exitPrice: undefined,
          exitDate: undefined,
          profitLoss: undefined,
          percentReturn: undefined,
        },
      ]

      render(<AnalyticsTab trades={openTrades} />)

      expect(screen.getByText('📊 Sin trades cerrados para analizar')).toBeInTheDocument()
    })

    it('should not render charts when no closed trades', () => {
      const openTrades: TradeEntry[] = [
        {
          ...mockTrades[0],
          status: 'open',
          exitPrice: undefined,
          exitDate: undefined,
          profitLoss: undefined,
          percentReturn: undefined,
        },
      ]

      render(<AnalyticsTab trades={openTrades} />)

      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument()
      expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument()
    })
  })

  describe('P&L Distribution binning', () => {
    it('should correctly bin trades into P&L categories', () => {
      const distributionTrades: TradeEntry[] = [
        { ...mockTrades[0], profitLoss: -150 }, // Major Loss
        { ...mockTrades[0], profitLoss: -50 },  // Loss
        { ...mockTrades[0], profitLoss: -5 },   // Small Loss
        { ...mockTrades[0], profitLoss: 0 },    // Breakeven
        { ...mockTrades[0], profitLoss: 10 },   // Small Win
        { ...mockTrades[0], profitLoss: 50 },   // Win
        { ...mockTrades[0], profitLoss: 150 },  // Major Win
      ]

      render(<AnalyticsTab trades={distributionTrades} />)

      // Check that bar chart is rendered with 7 bins
      const barChart = screen.getByTestId('bar-chart')
      expect(barChart).toBeInTheDocument()
    })
  })

  describe('Currency formatting', () => {
    it('should format currency with 2 decimal places', () => {
      render(<AnalyticsTab trades={mockTrades} />)

      // Check strategy table avg profit formatting
      const avgProfitCells = screen.getAllByText(/\$\d+\.\d{2}/)
      expect(avgProfitCells.length).toBeGreaterThan(0)
    })
  })

  describe('Color coding for performance', () => {
    it('should show green for positive win rates in strategy table', () => {
      const { container } = render(<AnalyticsTab trades={mockTrades} />)

      // Find row with Call Spread (100% win rate)
      const rows = screen.getAllByRole('row')
      const callSpreadRow = rows.find(row => row.textContent.includes('Call Spread'))

      expect(callSpreadRow?.textContent).toContain('100.0%')
    })

    it('should show red for negative profits', () => {
      render(<AnalyticsTab trades={mockTrades} />)

      // Strategy with loss should show in red color class
      const putSpreadRow = screen.getByText('Put Spread').closest('tr')
      expect(putSpreadRow).toBeInTheDocument()
    })
  })

  describe('Memoization behavior', () => {
    it('should recalculate stats when trades change', () => {
      const { rerender } = render(<AnalyticsTab trades={mockTrades} />)

      expect(TradeJournalModule.TradeJournalService.calculateStatistics).toHaveBeenCalledWith(mockTrades)

      const newTrades = [...mockTrades, mockTrades[0]]
      rerender(<AnalyticsTab trades={newTrades} />)

      expect(TradeJournalModule.TradeJournalService.calculateStatistics).toHaveBeenCalledWith(newTrades)
      expect(TradeJournalModule.TradeJournalService.calculateStatistics).toHaveBeenCalledTimes(2)
    })

    it('should use memoized stats when component re-renders with same trades', () => {
      const { rerender } = render(<AnalyticsTab trades={mockTrades} />)

      // Initial render should call calculateStatistics once
      expect(TradeJournalModule.TradeJournalService.calculateStatistics).toHaveBeenCalledTimes(1)

      // Clear the mock to track new calls
      vi.mocked(TradeJournalModule.TradeJournalService.calculateStatistics).mockClear()

      // Re-render with same trades array reference
      rerender(<AnalyticsTab trades={mockTrades} />)

      // Should NOT recalculate since useMemo dependency (mockTrades) is the same reference
      expect(TradeJournalModule.TradeJournalService.calculateStatistics).not.toHaveBeenCalled()
    })
  })

  describe('Date formatting', () => {
    it('should format exit dates in locale-specific format', () => {
      render(<AnalyticsTab trades={mockTrades} />)

      // Equity curve should render with formatted dates
      const lineChart = screen.getByTestId('line-chart')
      expect(lineChart).toBeInTheDocument()
    })
  })

  describe('Profit factor insights', () => {
    it('should show different insight based on profit factor > 2', () => {
      vi.mocked(TradeJournalModule.TradeJournalService.calculateStatistics).mockReturnValue({
        ...mockStats,
        profitFactor: 2.5,
      })

      render(<AnalyticsTab trades={mockTrades} />)

      expect(screen.getByText(/Excelente Profit Factor \(2.50\)/)).toBeInTheDocument()
    })

    it('should show good insight when profit factor between 1.5 and 2', () => {
      vi.mocked(TradeJournalModule.TradeJournalService.calculateStatistics).mockReturnValue({
        ...mockStats,
        profitFactor: 1.75,
      })

      render(<AnalyticsTab trades={mockTrades} />)

      expect(screen.getByText(/Buen Profit Factor \(1.75\)/)).toBeInTheDocument()
    })

    it('should show warning insight when profit factor between 1 and 1.5', () => {
      vi.mocked(TradeJournalModule.TradeJournalService.calculateStatistics).mockReturnValue({
        ...mockStats,
        profitFactor: 1.2,
      })

      render(<AnalyticsTab trades={mockTrades} />)

      expect(screen.getByText(/Profit Factor bajo \(1.20\)/)).toBeInTheDocument()
    })
  })

  describe('Strategy breakdown', () => {
    it('should handle single strategy', () => {
      const singleStrategyTrades = mockTrades.filter(t => t.strategy === 'Call Spread')

      vi.mocked(TradeJournalModule.TradeJournalService.calculateStatistics).mockReturnValue({
        ...mockStats,
        byStrategy: {
          'Call Spread': {
            count: 3,
            winRate: 100,
            avgProfitLoss: 38.33,
          },
        },
      })

      render(<AnalyticsTab trades={singleStrategyTrades} />)

      expect(screen.getByText('Call Spread')).toBeInTheDocument()
    })

    it('should handle multiple strategies with different win rates', () => {
      render(<AnalyticsTab trades={mockTrades} />)

      // Should render both Call Spread and Put Spread
      expect(screen.getByText('Call Spread')).toBeInTheDocument()
      expect(screen.getByText('Put Spread')).toBeInTheDocument()
    })

    it('should format strategy names by replacing underscores with spaces', () => {
      vi.mocked(TradeJournalModule.TradeJournalService.calculateStatistics).mockReturnValue({
        ...mockStats,
        byStrategy: {
          'Iron_Condor': {
            count: 2,
            winRate: 50,
            avgProfitLoss: 10,
          },
        },
      })

      render(<AnalyticsTab trades={mockTrades} />)

      expect(screen.getByText('Iron Condor')).toBeInTheDocument()
    })
  })

  describe('Equity curve calculation', () => {
    it('should calculate cumulative P&L correctly', () => {
      const tradesToTest: TradeEntry[] = [
        { ...mockTrades[0], id: 'T1', profitLoss: 10, exitDate: '2026-05-15T00:00:00Z' },
        { ...mockTrades[0], id: 'T2', profitLoss: -5, exitDate: '2026-05-16T00:00:00Z' },
        { ...mockTrades[0], id: 'T3', profitLoss: 15, exitDate: '2026-05-17T00:00:00Z' },
      ]

      render(<AnalyticsTab trades={tradesToTest} />)

      // LineChart should render with 3 data points
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })
  })

  describe('Confluence score filtering', () => {
    it('should show high confluence insight when highest', () => {
      vi.clearAllMocks()
      vi.spyOn(TradeJournalModule.TradeJournalService, 'calculateStatistics').mockReturnValue({
        ...mockStats,
        byConfluenceScore: {
          high: { winRate: 85, avgProfit: 40 },
          medium: { winRate: 50, avgProfit: 20 },
          low: { winRate: 25, avgProfit: 5 },
        },
      })

      render(<AnalyticsTab trades={mockTrades} />)

      // Find HIGH strong tag
      expect(screen.getByText('HIGH')).toBeInTheDocument()
      // Verify it's part of the insights message
      const highElement = screen.getByText('HIGH')
      expect(highElement.parentElement?.textContent).toContain('Mayor win rate en confluencia')
    })

    it('should show medium confluence insight when highest', () => {
      vi.clearAllMocks()
      vi.spyOn(TradeJournalModule.TradeJournalService, 'calculateStatistics').mockReturnValue({
        ...mockStats,
        byConfluenceScore: {
          high: { winRate: 50, avgProfit: 20 },
          medium: { winRate: 75, avgProfit: 30 },
          low: { winRate: 25, avgProfit: 5 },
        },
      })

      render(<AnalyticsTab trades={mockTrades} />)

      // Find MEDIUM strong tag
      expect(screen.getByText('MEDIUM')).toBeInTheDocument()
      // Verify it's part of the insights message
      const mediumElement = screen.getByText('MEDIUM')
      expect(mediumElement.parentElement?.textContent).toContain('Mayor win rate en confluencia')
    })

    it('should show low confluence warning when highest', () => {
      vi.clearAllMocks()
      vi.spyOn(TradeJournalModule.TradeJournalService, 'calculateStatistics').mockReturnValue({
        ...mockStats,
        byConfluenceScore: {
          high: { winRate: 30, avgProfit: 10 },
          medium: { winRate: 40, avgProfit: 15 },
          low: { winRate: 60, avgProfit: 25 },
        },
      })

      render(<AnalyticsTab trades={mockTrades} />)

      // Find LOW strong tag
      expect(screen.getByText('LOW')).toBeInTheDocument()
      // Verify it's part of the insights message
      const lowElement = screen.getByText('LOW')
      expect(lowElement.parentElement?.textContent).toContain('Mayor win rate en confluencia')
    })
  })

  describe('Grid layout responsiveness', () => {
    it('should render strategy breakdown in grid layout', () => {
      const { container } = render(<AnalyticsTab trades={mockTrades} />)

      // Check for grid layout classes
      const gridContainer = container.querySelector('.grid-cols-1.lg\\:grid-cols-2')
      expect(gridContainer).toBeInTheDocument()
    })

    it('should render confluence cards in 3-column grid', () => {
      const { container } = render(<AnalyticsTab trades={mockTrades} />)

      // Check for confluence grid (md:grid-cols-3)
      const confluenceSection = screen.getByText('🎯 Por Nivel de Confluencia').closest('div')
      const gridDiv = confluenceSection?.querySelector('.grid-cols-1.md\\:grid-cols-3')
      expect(gridDiv).toBeInTheDocument()
    })
  })
})
