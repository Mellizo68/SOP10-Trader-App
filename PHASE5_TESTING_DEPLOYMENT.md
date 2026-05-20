# 🧪 Phase 5: Testing & Deployment Guide

## ✅ Build Status

### Frontend
```
✓ TypeScript compilation: OK
✓ Vite build: OK (662KB raw, 182KB gzipped)
✓ All modules: 2171 transformed
```

### Backend
```
✓ TypeScript compilation: OK
✓ dist/ generated: 15 files
✓ All modules present: controllers/, routes/, middleware/, utils/, db/
```

---

## 📋 Pre-Deployment Checklist

### Environment Variables Setup

**Backend (.env.local)**
```bash
DATABASE_URL=postgresql://trader:tradersecret@localhost:5432/sop10_trader
NODE_ENV=development
PORT=5000
```

**Frontend (.env.local)**
```bash
VITE_ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE
VITE_API_URL=http://localhost:5000/api
```

### Docker Setup (Local Development)
```bash
# Start PostgreSQL
docker compose up -d

# Verify container is running
docker ps

# Check logs
docker compose logs postgres
```

---

## 🚀 Local Testing Procedure

### Step 1: Start PostgreSQL
```bash
cd /Users/bebeto/SOP10-Trader-App
docker compose up -d

# Wait 3-5 seconds for database to be ready
sleep 5

# Verify connection
docker exec -it sop10_postgres psql -U trader -d sop10_trader -c "SELECT 1"
```

### Step 2: Start Backend
```bash
cd /Users/bebeto/SOP10-Trader-App/backend

# Install dependencies (if needed)
npm install

# Run development server
npm run dev

# Expected output:
# Server running on http://localhost:5000
# Database connected
# Health check: /health
```

### Step 3: Start Frontend
```bash
cd /Users/bebeto/SOP10-Trader-App

# In a new terminal
npm run dev

# Expected output:
# VITE v5.4.21 ready in 123 ms
# ➜  Local:   http://localhost:3000/
```

### Step 4: Manual Testing Checklist

#### Create Trade Flow
- [ ] Open frontend on http://localhost:3000
- [ ] Navigate to Trade Journal
- [ ] Click "Create Trade"
- [ ] Fill in form (minimum: symbol, entry price, strategy)
- [ ] Click "Save Trade"
- [ ] Verify in table
- [ ] Check backend logs for API call
- [ ] Verify in PostgreSQL:
  ```bash
  docker exec -it sop10_postgres psql -U trader -d sop10_trader \
    -c "SELECT id, symbol, entry_price, status FROM trades LIMIT 5;"
  ```

#### Close Trade Flow
- [ ] Open a trade detail from table
- [ ] Click "Cerrar Trade"
- [ ] Enter exit price (must be > 0)
- [ ] Verify P/L and % Return auto-calculate
- [ ] Click "Cerrar Trade"
- [ ] Verify P/L values are correct:
  - P/L = exitPrice - entryPrice
  - % Return = (P/L / entryPrice) * 100
- [ ] Check backend logs
- [ ] Verify in PostgreSQL:
  ```bash
  docker exec -it sop10_postgres psql -U trader -d sop10_trader \
    -c "SELECT id, symbol, status, exit_price, profit_loss FROM trades WHERE status='closed';"
  ```

#### Filtering & Statistics
- [ ] Filter by status (open/closed) - verify SQL filtering works
- [ ] Filter by strategy - verify WHERE clause works
- [ ] Check Overview tab - statistics calculate correctly
- [ ] Check Analytics tab - strategy breakdown appears
- [ ] Export CSV - all fields included
- [ ] Verify localStorage cache:
  ```javascript
  // In browser console:
  JSON.parse(localStorage.getItem('sop10_trades_cache')).length
  ```

#### Offline Mode Testing
- [ ] Stop backend server (Ctrl+C in backend terminal)
- [ ] Frontend should still work (trades from cache)
- [ ] Create a new trade - should be marked pending
- [ ] Check browser console - no API errors
- [ ] Verify pending trades in localStorage:
  ```javascript
  // In browser console:
  JSON.parse(localStorage.getItem('sop10_pending_syncs'))
  ```
- [ ] Restart backend: `npm run dev`
- [ ] Check network tab - auto-sync should happen
- [ ] Verify PostgreSQL has new trades

#### API Health Check
- [ ] Frontend: Check Network tab (DevTools → Network)
- [ ] All API calls should return:
  ```json
  {
    "success": true,
    "data": { ... },
    "message": "OK"
  }
  ```
- [ ] Error responses should have:
  ```json
  {
    "success": false,
    "error": "Human-readable error message",
    "statusCode": 400
  }
  ```

---

## 🚂 Railway Deployment

### Prerequisites
1. Railway.app account (free tier)
2. GitHub repository with code
3. Environment variables configured

### Step 1: Configure Railway PostgreSQL

**In Railway Dashboard:**
1. Create new project
2. Add PostgreSQL service
3. Note the database credentials:
   - Host: `postgres.railway.internal`
   - Port: `5432`
   - Database: `railway`
   - User: (Railway-generated)
   - Password: (Railway-generated)

### Step 2: Create Backend Service

**In Railway Dashboard:**
1. Create new service (GitHub repo)
2. Configure environment variables:
   ```
   DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
   NODE_ENV=production
   PORT=5000
   ```
3. Deployment settings:
   - Builder: Nixpacks (auto-detected)
   - Start command: `npm run migrate && npm start`
   - Root directory: `backend/`

### Step 3: Deploy Frontend

