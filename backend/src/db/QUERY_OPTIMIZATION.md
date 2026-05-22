# Database Query Optimization Guide

## Overview

This guide documents query patterns, index recommendations, and best practices for the SOP10 Trader App database.

**Goal**: Maintain sub-500ms API response times as the application scales to 100+ concurrent users with 1000+ trades per user.

---

## Index Recommendations

### Trades Table (`trades`)

```sql
-- Primary key (auto-created)
ALTER TABLE trades ADD CONSTRAINT pk_trades PRIMARY KEY (id);

-- User + Status lookup (most common filter)
CREATE INDEX idx_trades_user_status 
  ON trades(user_id, status DESC, date_entry DESC);

-- User + Strategy lookup
CREATE INDEX idx_trades_user_strategy 
  ON trades(user_id, strategy);

-- Date range queries (for analytics)
CREATE INDEX idx_trades_date_entry 
  ON trades(user_id, date_entry DESC);

-- Confluence score filter
CREATE INDEX idx_trades_confluence 
  ON trades(user_id, confluence_score DESC);

-- Symbol lookup (for market analysis)
CREATE INDEX idx_trades_symbol 
  ON trades(symbol, user_id);

-- Exit price NULL checks (for open trades)
CREATE INDEX idx_trades_exit_price 
  ON trades(user_id, exit_price) 
  WHERE exit_price IS NULL;
```

### Order of Index Columns

Indexes are ordered by query filter priority:
1. `user_id` - First column (tenant isolation, always filtered)
2. Equality filters (status, strategy, symbol)
3. Range/sort columns (date_entry, confluence_score)

This order maximizes index usage for most query patterns.

---

## Query Patterns

### Pattern 1: Get User's Trades (Paginated)

```typescript
// BAD: No index usage
const result = await pool.query(`
  SELECT * FROM trades WHERE user_id = $1
`, [userId]);

// GOOD: Uses idx_trades_user_status index
const result = await pool.query(`
  SELECT * FROM trades
  WHERE user_id = $1
  ORDER BY date_entry DESC
  LIMIT $2 OFFSET $3
`, [userId, limit, offset]);
```

**Index used**: `idx_trades_user_status`
**Expected time**: <50ms for 1000 trades

### Pattern 2: Filter by Status

```typescript
// Use indexed columns first
const result = await pool.query(`
  SELECT * FROM trades
  WHERE user_id = $1 AND status = $2
  ORDER BY date_entry DESC
  LIMIT $3 OFFSET $4
`, [userId, status, limit, offset]);
```

**Index used**: `idx_trades_user_status`
**Expected time**: <30ms

### Pattern 3: Filter by Strategy

```typescript
// Strategy is second column in index
const result = await pool.query(`
  SELECT * FROM trades
  WHERE user_id = $1 AND strategy = $2
  ORDER BY date_entry DESC
  LIMIT $3 OFFSET $4
`, [userId, strategy, limit, offset]);
```

**Index used**: `idx_trades_user_strategy`
**Expected time**: <40ms

### Pattern 4: Date Range Query

```typescript
// Good use of date_entry index
const result = await pool.query(`
  SELECT * FROM trades
  WHERE user_id = $1 
    AND date_entry >= $2 
    AND date_entry < $3
  ORDER BY date_entry DESC
  LIMIT $4 OFFSET $5
`, [userId, startDate, endDate, limit, offset]);
```

**Index used**: `idx_trades_date_entry`
**Expected time**: <50ms

### Pattern 5: Find Open Trades Only

```typescript
// Uses partial index for open trades
const result = await pool.query(`
  SELECT * FROM trades
  WHERE user_id = $1 AND exit_price IS NULL
  ORDER BY date_entry DESC
  LIMIT $2 OFFSET $3
`, [userId, limit, offset]);
```

**Index used**: `idx_trades_exit_price` (partial)
**Expected time**: <20ms (very fast)

---

## Anti-Patterns to Avoid

### ❌ BAD: Scanning Without User Filter

```typescript
// SLOW: Scans entire table
const result = await pool.query(`
  SELECT * FROM trades WHERE status = $1
`, [status]);

// GOOD: Filter by user first
const result = await pool.query(`
  SELECT * FROM trades WHERE user_id = $1 AND status = $2
`, [userId, status]);
```

### ❌ BAD: LIKE Queries Without Indexes

```typescript
// SLOW: Full text scan
const result = await pool.query(`
  SELECT * FROM trades WHERE symbol LIKE $1
`, ['%SPY%']);

// GOOD: Exact match (indexed) or use full-text search
const result = await pool.query(`
  SELECT * FROM trades WHERE user_id = $1 AND symbol = $2
`, [userId, 'SPY']);
```

### ❌ BAD: Computed Columns in WHERE

```typescript
// SLOW: Can't use indexes
const result = await pool.query(`
  SELECT * FROM trades
  WHERE user_id = $1 AND (exit_price - entry_price) > $2
`, [userId, minProfit]);

// GOOD: Store computed column or filter in app
const result = await pool.query(`
  SELECT id, entry_price, exit_price FROM trades
  WHERE user_id = $1
