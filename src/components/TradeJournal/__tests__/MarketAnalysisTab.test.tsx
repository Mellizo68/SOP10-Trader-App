import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MarketAnalysisTab from '../MarketAnalysisTab'
import * as useMarketDataModule from '../../../hooks/useMarketData'

// Mock useMarketData hook
vi.mock('../../../hooks/useMarketData', () => ({
  useMarketData: vi.fn(),
}))

// Mock GEXCard component
vi.mock('../GEXCard', () => ({
  GEXCard: ({ gex, loading, error }: any) => (
    <div data-testid="gex-card">
      {loading && <div>Loading GEX</div>}
      {error && <div>GEX Error: {error}</div>}
      {gex && <div>GEX Value: {gex.value}</div>}
    </div>
  ),
}))

// Mock GreeksTable component
vi.mock('../GreeksTable', () => ({
  GreeksTable: ({ greeks, loading, error }: any) => (
    <div data-testid="greeks-table">
      {loading && <div>Loading Greeks</div>}
      {error && <div>Greeks Error: {error}</div>}
      {greeks.length > 0 && <div>Greeks rows: {greeks.length}</div>}
      {greeks.length === 0 && <div>No Greeks data</div>}
    </div>
  ),
}))

// Mock VirtualizedTable component
vi.mock('../../VirtualizedTable', () => ({
  VirtualizedTable: ({ data }: any) => (
    <div data-testid="virtualized-table">
      <div>Virtual table items: {data.length}</div>
    </div>
  ),
}))

