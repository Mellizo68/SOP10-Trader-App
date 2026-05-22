# Phase 7: Monitoring & Observability - Implementation Guide

## ✅ Status: Implementation Complete (Awaiting Sentry Configuration)

This document details the complete implementation of Phase 7: Monitoring & Observability for the SOP10 Trader App production environment.

---

## 📋 Executive Summary

Phase 7 implements production-grade monitoring infrastructure across frontend and backend:

- **Structured Logging**: Winston JSON logging with file persistence
- **Error Tracking**: Sentry integration for automatic error capture
- **Performance Monitoring**: Request latency tracking and percentile calculations
- **Health Checks**: Database connectivity and system health endpoints
- **Metrics Collection**: Per-endpoint statistics and Prometheus compatibility
- **Error Boundaries**: React error boundaries with graceful error UI
- **Offline Detection**: Online/offline status detection with user notification

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + TypeScript)            │
├─────────────────────────────────────────────────────────────┤
│ • ErrorBoundary (catches React errors)                      │
│ • Sentry Integration (sends errors & performance metrics)   │
│ • OfflineIndicator (displays offline status)               │
│ • useOnlineStatus Hook (detects online/offline)            │
└────────────┬────────────────────────────────────────────────┘
             │ HTTP Requests
             ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend (Express + TypeScript)              │
├─────────────────────────────────────────────────────────────┤
│ Request Pipeline:                                            │
│ 1. requestLogger → Logs request, generates correlation ID   │
│ 2. Sentry Handler → Captures request context                │
│ 3. sentryErrorHandler → Captures 5xx errors                 │
│ 4. errorHandler → Final error formatting                    │
│                                                              │
│ Endpoints:                                                   │
│ • /health → Enhanced health check with metrics              │
│ • /metrics → JSON metrics export                            │
│ • /metrics/prometheus → Prometheus-compatible format        │
│                                                              │
│ Data Flow:                                                   │
│ • Requests → requestLogger → MetricsCollector               │
│ • Errors → sentryErrorHandler → Sentry DSN                 │
│ • Logs → logger → Console + File (JSON)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Files Created

### Backend Files

#### Utilities
- **`backend/src/utils/logger.ts`** (NEW)
  - Winston logger configuration
  - JSON structured logging format
  - Console and file transports
  - Log file rotation (5MB max, 5 files)
  - Log levels: error, warn, info, debug, verbose

- **`backend/src/utils/sentry.ts`** (NEW)
  - Sentry initialization function
  - Error tracking configuration
  - HTTP tracing integration
  - Environment detection (production vs development)

- **`backend/src/utils/metrics.ts`** (NEW)
  - MetricsCollector class for performance tracking
  - Per-request duration recording
  - Percentile calculations (p50, p95, p99)
  - Per-endpoint metrics aggregation
  - Health status determination (healthy/degraded/unhealthy)

#### Middleware
- **`backend/src/middleware/requestLogger.ts`** (MODIFIED)
  - HTTP request logging with correlation IDs
  - UUID v4 for correlation ID generation
  - Request/response metadata logging
  - Metrics recording integration
  - Error type classification (timeout, rateLimit, validation, server)

- **`backend/src/middleware/sentryErrorHandler.ts`** (NEW)
  - Sentry error capture middleware
  - 4xx vs 5xx error differentiation
  - Error context enrichment (URL, method, IP)
  - Automatic error reporting to Sentry DSN

#### Controllers
- **`backend/src/controllers/healthController.ts`** (NEW)
  - Enhanced health check endpoint
  - Detailed metrics response
  - Prometheus metrics export format
  - Memory usage tracking
  - Request statistics

#### Application
- **`backend/src/app.ts`** (MODIFIED)
  - Added health check routes
  - Integrated Sentry middleware
  - Added metrics endpoints

- **`backend/src/server.ts`** (MODIFIED)
  - Sentry initialization on startup
  - Logger integration for startup messages

