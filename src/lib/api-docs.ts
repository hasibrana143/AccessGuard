/**
 * API Documentation Generator
 * 
 * Auto-generates OpenAPI documentation from route definitions.
 * Features:
 * - OpenAPI 3.1 spec generation
 * - Schema inference from Zod schemas
 * - Route metadata extraction
 * - Interactive documentation endpoint
 * - Export to JSON/YAML
 * 
 * Usage:
 *   import { apiDocs } from '@/lib/api-docs';
 *   
 *   // Register routes
 *   apiDocs.addRoute({
 *     method: 'GET',
 *     path: '/api/projects',
 *     summary: 'List projects',
 *     tags: ['Projects'],
 *     responses: { 200: { description: 'Success' } },
 *   });
 *   
 *   // Get spec
 *   const spec = apiDocs.generateSpec();
 */

import { z } from 'zod';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRouteDefinition {
  method: HttpMethod;
  path: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: ParameterDefinition[];
  requestBody?: RequestBodyDefinition;
  responses: Record<string, ResponseDefinition>;
  security?: SecurityDefinition[];
  deprecated?: boolean;
}

export interface ParameterDefinition {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  description?: string;
  schema?: z.ZodType<unknown>;
  example?: unknown;
}

export interface RequestBodyDefinition {
  description?: string;
  required?: boolean;
  content: {
    [contentType: string]: {
      schema?: z.ZodType<unknown>;
      example?: unknown;
    };
  };
}

export interface ResponseDefinition {
  description: string;
  content?: {
    [contentType: string]: {
      schema?: z.ZodType<unknown>;
      example?: unknown;
    };
  };
}

export interface SecurityDefinition {
  type: 'bearer' | 'apiKey' | 'oauth2';
  name?: string;
  in?: 'header' | 'query' | 'cookie';
  scopes?: string[];
}

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    contact?: {
      name?: string;
      email?: string;
      url?: string;
    };
    license?: {
      name: string;
      url?: string;
    };
  };
  servers: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, unknown>;
  components: {
    securitySchemes: Record<string, unknown>;
    schemas: Record<string, unknown>;
  };
  tags: Array<{
    name: string;
    description?: string;
  }>;
}

/**
 * Zod to JSON Schema converter (simplified)
 * Uses Zod's built-in JSON schema conversion
 */
function zodToJsonSchema(schema: z.ZodType<unknown>): Record<string, unknown> {
  try {
    // Use Zod's built-in converter if available
    const jsonSchema = z.toJSONSchema(schema);
    return jsonSchema as Record<string, unknown>;
  } catch {
    // Fallback: return generic schema
    return { type: 'object', description: 'Schema conversion not available' };
  }
}

class ApiDocumentationGenerator {
  private routes: ApiRouteDefinition[] = [];
  private schemas: Map<string, z.ZodType<unknown>> = new Map();
  private tags: Map<string, string> = new Map();

  /**
   * Add a route definition
   */
  addRoute(route: ApiRouteDefinition): void {
    this.routes.push(route);
    
    // Add tags
    if (route.tags) {
      for (const tag of route.tags) {
        if (!this.tags.has(tag)) {
          this.tags.set(tag, '');
        }
      }
    }
  }

  /**
   * Register a named schema
   */
  registerSchema(name: string, schema: z.ZodType<unknown>): void {
    this.schemas.set(name, schema);
  }

  /**
   * Set tag description
   */
  setTagDescription(tag: string, description: string): void {
    this.tags.set(tag, description);
  }

