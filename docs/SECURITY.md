# AccessGuard — Security Documentation

## Security Overview

AccessGuard implements defense-in-depth security across all layers of the application.

## Authentication & Authorization

### JWT Authentication
- **Token Type:** RS256 JWT
- **Storage:** HttpOnly cookies (XSS protection)
- **Expiration:** 24 hours
- **Refresh:** Sliding window (7 days)

### Multi-Factor Authentication (MFA)
- **Method:** TOTP (RFC 6238)
- **Apps:** Google Authenticator, Authy, 1Password
- **Backup Codes:** 10 single-use codes

### OAuth Providers
- **Google:** OpenID Connect
- **GitHub:** OAuth 2.0

### API Key Authentication
- **Format:** `ag_live_<random_32_chars>`
- **Storage:** Bcrypt hashed
- **Rotation:** Manual via UI

## Authorization (RBAC)

### Built-in Roles
| Role | Permissions |
|------|-------------|
| `owner` | Full access |
| `admin` | Manage team, settings, billing |
| `manager` | Manage projects, scans, reports |
| `member` | View projects, run scans |
| `viewer` | Read-only access |
| `auditor` | View audit logs, reports |
| `developer` | API access, GitHub integration |
| `billing` | Manage billing only |

### Permission System
- 14 granular permissions
- Custom roles supported
- Org-scoped (no cross-tenant access)
- Checked on every API request

## Rate Limiting

### Implementation
- **Algorithm:** Sliding window counter
- **Storage:** Redis (distributed) / In-memory (fallback)
- **Headers:** X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

### Limits by Endpoint
| Endpoint | Limit | Window |
|----------|-------|--------|
| Auth endpoints | 10/min | 60s |
| Scan triggers | 10/min | 60s |
| AI remediation | 20/min | 60s |
| API calls | 100/min | 60s |

## Input Validation

### Schema Validation
- **Library:** Zod v4
- **Coverage:** All API inputs
- **Sanitization:** HTML entity encoding, SQL parameterization

### URL Validation (SSRF Protection)
- DNS resolution check
- Private IP blocking (RFC 1918)
- Link-local address blocking
- Metadata endpoint blocking
- Redirect validation

## Encryption

### At Rest
- **Algorithm:** AES-256-GCM
- **Key Management:** Environment variables
- **Scope:** Sensitive fields (tokens, API keys)

### In Transit
- **Protocol:** TLS 1.3
- **HSTS:** Enabled (max-age=63072000)
- **Certificate:** Let's Encrypt / Cloudflare

## Security Headers

```http
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
X-DNS-Prefetch-Control: on
```

## OWASP Top 10 Mitigation

### A01: Broken Access Control
- ✅ RBAC on every endpoint
- ✅ Org-scoped queries
- ✅ No IDOR vulnerabilities

### A02: Cryptographic Failures
- ✅ AES-256-GCM encryption
- ✅ Bcrypt for passwords
- ✅ No plaintext secrets

### A03: Injection
- ✅ Prisma parameterized queries
- ✅ Zod input validation
- ✅ No raw SQL

### A04: Insecure Design
- ✅ Threat modeling (STRIDE)
- ✅ Security-first architecture
- ✅ Defense in depth

### A05: Security Misconfiguration
- ✅ Security headers
- ✅ Error handling
- ✅ Default deny

### A06: Vulnerable Components
- ✅ Dependabot alerts
- ✅ Regular updates
- ✅ Security audits

### A07: Authentication Failures
- ✅ MFA support
- ✅ Rate limiting
- ✅ Session management

### A08: Software and Data Integrity
- ✅ Webhook verification
- ✅ Idempotency keys
- ✅ Checksums

### A09: Logging and Monitoring
- ✅ Audit logging (44+ events)
- ✅ Error tracking (Sentry)
- ✅ Request ID tracking

### A10: SSRF
- ✅ URL validation
- ✅ DNS resolution check
- ✅ Private IP blocking

## Audit Logging

### Tracked Events (44+)
- Authentication (login, logout, MFA)
- Project operations (create, update, delete)
- Scan operations (start, complete, fail)
- Violation changes (status updates)
- Billing events (subscription changes)
- Admin operations (settings, roles)
- Security events (failed attempts)

### Log Format
```json
{
  "id": "audit_123",
  "orgId": "org_456",
  "userId": "user_789",
  "action": "project_created",
  "metadata": {
    "projectName": "My Website",
    "projectUrl": "https://example.com"
  },
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

## Compliance

### GDPR
- Data portability (export)
- Right to erasure (delete)
- Cookie consent
- Data residency options

### SOC 2
- Access controls
- Audit logging
- Encryption
- Incident response

### CCPA
- Data disclosure
- Opt-out rights
- Data deletion

## Security Checklist

### Development
- [ ] Input validation on all endpoints
- [ ] Parameterized queries only
- [ ] No secrets in code
- [ ] Error handling (no stack traces in production)
- [ ] Rate limiting on sensitive endpoints

### Deployment
- [ ] HTTPS everywhere
- [ ] Security headers
- [ ] CSP headers
- [ ] CORS configuration
- [ ] Environment variables secured

### Monitoring
- [ ] Audit logging enabled
- [ ] Error tracking active
- [ ] Rate limit alerts
- [ ] Failed login alerts
- [ ] Unusual activity detection
