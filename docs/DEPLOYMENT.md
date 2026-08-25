# AccessGuard — Deployment Documentation

## Overview

AccessGuard can be deployed using various methods. This document covers all deployment options.

## Prerequisites

### Environment Variables
```bash
# Required
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://localhost:6379
NEXTAUTH_SECRET=your-secret-here
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional
AI_API_KEY=your-openai-key
SENTRY_DSN=your-sentry-dsn
RESEND_API_KEY=re_...
```

### System Requirements
- **Node.js:** 20+ (LTS)
- **PostgreSQL:** 15+
- **Redis:** 7+
- **Memory:** 2GB+ (4GB+ recommended)
- **Storage:** 20GB+ (SSD recommended)

## Docker Deployment

### Dockerfile
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://accessguard:accessguard@postgres:5432/accessguard
      - REDIS_URL=redis://redis:6379
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=accessguard
      - POSTGRES_PASSWORD=accessguard
      - POSTGRES_DB=accessguard
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Running with Docker
```bash
# Build and start
docker compose up -d

# View logs
docker compose logs -f app

# Stop
docker compose down
```

## Vercel Deployment

### Configuration
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

### Environment Variables
Set in Vercel dashboard:
- All required environment variables
- `DATABASE_URL` → Use Vercel Postgres or external
- `REDIS_URL` → Use Upstash or external

### Deploy
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

## Railway Deployment

### railway.json
```json
{
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300
  }
}
```

### Deploy
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# Add database
railway add postgresql
railway add redis

# Deploy
railway up
```

## AWS Deployment

### ECS (Fargate)
```json
{
  "family": "accessguard",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "accessguard",
      "image": "your-ecr-repo:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "DATABASE_URL", "value": "..." },
        { "name": "REDIS_URL", "value": "..." }
      ]
    }
  ]
}
```

### RDS (PostgreSQL)
```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier accessguard \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16 \
  --master-username accessguard \
  --master-user-password <password> \
  --allocated-storage 20
```

### ElastiCache (Redis)
```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id accessguard \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0
```

## Kubernetes Deployment

### Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: accessguard
spec:
  replicas: 3
  selector:
    matchLabels:
      app: accessguard
  template:
    metadata:
      labels:
        app: accessguard
    spec:
      containers:
        - name: accessguard
          image: your-registry/accessguard:latest
          ports:
            - containerPort: 3000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: accessguard-secrets
                  key: database-url
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /api/health/live
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/health/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
```

### Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: accessguard
spec:
  selector:
    app: accessguard
  ports:
    - port: 80
      targetPort: 3000
  type: LoadBalancer
```

### Ingress
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: accessguard
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - accessguard.io
      secretName: accessguard-tls
  rules:
    - host: accessguard.io
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: accessguard
                port:
                  number: 80
```

## Database Setup

### Initial Setup
```bash
# Push schema
npm run db:push

# Run migrations
npm run db:migrate:prod

# Seed data
npm run db:seed

# Apply constraints
npm run db:constraints
```

### Backups
```bash
# Create backup
npm run db:backup

# Restore backup
npm run db:restore

# Backup with pruning
npm run db:backup:prune
```

## Monitoring

### Health Checks
```bash
# Liveness
curl http://localhost:3000/api/health/live

# Readiness
curl http://localhost:3000/api/health/ready

# Full health
curl http://localhost:3000/api/health
```

### Logs
```bash
# Docker logs
docker compose logs -f app

# PM2 logs
pm2 logs accessguard

# Systemd logs
journalctl -u accessguard -f
```

### Metrics
- **Sentry:** Error tracking
- **Prometheus:** Metrics collection
- **Grafana:** Dashboards
- **Uptime Robot:** Uptime monitoring

## Rollback

### Docker
```bash
# Rollback to previous version
docker compose down
docker compose up -d --build

# Or use specific tag
docker compose -f docker-compose.prod.yml up -d
```

### Database
```bash
# Rollback migration
npx prisma migrate resolve --rolled-back <migration_name>
```

## Security Checklist

### Pre-Deployment
- [ ] All secrets in environment variables
- [ ] No secrets in code or git
- [ ] HTTPS configured
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] CORS configured

### Post-Deployment
- [ ] Health checks passing
- [ ] Error tracking active
- [ ] Logs flowing
- [ ] Backups configured
- [ ] Monitoring alerts set up
