# AccessGuard — System Architecture

## Overview

AccessGuard is an AI-powered web accessibility compliance platform that continuously scans websites for WCAG 2.1/2.2 AA violations and provides automated remediation suggestions.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Browser    │  │   Mobile    │  │   CLI/SDK   │         │
│  │  (React 19)  │  │  (PWA)      │  │  (Future)   │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
└─────────┼────────────────┼────────────────┼─────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                    API GATEWAY                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Next.js 16 Middleware                   │    │
│  │  • Rate Limiting (Redis)                            │    │
│  │  • Authentication (JWT/Clerk)                       │    │
│  │  • Request ID Tracking                              │    │
│  │  • API Versioning (/api/v1/)                        │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   SERVICE LAYER                              │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Project    │  │    Scan      │  │    AI        │      │
│  │   Service    │  │   Service    │  │   Service    │      │
│  │              │  │              │  │              │      │
│  │ • CRUD       │  │ • Execute    │  │ • Remediate  │      │
│  │ • Validate   │  │ • Queue      │  │ • Route      │      │
│  │ • Limits     │  │ • Schedule   │  │ • Fallback   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Billing    │  │   Auth       │  │   Report     │      │
│  │   Service    │  │   Service    │  │   Service    │      │
│  │              │  │              │  │              │      │
│  │ • Stripe     │  │ • JWT        │  │ • PDF Gen    │      │
│  │ • Webhooks   │  │ • MFA        │  │ • Share      │      │
│  │ • Plans      │  │ • OAuth      │  │ • Export     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │    Redis     │  │    S3/MinIO  │      │
│  │  (Primary)   │  │  (Cache/     │  │  (Storage)   │      │
│  │              │  │   Queue)     │  │              │      │
│  │ • Users      │  │ • Sessions   │  │ • Screenshots│      │
│  │ • Projects   │  │ • Rate Limit │  │ • Reports    │      │
│  │ • Scans      │  │ • Job Queue  │  │ • Backups    │      │
│  │ • Violations │  │ • Cache      │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 EXTERNAL SERVICES                            │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Stripe     │  │   GitHub     │  │   OpenAI     │      │
│  │  (Payments)  │  │  (Auto-PR)   │  │  (AI Model)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Sentry     │  │   Resend     │  │   Clerk      │      │
│  │  (Errors)    │  │  (Email)     │  │  (Auth)      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Scan Flow
```
User Request → API Gateway → Scan Service → Queue (BullMQ)
                                              ↓
                                    Worker Process
                                              ↓
                                    Playwright Browser
                                              ↓
                                    axe-core Analysis
                                              ↓
                                    Violations Extracted
                                              ↓
                                    AI Remediation (OpenAI)
                                              ↓
                                    Results Stored (PostgreSQL)
                                              ↓
                                    User Notified (Email/Webhook)
```

### AI Remediation Flow
```
Violation Detected → Build Prompt (Context + Rules)
                          ↓
                    Model Router (Primary → Fallback)
                          ↓
                    OpenAI API Call
                          ↓
                    Response Parser
                          ↓
                    Confidence Scoring
                          ↓
                    Template Fallback (if needed)
                          ↓
                    Store Result
```

## Security Architecture

### Authentication
- JWT tokens (httpOnly cookies)
- MFA (TOTP) for sensitive operations
- OAuth (Google, GitHub)
- API keys for programmatic access

### Authorization
- RBAC with 14 permissions
- 8 built-in roles + custom roles
- Org-scoped access control
- Rate limiting per endpoint

### Data Protection
- AES-GCM encryption at rest
- HTTPS everywhere
- Input validation (Zod)
- SQL injection prevention (Prisma)

## Scalability

### Current Capacity
- Single server deployment
- PostgreSQL (vertical scaling)
- Redis (caching + queuing)

### Future Scaling
- Horizontal scaling (multiple servers)
- Read replicas (PostgreSQL)
- Redis Cluster
- CDN for static assets

## Monitoring

### Metrics
- Request latency (p50, p95, p99)
- Error rates
- Scan completion rates
- AI model costs

### Logging
- Structured logging (Pino)
- Request ID tracking
- Audit trail (44+ action types)

### Alerting
- Error rate spikes
- Latency degradation
- Disk space warnings
- Failed scans
