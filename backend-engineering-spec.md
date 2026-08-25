# AccessGuard Backend Engineering — Full Upgrade Spec

**Date:** August 25, 2026
**Author:** Buffy (AI Agent)
**Status:** Spec Complete — Ready for Implementation
**Request:** Deep backend engineering — full upgrade

---

## Executive Summary

Backend is **85% production-ready** with 82 API routes, 16 Prisma models, BullMQ queue, NextAuth, RBAC. This spec covers the remaining **15%**: database optimization, caching layer, full job system, observability, API versioning, input validation, email system, and testing strategy.

**Current State:**
- 82 API routes (all working)
- 16 Prisma models (PostgreSQL)
- BullMQ queue with Redis
- NextAuth (Credentials, GitHub, Google)
- RBAC with permissions
- Pino logger
- Rate limiting (in-memory + Redis)
- 323 tests passing

**Target State:**
- Optimized database queries with proper indexing
- Full caching layer (Redis + in-memory)
- Priority job queues with dead letter queues
- Full observability (logging, metrics, tracing)
- API versioning (/api/v1/, /api/v2/)
- Zod schema validation for all inputs
- Email template system with queue
- Integration + load testing

---

## Phase 1: Database Optimization

### 1.1 Query Optimization
**Current Issues:**
- N+1 queries in some list endpoints
- Missing indexes on frequently queried fields
- No query performance monitoring

**Fixes:**
- Add composite indexes for common query patterns
- Use `include` strategically to avoid N+1
- Add query performance logging
- Implement connection pooling with PgBouncer

**Indexes to Add:**
```sql
-- Violations by project + severity
CREATE INDEX idx_violation_project_severity ON "Violation"("projectId", "severity");

-- Scans by project + status
CREATE INDEX idx_scan_project_status ON "Scan"("projectId", "status");

-- Audit logs by org + action + date
CREATE INDEX idx_audit_org_action_date ON "AuditLog"("orgId", "action", "createdAt" DESC);

-- Users by org + role
CREATE INDEX idx_user_org_role ON "User"("orgId", "role");

-- Projects by org + active
CREATE INDEX idx_project_org_active ON "Project"("orgId", "isActive");
```

### 1.2 Connection Pooling
**Implementation:**
- PgBouncer for connection pooling
- Prisma connection pool configuration
- Connection health monitoring

**Config:**
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/accessguard?connection_limit=20&pool_timeout=10
```

### 1.3 Query Performance Monitoring
**Add to Prisma:**
```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
  ],
});

prisma.$on('query', (e) => {
  if (e.duration > 100) { // Log slow queries > 100ms
    logger.warn({ query: e.query, duration: e.duration }, 'Slow query');
  }
});
```

---

## Phase 2: Caching Layer

### 2.1 Redis Caching Strategy
**Cache Layers:**
- **L1 (In-Memory):** Hot data (user sessions, feature flags)
- **L2 (Redis):** Warm data (API responses, query results)
- **L3 (CDN):** Static assets, public pages

**Cache Keys:**
```
user:{userId}:session       → User session data (TTL: 1h)
org:{orgId}:settings        → Org settings (TTL: 5m)
project:{projectId}:stats   → Project statistics (TTL: 1m)
violations:{orgId}:list     → Violation list (TTL: 30s)
scans:{orgId}:recent        → Recent scans (TTL: 30s)
stats:{orgId}:dashboard     → Dashboard stats (TTL: 1m)
```

### 2.2 Cache Invalidation
**Strategies:**
- **TTL-based:** Automatic expiration
- **Event-based:** Invalidate on mutations
- **Manual:** Admin cache flush

**Implementation:**
```typescript
// lib/cache.ts
class CacheManager {
  private memoryCache = new Map<string, { data: unknown; expiry: number }>();
  
  async get<T>(key: string): Promise<T | null> {
    // L1: Check memory
    const memEntry = this.memoryCache.get(key);
    if (memEntry && memEntry.expiry > Date.now()) {
      return memEntry.data as T;
    }
    
    // L2: Check Redis
    const redisData = await redis.get(key);
    if (redisData) {
      const parsed = JSON.parse(redisData);
      this.memoryCache.set(key, { data: parsed, expiry: Date.now() + 60000 });
      return parsed as T;
    }
    
    return null;
  }
  
