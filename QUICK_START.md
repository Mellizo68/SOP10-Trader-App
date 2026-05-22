# ⚡ Quick Start Guide - Phase 8, Paso 3

**Last Updated:** May 21, 2026  
**Status:** ✅ COMPLETE AND TESTED

---

## 🚀 Start Servers (2 Terminals)

**Terminal 1 - Backend:**
```bash
cd /Users/bebeto/SOP10-Trader-App/backend
npm run start
```
✅ Backend running on http://localhost:5001

**Terminal 2 - Frontend:**
```bash
cd /Users/bebeto/SOP10-Trader-App
npm run dev
```
✅ Frontend running on http://localhost:3000

---

## 🌐 Test the Integration

1. **Open browser:** http://localhost:3000
2. **Navigate:** Trade Journal → "📊 Market Data" tab
3. **Try:** Enter symbol (SPY, QQQ, TSLA, etc.)
4. **Click:** "Refresh" button
5. **Observe:**
   - GEX card loads (or shows placeholder)
   - Greeks table displays top 5 options
   - Options walls table renders
   - Volume & OI table appears
   - Data auto-refreshes every 10 seconds

---

## 📁 Key Files Location

```
Frontend Components:
  src/hooks/useMarketData.ts
  src/components/TradeJournal/GEXCard.tsx
  src/components/TradeJournal/GreeksTable.tsx
  src/components/TradeJournal/MarketAnalysisTab.tsx

Main Integration:
  src/components/TradeJournal.tsx

Documentation:
  README.md                  (User guide)
  PHASE_8_SUMMARY.md        (Architecture)
  DEPLOYMENT_CHECKLIST.md   (Verification)
```

---

## 🔧 Configuration

**Backend (.env.local):**
```
PORT=5001
NODE_ENV=development
FLASHALPHA_API_KEY=<add-your-key>
```

**Frontend (vite.config.ts):**
```
Proxy: /api/* → http://localhost:5001
Port: 3000
```

---

## ✨ Features Implemented

- ✅ Real-time market data dashboard
- ✅ GEX (Gamma Exposure) visualization
- ✅ Greeks table (Delta, Gamma, Theta, Vega, IV)
- ✅ Options walls display
- ✅ Volume & Open Interest analysis
- ✅ Auto-polling every 10 seconds
- ✅ Manual refresh button
- ✅ Loading/Error states

---

## 🎯 Next Phase (Paso 4)

**Real-time Updates Optimization:**
- [ ] WebSocket integration (optional)
- [ ] Data caching
- [ ] Polling optimization
- [ ] Performance tuning

**Estimated:** 1-2 hours

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 5001 in use | Kill process: `lsof -i :5001` → `kill -9 <PID>` |
| Port 3000 in use | Use: `npm run dev -- --port 3001` |
| API returns empty | Normal without API key - structure is correct |
| TypeScript error | Run: `npm run build` to see details |
| CORS error | Check proxy in vite.config.ts |

---

## 📊 API Endpoint

```
GET /api/market/data/:symbol

Response:
{
  success: true,
  data: {
    symbol: "SPY",
    gex: {...},
    gammaFlip: {...},
    greeks: { count: 0, items: [...] },
    walls: { count: 0, items: [...] },
    volumeOI: { count: 0, items: [...] },
    timestamp: "2026-05-21T..."
  }
}
```

---

## ✅ Testing Checklist

- [ ] Both servers running
- [ ] Market Data tab visible
- [ ] Symbol input works
- [ ] Refresh button functional
- [ ] GEX card displays
- [ ] Greeks table renders
- [ ] Options walls show
- [ ] Volume/OI displays
- [ ] Auto-refresh works (10s)
- [ ] Error states work
- [ ] Loading states show

---

## 📞 Quick Help

**Build frontend:**
```bash
npm run build
```

**Test API directly:**
```bash
curl http://localhost:5001/api/market/data/SPY | jq
```

**Check processes:**
```bash
lsof -i :3000  # Frontend
lsof -i :5001  # Backend
```

**Restart everything:**
```bash
# Kill processes
killall node
# Restart servers in 2 terminals
```

---

## 🎓 Architecture Summary

```
Browser (3000)
    ↓
Frontend (Vite)
    ↓
useMarketData Hook
    ↓
Proxy: /api/* → http://localhost:5001
    ↓
Backend Express API
    ↓
FlashAlpha Integration
    ↓
Market Data Response
    ↓
React Components Display
```

---

**Status: ✅ READY TO USE**

Next phase: Paso 4 (Real-time Optimization)

