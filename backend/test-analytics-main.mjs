import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://trader:tradersecret@localhost:5432/sop10_trader'
});

async function test() {
  try {
    console.log('Testing main analytics query...');
    
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'closed') as total_trades,
        COUNT(*) FILTER (WHERE status = 'closed' AND profit_loss > 0) as winning_trades,
        COUNT(*) FILTER (WHERE status = 'closed' AND profit_loss < 0) as losing_trades,
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE status = 'closed' AND profit_loss > 0) /
          NULLIF(COUNT(*) FILTER (WHERE status = 'closed'), 0),
          2
        ) as win_rate,
        ROUND(
          COALESCE(SUM(profit_loss) FILTER (WHERE status = 'closed' AND profit_loss > 0), 0) /
          NULLIF(ABS(COALESCE(SUM(profit_loss) FILTER (WHERE status = 'closed' AND profit_loss < 0), 1)), 0),
          2
        ) as profit_factor,
        COALESCE(SUM(profit_loss) FILTER (WHERE status = 'closed'), 0) as total_profit_loss,
        ROUND(
          COALESCE(AVG(profit_loss) FILTER (WHERE status = 'closed' AND profit_loss > 0), 0),
          2
        ) as average_win,
        ROUND(
          COALESCE(AVG(profit_loss) FILTER (WHERE status = 'closed' AND profit_loss < 0), 0),
          2
        ) as average_loss,
        COALESCE(MAX(profit_loss) FILTER (WHERE status = 'closed'), 0) as best_trade,
        COALESCE(MIN(profit_loss) FILTER (WHERE status = 'closed'), 0) as worst_trade,
        COALESCE(MAX(win_streak), 0) as win_streak_max,
        COALESCE(MAX(loss_streak), 0) as loss_streak_max
      FROM trades
    `;

    try {
      const result = await pool.query(query);
      console.log('✅ Main query executed successfully');
      console.log('Result:', JSON.stringify(result.rows[0], null, 2));
    } catch (e) {
      console.error('❌ Query error:', e.message);
      console.error('Code:', e.code);
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

test();
