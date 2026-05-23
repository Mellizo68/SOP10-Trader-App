# Deployment Guide - SOP10 Trader App

## Pre-Deployment Checklist

- [ ] Environment variables configured (`.env.local`)
- [ ] Production build passes (`npm run build`)
- [ ] Backend build passes (`cd backend && npm run build`)
- [ ] All tests passing
- [ ] No console.log debug statements
- [ ] API endpoints tested in production mode
- [ ] Git changes committed

## Deploying to Vercel

### Prerequisites
```bash
npm install -g vercel
```

### Step 1: Prepare Repository
```bash
# Ensure everything is committed
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### Step 2: Deploy Frontend + Backend
```bash
# One-time setup (if first time deploying)
vercel

# Subsequent deployments
vercel --prod
```

### Step 3: Configure Environment Variables

In Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add for **Production** environment:
   - `VITE_API_URL` = `https://your-domain.vercel.app/api`
   - `FLASH_ALPHA_API_KEY` = your_key
   - `THETA_DATA_API_KEY` = your_key
   - `NODE_ENV` = `production`
   - `PORT` = `8080`

### Step 4: Configure Build Settings

In Vercel Dashboard → Project Settings → Build & Development:
- **Build Command**: `npm run build && cd backend && npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install && cd backend && npm install && cd ..`

### Step 5: Deploy
```bash
vercel --prod
```

## Monitoring Post-Deployment

### Check Deployment Status
```bash
vercel ls               # List deployments
vercel status          # Current status
vercel logs            # View logs
```

### Verify Endpoints
```bash
# Test API endpoints
curl https://your-domain.vercel.app/health
curl https://your-domain.vercel.app/api/symbols
curl https://your-domain.vercel.app/api/backtest/strategies
```

### Monitor Errors
- Check Vercel dashboard for build/deployment errors
- Check logs for runtime errors
- Monitor Sentry if configured

## Environment Variables for Production

### Frontend (`.env.local`)
```
VITE_API_URL=https://your-domain.vercel.app/api
VITE_LOG_LEVEL=warn
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

### Backend
Set in Vercel Environment Variables:
- `NODE_ENV=production`
- `PORT=8080`
- `LOG_LEVEL=info`
- `FLASH_ALPHA_API_KEY=xxxxx`
- `THETA_DATA_API_KEY=xxxxx`
- `DB_HOST=your-db-host` (if using DB)
- `SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id`

## Troubleshooting

### Build Fails
1. Check Vercel build logs
2. Verify all environment variables are set
3. Test locally: `npm run build`
4. Check for TypeScript errors: `npx tsc --noEmit`

### API Returns 404
1. Verify environment variables are set correctly
2. Check backend build: `cd backend && npm run build`
3. Verify routes are registered in `backend/src/server.ts`

### Frontend Can't Connect to API
1. Verify `VITE_API_URL` is correct in Vercel
2. Check CORS settings in backend
3. Verify frontend is making requests to `/api/*`

### Slow Performance
1. Check API response times
2. Enable caching for API responses
3. Monitor bundle size in Vercel dashboard
4. Review CloudFlare settings if using CDN

## Rollback

If deployment has issues:

```bash
# List previous deployments
vercel ls

# Rollback to previous deployment
vercel rollback <deployment-url>

# Or deploy again with fixes
git fix-issue && git push && vercel --prod
```

## Database Migration (if using PostgreSQL)

For production database:
```bash
cd backend
npm run migrate
```

## Performance Optimization

### Frontend
- Enable gzip compression (default in Vercel)
- Tree-shake unused code (Vite does this)
- Monitor bundle size

### Backend
- Use compression middleware (enabled)
- Enable caching for API responses
- Monitor database query performance

## Security Best Practices

1. **Environment Variables**: Never commit `.env` files
2. **API Keys**: Use Vercel secrets for sensitive data
3. **CORS**: Restrict to known origins
4. **Logging**: Use structured logging (Winston)
5. **Updates**: Keep dependencies updated

## Monitoring & Alerts

### Recommended Setup
1. Sentry for error tracking
2. Vercel Analytics for performance
3. CloudFlare for DDoS protection
4. LogRocket for session replay (optional)

## Support

For deployment issues:
- Check Vercel documentation: https://vercel.com/docs
- Check Sentry dashboard for errors
- Review backend logs: `vercel logs`

---

**Last Updated**: May 23, 2026
**Version**: 1.0.0
