-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
  id VARCHAR(20) PRIMARY KEY,
  entry_number INT NOT NULL UNIQUE,
  date_entry TIMESTAMP NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  strategy VARCHAR(30) NOT NULL,
  strike_price DECIMAL(10, 2),
  delta DECIMAL(5, 3),
  days_to_expiration INT,
  iv_percent DECIMAL(5, 2),
  gex_status VARCHAR(20),
  pvp_status VARCHAR(100),
  vwap_status VARCHAR(100),
  confluence_score INT,
  entry_price DECIMAL(10, 2) NOT NULL,
  take_profit DECIMAL(10, 2),
  stop_loss DECIMAL(10, 2),
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  exit_price DECIMAL(10, 2),
  exit_date TIMESTAMP,
  profit_loss DECIMAL(10, 2),
  percent_return DECIMAL(7, 4),
  comments TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_strategy ON trades(strategy);
CREATE INDEX IF NOT EXISTS idx_confluence ON trades(confluence_score);
CREATE INDEX IF NOT EXISTS idx_date_entry ON trades(date_entry DESC);

-- Create screenshots table
CREATE TABLE IF NOT EXISTS screenshots (
  id SERIAL PRIMARY KEY,
  trade_id VARCHAR(20) NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  screenshot_data TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create sync_log table for tracking offline/online sync
CREATE TABLE IF NOT EXISTS sync_log (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR(50),
  trade_id VARCHAR(20),
  action VARCHAR(20),
  synced_at TIMESTAMP DEFAULT NOW(),
  conflict BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_client_id ON sync_log(client_id);
CREATE INDEX IF NOT EXISTS idx_trade_id ON sync_log(trade_id);
