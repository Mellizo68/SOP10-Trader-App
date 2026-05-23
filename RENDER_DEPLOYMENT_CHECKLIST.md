# Render Backend Deployment Checklist

## Quick Reference Card

### 📋 Pre-Deployment
- [ ] Backend builds locally: `cd backend && npm run build`
- [ ] All changes committed: `git push origin main`
- [ ] GitHub repository accessible
- [ ] Have API keys ready (FlashAlpha, ThetaData)

### 🚀 Render Setup
- [ ] Render.com account created (https://render.com)
- [ ] GitHub connected to Render
- [ ] Repository authorized to connect

### ⚙️ Service Configuration
- [ ] Service Name: `sop10-trader-backend`
- [ ] Region: Selected (US or EU)
- [ ] Branch: `main`
- [ ] Root Directory: `backend`
- [ ] Build Command: `npm install && npm run build`
- [ ] Start Command: `npm run start`
- [ ] Runtime: `Node`
- [ ] Auto-Deploy: `ON`

### 🔑 Environment Variables (in Render)
```
NODE_ENV=production
PORT=8080
LOG_LEVEL=info
FLASH_ALPHA_API_KEY=your_key_here
THETA_DATA_API_KEY=your_key_here
VITE_API_URL=https://sop10-trader-app.vercel.app/api
```

- [ ] All variables entered
- [ ] No typos in variable names
- [ ] API keys correct

### 📦 Deployment
- [ ] Click "Create Web Service"
- [ ] Wait for build to complete (3-5 min)
- [ ] Note the service URL
- [ ] Status shows "Live"

### ✅ Verification
- [ ] Test health endpoint: `curl https://[your-service].onrender.com/health`
- [ ] Test API: `curl https://[your-service].onrender.com/api/symbols?search=SPY`
- [ ] Both return data successfully

### 🔄 Frontend Update
- [ ] Get Render backend URL
- [ ] Update Vercel VITE_API_URL
- [ ] Trigger Vercel redeploy: `git push origin main`

### 🎯 Final Test
- [ ] Visit frontend: https://sop10-trader-app.vercel.app
- [ ] Open Market Analysis tab
- [ ] Search for a symbol
- [ ] See real-time data from backend ✅

---

## 📞 Support Links

- Render Docs: https://render.com/docs
- Deployment Guide: See BACKEND_DEPLOYMENT.md
- Troubleshooting: See BACKEND_DEPLOYMENT.md#troubleshooting

## ⏱️ Timeline

1. **Render Setup**: 5 minutes
2. **Deployment**: 3-5 minutes
3. **Frontend Update**: 2 minutes
4. **Testing**: 5 minutes

**Total**: ~15-20 minutes

---

**Status**: Ready for deployment
**Last Updated**: May 23, 2026
