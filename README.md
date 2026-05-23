# SOP10 Trader App - Setup Validator & Trade Journal

A comprehensive options trading analysis tool with real-time market data, GEX analysis, historical Greeks tracking, and backtesting capabilities.

## 🚀 Features

### Core Capabilities
- **Market Analysis** - Real-time GEX, Greeks, Options Walls, Volume/OI  
- **Setup Validator** - Confluence score validation with multi-factor analysis
- **Trade Journal** - Complete trade tracking, P&L, performance analytics
- **Historical Analysis** - Historical Greeks charting (Delta, Gamma, Theta, Vega, IV)
- **Backtesting** - Options strategy backtesting with detailed metrics

### Analytics
- Real-time data (60-second polling)
- 6 pre-built options strategies  
- Performance metrics (win rate, profit factor, max drawdown, Sharpe ratio)
- IV, CVD, and Z-Score analysis
- Multi-timeframe charting

## 📋 Requirements

- Node.js 16+
- npm/yarn
- Modern browser (Chrome, Firefox, Safari, Edge)

## ⚙️ Installation

```bash
# Install dependencies
npm install
cd backend && npm install && cd ..

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys
```

## 🔧 Configuration

### Environment Variables (`.env.local`)
```
VITE_API_URL=http://localhost:8080
VITE_LOG_LEVEL=info
```

### Backend Environment (`backend/.env`)
```
NODE_ENV=development
PORT=8080
FLASH_ALPHA_API_KEY=your_key_here
THETA_DATA_API_KEY=your_key_here
```

## 🏃 Running Locally

```bash
# Terminal 1: Frontend dev server (port 3000)
npm run dev

# Terminal 2: Backend dev server (port 8080)  
cd backend && npm run dev
```

Access the app at `http://localhost:3000`

## 🏗️ Build

```bash
npm run build    # Build frontend + backend
npm run preview  # Preview production build
```

## 📡 API Endpoints

### Discovery
- `GET /api/symbols` - Available symbols
- `GET /api/expirations/:symbol` - Expiration dates
- `GET /api/strikes/:symbol/:expiration` - Strike prices
- `GET /api/options-chain/:symbol/:expiration` - Full chains

### Market Data  
- `GET /api/market/greeks/:symbol` - Real-time Greeks
- `GET /api/market/gex/:symbol` - GEX analysis
- `GET /api/market/walls/:symbol` - Options walls

### Historical
- `GET /api/market/history/:symbol` - Historical Greeks
- `GET /api/volatility/:symbol` - Volatility analysis
- `GET /api/theta-decay/:symbol` - Theta decay

### Backtesting
- `GET /api/backtest/strategies` - Available strategies
- `POST /api/backtest/run` - Run backtest
- `GET /api/backtest/:id` - Get results

## 🚀 Deployment

### Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to production
vercel --prod

# Set environment variables in Vercel dashboard
```

### Docker

```bash
docker build -t trader-app .
docker run -p 3000:3000 -p 8080:8080 trader-app
```

## 📊 Performance

- Frontend bundle: 165KB (gzipped: 53KB)
- Real-time polling: 60s intervals  
- API caching: 5min TTL
- Strike filtering: 80-90% payload reduction

## 🛠️ Tech Stack

**Frontend**: React 18, TypeScript, Tailwind, Vite, Zustand
**Backend**: Node/Express, TypeScript, Winston
**APIs**: FlashAlpha (real-time), ThetaData (historical)

## 📝 Features Included

✅ Real-time market analysis  
✅ Historical Greeks tracking  
✅ Options strategy backtesting  
✅ Trade journaling with metrics  
✅ Setup validation and confluence scoring  
✅ Multi-strategy analysis  
✅ Performance heatmaps and streaks  
✅ Error recovery and logging  

## 🔒 Error Handling

3-tier fallback system:
1. Real API → 2. Cached data (5min TTL) → 3. Error response

All errors logged via Winston for debugging.

## 📄 License

MIT

---

**Version**: 1.0.0 - Phase 9 Complete  
**Last Updated**: May 23, 2026
