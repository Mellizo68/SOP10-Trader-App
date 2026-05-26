import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://trader:tradersecret@localhost:5432/sop10_trader',
});

async function testAnalytics() {
  try {
    const client = await pool.connect();
    
    // First, check if we have any trades
    const tradesResult = await client.query('SELECT COUNT(*) as count FROM trades WHERE status = \'closed\'');
    console.log('Closed trades:', tradesResult.rows[0]);
    
    // Test the summary query
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'closed') as total_trades,
        COUNT(*) FILTER (WHERE status = 'closed' AND profit_loss > 0) as winning_trades,
        COUNT(*) FILTER (WHERE status = 'closed' AND profit_loss < 0) as losing_trades
      FROM trades
    `;
    
    const result = await client.query(query);
    console.log('Query result:', result.rows[0]);
    
    client.release();
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testAnalytics();
