import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_URL = process.env.ACCESSGUARD_API_URL || 'https://api.accessguard.io';
const API_KEY = process.env.ACCESSGUARD_API_KEY || '';
const ORG_ID = process.env.ACCESSGUARD_ORG_ID || '';

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_KEY) throw new Error('ACCESSGUARD_API_KEY environment variable is required');

  const url = `${API_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_KEY}`,
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error ${response.status}: ${body}`);
  }
  return response.json() as Promise<T>;
}

const server = new McpServer({
  name: 'accessguard',
  version: '0.1.0',
});

server.tool(
  'scan_project',
  'Trigger a full accessibility scan on a project',
  {
    project_id: z.string().describe('The project ID to scan'),
    config: z.object({
      standard: z.enum(['wcag21aa', 'wcag22aa', 'section508']).optional(),
      pages: z.number().optional(),
    }).optional().describe('Optional scan configuration'),
  },
  async ({ project_id, config }) => {
    const result = await apiRequest<{
      scanId: string;
      status: string;
      estimatedTime: number;
    }>('/api/scan', {
      method: 'POST',
      body: JSON.stringify({ projectId: project_id, ...config }),
    });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          scan_id: result.scanId,
          status: result.status,
          estimated_time: result.estimatedTime,
          message: `Scan started. Estimated time: ${result.estimatedTime}s`,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  'get_scan_status',
  'Poll scan progress and results',
  {
    scan_id: z.string().describe('The scan ID to check'),
  },
  async ({ scan_id }) => {
    const result = await apiRequest<{
      status: string;
      progress: number;
      pagesScanned: number;
      totalPages: number;
      violationsFound: number;
    }>(`/api/scans/${scan_id}`);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          scan_id,
          status: result.status,
          progress: `${result.progress}%`,
          pages_scanned: result.pagesScanned,
          total_pages: result.totalPages,
          violations_found: result.violationsFound,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  'get_violations',
  'List accessibility violations with filters',
  {
    project_id: z.string().describe('Project ID'),
    severity: z.enum(['critical', 'serious', 'moderate', 'minor']).optional(),
    status: z.enum(['open', 'fixed', 'ignored']).optional(),
    rule_id: z.string().optional(),
    limit: z.number().optional().default(50),
    offset: z.number().optional().default(0),
  },
  async ({ project_id, severity, status, rule_id, limit, offset }) => {
    const params = new URLSearchParams({ projectId: project_id });
    if (severity) params.set('severity', severity);
    if (status) params.set('status', status);
    if (rule_id) params.set('ruleId', rule_id);
    params.set('limit', String(limit));
    params.set('offset', String(offset));

    const result = await apiRequest<{
      violations: Array<{
        id: string;
        ruleId: string;
        severity: string;
        message: string;
        element: string;
        wcagCriterion: string;
      }>;
      total: number;
    }>(`/api/violations?${params.toString()}`);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          total: result.total,
          returned: result.violations.length,
          violations: result.violations,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  'get_violation',
  'Get detailed information about a single violation',
  {
    violation_id: z.string().describe('Violation ID'),
  },
  async ({ violation_id }) => {
    const result = await apiRequest<{
      id: string;
      ruleId: string;
      severity: string;
      message: string;
      element: string;
      selector: string;
      wcagCriterion: string;
      fixSuggestion: string;
      confidence: number;
    }>(`/api/violations/${violation_id}`);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      }],
    };
  }
);

server.tool(
  'generate_fix',
  'Generate AI-powered remediation for a violation',
  {
    violation_id: z.string().describe('Violation ID to fix'),
    force_regenerate: z.boolean().optional().default(false),
  },
  async ({ violation_id, force_regenerate }) => {
    const result = await apiRequest<{
      code: string;
      explanation: string;
      confidence: number;
      approach: string;
    }>(`/api/violations/${violation_id}/fix`, {
      method: 'POST',
      body: JSON.stringify({ forceRegenerate: force_regenerate }),
    });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          violation_id,
          fix: {
            code: result.code,
            explanation: result.explanation,
            confidence: `${Math.round(result.confidence * 100)}%`,
            approach: result.approach,
          },
        }, null, 2),
      }],
    };
  }
);

server.tool(
  'apply_fix',
  'Apply a fix to a repository via GitHub (creates a PR)',
  {
    violation_id: z.string().describe('Violation ID to fix'),
    branch_name: z.string().optional().describe('Custom branch name'),
  },
  async ({ violation_id, branch_name }) => {
    const result = await apiRequest<{
      prUrl: string;
      prNumber: number;
      branch: string;
    }>(`/api/violations/${violation_id}/apply`, {
      method: 'POST',
      body: JSON.stringify({ branchName: branch_name }),
    });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          pr_url: result.prUrl,
          pr_number: result.prNumber,
          branch: result.branch,
          message: `Fix PR created: ${result.prUrl}`,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  'generate_vpat',
  'Generate a VPAT/ACR accessibility conformance report',
  {
    project_id: z.string().describe('Project ID'),
    format: z.enum(['pdf', 'html', 'json']).optional().default('pdf'),
  },
  async ({ project_id, format }) => {
    const result = await apiRequest<{
      downloadUrl: string;
      expiresAt: string;
    }>(`/api/projects/${project_id}/vpat`, {
      method: 'POST',
      body: JSON.stringify({ format }),
    });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          project_id,
          format,
          download_url: result.downloadUrl,
          expires_at: result.expiresAt,
          message: `VPAT generated. Download: ${result.downloadUrl}`,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  'check_compliance',
  'Quick compliance check on a URL',
  {
    url: z.string().url().describe('URL to check'),
    standard: z.enum(['wcag21aa', 'wcag22aa', 'section508']).optional().default('wcag22aa'),
  },
  async ({ url, standard }) => {
    const result = await apiRequest<{
      score: number;
      passed: number;
      failed: number;
      violations: Array<{
        ruleId: string;
        severity: string;
        message: string;
      }>;
    }>('/api/check', {
      method: 'POST',
      body: JSON.stringify({ url, standard }),
    });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          url,
          standard,
          score: `${result.score}%`,
          passed: result.passed,
          failed: result.failed,
          top_violations: result.violations.slice(0, 5),
        }, null, 2),
      }],
    };
  }
);

server.tool(
  'get_project',
  'Get project details with last scan and violation summary',
  {
    project_id: z.string().describe('Project ID'),
  },
  async ({ project_id }) => {
    const result = await apiRequest<{
      id: string;
      name: string;
      url: string;
      lastScan: {
        id: string;
        status: string;
        violationsCount: number;
        score: number;
      } | null;
    }>(`/api/projects/${project_id}`);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      }],
    };
  }
);

server.tool(
  'list_projects',
  'List all projects in the organization',
  {
    org_id: z.string().optional().describe('Organization ID (defaults to env)'),
    limit: z.number().optional().default(50),
    offset: z.number().optional().default(0),
  },
  async ({ org_id, limit, offset }) => {
    const params = new URLSearchParams();
    params.set('orgId', org_id || ORG_ID);
    params.set('limit', String(limit));
    params.set('offset', String(offset));

    const result = await apiRequest<{
      projects: Array<{
        id: string;
        name: string;
        url: string;
        lastScanAt: string;
      }>;
      total: number;
    }>(`/api/projects?${params.toString()}`);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          total: result.total,
          returned: result.projects.length,
          projects: result.projects,
        }, null, 2),
      }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AccessGuard MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
