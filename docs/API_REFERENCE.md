# AccessGuard — API Reference

## Base URL
```
Production: https://api.accessguard.io
Staging:    https://staging-api.accessguard.io
Local:      http://localhost:3000
```

## Authentication

### JWT Token
```http
Authorization: Bearer <token>
```

### API Key
```http
X-API-Key: <api_key>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": { ... }
}
```

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000
```

## Endpoints

### Authentication

#### POST /api/auth/register
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### POST /api/auth/login
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_123",
      "email": "user@example.com"
    }
  }
}
```

### Projects

#### GET /api/projects
List all projects for the authenticated user.

**Query Parameters:**
- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (default: 10)
- `search` (string): Search by name

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "proj_123",
      "name": "My Website",
      "url": "https://example.com",
      "lastScan": "2024-01-15T10:30:00Z",
      "riskScore": 42
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25
  }
}
```

#### POST /api/projects
Create a new project.

**Request:**
```json
{
  "name": "My Website",
  "url": "https://example.com"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "proj_123",
    "name": "My Website",
    "url": "https://example.com",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### GET /api/projects/:id
Get project details.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "proj_123",
    "name": "My Website",
    "url": "https://example.com",
    "scans": [...],
    "violations": {
      "critical": 2,
      "serious": 5,
      "moderate": 8,
      "minor": 3
    }
  }
}
```

### Scans

#### POST /api/scans
Start a new scan.

**Request:**
```json
{
  "projectId": "proj_123",
  "url": "https://example.com"
}
```

**Response:** `202 Accepted`
```json
{
  "success": true,
  "data": {
    "scanId": "scan_456",
    "status": "queued"
  }
}
```

#### GET /api/scans/:id
Get scan status and results.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "scan_456",
    "status": "completed",
    "startedAt": "2024-01-15T10:30:00Z",
    "completedAt": "2024-01-15T10:32:00Z",
    "pagesScanned": 15,
    "violationsFound": 18,
    "summary": {
      "critical": 2,
      "serious": 5,
      "moderate": 8,
      "minor": 3
    }
  }
}
```

### Violations

#### GET /api/violations
List violations for a project.

**Query Parameters:**
- `projectId` (string): Project ID (required)
- `severity` (string): Filter by severity
- `status` (string): Filter by status
- `page` (int): Page number

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "viol_789",
      "ruleId": "color-contrast",
      "severity": "critical",
      "description": "Text contrast ratio below 4.5:1",
      "elementSelector": ".btn-primary",
      "elementHtml": "<button class=\"btn-primary\">Submit</button>",
      "remediationCode": "color: #1f2937; background-color: #ffffff;",
      "status": "open"
    }
  ]
}
```

#### PATCH /api/violations/:id
Update violation status.

**Request:**
```json
{
  "status": "fixed"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "viol_789",
    "status": "fixed",
    "updatedAt": "2024-01-15T11:00:00Z"
  }
}
```

### AI Remediation

#### POST /api/remediate
Get AI-powered fix for a violation.

**Request:**
```json
{
  "violationId": "viol_789",
  "violation": {
    "ruleId": "color-contrast",
    "description": "Text contrast ratio below 4.5:1",
    "elementHtml": "<button class=\"btn-primary\">Submit</button>"
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "remediationCode": "color: #1f2937;\nbackground-color: #ffffff;",
    "explanation": "Increased contrast ratio to 7:1 by using darker text color.",
    "confidence": 0.95,
    "model": "gpt-4o",
    "promptVersion": 2
  }
}
```

#### POST /api/remediate/batch
Get AI fixes for multiple violations.

**Request:**
```json
{
  "violations": [
    { "id": "viol_789", "ruleId": "color-contrast", "description": "..." },
    { "id": "viol_790", "ruleId": "image-alt", "description": "..." }
  ]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "violationId": "viol_789",
      "remediationCode": "...",
      "confidence": 0.95
    },
    {
      "violationId": "viol_790",
      "remediationCode": "...",
      "confidence": 0.88
    }
  ]
}
```

### Reports

#### POST /api/reports/generate
Generate a compliance report.

**Request:**
```json
{
  "projectId": "proj_123",
  "format": "pdf",
  "includeRemediations": true
}
```

**Response:** `202 Accepted`
```json
{
  "success": true,
  "data": {
    "reportId": "report_123",
    "status": "generating"
  }
}
```

#### GET /api/reports/:id
Download a generated report.

**Response:** `200 OK` (PDF binary)

### GitHub Integration

#### POST /api/github/connect
Connect GitHub account.

**Request:**
```json
{
  "code": "oauth_code_from_github"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "connected": true,
    "githubLogin": "username"
  }
}
```

#### POST /api/github/create-pr
Create a pull request with AI fixes.

**Request:**
```json
{
  "projectId": "proj_123",
  "violations": ["viol_789", "viol_790"],
  "branchName": "fix/accessibility-issues"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "prNumber": 42,
    "prUrl": "https://github.com/user/repo/pull/42",
    "filesChanged": 3
  }
}
```

### Billing

#### GET /api/billing/subscription
Get current subscription.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "plan": "growth",
    "status": "active",
    "currentPeriodEnd": "2024-02-15T00:00:00Z",
    "price": 14900,
    "currency": "usd"
  }
}
```

#### POST /api/stripe/checkout
Create a checkout session.

**Request:**
```json
{
  "plan": "growth",
  "interval": "monthly"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/...",
    "sessionId": "cs_..."
  }
}
```

### Settings

#### GET /api/settings
Get organization settings.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "name": "My Organization",
    "plan": "growth",
    "dataRegion": "us",
    "currency": "usd"
  }
}
```

#### PATCH /api/settings
Update organization settings.

**Request:**
```json
{
  "currency": "eur"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "currency": "eur",
    "updatedAt": "2024-01-15T11:00:00Z"
  }
}
```

### Health Checks

#### GET /api/health
Basic health check.

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### GET /api/health/live
Liveness probe (Kubernetes).

**Response:** `200 OK`

#### GET /api/health/ready
Readiness probe (Kubernetes).

**Response:** `200 OK` or `503 Service Unavailable`

### Error Codes

| Code | Description |
|------|-------------|
| `400` | Bad Request - Invalid input |
| `401` | Unauthorized - Authentication required |
| `403` | Forbidden - Insufficient permissions |
| `404` | Not Found - Resource doesn't exist |
| `409` | Conflict - Resource already exists |
| `422` | Unprocessable Entity - Validation error |
| `429` | Too Many Requests - Rate limit exceeded |
| `500` | Internal Server Error |
| `503` | Service Unavailable |

### Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/*` | 10 req/min | 60s |
| `/api/projects` | 30 req/min | 60s |
| `/api/scans` | 10 req/min | 60s |
| `/api/remediate` | 20 req/min | 60s |
| Default | 100 req/min | 60s |
