# SOP10 Trader Backend

Express.js + TypeScript + PostgreSQL backend for the SOP10 Trader App.

## Installation

```bash
cd backend
npm install
```

## Configuration

Create `.env.local` file with:

```bash
DATABASE_URL=postgresql://trader:tradersecret@localhost:5432/sop10_trader
NODE_ENV=development
PORT=5000
FLASHALPHA_API_KEY=your_api_key
FLASHALPHA_BASE_URL=https://lab.flashalpha.com/api/v1
```

## Development

```bash
npm run dev
```

Server will run on `http://localhost:5000`

## API Endpoints

### Market Data
- `GET /api/market/health` - Health check
- `GET /api/market/data/:symbol` - All market data (GEX, Greeks, Walls, etc.)
- `GET /api/market/gex/:symbol` - Gamma Exposure
- `GET /api/market/greeks/:symbol` - Greeks (Delta, Gamma, Theta, Vega, IV)
- `GET /api/market/gamma-flip/:symbol` - Gamma Flip levels
- `GET /api/market/walls/:symbol` - Options Walls
- `GET /api/market/volume-oi/:symbol` - Volume & Open Interest
- `GET /api/market/stats` - API statistics

### Trades (Phase 5)
- `GET /api/trades` - List trades
- `POST /api/trades` - Create trade
- `PUT /api/trades/:id` - Update trade
- `DELETE /api/trades/:id` - Delete trade

### Statistics (Phase 5)
- `GET /api/stats` - Get statistics

## Build

```bash
npm run build
```

Compiled code will be in `dist/` directory.

## Production

```bash
npm start
```

## Project Structure

```
src/
├── api/                    # External API clients
│   └── flashalpha-client.ts
├── controllers/            # Request handlers
│   └── marketController.ts
├── routes/                 # Route definitions
│   ├── market.ts
│   ├── trades.ts
│   └── stats.ts
├── middleware/             # Express middleware
│   └── errorHandler.ts
├── db/                     # Database
│   ├── connection.ts
│   └── migrations/
├── types.ts               # TypeScript types
├── app.ts                 # Express app setup
└── server.ts              # Server entry point
```

## Documentation

See `PHASE8_MARKET_INTEGRATION.md` for complete API documentation.

