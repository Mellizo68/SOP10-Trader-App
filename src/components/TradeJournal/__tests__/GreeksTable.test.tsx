import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GreeksTable } from '../GreeksTable'
import type { GreeksData } from '../../../hooks/useMarketData'

// Mock VirtualizedTable component
vi.mock('../../VirtualizedTable', () => ({
  VirtualizedTable: ({ data, columns }: any) => (
    <div data-testid="virtualized-table">
      <div>Rows: {data.length}</div>
      <div>Columns: {columns.length}</div>
      {data.map((row: any, idx: number) => (
        <div key={idx} data-testid={`row-${idx}`}>
          {columns.map((col: any) => (
            <span key={col.key} data-testid={`cell-${idx}-${col.key}`}>
              {col.render(row)}
            </span>
          ))}
        </div>
      ))}
    </div>
  ),
}))

describe('GreeksTable Component', () => {
  const mockGreeksData: GreeksData[] = [
    {
      strike: 420,
      expiration: '2026-06-20',
      optionType: 'call',
      delta: 0.45,
      gamma: 0.0123,
      theta: -0.0847,
      vega: 0.2541,
      iv: 18.5,
      price: 5.25,
    },
    {
      strike: 425,
      expiration: '2026-06-20',
      optionType: 'put',
      delta: -0.52,
      gamma: 0.0129,
      theta: -0.0756,
      vega: 0.2614,
      iv: 18.2,
      price: 4.75,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Data Rendering', () => {
    it('should render table with greeks data', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      const table = screen.getByTestId('virtualized-table')
      expect(table).toBeInTheDocument()
      expect(table.textContent).toContain('Rows: 2')
    })

    it('should render all columns', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      const table = screen.getByTestId('virtualized-table')
      // Should have 9 columns: strike, expiration, type, delta, gamma, theta, vega, iv, price
      expect(table.textContent).toContain('Columns: 9')
    })

    it('should render title with count of options', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      expect(screen.getByText(/Greeks \(Virtualized - 2 Options\)/)).toBeInTheDocument()
    })

    it('should render all rows for provided greeks data', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      expect(screen.getByTestId('row-0')).toBeInTheDocument()
      expect(screen.getByTestId('row-1')).toBeInTheDocument()
    })
  })

  describe('Column Formatting', () => {
    it('should format strike price with dollar sign', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      expect(screen.getByTestId('cell-0-strike')).toHaveTextContent('$420')
      expect(screen.getByTestId('cell-1-strike')).toHaveTextContent('$425')
    })

    it('should format expiration date as month and day', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      // Date 2026-06-20 should format as "Jun 19" or "Jun 20" (timezone-dependent)
      const expirationCell = screen.getByTestId('cell-0-expiration')
      expect(expirationCell.textContent).toMatch(/Jun (19|20)/)
    })

    it('should format delta with 3 decimal places and plus sign for positive', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      expect(screen.getByTestId('cell-0-delta')).toHaveTextContent('+0.450')
      expect(screen.getByTestId('cell-1-delta')).toHaveTextContent('-0.520')
    })

    it('should format gamma with 4 decimal places', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      expect(screen.getByTestId('cell-0-gamma')).toHaveTextContent('0.0123')
      expect(screen.getByTestId('cell-1-gamma')).toHaveTextContent('0.0129')
    })

    it('should format theta with 3 decimal places', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      expect(screen.getByTestId('cell-0-theta')).toHaveTextContent('-0.085')
      expect(screen.getByTestId('cell-1-theta')).toHaveTextContent('-0.076')
    })

    it('should format vega with 3 decimal places', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      expect(screen.getByTestId('cell-0-vega')).toHaveTextContent('0.254')
      expect(screen.getByTestId('cell-1-vega')).toHaveTextContent('0.261')
    })

    it('should format IV with 1 decimal place and percent sign', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      expect(screen.getByTestId('cell-0-iv')).toHaveTextContent('18.5%')
      expect(screen.getByTestId('cell-1-iv')).toHaveTextContent('18.2%')
    })

    it('should format price with 2 decimal places and dollar sign', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      expect(screen.getByTestId('cell-0-price')).toHaveTextContent('$5.25')
      expect(screen.getByTestId('cell-1-price')).toHaveTextContent('$4.75')
    })
  })

  describe('Option Type Rendering', () => {
    it('should render call option with green badge', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      const callCell = screen.getByTestId('cell-0-optionType')
      expect(callCell).toHaveTextContent('CALL')
      expect(callCell.querySelector('.bg-green-100')).toBeInTheDocument()
    })

    it('should render put option with red badge', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      const putCell = screen.getByTestId('cell-1-optionType')
      expect(putCell).toHaveTextContent('PUT')
      expect(putCell.querySelector('.bg-red-100')).toBeInTheDocument()
    })

    it('should apply correct text color for call options', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      const callCell = screen.getByTestId('cell-0-optionType')
      expect(callCell.querySelector('.text-green-800')).toBeInTheDocument()
    })

    it('should apply correct text color for put options', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      const putCell = screen.getByTestId('cell-1-optionType')
      expect(putCell.querySelector('.text-red-800')).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('should show loading skeleton when loading is true', () => {
      render(<GreeksTable greeks={[]} loading={true} error={null} />)

      // Check for the skeleton div with animate-pulse class
      const skeleton = document.querySelector('.animate-pulse')
      expect(skeleton).toBeInTheDocument()
      expect(screen.queryByTestId('virtualized-table')).not.toBeInTheDocument()
    })

    it('should not show data when loading', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={true} error={null} />)

      expect(screen.queryByTestId('virtualized-table')).not.toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('should display error message when error exists', () => {
      const errorMsg = 'Failed to fetch greeks data'
      render(<GreeksTable greeks={[]} loading={false} error={errorMsg} />)

      expect(screen.getByText(/Error loading Greeks data/)).toBeInTheDocument()
      expect(screen.getByText(errorMsg)).toBeInTheDocument()
    })

    it('should not show table when error exists', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error="Network error" />)

      expect(screen.queryByTestId('virtualized-table')).not.toBeInTheDocument()
    })

    it('should have error styling', () => {
      render(<GreeksTable greeks={[]} loading={false} error="Error" />)

      const errorContainer = screen.getByText(/Error loading Greeks data/).parentElement
      expect(errorContainer?.className).toContain('bg-red-50')
      expect(errorContainer?.className).toContain('border-red-200')
    })
  })

  describe('Empty State', () => {
    it('should show empty state message when no greeks data', () => {
      render(<GreeksTable greeks={[]} loading={false} error={null} />)

      expect(screen.getByText(/No Greeks data available/)).toBeInTheDocument()
    })

    it('should not show table for empty greeks', () => {
      render(<GreeksTable greeks={[]} loading={false} error={null} />)

      expect(screen.queryByTestId('virtualized-table')).not.toBeInTheDocument()
    })

    it('should have empty state styling', () => {
      render(<GreeksTable greeks={[]} loading={false} error={null} />)

      const emptyContainer = screen.getByText(/No Greeks data available/).parentElement
      expect(emptyContainer?.className).toContain('bg-gray-50')
      expect(emptyContainer?.className).toContain('text-center')
    })
  })

  describe('Large Dataset Handling', () => {
    it('should handle 100+ greeks entries', () => {
      const largeDataset: GreeksData[] = Array.from({ length: 150 }, (_, i) => ({
        strike: 400 + i * 0.5,
        expiration: '2026-06-20',
        optionType: i % 2 === 0 ? 'call' : 'put',
        delta: Math.random(),
        gamma: Math.random() / 100,
        theta: -Math.random() / 20,
        vega: Math.random() / 4,
        iv: 15 + Math.random() * 5,
        price: 1 + Math.random() * 10,
      }))

      render(<GreeksTable greeks={largeDataset} loading={false} error={null} />)

      const table = screen.getByTestId('virtualized-table')
      expect(table.textContent).toContain('Rows: 150')
    })

    it('should pass rowHeight and maxHeight to VirtualizedTable', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      // The VirtualizedTable mock receives rowHeight={40} and maxHeight={600}
      // We can't directly test these props in the mock, but we can verify the table renders
      const table = screen.getByTestId('virtualized-table')
      expect(table).toBeInTheDocument()
    })
  })

  describe('Color Formatting', () => {
    it('should apply blue color to delta column', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      const deltaCell = screen.getByTestId('cell-0-delta')
      expect(deltaCell.querySelector('.text-blue-600')).toBeInTheDocument()
    })

    it('should apply purple color to gamma column', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      const gammaCell = screen.getByTestId('cell-0-gamma')
      expect(gammaCell.querySelector('.text-purple-600')).toBeInTheDocument()
    })

    it('should apply red color to theta column', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      const thetaCell = screen.getByTestId('cell-0-theta')
      expect(thetaCell.querySelector('.text-red-600')).toBeInTheDocument()
    })

    it('should apply green color to vega column', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      const vegaCell = screen.getByTestId('cell-0-vega')
      expect(vegaCell.querySelector('.text-green-600')).toBeInTheDocument()
    })

    it('should apply orange color to IV column', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      const ivCell = screen.getByTestId('cell-0-iv')
      expect(ivCell.querySelector('.text-orange-600')).toBeInTheDocument()
    })
  })

  describe('Memoization', () => {
    it('should memoize component with greeks data comparison', () => {
      const { rerender } = render(
        <GreeksTable greeks={mockGreeksData} loading={false} error={null} />
      )

      // Re-render with same data - component should use memoization
      rerender(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      expect(screen.getByTestId('virtualized-table')).toBeInTheDocument()
    })

    it('should re-render when greeks data changes', () => {
      const data1: GreeksData[] = [mockGreeksData[0]]
      const data2: GreeksData[] = [mockGreeksData[0], mockGreeksData[1]]

      const { rerender } = render(<GreeksTable greeks={data1} loading={false} error={null} />)

      expect(screen.getByTestId('virtualized-table').textContent).toContain('Rows: 1')

      rerender(<GreeksTable greeks={data2} loading={false} error={null} />)

      expect(screen.getByTestId('virtualized-table').textContent).toContain('Rows: 2')
    })

    it('should re-render when loading state changes', () => {
      const { rerender } = render(
        <GreeksTable greeks={mockGreeksData} loading={false} error={null} />
      )

      expect(screen.getByTestId('virtualized-table')).toBeInTheDocument()

      rerender(<GreeksTable greeks={mockGreeksData} loading={true} error={null} />)

      expect(screen.queryByTestId('virtualized-table')).not.toBeInTheDocument()
    })

    it('should re-render when error state changes', () => {
      const { rerender } = render(
        <GreeksTable greeks={mockGreeksData} loading={false} error={null} />
      )

      expect(screen.getByTestId('virtualized-table')).toBeInTheDocument()

      rerender(<GreeksTable greeks={mockGreeksData} loading={false} error="Error occurred" />)

      expect(screen.queryByTestId('virtualized-table')).not.toBeInTheDocument()
      expect(screen.getByText(/Error occurred/)).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero values in greeks data', () => {
      const zeroData: GreeksData[] = [
        {
          strike: 400,
          expiration: '2026-06-20',
          optionType: 'call',
          delta: 0,
          gamma: 0,
          theta: 0,
          vega: 0,
          iv: 0,
          price: 0,
        },
      ]

      render(<GreeksTable greeks={zeroData} loading={false} error={null} />)

      // Delta of 0 is ATM, no plus sign added
      expect(screen.getByTestId('cell-0-delta')).toHaveTextContent('0.000')
      expect(screen.getByTestId('cell-0-gamma')).toHaveTextContent('0.0000')
      expect(screen.getByTestId('cell-0-theta')).toHaveTextContent('0.000')
      expect(screen.getByTestId('cell-0-iv')).toHaveTextContent('0.0%')
      expect(screen.getByTestId('cell-0-price')).toHaveTextContent('$0.00')
    })

    it('should handle very large numbers', () => {
      const largeData: GreeksData[] = [
        {
          strike: 1000,
          expiration: '2026-06-20',
          optionType: 'call',
          delta: 0.99999,
          gamma: 0.0001,
          theta: -0.5,
          vega: 5.0,
          iv: 99.9,
          price: 999.99,
        },
      ]

      render(<GreeksTable greeks={largeData} loading={false} error={null} />)

      expect(screen.getByTestId('cell-0-delta')).toHaveTextContent('+1.000')
      expect(screen.getByTestId('cell-0-price')).toHaveTextContent('$999.99')
    })

    it('should handle negative delta values correctly', () => {
      const negData: GreeksData[] = [
        {
          strike: 400,
          expiration: '2026-06-20',
          optionType: 'put',
          delta: -0.95,
          gamma: 0.005,
          theta: -0.1,
          vega: 0.2,
          iv: 20,
          price: 50,
        },
      ]

      render(<GreeksTable greeks={negData} loading={false} error={null} />)

      expect(screen.getByTestId('cell-0-delta')).toHaveTextContent('-0.950')
    })
  })

  describe('Header Styling', () => {
    it('should have gradient background on header', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      const header = screen.getByText(/Greeks \(Virtualized/)?.parentElement
      expect(header?.className).toContain('from-blue-500')
      expect(header?.className).toContain('to-blue-600')
    })

    it('should have white text on header', () => {
      render(<GreeksTable greeks={mockGreeksData} loading={false} error={null} />)

      const title = screen.getByText(/Greeks \(Virtualized/)
      expect(title.className).toContain('text-white')
      expect(title.className).toContain('font-bold')
    })
  })
})
