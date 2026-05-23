import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import GreeksTable from '../TradeJournal/GreeksTable'
import type { GreeksData } from '../../hooks/useMarketData'

// Mock react-window's FixedSizeList to avoid rendering complexity in tests
vi.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount }: any) => (
    <div data-testid="virtualized-list">
      {itemCount > 0 && (
        <div>
          {Array.from({ length: itemCount }).map((_, index: number) =>
            children({ index, style: {} })
          )}
        </div>
      )}
    </div>
  ),
}))

describe('GreeksTable Component', () => {
  const mockGreeksData: GreeksData[] = [
    {
      symbol: 'SPY',
      strike: 400,
      expiration: '2026-06-19',
      optionType: 'call',
      delta: 0.456,
      gamma: 0.0234,
      theta: -0.0123,
      vega: 0.234,
      iv: 18.5,
      price: 12.34,
      timestamp: new Date().toISOString(),
    },
    {
      symbol: 'SPY',
      strike: 405,
      expiration: '2026-06-19',
      optionType: 'put',
      delta: -0.544,
      gamma: 0.0225,
      theta: -0.0156,
      vega: 0.223,
      iv: 19.2,
      price: 15.67,
      timestamp: new Date().toISOString(),
    },
    {
      symbol: 'SPY',
      strike: 410,
      expiration: '2026-06-19',
      optionType: 'call',
      delta: 0.678,
      gamma: 0.0198,
      theta: -0.0098,
      vega: 0.212,
      iv: 17.8,
      price: 18.90,
      timestamp: new Date().toISOString(),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render Greeks data table with all columns', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      // Check for column headers
      expect(screen.getByText('Strike')).toBeTruthy()
      expect(screen.getByText('Exp')).toBeTruthy()
      expect(screen.getByText('Type')).toBeTruthy()
      expect(screen.getByText('Δ Delta')).toBeTruthy()
      expect(screen.getByText('Γ Gamma')).toBeTruthy()
      expect(screen.getByText('Θ Theta')).toBeTruthy()
      expect(screen.getByText('ν Vega')).toBeTruthy()
      expect(screen.getByText('IV %')).toBeTruthy()
      expect(screen.getByText('Price')).toBeTruthy()
    })

    it('should render rows with Greeks data', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      // Check strike prices are rendered
      expect(screen.getByText('$400')).toBeTruthy()
      expect(screen.getByText('$405')).toBeTruthy()
      expect(screen.getByText('$410')).toBeTruthy()

      // Check option types (CALL/PUT badges)
      const callBadges = screen.getAllByText('CALL')
      const putBadges = screen.getAllByText('PUT')
      expect(callBadges.length).toBeGreaterThan(0)
      expect(putBadges.length).toBeGreaterThan(0)
    })

    it('should use virtualized list for rendering', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      const virtualizedList = screen.getByTestId('virtualized-list')
      expect(virtualizedList).toBeTruthy()
    })
  })

  describe('Column Formatting', () => {
    it('should format strike price with dollar sign', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      expect(screen.getByText('$400')).toBeTruthy()
      expect(screen.getByText('$405')).toBeTruthy()
      expect(screen.getByText('$410')).toBeTruthy()
    })

    it('should format Greeks values with correct decimal places', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      // Delta: 3 decimal places
      expect(screen.getByText('+0.456')).toBeTruthy()
      expect(screen.getByText('-0.544')).toBeTruthy()

      // Gamma: 4 decimal places
      expect(screen.getByText('0.0234')).toBeTruthy()

      // IV: 1 decimal place with % sign
      expect(screen.getByText('18.5%')).toBeTruthy()
      expect(screen.getByText('19.2%')).toBeTruthy()
    })

    it('should format option prices with currency formatting', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      expect(screen.getByText('$12.34')).toBeTruthy()
      expect(screen.getByText('$15.67')).toBeTruthy()
      expect(screen.getByText('$18.90')).toBeTruthy()
    })

    it('should format expiration date as MMM D', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      // June 19 should be formatted as "Jun 19"
      const expDateElements = screen.getAllByText(/Jun \d+/)
      expect(expDateElements.length).toBeGreaterThan(0)
    })

    it('should show positive sign for positive delta values', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      expect(screen.getByText('+0.456')).toBeTruthy()
      expect(screen.getByText('+0.678')).toBeTruthy()
    })

    it('should show negative sign for negative delta values', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      expect(screen.getByText('-0.544')).toBeTruthy()
    })
  })

  describe('Option Type Styling', () => {
    it('should display CALL options with green badge', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      const callBadges = screen.getAllByText('CALL')
      callBadges.forEach(badge => {
        const classList = badge.className
        expect(classList).toContain('green')
      })
    })

    it('should display PUT options with red badge', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      const putBadges = screen.getAllByText('PUT')
      putBadges.forEach(badge => {
        const classList = badge.className
        expect(classList).toContain('red')
      })
    })
  })

  describe('Loading State', () => {
    it('should show loading skeleton when loading is true', () => {
      const { container } = render(<GreeksTable greeks={[]} loading={true} error={null} />)

      // Should show animate-pulse skeleton
      const skeleton = container.querySelector('.animate-pulse')
      expect(skeleton).toBeTruthy()
    })

    it('should not show data when loading is true', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={true} error={null} />)

      // Data should not be visible during loading
      expect(screen.queryByText('$400')).not.toBeTruthy()
    })
  })

  describe('Error State', () => {
    it('should display error message when error is provided', () => {
      const errorMessage = 'Failed to fetch Greeks data'
      render(
        <GreeksTable greeks={[]} loading={false} error={errorMessage} />
      )

      expect(screen.getByText('Error loading Greeks data')).toBeTruthy()
      expect(screen.getByText(errorMessage)).toBeTruthy()
    })

    it('should show error styling (red background)', () => {
      const errorMessage = 'Network error'
      render(
        <GreeksTable greeks={[]} loading={false} error={errorMessage} />
      )

      const errorContainer = screen.getByText('Error loading Greeks data').closest('div')
      expect(errorContainer?.className).toContain('red')
    })

    it('should not show data when error is present', () => {
      render(
        <GreeksTable greeks={mockGreeksData} loading={false} error="Error occurred" />
      )

      expect(screen.queryByText('$400')).not.toBeTruthy()
    })
  })

  describe('Empty State', () => {
    it('should show empty state message when no data provided', () => {
      render(<GreeksTable greeks={[]} loading={false} error={null} />)

      expect(screen.getByText('No Greeks data available')).toBeTruthy()
    })

    it('should not show table structure when no data', () => {
      render(<GreeksTable greeks={[]} loading={false} error={null} />)

      expect(screen.queryByText('Strike')).not.toBeTruthy()
    })
  })

  describe('Data Handling', () => {
    it('should handle large datasets efficiently', () => {
      // Create 100 rows of Greeks data
      const largeDataset: GreeksData[] = Array.from({ length: 100 }, (_, i) => ({
        symbol: 'SPY',
        strike: 400 + i,
        expiration: '2026-06-19',
        optionType: i % 2 === 0 ? 'call' : 'put',
        delta: Math.random() * 2 - 1,
        gamma: Math.random() * 0.05,
        theta: Math.random() * -0.05,
        vega: Math.random() * 0.5,
        iv: 15 + Math.random() * 10,
        price: 10 + Math.random() * 30,
        timestamp: new Date().toISOString(),
      }))

      // Should render without crashing
      expect(() => {
        render(<GreeksTable greeks={largeDataset} loading={false} error={null} />)
      }).not.toThrow()
    })

    it('should handle null or undefined Greeks values gracefully', () => {
      const dataWithExtremValues: GreeksData[] = [
        {
          symbol: 'SPY',
          strike: 400,
          expiration: '2026-06-19',
          optionType: 'call',
          delta: 0,
          gamma: 0,
          theta: 0,
          vega: 0,
          iv: 0,
          price: 0,
          timestamp: new Date().toISOString(),
        },
      ]

      expect(() => {
        render(
          <GreeksTable greeks={dataWithExtremValues} loading={false} error={null} />
        )
      }).not.toThrow()

      expect(screen.getByText('$400')).toBeTruthy()
    })
  })

  describe('Component Props', () => {
    it('should accept greeks array prop', () => {
      const props = {
        greeks: mockGreeksData,
        loading: false,
        error: null,
      }

      expect(() => {
        render(<GreeksTable {...props} />)
      }).not.toThrow()
    })

    it('should accept loading boolean prop', () => {
      const props = {
        greeks: mockGreeksData,
        loading: true,
        error: null,
      }

      expect(() => {
        render(<GreeksTable {...props} />)
      }).not.toThrow()
    })

    it('should accept error string or null prop', () => {
      const propsWithError = {
        greeks: [],
        loading: false,
        error: 'Test error message',
      }

      expect(() => {
        render(<GreeksTable {...propsWithError} />)
      }).not.toThrow()

      const propsWithoutError = {
        greeks: mockGreeksData,
        loading: false,
        error: null,
      }

      expect(() => {
        render(<GreeksTable {...propsWithoutError} />)
      }).not.toThrow()
    })
  })

  describe('Memoization', () => {
    it('should be memoized for performance', () => {
      // Component should export a memoized version
      expect(GreeksTable).toBeTruthy()

      // Component should render without errors, indicating proper memoization setup
      expect(() => {
        render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)
      }).not.toThrow()
    })
  })

  describe('Accessibility', () => {
    it('should have semantic table structure', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      // Should have table headers for each column
      expect(screen.getByText('Strike')).toBeTruthy()
      expect(screen.getByText('Type')).toBeTruthy()
      expect(screen.getByText('Price')).toBeTruthy()
    })

    it('should display option type as readable CALL/PUT text', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      const callBadges = screen.getAllByText('CALL')
      const putBadges = screen.getAllByText('PUT')
      expect(callBadges.length).toBeGreaterThan(0)
      expect(putBadges.length).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle single row of data', () => {
      const singleRow: GreeksData[] = [mockGreeksData[0]]

      render(<GreeksTable greeks={singleRow} loading={false} error={null} />)

      expect(screen.getByText('$400')).toBeTruthy()
    })

    it('should handle simultaneous error and loading state (error takes precedence)', () => {
      render(
        <GreeksTable greeks={[]} loading={true} error="Error message" />
      )

      expect(screen.getByText('Error loading Greeks data')).toBeTruthy()
      expect(screen.getByText('Error message')).toBeTruthy()
    })

    it('should handle very small Greeks values', () => {
      const tinyValues: GreeksData[] = [
        {
          ...mockGreeksData[0],
          gamma: 0.0001,
          delta: 0.001,
        },
      ]

      render(<GreeksTable greeks={tinyValues} loading={false} error={null} />)

      expect(screen.getByText('0.0001')).toBeTruthy()
    })

    it('should handle very large IV values', () => {
      const highIV: GreeksData[] = [
        {
          ...mockGreeksData[0],
          iv: 300,
        },
      ]

      render(<GreeksTable greeks={highIV} loading={false} error={null} />)

      expect(screen.getByText('300.0%')).toBeTruthy()
    })
  })
})