**Build for production:**
```bash
cd /Users/bebeto/SOP10-Trader-App
npm run build
```

**Update frontend environment:**
```bash
# .env.production
VITE_API_URL=https://your-railway-backend.railway.app/api
VITE_ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE
```

**Deploy to Railway/Vercel:**
- Option A: Push to GitHub → Railway auto-deploys
- Option B: Push to GitHub → Vercel auto-deploys
- Option C: Docker push to railway.app registry

### Step 4: Verify Production Deployment

```bash
# Test backend health
curl https://your-railway-backend.railway.app/health

# Expected response:
# {"status":"ok"}

# Test API endpoint
curl https://your-railway-backend.railway.app/api/stats

# Should return statistics (even if empty)
```

---

## 🔍 Debugging Guide

### Backend Logs
```bash
# Local development
npm run dev

# Watch for:
# - "Database connected" = DB is ready
# - "Server running on :5000" = Express is listening
# - API request logs for debugging

# Production (Railway)
railway logs
```

### PostgreSQL Access

**Local:**
```bash
docker exec -it sop10_postgres psql -U trader -d sop10_trader

# Common queries:
\dt                    # List all tables
SELECT * FROM trades;  # View all trades
SELECT COUNT(*) FROM trades WHERE status='open';  # Count open trades
\d trades             # Show trades schema
```

**Production (Railway):**
```bash
# Via Railway CLI
railway shell postgres

# Or via psql
psql "postgresql://USER:PASSWORD@HOST:5432/DATABASE"
```

### Browser DevTools

**Network Tab:**
- Watch for API calls to `/api/trades`, `/api/stats`
- Check response status (200 = success, 500 = server error)
- Check response body for error messages

**Console Tab:**
- Watch for `API offline - using cached data` messages
- Watch for `Syncing X pending trades...` on reconnection
- Errors should be logged with context

**Application Tab:**
- Check `sop10_trades_cache` in localStorage
- Check `sop10_pending_syncs` to see which trades are pending
- Size should be reasonable (< 1MB)

---

## 📊 Performance Benchmarks

### Expected API Response Times
- GET /api/trades: ~30-50ms (with pagination)
- POST /api/trades: ~50-100ms
- PUT /api/trades/:id/close: ~50-100ms
- GET /api/stats: ~100-200ms

### Bundle Sizes
- Frontend: 662KB raw → 182KB gzipped
- Backend: ~50KB code + node_modules

### Database
- Indexes: status, symbol, strategy, confluence_score, date_entry
- Connection pool: 20 max connections
- Query complexity: O(n) for stats calculation (acceptable for < 10k trades)

---

## 🔒 Security Checklist

### MVP (Current - No Auth)
- ✅ CORS enabled for localhost
- ✅ Input validation on all endpoints
- ✅ Error messages don't leak sensitive info
- ❌ No authentication (intended for MVP)
- ❌ No rate limiting (add in Phase 6)

### Before Production
- [ ] Enable CORS only for production domain
- [ ] Add authentication (JWT recommended)
- [ ] Add rate limiting
- [ ] Use HTTPS only
- [ ] Set secure database credentials
- [ ] Enable database backups
- [ ] Add request logging/monitoring

---

## 📝 Troubleshooting

### "Cannot connect to API"
1. Check backend is running: `curl http://localhost:5000/health`
2. Check frontend .env has correct VITE_API_URL
3. Check CORS is not blocking (DevTools → Network → Response headers)

### "Trades not saving to database"
1. Check PostgreSQL is running: `docker ps`
2. Check DATABASE_URL env var is correct
3. Check backend logs for SQL errors
4. Verify trades table exists: `docker exec -it sop10_postgres psql -U trader -d sop10_trader -c "SELECT 1 FROM trades LIMIT 1"`

### "API works but frontend shows no data"
1. Check browser console for errors
2. Check Network tab → Response body
3. Check if data is in localStorage cache
4. Try clearing cache: DevTools → Application → Storage → Clear all

### "Sync not working"
1. Check `sop10_pending_syncs` exists in localStorage
2. Simulate offline: DevTools → Network → Offline
3. Create trade (should mark as pending)
4. Go online: DevTools → Network → Online
5. Watch console for "Syncing X pending trades..."

### "Database migration failed"
1. Check docker container is healthy: `docker compose ps`
2. Check migration SQL syntax: `cat backend/src/db/migrations/001_init_schema.sql`
3. Manually run migration:
   ```bash
   docker exec -i sop10_postgres psql -U trader -d sop10_trader < backend/src/db/migrations/001_init_schema.sql
   ```

---

## 📞 Support Resources

### Key Files
- Backend entry: `/backend/src/server.ts`
- API routes: `/backend/src/routes/`
- Database: `/backend/src/db/`
- Frontend client: `/src/api/tradeClient.ts`
- Service layer: `/src/services/tradeJournalService.ts`

### Documentation
- Phase 5 Implementation: `PHASE5_IMPLEMENTATION.md`
- API Endpoints: See `backend/src/routes/trades.ts`
- Database Schema: `backend/src/db/migrations/001_init_schema.sql`

### Next Steps
1. ✅ Phase 5 complete: Backend + API implemented
2. 🧪 Phase 5 Testing: Manual testing checklist (this document)
3. 🚂 Deployment: Railway setup steps (this document)
4. 📊 Phase 6: Advanced Analytics Dashboard
5. 🔐 Phase 7: Authentication & Security
6. 📱 Phase 8: Mobile app (React Native)

---

**Last Updated**: 2026-05-19
**Status**: Phase 5 Implementation Complete ✅
**Next**: Local Testing & Railway Deployment
