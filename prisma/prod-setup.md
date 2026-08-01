# Production Deployment Guide

## Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Database (PostgreSQL for production)
DATABASE_URL="postgresql://user:password@host:5432/accessguard?schema=public"

# NextAuth Configuration
NEXTAUTH_SECRET="your-super-secret-key-at-least-32-characters-long"
NEXTAUTH_URL="https://your-domain.com"

# AI SDK (for remediation)
OPENAI_API_KEY="your-openai-api-key"

# Stripe (for payments)
STRIPE_SECRET_KEY="sk_live_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_xxx"

# GitHub OAuth (optional)
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Email (for notifications)
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"
```

## Database Setup

### Development (SQLite)
```bash
bun run db:push
bun run db:seed
```

### Production (PostgreSQL)

1. **Update Prisma schema for PostgreSQL:**
   Change the datasource in `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. **Create and run migrations:**
   ```bash
   bunx prisma migrate deploy
   ```

3. **Seed the database:**
   ```bash
   bunx prisma db seed
   ```

## Security Checklist

- [ ] Change `NEXTAUTH_SECRET` to a secure random string
- [ ] Enable HTTPS in production
- [ ] Configure CORS origins in `src/lib/security.ts`
- [ ] Set up rate limiting with Redis (see below)
- [ ] Enable logging and monitoring
- [ ] Configure backup strategy for database

## Redis for Rate Limiting (Production)

For production, replace the in-memory rate limiter with Redis:

```bash
bun add ioredis
```

Update `src/lib/rate-limit.ts`:

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export function rateLimit(config: RateLimitConfig) {
  // Use Redis for distributed rate limiting
  // Implementation with Redis INCR and EXPIRE
}
```

## Deployment Platforms

### Vercel (Recommended)
```bash
vercel --prod
```

### Docker
```bash
docker build -t accessguard .
docker run -p 3000:3000 accessguard
```

### Self-hosted (PM2)
```bash
bun run build
pm2 start .next/standalone/server.js
```

## Monitoring & Logging

- Set up error tracking with Sentry
- Configure log aggregation (LogDNA, Papertrail)
- Set up uptime monitoring
- Configure database backups

## Database Migrations

For production PostgreSQL:

```bash
# Create a new migration
bunx prisma migrate dev --name description_of_change

# Apply migrations in production
bunx prisma migrate deploy
```

## Scaling Considerations

1. **Horizontal Scaling**: Use Redis for session storage
2. **Database**: Use connection pooling with PgBouncer
3. **CDN**: Serve static assets via CDN
4. **Background Jobs**: Use a job queue for scans (BullMQ + Redis)
