export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'AccessGuard API',
    version: '1.0.0',
    description: 'REST API for automated WCAG compliance scanning, violation management, and remediation.',
    contact: {
      name: 'AccessGuard Support',
      email: 'support@accessguard.dev',
      url: 'https://accessguard.dev',
    },
  },
  servers: [
    { url: '/api/v1', description: 'Production API' },
    { url: 'http://localhost:3000/api/v1', description: 'Local Development' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } } },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } },
        },
        responses: {
          '201': { description: 'User registered successfully' },
          '400': { description: 'Validation error' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Sign in with credentials',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          '200': { description: 'Login successful' },
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    '/projects': {
      get: {
        tags: ['Projects'],
        summary: 'List projects',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of projects',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ProjectList' } } },
          },
        },
      },
      post: {
        tags: ['Projects'],
        summary: 'Create a project',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateProjectRequest' } } } },
        responses: { '201': { description: 'Project created' } },
      },
    },
    '/scans': {
      get: {
        tags: ['Scans'],
        summary: 'List scans',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'projectId', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { '200': { description: 'List of scans' } },
      },
      post: {
        tags: ['Scans'],
        summary: 'Start a scan',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/StartScanRequest' } } } },
        responses: { '201': { description: 'Scan started' } },
      },
    },
    '/violations': {
      get: {
        tags: ['Violations'],
        summary: 'List violations',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'severity', in: 'query', schema: { type: 'string', enum: ['critical', 'serious', 'moderate', 'minor'] } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['open', 'fixed', 'ignored', 'false_positive'] } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { '200': { description: 'List of violations' } },
      },
      put: {
        tags: ['Violations'],
        summary: 'Update violation status',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateViolationRequest' } } } },
        responses: { '200': { description: 'Violation updated' } },
      },
    },
    '/remediate': {
      post: {
        tags: ['Remediation'],
        summary: 'Generate AI remediation code',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RemediateRequest' } } } },
        responses: { '200': { description: 'Remediation generated' } },
      },
    },
    '/reports': {
      get: {
        tags: ['Reports'],
        summary: 'Generate compliance report',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'PDF report' } },
      },
    },
    '/settings': {
      get: {
        tags: ['Settings'],
        summary: 'Get organization settings',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Settings' } },
      },
      patch: {
        tags: ['Settings'],
        summary: 'Update settings',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateSettingsRequest' } } } },
        responses: { '200': { description: 'Settings updated' } },
      },
    },
  },
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
    },
    schemas: {
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          database: { type: 'string', example: 'connected' },
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
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      CreateProjectRequest: {
        type: 'object',
        required: ['name', 'url'],
        properties: {
          name: { type: 'string' },
          url: { type: 'string', format: 'uri' },
          description: { type: 'string' },
        },
      },
      ProjectList: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                url: { type: 'string' },
                riskScore: { type: 'number' },
                totalViolations: { type: 'integer' },
              },
            },
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
      UpdateViolationRequest: {
        type: 'object',
        required: ['id', 'status'],
        properties: {
          id: { type: 'string' },
          status: { type: 'string', enum: ['open', 'fixed', 'ignored', 'false_positive'] },
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
      UpdateSettingsRequest: {
        type: 'object',
        properties: {
          scanInterval: { type: 'string' },
          notifications: { type: 'object' },
        },
      },
    },
  },
  tags: [
    { name: 'System', description: 'Health checks and system information' },
    { name: 'Authentication', description: 'User authentication endpoints' },
    { name: 'Projects', description: 'Project management' },
    { name: 'Scans', description: 'Accessibility scanning' },
    { name: 'Violations', description: 'Violation management' },
    { name: 'Remediation', description: 'AI-powered remediation' },
    { name: 'Reports', description: 'Compliance report generation' },
    { name: 'Settings', description: 'Organization settings' },
  ],
} as const;