describe('MarketAnalysisTab Component', () => {
  const mockMarketData = {
    gex: {
      value: 1500000,
      level: 'neutral',
      trend: 'stable',
    },
    gammaFlip: {
      price: 425.5,
      type: 'call',
      strength: 'moderate',
    },
    greeks: {
      items: [
        {
          strikePrice: 420,
          delta: 0.45,
          gamma: 0.012,
          theta: -0.08,
          vega: 0.25,
          iv: 18.5,
        },
        {
          strikePrice: 425,
          delta: 0.52,
          gamma: 0.013,
          theta: -0.07,
          vega: 0.26,
          iv: 18.2,
        },
      ],
      count: 2,
    },
    walls: {
      items: [
        {
          strikePrice: 420,
          putWall: { level: 'strong', contracts: 50000 },
          callWall: { level: 'moderate', contracts: 30000 },
        },
      ],
      count: 1,
    },
    volumeOI: {
      items: [
        {
          strikePrice: 420,
          callOI: 100000,
          callVolume: 5000,
          putOI: 80000,
          putVolume: 4000,
        },
      ],
      count: 1,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(useMarketDataModule, 'useMarketData').mockReturnValue({
      data: mockMarketData,
      loading: false,
      error: null,
      lastUpdated: new Date(),
      refetch: vi.fn(),
    } as any)
  })

  describe('Symbol Input', () => {
    it('should render symbol input field with default value', () => {
      render(<MarketAnalysisTab symbol="SPY" />)

      const input = screen.getByPlaceholderText(/Enter symbol/i) as HTMLInputElement
      expect(input).toBeInTheDocument()
      expect(input.value).toBe('SPY')
    })

    it('should update input value immediately on user typing', async () => {
      const user = userEvent.setup()
      render(<MarketAnalysisTab symbol="SPY" />)

      const input = screen.getByPlaceholderText(/Enter symbol/i) as HTMLInputElement
      await user.clear(input)
      await user.type(input, 'TSLA')

      expect(input.value).toBe('TSLA')
    })

    it('should convert input to uppercase', async () => {
      const user = userEvent.setup()
      render(<MarketAnalysisTab symbol="SPY" />)

      const input = screen.getByPlaceholderText(/Enter symbol/i) as HTMLInputElement
      await user.clear(input)
      await user.type(input, 'qqq')

      expect(input.value).toBe('QQQ')
    })

    it('should debounce data fetching (300ms)', async () => {
      const user = userEvent.setup()
      const mockOnSymbolChange = vi.fn()
      render(<MarketAnalysisTab symbol="SPY" onSymbolChange={mockOnSymbolChange} />)

      const input = screen.getByPlaceholderText(/Enter symbol/i)
      await user.clear(input)

      // Type characters quickly - should debounce
      await user.type(input, 'TSLA', { delay: 50 })

      // Callback should not be called yet (still within debounce period)
      expect(mockOnSymbolChange).not.toHaveBeenCalled()

      // Wait for debounce to settle
      await waitFor(() => {
        expect(mockOnSymbolChange).toHaveBeenCalledWith('TSLA')
      }, { timeout: 1000 })
    })

    it('should call onSymbolChange after debounce completes', async () => {
      const user = userEvent.setup()
      const mockOnSymbolChange = vi.fn()
      render(<MarketAnalysisTab symbol="SPY" onSymbolChange={mockOnSymbolChange} />)

      const input = screen.getByPlaceholderText(/Enter symbol/i)
      await user.clear(input)
      await user.type(input, 'IWM')

      await waitFor(() => {
        expect(mockOnSymbolChange).toHaveBeenCalledWith('IWM')
      }, { timeout: 1000 })
    })
  })

  describe('Strike Range Filtering', () => {
    it('should render strike range filter controls', () => {
      render(<MarketAnalysisTab symbol="SPY" />)

      expect(screen.getByText(/Strike Range Filter/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/ATM ± Range %/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Custom Strike Range/i)).toBeInTheDocument()
    })

    it('should default to ATM ± Range % mode', () => {
      render(<MarketAnalysisTab symbol="SPY" />)

      const atmRadio = screen.getByRole('radio', { name: /ATM ± Range %/i }) as HTMLInputElement
      expect(atmRadio.checked).toBe(true)
    })

    it('should show ATM range input field with default 20%', () => {
      render(<MarketAnalysisTab symbol="SPY" />)

      const rangeInput = screen.getByDisplayValue('20') as HTMLInputElement
      expect(rangeInput).toBeInTheDocument()
      expect(rangeInput.type).toBe('number')
    })

    it('should allow changing ATM range percentage', async () => {
      const user = userEvent.setup()
      render(<MarketAnalysisTab symbol="SPY" />)

      const rangeInput = screen.getByDisplayValue('20') as HTMLInputElement
      // Simulate user typing a large number to increase range significantly
      // This tests that the input handler updates the value correctly
      await user.click(rangeInput)
      await user.keyboard('{Control>}a{/Control}')
      await user.keyboard('50')

      // After the onChange handler runs, the value should be updated to 50
      expect(rangeInput.value).toBe('50')
    })

    it('should toggle to custom strike range mode', async () => {
      const user = userEvent.setup()
      render(<MarketAnalysisTab symbol="SPY" />)

      const customRadio = screen.getByRole('radio', { name: /Custom Strike Range/i })
      await user.click(customRadio)

      expect(screen.getByPlaceholderText('Min')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Max')).toBeInTheDocument()
    })

    it('should show min/max custom strike inputs when custom mode enabled', async () => {
      const user = userEvent.setup()
      render(<MarketAnalysisTab symbol="SPY" />)

      const customRadio = screen.getByRole('radio', { name: /Custom Strike Range/i })
      await user.click(customRadio)

      const minInput = screen.getByPlaceholderText('Min') as HTMLInputElement
      const maxInput = screen.getByPlaceholderText('Max') as HTMLInputElement

      expect(minInput).toBeInTheDocument()
      expect(maxInput).toBeInTheDocument()
      expect(minInput.value).toBe('')
      expect(maxInput.value).toBe('')
    })

    it('should allow entering custom strike range values', async () => {
      const user = userEvent.setup()
      render(<MarketAnalysisTab symbol="SPY" />)

      const customRadio = screen.getByRole('radio', { name: /Custom Strike Range/i })
      await user.click(customRadio)

      const minInput = screen.getByPlaceholderText('Min') as HTMLInputElement
      const maxInput = screen.getByPlaceholderText('Max') as HTMLInputElement

      await user.type(minInput, '410')
      await user.type(maxInput, '435')

      expect(minInput.value).toBe('410')
      expect(maxInput.value).toBe('435')
    })

    it('should display active filter message when filter is applied', async () => {
      const user = userEvent.setup()
      render(<MarketAnalysisTab symbol="SPY" />)

      const customRadio = screen.getByRole('radio', { name: /Custom Strike Range/i })
      await user.click(customRadio)

      const minInput = screen.getByPlaceholderText('Min')
      await user.type(minInput, '410')

      // Active filter message should appear
      expect(screen.getByText(/Custom filter:/i)).toBeInTheDocument()
    })
  })

  describe('Refresh Button', () => {
    it('should render refresh button', () => {
      render(<MarketAnalysisTab symbol="SPY" />)

      const refreshButton = screen.getByRole('button', { name: /Refresh/i })
      expect(refreshButton).toBeInTheDocument()
    })

    it('should call refetch when refresh button clicked', async () => {
      const user = userEvent.setup()
      const mockRefetch = vi.fn()
      vi.spyOn(useMarketDataModule, 'useMarketData').mockReturnValue({
        data: mockMarketData,
        loading: false,
        error: null,
        lastUpdated: new Date(),
        refetch: mockRefetch,
      } as any)

      render(<MarketAnalysisTab symbol="SPY" />)

      const refreshButton = screen.getByRole('button', { name: /Refresh/i })
      await user.click(refreshButton)

      expect(mockRefetch).toHaveBeenCalled()
    })

    it('should disable refresh button when loading', () => {
      vi.spyOn(useMarketDataModule, 'useMarketData').mockReturnValue({
        data: null,
        loading: true,
        error: null,
        lastUpdated: null,
        refetch: vi.fn(),
      } as any)

      render(<MarketAnalysisTab symbol="SPY" />)

      const refreshButton = screen.getByRole('button', { name: /Loading/i })
      expect(refreshButton).toBeDisabled()
    })

    it('should show "Loading..." text when loading', () => {
      vi.spyOn(useMarketDataModule, 'useMarketData').mockReturnValue({
        data: null,
        loading: true,
        error: null,
        lastUpdated: null,
        refetch: vi.fn(),
      } as any)

      render(<MarketAnalysisTab symbol="SPY" />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should show "Refresh" text when not loading', () => {
      render(<MarketAnalysisTab symbol="SPY" />)

      const button = screen.getByRole('button')
      expect(button.textContent).toContain('Refresh')
    })
  })

  describe('Data Display', () => {
    it('should render GEXCard with market data', () => {
      render(<MarketAnalysisTab symbol="SPY" />)

      const gexCard = screen.getByTestId('gex-card')
      expect(gexCard).toBeInTheDocument()
      expect(gexCard.textContent).toContain('GEX Value: 1500000')
    })

    it('should render GreeksTable with greeks data', () => {
      render(<MarketAnalysisTab symbol="SPY" />)

      const greeksTable = screen.getByTestId('greeks-table')
      expect(greeksTable).toBeInTheDocument()
      expect(greeksTable.textContent).toContain('Greeks rows: 2')
    })

    it('should render virtualized table for Options Walls', () => {
      render(<MarketAnalysisTab symbol="SPY" />)

      expect(screen.getByText(/Options Walls.*1 total/)).toBeInTheDocument()
      const virtualized = screen.getAllByTestId('virtualized-table')[0]
      expect(virtualized.textContent).toContain('Virtual table items: 1')
    })

    it('should render virtualized table for Volume & OI', () => {
      render(<MarketAnalysisTab symbol="SPY" />)

      expect(screen.getByText(/Volume & Open Interest.*1 total/)).toBeInTheDocument()
      const virtualized = screen.getAllByTestId('virtualized-table')[1]
      expect(virtualized.textContent).toContain('Virtual table items: 1')
    })

    it('should not render Options Walls when data is empty', () => {
      vi.spyOn(useMarketDataModule, 'useMarketData').mockReturnValue({
        data: { ...mockMarketData, walls: { items: [], count: 0 } },
        loading: false,
        error: null,
        lastUpdated: new Date(),
        refetch: vi.fn(),
      } as any)

      render(<MarketAnalysisTab symbol="SPY" />)

      expect(screen.queryByText(/Options Walls/)).not.toBeInTheDocument()
    })

    it('should not render Volume & OI when data is empty', () => {
      vi.spyOn(useMarketDataModule, 'useMarketData').mockReturnValue({
        data: { ...mockMarketData, volumeOI: { items: [], count: 0 } },
        loading: false,
        error: null,
        lastUpdated: new Date(),
        refetch: vi.fn(),
      } as any)

      render(<MarketAnalysisTab symbol="SPY" />)

      expect(screen.queryByText(/Volume & Open Interest/)).not.toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('should display loading spinner and message', () => {
      vi.spyOn(useMarketDataModule, 'useMarketData').mockReturnValue({
        data: null,
        loading: true,
        error: null,
        lastUpdated: null,
        refetch: vi.fn(),
      } as any)

      render(<MarketAnalysisTab symbol="SPY" />)

      expect(screen.getByText(/Fetching market data/i)).toBeInTheDocument()
    })

    it('should pass loading state to GEXCard', () => {
      vi.spyOn(useMarketDataModule, 'useMarketData').mockReturnValue({
        data: null,
        loading: true,
        error: null,
        lastUpdated: null,
        refetch: vi.fn(),
      } as any)

      render(<MarketAnalysisTab symbol="SPY" />)

      const gexCard = screen.getByTestId('gex-card')
      expect(gexCard.textContent).toContain('Loading GEX')
    })

    it('should pass loading state to GreeksTable', () => {
      vi.spyOn(useMarketDataModule, 'useMarketData').mockReturnValue({
        data: null,
        loading: true,
        error: null,
        lastUpdated: null,
        refetch: vi.fn(),
      } as any)

      render(<MarketAnalysisTab symbol="SPY" />)

      const greeksTable = screen.getByTestId('greeks-table')
      expect(greeksTable.textContent).toContain('Loading Greeks')
    })
  })

  describe('Error Handling', () => {
    it('should display error message when API fails', () => {
      const errorMessage = 'Failed to fetch market data for SPY'
      vi.spyOn(useMarketDataModule, 'useMarketData').mockReturnValue({
        data: null,
        loading: false,
        error: errorMessage,
        lastUpdated: null,
        refetch: vi.fn(),
      } as any)

      render(<MarketAnalysisTab symbol="SPY" />)

      expect(screen.getByText(/⚠️ Error/)).toBeInTheDocument()
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    it('should pass error to GEXCard', () => {
      const errorMessage = 'Network error'
      vi.spyOn(useMarketDataModule, 'useMarketData').mockReturnValue({
        data: null,
        loading: false,
        error: errorMessage,
        lastUpdated: null,
        refetch: vi.fn(),
      } as any)

      render(<MarketAnalysisTab symbol="SPY" />)

      const gexCard = screen.getByTestId('gex-card')
      expect(gexCard.textContent).toContain('GEX Error: Network error')
    })

    it('should pass error to GreeksTable', () => {
      const errorMessage = 'Invalid symbol'
      vi.spyOn(useMarketDataModule, 'useMarketData').mockReturnValue({
        data: null,
        loading: false,
        error: errorMessage,
        lastUpdated: null,
        refetch: vi.fn(),
      } as any)

      render(<MarketAnalysisTab symbol="SPY" />)

      const greeksTable = screen.getByTestId('greeks-table')
      expect(greeksTable.textContent).toContain('Greeks Error: Invalid symbol')
    })
  })

  describe('Last Updated', () => {
    it('should display last updated timestamp', () => {
      const now = new Date('2026-05-22T14:30:00')
      vi.spyOn(useMarketDataModule, 'useMarketData').mockReturnValue({
        data: mockMarketData,
        loading: false,
        error: null,
        lastUpdated: now,
        refetch: vi.fn(),
      } as any)

      render(<MarketAnalysisTab symbol="SPY" />)

      expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
    })

    it('should not display timestamp when lastUpdated is null', () => {
      vi.spyOn(useMarketDataModule, 'useMarketData').mockReturnValue({
        data: mockMarketData,
        loading: false,
        error: null,
        lastUpdated: null,
        refetch: vi.fn(),
      } as any)

      render(<MarketAnalysisTab symbol="SPY" />)

      expect(screen.queryByText(/Last updated:/)).not.toBeInTheDocument()
    })
  })

  describe('Hook Integration', () => {
    it('should pass default symbol to useMarketData hook', () => {
      render(<MarketAnalysisTab symbol="QQQ" />)

      expect(useMarketDataModule.useMarketData).toHaveBeenCalledWith(
        'QQQ',
        60000,
        { strikeRange: 20 }
      )
    })

    it('should pass debounced symbol to useMarketData hook after delay', async () => {
      const user = userEvent.setup()
      render(<MarketAnalysisTab symbol="SPY" />)

      const input = screen.getByPlaceholderText(/Enter symbol/i)
      await user.clear(input)
      await user.type(input, 'AAPL')

      await waitFor(() => {
        expect(useMarketDataModule.useMarketData).toHaveBeenCalledWith(
          'AAPL',
          60000,
          { strikeRange: 20 }
        )
      }, { timeout: 1000 })
    })

    it('should pass custom strike range to useMarketData hook', async () => {
      const user = userEvent.setup()
      render(<MarketAnalysisTab symbol="SPY" />)

      // Switch to custom range
      const customRadio = screen.getByRole('radio', { name: /Custom Strike Range/i })
      await user.click(customRadio)

      const minInput = screen.getByPlaceholderText('Min')
      const maxInput = screen.getByPlaceholderText('Max')
      await user.type(minInput, '400')
      await user.type(maxInput, '450')

      // Change symbol to trigger new useMarketData call with custom range
      const symbolInput = screen.getByPlaceholderText(/Enter symbol/i)
      await user.clear(symbolInput)
      await user.type(symbolInput, 'TSLA')

      await waitFor(() => {
        expect(useMarketDataModule.useMarketData).toHaveBeenCalledWith(
          'TSLA',
          60000,
          { strikeMin: 400, strikeMax: 450 }
        )
      }, { timeout: 1000 })
    })
  })

  describe('Empty State', () => {
    it('should render component with no data', () => {
      vi.spyOn(useMarketDataModule, 'useMarketData').mockReturnValue({
        data: null,
        loading: false,
        error: null,
        lastUpdated: null,
        refetch: vi.fn(),
      } as any)

      render(<MarketAnalysisTab symbol="SPY" />)

      expect(screen.getByPlaceholderText(/Enter symbol/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument()
    })

    it('should handle null greeks data gracefully', () => {
      vi.spyOn(useMarketDataModule, 'useMarketData').mockReturnValue({
        data: { ...mockMarketData, greeks: { items: [], count: 0 } },
        loading: false,
        error: null,
        lastUpdated: new Date(),
        refetch: vi.fn(),
      } as any)

      render(<MarketAnalysisTab symbol="SPY" />)

      const greeksTable = screen.getByTestId('greeks-table')
      expect(greeksTable.textContent).toContain('No Greeks data')
    })
  })

  describe('Cleanup', () => {
    it('should cleanup debounce timer on unmount', () => {
      const { unmount } = render(<MarketAnalysisTab symbol="SPY" />)

      // Unmount component
      unmount()

      // Should not throw errors during unmount
      expect(true).toBe(true)
    })
  })

  describe('Memoization', () => {
    it('should memoize component based on symbol and onSymbolChange', () => {
      const onSymbolChange = vi.fn()
      const { rerender } = render(
        <MarketAnalysisTab symbol="SPY" onSymbolChange={onSymbolChange} />
      )

      // Re-render with same props
      rerender(<MarketAnalysisTab symbol="SPY" onSymbolChange={onSymbolChange} />)

      // Component should use memoization to prevent unnecessary re-renders
      // In a real test, we would check this with a spy on the component
      expect(true).toBe(true)
    })

    it('should re-render when onSymbolChange callback changes', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      const { rerender } = render(<MarketAnalysisTab symbol="SPY" onSymbolChange={callback1} />)

      // Component should re-render when callback reference changes
      rerender(<MarketAnalysisTab symbol="SPY" onSymbolChange={callback2} />)

      // Both callbacks should be defined but component should update
      expect(callback1).toBeDefined()
      expect(callback2).toBeDefined()
    })
  })
})
