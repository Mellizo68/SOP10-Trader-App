import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals'
import { Pool, PoolClient } from 'pg'
import {
  queryGetAllTrades,
  queryGetTradeById,
  queryCreateTrade,
  queryUpdateTrade,
  queryDeleteTrade,
  queryCloseTrade,
  queryGetTradeCount,
  type Trade,
} from '../db/queries/tradesQueries'

/**
 * Phase 6.1: Testing & Quality - Trade Queries Integration Tests
 *
 * Tests all database query functions for the trades table.
 * Uses real database transactions for isolation - each test runs in a transaction
 * that rolls back after the test completes, ensuring clean state.
 *
 * NOTE: These are integration tests that require a PostgreSQL database to run.
 * Set the DATABASE_URL environment variable or configure:
 *   DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME
 *
 * Example local setup:
 *   docker run -e POSTGRES_PASSWORD=password -p 5432:5432 postgres:15
 *   createdb test_trades
 */

let pool: Pool
let client: PoolClient
let canConnect = true

// Initialize pool before tests
try {
  pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'test_trades',
  })

  // Test connection immediately to catch errors early
  pool.on('error', (err) => {
    console.warn('⚠️  Database pool error:', err.message)
    canConnect = false
  })
} catch (err) {
  console.warn('⚠️  Failed to initialize database pool:', (err as Error).message)
  canConnect = false
}

