# Volume 8 — Security Testing

## 1. Current state
- **No automated security tests** — OWASP mapping exists in `docs/security/OWASP.md` but no executable tests
- **Static analysis**: `npm audit --audit-level=high` in CI (dependency scanning only)
- **Secrets scanning**: None (planned in V7 SECRETS_MANAGEMENT.md)
- **SAST**: None (TypeScript/ESLint only)
- **DAST**: None (no runtime attack simulation)

## 2. Threat model (from V6 OWASP.md)
| Category | Current coverage | Gap |
| --- | --- | --- |
| **A01 Broken Access Control** | RBAC unit tests (14 perms × roles) | No integration/E2E verification of cross-tenant isolation |
| **A02 Cryptographic Failures** | bcrypt (passwords), TLS enforced | No test for weak cipher/TLS version |
| **A03 Injection** | Prisma (parameterised) + URL validation tests | No SQLi/NoSQLi/Command injection tests |
| **A04 Insecure Design** | Threat model documented | No design-level security tests |
| **A05 Security Misconfiguration** | Security headers (V6) | No config drift detection |
| **A06 Vulnerable Components** | `npm audit` in CI | No container scan (Trivy), no SBOM |
| **A07 Auth Failures** | NextAuth + MFA + rate limit | No brute-force / credential stuffing tests |
| **A08 Software Integrity** | Signed commits (planned) | No supply chain verification |
| **A09 Logging Failures** | AuditLog + Sentry | No log injection / tampering tests |
| **A10 SSRF** | URL validation (blocklist) | No SSRF payload tests |

## 3. Test layers (defense in depth)

### Layer 1: SAST (Static Application Security Testing)
- **Tool**: `semgrep` (fast, TypeScript rules, OWASP Top 10 ruleset)
- **CI**: Run on every PR, fail on `ERROR` severity
- **Ruleset**: `p/owasp-top-ten`, `p/secrets`, `p/typescript`
- **Config**: `.semgrep.yml` (custom rules for our patterns)

### Layer 2: Secrets Scanning
- **Tool**: `trufflehog` or `gitleaks`
- **CI**: Pre-commit + PR scan (already planned in V7)
- **Scope**: Entire repo history + staging area

### Layer 3: Dependency Scanning (SCA)
- **Current**: `npm audit --audit-level=high` in CI
- **Add**: `trivy fs .` for container + OS packages
- **Add**: `syft` SBOM generation → upload to GHCR

### Layer 4: DAST / Runtime Security Tests (new — this volume)
Create `tests/security/` with executable tests:

#### 4.1 Access Control Tests (E2E)
```typescript
// tests/security/access-control.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Cross-tenant isolation', () => {
  test('User A cannot read User B projects', async ({ browser }) => {
    const ctxA = await browser.newContext({ storageState: 'playwright/.auth/userA.json' });
    const ctxB = await browser.newContext({ storageState: 'playwright/.auth/userB.json' });
    
    const pageA = await ctxA.newPage();
    await pageA.goto('/api/projects');
    const projectsA = await pageA.evaluate(() => fetch('/api/projects').then(r => r.json()));
    
    const pageB = await ctxB.newPage();
    await pageB.goto('/api/projects');
    const projectsB = await pageB.evaluate(() => fetch('/api/projects').then(r => r.json()));
    
    // Verify no overlap
    const idsA = new Set(projectsA.data.map(p => p.id));
    const idsB = new Set(projectsB.data.map(p => p.id));
    expect([...idsA].filter(id => idsB.has(id))).toEqual([]);
  });

  test('User A cannot access User B scan results', async () => { /* ... */ });
  test('User A cannot trigger scan in User B org', async () => { /* ... */ });
  test('API returns 403 for cross-org violation access', async () => { /* ... */ });
});
```

