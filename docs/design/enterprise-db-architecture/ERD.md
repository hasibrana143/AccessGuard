# AccessGuard — Entity Relationship Diagram (as-implemented)

Mermaid ERD of the production schema in `prisma/schema.prisma` (PostgreSQL).
Multi-tenant isolation is enforced at the application layer via `src/lib/rbac.ts`
(`requireOrgAccess` / `requireProjectAccess` / `requireScanAccess`); every tenant
table carries `orgId` or resolves to one through `Project`.

```mermaid
erDiagram
    Organization ||--o{ User : has
    Organization ||--o{ Project : owns
    Organization ||--o{ GithubConnection : has
    Organization ||--o{ AuditLog : logs
    Organization ||--o{ TeamInvite : invites

    Project ||--o{ Scan : has
    Project ||--o{ Violation : has
    Project ||--o{ ComplianceReport : generates
    Project ||--o| ScheduledScan : schedules

    Scan ||--o{ Violation : contains

    User {
        string id PK
        string orgId FK
        string email UK
        string password
        string role "owner | admin | member"
        datetime emailVerifiedAt
        string mfaSecret "encrypted at rest"
        datetime mfaEnabledAt
        string githubToken
    }

    Organization {
        string id PK
        string slug UK
        string plan "free | starter | growth | agency | enterprise"
        string subscriptionStatus
        string settings JSON
    }

    Project {
        string id PK
        string orgId FK
        string name
        string url
        string crawlConfig JSON
        string scanConfig JSON
        string verificationToken
        boolean isVerified
        int riskScore "CHECK 0-100"
        datetime nextScheduledScan
        boolean isActive
        datetime deletedAt "soft delete"
    }

    Scan {
        string id PK
        string projectId FK
        string status "pending | queued | running | completed | failed"
        int pagesScanned "CHECK >= 0"
        int violationsFound "CHECK >= 0"
        string summary JSON
        string errorMessage
        datetime deletedAt "soft delete"
    }

    Violation {
        string id PK
        string scanId FK
        string projectId FK
        string ruleId
        string severity "critical | serious | moderate | minor"
        string wcagCriteria
        string elementSelector
        string elementHtml
        string description
        string remediationCode
        string aiExplanation
        float aiConfidenceScore "CHECK 0-1"
        string status "open | fixed | ignored | false_positive"
        string githubPrUrl
        datetime fixedAt
        datetime deletedAt "soft delete"
    }

    ScheduledScan {
        string id PK
        string projectId FK "UNIQUE"
        string frequency "daily | weekly | monthly | custom"
        string cron "5-field expression"
        datetime nextRunAt
        datetime lastRunAt
        boolean isActive
    }

    ComplianceReport {
        string id PK
        string projectId FK
        string reportType "wcag | full | executive | legal | vpat"
        string format "web | pdf | html | csv"
        string status "pending | generating | generated | ready | failed"
        string summary
        string metadata JSON
        string dateRange JSON
        string fileUrl
        datetime expiresAt
        datetime deletedAt "soft delete"
    }

    GithubConnection {
        string id PK
        string orgId FK
        string installationId UK
        string repositories JSON
        boolean isActive
    }

    AuditLog {
        string id PK
        string orgId FK
        string action
        string metadata JSON
    }

    TeamInvite {
        string id PK
        string orgId FK
        string email
        string role "owner | admin | member"
        string token UK
        datetime expiresAt
        datetime acceptedAt
    }

    PasswordReset {
        string id PK
        string email
        string token UK
        datetime expiresAt
        boolean used
    }

    WcagRule {
        string id PK
        string ruleId UK
        string name
        string description
        string wcagCriteria
        string level "A | AA | AAA"
        string category
        string howToFix
    }
```

## Integrity guarantees

| Constraint | Location |
| --- | --- |
| CHECK constraints (enum domains, ranges) | `prisma/check-constraints.sql` — apply after `prisma db push` via `npm run db:constraints` (wired into CI) |
| Soft deletes | `deletedAt` on `Project`, `Scan`, `Violation`, `ComplianceReport`; projects also flagged `isActive = false` |
| Foreign keys | All cascade on delete (tenant cleanup), enforced by Prisma |
| Unique keys | `User.email`, `Organization.slug`, `GithubConnection.installationId`, `ScheduledScan.projectId`, `TeamInvite.token`, `PasswordReset.token`, `WcagRule.ruleId` |

## Index strategy (covered in schema)

- `Project`: `(orgId, isActive)`, `(orgId, createdAt)`, `(isActive, nextScheduledScan)` — tenant listing + scheduler sweep
- `Scan`: `(projectId, status)`, `(projectId, startedAt)`, `(status, startedAt)` — history + scheduler
- `Violation`: `(projectId, status)`, `(projectId, severity)`, `(projectId, createdAt)`, `(scanId, severity)` — filters & summaries
- `AuditLog`: `(orgId, createdAt)`, `(orgId, action)` — notification feed + activity
- `ScheduledScan`: `(isActive, nextRunAt)` — daemon sweep
- `ComplianceReport`: `(projectId, status)`, `(projectId, createdAt)`

## Notes

- `settings` / `metadata` / `summary` columns store JSON strings (mirrors legacy design); parsed defensively with `try/catch` at the API layer.
- Demo seed (`npm run db:seed`) creates WCAG rules, a default org, a test user, and — on a fresh database — a demo project with a completed scan, 10 violations, a weekly schedule, and audit log entries.
