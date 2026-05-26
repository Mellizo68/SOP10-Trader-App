import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://trader:tradersecret@localhost:5432/sop10_trader',
});

async function testMaxDrawdown() {
  try {
    const client = await pool.connect();
    
    const query = `
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
    
    console.log('Testing queryMaxDrawdown query...');
    const result = await client.query(query);
    console.log('Result:', result.rows);
    
    client.release();
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testMaxDrawdown();
