# 🚂 Railway Deployment Guide - Step by Step

## Prerequisites Check

Before starting, ensure you have:
- ✅ GitHub account (for repo connection)
- ✅ Code pushed to GitHub (main branch)
- ✅ Email address for Railway signup

---

## Step 1: Create Railway Account (5 minutes)

### 1.1 Sign Up
1. Go to **https://railway.app**
2. Click **"Start Building"**
3. Sign up with GitHub (recommended - easier for deployments)
4. Authorize Railway to access your GitHub account
5. Create a new project: **"SOP10 Trader"**

### 1.2 Verify Email
- Check your email for verification link
- Click to confirm

**Result**: You now have a Railway project dashboard

---

## Step 2: Create PostgreSQL Service (5 minutes)

### 2.1 Add Database
1. In Railway dashboard, click **"+ Add"** button
2. Search for **"PostgreSQL"**
3. Click **"PostgreSQL"** in the results
4. Click **"Deploy"** (or similar button)

### 2.2 Wait for Deployment
- Railway will provision a PostgreSQL instance
- Wait 1-2 minutes for "Deployed" status
- You'll see a green checkmark when ready

### 2.3 Get Database Credentials
1. Click on the PostgreSQL service
2. Click **"Variables"** tab
3. You'll see:
   - `DATABASE_URL` (full connection string) - **COPY THIS**
   - `PGHOST`
   - `PGPORT`
   - `PGUSER`
   - `PGPASSWORD`
   - `PGDATABASE`

**Keep these credentials safe** - you'll need them for the backend service.

---

## Step 3: Create Backend Service (10 minutes)

### 3.1 Connect GitHub Repository
1. In Railway dashboard, click **"+ Add"** button
2. Click **"GitHub Repo"** (or "New Service")
3. Search for your repository: **"SOP10-Trader-App"**
4. Click to connect it
5. Select **"Deploy Now"** (or let it auto-deploy)

### 3.2 Configure Service Settings
1. Click on the newly created service
2. Click **"Settings"** or **"Deploy"** tab

### 3.3 Set Environment Variables
1. Click **"Variables"** tab
2. Add these variables:

```
DATABASE_URL = postgresql://[user]:[password]@[host]:5432/[database]
  (Copy the full DATABASE_URL from PostgreSQL service)

NODE_ENV = production

PORT = 5000
```

**How to copy DATABASE_URL:**
- Go to PostgreSQL service → Variables
- Copy the full `DATABASE_URL` value
- Paste it into the backend service variables

### 3.4 Configure Build Settings
1. Click **"Settings"** tab
2. Look for **"Root Directory"** or **"Build Command"**
3. Set:
   - **Root Directory**: `backend` (or leave empty if package.json is at root)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run migrate && npm start`

4. Save changes

### 3.5 Trigger Deployment
- Railway should auto-deploy when you save
- Watch the deployment logs:
  - "Building..." → "Deploying..." → "Deployed" ✅
- This takes 3-5 minutes

**Result**: Backend is deployed and running!

---

## Step 4: Create Frontend Service (10 minutes)

### 4.1 Prepare Frontend for Production
First, update the frontend environment variable:

**File: `.env.production` (create if doesn't exist)**
```bash
VITE_API_URL=https://[your-backend-url]/api
VITE_ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE
```

**Get your backend URL:**
1. Click on the backend service in Railway
2. Click **"Deployments"** tab
3. Look for the URL (something like `https://sop10-trader-backend.railway.app`)
4. Use this for `VITE_API_URL`

### 4.2 Connect Frontend Repo
1. In Railway dashboard, click **"+ Add"** button
2. Click **"GitHub Repo"**
3. Same repository: **"SOP10-Trader-App"**
4. Create a new service for the frontend

### 4.3 Set Environment Variables
1. Click **"Variables"** tab
2. Add:

```
VITE_API_URL = https://[your-backend-url]/api
VITE_ANTHROPIC_API_KEY = sk-ant-YOUR_KEY
```

### 4.4 Configure Build Settings
1. Click **"Settings"** tab
2. Set:
   - **Root Directory**: (leave empty - uses root)
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run preview` or use a static host

3. Or use **Railway Static Build**:
   - Instead of node server, deploy dist/ folder
   - Set **Output Directory**: `dist`
   - This is cheaper and faster

### 4.5 Deploy
- Save settings
- Railway auto-deploys
- Wait 2-3 minutes for completion

**Result**: Frontend is live!

---

## Step 5: Verify Deployments (10 minutes)

### 5.1 Check Backend Health
```bash
# Get backend URL from Railway dashboard
curl https://your-backend.railway.app/health

# Expected response:
# {"status":"ok"}
```

### 5.2 Check API Endpoints
```bash
curl https://your-backend.railway.app/api/trades

# Expected response:
# {"success":true,"data":[],"message":"..."}
```

### 5.3 Test Frontend
1. Go to the frontend URL (from Railway dashboard)
2. You should see the SOP10 Trader App
3. Try creating a trade
4. Verify it appears in the UI
5. Verify it's saved to the database

### 5.4 Database Verification
```bash
# Get database credentials from PostgreSQL service

# Option A: Via psql (if installed locally)
psql "postgresql://user:pass@host:5432/railway"

# Option B: Via Railway CLI
railway shell postgres