  async set(key: string, value: unknown, ttlSeconds: number = 300): Promise<void> {
    this.memoryCache.set(key, { data: value, expiry: Date.now() + 60000 });
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  }
  
  async invalidate(pattern: string): Promise<void> {
    // Clear memory
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(pattern)) this.memoryCache.delete(key);
    }
    // Clear Redis
    const keys = await redis.keys(`${pattern}*`);
    if (keys.length) await redis.del(...keys);
  }
}
```

---

## Phase 3: Full Job System

### 3.1 Priority Queues
**Queues to Implement:**
- `scans` (high priority) — Scan execution
- `emails` (medium priority) — Email sending
- `reports` (low priority) — Report generation
- `cleanup` (low priority) — Data cleanup
- `webhooks` (medium priority) — Outgoing webhooks

### 3.2 Dead Letter Queue
**Implementation:**
```typescript
// lib/queue.ts
const deadLetterQueue = new Queue('dead-letter', connection);

worker.on('failed', async (job, err) => {
  if (job.attemptsMade >= job.opts.attempts) {
    await deadLetterQueue.add('failed-job', {
      originalQueue: job.queueName,
      jobId: job.id,
      data: job.data,
      error: err.message,
      failedAt: new Date(),
    });
  }
});
```

### 3.3 Job Scheduling
**Cron Jobs:**
- Every 5 minutes: Process scheduled scans
- Every hour: Clean up old data
- Every day: Generate daily reports
- Every week: Send weekly digest emails

### 3.4 Webhook System
**Outgoing Webhooks:**
- `scan.completed` — Scan finished
- `violation.found` — New violation detected
- `project.created` — New project added
- `report.generated` — Report ready

**Webhook Config:**
```typescript
interface WebhookConfig {
  url: string;
  events: string[];
  secret: string; // For HMAC signing
  retries: number;
}
```

---

## Phase 4: Full Observability

### 4.1 Structured Logging
**Enhanced Pino Config:**
```typescript
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      pid: bindings.pid,
      host: bindings.hostname,
      service: 'accessguard',
      version: process.env.APP_VERSION || '1.0.0',
    }),
  },
  redact: {
    paths: ['req.headers.authorization', 'password', 'token', 'secret'],
    censor: '[REDACTED]',
  },
});
```

### 4.2 Metrics Collection
**Metrics to Track:**
- API response times (p50, p95, p99)
- Error rates by endpoint
- Database query performance
- Queue job processing times
- Cache hit/miss rates
- Active connections

**Implementation:**
```typescript
// lib/metrics.ts
class MetricsCollector {
  private counters = new Map<string, number>();
  private histograms = new Map<string, number[]>();
  
  increment(name: string, value: number = 1) {
    this.counters.set(name, (this.counters.get(name) || 0) + value);
  }
  
  observe(name: string, value: number) {
    const hist = this.histograms.get(name) || [];
    hist.push(value);
    if (hist.length > 1000) hist.shift();
    this.histograms.set(name, hist);
  }
  
  getPercentile(name: string, p: number): number {
    const hist = this.histograms.get(name) || [];
    if (!hist.length) return 0;
    const sorted = [...hist].sort((a, b) => a - b);
    const idx = Math.ceil(sorted.length * (p / 100)) - 1;
    return sorted[idx];
  }
}
```

### 4.3 Distributed Tracing
**Implementation:**
- Correlation IDs for request tracing
- Span tracking for long operations
- Trace context propagation

```typescript
// lib/tracing.ts
import { AsyncLocalStorage } from 'node:async_hooks';

interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

const traceStorage = new AsyncLocalStorage<TraceContext>();

export function createTraceId(): string {
  return crypto.randomUUID();
}

