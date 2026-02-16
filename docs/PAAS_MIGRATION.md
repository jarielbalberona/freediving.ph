# Render Migration Plan - Freediving.ph

**Status:** IN PROGRESS (Render is primary target, AWS workflow is manual legacy fallback)
**Decision Date:** January 3, 2025
**Last Updated:** February 16, 2026
**Reason:** Single platform solution with better integration and cost efficiency.

---

## Executive Summary

**Problem:** Current AWS ECS/Fargate setup costs $150-200/month with zero users, requires 40% time on DevOps, and has incomplete production environment.

**Solution:** Migrate to Render.com for $14-45/month with 95% less operational overhead. Single platform for all services.

**Impact:**
- Monthly cost: $150-200 → $14-45 (70-90% reduction)
- Deploy time: 1 hour → 3 minutes
- DevOps time: 40% → 5%
- Time to focus on features: +90%
- Single platform: Everything in one place

---

## Recommended Stack

### 1. Frontend - Render Web Service
**Service:** Next.js hosting
**Cost:** $7/month (1GB RAM, 0.1 CPU)
**Why:**
- Native Next.js support with SSR/SSG
- Automatic HTTPS and CDN
- Git integration with auto-deploy
- Built-in monitoring and logs
- Easy scaling and environment management

**Features you get:**
- Server-side rendering support
- Automatic deployments from Git
- Environment variable management
- Health checks and monitoring
- Custom domain support

**When to upgrade:** Need more resources ($25/month for 2GB RAM)

### 2. Backend API - Render Web Service
**Service:** Express.js API hosting
**Cost:** $7/month (1GB RAM, 0.1 CPU)
**Why:**
- Runs your existing Express API with zero changes
- Internal networking with database
- Automatic scaling
- Built-in monitoring
- Easy environment management

**Features you get:**
- Docker container support
- Internal service communication
- Automatic health checks
- Log aggregation
- Environment variable management

**When to upgrade:** Need more resources ($25/month for 2GB RAM)

### 3. Database - Render PostgreSQL
**Service:** Managed PostgreSQL
**Cost:** $7/month (1GB RAM, 1GB storage)
**Why:**
- Fully managed PostgreSQL
- Automatic backups
- Internal networking (faster connections)
- Built-in monitoring
- Easy scaling

**Features you get:**
- PostgreSQL 15 with extensions
- Daily automated backups
- Connection pooling
- Performance monitoring
- Internal networking for security

**When to upgrade:** Need more storage ($20/month for 4GB RAM, 10GB storage)

## Cost Breakdown

### Starter Tier (0-1K users)
- **Frontend (Render):** $7/month (1GB RAM)
- **Backend (Render):** $7/month (1GB RAM)
- **Database (Render):** $7/month (1GB RAM, 1GB storage)
- **Total:** $21/month

### Growth Tier (1K-10K users)
- **Frontend (Render):** $25/month (2GB RAM)
- **Backend (Render):** $25/month (2GB RAM)
- **Database (Render):** $20/month (4GB RAM, 10GB storage)
- **Total:** $70/month

### Scale Tier (10K+ users)
- **Frontend (Render):** $50/month (4GB RAM)
- **Backend (Render):** $50/month (4GB RAM)
- **Database (Render):** $50/month (8GB RAM, 50GB storage)
- **Total:** $150/month

---

## Migration Steps

### Phase 1: Setup (Week 1)
1. **Create Render account** and connect GitHub
2. **Deploy PostgreSQL database** with initial configuration
3. **Deploy Express API** with database connection
4. **Deploy Next.js frontend** with API integration
5. **Test basic functionality** and database connectivity

### Phase 2: Configuration (Week 2)
1. **Run database migrations** and seed data
2. **Configure environment variables** for all services
3. **Set up custom domains** (optional)
4. **Configure monitoring** and alerts
5. **Test all features** and user flows

