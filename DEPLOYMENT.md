# Deployment Guide - SOP10 Trader App

## 📋 Overview

The SOP10 Trader App uses a **two-service deployment architecture**:

1. **Frontend** → Vercel (React + TypeScript + Vite)
2. **Backend** → Render (Node.js + Express)

This provides optimal performance, scalability, and cost efficiency.

## 🚀 Quick Start

### Prerequisites
- Vercel account (https://vercel.com)
- Render account (https://render.com)
- GitHub repository access
- API keys for FlashAlpha and ThetaData

### Current Status

✅ **Frontend**: Deployed to Vercel at https://sop10-trader-app.vercel.app

⏳ **Backend**: Needs deployment to Render

## 📦 Frontend Deployment (Vercel)

### Already Completed ✅

The frontend is already deployed to Vercel:
- URL: https://sop10-trader-app.vercel.app
- Build: Automatic on git push to main
- Status: Ready

### Subsequent Deployments

```bash
# Deploy with git push (auto-deploys)
git push origin main

# Or manual deployment
npx vercel --prod
```

## 🔧 Backend Deployment (Render)

The backend still needs to be deployed. Follow the **complete guide** in:

📄 **[BACKEND_DEPLOYMENT.md](./BACKEND_DEPLOYMENT.md)**

Quick steps:
1. Create Render service from GitHub repo
2. Set backend root directory to `backend/`
3. Configure environment variables
4. Deploy
5. Update frontend VITE_API_URL to point to Render backend

## 📊 Environment Variables

### Frontend (Vercel)

In Vercel Dashboard → Environment Variables:
```
VITE_API_URL=https://sop10-trader-backend.onrender.com/api
VITE_LOG_LEVEL=warn
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

### Backend (Render)

In Render Dashboard → Environment:
```
NODE_ENV=production
PORT=8080
LOG_LEVEL=info
FLASH_ALPHA_API_KEY=your_flash_alpha_key
THETA_DATA_API_KEY=your_theta_data_key
VITE_API_URL=https://sop10-trader-app.vercel.app/api
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

## ✅ Verification

### Test Frontend

```bash
curl https://sop10-trader-app.vercel.app
# Should return HTML with React app
```

### Test Backend (after deployment)

```bash
# Health check
curl https://sop10-trader-backend.onrender.com/health

# Get symbols
curl https://sop10-trader-backend.onrender.com/api/symbols?search=SPY

# Get strategies
curl https://sop10-trader-backend.onrender.com/api/backtest/strategies
```

## 🔄 Monitoring

### Vercel (Frontend)

1. Dashboard: https://vercel.com/dashboard
2. View deployments, build logs, analytics
3. Set up alerts for deployment failures

### Render (Backend)

1. Dashboard: https://dashboard.render.com
2. View service logs, CPU/memory usage
3. Configure alerts and notifications

## 🐛 Troubleshooting

### Frontend can't connect to API

1. Check `VITE_API_URL` is set correctly in Vercel
2. Verify backend is running on Render
3. Check CORS settings in backend
4. Use browser DevTools to see actual request URL

### Backend deployment fails

See [BACKEND_DEPLOYMENT.md](./BACKEND_DEPLOYMENT.md#troubleshooting)

### API returns 404

1. Verify VITE_API_URL ends with `/api`
2. Check frontend is making requests to correct path
3. Verify backend routes are registered

## 🔄 Updating Deployments

### Frontend Updates

```bash
# Make changes and push
git commit -am "Update feature"
git push origin main
# Auto-deploys to Vercel
```

### Backend Updates

```bash
# Make changes to backend/
git commit -am "Update API"
git push origin main
# Auto-deploys to Render
```

## 📈 Performance Optimization

### Frontend
- ✅ Gzip compression (Vercel default)
- ✅ Tree-shaking (Vite default)
- ✅ Code splitting by route
- Monitor bundle size in Vercel dashboard

### Backend
- ✅ Response caching (5-min TTL)
- ✅ Compression middleware enabled
- ✅ Error tracking via Sentry
- Monitor response times in Render logs

## 🔐 Security

✅ Environment variables secure (not in code)
✅ API keys stored in Render secrets
✅ HTTPS enforced (automatic)
✅ CORS configured
✅ Error logging enabled
✅ Rate limiting enabled

## 💰 Cost

### Vercel (Frontend)
- Free tier: Unlimited deployments, good for this use case
- Hobby: $20/month (if needed)

### Render (Backend)
- Free tier: 100 service hours/month, auto-sleep
- Pro: $12/month for dedicated resources

## 📚 Resources

- [Vercel Docs](https://vercel.com/docs)
- [Render Docs](https://render.com/docs)
- [Backend Deployment Guide](./BACKEND_DEPLOYMENT.md)
- [README](./README.md)

---

**Frontend Status**: ✅ Deployed
**Backend Status**: ⏳ Pending
**Last Updated**: May 23, 2026
**Version**: 2.0.0
