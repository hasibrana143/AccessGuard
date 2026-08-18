type Method =
  | 'get'
  | 'post'
  | 'put'
  | 'patch'
  | 'delete';

interface Operation {
  summary: string;
  tags: string[];
  security?: Array<Record<string, string[]>>;
  description?: string;
  parameters?: Array<Record<string, unknown>>;
  requestBody?: Record<string, unknown>;
  responses: Record<string, unknown>;
}

interface PathItem {
  [method: string]: Operation;
}

const AUTHED = [{ bearerAuth: [] }];

const COMMON_RESPONSES = {
  '400': { description: 'Validation error' },
  '401': { description: 'Unauthorized' },
  '403': { description: 'Forbidden' },
  '404': { description: 'Not found' },
  '429': { description: 'Rate limit exceeded' },
};

const JSON_CONTENT = (schema: unknown) => ({
  'application/json': { schema },
});

const jsonResponse = (description: string, schema: unknown) => ({
  description,
  content: JSON_CONTENT(schema),
});

function op(operation: Operation): Operation {
  return operation;
}

function authed(op: Operation): Operation {
  return { ...op, security: op.security ?? AUTHED };
}

const paths: Record<string, PathItem> = {
  '/': {
    get: op({
      tags: ['System'],
      summary: 'API root — service + database status',
      responses: {
        '200': jsonResponse('Service healthy', { $ref: '#/components/schemas/HealthResponse' }),
        '503': { description: 'Database unreachable' },
      },
    }),
  },
  '/health': {
    get: op({
      tags: ['System'],
      summary: 'Health check (database connectivity)',
      responses: {
        '200': jsonResponse('Service is healthy', { $ref: '#/components/schemas/HealthResponse' }),
        '503': { description: 'Database unreachable' },
      },
    }),
  },
  '/health/live': {
    get: op({
      tags: ['System'],
      summary: 'Liveness probe (process up, no dependencies)',
      responses: {
        '200': jsonResponse('Process is up', { $ref: '#/components/schemas/LiveResponse' }),
      },
    }),
  },
  '/health/ready': {
    get: op({
      tags: ['System'],
      summary: 'Readiness probe (DB + Redis reachable)',
      responses: {
        '200': jsonResponse('Ready to serve traffic', { $ref: '#/components/schemas/ReadyResponse' }),
        '503': jsonResponse('A dependency is down', { $ref: '#/components/schemas/ReadyResponse' }),
      },
    }),
  },
  '/docs': {
    get: op({
      tags: ['System'],
      summary: 'OpenAPI specification (Swagger UI at /api/docs)',
      responses: {
        '200': { description: 'OpenAPI JSON or HTML UI' },
      },
    }),
  },
  '/csrf-token': {
    get: authed(op({
      tags: ['Authentication'],
      summary: 'Get CSRF token for NextAuth forms',
      responses: {
        '200': { description: 'CSRF token' },
      },
    })),
  },
  '/auth/register': {
    post: op({
      tags: ['Authentication'],
      summary: 'Register a new user (sends 24h verify token)',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/RegisterRequest' }),
      },
      responses: {
        '201': { description: 'User registered' },
        '400': { description: 'Validation error' },
        '429': { description: 'Rate limit exceeded' },
      },
    }),
  },
  '/auth/forgot-password': {
    post: op({
      tags: ['Authentication'],
      summary: 'Request password reset',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/ForgotPasswordRequest' }),
      },
      responses: {
        '200': { description: 'Reset email sent' },
        '429': { description: 'Rate limit exceeded' },
      },
    }),
  },
  '/auth/reset-password': {
    post: op({
      tags: ['Authentication'],
      summary: 'Set new password with reset token (policy-enforced)',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/ResetPasswordRequest' }),
      },
      responses: {
        '200': { description: 'Password updated' },
        '400': { description: 'Token invalid or policy violated' },
      },
    }),
  },
  '/auth/verify-email': {
    get: op({
      tags: ['Authentication'],
      summary: 'Verify email via token query param',
      parameters: [{ name: 'token', in: 'query', required: true, schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Email verified' },
        '400': { description: 'Invalid or expired token' },
      },
    }),
    post: op({
      tags: ['Authentication'],
      summary: 'Resend verification email',
      responses: {
        '200': { description: 'Verification email sent' },
        '429': { description: 'Rate limit exceeded' },
      },
    }),
  },
  '/auth/verify-reset-token': {
    get: op({
      tags: ['Authentication'],
      summary: 'Check reset token validity (hashed lookup)',
      parameters: [{ name: 'token', in: 'query', required: true, schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Token is valid' },
        '400': { description: 'Token invalid' },
      },
    }),
  },
  '/auth/mfa/setup': {
    get: authed(op({
      tags: ['Authentication'],
      summary: 'Start MFA setup (returns otpauth URI / QR)',
      responses: {
        '200': { description: 'MFA setup data' },
        ...COMMON_RESPONSES,
      },
    })),
    post: authed(op({
      tags: ['Authentication'],
      summary: 'Confirm and enable MFA',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/MfaConfirmRequest' }),
      },
      responses: {
        '200': { description: 'MFA enabled' },
        ...COMMON_RESPONSES,
      },
    })),
    delete: authed(op({
      tags: ['Authentication'],
      summary: 'Disable MFA',
      responses: {
        '200': { description: 'MFA disabled' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/auth/{nextauth}': {
    get: op({
      tags: ['Authentication'],
      summary: 'NextAuth provider endpoints (session, providers, signin, csrf, callback)',
      parameters: [{ name: 'nextauth', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Provider response' },
      },
    }),
    post: op({
      tags: ['Authentication'],
      summary: 'NextAuth credential sign-in / OAuth callback',
      parameters: [{ name: 'nextauth', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Authentication result' },
        '401': { description: 'Invalid credentials or MFA required' },
      },
    }),
  },
  '/account/export': {
    get: authed(op({
      tags: ['Account'],
      summary: 'Export personal data (GDPR)',
      responses: {
        '200': { description: 'User data export' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/account/delete': {
    post: authed(op({
      tags: ['Account'],
      summary: 'Delete account (consent flow, destructive)',
      responses: {
        '200': { description: 'Account deletion initiated' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/projects': {
    get: authed(op({
      tags: ['Projects'],
      summary: 'List projects',
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': jsonResponse('List of projects', { $ref: '#/components/schemas/ProjectList' }),
        ...COMMON_RESPONSES,
      },
    })),
    post: authed(op({
      tags: ['Projects'],
      summary: 'Create a project',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/CreateProjectRequest' }),
      },
      responses: {
        '201': jsonResponse('Project created', { $ref: '#/components/schemas/Project' }),
        '400': { description: 'Validation error (URL unreachable, duplicates)' },
        '429': { description: 'Rate limit exceeded (30/min)' },
      },
    })),
    patch: authed(op({
      tags: ['Projects'],
      summary: 'Update a project',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/UpdateProjectRequest' }),
      },
      responses: {
        '200': jsonResponse('Project updated', { $ref: '#/components/schemas/Project' }),
        ...COMMON_RESPONSES,
      },
    })),
    delete: authed(op({
      tags: ['Projects'],
      summary: 'Delete a project',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/DeleteRequest' }),
      },
      responses: {
        '200': { description: 'Project deleted' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/projects/verify': {
    get: authed(op({
      tags: ['Projects'],
      summary: 'Verify project URL reachability',
      parameters: [{ name: 'url', in: 'query', required: true, schema: { type: 'string', format: 'uri' } }],
      responses: {
        '200': { description: 'Verification result' },
        ...COMMON_RESPONSES,
      },
    })),
    post: authed(op({
      tags: ['Projects'],
      summary: 'Verify project URL reachability (body)',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/VerifyProjectRequest' }),
      },
      responses: {
        '200': { description: 'Verification result' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/projects/import': {
    post: authed(op({
      tags: ['Projects'],
      summary: 'Import project from GitHub repositories',
      responses: {
        '201': { description: 'Projects imported' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/scans': {
    get: authed(op({
      tags: ['Scans'],
      summary: 'List scans',
      parameters: [
        { name: 'projectId', in: 'query', schema: { type: 'string' } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': { description: 'List of scans' },
        ...COMMON_RESPONSES,
      },
    })),
    post: authed(op({
      tags: ['Scans'],
      summary: 'Create and run a scan (queued, 3 attempts / 2s backoff)',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/StartScanRequest' }),
      },
      responses: {
        '201': { description: 'Scan started' },
        ...COMMON_RESPONSES,
        '429': { description: 'Rate limit exceeded (10/min)' },
      },
    })),
    patch: authed(op({
      tags: ['Scans'],
      summary: 'Update scan metadata/status',
      responses: {
        '200': { description: 'Scan updated' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/scans/progress': {
    get: authed(op({
      tags: ['Scans'],
      summary: 'Poll scan job progress',
      parameters: [{ name: 'jobId', in: 'query', schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Job progress' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/schedule': {
    get: authed(op({
      tags: ['Schedules'],
      summary: 'List scheduled scans',
      responses: {
        '200': { description: 'List of schedules' },
        ...COMMON_RESPONSES,
      },
    })),
    post: authed(op({
      tags: ['Schedules'],
      summary: 'Create a scheduled scan',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/CreateScheduleRequest' }),
      },
      responses: {
        '201': { description: 'Schedule created' },
        ...COMMON_RESPONSES,
      },
    })),
    delete: authed(op({
      tags: ['Schedules'],
      summary: 'Delete a schedule',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/DeleteRequest' }),
      },
      responses: {
        '200': { description: 'Schedule deleted' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/schedule/{id}': {
    get: authed(op({
      tags: ['Schedules'],
      summary: 'Get a schedule',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Schedule detail' },
        ...COMMON_RESPONSES,
      },
    })),
    patch: authed(op({
      tags: ['Schedules'],
      summary: 'Pause/resume/update a schedule',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Schedule updated' },
        ...COMMON_RESPONSES,
      },
    })),
    delete: authed(op({
      tags: ['Schedules'],
      summary: 'Delete a schedule',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Schedule deleted' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/schedule/process': {
    get: op({
      tags: ['Schedules'],
      summary: 'Scheduler daemon tick (protected by X-Scheduler-Api-Key)',
      security: [{ schedulerKey: [] }],
      responses: {
        '200': { description: 'Scheduler tick executed' },
        '401': { description: 'Missing/invalid scheduler key' },
      },
    }),
    post: op({
      tags: ['Schedules'],
      summary: 'Scheduler daemon tick (POST variant)',
      security: [{ schedulerKey: [] }],
      responses: {
        '200': { description: 'Scheduler tick executed' },
        '401': { description: 'Missing/invalid scheduler key' },
      },
    }),
  },
  '/violations': {
    get: authed(op({
      tags: ['Violations'],
      summary: 'List violations with filters',
      parameters: [
        { name: 'severity', in: 'query', schema: { type: 'string', enum: ['critical', 'serious', 'moderate', 'minor'] } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['open', 'fixed', 'ignored', 'false_positive'] } },
        { name: 'projectId', in: 'query', schema: { type: 'string' } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': jsonResponse('List of violations', { $ref: '#/components/schemas/ViolationList' }),
        ...COMMON_RESPONSES,
      },
    })),
    put: authed(op({
      tags: ['Violations'],
      summary: 'Update violation status',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/UpdateViolationRequest' }),
      },
      responses: {
        '200': { description: 'Violation updated' },
        ...COMMON_RESPONSES,
      },
    })),
    post: authed(op({
      tags: ['Violations'],
      summary: 'Bulk status update',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/BulkUpdateViolationsRequest' }),
      },
      responses: {
        '200': { description: 'Violations updated' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/violations/batch': {
    patch: authed(op({
      tags: ['Violations'],
      summary: 'Bulk update violation status/metadata',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/BulkUpdateViolationsRequest' }),
      },
      responses: {
        '200': { description: 'Violations updated' },
        ...COMMON_RESPONSES,
        '429': { description: 'Rate limit exceeded' },
      },
    })),
  },
  '/violations/export': {
    get: authed(op({
      tags: ['Violations'],
      summary: 'Export violations as CSV',
      parameters: [
        { name: 'severity', in: 'query', schema: { type: 'string' } },
        { name: 'status', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'CSV download' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/remediate': {
    get: authed(op({
      tags: ['Remediation'],
      summary: 'Get cached remediation for a violation',
      parameters: [{ name: 'violationId', in: 'query', schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Cached remediation' },
        ...COMMON_RESPONSES,
      },
    })),
    post: authed(op({
      tags: ['Remediation'],
      summary: 'Generate AI remediation code (template fallback when no AI key)',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/RemediateRequest' }),
      },
      responses: {
        '200': jsonResponse('Remediation generated', { $ref: '#/components/schemas/RemediationResult' }),
        ...COMMON_RESPONSES,
        '429': { description: 'Rate limit exceeded (20/min)' },
      },
    })),
  },
  '/remediate/batch': {
    post: authed(op({
      tags: ['Remediation'],
      summary: 'Batch AI remediation',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/RemediateBatchRequest' }),
      },
      responses: {
        '200': { description: 'Batch remediation complete' },
        ...COMMON_RESPONSES,
        '429': { description: 'Rate limit exceeded (20/min)' },
      },
    })),
  },
  '/reports': {
    get: authed(op({
      tags: ['Reports'],
      summary: 'List generated reports',
      responses: {
        '200': { description: 'Report list' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/reports/generate': {
    get: authed(op({
      tags: ['Reports'],
      summary: 'Get a generated report by id',
      parameters: [{ name: 'id', in: 'query', schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Report data' },
        ...COMMON_RESPONSES,
      },
    })),
    post: authed(op({
      tags: ['Reports'],
      summary: 'Generate a compliance report',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/GenerateReportRequest' }),
      },
      responses: {
        '201': { description: 'Report generated' },
        ...COMMON_RESPONSES,
      },
    })),
    delete: authed(op({
      tags: ['Reports'],
      summary: 'Delete a report',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/DeleteRequest' }),
      },
      responses: {
        '200': { description: 'Report deleted' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/reports/list': {
    get: authed(op({
      tags: ['Reports'],
      summary: 'List reports (paginated)',
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': { description: 'Paginated report list' },
        ...COMMON_RESPONSES,
      },
    })),
    delete: authed(op({
      tags: ['Reports'],
      summary: 'Delete a report',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/DeleteRequest' }),
      },
      responses: {
        '200': { description: 'Report deleted' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/reports/share': {
    get: op({
      tags: ['Reports'],
      summary: 'List report share links (authenticated)',
      security: [{ bearerAuth: [] }, { sessionAuth: [] }],
      responses: {
        '200': { description: 'Share links' },
        ...COMMON_RESPONSES,
      },
    }),
    post: authed(op({
      tags: ['Reports'],
      summary: 'Create a share link (expiry default 30 days, max 365)',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/CreateShareRequest' }),
      },
      responses: {
        '201': jsonResponse('Share link created', { $ref: '#/components/schemas/ShareLink' }),
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/reports/download': {
    get: authed(op({
      tags: ['Reports'],
      summary: 'Download a report as PDF (Content-Disposition attachment)',
      parameters: [{ name: 'id', in: 'query', required: true, schema: { type: 'string' } }],
      responses: {
        '200': { description: 'PDF binary', content: { 'application/pdf': {} } },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/reports/executive-summary': {
    get: authed(op({
      tags: ['Reports'],
      summary: 'Executive summary PDF (white-label aware)',
      parameters: [{ name: 'id', in: 'query', schema: { type: 'string' } }],
      responses: {
        '200': { description: 'PDF binary', content: { 'application/pdf': {} } },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/reports/vpat': {
    get: authed(op({
      tags: ['Reports'],
      summary: 'VPAT (Voluntary Product Accessibility Template) PDF',
      parameters: [{ name: 'id', in: 'query', schema: { type: 'string' } }],
      responses: {
        '200': { description: 'PDF binary', content: { 'application/pdf': {} } },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/roles': {
    get: authed(op({
      tags: ['Roles'],
      summary: 'List custom roles',
      responses: {
        '200': { description: 'Role list' },
        ...COMMON_RESPONSES,
      },
    })),
    post: authed(op({
      tags: ['Roles'],
      summary: 'Create a custom role (name + permission strings)',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/CreateRoleRequest' }),
      },
      responses: {
        '201': { description: 'Role created' },
        ...COMMON_RESPONSES,
      },
    })),
    patch: authed(op({
      tags: ['Roles'],
      summary: 'Update a role',
      responses: {
        '200': { description: 'Role updated' },
        ...COMMON_RESPONSES,
      },
    })),
    delete: authed(op({
      tags: ['Roles'],
      summary: 'Delete a role',
      responses: {
        '200': { description: 'Role deleted' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/github/oauth': {
    get: authed(op({
      tags: ['GitHub'],
      summary: 'Get GitHub OAuth authorize URL',
      responses: {
        '200': { description: 'Authorization URL' },
        ...COMMON_RESPONSES,
      },
    })),
    post: authed(op({
      tags: ['GitHub'],
      summary: 'Initiate GitHub OAuth flow',
      responses: {
        '200': { description: 'OAuth flow data' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/github/callback': {
    get: authed(op({
      tags: ['GitHub'],
      summary: 'OAuth callback (requires verified session; redirects)',
      parameters: [{ name: 'code', in: 'query', schema: { type: 'string' } }, { name: 'state', in: 'query', schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Callback handled (redirect)' },
      },
    })),
  },
  '/github/webhook': {
    post: op({
      tags: ['GitHub'],
      summary: 'GitHub App installation webhook (HMAC-SHA256 verified)',
      description:
        'Ingests `installation` + `installation_repositories` events to keep GithubConnection in sync. Signature must match x-hub-signature-256 (GITHUB_APP_WEBHOOK_SECRET).',
      security: [{ webhookSignature: [] }],
      parameters: [
        { name: 'x-github-event', in: 'header', required: true, schema: { type: 'string' } },
        { name: 'x-hub-signature-256', in: 'header', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': { description: 'Event acknowledged' },
        '401': { description: 'Invalid signature' },
        '503': { description: 'Webhook not configured (secret missing)' },
      },
    }),
  },
  '/github/connect': {
    get: authed(op({
      tags: ['GitHub'],
      summary: 'Connect GitHub (owner)',
      responses: {
        '200': { description: 'Connection result' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/github/disconnect': {
    post: authed(op({
      tags: ['GitHub'],
      summary: 'Revoke grant and delete connection (owner)',
      responses: {
        '200': { description: 'Connection deleted' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/github/repos': {
    get: authed(op({
      tags: ['GitHub'],
      summary: 'List repositories from token',
      responses: {
        '200': { description: 'Repository list' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/github/status': {
    get: authed(op({
      tags: ['GitHub'],
      summary: 'GitHub connection status',
      responses: {
        '200': { description: 'Connection status' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/github/create-pr': {
    post: authed(op({
      tags: ['GitHub'],
      summary: 'Create PR with applied fixes (writes summary + fix files)',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/CreatePrRequest' }),
      },
      responses: {
        '200': jsonResponse('PR created', { $ref: '#/components/schemas/PrResult' }),
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/github/pr': {
    get: authed(op({
      tags: ['GitHub'],
      summary: 'PR metadata',
      parameters: [{ name: 'violationId', in: 'query', schema: { type: 'string' } }],
      responses: {
        '200': { description: 'PR metadata' },
        ...COMMON_RESPONSES,
      },
    })),
    post: authed(op({
      tags: ['GitHub'],
      summary: 'Create or update PR metadata',
      responses: {
        '200': { description: 'PR metadata stored' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/github/pr-status': {
    get: authed(op({
      tags: ['GitHub'],
      summary: 'PR status check',
      parameters: [{ name: 'violationId', in: 'query', schema: { type: 'string' } }],
      responses: {
        '200': { description: 'PR status' },
        ...COMMON_RESPONSES,
      },
    })),
    post: authed(op({
      tags: ['GitHub'],
      summary: 'Update PR status',
      responses: {
        '200': { description: 'PR status updated' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/stripe/checkout': {
    post: authed(op({
      tags: ['Billing'],
      summary: 'Create Stripe checkout session',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/CheckoutRequest' }),
      },
      responses: {
        '200': { description: 'Checkout session' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/stripe/coupon': {
    get: authed(op({
      tags: ['Billing'],
      summary: 'Get applied coupon',
      responses: {
        '200': { description: 'Coupon data' },
        ...COMMON_RESPONSES,
      },
    })),
    post: authed(op({
      tags: ['Billing'],
      summary: 'Apply a coupon',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/CouponRequest' }),
      },
      responses: {
        '200': { description: 'Coupon applied' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/stripe/create-customer': {
    post: authed(op({
      tags: ['Billing'],
      summary: 'Create Stripe customer for the org',
      responses: {
        '200': { description: 'Customer created' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/stripe/create-subscription': {
    post: authed(op({
      tags: ['Billing'],
      summary: 'Create a subscription',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/CreateSubscriptionRequest' }),
      },
      responses: {
        '200': { description: 'Subscription created' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/stripe/cancel-subscription': {
    post: authed(op({
      tags: ['Billing'],
      summary: 'Cancel subscription',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/DeleteRequest' }),
      },
      responses: {
        '200': { description: 'Subscription cancelled' },
        ...COMMON_RESPONSES,
      },
    })),
    get: authed(op({
      tags: ['Billing'],
      summary: 'Cancel intent / status',
      responses: {
        '200': { description: 'Cancellation status' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/stripe/subscription': {
    get: authed(op({
      tags: ['Billing'],
      summary: 'Get current subscription',
      responses: {
        '200': { description: 'Subscription detail' },
        ...COMMON_RESPONSES,
      },
    })),
    post: authed(op({
      tags: ['Billing'],
      summary: 'Create/update subscription',
      responses: {
        '200': { description: 'Subscription updated' },
        ...COMMON_RESPONSES,
      },
    })),
    delete: authed(op({
      tags: ['Billing'],
      summary: 'Cancel subscription',
      responses: {
        '200': { description: 'Subscription cancelled' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/stripe/invoices': {
    get: authed(op({
      tags: ['Billing'],
      summary: 'List invoices',
      responses: {
        '200': { description: 'Invoice list' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/stripe/webhook': {
    post: op({
      tags: ['Billing'],
      summary: 'Stripe webhook (constructWebhookEvent signature check)',
      responses: {
        '200': { description: 'Webhook received' },
        '400': { description: 'Invalid signature' },
      },
    }),
  },
  '/team/invite': {
    get: authed(op({
      tags: ['Teams'],
      summary: 'List team invites',
      responses: {
        '200': { description: 'Invite list' },
        ...COMMON_RESPONSES,
      },
    })),
    post: authed(op({
      tags: ['Teams'],
      summary: 'Invite a team member (token hashed at rest)',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/InviteRequest' }),
      },
      responses: {
        '201': { description: 'Invite sent' },
        ...COMMON_RESPONSES,
      },
    })),
    delete: authed(op({
      tags: ['Teams'],
      summary: 'Revoke a pending invite',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/DeleteRequest' }),
      },
      responses: {
        '200': { description: 'Invite revoked' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/team/accept-invite': {
    get: op({
      tags: ['Teams'],
      summary: 'Validate invite token',
      parameters: [{ name: 'token', in: 'query', required: true, schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Token valid' },
        '400': { description: 'Invalid/expired token' },
      },
    }),
    post: op({
      tags: ['Teams'],
      summary: 'Accept invite with token',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/AcceptInviteRequest' }),
      },
      responses: {
        '200': { description: 'Invite accepted' },
        '400': { description: 'Invalid/expired token' },
      },
    }),
  },
  '/team/members': {
    get: authed(op({
      tags: ['Teams'],
      summary: 'List team members',
      responses: {
        '200': { description: 'Member list' },
        ...COMMON_RESPONSES,
      },
    })),
    patch: authed(op({
      tags: ['Teams'],
      summary: 'Change member role',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/UpdateMemberRequest' }),
      },
      responses: {
        '200': { description: 'Member updated' },
        ...COMMON_RESPONSES,
      },
    })),
    delete: authed(op({
      tags: ['Teams'],
      summary: 'Remove a member',
      responses: {
        '200': { description: 'Member removed' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/team/pending-invites': {
    get: authed(op({
      tags: ['Teams'],
      summary: 'List pending invites',
      responses: {
        '200': { description: 'Pending invites' },
        ...COMMON_RESPONSES,
      },
    })),
    delete: authed(op({
      tags: ['Teams'],
      summary: 'Revoke a pending invite',
      responses: {
        '200': { description: 'Invite revoked' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/settings': {
    get: authed(op({
      tags: ['Settings'],
      summary: 'Get organization settings',
      responses: {
        '200': jsonResponse('Settings', { $ref: '#/components/schemas/Settings' }),
        ...COMMON_RESPONSES,
      },
    })),
    patch: authed(op({
      tags: ['Settings'],
      summary: 'Update organization settings',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/UpdateSettingsRequest' }),
      },
      responses: {
        '200': { description: 'Settings updated' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/settings/api-key': {
    get: authed(op({
      tags: ['Settings'],
      summary: 'Get API key metadata (never the raw key)',
      responses: {
        '200': { description: 'API key metadata' },
        ...COMMON_RESPONSES,
      },
    })),
    post: authed(op({
      tags: ['Settings'],
      summary: 'Generate/rotate API key',
      responses: {
        '200': { description: 'New API key (shown once)' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/billing/currency': {
    get: authed(op({
      tags: ['Billing'],
      summary: 'Read org billing currency + FX snapshot',
      responses: {
        '200': { description: 'Currency, symbol, rates, supported list' },
        '401': { description: 'Unauthorized' },
      },
    })),
    patch: authed(op({
      tags: ['Billing'],
      summary: 'Change org billing currency (admin/owner)',
      description: 'Supports usd | eur | gbp | inr. Emits settings.updated audit event.',
      requestBody: {
        required: true,
        content: JSON_CONTENT({
          type: 'object',
          properties: { currency: { type: 'string', enum: ['usd', 'eur', 'gbp', 'inr'] } },
        }),
      },
      responses: {
        '200': { description: 'Currency updated' },
        '400': { description: 'Invalid currency' },
        '403': { description: 'Requires admin/owner role' },
      },
    })),
  },
  '/scim/v2/ServiceProviderConfig': {
    get: op({
      tags: ['SCIM'],
      summary: 'SCIM 2.0 Service Provider Configuration',
      description:
        'RFC 7644 §4 discovery document. Protected by the per-org SCIM bearer token (Authorization: Bearer).',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': { description: 'Service provider config' },
        '401': { description: 'Missing or invalid SCIM token' },
      },
    }),
  },
  '/scim/v2/Users': {
    get: op({
      tags: ['SCIM'],
      summary: 'List users (SCIM 2.0)',
      description:
        'Lists org users. Supports filter=userName eq "…", startIndex, count (RFC 7644 §3.4.2).',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'filter', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'startIndex', in: 'query', required: false, schema: { type: 'integer' } },
        { name: 'count', in: 'query', required: false, schema: { type: 'integer', maximum: 100 } },
      ],
      responses: {
        '200': { description: 'ListResponse with Resources' },
        '401': { description: 'Missing or invalid SCIM token' },
      },
    }),
    post: op({
      tags: ['SCIM'],
      summary: 'Provision a user (SCIM 2.0)',
      description:
        'Creates a member account by email (idempotent per RFC 7644 §3.2). Emits scim.user_created audit event.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: JSON_CONTENT({
          type: 'object',
          properties: {
            schemas: { type: 'array', items: { type: 'string' } },
            userName: { type: 'string', description: 'Email' },
            emails: { type: 'array', items: { type: 'object' } },
            name: {
              type: 'object',
              properties: { givenName: { type: 'string' }, familyName: { type: 'string' } },
            },
            active: { type: 'boolean' },
          },
        }),
      },
      responses: {
        '201': { description: 'User created' },
        '200': { description: 'User already existed (idempotent)' },
        '400': { description: 'Invalid body' },
        '401': { description: 'Missing or invalid SCIM token' },
      },
    }),
  },
  '/scim/v2/Users/{id}': {
    get: op({
      tags: ['SCIM'],
      summary: 'Fetch one user (SCIM 2.0)',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': { description: 'User resource' },
        '401': { description: 'Missing or invalid SCIM token' },
        '404': { description: 'User not found' },
      },
    }),
    patch: op({
      tags: ['SCIM'],
      summary: 'Deprovision a user (SCIM 2.0)',
      description:
        'Supports active=false (deprovision — removes the account). Emits scim.user_deactivated audit event.',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: JSON_CONTENT({
          type: 'object',
          properties: { active: { type: 'boolean' } },
        }),
      },
      responses: {
        '204': { description: 'Deprovisioned' },
        '401': { description: 'Missing or invalid SCIM token' },
        '404': { description: 'User not found' },
      },
    }),
    delete: op({
      tags: ['SCIM'],
      summary: 'Delete a user (SCIM 2.0)',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '204': { description: 'Deleted' },
        '401': { description: 'Missing or invalid SCIM token' },
        '404': { description: 'User not found' },
      },
    }),
  },
  '/scim/v2/Groups': {
    get: op({
      tags: ['SCIM'],
      summary: 'List groups (SCIM 2.0)',
      description:
        'Lists org groups. Supports filter=displayName eq "…", startIndex, count (RFC 7644 §3.4.2).',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'filter', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'startIndex', in: 'query', required: false, schema: { type: 'integer' } },
        { name: 'count', in: 'query', required: false, schema: { type: 'integer', maximum: 100 } },
      ],
      responses: {
        '200': { description: 'ListResponse with Resources' },
        '401': { description: 'Missing or invalid SCIM token' },
      },
    }),
    post: op({
      tags: ['SCIM'],
      summary: 'Create a group (SCIM 2.0)',
      description:
        'Creates a group with displayName and optional members. Emits scim.group_created audit event.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: JSON_CONTENT({
          type: 'object',
          properties: {
            schemas: { type: 'array', items: { type: 'string' } },
            displayName: { type: 'string' },
            members: { type: 'array', items: { type: 'object' } },
          },
        }),
      },
      responses: {
        '201': { description: 'Group created' },
        '400': { description: 'Invalid body' },
        '401': { description: 'Missing or invalid SCIM token' },
      },
    }),
  },
  '/scim/v2/Groups/{id}': {
    get: op({
      tags: ['SCIM'],
      summary: 'Fetch one group (SCIM 2.0)',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Group resource' },
        '401': { description: 'Missing or invalid SCIM token' },
        '404': { description: 'Group not found' },
      },
    }),
    put: op({
      tags: ['SCIM'],
      summary: 'Replace a group (SCIM 2.0)',
      description:
        'Full update of displayName and members. Emits scim.group_updated audit event.',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: JSON_CONTENT({
          type: 'object',
          properties: {
            schemas: { type: 'array', items: { type: 'string' } },
            displayName: { type: 'string' },
            members: { type: 'array', items: { type: 'object' } },
          },
        }),
      },
      responses: {
        '200': { description: 'Group updated' },
        '400': { description: 'Invalid body' },
        '401': { description: 'Missing or invalid SCIM token' },
        '404': { description: 'Group not found' },
      },
    }),
    patch: op({
      tags: ['SCIM'],
      summary: 'Update a group (SCIM 2.0 PATCH - not implemented)',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '501': { description: 'PATCH not implemented' },
        '401': { description: 'Missing or invalid SCIM token' },
      },
    }),
    delete: op({
      tags: ['SCIM'],
      summary: 'Delete a group (SCIM 2.0)',
      description:
        'Deletes the group. Emits scim.group_deleted audit event.',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '204': { description: 'Deleted' },
        '401': { description: 'Missing or invalid SCIM token' },
        '404': { description: 'Group not found' },
      },
    }),
  },
  '/settings/region': {
    get: authed(op({
      tags: ['Settings'],
      summary: 'Get data residency region',
      description: 'Returns the org dataRegion (us | eu) used for regional routing and AI endpoint pinning.',
      responses: {
        '200': { description: 'Current data region' },
        ...COMMON_RESPONSES,
      },
    })),
    patch: authed(op({
      tags: ['Settings'],
      summary: 'Set data residency region (admin/owner)',
      requestBody: {
        required: true,
        content: JSON_CONTENT({
          type: 'object',
          properties: { dataRegion: { type: 'string', enum: ['us', 'eu'] } },
          required: ['dataRegion'],
        }),
      },
      responses: {
        '200': { description: 'Region updated' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/stats/trends': {
    get: authed(op({
      tags: ['Stats'],
      summary: 'Violation trends over time',
      responses: {
        '200': { description: 'Trend series' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/stats/regression': {
    get: authed(op({
      tags: ['Stats'],
      summary: 'Regression data (violations reintroduced)',
      responses: {
        '200': { description: 'Regression series' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/stats/usage': {
    get: authed(op({
      tags: ['Stats'],
      summary: 'Usage stats (scans, pages, quota)',
      responses: {
        '200': { description: 'Usage stats' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/org/data-export': {
    get: authed(op({
      tags: ['Organization'],
      summary: 'GDPR Art. 20 data portability export (admin/owner)',
      description:
        'Structured JSON of everything the org controls: user profile, organization, projects, violations, scans, audit logs (90d), team invites, custom roles. Sensitive fields (password hashes, tokens, MFA secrets) excluded.',
      responses: {
        '200': { description: 'Portable data payload' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/audit': {
    get: authed(op({
      tags: ['Audit'],
      summary: 'Audit log entries (paged)',
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': { description: 'Audit log entries' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/audit-logs': {
    get: authed(op({
      tags: ['Audit'],
      summary: 'Audit logs (dashboard page)',
      responses: {
        '200': { description: 'Audit log entries' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/audit-logs/export': {
    get: authed(op({
      tags: ['Audit'],
      summary: 'Export audit logs (JSON / CSV / CEF for SIEM)',
      description:
        'Enterprise export of organization audit activity. Formats: json (default), csv (formula-injection sanitized), cef (Common Event Format for Splunk/ArcSight/QRadar). Admin/owner role required.',
      parameters: [
        { name: 'since', in: 'query', schema: { type: 'string', description: 'ISO date, default 30 days ago' } },
        { name: 'until', in: 'query', schema: { type: 'string', description: 'ISO date, default now' } },
        { name: 'format', in: 'query', schema: { type: 'string', enum: ['json', 'csv', 'cef'] } },
        { name: 'limit', in: 'query', schema: { type: 'integer', maximum: 10000 } },
      ],
      responses: {
        '200': { description: 'Exported audit events (body depends on format)' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/flags': {
    get: authed(op({
      tags: ['Admin'],
      summary: 'List feature flags',
      responses: {
        '200': { description: 'Feature flag states' },
        ...COMMON_RESPONSES,
      },
    })),
    post: authed(op({
      tags: ['Admin'],
      summary: 'Create/update a feature flag',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/FlagRequest' }),
      },
      responses: {
        '200': { description: 'Flag updated' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/admin': {
    get: authed(op({
      tags: ['Admin'],
      summary: 'Admin panel data (role-gated)',
      responses: {
        '200': { description: 'Admin data' },
        '403': { description: 'Requires admin/owner role' },
      },
    })),
    patch: authed(op({
      tags: ['Admin'],
      summary: 'Admin mutation (role-gated)',
      responses: {
        '200': { description: 'Updated' },
        '403': { description: 'Requires admin/owner role' },
      },
    })),
  },
  '/admin/scim': {
    get: authed(op({
      tags: ['Admin'],
      summary: 'SCIM provisioning status (admin/owner)',
      responses: {
        '200': { description: 'SCIM status + endpoint' },
        '403': { description: 'Requires admin/owner role' },
      },
    })),
    post: authed(op({
      tags: ['Admin'],
      summary: 'Generate a SCIM bearer token (admin/owner)',
      description:
        'Rotates the org SCIM token (RFC 7644 provisioning). Returns the token exactly once; store it in your IdP (Okta/Azure AD). Emits scim_token_generated audit event.',
      responses: {
        '200': { description: 'New SCIM token (shown once)' },
        '403': { description: 'Requires admin/owner role' },
      },
    })),
  },
  '/admin/sso': {
    get: authed(op({
      tags: ['Admin'],
      summary: 'Read SSO configuration (admin/owner)',
      description:
        'Returns SSO state for the org: enabled flag, provider, issuer, entry point, and whether a certificate is configured. The raw certificate is never returned.',
      responses: {
        '200': { description: 'SSO config (certificate omitted)' },
        '403': { description: 'Requires admin/owner role' },
      },
    })),
    patch: authed(op({
      tags: ['Admin'],
      summary: 'Upsert SSO configuration (admin/owner)',
      description:
        'Configure SAML SSO: provider (okta | azure-ad | google-workspace | custom-saml), issuer, https entry point, PEM certificate. Enabling requires the full set. Emits sso.config_updated / sso.config_removed audit events.',
      requestBody: {
        required: true,
        content: JSON_CONTENT({
          type: 'object',
          properties: {
            ssoEnabled: { type: 'boolean' },
            ssoProvider: { type: 'string', enum: ['okta', 'azure-ad', 'google-workspace', 'custom-saml'] },
            ssoIssuer: { type: 'string' },
            ssoEntryPoint: { type: 'string', format: 'uri' },
            ssoCertificate: { type: 'string', description: 'PEM certificate block' },
          },
        }),
      },
      responses: {
        '200': { description: 'SSO config updated' },
        '400': { description: 'Validation error' },
        '403': { description: 'Requires admin/owner role' },
      },
    })),
  },
  '/notifications/test': {
    post: authed(op({
      tags: ['Notifications'],
      summary: 'Send test notification (Slack/email)',
      responses: {
        '200': { description: 'Test notification sent' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/legal/privacy': {
    get: op({
      tags: ['Legal'],
      summary: 'Privacy policy',
      responses: {
        '200': { description: 'Privacy policy document' },
      },
    }),
  },
  '/legal/tos': {
    get: op({
      tags: ['Legal'],
      summary: 'Terms of service',
      responses: {
        '200': { description: 'Terms document' },
      },
    }),
  },
  '/consent': {
    get: authed(op({
      tags: ['Settings'],
      summary: 'Get cookie consent status',
      responses: {
        '200': { description: 'Consent status (accepted|declined|pending)' },
        ...COMMON_RESPONSES,
      },
    })),
    post: authed(op({
      tags: ['Settings'],
      summary: 'Update cookie consent (GDPR)',
      description:
        'Records user consent for analytics cookies. Emits cookie_consent_updated audit event.',
      requestBody: {
        required: true,
        content: JSON_CONTENT({
          type: 'object',
          properties: {
            consent: { type: 'string', enum: ['accepted', 'declined'] },
            version: { type: 'string' },
          },
        }),
      },
      responses: {
        '200': { description: 'Consent recorded' },
        ...COMMON_RESPONSES,
      },
    })),
  },
};

const schemas = {
  HealthResponse: {
    type: 'object',
    properties: {
      status: { type: 'string', example: 'ok' },
      database: { type: 'string', example: 'connected' },
      timestamp: { type: 'string', format: 'date-time' },
    },
  },
  LiveResponse: {
    type: 'object',
    properties: {
      status: { type: 'string', example: 'ok' },
      uptimeSeconds: { type: 'integer' },
      timestamp: { type: 'string', format: 'date-time' },
    },
  },
  ReadyResponse: {
    type: 'object',
    properties: {
      status: { type: 'string', example: 'ready' },
      checks: {
        type: 'object',
        additionalProperties: { type: 'string', enum: ['up', 'down', 'not-configured'] },
      },
      timestamp: { type: 'string', format: 'date-time' },
    },
  },
  RegisterRequest: {
    type: 'object',
    required: ['email', 'password', 'name'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 },
      name: { type: 'string' },
    },
  },
  ForgotPasswordRequest: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email' },
    },
  },
  ResetPasswordRequest: {
    type: 'object',
    required: ['token', 'password'],
    properties: {
      token: { type: 'string' },
      password: { type: 'string', minLength: 8, description: 'Policy-enforced' },
    },
  },
  MfaConfirmRequest: {
    type: 'object',
    required: ['code'],
    properties: {
      code: { type: 'string', description: 'TOTP code' },
      secret: { type: 'string' },
    },
  },
  CreateProjectRequest: {
    type: 'object',
    required: ['name', 'url'],
    properties: {
      name: { type: 'string' },
      url: { type: 'string', format: 'uri' },
      description: { type: 'string' },
      branch: { type: 'string', description: 'GitHub branch to monitor' },
      repository: { type: 'string', description: 'owner/repo when imported from GitHub' },
    },
  },
  UpdateProjectRequest: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      url: { type: 'string', format: 'uri' },
      description: { type: 'string' },
    },
  },
  VerifyProjectRequest: {
    type: 'object',
    required: ['url'],
    properties: {
      url: { type: 'string', format: 'uri' },
    },
  },
  Project: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      url: { type: 'string' },
      riskScore: { type: 'number' },
      totalViolations: { type: 'integer' },
    },
  },
  ProjectList: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      data: {
        type: 'array',
        items: { $ref: '#/components/schemas/Project' },
      },
    },
  },
  StartScanRequest: {
    type: 'object',
    required: ['projectId'],
    properties: {
      projectId: { type: 'string' },
      html: { type: 'string', description: 'Optional inline HTML to scan' },
    },
  },
  CreateScheduleRequest: {
    type: 'object',
    required: ['projectId', 'frequency'],
    properties: {
      projectId: { type: 'string' },
      frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
      cron: { type: 'string', description: 'Cron expression (frequency overrides)' },
      timezone: { type: 'string' },
    },
  },
  Violation: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      rule: { type: 'string' },
      severity: { type: 'string', enum: ['critical', 'serious', 'moderate', 'minor'] },
      status: { type: 'string', enum: ['open', 'fixed', 'ignored', 'false_positive'] },
      remediationCode: { type: 'string', description: 'Cached AI remediation (template fallback)' },
      aiConfidenceScore: { type: 'number', nullable: true },
      githubPrUrl: { type: 'string' },
    },
  },
  ViolationList: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      data: {
        type: 'array',
        items: { $ref: '#/components/schemas/Violation' },
      },
    },
  },
  UpdateViolationRequest: {
    type: 'object',
    required: ['id', 'status'],
    properties: {
      id: { type: 'string' },
      status: { type: 'string', enum: ['open', 'fixed', 'ignored', 'false_positive'] },
      note: { type: 'string' },
    },
  },
  BulkUpdateViolationsRequest: {
    type: 'object',
    required: ['ids'],
    properties: {
      ids: { type: 'array', items: { type: 'string' } },
      status: { type: 'string', enum: ['open', 'fixed', 'ignored', 'false_positive'] },
      metadata: { type: 'object' },
    },
  },
  RemediateRequest: {
    type: 'object',
    required: ['violationId'],
    properties: {
      violationId: { type: 'string' },
      forceRegenerate: { type: 'boolean' },
    },
  },
  RemediateBatchRequest: {
    type: 'object',
    required: ['ids'],
    properties: {
      ids: { type: 'array', items: { type: 'string' } },
      forceRegenerate: { type: 'boolean' },
    },
  },
  RemediationResult: {
    type: 'object',
    properties: {
      remediationCode: { type: 'string' },
      aiExplanation: { type: 'string' },
      aiConfidenceScore: { type: 'number', nullable: true },
      templateFallback: { type: 'boolean' },
    },
  },
  GenerateReportRequest: {
    type: 'object',
    required: ['projectId'],
    properties: {
      projectId: { type: 'string' },
      format: { type: 'string', enum: ['pdf', 'html'] },
      includeRemediation: { type: 'boolean', default: true },
    },
  },
  CreateShareRequest: {
    type: 'object',
    required: ['reportId'],
    properties: {
      reportId: { type: 'string' },
      expiresInDays: {
        type: 'integer',
        minimum: 1,
        maximum: 365,
        default: 30,
        description: 'Share-link validity (default 30 days, max 365)',
      },
    },
  },
  ShareLink: {
    type: 'object',
    properties: {
      token: { type: 'string' },
      url: { type: 'string', format: 'uri' },
      expiresAt: { type: 'string', format: 'date-time' },
    },
  },
  CreateRoleRequest: {
    type: 'object',
    required: ['name', 'permissions'],
    properties: {
      name: { type: 'string' },
      permissions: { type: 'array', items: { type: 'string' } },
    },
  },
  CreatePrRequest: {
    type: 'object',
    required: ['violationIds'],
    properties: {
      violationIds: { type: 'array', items: { type: 'string' } },
      baseBranch: { type: 'string' },
    },
  },
  PrResult: {
    type: 'object',
    properties: {
      prUrl: { type: 'string' },
      branch: { type: 'string' },
      summary: { type: 'string' },
    },
  },
  CheckoutRequest: {
    type: 'object',
    required: ['plan'],
    properties: {
      plan: { type: 'string' },
      successUrl: { type: 'string', format: 'uri' },
      cancelUrl: { type: 'string', format: 'uri' },
    },
  },
  CouponRequest: {
    type: 'object',
    required: ['code'],
    properties: {
      code: { type: 'string' },
    },
  },
  CreateSubscriptionRequest: {
    type: 'object',
    required: ['plan'],
    properties: {
      plan: { type: 'string' },
    },
  },
  InviteRequest: {
    type: 'object',
    required: ['email', 'role'],
    properties: {
      email: { type: 'string', format: 'email' },
      role: { type: 'string', description: 'member | admin | owner' },
    },
  },
  AcceptInviteRequest: {
    type: 'object',
    required: ['token'],
    properties: {
      token: { type: 'string' },
    },
  },
  UpdateMemberRequest: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string' },
      role: { type: 'string' },
    },
  },
  Settings: {
    type: 'object',
    properties: {
      scanInterval: { type: 'string' },
      notifications: { type: 'object' },
      slackWebhookUrl: { type: 'string' },
      alertChannels: { type: 'object' },
      logoUrl: { type: 'string', description: 'White-label logo' },
    },
  },
  UpdateSettingsRequest: {
    type: 'object',
    properties: {
      scanInterval: { type: 'string' },
      notifications: { type: 'object' },
      slackWebhookUrl: { type: 'string' },
      alertChannels: { type: 'object' },
      logoUrl: { type: 'string' },
    },
  },
  FlagRequest: {
    type: 'object',
    required: ['key', 'enabled'],
    properties: {
      key: { type: 'string' },
      enabled: { type: 'boolean' },
      rules: { type: 'object' },
    },
  },
  DeleteRequest: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' },
    },
  },
} as const;

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'AccessGuard API',
    version: '1.0.0',
    description:
      'REST API for automated WCAG compliance scanning, violation management, AI remediation, and team workflows. Full route inventory: 67 handler files under src/app/api. See docs/engineering/API_SPECIFICATION.md.',
    contact: {
      name: 'AccessGuard Support',
      email: 'support@accessguard.dev',
      url: 'https://accessguard.dev',
    },
  },
  servers: [
    { url: '/api', description: 'Production API (all routes are under /api)' },
    { url: 'http://localhost:3000/api', description: 'Local Development' },
  ],
  paths,
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      sessionAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'next-auth.session-token',
      },
      schedulerKey: {
        type: 'apiKey',
        in: 'header',
        name: 'x-scheduler-api-key',
      },
      webhookSignature: {
        type: 'apiKey',
        in: 'header',
        name: 'x-hub-signature-256',
      },
    },
    schemas,
  },
  tags: [
    { name: 'System', description: 'Health checks and system information' },
    { name: 'Authentication', description: 'User authentication and MFA' },
    { name: 'Account', description: 'GDPR account data' },
    { name: 'Projects', description: 'Project management' },
    { name: 'Scans', description: 'Accessibility scanning and schedules' },
    { name: 'Schedules', description: 'Scheduled scans and daemon' },
    { name: 'Violations', description: 'Violation management' },
    { name: 'Remediation', description: 'AI-powered remediation' },
    { name: 'Reports', description: 'Compliance reports, PDFs, share links' },
    { name: 'Roles', description: 'Custom RBAC roles' },
    { name: 'GitHub', description: 'GitHub OAuth and PR automation' },
    { name: 'Billing', description: 'Stripe billing' },
    { name: 'Teams', description: 'Team invites and membership' },
    { name: 'Settings', description: 'Organization settings and API keys' },
    { name: 'Stats', description: 'Trends, regression, usage analytics' },
    { name: 'Audit', description: 'Security audit log' },
    { name: 'Admin', description: 'Feature flags and admin panel' },
    { name: 'Notifications', description: 'Alert channel notifications' },
    { name: 'Legal', description: 'Public legal documents' },
  ],
};