### Phase 3: Optimization (Week 3)
1. **Performance testing** and optimization
2. **Security review** and hardening
3. **Update documentation** and deployment guides
4. **Decommission AWS resources**
5. **Monitor and optimize** production performance

---

## Technical Implementation

### 1. Frontend Configuration (Next.js)
```yaml
# render.yaml in apps/web/ directory
services:
  - type: web
    name: freediving-ph-app
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: NEXT_PUBLIC_API_URL
        value: https://freediving-ph-api.onrender.com
      - key: PORT
        value: 10000
```

### 2. Backend Configuration (Express)
```yaml
# render.yaml in apps/api/ directory
services:
  - type: web
    name: freediving-ph-api
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: freediving-ph-db
          property: connectionString
      - key: PORT
        value: 10000
```

### 3. Database Configuration (PostgreSQL)
```yaml
# render.yaml in root directory
services:
  - type: pserv
    name: freediving-ph-db
    env: postgresql
    plan: starter
    region: oregon
```

### 4. Environment Variables
```env
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=https://freediving-ph-api.onrender.com
NEXT_PUBLIC_APP_URL=https://freediving-ph-app.onrender.com

# Backend (.env)
DATABASE_URL=postgresql://user:pass@dpg-xxx.onrender.com/freediving_ph
NODE_ENV=production
PORT=10000
```

---

## Advantages of Render

### ✅ Single Platform Benefits
- **Unified Dashboard:** Manage all services in one place
- **Internal Networking:** Services communicate securely
- **Unified Logging:** All logs in one dashboard
- **Easy Scaling:** Scale all services together
- **Simple Deployment:** Git-based deployments

### ✅ Developer Experience
- **Zero Configuration:** Works out of the box
- **Automatic SSL:** Free SSL certificates
- **Health Checks:** Built-in monitoring
- **Rolling Deployments:** Zero-downtime updates
- **Environment Management:** Easy variable management

### ✅ Cost Efficiency
- **Predictable Pricing:** No surprise bills
- **No Hidden Costs:** Transparent pricing
- **Free Tier Available:** 750 hours/month free
- **Easy Scaling:** Pay only for what you use
- **No DevOps Overhead:** Managed infrastructure

---

## Migration Checklist

### Pre-Migration
- [ ] Create Render account
- [ ] Connect GitHub repository
- [ ] Review current environment variables
- [ ] Plan database migration strategy
- [ ] Test local Docker setup

### Phase 1: Setup
- [ ] Deploy PostgreSQL database
- [ ] Deploy Express API
- [ ] Deploy Next.js frontend
- [ ] Configure environment variables
- [ ] Test basic connectivity

### Phase 2: Configuration
- [ ] Run database migrations
- [ ] Seed initial data
- [ ] Configure custom domains
- [ ] Set up monitoring
- [ ] Test all features

### Phase 3: Optimization
- [ ] Performance testing
- [ ] Security review
- [ ] Update documentation
- [ ] Decommission AWS
- [ ] Monitor production

---

## Expected Outcomes

### Immediate Benefits
- **Cost Reduction:** 70-90% cost savings
- **Faster Deployments:** 3-minute deployments
- **Less Maintenance:** 95% reduction in DevOps time
- **Better Monitoring:** Unified logging and metrics
- **Easier Scaling:** Automatic scaling capabilities

### Long-term Benefits
- **Focus on Features:** More time for development
- **Faster Iterations:** Quick deployment cycles
- **Better Reliability:** Managed infrastructure
- **Easier Team Onboarding:** Simple deployment process
- **Scalable Architecture:** Ready for growth

---

## Next Steps

1. **Start with Database:** Deploy PostgreSQL first
2. **Deploy API:** Connect to database
3. **Deploy Frontend:** Connect to API
4. **Test Everything:** Ensure all features work
5. **Go Live:** Switch DNS and monitor

**Ready to start?** This migration will give you a production-ready app with minimal operational overhead, allowing you to focus on building features for the freediving community.
