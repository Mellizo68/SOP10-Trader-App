# 🚀 Production Deployment Guide - Paso 6

## Overview

This guide covers deploying the SOP10 Trader App to production using:
- **Frontend**: Vercel (serverless deployment, CDN)
- **Backend**: Railway (containerized Node.js + PostgreSQL)
- **CI/CD**: GitHub Actions (automated testing & deployment)

---

## Prerequisites

Before starting, you'll need:

1. **GitHub Account** - Repository must be pushed to GitHub
2. **Vercel Account** - Free tier available at https://vercel.com
3. **Railway Account** - Free tier available at https://railway.app
4. **API Keys**:
   - `VITE_ANTHROPIC_API_KEY` - Anthropic API key for Claude
   - `FLASHALPHA_API_KEY` - FlashAlpha API key for market data

---

## Step 1: Prepare GitHub Repository

### 1.1 Initialize Git & Push to GitHub

```bash
# If not already initialized
git init
git add .
git commit -m "Initial commit: SOP10 Trader App with complete test suite"

# Create repository on GitHub and push
git remote add origin https://github.com/YOUR_USERNAME/sop10-trader-app.git
git branch -M main
git push -u origin main
```

### 1.2 Verify Files Are Present

Ensure these files are in your repository:
```
✅ .github/workflows/test.yml        - Automated testing
✅ .github/workflows/deploy.yml      - Automated deployment
✅ vercel.json                       - Vercel configuration
✅ railway.json                      - Railway configuration
✅ backend/Dockerfile               - Docker container definition
✅ backend/.dockerignore            - Docker ignore patterns
✅ package.json                     - Frontend dependencies
✅ backend/package.json             - Backend dependencies
```

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Connect GitHub to Vercel

1. Go to https://vercel.com/new
2. Click "Continue with GitHub"
3. Select your `sop10-trader-app` repository
4. Click "Import"

### 2.2 Configure Vercel Project

1. **Framework Preset**: Select "Vite" (should auto-detect)
2. **Build Command**: `npm run build`
3. **Install Command**: `npm install`
4. **Output Directory**: `dist`

### 2.3 Add Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```
Name: VITE_ANTHROPIC_API_KEY
Value: sk-ant-v4-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2.4 Deploy

Click "Deploy" button. Vercel will:
1. Pull your code from GitHub
2. Install dependencies
3. Run build (`npm run build`)
4. Deploy to CDN
5. Assign you a production URL (e.g., `https://sop10-trader-app.vercel.app`)

**Save your Vercel URLs**:
- **Project ID**: Found in Settings → General
- **Org ID**: Found in Settings → Team  (or use default org)
- **Production URL**: Displayed after deployment

---

## Step 3: Deploy Backend to Railway

### 3.1 Create Railway Account & Project

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Connect your `sop10-trader-app` repository

### 3.2 Configure Backend Service

1. In Railway Dashboard, click on your project
2. Click "New Service" → "GitHub Repo"
3. Select your repo, set root directory to `backend`

### 3.3 Add PostgreSQL Database

1. In Railway Dashboard, click "New Service"
2. Select "PostgreSQL"
3. Railway will automatically connect it to your backend service

### 3.4 Configure Environment Variables

In Railway Dashboard → Backend Service → Variables:

```
NODE_ENV=production
PORT=5000
FLASHALPHA_API_KEY=your_api_key_here
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

**Note**: Railway auto-generates `DATABASE_URL` when you add PostgreSQL. Copy it from the PostgreSQL service variables.

### 3.5 Deploy

Railway auto-deploys when you push to `main` branch. You can also manually trigger deployment from the dashboard.

**Save your Railway URLs**:
- **Project ID**: Found in Settings
- **Backend URL**: Shown in Railway dashboard (e.g., `https://backend-production-xxxxx.railway.app`)
- **Service ID**: Found in service settings

---

## Step 4: Connect Frontend to Backend

### 4.1 Update Frontend Configuration

In your frontend `.env.production` file:

```env
VITE_API_URL=https://backend-production-xxxxx.railway.app
VITE_ANTHROPIC_API_KEY=sk-ant-v4-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4.2 Update API Base URL

Make sure your API client uses the environment variable:

```typescript
// src/api/tradeClient.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
```

### 4.3 Redeploy Frontend

Push changes to trigger Vercel redeploy:

```bash
git add .
git commit -m "Configure production API URL"
git push origin main
```

---

## Step 5: Configure GitHub Secrets for CI/CD

### 5.1 Add Vercel Secrets

Go to GitHub → Settings → Secrets and Variables → Actions → New repository secret:

```
VERCEL_TOKEN=<your-vercel-token>
VERCEL_ORG_ID=<your-vercel-org-id>
VERCEL_PROJECT_ID=<your-vercel-project-id>
VITE_ANTHROPIC_API_KEY=sk-ant-v4-xxxxx
```

**To get Vercel tokens**:
- Go to https://vercel.com/account/tokens
- Create new token with "Full Access"
- Copy and paste as `VERCEL_TOKEN`

### 5.2 Add Railway Secrets

```
RAILWAY_TOKEN=<your-railway-api-token>
RAILWAY_PROJECT_ID=<your-railway-project-id>
DATABASE_URL=postgresql://user:password@host:5432/dbname
FLASHALPHA_API_KEY=your_api_key_here
```

**To get Railway tokens**:
- Go to https://railway.app/account/tokens
- Create new API token
- Copy and paste as `RAILWAY_TOKEN`

### 5.3 Verify Secrets

Go to GitHub → Settings → Secrets and verify all secrets are set:
```
✅ VERCEL_TOKEN
✅ VERCEL_ORG_ID
✅ VERCEL_PROJECT_ID
✅ VITE_ANTHROPIC_API_KEY
✅ RAILWAY_TOKEN
✅ RAILWAY_PROJECT_ID
✅ DATABASE_URL
✅ FLASHALPHA_API_KEY
```

---

## Step 6: Test CI/CD Pipeline

### 6.1 Trigger Test Workflow

Create a test branch and open a pull request:

```bash
git checkout -b test/deployment-check
git commit --allow-empty -m "Test CI/CD pipeline"
git push origin test/deployment-check
```

Then create a PR on GitHub. This will:
1. Run all tests (frontend + backend)
2. Build both projects
3. Check Docker build

**Check GitHub Actions**:
- Go to GitHub → Actions
- View workflow results
- All checks should pass ✅

### 6.2 Trigger Deploy Workflow

Merge PR to main:

```bash
git checkout main
git merge test/deployment-check
git push origin main
```

This will automatically:
1. Run all tests
2. Deploy frontend to Vercel
3. Deploy backend to Railway
4. Update production URLs

---

## Step 7: Verify Production Deployment

### 7.1 Test Frontend

1. Open your Vercel production URL
2. Navigate through the app
3. Verify all features work:
   - Market Analysis tab loads
   - Symbol input works
   - Data fetches from backend

### 7.2 Test Backend API

```bash
# Test health check endpoint
curl https://backend-production-xxxxx.railway.app/health

# Test API endpoint
curl https://backend-production-xxxxx.railway.app/api/market/data/SPY
```

### 7.3 Test Database Connection

Backend should automatically connect to Railway PostgreSQL:

```bash
# View logs in Railway Dashboard
# Should see: "✅ Connected to PostgreSQL"
```

---

## Step 8: Monitor Production

### 8.1 Vercel Analytics

Go to Vercel Dashboard → Analytics:
- View page views, response times
- Monitor Core Web Vitals
- Track deployments

### 8.2 Railway Logs

Go to Railway Dashboard → Backend Service → Logs:
- View real-time application logs
- Track errors and requests
- Monitor database connections

### 8.3 GitHub Actions

Go to GitHub → Actions:
- Monitor CI/CD pipeline runs
- Check test results
- Review deployment status

---

## Troubleshooting

### ❌ Frontend Deployment Failed

**Check Vercel Logs**:
```bash
# In Vercel Dashboard → Deployments → [Latest] → Logs
# Look for build errors
```

**Common issues**:
- Missing `VITE_ANTHROPIC_API_KEY` environment variable
- TypeScript compilation errors
- Missing dependencies in `package.json`

### ❌ Backend Deployment Failed

**Check Railway Logs**:
```bash
# In Railway Dashboard → Backend Service → Logs
# Look for startup errors
```

**Common issues**:
- Missing `DATABASE_URL` variable
- Port not exposed correctly
- TypeScript compilation errors
- Missing dependencies in `backend/package.json`

### ❌ Tests Failing in CI/CD

**Check GitHub Actions**:
```bash
# Go to GitHub → Actions → [Latest Workflow Run]
# View test output and stack traces
```

**Common issues**:
- Tests expecting different environment
- Network mocking differences in CI
- Missing environment variables

### ❌ Frontend Can't Connect to Backend

**Check CORS**:
```bash
# Backend should include CORS headers:
# Access-Control-Allow-Origin: https://your-vercel-url
```

**Check Environment Variables**:
```bash
# Frontend must have VITE_API_URL set correctly
# Backend must expose the correct port
```

---

## Post-Deployment Checklist

- [ ] Frontend deployed to Vercel ✅
- [ ] Backend deployed to Railway ✅
- [ ] Database connected and initialized ✅
- [ ] All environment variables configured ✅
- [ ] CI/CD pipeline working ✅
- [ ] Tests passing in production environment ✅
- [ ] Frontend can communicate with backend ✅
- [ ] Monitoring enabled (Vercel + Railway) ✅
- [ ] Custom domain configured (optional) ✅
- [ ] SSL/TLS certificates valid ✅

---

## Next Steps (Paso 6.1+)

After successful deployment:

1. **Monitor Metrics** (1-3 days)
   - Check error rates
   - Monitor response times
   - Track user behavior

2. **Set Up Alerts** 
   - Email alerts for failed deployments
   - Slack integration for monitoring
   - Error tracking (future: Sentry)

3. **Optimize Performance**
   - Analyze slow endpoints
   - Implement caching
   - Optimize database queries

4. **Scaling** (if needed)
   - Upgrade Railway tier for more resources
   - Enable horizontal scaling
   - Add caching layer (Redis)

5. **Future Enhancements**
   - WebSocket real-time updates
   - Advanced retry logic
   - State management across tabs
   - Load testing (k6)
   - Error tracking (Sentry)
   - Structured logging (Winston)

---

## Support

**Vercel Issues**:
- https://vercel.com/support
- https://vercel.com/docs

**Railway Issues**:
- https://railway.app/docs
- https://railway.app/support

**GitHub Actions Issues**:
- https://docs.github.com/en/actions

---

**Status**: Ready for production deployment 🚀