### Frontend Files

#### Utilities
- **`src/utils/sentry.ts`** (NEW)
  - Sentry React initialization
  - BrowserTracing integration
  - Session replay configuration
  - Sample rates (10% sessions, 100% error replays)

#### Components
- **`src/components/ErrorBoundary.tsx`** (NEW)
  - React Error Boundary component
  - Sentry error capture integration
  - User-friendly error UI
  - Home and retry buttons
  - Development error details display

- **`src/components/OfflineIndicator.tsx`** (NEW)
  - Offline status indicator banner
  - Visual notification system
  - Helpful offline messages

#### Hooks
- **`src/hooks/useOnlineStatus.ts`** (NEW)
  - Browser online/offline detection
  - Window event listeners
  - Automatic state synchronization

#### Application
- **`src/main.tsx`** (MODIFIED)
  - Sentry initialization before app render
  - ErrorBoundary wrapper around entire app

- **`src/App.tsx`** (MODIFIED)
  - OfflineIndicator component integration
  - Online/offline UI awareness

---

## 🔧 Configuration Guide

### Step 1: Create Sentry Account

1. Visit [https://sentry.io](https://sentry.io)
2. Sign up for a free account
3. Create two projects:
   - **SOP10 Trader Backend** (Node.js platform)
   - **SOP10 Trader Frontend** (JavaScript/React platform)

### Step 2: Get DSNs

After creating projects, you'll receive two DSNs:
- Backend DSN: `https://[key]@[org].ingest.sentry.io/[projectId]`
- Frontend DSN: `https://[key]@[org].ingest.sentry.io/[projectId]`

### Step 3: Configure Environment Variables

#### Backend (.env.production)
```env
SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[projectId]
LOG_LEVEL=info
NODE_ENV=production
```

#### Frontend (.env.production)
```env
VITE_SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[projectId]
VITE_MODE=production
```

### Step 4: Deploy Configuration

#### Railway (Backend)
In Railway dashboard:
1. Go to project settings
2. Environment variables section
3. Add `SENTRY_DSN` with the backend DSN value

#### Vercel (Frontend)
In Vercel project settings:
1. Environment variables section
2. Add `VITE_SENTRY_DSN` with the frontend DSN value
3. Ensure it's available for production deployments

### Step 5: Install Dependencies

```bash
# Frontend
npm install

# Backend
npm install
```

---

## 📊 Available Endpoints

### Health Check
```
GET /health

Response (200):
{
  "status": "ok",
  "health": "healthy" | "degraded" | "unhealthy",
  "timestamp": "2026-05-22T14:30:00Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0",
  "metrics": {
    "totalRequests": 1523,
    "successfulRequests": 1511,
    "failedRequests": 12,
    "timeouts": 8,
    "rateLimitErrors": 4,
    "avgResponseTime": 145,
    "p95ResponseTime": 456,
    "p99ResponseTime": 892
  },
  "memoryUsage": {
    "heapUsedMB": 45,
    "heapTotalMB": 128,
    "externalMB": 2,
    "rssMB": 89
  }
}
```

### Metrics (JSON)
```
GET /metrics

Response (200):
{
  "timestamp": "2026-05-22T14:30:00Z",
  "uptime": 3600,
  "requests": {
    "total": 1523,
    "successful": 1511,
    "failed": 12,
    "successRate": "99.21%"
  },
  "errors": {
    "timeouts": 8,
    "rateLimitErrors": 4,
    "validationErrors": 2
  },
  "performance": {
    "avgResponseTime": "145ms",
    "p50ResponseTime": "120ms",
    "p95ResponseTime": "456ms",
    "p99ResponseTime": "892ms"
  },
  "memory": {
    "heapUsedMB": 45,
    "heapTotalMB": 128,
    "externalMB": 2,
    "rssMB": 89
  },
  "endpoints": [
    {
      "path": "/api/market/data/:symbol",
      "method": "GET",
      "requests": 523,
      "successCount": 511,
      "errorCount": 12,
      "successRate": "97.71%"
    }
  ]
}
```

### Prometheus Metrics
```
GET /metrics/prometheus

Response (200):
# HELP sop10_trader_requests_total Total number of HTTP requests
# TYPE sop10_trader_requests_total counter
sop10_trader_requests_total{status="total"} 1523
sop10_trader_requests_total{status="success"} 1511
sop10_trader_requests_total{status="error"} 12

# HELP sop10_trader_errors Error counts by type
# TYPE sop10_trader_errors counter
sop10_trader_errors{type="timeout"} 8
sop10_trader_errors{type="rate_limit"} 4
sop10_trader_errors{type="validation"} 2

# HELP sop10_trader_response_time_ms Response time in milliseconds
# TYPE sop10_trader_response_time_ms gauge
sop10_trader_response_time_ms{percentile="avg"} 145
sop10_trader_response_time_ms{percentile="p50"} 120
sop10_trader_response_time_ms{percentile="p95"} 456
sop10_trader_response_time_ms{percentile="p99"} 892
```

---

## 🔍 Monitoring Dashboard

### Sentry Dashboard Features

1. **Issue Tracking**
   - Automatic error capture from frontend and backend
   - Stack traces with source maps
   - Error frequency and trends
   - Affected users and sessions

2. **Performance Monitoring**
   - Request latency tracking
   - Transaction waterfall diagrams
   - Database query performance
   - Custom metrics

3. **Alerts & Notifications**
   - Error rate threshold alerts
   - Performance regression alerts
   - New issue notifications
   - Digest emails with weekly summaries

4. **Release Tracking**
   - Associate errors with releases
   - Track deployments
   - Compare error rates across versions

### Setting Up Alerts

1. In Sentry dashboard, go to Alerts
2. Create alert rule for:
   - **High Error Rate**: If 10% of transactions fail
   - **High Latency**: If p95 latency exceeds 1 second
   - **High Timeout Rate**: If timeout errors exceed 5%
3. Configure notification channels (email, Slack, etc.)

---

## 📈 Key Metrics Explained

### Request Metrics
- **Total Requests**: Count of all HTTP requests processed
- **Successful Requests**: Requests with 2xx/3xx status codes
- **Failed Requests**: Requests with 4xx/5xx status codes
- **Success Rate**: Percentage of successful requests

### Error Metrics
- **Timeouts**: Requests that exceeded time limit
- **Rate Limit Errors**: 429 status responses
- **Validation Errors**: 4xx status responses (client errors)
- **Server Errors**: 5xx status responses

### Performance Metrics
- **Avg Response Time**: Average request duration
- **P50 Response Time**: Median response time (50th percentile)
- **P95 Response Time**: 95th percentile response time
- **P99 Response Time**: 99th percentile response time

### Health Status
- **Healthy**: < 10% error rate, < 5% timeout rate
- **Degraded**: 10-20% error rate or 5-10% timeout rate
- **Unhealthy**: > 20% error rate or > 10% timeout rate

---

## 🧪 Testing Monitoring

### Test Frontend Error Tracking

1. Add test error button to App:
```typescript
<button onClick={() => {
  throw new Error('Test error from frontend')
}}>
  Test Error
</button>
```

2. Click button and verify:
   - Error appears in Sentry dashboard
   - Error message includes stack trace
   - Source maps resolve code locations

### Test Backend Error Tracking

1. Create test endpoint:
```bash
curl http://localhost:5000/test-error
```

2. Verify error:
   - Error logged to console
   - Error appears in logs/error.log
   - Error appears in Sentry dashboard

### Test Health Endpoints

```bash
# Health check
curl http://localhost:5000/health

# Metrics
curl http://localhost:5000/metrics

# Prometheus metrics
curl http://localhost:5000/metrics/prometheus
```

### Test Offline Detection

1. Open app in browser
2. Go to DevTools > Network tab
3. Enable "Offline" mode
4. Verify offline banner appears
5. Disable offline mode
6. Verify banner disappears

---

## 🚀 Deployment Checklist

- [ ] Create Sentry account and projects
- [ ] Generate backend and frontend DSNs
- [ ] Add SENTRY_DSN to backend/.env.production
- [ ] Add VITE_SENTRY_DSN to .env.production
- [ ] Add SENTRY_DSN to Railway environment variables
- [ ] Add VITE_SENTRY_DSN to Vercel environment variables
- [ ] Install dependencies (npm install in both directories)
- [ ] Build frontend: `npm run build`
- [ ] Build backend: `npm run build`
- [ ] Test health endpoints respond correctly
- [ ] Test error tracking with test errors
- [ ] Configure Sentry alerts and notification channels
- [ ] Document monitoring dashboard access for team
- [ ] Set up dashboards in Sentry for important metrics
- [ ] Configure log retention policy in Sentry
- [ ] Set up source maps upload for releases

---

## 📚 Files Modified Summary

### Backend Changes
- `backend/src/server.ts` - Added Sentry init and logger
- `backend/src/app.ts` - Added health routes and Sentry middleware
- `backend/src/middleware/requestLogger.ts` - Added metrics recording
- `backend/src/middleware/errorHandler.ts` - Enhanced error logging
- `backend/src/api/flashalpha-client.ts` - Replaced console with logger
- `backend/src/controllers/marketController.ts` - Replaced console with logger

### Frontend Changes
- `src/main.tsx` - Added Sentry init and ErrorBoundary
- `src/App.tsx` - Added OfflineIndicator component
- `src/api/tradeClient.ts` - Integrated with Sentry

### Configuration Files
- `backend/package.json` - Added @sentry/node, @sentry/tracing, winston
- `package.json` - Added @sentry/react, @sentry/tracing
- `backend/.env.example` - Added SENTRY_DSN and LOG_LEVEL
- `.env.example` - Added VITE_SENTRY_DSN

---

## ⚠️ Important Notes

1. **Source Maps**: Upload source maps to Sentry for better error tracking
   ```bash
   npm install -g @sentry/cli
   sentry-cli releases files upload-sourcemaps ./dist
   ```

2. **Privacy**: Mask sensitive data in Sentry:
   - Credit card numbers
   - API keys
   - Passwords
   - Configure in Sentry > Project Settings > Data Scrubbing

3. **Log Retention**: Keep logs for at least 30 days
   - File logs: Automatic rotation after 5 files
   - Sentry: Configure retention in project settings

4. **Performance**: Sentry sampling rates balance accuracy with cost
   - Current: 10% session replay, 100% error replay
   - Adjust based on traffic volume

---

## 🔗 Useful Links

- [Sentry Documentation](https://docs.sentry.io/)
- [Winston Logger](https://github.com/winstonjs/winston)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Prometheus Metrics](https://prometheus.io/)
- [MCP Best Practices](https://modelcontextprotocol.io/)

---

## 📞 Support & Troubleshooting

### Sentry Not Capturing Errors
1. Verify DSN is correct
2. Check `initSentry()` is called before app render
3. Verify network requests to Sentry endpoint are not blocked
4. Check browser console for initialization errors

### Health Endpoint Returns 503
1. Check database connectivity
2. Review logs for connection errors
3. Verify database credentials in environment variables

### Prometheus Metrics Not Showing
1. Verify metrics endpoint is accessible
2. Check Prometheus scrape configuration
3. Verify metric names match Prometheus naming conventions

### Offline Banner Not Appearing
1. Check browser supports online/offline events
2. Verify `useOnlineStatus` hook is called
3. Check OfflineIndicator component is mounted

---

**Phase 7 Implementation Complete! 🎉**

Next: Deploy with Sentry configuration and monitor production.
