# MCP Server "Bebeto" - Trading Market Analysis Server

Real-time options market analysis powered by **FlashAlpha** (gamma exposure, Greeks, walls) and **Theta Data** (historical options, volatility, decay). Exposes 11 tools via MCP protocol for AI-driven trading insights.

## 🎯 Overview

Bebeto is a Model Context Protocol (MCP) server that combines two powerful market data sources:

- **FlashAlpha**: Real-time gamma exposure (GEX), Greeks, gamma flip levels, options walls, volume/open interest
- **Theta Data**: Historical options data, volatility analysis, theta decay, complete options chains

This allows AI clients (like Claude) to perform sophisticated options market analysis and identify trading opportunities.

## 🚀 Features

### Real-Time Data (FlashAlpha)
- **Gamma Exposure (GEX)**: Price levels where options position gamma becomes bullish/bearish
- **Greeks Analysis**: Delta, Gamma, Theta, Vega, IV across expirations
- **Gamma Flip Levels**: Price points where gamma regime reverses
- **Options Walls**: Put/call concentration levels indicating support/resistance
- **Volume & Open Interest**: Call/put volume and OI by strike

### Historical Data (Theta Data)
- **Options Chains**: Complete calls + puts for specific expirations
- **Historical Options**: OHLCV data for individual contracts
- **Volatility Analysis**: Historical vs implied volatility with skew
- **Theta Decay**: Daily/weekly decay acceleration approaching expiration
- **Volatility Terms**: Weekly, monthly, quarterly analysis

### Combined Analysis
- **Market Structure**: Real-time GEX + Greeks + walls in single response
- **Theta Opportunities**: Identify attractive theta decay candidates
- **Comprehensive Analysis**: Multi-factor market assessment

## 📋 Tools Available

### 1. `get_gex_analysis`
Get real-time gamma exposure analysis for a symbol.

**Input**:
```json
{
  "symbol": "SPY",
  "strike": 450  // Optional: specific strike level
}
```

**Output**: GEX data with regime (bullish/bearish/neutral) and timestamp

---

### 2. `get_market_data`
Combined real-time market data snapshot (GEX, Greeks, walls, volume/OI).

**Input**:
```json
{
  "symbol": "QQQ"
}
```

**Output**: Complete market structure with all real-time metrics

---

### 3. `get_gamma_flip_levels`
Identify price levels where gamma regime reverses (reversal points).

**Input**:
```json
{
  "symbol": "TSLA"
}
```

**Output**: Flip level, direction (up/down/neutral), strength, confidence

---

### 4. `get_options_walls`
Analyze put/call wall concentrations (support/resistance from options positioning).

**Input**:
```json
{
  "symbol": "AAPL",
  "strikePrice": 175  // Optional
}
```

**Output**: Array of strike prices with put/call wall strength

---

### 5. `get_greeks_analysis`
Get comprehensive Greeks (Delta, Gamma, Theta, Vega) across expirations.

**Input**:
```json
{
  "symbol": "NVDA",
  "expiration": "2026-06-20"  // Optional: default is all expirations
}
```

**Output**: Greeks for each strike with option prices and IV

---

### 6. `get_historical_options`
Get historical OHLCV data for a specific options contract.

**Input**:
```json
{
  "symbol": "META",
  "strike": 500,
  "expiration": "2026-06-15",
  "optionType": "call",
  "startDate": "2026-05-01",
  "endDate": "2026-05-22"
}
```

**Output**: Historical price bars with volume and implied volatility

---

### 7. `get_volatility_analysis`
Analyze historical vs implied volatility with volatility skew.

**Input**:
```json
{
  "symbol": "XLE",
  "term": "monthly"  // Options: weekly, monthly, quarterly
}
```

**Output**: HV, IV, skew, and volatility term metrics

---

### 8. `get_theta_decay`
Analyze theta decay by strike approaching expiration.

**Input**:
```json
{
  "symbol": "GLD",
  "expiration": "2026-06-20"
}
```

**Output**: Theta, daily decay, weekly decay, acceleration by strike

---

### 9. `get_options_chain`
Get complete options chain (all calls + puts) for expiration.

**Input**:
```json
{
  "symbol": "UUP",
  "expiration": "2026-07-17"
}
```

**Output**: Full chain with calls and puts, volumes, IV, open interest

---

### 10. `analyze_market_structure`
Comprehensive market analysis combining GEX, Greeks, walls, and volume patterns.

**Input**:
```json
{
  "symbol": "SPX"
}
```

**Output**: 
- Market regime (bullish/bearish/neutral)
- Support/resistance levels from gamma exposure
- Call vs put dominance
- Confidence scores
- Recommendation (BULLISH/BEARISH/NEUTRAL)

---

### 11. `analyze_theta_opportunity`
Identify attractive theta decay trading opportunities based on multiple factors.

**Input**:
```json
{
  "symbol": "IWM",
  "expiration": "2026-06-20"
}
```

**Output**:
- Most attractive theta opportunities (calls/puts)
- Daily decay, weekly decay
- IV rank for context
- Risk levels
- Opportunity score