#### 4.2 Injection Tests
```typescript
// tests/security/injection.spec.ts
import { test, expect } from '@playwright/test';

const SQLI_PAYLOADS = [
  "' OR '1'='1",
  "'; DROP TABLE users; --",
  "1 UNION SELECT password FROM users",
];

const XSS_PAYLOADS = [
  "<script>alert(1)</script>",
  "<img src=x onerror=alert(1)>",
  "javascript:alert(1)",
];

test.describe('Input validation', () => {
  for (const payload of SQLI_PAYLOADS) {
    test(`Project name rejects SQLi: ${payload}`, async ({ page }) => {
      await page.goto('/projects/new');
      await page.fill('[name="name"]', payload);
      await page.fill('[name="url"]', 'https://example.com');
      await page.click('button[type="submit"]');
      // Should either sanitize or reject (not 500)
      await expect(page.locator('text=Invalid input')).toBeVisible({ timeout: 5000 });
    });
  }

  for (const payload of XSS_PAYLOADS) {
    test(`Project name rejects XSS: ${payload}`, async ({ page }) => { /* ... */ });
  }

  test('Scan URL rejects SSRF payloads', async ({ page }) => {
    const ssrf = ['http://169.254.169.254/latest/meta-data/', 'http://localhost:22', 'http://metadata.google.internal'];
    for (const url of ssrf) {
      await page.goto('/scans/new');
      await page.fill('[name="url"]', url);
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Invalid URL')).toBeVisible({ timeout: 5000 });
    }
  });
});
```

#### 4.3 Auth Security Tests
```typescript
// tests/security/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication security', () => {
  test('Rate limit on login (5 attempts → 429)', async ({ page }) => {
    for (let i = 0; i < 6; i++) {
      await page.goto('/auth/login');
      await page.fill('#email', 'wrong@test.com');
      await page.fill('#password', 'wrong');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    }
    // 6th attempt should be rate limited
    await expect(page.locator('text=Too many attempts')).toBeVisible();
  });

  test('Session expires after inactivity', async ({ page }) => { /* ... */ });
  test('Logout invalidates session (no reuse)', async ({ page }) => { /* ... */ });
  test('MFA required for admin actions', async ({ page }) => { /* ... */ });
});
```

#### 4.4 Security Header Verification
```typescript
// tests/security/headers.spec.ts
import { test, expect } from '@playwright/test';

const REQUIRED_HEADERS = {
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': /camera=\(\)/,  // subset check
  'strict-transport-security': /max-age=31536000/,
};

test.describe('Security headers', () => {
  for (const [header, expected] of Object.entries(REQUIRED_HEADERS)) {
    test(`Response includes ${header}`, async ({ page }) => {
      const res = await page.goto('/');
      const value = res.headers()[header];
      expect(value).toMatch(expected);
    });
  }
});
```

## 5. CI integration (`.github/workflows/security.yml`)
```yaml
name: Security Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * 1'  # weekly Monday

jobs:
  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/owasp-top-ten
            p/secrets
            p/typescript
            .semgrep.yml
      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: semgrep.sarif

  secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD
          extra_args: --fail --json

  deps:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm audit --audit-level=high
      - name: Trivy FS scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          format: 'sarif'
          output: 'trivy.sarif'
      - name: Upload Trivy SARIF
        uses: github/codeql-action/upload-sarif@v3
        with: { sarif_file: trivy.sarif }

  dast:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    services:
      postgres: { image: postgres:16-alpine, ... }
      redis: { image: redis:7-alpine, ... }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run build
      - run: npm run dev &
        env: { DATABASE_URL: ..., NEXTAUTH_SECRET: ... }
      - run: sleep 30 && curl -f http://localhost:3000/api/health/live
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test tests/security --project=chromium
      - name: Upload Playwright report
        if: failure()
        uses: actions/upload-artifact@v4
        with: { name: security-dast-report, path: playwright-report/, retention-days: 7 }
```

## 6. Immediate roadmap
| Week | Deliverable |
| --- | --- |
| 1 | Add `semgrep` + `.semgrep.yml` (custom rules for our auth patterns) |
| 2 | Add `trufflehog` to CI (V7 prerequisite) |
| 3 | Create `tests/security/access-control.spec.ts` (5 tests) |
| 4 | Create `tests/security/injection.spec.ts` (10+ payloads) |
| 5 | Create `tests/security/auth.spec.ts` + `headers.spec.ts` |
| 6 | Add `security.yml` workflow; verify all gates pass |

## 7. Metrics
| Metric | Target |
| --- | --- |
| SAST findings (ERROR) | 0 on main |
| Secrets detected | 0 in history |
| Critical deps (npm audit) | 0 |
| DAST access control tests | 5+ passing |
| DAST injection tests | 15+ payloads blocked |
| Header verification | 5/5 headers present |