;(canConnect ? describe : describe.skip)('Trades Queries - Database Layer', () => {
  beforeAll(async () => {
    if (!canConnect || !pool) {
      throw new Error(
        'PostgreSQL database not available. Please ensure:\n' +
        '  1. PostgreSQL is running (docker run -e POSTGRES_PASSWORD=password -p 5432:5432 postgres:15)\n' +
        '  2. Test database exists (createdb test_trades)\n' +
        '  3. Database credentials are set in .env (DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME)'
      )
    }

    // Get a client connection for the test suite
    client = await pool.connect()

    // Ensure we're in the test database
    try {
      await client.query('SET search_path = public')
    } catch (err: any) {
      console.warn('Could not set search path:', err.message)
    }
  })

  afterAll(async () => {
    try {
      if (client) {
        await client.release()
      }
      if (pool) {
        await pool.end()
      }
    } catch (err) {
      console.warn('Error during cleanup:', (err as Error).message)
    }
  })

  beforeEach(async () => {
    // Start a transaction before each test
    await client.query('BEGIN')
  })

  afterEach(async () => {
    // Rollback after each test to clean up
    try {
      await client.query('ROLLBACK')
    } catch {
      // Already rolled back, that's fine
    }
  })

  // Helper function to insert test trades
  async function createTestTrade(overrides: Partial<Trade> = {}): Promise<Trade> {
    const data = {
      symbol: 'SPY',
      entry_price: 100.0,
      strategy: 'Test Strategy',
      date_entry: new Date('2026-05-22').toISOString().split('T')[0],
      ...overrides,
    }
    return queryCreateTrade(data)
  }

  describe('queryGetAllTrades', () => {
    it('should return empty array when no trades exist', async () => {
      const result = await queryGetAllTrades(50, 0, {})
      expect(result.trades).toEqual([])
      expect(result.total).toBe(0)
    })

    it('should return all trades without pagination', async () => {
      await createTestTrade({ symbol: 'SPY' })
      await createTestTrade({ symbol: 'QQQ' })
      await createTestTrade({ symbol: 'IWM' })

      const result = await queryGetAllTrades(50, 0, {})
      expect(result.trades.length).toBe(3)
      expect(result.total).toBe(3)
    })

    it('should respect limit parameter', async () => {
      await createTestTrade({ symbol: 'SPY' })
      await createTestTrade({ symbol: 'QQQ' })
      await createTestTrade({ symbol: 'IWM' })

      const result = await queryGetAllTrades(2, 0, {})
      expect(result.trades.length).toBe(2)
      expect(result.total).toBe(3)
    })

    it('should respect offset parameter for pagination', async () => {
      await createTestTrade({ symbol: 'SPY', entry_price: 100 })
      await createTestTrade({ symbol: 'QQQ', entry_price: 200 })
      await createTestTrade({ symbol: 'IWM', entry_price: 300 })

      const result1 = await queryGetAllTrades(1, 0, {})
      const result2 = await queryGetAllTrades(1, 1, {})
      const result3 = await queryGetAllTrades(1, 2, {})

      expect(result1.trades[0].symbol).toBe('SPY')
      expect(result2.trades[0].symbol).toBe('QQQ')
      expect(result3.trades[0].symbol).toBe('IWM')
    })

    it('should filter by status', async () => {
      await createTestTrade({ status: 'open' })
      await createTestTrade({ status: 'closed' })
      await createTestTrade({ status: 'open' })

      const result = await queryGetAllTrades(50, 0, { status: 'open' })
      expect(result.trades.length).toBe(2)
      expect(result.trades.every(t => t.status === 'open')).toBe(true)
    })

    it('should filter by strategy', async () => {
      await createTestTrade({ strategy: 'Support Bounce' })
      await createTestTrade({ strategy: 'Resistance Break' })
      await createTestTrade({ strategy: 'Support Bounce' })

      const result = await queryGetAllTrades(50, 0, { strategy: 'Support Bounce' })
      expect(result.trades.length).toBe(2)
      expect(result.trades.every(t => t.strategy === 'Support Bounce')).toBe(true)
    })

    it('should filter by symbol', async () => {
      await createTestTrade({ symbol: 'SPY' })
      await createTestTrade({ symbol: 'QQQ' })
      await createTestTrade({ symbol: 'SPY' })

      const result = await queryGetAllTrades(50, 0, { symbol: 'SPY' })
      expect(result.trades.length).toBe(2)
      expect(result.trades.every(t => t.symbol === 'SPY')).toBe(true)
    })

    it('should filter by date range', async () => {
      await createTestTrade({ date_entry: '2026-05-20' })
      await createTestTrade({ date_entry: '2026-05-22' })
      await createTestTrade({ date_entry: '2026-05-24' })

      const result = await queryGetAllTrades(50, 0, {
        dateStart: '2026-05-21',
        dateEnd: '2026-05-23',
      })
      expect(result.trades.length).toBe(1)
      expect(result.trades[0].date_entry).toContain('2026-05-22')
    })

    it('should combine multiple filters', async () => {
      await createTestTrade({ symbol: 'SPY', status: 'open', strategy: 'Test' })
      await createTestTrade({ symbol: 'QQQ', status: 'closed', strategy: 'Test' })
      await createTestTrade({ symbol: 'SPY', status: 'closed', strategy: 'Other' })

      const result = await queryGetAllTrades(50, 0, {
        symbol: 'SPY',
        status: 'open',
        strategy: 'Test',
      })
      expect(result.trades.length).toBe(1)
      expect(result.trades[0].symbol).toBe('SPY')
      expect(result.trades[0].status).toBe('open')
      expect(result.trades[0].strategy).toBe('Test')
    })

    it('should sort by date_entry DESC by default', async () => {
      await createTestTrade({ date_entry: '2026-05-20', entry_price: 100 })
      await createTestTrade({ date_entry: '2026-05-22', entry_price: 200 })
      await createTestTrade({ date_entry: '2026-05-21', entry_price: 300 })

      const result = await queryGetAllTrades(50, 0, {})
      expect(result.trades[0].date_entry).toContain('2026-05-22')
      expect(result.trades[1].date_entry).toContain('2026-05-21')
      expect(result.trades[2].date_entry).toContain('2026-05-20')
    })

    it('should return correct total count with offset', async () => {
      await createTestTrade()
      await createTestTrade()
      await createTestTrade()

      const result = await queryGetAllTrades(1, 1, {})
      expect(result.total).toBe(3) // Total is unaffected by offset
      expect(result.trades.length).toBe(1) // But results respect offset
    })
  })

  describe('queryGetTradeById', () => {
    it('should retrieve a single trade by ID', async () => {
      const created = await createTestTrade({ symbol: 'SPY', entry_price: 100 })
      const trade = await queryGetTradeById(created.id)

      expect(trade.id).toBe(created.id)
      expect(trade.symbol).toBe('SPY')
      expect(trade.entry_price).toBe(100)
    })

    it('should return all trade fields', async () => {
      const created = await createTestTrade({
        symbol: 'QQQ',
        entry_price: 250,
        strategy: 'Support Bounce',
        status: 'open',
      })
      const trade = await queryGetTradeById(created.id)

      expect(trade.symbol).toBe('QQQ')
      expect(trade.entry_price).toBe(250)
      expect(trade.strategy).toBe('Support Bounce')
      expect(trade.status).toBe('open')
      expect(trade.created_at).toBeDefined()
      expect(trade.updated_at).toBeDefined()
    })

    it('should throw error for non-existent trade ID', async () => {
      await expect(queryGetTradeById('non-existent-id')).rejects.toThrow()
    })

    it('should include P&L fields when trade is closed', async () => {
      const created = await createTestTrade({ entry_price: 100 })
      await queryCloseTrade(created.id, 110, '2026-05-23')
      const trade = await queryGetTradeById(created.id)

      expect(trade.profit_loss).toBe(10)
      expect(trade.percent_return).toBe(10)
    })
  })

  describe('queryCreateTrade', () => {
    it('should create trade with required fields', async () => {
      const trade = await createTestTrade({
        symbol: 'SPY',
        entry_price: 100,
        strategy: 'Test',
      })

      expect(trade.id).toBeDefined()
      expect(trade.symbol).toBe('SPY')
      expect(trade.entry_price).toBe(100)
      expect(trade.strategy).toBe('Test')
    })

    it('should auto-generate ID in correct format', async () => {
      const trade = await createTestTrade()
      expect(trade.id).toMatch(/^trade_\d+_[a-z0-9]+$/)
    })

    it('should set status to "open" by default', async () => {
      const trade = await createTestTrade()
      expect(trade.status).toBe('open')
    })

    it('should set created_at and updated_at to current time', async () => {
      const before = new Date()
      const trade = await createTestTrade()
      const after = new Date()

      const createdAt = new Date(trade.created_at)
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('should auto-generate entry_number based on max existing', async () => {
      const trade1 = await createTestTrade()
      const trade2 = await createTestTrade()
      const trade3 = await createTestTrade()

      expect(trade1.entry_number).toBe(1)
      expect(trade2.entry_number).toBe(2)
      expect(trade3.entry_number).toBe(3)
    })

    it('should accept optional date_entry field', async () => {
      const trade = await createTestTrade({ date_entry: '2026-05-20' })
      expect(trade.date_entry).toContain('2026-05-20')
    })

    it('should accept optional numeric fields', async () => {
      const trade = await createTestTrade({
        strike_price: 450,
        delta: 0.65,
        iv_percent: 25.5,
      })

      expect(trade.strike_price).toBe(450)
      expect(trade.delta).toBe(0.65)
      expect(trade.iv_percent).toBe(25.5)
    })

    it('should handle decimal prices with precision', async () => {
      const trade = await createTestTrade({ entry_price: 123.456 })
      expect(trade.entry_price).toBe(123.456)
    })
  })

  describe('queryUpdateTrade', () => {
    it('should update single field', async () => {
      const created = await createTestTrade({ symbol: 'SPY' })
      const updated = await queryUpdateTrade(created.id, { symbol: 'QQQ' })

      expect(updated.symbol).toBe('QQQ')
      expect(updated.id).toBe(created.id)
    })

    it('should update multiple fields at once', async () => {
      const created = await createTestTrade()
      const updated = await queryUpdateTrade(created.id, {
        symbol: 'QQQ',
        entry_price: 200,
        strategy: 'New Strategy',
      })

      expect(updated.symbol).toBe('QQQ')
      expect(updated.entry_price).toBe(200)
      expect(updated.strategy).toBe('New Strategy')
    })

    it('should not affect fields not in update', async () => {
      const created = await createTestTrade({
        symbol: 'SPY',
        entry_price: 100,
        strategy: 'Original',
      })
      const updated = await queryUpdateTrade(created.id, { symbol: 'QQQ' })

      expect(updated.symbol).toBe('QQQ')
      expect(updated.entry_price).toBe(100)
      expect(updated.strategy).toBe('Original')
    })

    it('should update updated_at timestamp', async () => {
      const created = await createTestTrade()
      const originalUpdatedAt = new Date(created.updated_at)

      // Wait a tiny bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      const updated = await queryUpdateTrade(created.id, { symbol: 'QQQ' })
      const newUpdatedAt = new Date(updated.updated_at)

      expect(newUpdatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })

    it('should not update created_at when modifying trade', async () => {
      const created = await createTestTrade()
      const updated = await queryUpdateTrade(created.id, { symbol: 'QQQ' })

      expect(updated.created_at).toBe(created.created_at)
    })

    it('should handle partial updates with undefined values', async () => {
      const created = await createTestTrade({
        exit_price: 110,
        take_profit: 120,
      })
      const updated = await queryUpdateTrade(created.id, { exit_price: undefined })

      expect(updated.exit_price).toBeUndefined()
      expect(updated.take_profit).toBe(120)
    })

    it('should return updated trade', async () => {
      const created = await createTestTrade()
      const updated = await queryUpdateTrade(created.id, { symbol: 'IWM' })

      expect(updated.symbol).toBe('IWM')
      expect(typeof updated).toBe('object')
    })
  })

  describe('queryDeleteTrade', () => {
    it('should delete trade by ID', async () => {
      const trade = await createTestTrade()
      await queryDeleteTrade(trade.id)

      // Verify it's deleted by trying to retrieve it
      await expect(queryGetTradeById(trade.id)).rejects.toThrow()
    })

    it('should throw error when deleting non-existent trade', async () => {
      await expect(queryDeleteTrade('non-existent-id')).rejects.toThrow()
    })

    it('should not affect other trades when deleting one', async () => {
      const trade1 = await createTestTrade({ symbol: 'SPY' })
      const trade2 = await createTestTrade({ symbol: 'QQQ' })

      await queryDeleteTrade(trade1.id)

      const remaining = await queryGetAllTrades(50, 0, {})
      expect(remaining.trades.length).toBe(1)
      expect(remaining.trades[0].id).toBe(trade2.id)
    })

    it('should remove trade from query results after deletion', async () => {
      const trade = await createTestTrade()

      const beforeDelete = await queryGetAllTrades(50, 0, {})
      expect(beforeDelete.trades.length).toBe(1)

      await queryDeleteTrade(trade.id)

      const afterDelete = await queryGetAllTrades(50, 0, {})
      expect(afterDelete.trades.length).toBe(0)
    })
  })

  describe('queryCloseTrade', () => {
    it('should close trade and calculate profit/loss', async () => {
      const created = await createTestTrade({ entry_price: 100 })
      const closed = await queryCloseTrade(created.id, 110, '2026-05-23')

      expect(closed.status).toBe('closed')
      expect(closed.exit_price).toBe(110)
      expect(closed.profit_loss).toBe(10)
      expect(closed.percent_return).toBe(10)
    })

    it('should calculate negative profit/loss for losses', async () => {
      const created = await createTestTrade({ entry_price: 100 })
      const closed = await queryCloseTrade(created.id, 95, '2026-05-23')

      expect(closed.profit_loss).toBe(-5)
      expect(closed.percent_return).toBe(-5)
    })

    it('should handle decimal P&L calculations', async () => {
      const created = await createTestTrade({ entry_price: 100 })
      const closed = await queryCloseTrade(created.id, 105.5, '2026-05-23')

      expect(closed.profit_loss).toBe(5.5)
      expect(closed.percent_return).toBe(5.5)
    })

    it('should handle small entry prices with precision', async () => {
      const created = await createTestTrade({ entry_price: 0.01 })
      const closed = await queryCloseTrade(created.id, 0.015, '2026-05-23')

      expect(closed.profit_loss).toBe(0.005)
      expect(closed.percent_return).toBeCloseTo(50, 1)
    })

    it('should set exit_date when provided', async () => {
      const created = await createTestTrade()
      const closed = await queryCloseTrade(created.id, 110, '2026-05-25')

      expect(closed.exit_date).toContain('2026-05-25')
    })

    it('should allow closing without exit_date', async () => {
      const created = await createTestTrade()
      const closed = await queryCloseTrade(created.id, 110)

      expect(closed.status).toBe('closed')
      expect(closed.exit_price).toBe(110)
    })

    it('should transition status from open to closed', async () => {
      const created = await createTestTrade({ status: 'open' })
      expect(created.status).toBe('open')

      const closed = await queryCloseTrade(created.id, 110, '2026-05-23')
      expect(closed.status).toBe('closed')
    })

    it('should update updated_at timestamp when closing', async () => {
      const created = await createTestTrade()
      const closed = await queryCloseTrade(created.id, 110, '2026-05-23')

      const closedTime = new Date(closed.updated_at)
      const createdTime = new Date(created.updated_at)
      expect(closedTime.getTime()).toBeGreaterThan(createdTime.getTime())
    })
  })

  describe('queryGetTradeCount', () => {
    it('should return count of zero for empty table', async () => {
      const count = await queryGetTradeCount({})
      expect(count).toBe(0)
    })

    it('should return total count without filters', async () => {
      await createTestTrade()
      await createTestTrade()
      await createTestTrade()

      const count = await queryGetTradeCount({})
      expect(count).toBe(3)
    })

    it('should count trades with status filter', async () => {
      await createTestTrade({ status: 'open' })
      await createTestTrade({ status: 'closed' })
      await createTestTrade({ status: 'open' })

      const openCount = await queryGetTradeCount({ status: 'open' })
      const closedCount = await queryGetTradeCount({ status: 'closed' })

      expect(openCount).toBe(2)
      expect(closedCount).toBe(1)
    })

    it('should count trades with strategy filter', async () => {
      await createTestTrade({ strategy: 'Strategy A' })
      await createTestTrade({ strategy: 'Strategy B' })
      await createTestTrade({ strategy: 'Strategy A' })

      const countA = await queryGetTradeCount({ strategy: 'Strategy A' })
      const countB = await queryGetTradeCount({ strategy: 'Strategy B' })

      expect(countA).toBe(2)
      expect(countB).toBe(1)
    })

    it('should count trades with symbol filter', async () => {
      await createTestTrade({ symbol: 'SPY' })
      await createTestTrade({ symbol: 'QQQ' })
      await createTestTrade({ symbol: 'SPY' })

      const spyCount = await queryGetTradeCount({ symbol: 'SPY' })
      const qqqCount = await queryGetTradeCount({ symbol: 'QQQ' })

      expect(spyCount).toBe(2)
      expect(qqqCount).toBe(1)
    })

    it('should count with multiple filters', async () => {
      await createTestTrade({ symbol: 'SPY', status: 'open', strategy: 'Test' })
      await createTestTrade({ symbol: 'QQQ', status: 'open', strategy: 'Test' })
      await createTestTrade({ symbol: 'SPY', status: 'closed', strategy: 'Test' })

      const count = await queryGetTradeCount({
        symbol: 'SPY',
        status: 'open',
        strategy: 'Test',
      })
      expect(count).toBe(1)
    })

  })

  describe('Integration Tests - Query Workflows', () => {
    it('should create, update, and close a trade', async () => {
      // Create
      const created = await createTestTrade({
        symbol: 'SPY',
        entry_price: 100,
      })
      expect(created.status).toBe('open')

      // Update
      const updated = await queryUpdateTrade(created.id, { symbol: 'QQQ' })
      expect(updated.symbol).toBe('QQQ')

      // Close
      const closed = await queryCloseTrade(created.id, 110)
      expect(closed.status).toBe('closed')
      expect(closed.profit_loss).toBe(10)
    })

    it('should retrieve trade through query and verify closure', async () => {
      const created = await createTestTrade({ entry_price: 100 })
      const closed = await queryCloseTrade(created.id, 115)

      const retrieved = await queryGetTradeById(created.id)
      expect(retrieved.status).toBe('closed')
      expect(retrieved.exit_price).toBe(115)
      expect(retrieved.profit_loss).toBe(15)
    })

    it('should maintain count accuracy through create/delete', async () => {
      const count1 = await queryGetTradeCount({})
      expect(count1).toBe(0)

      const trade1 = await createTestTrade()
      const count2 = await queryGetTradeCount({})
      expect(count2).toBe(1)

      const trade2 = await createTestTrade()
      const count3 = await queryGetTradeCount({})
      expect(count3).toBe(2)

      await queryDeleteTrade(trade1.id)
      const count4 = await queryGetTradeCount({})
      expect(count4).toBe(1)
    })
  })
})