  /**
   * Generate OpenAPI specification
   */
  generateSpec(): OpenAPISpec {
    const paths: Record<string, unknown> = {};
    
    for (const route of this.routes) {
      if (!paths[route.path]) {
        paths[route.path] = {};
      }

      const operation: Record<string, unknown> = {
        summary: route.summary,
        description: route.description,
        tags: route.tags,
        deprecated: route.deprecated,
        operationId: this.generateOperationId(route),
      };

      // Parameters
      if (route.parameters && route.parameters.length > 0) {
        operation.parameters = route.parameters.map(param => {
          const paramDef: Record<string, unknown> = {
            name: param.name,
            in: param.in,
            required: param.required ?? (param.in === 'path'),
            description: param.description,
          };

          if (param.schema) {
            paramDef.schema = zodToJsonSchema(param.schema);
          }

          if (param.example !== undefined) {
            paramDef.example = param.example;
          }

          return paramDef;
        });
      }

      // Request body
      if (route.requestBody) {
        operation.requestBody = {
          description: route.requestBody.description,
          required: route.requestBody.required ?? true,
          content: {},
        };

        for (const [contentType, content] of Object.entries(route.requestBody.content)) {
          const contentDef: Record<string, unknown> = {
            schema: content.schema ? zodToJsonSchema(content.schema) : undefined,
          };

          if (content.example !== undefined) {
            contentDef.example = content.example;
          }

          const reqBody = operation.requestBody as { content: Record<string, unknown> };
        reqBody.content[contentType] = contentDef;
        }
      }

      // Responses
      operation.responses = {};
      for (const [statusCode, response] of Object.entries(route.responses)) {
        const responseDef: Record<string, unknown> = {
          description: response.description,
        };

        if (response.content) {
          responseDef.content = {};
          for (const [contentType, content] of Object.entries(response.content)) {
            (responseDef.content as Record<string, unknown>)[contentType] = {
              schema: content.schema ? zodToJsonSchema(content.schema) : undefined,
              example: content.example,
            };
          }
        }

        (operation.responses as Record<string, unknown>)[statusCode] = responseDef;
      }

      // Security
      if (route.security && route.security.length > 0) {
        operation.security = route.security.map(s => ({
          [s.type]: s.scopes || [],
        }));
      }

      (paths[route.path] as Record<string, unknown>)[route.method.toLowerCase()] = operation;
    }

    // Generate component schemas
    const componentSchemas: Record<string, unknown> = {};
    for (const [name, schema] of this.schemas) {
      componentSchemas[name] = zodToJsonSchema(schema);
    }

    return {
      openapi: '3.1.0',
      info: {
        title: 'AccessGuard API',
        version: '1.0.0',
        description: 'Accessibility compliance platform API',
        contact: {
          name: 'AccessGuard Team',
          email: 'api@accessguard.dev',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development',
        },
        {
          url: 'https://api.accessguard.dev',
          description: 'Production',
        },
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
        },
        schemas: componentSchemas,
      },
      tags: Array.from(this.tags.entries()).map(([name, description]) => ({
        name,
        description: description || undefined,
      })),
    };
  }

  /**
   * Generate operation ID from route
   */
  private generateOperationId(route: ApiRouteDefinition): string {
    const parts = route.path
      .split('/')
      .filter(Boolean)
      .filter(p => !p.startsWith('[') && !p.startsWith('api'))
      .map(p => p.replace(/-/g, '_'));

    const method = route.method.toLowerCase();
    const resource = parts.join('_');

    return `${method}_${resource}`;
  }

  /**
   * Export spec as JSON
   */
  exportJSON(): string {
    return JSON.stringify(this.generateSpec(), null, 2);
  }

  /**
   * Export spec as YAML (simplified)
   */
  exportYAML(): string {
    const spec = this.generateSpec();
    return this.convertToYaml(spec);
  }

  /**
   * Simple YAML converter
   */
  private convertToYaml(obj: unknown, indent = 0): string {
    const spaces = '  '.repeat(indent);

    if (typeof obj === 'string') {
      return obj.includes('\n') ? `|\n${obj.split('\n').map(l => `${spaces}  ${l}`).join('\n')}` : `"${obj}"`;
    }
    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return String(obj);
    }
    if (obj === null || obj === undefined) {
      return 'null';
    }
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      return obj.map((item: unknown) => `${spaces}- ${typeof item === 'object' && item !== null ? '\n' + this.convertToYaml(item, indent + 1) : this.convertToYaml(item, indent)}`).join('\n');
    }
    if (typeof obj === 'object') {
      const entries = Object.entries(obj as Record<string, unknown>);
      if (entries.length === 0) return '{}';
      return entries.map(([key, value]) => {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return `${spaces}${key}:\n${this.convertToYaml(value, indent + 1)}`;
        }
        return `${spaces}${key}: ${this.convertToYaml(value, indent + 1)}`;
      }).join('\n');
    }

    return String(obj);
  }

  /**
   * Get route count
   */
  getRouteCount(): number {
    return this.routes.length;
  }

  /**
   * Get tags
   */
  getTags(): string[] {
    return Array.from(this.tags.keys());
  }

  /**
   * Clear all routes
   */
  clear(): void {
    this.routes = [];
    this.schemas.clear();
    this.tags.clear();
  }
}

// Singleton
export const apiDocs = new ApiDocumentationGenerator();

/**
 * Register common API routes
 */
export function registerCommonRoutes(): void {
  // Health endpoints
  apiDocs.addRoute({
    method: 'GET',
    path: '/api/health',
    summary: 'Health check',
    tags: ['System'],
    responses: {
      200: {
        description: 'Healthy',
        content: {
          'application/json': {
            schema: z.object({
              status: z.string(),
              database: z.string(),
            }),
          },
        },
      },
    },
  });

  apiDocs.addRoute({
    method: 'GET',
    path: '/api/health/performance',
    summary: 'Performance metrics',
    tags: ['System'],
    responses: {
      200: {
        description: 'Performance data',
      },
    },
  });

  // Project endpoints
  apiDocs.addRoute({
    method: 'GET',
    path: '/api/projects',
    summary: 'List projects',
    tags: ['Projects'],
    parameters: [
      { name: 'page', in: 'query', schema: z.number(), example: 1 },
      { name: 'limit', in: 'query', schema: z.number(), example: 10 },
    ],
    responses: {
      200: {
        description: 'List of projects',
      },
    },
  });

  apiDocs.addRoute({
    method: 'POST',
    path: '/api/projects',
    summary: 'Create project',
    tags: ['Projects'],
    requestBody: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string(),
            url: z.string().url(),
          }),
        },
      },
    },
    responses: {
      201: {
        description: 'Project created',
      },
    },
  });

  // Scan endpoints
  apiDocs.addRoute({
    method: 'POST',
    path: '/api/scans',
    summary: 'Start scan',
    tags: ['Scans'],
    requestBody: {
      content: {
        'application/json': {
          schema: z.object({
            projectId: z.string(),
          }),
        },
      },
    },
    responses: {
      201: {
        description: 'Scan started',
      },
    },
  });

  // SSE endpoints
  apiDocs.addRoute({
    method: 'GET',
    path: '/api/sse/dashboard',
    summary: 'Dashboard real-time events',
    tags: ['Real-time'],
    responses: {
      200: {
        description: 'SSE stream',
      },
    },
  });

  apiDocs.addRoute({
    method: 'GET',
    path: '/api/sse/violations',
    summary: 'Violation real-time events',
    tags: ['Real-time'],
    responses: {
      200: {
        description: 'SSE stream',
      },
    },
  });
}
