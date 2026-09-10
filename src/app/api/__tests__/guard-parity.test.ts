import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Guard-chain parity: every API route file must either call a recognized
// authentication/verification mechanism or be listed in PUBLIC_ALLOWLIST
// with a documented reason. Prevents silent auth regressions — a new route
// without a guard fails this test until the author whitelists it with cause
// (reviewed in PR) or adds the guard.

const API_ROOT = path.resolve(process.cwd(), 'src/app/api');

// Substring markers. Each proves the file authenticates the caller:
// session/JWT guards, resource-scoped guards, token verifiers, webhook
// signature checks, scheduler key check, NextAuth handler, SCIM bearer.
const GUARD_MARKERS = [
  'requireAuth',
  'requirePermission',
  'requireVerifiedEmail',
  'requireOrgAccess',
  'requireProjectAccess',
  'requireScanAccess',
  'enforcePermission',
  'getServerSession',
  'getToken',
  'getCurrentUser',
  'verifyToken',
  'verifyWebhookSignature',
  'resolveScimToken',
  'constructEvent', // stripe.webhooks.constructEvent
  'getSchedulerApiKey',
  'isSchedulerApiKeyValid',
  'NextAuth',
  'oauthGet', // github/connect delegates to the guarded oauth GET
];

// Routes that are intentionally public. Key = repo-relative path suffix,
// value = reason. Keep this list minimal — every entry is an accepted
// attack-surface item.
const PUBLIC_ALLOWLIST: Record<string, string> = {
  'src/app/api/auth/forgot-password/route.ts': 'public: issues reset tokens (rate-limited 3/15min per email)',
  'src/app/api/auth/register/route.ts': 'public: account creation (rate-limited 3/min per IP)',
  'src/app/api/auth/reset-password/route.ts': 'public: consumes single-use reset token',
  'src/app/api/auth/verify-email/route.ts': 'public: consumes single-use email token',
  'src/app/api/auth/verify-reset-token/route.ts': 'public: reset-token validity check',
  'src/app/api/auth/sso/callback/route.ts': 'public: IdP posts SAMLResponse (signature-verified)',
  'src/app/api/auth/sso/login/route.ts': 'public: initiates SSO redirect to IdP',
  'src/app/api/auth/sso/metadata/route.ts': 'public: SP metadata XML',
  'src/app/api/health/route.ts': 'public: liveness probe (no internals)',
  'src/app/api/health/live/route.ts': 'public: liveness probe (no internals)',
  'src/app/api/health/ready/route.ts': 'public: readiness probe (no internals)',
  'src/app/api/legal/privacy/route.ts': 'public: legal text',
  'src/app/api/legal/tos/route.ts': 'public: legal text',
  'src/app/api/docs/route.ts': 'public: OpenAPI document',
  'src/app/api/csp-report/route.ts': 'public: browser violation beacon',
  'src/app/api/route.ts': 'public: API index (no sensitive data)',
};

// Matches `export async function GET` and `export { handler as GET, ... }`.
const METHOD_RE = /export\s+(?:async\s+)?function\s+(GET|POST|PATCH|PUT|DELETE)\b|as\s+(GET|POST|PATCH|PUT|DELETE)\b/g;

interface RouteInfo {
  file: string; // repo-relative, forward slashes
  methods: string[];
  guards: string[];
}

function collectRoutes(dir: string): RouteInfo[] {
  const out: RouteInfo[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectRoutes(full));
      continue;
    }
    if (!/^route\.tsx?$/.test(entry.name)) continue;
    const source = fs.readFileSync(full, 'utf8');
    const methods = [...source.matchAll(METHOD_RE)].map((m) => m[1] ?? m[2]);
    // Word boundaries: avoids false hits like getTokenExpiry matching getToken.
    const guards = GUARD_MARKERS.filter((g) => new RegExp(`\\b${g}\\b`).test(source));
    out.push({
      file: path.relative(process.cwd(), full).replace(/\\/g, '/'),
      methods,
      guards,
    });
  }
  return out;
}

describe('API guard-chain parity', () => {
  const routes = collectRoutes(API_ROOT);

  it('discovers the expected route inventory', () => {
    // Tripwire against silent test breakage (walker bugs, moved dirs).
    expect(routes.length).toBeGreaterThan(80);
    expect(routes.every((r) => r.methods.length > 0)).toBe(true);
  });

  it('every non-allowlisted route calls an auth mechanism', () => {
    const violations = routes
      .filter((r) => r.guards.length === 0 && !(r.file in PUBLIC_ALLOWLIST))
      .map((r) => `${r.file} [${r.methods.join(',')}]`);
    expect(violations, 'routes without any auth mechanism').toEqual([]);
  });

  it('allowlist has no stale entries', () => {
    const byFile = new Map(routes.map((r) => [r.file, r]));
    const stale = Object.keys(PUBLIC_ALLOWLIST).filter((f) => {
      const r = byFile.get(f);
      return !r || r.guards.length > 0; // removed file or gained a guard
    });
    expect(stale, 'stale allowlist entries (remove them)').toEqual([]);
  });
});
