# Backend Deployment Guide - SOP10 Trader App

## Overview

The backend is a Node.js/Express.js application that serves API endpoints for the SOP10 Trader App. This guide covers deployment to Render.com (free tier available).

## Why Render?

- ✅ Free tier with up to 100 hours/month
- ✅ Easy GitHub integration
- ✅ Automatic deployments on git push
- ✅ Environment variables support
- ✅ Persistent disk storage (optional)
- ✅ Native Node.js support

## Prerequisites

- Render.com account (https://render.com)
- GitHub repository (already have it)
- API keys for FlashAlpha and ThetaData

## Deployment Steps

### Step 1: Create Render Service

1. Go to https://render.com/dashboard
2. Click "New +" → "Web Service"
3. Select "Deploy from a Git repository"
4. Search and connect your repository (https://github.com/yourusername/SOP10-Trader-App)
5. Select the repo and click "Connect"

### Step 2: Configure Render Service

**Basic Information:**
- Name: `sop10-trader-backend`
- Region: Choose closest to you (e.g., Oregon for US)
- Branch: `main`
- Root Directory: `backend`

**Build & Deploy:**
- Runtime: `Node`
- Build Command: `npm install && npm run build`
- Start Command: `npm run start`

### Step 3: Set Environment Variables

In Render dashboard, go to Environment:

```
NODE_ENV=production
PORT=8080
LOG_LEVEL=info
FLASH_ALPHA_API_KEY=your_flash_alpha_key
THETA_DATA_API_KEY=your_theta_data_key
VITE_API_URL=https://sop10-trader-app.vercel.app/api
```

### Step 4: Deploy

1. Click "Create Web Service"
2. Wait for build to complete (usually 3-5 minutes)
3. Note the service URL (e.g., https://sop10-trader-backend.onrender.com)

### Step 5: Update Frontend Configuration

1. Go to Vercel Dashboard
2. Project Settings → Environment Variables
3. Update `VITE_API_URL` to match Render backend URL:
   ```
   VITE_API_URL=https://sop10-trader-backend.onrender.com/api
   ```
4. Redeploy frontend: `npx vercel --prod`

## Verify Deployment

### Test Backend Health Check

```bash
curl https://sop10-trader-backend.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "uptime": 1234,
  "timestamp": "2024-05-23T20:47:05.000Z"
}
```

### Test API Endpoints

```bash
# Get available symbols
curl https://sop10-trader-backend.onrender.com/api/symbols?search=SPY

# Get expirations
curl https://sop10-trader-backend.onrender.com/api/expirations/SPY

# Get strategies
curl https://sop10-trader-backend.onrender.com/api/backtest/strategies
```

## Logs & Monitoring

### View Logs

In Render dashboard:
1. Select your service
2. Click "Logs" tab
3. View real-time logs

### Enable Sentry Monitoring

1. Get Sentry DSN from https://sentry.io
2. Add to Render environment variables:
   ```
   SENTRY_DSN=your_sentry_dsn
   ```
3. Restart service

## Performance Optimization

### Caching

- Responses are cached with 5-minute TTL
- Add to backend routes as needed:
  ```typescript
  res.set('Cache-Control', 'public, max-age=300');
  ```

### Database Optimization

If using PostgreSQL:
```bash
# Run migrations
npm run migrate

# Check indexes
npm run db:analyze
```

## Troubleshooting

### Build Fails

1. Check build logs in Render dashboard
2. Verify `backend` directory exists
3. Verify `npm run build` works locally

### API Returns 404

1. Verify backend URL in frontend environment variables
2. Check CORS settings in `backend/src/server.ts`
3. Verify routes are registered

### Slow Performance

1. Check API response times in logs
2. Monitor memory usage in Render dashboard
3. Enable caching for frequently accessed data
4. Consider upgrading to Render Pro tier

### Connection Timeouts

1. Check if backend is running: curl health endpoint
2. Verify network connectivity
3. Check CORS headers
4. Increase request timeout in frontend

## Scaling

### Free Tier Limits

- 0.5 GB RAM
- CPU shared
- 100 service hours/month (auto-sleep after)
- 750 free build hours/month

### Pro Tier (if needed)

- $12/month base
- Dedicated resources
- Auto-sleep disabled
- More build hours

## Rollback

If deployment has issues:

1. Go to Render dashboard
2. Select your service
3. Click "Environment"
4. View deployment history
5. Click previous deployment to activate

Or via git:
```bash
git revert <commit-hash>
git push origin main
```

## Database Setup (PostgreSQL)

If using PostgreSQL:

1. In Render dashboard, click "New +" → "PostgreSQL"
2. Configure database
3. Copy connection string
4. Add to backend environment variables:
   ```
   DATABASE_URL=your_connection_string
   ```
5. Run migrations:
   ```bash
   cd backend
   npm run migrate
   ```

## Security Checklist

- ✅ Environment variables set in Render (not in code)
- ✅ API keys secured (FLASH_ALPHA_API_KEY, THETA_DATA_API_KEY)
- ✅ CORS configured properly
- ✅ HTTPS enabled (automatic with Render)
- ✅ Rate limiting enabled
- ✅ Error logging configured (Sentry)
- ✅ Database backups scheduled (if using DB)

## Monitoring & Alerts

### Recommended Setup

1. **Sentry** - Error tracking
2. **Render Alerts** - Deployment failures
3. **Uptime Monitor** - Ping health endpoint every 5 minutes
4. **LogRocket** - Session replay (optional)

## Support

- Render Docs: https://render.com/docs
- Backend README: ../backend/README.md
- Sentry Dashboard: https://sentry.io

---

**Last Updated**: May 23, 2026
**Version**: 1.0.0