# Query:
SELECT id, symbol, entry_price, status FROM trades LIMIT 5;
```

---

## Troubleshooting

### "Build Failed"
1. Check **Deployments** → latest deployment logs
2. Look for error messages
3. Common issues:
   - Missing `.env` variables
   - Wrong root directory
   - Backend path issue

**Fix**: Update **Settings** → **Root Directory** to `backend` (for backend service)

### "Cannot Connect to API"
1. Verify `VITE_API_URL` is correct in frontend
2. Check backend is running (Deployments tab shows "Deployed")
3. Verify database is connected (PostgreSQL shows green)
4. Check backend logs for errors

**Fix**: Go to backend service → **Deployments** → click latest → view logs

### "Database Connection Error"
1. Verify `DATABASE_URL` is set in backend variables
2. Copy fresh `DATABASE_URL` from PostgreSQL service
3. Make sure it's the **full** URL (includes password)

**Fix**: Edit backend service → Variables → update DATABASE_URL

### "Trades Not Saving"
1. Check backend logs: any errors?
2. Verify database connection
3. Check network tab in browser DevTools
4. Verify API request returns success

**Fix**: Check logs and database credentials

---

## Environment Variables Quick Reference

### Backend Service
```
DATABASE_URL = postgresql://user:pass@host:5432/database
NODE_ENV = production
PORT = 5000
```

### Frontend Service
```
VITE_API_URL = https://your-backend-url/api
VITE_ANTHROPIC_API_KEY = sk-ant-YOUR_KEY
```

### How to Get Values
- **DATABASE_URL**: PostgreSQL service → Variables → copy DATABASE_URL
- **Backend URL**: Backend service → Deployments → copy URL
- **Anthropic Key**: https://console.anthropic.com → API Keys

---

## Post-Deployment Checklist

- [ ] Backend service deployed and "Deployed" status ✅
- [ ] PostgreSQL service deployed and "Deployed" status ✅
- [ ] Frontend service deployed and "Deployed" status ✅
- [ ] Backend health check works: `curl /health` ✅
- [ ] API endpoints work: `curl /api/trades` ✅
- [ ] Frontend loads without errors ✅
- [ ] Can create a trade in UI ✅
- [ ] Trade appears in database ✅
- [ ] Environment variables all set ✅
- [ ] No 500 errors in logs ✅

---

## Production Configuration

### Enable Auto-Deploy
1. In Railway dashboard, click **GitHub** settings
2. Enable **"Auto Deploy on Push"**
3. Now changes to `main` branch auto-deploy

### Monitor Deployments
1. Click **"Deployments"** tab on any service
2. View deployment history
3. Click on deployment to see logs
4. Latest at top (most recent)

### View Logs
1. Click **"Logs"** tab on any service
2. Real-time logs appear
3. Helps with debugging

### Backup Database
Railway provides automated backups:
1. PostgreSQL service → **"Backups"** tab
2. Shows daily/weekly backups
3. Can restore from backup if needed

---

## Domain Configuration (Optional)

If you want a custom domain instead of railway.app URL:

### For Frontend
1. Frontend service → **"Settings"**
2. Click **"Domains"** or **"Custom Domain"**
3. Add your custom domain (e.g., `trader.yourdomain.com`)
4. Follow DNS configuration steps

### For Backend
1. Backend service → **"Settings"**
2. Click **"Domains"**
3. Add custom domain (e.g., `api.trader.yourdomain.com`)
4. Follow DNS configuration steps

---

## Cost Information

Railway free tier includes:
- ✅ 512 MB RAM for services
- ✅ 1 GB storage
- ✅ Enough for MVP
- ✅ Pay-as-you-go after ($5/month typical)

**Estimates for small usage:**
- PostgreSQL: ~$5/month
- Backend service: ~$5/month
- Frontend (static): ~$1/month
- **Total**: ~$10-15/month for small-to-medium usage

---

## Next Steps After Deployment

1. ✅ **Test thoroughly** in production
2. Test offline mode (disconnect internet, use app)
3. Test auto-sync (create offline, come back online)
4. Test statistics calculations
5. Test CSV export
6. Share URL with team for feedback

---

## Helpful Commands

### Check Logs (Railway CLI)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# View logs
railway logs --service backend
railway logs --service postgres
```

### Connect to Production Database
```bash
# Via Railway shell
railway shell postgres

# Query trades
SELECT COUNT(*) FROM trades;
SELECT * FROM trades ORDER BY created_at DESC LIMIT 5;
```

### Restart Service
1. In Railway dashboard
2. Click service
3. Click **"⋮"** menu (three dots)
4. Click **"Restart"**

---

## Summary

| Step | Time | Status |
|------|------|--------|
| 1. Create Railway account | 5 min | ⏳ |
| 2. Add PostgreSQL | 5 min | ⏳ |
| 3. Deploy backend | 10 min | ⏳ |
| 4. Deploy frontend | 10 min | ⏳ |
| 5. Verify & test | 10 min | ⏳ |
| **Total** | **40 min** | ⏳ |

---

## Support Resources

- Railway Docs: https://docs.railway.app
- Community: https://railway.app/chat
- Status: https://status.railway.app

---

**You're ready to deploy! 🚀**

Start with Step 1 and follow each step in order.

Questions? Check the logs and troubleshooting section above.