export function startSpan(name: string): TraceContext {
  const parent = traceStorage.getStore();
  return {
    traceId: parent?.traceId || createTraceId(),
    spanId: crypto.randomUUID(),
    parentSpanId: parent?.spanId,
  };
}
```

---

## Phase 5: API Versioning

### 5.1 URL-Based Versioning
**Structure:**
```
/api/v1/health
/api/v1/projects
/api/v1/scans
/api/v2/projects  (breaking changes)
```

### 5.2 Version Header
**Response Headers:**
```
X-API-Version: 1.0.0
X-API-Deprecated: true (if deprecated)
Sunset: 2027-01-01 (deprecation date)
```

### 5.3 Migration Strategy
**Phase 1:** Add /api/v1/ prefix to all routes
**Phase 2:** Keep /api/ as alias for /api/v1/
**Phase 3:** Deprecate /api/ after 6 months
**Phase 4:** Remove /api/ after 12 months

---

## Phase 6: Input Validation

### 6.1 Zod Schema Validation
**Schema Structure:**
```typescript
// lib/schemas/project.ts
import { z } from 'zod';

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  description: z.string().max(500).optional(),
  crawlConfig: z.object({
    maxPages: z.number().min(1).max(1000).default(100),
    excludePaths: z.array(z.string()).default([]),
    includeSubdomains: z.boolean().default(false),
  }).optional(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial();
```

### 6.2 Validation Middleware
```typescript
// lib/validation.ts
import { ZodSchema } from 'zod';

export function validateRequest<T>(schema: ZodSchema<T>) {
  return async (req: NextRequest): Promise<T | NextResponse> => {
    const body = await req.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }
    
    return result.data;
  };
}
```

### 6.3 Sanitization
**Rules:**
- Strip HTML tags from strings
- Escape special characters
- Normalize URLs
- Trim whitespace

---

## Phase 7: Email System

### 7.1 Template System
**Templates:**
- Welcome email
- Email verification
- Password reset
- Scan complete notification
- Weekly digest
- Invoice/receipt

**Template Engine:**
```typescript
// lib/email-templates.ts
interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

const templates: Record<string, (data: Record<string, unknown>) => EmailTemplate> = {
  'scan-complete': (data) => ({
    subject: `Scan Complete: ${data.projectName}`,
    html: `<h1>Scan Complete</h1><p>${data.violationsFound} violations found.</p>`,
    text: `Scan Complete: ${data.violationsFound} violations found.`,
  }),
};
```

### 7.2 Email Queue
**Implementation:**
```typescript
// lib/email-queue.ts
const emailQueue = new Queue('emails', connection);

export async function sendEmail(to: string, template: string, data: Record<string, unknown>) {
  await emailQueue.add('send-email', { to, template, data }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });
}
```

### 7.3 Email Analytics
**Tracking:**
- Open tracking (pixel)
- Click tracking (redirect links)
- Bounce handling
- Unsubscribe management

---

## Phase 8: Testing Strategy

### 8.1 Integration Tests
**Coverage:**
- Full API endpoint tests
- Database transaction tests
- Auth flow tests
- Queue job tests

### 8.2 Load Testing
**Tool:** k6 or Artillery
**Scenarios:**
- 100 concurrent users
- 1000 requests/second
- Database under load
- Cache performance

### 8.3 Security Testing
**Checks:**
- SQL injection
- XSS attacks
- CSRF protection
- Rate limiting
- Authentication bypass
- Authorization bypass

---

## Implementation Order

| Phase | Priority | Effort | Dependencies |
|-------|----------|--------|--------------|
| 1. Database Optimization | P0 | Medium | None |
| 2. Caching Layer | P0 | Large | Phase 1 |
| 3. Full Job System | P1 | Large | None |
| 4. Full Observability | P1 | Medium | None |
| 5. API Versioning | P1 | Medium | None |
| 6. Input Validation | P0 | Medium | None |
| 7. Email System | P2 | Medium | Phase 3 |
| 8. Testing Strategy | P1 | Large | All phases |

---

## Success Criteria

1. ✅ Database queries < 50ms (p95)
2. ✅ Cache hit rate > 80%
3. ✅ Job processing < 5s (p95)
4. ✅ API response < 200ms (p95)
5. ✅ Zero N+1 queries
6. ✅ All inputs validated with Zod
7. ✅ Structured logging with correlation IDs
8. ✅ Metrics dashboard showing key KPIs
9. ✅ API versioning on all routes
10. ✅ Integration tests for all endpoints
11. ✅ Load test passes (1000 req/s)
12. ✅ Security audit passes
