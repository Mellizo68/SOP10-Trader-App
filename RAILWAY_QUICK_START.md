# 🚀 Railway Deployment - Quick Start Checklist

## Before You Start
- [ ] GitHub account ready
- [ ] Code pushed to GitHub (main branch)
- [ ] Have your Anthropic API key ready

---

## Phase 1: Railway Setup (5 min)

- [ ] Go to https://railway.app
- [ ] Click "Start Building"
- [ ] Sign up with GitHub
- [ ] Verify email
- [ ] Create project: "SOP10 Trader"

**✅ You have a Railway project dashboard**

---

## Phase 2: PostgreSQL Database (5 min)

- [ ] Click "+ Add" in Railway dashboard
- [ ] Search for "PostgreSQL"
- [ ] Click "Deploy"
- [ ] Wait for "Deployed" status (1-2 min)
- [ ] Click PostgreSQL service
- [ ] Click "Variables" tab
- [ ] **COPY the `DATABASE_URL` value** (save for later)

**✅ Database is ready**

---

## Phase 3: Backend Service (10 min)

- [ ] Click "+ Add" in Railway dashboard
- [ ] Click "GitHub Repo"
- [ ] Select "SOP10-Trader-App"
- [ ] Create service (let it auto-deploy)
- [ ] Wait for "Deployed" status
- [ ] Click on the backend service
- [ ] Click "Settings" tab
- [ ] Find "Root Directory" → set to `backend`
- [ ] Click "Variables" tab
- [ ] Add these variables:
  - [ ] `DATABASE_URL` = (paste the value from PostgreSQL)
  - [ ] `NODE_ENV` = `production`
  - [ ] `PORT` = `5000`
- [ ] Save and wait for redeploy (2-3 min)
- [ ] Click on backend service
- [ ] Click "Deployments" tab
- [ ] **COPY the Backend URL** (looks like https://sop10-trader-backend.railway.app)

**✅ Backend is live**

---

## Phase 4: Frontend Service (10 min)

### Step 1: Prepare Code
- [ ] In your editor, create `.env.production` file in root:
  ```
  VITE_API_URL=https://YOUR-BACKEND-URL/api
  VITE_ANTHROPIC_API_KEY=sk-ant-YOUR_KEY
  ```
  (Replace YOUR-BACKEND-URL with the URL you copied above)

- [ ] Save the file
- [ ] Commit and push to GitHub:
  ```bash
  git add .env.production
  git commit -m "Add production environment variables"
  git push origin main
  ```

### Step 2: Deploy to Railway
- [ ] Click "+ Add" in Railway dashboard
- [ ] Click "GitHub Repo"
- [ ] Select "SOP10-Trader-App"
- [ ] Create new service (frontend)
- [ ] Click "Variables" tab
- [ ] Add:
  - [ ] `VITE_API_URL` = https://YOUR-BACKEND-URL/api
  - [ ] `VITE_ANTHROPIC_API_KEY` = sk-ant-YOUR_KEY
- [ ] Click "Settings" tab
- [ ] Set Output Directory to `dist`
- [ ] Save and wait for deploy (2-3 min)
- [ ] Click "Deployments" tab
- [ ] **COPY the Frontend URL** when "Deployed" ✅

**✅ Frontend is live**

---

## Phase 5: Verification (5 min)

### Test Backend API
```bash
# Replace with your actual backend URL
curl https://YOUR-BACKEND-URL/health

# Should return: {"status":"ok"}
```

### Test Frontend
- [ ] Open the frontend URL in browser
- [ ] You should see the SOP10 Trader App
- [ ] Navigate to Trade Journal
- [ ] Try creating a trade:
  - [ ] Fill in symbol (e.g., "SPY")
  - [ ] Fill in entry price (e.g., "450")
  - [ ] Click "Create"
- [ ] Trade should appear in the table
- [ ] Verify no errors in browser console (F12)

### Test Database
```bash
# Optional: Connect to database and verify data was saved
# You can use Railway CLI or any PostgreSQL client
```

**✅ Everything works!**

---

## Done! 🎉

Your app is now live in production!

### URLs You'll Need
- Frontend: https://your-frontend.railway.app
- Backend API: https://your-backend.railway.app/api
- Health Check: https://your-backend.railway.app/health

### Share These
- Frontend URL: You can share with anyone
- Backend URL: Keep for reference, frontend uses it automatically

---

## Troubleshooting Quick Fixes

### "Backend not connecting"
1. Check backend URL in frontend `.env.production`
2. Make sure you copied the full URL
3. Refresh the browser

### "Database error"
1. Check `DATABASE_URL` is set in backend Variables
2. Make sure it's the **full** URL with password
3. Restart the backend service

### "Build failed"
1. Check Deployments logs
2. Make sure `.env.production` has correct syntax
3. Verify root directory is set to `backend` for backend service

### "Trades not saving"
1. Check browser network tab (F12)
2. Verify API response is successful
3. Check backend logs for errors

---

## What Happens Next (Automatic)

✅ Railway auto-deploys on every git push to main  
✅ Database backs up automatically  
✅ Logs are saved for debugging  
✅ Services restart if they crash  

---

## Reference

**Full Guide**: See `RAILWAY_DEPLOYMENT_GUIDE.md` for detailed instructions  
**Technical Docs**: See `PHASE5_IMPLEMENTATION.md` for API details  
**Testing Guide**: See `PHASE5_TESTING_DEPLOYMENT.md` for more testing

---

**Time to Deploy**: ~40 minutes ⏱️**

Go to https://railway.app and start with Step 1! 🚀

