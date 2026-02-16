# Render Deployment Guide - Freediving.ph

This guide will walk you through deploying your freediving.ph application to Render.com using the Blueprint configuration.

## Prerequisites

- [ ] Render.com account created
- [ ] GitHub repository connected to Render
- [ ] Environment variables prepared (see `env.render.example`)
- [ ] Database migration scripts ready

## Deployment Methods

### Method 1: Blueprint Deployment (Recommended)

This method deploys all services at once using the `render.yaml` configuration.

#### Step 1: Prepare Your Repository

1. **Ensure all files are committed and pushed to GitHub:**
   ```bash
   git add .
   git commit -m "Add Render deployment configuration"
   git push origin main
   ```

2. **Verify the following files exist:**
   - `render.yaml` (root directory)
   - `app/render.yaml` (frontend config)
   - `api/render.yaml` (backend config)
   - `env.render.example` (environment template)

#### Step 2: Deploy via Render Dashboard

1. **Go to Render Dashboard:**
   - Visit [render.com](https://render.com)
   - Sign in to your account

2. **Create New Blueprint:**
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Select the `freediving.ph` repository
   - Render will automatically detect the `render.yaml` file

3. **Review Configuration:**
   - Render will show all 3 services: Database, API, and Frontend
   - Review the configuration before deploying

4. **Set Environment Variables:**
   - Click on each service to configure environment variables
   - Use the values from your `env.render.example` file
   - **Important:** Set `sync: false` for sensitive variables

#### Step 3: Deploy Services

1. **Deploy Database First:**
   - Click "Create PostgreSQL" for the database service
   - Wait for it to be "Available"

2. **Deploy API:**
   - Click "Create Web Service" for the API
   - Wait for successful deployment

3. **Deploy Frontend:**
   - Click "Create Web Service" for the frontend
   - Wait for successful deployment

### Method 2: Individual Service Deployment

If you prefer to deploy services individually:

#### Deploy Database

1. **Create PostgreSQL Service:**
   - Go to Render Dashboard
   - Click "New +" → "PostgreSQL"
   - Name: `freediving-ph-db`
   - Plan: Starter ($7/month)
   - Region: Oregon
   - Click "Create Database"

#### Deploy API

1. **Create Web Service:**
   - Click "New +" → "Web Service"
   - Connect GitHub repository
   - Select `freediving.ph` repository
   - Root Directory: `api`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Plan: Starter ($7/month)

2. **Configure Environment Variables:**
   ```
   NODE_ENV=production
   PORT=10000
   DATABASE_URL=[from database service]
   CLERK_SECRET_KEY=[your key]
   CLERK_PUBLISHABLE_KEY=[your key]
   CLERK_WEBHOOK_SECRET=[your key]
   AWS_ACCESS_KEY_ID=[your key]
   AWS_SECRET_ACCESS_KEY=[your key]
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=[your bucket]
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=[your email]
   EMAIL_PASS=[your password]
   EMAIL_FROM=noreply@freediving.ph
   CORS_ORIGIN=https://freediving-ph-app.onrender.com
   ```

#### Deploy Frontend

1. **Create Web Service:**
   - Click "New +" → "Web Service"
   - Connect GitHub repository
   - Select `freediving.ph` repository
   - Root Directory: `app`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Plan: Starter ($7/month)

2. **Configure Environment Variables:**
   ```
   NODE_ENV=production
   PORT=10000
   NEXT_PUBLIC_API_URL=https://freediving-ph-api.onrender.com
   NEXT_PUBLIC_APP_URL=https://freediving-ph-app.onrender.com
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=[your key]
   CLERK_SECRET_KEY=[your key]
   GOOGLE_MAPS_API_KEY=[your key]
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=[your key]
   ```

## Post-Deployment Setup

### 1. Database Migration

Once your API is deployed, you need to run database migrations:

1. **Access your API service in Render Dashboard**
2. **Go to the "Shell" tab**
3. **Run migration commands:**
   ```bash
   cd api
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

### 2. Update Clerk Configuration

1. **Go to your Clerk Dashboard**
2. **Update the following URLs:**
   - **Frontend URL:** `https://freediving-ph-app.onrender.com`
   - **API URL:** `https://freediving-ph-api.onrender.com`
   - **Webhook URL:** `https://freediving-ph-api.onrender.com/webhooks/clerk`

### 3. Update CORS Settings

Your API should automatically allow requests from your frontend domain. If you encounter CORS issues:

1. **Check the `CORS_ORIGIN` environment variable in your API service**
2. **Ensure it matches your frontend URL exactly**

### 4. Test Your Deployment

1. **Test Frontend:** Visit `https://freediving-ph-app.onrender.com`
2. **Test API Health:** Visit `https://freediving-ph-api.onrender.com/health`
3. **Test Database Connection:** Check API logs for successful database connection

## Environment Variables Reference

### Required Variables

| Variable | Service | Description |
|----------|---------|-------------|
| `DATABASE_URL` | API | Auto-generated by Render |
| `CLERK_SECRET_KEY` | API | From Clerk Dashboard |
| `CLERK_PUBLISHABLE_KEY` | Frontend | From Clerk Dashboard |
| `AWS_ACCESS_KEY_ID` | API | For S3 file uploads |
| `AWS_SECRET_ACCESS_KEY` | API | For S3 file uploads |
| `AWS_S3_BUCKET` | API | Your S3 bucket name |
| `EMAIL_USER` | API | SMTP email address |
| `EMAIL_PASS` | API | SMTP password/app password |
| `GOOGLE_MAPS_API_KEY` | Both | For map functionality |

### Optional Variables

| Variable | Service | Default | Description |
|----------|---------|---------|-------------|
| `PORT` | Both | 10000 | Application port |
| `NODE_ENV` | Both | production | Environment |
| `CORS_ORIGIN` | API | Auto-set | CORS allowed origin |
| `RATE_LIMIT_WINDOW_MS` | API | 900000 | Rate limit window |
| `RATE_LIMIT_MAX_REQUESTS` | API | 100 | Max requests per window |

## Troubleshooting

### Common Issues

1. **Build Failures:**
   - Check Node.js version compatibility
   - Ensure all dependencies are in `package.json`
   - Check build logs for specific errors

2. **Database Connection Issues:**
   - Verify `DATABASE_URL` is correctly set
   - Check database service is running
   - Ensure migrations have been run

3. **CORS Errors:**
   - Verify `CORS_ORIGIN` matches your frontend URL
   - Check that both services are deployed and running

4. **Environment Variable Issues:**
   - Ensure all required variables are set
   - Check for typos in variable names
   - Verify sensitive variables are marked as `sync: false`

### Getting Help

1. **Check Render Logs:**
   - Go to your service dashboard
   - Click on "Logs" tab
   - Look for error messages

2. **Test Locally:**
   - Run your application locally with production environment variables
   - This helps identify issues before deployment

3. **Render Support:**
   - Use Render's built-in support chat
   - Check Render documentation for specific issues

## Cost Optimization

### Starter Tier (Recommended for MVP)
- **Total Cost:** $21/month
- **Database:** $7/month (1GB RAM, 1GB storage)
- **API:** $7/month (1GB RAM)
- **Frontend:** $7/month (1GB RAM)

### Scaling Up
- **Growth Tier:** $70/month (2GB RAM each service)
- **Scale Tier:** $150/month (4GB RAM each service)

## Next Steps

1. **Monitor Performance:** Use Render's built-in monitoring
2. **Set Up Custom Domain:** Configure your own domain
3. **Enable HTTPS:** Automatic with Render
4. **Set Up Alerts:** Configure monitoring alerts
5. **Backup Strategy:** Render handles database backups automatically

## Security Checklist

- [ ] All sensitive environment variables marked as `sync: false`
- [ ] CORS properly configured
- [ ] Database access restricted to internal network
- [ ] HTTPS enabled (automatic with Render)
- [ ] Rate limiting configured
- [ ] Input validation in place
- [ ] Error handling implemented

---

**Ready to deploy?** Follow the steps above and your freediving.ph application will be live on Render.com with minimal operational overhead!