---

## 🔧 Installation

### Prerequisites
- Node.js 18+ (for ESNext module support)
- npm or yarn
- FlashAlpha API key ([Get here](https://lab.flashalpha.com))
- Theta Data API key ([Get here](https://thetadata.us))

### Setup

1. **Clone/navigate to server directory**:
```bash
cd /Users/bebeto/SOP10-Trader-App/mcp-server-bebeto
```

2. **Install dependencies**:
```bash
npm install
```

3. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your API keys
nano .env
```

4. **Build TypeScript**:
```bash
npm run build
```

5. **Verify build**:
```bash
ls -la dist/
# Should show index.js and other compiled files
```

---

## 🚀 Usage

### Local Development (with hot reload)

```bash
npm run dev
```

This starts the server with `tsx` (TypeScript runner) in stdio transport mode.

### Production

```bash
npm start
```

This runs the compiled JavaScript from `dist/index.js`.

### With Claude

Configure Claude Code to use this MCP server:

```json
{
  "mcpServers": {
    "bebeto": {
      "command": "node",
      "args": ["/Users/bebeto/SOP10-Trader-App/mcp-server-bebeto/dist/index.js"],
      "env": {
        "FLASHALPHA_API_KEY": "your_flashalpha_key",
        "FLASHALPHA_BASE_URL": "https://lab.flashalpha.com/api/v1",
        "THETA_DATA_EMAIL": "your_email@example.com",
        "THETA_DATA_PASSWORD": "your_password",
        "NODE_ENV": "production",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

---

## 📊 Data Flow

```
Claude / MCP Client
      │
      ├─ Tool Request (e.g., get_gex_analysis)
      │
      ▼
BebetoPlatform (MCP Server)
      │
      ├─── Real-Time Data ─────────────────┐
      │     (FlashAlpha)                    │
      │     - getGEX()                      │
      │     - getGreeks()                   │
      │     - getGammaFlip()                │
      │     - getOptionsWalls()             │
      │     - getVolumeAndOI()              │
      │                                      │
      ├─── Historical Data ────────────────┐│
      │     (Theta Data)                    ││
      │     - getHistoricalOptions()        ││
      │     - getVolatility()               ││
      │     - getThetaDecay()               ││
      │     - getOptionsChain()             ││
      │                                      ││
      └─── Analysis Layer ─────────────────┘│
            - Combine data                   │
            - Calculate metrics               │
            - Format response                 │
                      │                       │
                      ▼                       │
              JSON Response ◄─────────────────┘
                      │
                      ▼
              Claude / MCP Client
```

---

## 🔐 API Credentials

### FlashAlpha API Key

1. Navigate to https://lab.flashalpha.com
2. Create account or login
3. Go to Settings → API Keys
4. Copy your API key
5. Add to `.env`: `FLASHALPHA_API_KEY=your_key`

### Theta Data Credentials (Python SDK)

This server uses the **official Theta Data Python SDK**, which authenticates with website credentials (email/password), NOT API keys.

1. Navigate to https://www.thetadata.us
2. Create account or login
3. Verify your subscription at https://www.thetadata.net/portal/subscriptions
4. Add to `.env`:
   ```
   THETA_DATA_EMAIL=your_email@example.com
   THETA_DATA_PASSWORD=your_password_here
   ```

**Note**: The Python SDK maintains session authentication without requiring an API key. Subscription tier determines endpoint access.

#### Theta Data SDK Installation

The server requires Python 3.7+ and the Theta Data library:

```bash
pip install thetadata
```

Verify installation:
```bash
python3 -c "import thetadata; print('OK')"
```

If you get an import error, install via: `pip3 install thetadata --user`

---

## 🧪 Testing

### Health Check

```bash
# The server performs health checks on startup
npm run dev

# Output should show:
# ✅ FlashAlpha API health check: PASSED
# ✅ Theta Data API health check: PASSED
```

### Manual Tool Testing

Once server is running, test a tool with MCP Inspector:

```bash
npx @modelcontextprotocol/inspector
```

Then test tools like:

```json
{
  "tool": "get_gex_analysis",
  "input": { "symbol": "SPY" }
}
```

---

## 📈 Caching Strategy

**Real-Time Data (FlashAlpha)**: 5 minutes (300 seconds)
- GEX, Greeks, walls update every 5 minutes
- Reduces API calls, still provides recent data

**Historical Data (Theta Data)**:
- Historical options: 24 hours (86400 seconds)
- Volatility: 1 hour (3600 seconds)
- Options chains: 1 hour (3600 seconds)
- Theta decay: 30 minutes (1800 seconds)

### Disable Cache (for development)

Edit `src/index.ts` and set:
```typescript
const CACHE_TTL_REAL_TIME = 0  // Disable caching
const CACHE_TTL_HISTORICAL = 0
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FLASHALPHA_API_KEY` | `` | FlashAlpha API key (required) |
| `FLASHALPHA_BASE_URL` | `https://lab.flashalpha.com/api/v1` | FlashAlpha API endpoint |
| `THETA_DATA_API_KEY` | `` | Theta Data API key (required) |
| `THETA_DATA_BASE_URL` | `https://api.thetadata.com/api/v1` | Theta Data API endpoint |
| `NODE_ENV` | `development` | Environment (development/production) |
| `LOG_LEVEL` | `info` | Logging level (error/warn/info/debug) |

### Rate Limiting

Both clients enforce rate limits to avoid API throttling:
- **FlashAlpha**: 200ms between requests (max 5 requests/second)
- **Theta Data**: 200ms between requests (max 5 requests/second)

To adjust, edit clients in `src/clients/`:

```typescript
private rateLimitDelay = 200  // Change this (in milliseconds)
```

### Request Timeouts

- **FlashAlpha**: 10 seconds
- **Theta Data**: 15 seconds

To adjust, edit in client constructors:

```typescript
private readonly REQUEST_TIMEOUT = 10000  // Change this (in milliseconds)
```

---

## 📊 Architecture

### Project Structure

```
mcp-server-bebeto/
├── src/
│   ├── clients/
│   │   ├── flashalpha-client.ts    # FlashAlpha API wrapper (470 lines)
│   │   └── theta-data-client.ts    # Theta Data API wrapper (450 lines)
│   ├── utils/
│   │   └── types.ts                # TypeScript interfaces (180 lines)
│   └── index.ts                    # Main MCP server (700 lines)
├── dist/                           # Compiled JavaScript (auto-generated)
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── .env.example                    # Environment template
├── .env                            # Your credentials (git-ignored)
└── README.md                       # This file
```

### Type Safety

All code is written in TypeScript with strict mode enabled:
- `noImplicitAny: true`
- `strictNullChecks: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noImplicitReturns: true`

---

## 🐛 Troubleshooting

### API Connection Failed

```
❌ Error fetching GEX: 401 Unauthorized
```

**Solution**: Check API key in `.env`:
```bash
# Verify key is correct
echo $FLASHALPHA_API_KEY

# Re-check credentials at https://lab.flashalpha.com/settings
```

### Rate Limiting (429 Too Many Requests)

```
❌ FlashAlpha rate limit: Too many requests
```

**Solution**: Increase rate limit delay:
```typescript
// In src/clients/flashalpha-client.ts
private rateLimitDelay = 500  // Increase from 200 to 500ms
```

### Request Timeout

```
❌ ECONNABORTED Error: timeout of 10000ms exceeded
```

**Solution**: Increase timeout:
```typescript
// In src/clients/flashalpha-client.ts
private readonly REQUEST_TIMEOUT = 15000  // Increase from 10000 to 15000ms
```

### Module Not Found

```
Error: Cannot find module '@modelcontextprotocol/sdk'
```

**Solution**: Reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 API Documentation

### FlashAlpha
- Website: https://lab.flashalpha.com
- Docs: https://github.com/FlashAlpha/api-docs
- Features: Real-time options market data, gamma exposure, Greeks

### Theta Data
- Website: https://www.thetadata.us
- Docs: https://docs.thetadata.us
- Features: Historical options data, volatility analysis, theta decay

---

## 🚀 Deployment

### Option 1: Railway (Recommended)

1. Push code to GitHub
2. Create Railway project
3. Connect GitHub repo
4. Add environment variables:
   - `FLASHALPHA_API_KEY`
   - `THETA_DATA_API_KEY`
5. Deploy: `npm run build && npm start`

### Option 2: Local Server

Keep running locally for development:
```bash
npm run dev
```

Configure Claude to connect via stdio transport.

### Option 3: Docker

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t bebeto .
docker run -e FLASHALPHA_API_KEY=xxx -e THETA_DATA_API_KEY=yyy bebeto
```

---

## 📝 Example Queries

### Real-Time Market Structure
"Analyze the market structure for SPY using the Bebeto MCP server. What are the current gamma exposure levels, support/resistance from options walls, and overall market regime?"

### Theta Opportunities
"Find attractive theta decay opportunities in IWM expiring on June 20, 2026. Which strikes have the best daily decay without excessive gamma risk?"

### Volatility Analysis
"Compare historical vs implied volatility for QQQ across weekly, monthly, and quarterly terms. Is the market pricing in elevated volatility?"

### Greeks Analysis
"Get the Greeks for TSLA with June expirations. Which call spreads have favorable gamma and theta for the next week?"

### Options Chain Snapshot
"Show the complete options chain for AAPL expiring June 20, 2026. Highlight strikes with unusual volume concentration."

---

## 📧 Support

### Issues/Feedback
1. Check troubleshooting section above
2. Verify API credentials are correct
3. Check API status pages:
   - https://lab.flashalpha.com (FlashAlpha)
   - https://status.thetadata.us (Theta Data)

### Development
- Review tool descriptions in `src/index.ts`
- Check client implementations in `src/clients/`
- Review type definitions in `src/utils/types.ts`

---

## 📄 License

This MCP server is provided as-is for the SOP10 Trader App project.

---

## 🎯 Version

- **MCP Protocol**: v0.5.0
- **Server**: Bebeto v1.0.0
- **Last Updated**: May 22, 2026
