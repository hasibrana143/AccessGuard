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
  '/auth/sso/login': {
    get: op({
      tags: ['Authentication'],
      summary: 'Initiate SAML 2.0 SSO authentication flow with IdP redirect',
      parameters: [
        { name: 'orgId', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'slug', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'email', in: 'query', required: false, schema: { type: 'string' } },
      ],
      responses: {
        '302': { description: 'Redirect to IdP login endpoint' },
        '400': { description: 'Missing identifier' },
        '404': { description: 'SSO not configured or enabled' },
        '429': { description: 'Rate limit exceeded' },
      },
    }),
  },
  '/auth/sso/callback': {
    post: op({
      tags: ['Authentication'],
      summary: 'SAML 2.0 Assertion Consumer Service (ACS) callback',
      requestBody: {
        description: 'SAML response from Identity Provider',
        required: true,
        content: {
          'application/x-www-form-urlencoded': {
            schema: {
              type: 'object',
              properties: {
                SAMLResponse: { type: 'string' },
                RelayState: { type: 'string' },
              },
              required: ['SAMLResponse'],
            },
          },
        },
      },
      responses: {
        '302': { description: 'Redirect to dashboard or login on failure' },
        '429': { description: 'Rate limit exceeded' },
      },
    }),
  },
  '/auth/sso/metadata': {
    get: op({
      tags: ['Authentication'],
      summary: 'SAML 2.0 Service Provider (SP) metadata XML',
      responses: {
        '200': {
          description: 'SAML metadata XML document',
          content: {
            'application/samlmetadata+xml': {
              schema: { type: 'string' },
            },
          },
        },
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
  '/projects/{id}': {
    get: authed(op({
      tags: ['Projects'],
      summary: 'Get a single project by ID',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': jsonResponse('Project detail', { $ref: '#/components/schemas/Project' }),
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/projects/{id}/manual-checks': {
    get: authed(op({
      tags: ['Projects'],
      summary: 'Guided manual-testing checklist with saved outcomes',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Catalog merged with per-project results' },
        ...COMMON_RESPONSES,
      },
    })),
    put: authed(op({
      tags: ['Projects'],
      summary: 'Save guided manual-testing outcomes (requires manage_violations)',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Outcomes saved; emits manual_checks_updated audit event' },
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
  '/scans/{id}': {
    get: authed(op({
      tags: ['Scans'],
      summary: 'Get a single scan with project info (org-scoped)',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Scan detail' },
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
        { name: 'scanId', in: 'query', schema: { type: 'string' } },
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
  '/violations/{id}': {
    get: authed(op({
      tags: ['Violations'],
      summary: 'Get a single violation (org-scoped)',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Violation detail' },
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
        { name: 'id', in: 'query', schema: { type: 'string' } },
        { name: 'projectId', in: 'query', schema: { type: 'string' } },
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
  '/orgs/{id}/usage': {
    get: authed(op({
      tags: ['Organizations'],
      summary: 'Get current month usage for organization',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': jsonResponse('Usage data', { $ref: '#/components/schemas/OrgUsageResponse' }),
        ...COMMON_RESPONSES,
      },
    })),
    post: authed(op({
      tags: ['Organizations'],
      summary: 'Increment page usage (called after scan)',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: JSON_CONTENT({
          type: 'object',
          properties: {
            pagesScanned: { type: 'integer', minimum: 1, default: 1 },
          },
        }),
      },
      responses: {
        '200': jsonResponse('Updated usage', { $ref: '#/components/schemas/OrgUsageIncrementResponse' }),
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
      summary: 'Create PR with verified fixes (each fix is re-scanned with axe; only verified fixes are applied)',
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
      summary: 'Partially update a group (SCIM 2.0 PatchOp: displayName, members)',
      description:
        'Applies RFC 7644 Operations (add/remove/replace) to displayName and members. Emits scim_group_updated audit event.',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': { description: 'Group updated' },
        '400': { description: 'Invalid op, path, or value' },
        '401': { description: 'Missing or invalid SCIM token' },
        '404': { description: 'Group not found' },
        '409': { description: 'displayName already exists' },
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
  '/health/performance': {
    get: op({
      tags: ['System'],
      summary: 'Performance monitoring (DB latency, Redis, memory, uptime)',
      responses: {
        '200': jsonResponse('Performance metrics', { $ref: '#/components/schemas/PerformanceResponse' }),
        '503': { description: 'One or more checks degraded' },
      },
    }),
  },
  '/stats/dashboard-summary': {
    get: authed(op({
      tags: ['Stats'],
      summary: 'Aggregated dashboard summary (violations, scans, projects, fix rate)',
      responses: {
        '200': jsonResponse('Dashboard summary', { $ref: '#/components/schemas/DashboardSummaryResponse' }),
        ...COMMON_RESPONSES,
      },
    })),
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
  '/sse/dashboard': {
    get: authed(op({
      tags: ['SSE'],
      summary: 'Dashboard real-time updates (SSE)',
      description:
        'Server-Sent Events stream for live dashboard updates. Emits scan_complete, violation_found, project_added events.',
      responses: {
        '200': { description: 'Event stream (text/event-stream)' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/sse/violations': {
    get: authed(op({
      tags: ['SSE'],
      summary: 'Violations live feed (SSE)',
      description:
        'Server-Sent Events stream for new violations. Emits new_violation events.',
      responses: {
        '200': { description: 'Event stream (text/event-stream)' },
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/csp-report': {
    post: op({
      tags: ['System'],
      summary: 'Content Security Policy (CSP) violation report receiver',
      requestBody: {
        description: 'CSP violation report payload',
        required: true,
        content: {
          'application/csp-report': {
            schema: {
              type: 'object',
              properties: {
                'csp-report': {
                  type: 'object',
                  properties: {
                    'document-uri': { type: 'string' },
                    'violated-directive': { type: 'string' },
                    'blocked-uri': { type: 'string' },
                  },
                },
              },
            },
          },
          'application/json': {
            schema: { type: 'object' },
          },
        },
      },
      responses: {
        '204': { description: 'CSP report accepted' },
        '400': { description: 'Invalid CSP report payload' },
        '429': { description: 'Rate limit exceeded' },
      },
    }),
  },
  '/v1/apikeys': {
    get: authed(op({
      tags: ['API Keys'],
      summary: 'List API keys',
      responses: {
        '200': jsonResponse('List of API keys', { $ref: '#/components/schemas/ApiKeyListResponse' }),
        ...COMMON_RESPONSES,
      },
    })),
    post: authed(op({
      tags: ['API Keys'],
      summary: 'Create API key',
      requestBody: {
        description: 'API key creation request',
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/CreateApiKeyRequest' }),
      },
      responses: {
        '201': jsonResponse('API key created (raw key returned once)', { $ref: '#/components/schemas/CreateApiKeyResponse' }),
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/v1/apikeys/{id}': {
    delete: authed(op({
      tags: ['API Keys'],
      summary: 'Revoke API key',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': jsonResponse('API key revoked', { type: 'object', properties: { success: { type: 'boolean' } } }),
        ...COMMON_RESPONSES,
      },
    })),
  },
  '/v1/scans': {
    post: op({
      tags: ['Scans'],
      summary: 'Trigger accessibility scan (API key auth)',
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      requestBody: {
        description: 'Scan request',
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/ApiScanRequest' }),
      },
      responses: {
        '200': jsonResponse('Scan completed', { $ref: '#/components/schemas/ApiScanResponse' }),
        '401': { description: 'Invalid or missing API key' },
        '403': { description: 'Insufficient scope' },
        '429': { description: 'Rate limit or quota exceeded' },
        '500': { description: 'Scan failed' },
      },
    }),
  },
  '/v1/reports/vpat': {
    get: op({
      tags: ['Reports'],
      summary: 'Generate VPAT report (API key auth)',
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      parameters: [
        { name: 'projectId', in: 'query', required: true, schema: { type: 'string' } },
        { name: 'scanId', in: 'query', required: false, schema: { type: 'string' } },
      ],
      responses: {
        '200': jsonResponse('VPAT report', { $ref: '#/components/schemas/VpatResponse' }),
        '401': { description: 'Invalid or missing API key' },
        '403': { description: 'Insufficient scope' },
        '404': { description: 'Project not found' },
        '500': { description: 'VPAT generation failed' },
      },
    }),
  },
  '/agency/bulk-scan': {
    post: op({
      tags: ['Agency'],
      summary: 'Queue bulk scans for agency projects',
      security: [{ bearerAuth: [] }, { sessionAuth: [] }],
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/BulkScanRequest' }),
      },
      responses: {
        '200': jsonResponse('Bulk scans queued', { $ref: '#/components/schemas/BulkScanResponse' }),
        ...COMMON_RESPONSES,
        '500': { description: 'Failed to queue bulk scan' },
      },
    }),
  },
  '/agency/client-groups': {
    get: op({
      tags: ['Agency'],
      summary: 'List agency client groups',
      security: [{ bearerAuth: [] }, { sessionAuth: [] }],
      responses: {
        '200': jsonResponse('Client groups', {
          type: 'object',
          properties: {
            clientGroups: { type: 'array', items: { $ref: '#/components/schemas/ClientGroup' } },
          },
          required: ['clientGroups'],
        }),
        ...COMMON_RESPONSES,
      },
    }),
    post: op({
      tags: ['Agency'],
      summary: 'Create an agency client group',
      security: [{ bearerAuth: [] }, { sessionAuth: [] }],
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/CreateClientGroupRequest' }),
      },
      responses: {
        '201': jsonResponse('Client group created', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            clientGroup: { $ref: '#/components/schemas/ClientGroup' },
          },
          required: ['success', 'clientGroup'],
        }),
        ...COMMON_RESPONSES,
        '500': { description: 'Failed to create client group' },
      },
    }),
  },
  '/agency/client-groups/{id}': {
    get: op({
      tags: ['Agency'],
      summary: 'Get an agency client group',
      security: [{ bearerAuth: [] }, { sessionAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': jsonResponse('Client group detail', {
          type: 'object',
          properties: {
            clientGroup: { $ref: '#/components/schemas/ClientGroup' },
          },
          required: ['clientGroup'],
        }),
        ...COMMON_RESPONSES,
      },
    }),
    put: op({
      tags: ['Agency'],
      summary: 'Update an agency client group',
      security: [{ bearerAuth: [] }, { sessionAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/UpdateClientGroupRequest' }),
      },
      responses: {
        '200': jsonResponse('Client group updated', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            clientGroup: { $ref: '#/components/schemas/ClientGroup' },
          },
          required: ['success', 'clientGroup'],
        }),
        ...COMMON_RESPONSES,
        '500': { description: 'Failed to update client group' },
      },
    }),
    delete: op({
      tags: ['Agency'],
      summary: 'Delete an agency client group',
      security: [{ bearerAuth: [] }, { sessionAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': jsonResponse('Client group deleted', {
          type: 'object',
          properties: { success: { type: 'boolean' } },
          required: ['success'],
        }),
        ...COMMON_RESPONSES,
        '500': { description: 'Failed to delete client group' },
      },
    }),
  },
  '/agency/whitelabel': {
    get: op({
      tags: ['Agency'],
      summary: 'List white-label configurations',
      security: [{ bearerAuth: [] }, { sessionAuth: [] }],
      responses: {
        '200': jsonResponse('White-label configurations', {
          type: 'object',
          properties: {
            configs: { type: 'array', items: { $ref: '#/components/schemas/WhiteLabelConfig' } },
          },
          required: ['configs'],
        }),
        ...COMMON_RESPONSES,
      },
    }),
    post: op({
      tags: ['Agency'],
      summary: 'Create or update a white-label configuration',
      security: [{ bearerAuth: [] }, { sessionAuth: [] }],
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/WhiteLabelConfigRequest' }),
      },
      responses: {
        '200': jsonResponse('White-label configuration saved', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            config: { $ref: '#/components/schemas/WhiteLabelConfig' },
          },
          required: ['success', 'config'],
        }),
        ...COMMON_RESPONSES,
        '500': { description: 'Failed to save white-label configuration' },
      },
    }),
  },
  '/integrations': {
    get: op({
      tags: ['Integrations'],
      summary: 'List integrations',
      security: [{ bearerAuth: [] }, { sessionAuth: [] }],
      responses: {
        '200': jsonResponse('Integrations', {
          type: 'object',
          properties: {
            integrations: { type: 'array', items: { $ref: '#/components/schemas/Integration' } },
          },
          required: ['integrations'],
        }),
        ...COMMON_RESPONSES,
      },
    }),
    post: op({
      tags: ['Integrations'],
      summary: 'Create an integration',
      security: [{ bearerAuth: [] }, { sessionAuth: [] }],
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/CreateIntegrationRequest' }),
      },
      responses: {
        '201': jsonResponse('Integration created', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            integration: { $ref: '#/components/schemas/Integration' },
          },
          required: ['success', 'integration'],
        }),
        ...COMMON_RESPONSES,
        '500': { description: 'Failed to create integration' },
      },
    }),
  },
  '/integrations/{id}/actions': {
    post: op({
      tags: ['Integrations'],
      summary: 'Execute an integration action',
      security: [{ bearerAuth: [] }, { sessionAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/IntegrationActionRequest' }),
      },
      responses: {
        '200': jsonResponse('Integration action result', { $ref: '#/components/schemas/IntegrationActionResponse' }),
        ...COMMON_RESPONSES,
        '500': { description: 'Integration action failed' },
      },
    }),
  },
  '/integrations/{id}': {
    get: op({
      tags: ['Integrations'],
      summary: 'Get an integration',
      security: [{ bearerAuth: [] }, { sessionAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': jsonResponse('Integration detail', {
          type: 'object',
          properties: {
            integration: { $ref: '#/components/schemas/Integration' },
          },
          required: ['integration'],
        }),
        ...COMMON_RESPONSES,
      },
    }),
    put: op({
      tags: ['Integrations'],
      summary: 'Update an integration',
      security: [{ bearerAuth: [] }, { sessionAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/UpdateIntegrationRequest' }),
      },
      responses: {
        '200': jsonResponse('Integration updated', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            integration: { $ref: '#/components/schemas/Integration' },
          },
          required: ['success', 'integration'],
        }),
        ...COMMON_RESPONSES,
        '500': { description: 'Failed to update integration' },
      },
    }),
    delete: op({
      tags: ['Integrations'],
      summary: 'Delete an integration',
      security: [{ bearerAuth: [] }, { sessionAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': jsonResponse('Integration deleted', {
          type: 'object',
          properties: { success: { type: 'boolean' } },
          required: ['success'],
        }),
        ...COMMON_RESPONSES,
        '500': { description: 'Failed to delete integration' },
      },
    }),
  },
  '/onboarding/scan': {
    post: op({
      tags: ['Onboarding'],
      summary: 'Run an onboarding scan',
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/OnboardingScanRequest' }),
      },
      responses: {
        '200': jsonResponse('Onboarding scan result', { $ref: '#/components/schemas/OnboardingScanResponse' }),
        '400': { description: 'Invalid or unscannable URL' },
        '429': { description: 'Rate limit exceeded (5/min per client)' },
        '500': { description: 'Scan failed' },
      },
    }),
  },
  '/onboarding/vpat': {
    get: op({
      tags: ['Onboarding'],
      summary: 'Generate a sample onboarding VPAT',
      parameters: [{ name: 'url', in: 'query', required: true, schema: { type: 'string', format: 'uri' } }],
      responses: {
        '200': jsonResponse('Sample VPAT', { $ref: '#/components/schemas/OnboardingVpatResponse' }),
        '400': { description: 'Valid URL required' },
        '429': { description: 'Rate limit exceeded (5/min per client)' },
        '500': { description: 'VPAT generation failed' },
      },
    }),
  },
  '/page-inventory': {
    get: op({
      tags: ['Scans'],
      summary: 'Get page inventory for a project',
      security: [{ bearerAuth: [] }, { sessionAuth: [] }],
      parameters: [
        { name: 'projectId', in: 'query', required: true, schema: { type: 'string' } },
        { name: 'scanId', in: 'query', required: false, schema: { type: 'string' } },
      ],
      responses: {
        '200': jsonResponse('Page inventory', { $ref: '#/components/schemas/PageInventoryResponse' }),
        ...COMMON_RESPONSES,
        '500': { description: 'Failed to fetch page inventory' },
      },
    }),
  },
  '/regression': {
    get: op({
      tags: ['Stats'],
      summary: 'Get regression summary for a project',
      security: [{ bearerAuth: [] }, { sessionAuth: [] }],
      parameters: [{ name: 'projectId', in: 'query', required: true, schema: { type: 'string' } }],
      responses: {
        '200': jsonResponse('Regression summary', { $ref: '#/components/schemas/RegressionResponse' }),
        ...COMMON_RESPONSES,
        '500': { description: 'Failed to fetch regression data' },
      },
    }),
  },
  '/scan-auth': {
    get: op({
      tags: ['Scans'],
      summary: 'List scan authentication configurations',
      security: [{ bearerAuth: [] }, { sessionAuth: [] }],
      parameters: [{ name: 'projectId', in: 'query', required: true, schema: { type: 'string' } }],
      responses: {
        '200': jsonResponse('Scan authentication configurations', {
          type: 'object',
          properties: {
            authConfigs: { type: 'array', items: { $ref: '#/components/schemas/ScanAuthConfig' } },
          },
          required: ['authConfigs'],
        }),
        ...COMMON_RESPONSES,
      },
    }),
    post: op({
      tags: ['Scans'],
      summary: 'Create a scan authentication configuration',
      security: [{ bearerAuth: [] }, { sessionAuth: [] }],
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/CreateScanAuthConfigRequest' }),
      },
      responses: {
        '201': jsonResponse('Scan authentication configuration created', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            authConfig: { $ref: '#/components/schemas/ScanAuthConfig' },
          },
          required: ['success', 'authConfig'],
        }),
        ...COMMON_RESPONSES,
        '500': { description: 'Failed to create scan authentication configuration' },
      },
    }),
  },
  '/scan-auth/{id}': {
    get: op({
      tags: ['Scans'],
      summary: 'Get a scan authentication configuration',
      security: [{ bearerAuth: [] }, { sessionAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': jsonResponse('Scan authentication configuration detail', {
          type: 'object',
          properties: {
            authConfig: { $ref: '#/components/schemas/ScanAuthConfig' },
          },
          required: ['authConfig'],
        }),
        ...COMMON_RESPONSES,
      },
    }),
    put: op({
      tags: ['Scans'],
      summary: 'Update a scan authentication configuration',
      security: [{ bearerAuth: [] }, { sessionAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: JSON_CONTENT({ $ref: '#/components/schemas/UpdateScanAuthConfigRequest' }),
      },
      responses: {
        '200': jsonResponse('Scan authentication configuration updated', {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            authConfig: { $ref: '#/components/schemas/ScanAuthConfig' },
          },
          required: ['success', 'authConfig'],
        }),
        ...COMMON_RESPONSES,
        '500': { description: 'Failed to update scan authentication configuration' },
      },
    }),
    delete: op({
      tags: ['Scans'],
      summary: 'Delete a scan authentication configuration',
      security: [{ bearerAuth: [] }, { sessionAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': jsonResponse('Scan authentication configuration deleted', {
          type: 'object',
          properties: { success: { type: 'boolean' } },
          required: ['success'],
        }),
        ...COMMON_RESPONSES,
        '500': { description: 'Failed to delete scan authentication configuration' },
      },
    }),
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
      success: { type: 'boolean' },
      data: {
        type: 'object',
        properties: {
          prUrl: { type: 'string' },
          prNumber: { type: 'string' },
          branchName: { type: 'string' },
          filesCreated: { type: 'integer' },
          violationsUpdated: { type: 'integer' },
          verifiedFixes: { type: 'integer' },
          skippedLowConfidence: { type: 'integer' },
          skippedUnverified: { type: 'integer' },
          filesModified: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                fixesApplied: { type: 'integer' },
              },
            },
          },
          fixesAppliedTotal: { type: 'integer' },
        },
      },
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
  PerformanceResponse: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['healthy', 'degraded'] },
      checks: {
        type: 'object',
        additionalProperties: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            latencyMs: { type: 'integer' },
            detail: { type: 'string' },
          },
        },
      },
      uptime: { type: 'integer' },
      timestamp: { type: 'string', format: 'date-time' },
    },
  },
  DashboardSummaryResponse: {
    type: 'object',
    properties: {
      projects: { type: 'integer' },
      activeScans: { type: 'integer' },
      violations: {
        type: 'object',
        properties: {
          open: { type: 'integer' },
          fixed: { type: 'integer' },
          critical: { type: 'integer' },
          serious: { type: 'integer' },
          moderate: { type: 'integer' },
          minor: { type: 'integer' },
        },
      },
      fixRate: { type: 'integer' },
      recentScans: {
        type: 'array',
        items: { type: 'object' },
      },
      generatedAt: { type: 'string', format: 'date-time' },
    },
  },
  OrgUsageResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      data: {
        type: 'object',
        properties: {
          org: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              plan: { type: 'string' },
              subscriptionStatus: { type: 'string' },
            },
          },
          usage: {
            type: 'object',
            properties: {
              pagesUsed: { type: 'integer' },
              pagesQuota: { type: 'integer' },
              usagePercentage: { type: 'integer' },
              isOverQuota: { type: 'boolean' },
              remainingPages: { type: 'integer' },
            },
          },
          limits: {
            type: 'object',
            properties: {
              pagesPerMonth: { type: 'integer' },
              websites: { type: 'integer' },
            },
          },
        },
      },
    },
  },
  OrgUsageIncrementResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      data: {
        type: 'object',
        properties: {
          pagesUsed: { type: 'integer' },
          pagesQuota: { type: 'integer' },
          usagePercentage: { type: 'integer' },
          isOverQuota: { type: 'boolean' },
          remainingPages: { type: 'integer' },
        },
      },
    },
  },
  CreateApiKeyRequest: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1 },
      scopes: { type: 'string', default: 'scans:read,scans:write,reports:read' },
    },
  },
  CreateApiKeyResponse: {
    type: 'object',
    properties: {
      apiKey: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          prefix: { type: 'string' },
          scopes: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      rawKey: { type: 'string' },
    },
  },
  ApiKeyListResponse: {
    type: 'object',
    properties: {
      apiKeys: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            prefix: { type: 'string' },
            scopes: { type: 'string' },
            lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  ApiScanRequest: {
    type: 'object',
    required: ['projectId'],
    properties: {
      projectId: { type: 'string' },
      url: { type: 'string', format: 'uri' },
      html: { type: 'string' },
      scanConfig: { type: 'object' },
    },
  },
  ApiScanResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      scanId: { type: 'string' },
      violationsFound: { type: 'integer' },
      pagesScanned: { type: 'integer' },
      severityCounts: {
        type: 'object',
        properties: {
          critical: { type: 'integer' },
          serious: { type: 'integer' },
          moderate: { type: 'integer' },
          minor: { type: 'integer' },
        },
      },
      riskScore: { type: 'integer' },
    },
  },
  VpatResponse: {
    type: 'object',
    properties: {
      project: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          url: { type: 'string' },
        },
      },
      vpat: {
        type: 'object',
        properties: {
          criteria: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                level: { type: 'string' },
                name: { type: 'string' },
                conformance: { type: 'string' },
                remarks: { type: 'string' },
              },
            },
          },
          summary: {
            type: 'object',
            properties: {
              supports: { type: 'integer' },
              partiallySupports: { type: 'integer' },
              doesNotSupport: { type: 'integer' },
              notEvaluated: { type: 'integer' },
            },
          },
        },
      },
      generatedAt: { type: 'string', format: 'date-time' },
    },
  },
  BulkScanRequest: {
    type: 'object',
    required: ['projectIds'],
    properties: {
      projectIds: { type: 'array', minItems: 1, maxItems: 50, items: { type: 'string' } },
      priority: { type: 'string', enum: ['normal', 'high'] },
    },
  },
  BulkScanResponse: {
    type: 'object',
    required: ['success', 'queued', 'jobIds', 'priority'],
    properties: {
      success: { type: 'boolean' },
      queued: { type: 'integer' },
      jobIds: { type: 'array', items: { type: 'string' } },
      priority: { type: 'string', enum: ['normal', 'high'] },
    },
  },
  ClientGroup: {
    type: 'object',
    required: ['id', 'orgId', 'name', 'slug', 'createdAt', 'updatedAt'],
    properties: {
      id: { type: 'string' },
      orgId: { type: 'string' },
      name: { type: 'string' },
      slug: { type: 'string' },
      description: { type: 'string', nullable: true },
      website: { type: 'string', format: 'uri', nullable: true },
      logoUrl: { type: 'string', format: 'uri', nullable: true },
      primaryColor: { type: 'string', nullable: true },
      secondaryColor: { type: 'string', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  CreateClientGroupRequest: {
    type: 'object',
    required: ['name', 'slug'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 100 },
      slug: { type: 'string', minLength: 1, maxLength: 50, pattern: '^[a-z0-9-]+$' },
      description: { type: 'string', maxLength: 500 },
      website: { type: 'string', format: 'uri' },
      logoUrl: { type: 'string', format: 'uri' },
      primaryColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
      secondaryColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
    },
  },
  UpdateClientGroupRequest: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 100 },
      slug: { type: 'string', minLength: 1, maxLength: 50, pattern: '^[a-z0-9-]+$' },
      description: { type: 'string', maxLength: 500, nullable: true },
      website: { type: 'string', format: 'uri', nullable: true },
      logoUrl: { type: 'string', format: 'uri', nullable: true },
      primaryColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', nullable: true },
      secondaryColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', nullable: true },
    },
  },
  WhiteLabelConfig: {
    type: 'object',
    required: ['id', 'orgId', 'showPoweredBy', 'createdAt', 'updatedAt'],
    properties: {
      id: { type: 'string' },
      orgId: { type: 'string' },
      clientGroupId: { type: 'string', nullable: true },
      logoUrl: { type: 'string', format: 'uri', nullable: true },
      primaryColor: { type: 'string', nullable: true },
      secondaryColor: { type: 'string', nullable: true },
      fontFamily: { type: 'string', nullable: true },
      companyName: { type: 'string', nullable: true },
      companyUrl: { type: 'string', format: 'uri', nullable: true },
      footerText: { type: 'string', nullable: true },
      showPoweredBy: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  WhiteLabelConfigRequest: {
    type: 'object',
    properties: {
      clientGroupId: { type: 'string', nullable: true },
      logoUrl: { type: 'string', format: 'uri', nullable: true },
      primaryColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', nullable: true },
      secondaryColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', nullable: true },
      fontFamily: { type: 'string', maxLength: 50, nullable: true },
      companyName: { type: 'string', maxLength: 100, nullable: true },
      companyUrl: { type: 'string', format: 'uri', nullable: true },
      footerText: { type: 'string', maxLength: 500, nullable: true },
      showPoweredBy: { type: 'boolean' },
    },
  },
  IntegrationConfig: {
    type: 'object',
    properties: {
      baseUrl: { type: 'string', format: 'uri' },
      email: { type: 'string', format: 'email' },
      apiToken: { type: 'string' },
      projectKey: { type: 'string' },
      apiKey: { type: 'string' },
      teamId: { type: 'string' },
      webhookUrl: { type: 'string', format: 'uri' },
      botToken: { type: 'string' },
      channelId: { type: 'string' },
      teamsWebhookUrl: { type: 'string', format: 'uri' },
    },
  },
  Integration: {
    type: 'object',
    required: ['id', 'orgId', 'type', 'name', 'config', 'isActive', 'createdAt', 'updatedAt'],
    properties: {
      id: { type: 'string' },
      orgId: { type: 'string' },
      type: { type: 'string', enum: ['jira', 'linear', 'slack', 'teams'] },
      name: { type: 'string' },
      config: { $ref: '#/components/schemas/IntegrationConfig' },
      isActive: { type: 'boolean' },
      lastSyncAt: { type: 'string', format: 'date-time', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      integrationLogs: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            integrationId: { type: 'string' },
            action: { type: 'string' },
            status: { type: 'string' },
            payload: { type: 'string', nullable: true },
            response: { type: 'string', nullable: true },
            error: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  CreateIntegrationRequest: {
    type: 'object',
    required: ['type', 'name'],
    properties: {
      type: { type: 'string', enum: ['jira', 'linear', 'slack', 'teams'] },
      name: { type: 'string', minLength: 1, maxLength: 50 },
      config: { $ref: '#/components/schemas/IntegrationConfig' },
    },
  },
  UpdateIntegrationRequest: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 50 },
      config: { $ref: '#/components/schemas/IntegrationConfig' },
      isActive: { type: 'boolean' },
    },
  },
  IntegrationActionRequest: {
    oneOf: [
      {
        type: 'object',
        required: ['type', 'violationIds'],
        properties: {
          type: { type: 'string', enum: ['create_issue'] },
          violationIds: { type: 'array', minItems: 1, maxItems: 50, items: { type: 'string' } },
          projectKey: { type: 'string' },
          teamId: { type: 'string' },
        },
      },
      {
        type: 'object',
        required: ['type', 'message'],
        properties: {
          type: { type: 'string', enum: ['notify'] },
          message: { type: 'string', maxLength: 2000 },
          severity: { type: 'string', enum: ['info', 'warning', 'critical'] },
          channelId: { type: 'string' },
        },
      },
      {
        type: 'object',
        required: ['type'],
        properties: {
          type: { type: 'string', enum: ['test'] },
        },
      },
    ],
  },
  IntegrationActionResponse: {
    type: 'object',
    required: ['success'],
    properties: {
      success: { type: 'boolean' },
      error: { type: 'string' },
      issueUrl: { type: 'string', format: 'uri' },
    },
  },
  OnboardingScanRequest: {
    type: 'object',
    required: ['url'],
    properties: {
      url: { type: 'string', format: 'uri' },
      email: { type: 'string', format: 'email' },
    },
  },
  OnboardingScanResponse: {
    type: 'object',
    required: ['success', 'url', 'scanSummary', 'topFixes', 'actions'],
    properties: {
      success: { type: 'boolean' },
      url: { type: 'string', format: 'uri' },
      scanSummary: {
        type: 'object',
        properties: {
          pagesScanned: { type: 'integer' },
          violationsFound: { type: 'integer' },
          severityCounts: {
            type: 'object',
            properties: {
              critical: { type: 'integer' },
              serious: { type: 'integer' },
              moderate: { type: 'integer' },
              minor: { type: 'integer' },
            },
          },
          riskScore: { type: 'integer' },
        },
      },
      topFixes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            ruleId: { type: 'string' },
            wcagCriteria: { type: 'string', nullable: true },
            severity: { type: 'string', enum: ['critical', 'serious', 'moderate', 'minor'] },
            description: { type: 'string' },
            url: { type: 'string', format: 'uri' },
            elementSelector: { type: 'string', nullable: true },
            quickFix: { type: 'string' },
          },
        },
      },
      actions: {
        type: 'object',
        properties: {
          viewFullReport: { type: 'string' },
          signupForFullAccess: { type: 'string' },
          downloadSampleVPAT: { type: 'string' },
        },
      },
    },
  },
  OnboardingVpatResponse: {
    type: 'object',
    required: ['success', 'url', 'vpat', 'scanSummary', 'disclaimer'],
    properties: {
      success: { type: 'boolean' },
      url: { type: 'string', format: 'uri' },
      vpat: {
        type: 'object',
        properties: {
          criteria: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                level: { type: 'string' },
                name: { type: 'string' },
                conformance: { type: 'string', enum: ['supports', 'partially-supports', 'does-not-support', 'not-evaluated'] },
                remarks: { type: 'string' },
                en301549Refs: { type: 'array', items: { type: 'string' } },
                section508Refs: { type: 'array', items: { type: 'string' } },
                manualCheckId: { type: 'string' },
              },
            },
          },
          summary: {
            type: 'object',
            properties: {
              supports: { type: 'integer' },
              partiallySupports: { type: 'integer' },
              doesNotSupport: { type: 'integer' },
              notEvaluated: { type: 'integer' },
            },
          },
          meta: {
            type: 'object',
            properties: {
              generatedAt: { type: 'string', format: 'date-time' },
              standard: { type: 'string', enum: ['WCAG 2.2 AA', 'WCAG 2.1 AA'] },
              en301549: { type: 'boolean' },
              section508: { type: 'boolean' },
              projectId: { type: 'string' },
              scanId: { type: 'string' },
              isSample: { type: 'boolean' },
              generatedFor: { type: 'string', format: 'uri' },
            },
          },
        },
      },
      scanSummary: {
        type: 'object',
        properties: {
          pagesScanned: { type: 'integer' },
          violationsFound: { type: 'integer' },
          severityCounts: {
            type: 'object',
            properties: {
              critical: { type: 'integer' },
              serious: { type: 'integer' },
              moderate: { type: 'integer' },
              minor: { type: 'integer' },
            },
          },
        },
      },
      disclaimer: { type: 'string' },
    },
  },
  PageInventoryResponse: {
    type: 'object',
    required: ['projectId', 'crawlConfig', 'pages', 'summary', 'topFixes'],
    properties: {
      projectId: { type: 'string' },
      scanId: { type: 'string' },
      scanCompletedAt: { type: 'string', format: 'date-time' },
      crawlConfig: { type: 'object' },
      pages: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            url: { type: 'string', format: 'uri' },
            violationsCount: { type: 'integer' },
            critical: { type: 'integer' },
            serious: { type: 'integer' },
            moderate: { type: 'integer' },
            minor: { type: 'integer' },
            status: { type: 'string', enum: ['needs_attention', 'ok'] },
          },
        },
      },
      summary: {
        type: 'object',
        properties: {
          totalPages: { type: 'integer' },
          scannedPages: { type: 'integer' },
          pendingPages: { type: 'integer' },
          coverage: { type: 'integer' },
        },
      },
      topFixes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            ruleId: { type: 'string' },
            count: { type: 'integer' },
            severity: { type: 'string', enum: ['critical', 'serious', 'moderate', 'minor'] },
            wcagCriteria: { type: 'string', nullable: true },
          },
        },
      },
      lastScanAt: { type: 'string', format: 'date-time', nullable: true },
    },
  },
  RegressionResponse: {
    type: 'object',
    required: ['projectId', 'scans'],
    properties: {
      projectId: { type: 'string' },
      scans: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            scanId: { type: 'string' },
            completedAt: { type: 'string', format: 'date-time' },
            pagesScanned: { type: 'integer' },
            violationsFound: { type: 'integer' },
            severity: { type: 'object' },
            regression: { type: 'object' },
          },
        },
      },
      trends: {
        type: 'object',
        nullable: true,
        properties: {
          violationsDelta: { type: 'integer' },
          newViolations: { type: 'integer' },
          fixedViolations: { type: 'integer' },
          regressedViolations: { type: 'integer' },
          persistingViolations: { type: 'integer' },
        },
      },
    },
  },
  ScanAuthOptions: {
    type: 'object',
    properties: {
      cookies: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            value: { type: 'string' },
            domain: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
      headers: { type: 'object', additionalProperties: { type: 'string' } },
      script: {
        type: 'string',
        description: 'Login script executed in the page context. Encrypted at rest and never returned by the API.',
      },
      scriptConfig: {
        type: 'object',
        properties: {
          loginUrl: { type: 'string', format: 'uri' },
          usernameSelector: { type: 'string' },
          passwordSelector: { type: 'string' },
          submitSelector: { type: 'string' },
          waitForSelector: { type: 'string' },
          waitAfterLogin: { type: 'integer' },
          username: { type: 'string', writeOnly: true, description: 'Encrypted at rest, never returned.' },
          password: { type: 'string', writeOnly: true, description: 'Encrypted at rest, never returned.' },
        },
      },
    },
  },
  ScanAuthPublicOptions: {
    type: 'object',
    description: 'Masked view: secret values are replaced with •••••••• and the login script is omitted.',
    properties: {
      cookies: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            value: { type: 'string', example: '••••••••' },
            domain: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
      headers: { type: 'object', additionalProperties: { type: 'string' } },
      scriptConfig: {
        type: 'object',
        properties: {
          loginUrl: { type: 'string', format: 'uri' },
          usernameSelector: { type: 'string' },
          passwordSelector: { type: 'string' },
          submitSelector: { type: 'string' },
          waitForSelector: { type: 'string' },
          waitAfterLogin: { type: 'integer' },
        },
      },
    },
  },
  ScanAuthConfig: {
    type: 'object',
    required: ['id', 'projectId', 'name', 'type', 'config', 'isActive', 'createdAt', 'updatedAt'],
    properties: {
      id: { type: 'string' },
      projectId: { type: 'string' },
      name: { type: 'string' },
      type: { type: 'string', enum: ['cookie', 'header', 'script'] },
      config: { $ref: '#/components/schemas/ScanAuthPublicOptions' },
      isActive: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  CreateScanAuthConfigRequest: {
    type: 'object',
    required: ['name', 'type', 'projectId'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 50 },
      type: { type: 'string', enum: ['cookie', 'header', 'script'] },
      projectId: { type: 'string' },
      config: { $ref: '#/components/schemas/ScanAuthOptions' },
    },
  },
  UpdateScanAuthConfigRequest: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 50 },
      type: { type: 'string', enum: ['cookie', 'header', 'script'] },
      config: { $ref: '#/components/schemas/ScanAuthOptions' },
      isActive: { type: 'boolean' },
    },
  },
} as const;

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'AccessGuard API',
    version: '1.0.0',
    description:
      'REST API for automated WCAG compliance scanning, violation management, AI remediation, and team workflows. Full route inventory: 112 handler files under src/app/api. See docs/engineering/API_SPECIFICATION.md.',
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
      apiKeyAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API Key',
        description: 'AccessGuard API key (prefix: ag_)',
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
    { name: 'Agency', description: 'Agency client management and white-label configuration' },
    { name: 'Integrations', description: 'External issue tracking and notification integrations' },
    { name: 'Onboarding', description: 'Public onboarding scans and sample VPATs' },
  ],
};
