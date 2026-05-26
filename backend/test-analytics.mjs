import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://trader:tradersecret@localhost:5432/sop10_trader'
});

async function test() {
  try {
    console.log('Testing drawdown query with ORDER BY cumulative_profit...');
    
    const drawdownQuery = `
      WITH cumulative_pl AS (
        SELECT
          created_at,
          SUM(COALESCE(profit_loss, 0)) OVER (ORDER BY created_at) as cumulative_profit
        FROM trades
        WHERE status = 'closed'
        ORDER BY created_at
      ),
      running_max AS (
        SELECT
          cumulative_profit,
          MAX(cumulative_profit) OVER (ORDER BY cumulative_profit) as peak
        FROM cumulative_pl
      )
      SELECT
        ROUND(
          100.0 * MIN(cumulative_profit - peak) / NULLIF(MAX(peak), 0),
          2
        ) as max_drawdown
      FROM running_max
      WHERE peak > 0
    `;

    try {
      const drawdownResult = await pool.query(drawdownQuery);
      console.log('✅ Drawdown query executed:', drawdownResult.rows[0]);
    } catch (e) {
      console.error('❌ Drawdown query error:', e.message);
      console.log('\n🔧 Fixing the query - ORDER BY cumulative_profit is wrong, should use ORDER BY created_at');
    }

    // Test the corrected query
    const correctedQuery = `
      WITH cumulative_pl AS (
        SELECT
          created_at,
          SUM(COALESCE(profit_loss, 0)) OVER (ORDER BY created_at) as cumulative_profit
        FROM trades
        WHERE status = 'closed'
        ORDER BY created_at
      ),
      running_max AS (
        SELECT
          created_at,
          cumulative_profit,
          MAX(cumulative_profit) OVER (ORDER BY created_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as peak
        FROM cumulative_pl
      )
      SELECT
        ROUND(
          100.0 * COALESCE(MIN(peak - cumulative_profit) / NULLIF(MAX(peak), 0), 0),
          2
        ) as max_drawdown
      FROM running_max
      WHERE peak > 0
    `;

    console.log('\nTesting corrected query...');
    const correctedResult = await pool.query(correctedQuery);
    console.log('✅ Corrected query works:', correctedResult.rows[0]);

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

test();