`);

// Then filter in application:
const filtered = rows.filter(r => (r.exit_price - r.entry_price) > minProfit);
```

### ❌ BAD: SELECT * Without Limits

```typescript
// SLOW: Returns entire table
const result = await pool.query(`
  SELECT * FROM trades WHERE user_id = $1
`, [userId]);

// GOOD: Always paginate and select needed columns
const result = await pool.query(`
  SELECT id, symbol, entry_price, exit_price, date_entry
  FROM trades
  WHERE user_id = $1
  ORDER BY date_entry DESC
  LIMIT 50 OFFSET 0
`, [userId]);
```

---

## N+1 Query Prevention

### ❌ BAD: N+1 Queries

```typescript
// 1 query for trades + N queries for details
const trades = await pool.query('SELECT id FROM trades WHERE user_id = $1', [userId]);
for (const trade of trades.rows) {
  const details = await pool.query('SELECT * FROM trade_details WHERE trade_id = $1', [trade.id]);
  // Process details
}
```

### ✅ GOOD: Single Query with JOIN

```typescript
// 1 query gets all data
const result = await pool.query(`
  SELECT 
    t.*,
    d.support_level,
    d.resistance_level
  FROM trades t
  LEFT JOIN trade_details d ON t.id = d.trade_id
  WHERE t.user_id = $1
  ORDER BY t.date_entry DESC
  LIMIT $2 OFFSET $3
`, [userId, limit, offset]);
```

---

## Connection Pool Best Practices

### Pool Configuration

```typescript
// backend/src/db/connection.ts already has optimized settings:
const pool = new Pool({
  max: 20,                    // Maximum connections
  min: 2,                     // Minimum connections to maintain
  idleTimeoutMillis: 30000,   // Close idle after 30s
  connectionTimeoutMillis: 2000,  // 2s to acquire connection
});
```

### Monitoring Pool Health

```typescript
// Check pool status
console.log({
  total: pool.totalCount,     // Total connections
  idle: pool.idleCount,       // Available connections
  waiting: pool.waitingCount, // Requests waiting for connection
});
```

### Connection Timeout Handling

If you get connection timeout errors:
1. Increase `max` connections: `DB_POOL_MAX=30`
2. Reduce idle timeout: `DB_IDLE_TIMEOUT=20000`
3. Check for slow queries blocking connections
4. Monitor concurrent user load

---

## Slow Query Logging

### Enable Query Logging

Add to PostgreSQL config:
```sql
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 100;  -- Log queries > 100ms
SELECT pg_reload_conf();
```

### Analyze Query Performance

```sql
-- Explain query plan
EXPLAIN ANALYZE
SELECT * FROM trades
WHERE user_id = '123' AND status = 'closed'
ORDER BY date_entry DESC
LIMIT 50;

-- Expected output shows index usage and execution time
-- If sequential scan appears, missing or wrong index
```

---

## Analytics Query Patterns

### Pattern: Aggregate Statistics

```typescript
// Efficient aggregation using indexes
const result = await pool.query(`
  SELECT
    status,
    strategy,
    COUNT(*) as count,
    SUM(profit_loss) as total_profit,
    AVG(percent_return) as avg_return,
    MIN(date_entry) as first_trade,
    MAX(date_entry) as last_trade
  FROM trades
  WHERE user_id = $1 AND date_entry >= $2
  GROUP BY status, strategy
`, [userId, thirtyDaysAgo]);
```

**Expected time**: <200ms (efficient with indexes)

### Pattern: Time Series Data

```typescript
// Partition by day for performance
const result = await pool.query(`
  SELECT
    DATE(date_entry) as day,
    COUNT(*) as trades,
    SUM(profit_loss) as daily_profit
  FROM trades
  WHERE user_id = $1 AND date_entry >= $2
  GROUP BY DATE(date_entry)
  ORDER BY day DESC
  LIMIT 30
`, [userId, ninetyDaysAgo]);
```

**Expected time**: <150ms

---

## Performance Checklist

- [ ] All user_id filters present (tenant isolation)
- [ ] Queries use indexed columns in WHERE clause
- [ ] LIMIT/OFFSET present for paginated queries
- [ ] SELECT specifies needed columns (not SELECT *)
- [ ] JOIN conditions use indexed columns
- [ ] No N+1 query patterns
- [ ] Slow queries (<500ms target) logged
- [ ] Connection pool monitored (max 20 connections)
- [ ] Date range queries use appropriate indexes
- [ ] Aggregation queries tested with EXPLAIN ANALYZE

---

## Configuration Environment Variables

```env
# Connection pool settings
DB_POOL_MAX=20                    # Maximum concurrent connections
DB_POOL_MIN=2                     # Minimum connections to maintain
DB_IDLE_TIMEOUT=30000             # Milliseconds before closing idle connection
DB_CONNECTION_TIMEOUT=2000        # Milliseconds to acquire a connection
```

---

## Resources

- [PostgreSQL Index Documentation](https://www.postgresql.org/docs/current/indexes.html)
- [EXPLAIN Query Analysis](https://www.postgresql.org/docs/current/sql-explain.html)
- [Index Design Best Practices](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Node.js pg Pool Documentation](https://node-postgres.com/api/pool)
