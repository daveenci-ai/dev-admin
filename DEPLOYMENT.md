# 🚀 Deployment Guide

## Environment Variables Required

### **Critical (App won't start without these):**
```bash
DATABASE_URL="postgresql://username:password@host:5432/database"
NEXTAUTH_URL="https://dev-admin.daveenci.ai"
NEXTAUTH_SECRET="your-32-character-secret-key-here"
```

### **AI Features (needed for full functionality):**
```bash
GEMINI_API_KEY="your-gemini-api-key"
REPLICATE_API_TOKEN="your-replicate-token"
```

### **Optional:**
```bash
GITHUB_REPO="daveenci-ai/daveenci-ai-avatar"
GITHUB_TOKEN="your-github-token"
NODE_ENV="production"
```

## 🔧 Troubleshooting 502 Errors

### Step 1: Check Environment Variables
Ensure all required variables are set in your hosting platform.

### Step 2: Database Setup
```bash
# Run these commands in your deployment environment
npx prisma generate
npx prisma db push
```

### Step 3: Build Check
```bash
# Test local build
npm run build
npm start
```

### Step 4: Logs Check
Look for these common errors:
- "Cannot find module" - Missing dependencies
- "Database connection failed" - DATABASE_URL issue
- "NEXTAUTH_SECRET" - Missing auth secret
- "Prisma Client" - Database not initialized

## 🛠️ Platform-Specific Setup

### Vercel
1. Add environment variables in Vercel dashboard
2. Ensure database is accessible from Vercel
3. Redeploy after adding variables

### Render
1. Set environment variables in service settings
2. Use internal database URL if using Render PostgreSQL
3. Enable auto-deploy from GitHub

### Railway
1. Add variables in Railway dashboard
2. Connect PostgreSQL plugin
3. Use ${{DATABASE_URL}} format

## 🚨 Quick Fixes

### If you're getting 502s right now:
1. **Add NEXTAUTH_SECRET** (most common cause)
2. **Check DATABASE_URL** format
3. **Ensure Prisma is generated** in build process
4. **Check build logs** for specific errors

### Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

## 📞 Need Help?
Check your deployment platform's logs for specific error messages and share them for targeted troubleshooting.