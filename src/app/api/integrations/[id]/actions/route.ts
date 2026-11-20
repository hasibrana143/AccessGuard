import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedEmail } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { logger } from '@/lib/error-logger';
import { z } from 'zod';
import { decryptSecret, isEncrypted } from '@/lib/crypto';
import { createIntegrationLog } from '@/lib/integration-log';

// Integration action types
const createIssueSchema = z.object({
  type: z.literal('create_issue'),
  violationIds: z.array(z.string()).min(1).max(50),
  projectKey: z.string().optional(), // Jira project key override
  teamId: z.string().optional(), // Linear team override
});

const notifySchema = z.object({
  type: z.literal('notify'),
  message: z.string().max(2000),
  severity: z.enum(['info', 'warning', 'critical']).optional(),
  channelId: z.string().optional(), // Slack/Teams channel override
});

const testSchema = z.object({
  type: z.literal('test'),
});

type Params = { params: Promise<{ id: string }> };

// POST /api/integrations/:id/actions — Execute integration action
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireVerifiedEmail(request);
  if (auth instanceof NextResponse) return auth;

  const user = auth.user;
  const orgId = auth.user.orgId;
  const { id } = await params;

  const hasPermission = user.customRole
    ? user.customRole.permissions.includes(PERMISSIONS.MANAGE_SETTINGS)
    : user.role === 'owner' || user.role === 'admin';

  if (!hasPermission) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const integration = await db.integration.findFirst({ where: { id, orgId } });
  if (!integration) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
  }

  if (!integration.isActive) {
    return NextResponse.json({ error: 'Integration is not active' }, { status: 400 });
  }

  try {
    const body = await request.json();
    
    // Decrypt config
    let config: Record<string, any> = {};
    try {
      config = JSON.parse(integration.config);
      for (const key of ['apiToken', 'apiKey', 'botToken', 'teamsWebhookUrl']) {
        if (config[key] && isEncrypted(config[key])) {
          config[key] = decryptSecret(config[key]) ?? config[key];
        }
      }
    } catch {
      return NextResponse.json({ error: 'Invalid integration config' }, { status: 500 });
    }

    const actionType = body?.type;

    // Test connection
    if (actionType === 'test') {
      const result = await testIntegration(integration.type, config);
      await createIntegrationLog({
        integrationId: integration.id,
        action: 'test',
        status: result.success ? 'success' : 'failed',
        error: result.error,
      });
      return NextResponse.json({ success: result.success, error: result.error });
    }

    // Create issue
    if (actionType === 'create_issue') {
      const parsed = createIssueSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid action data', details: parsed.error.flatten() }, { status: 400 });
      }

      const { violationIds, projectKey, teamId } = parsed.data;
      
      // Get violations
      const violations = await db.violation.findMany({
        where: { id: { in: violationIds }, project: { orgId } },
        select: { id: true, ruleId: true, wcagCriteria: true, severity: true, url: true, description: true, elementHtml: true },
      });

      if (violations.length === 0) {
        return NextResponse.json({ error: 'No valid violations found' }, { status: 400 });
      }

      const result = await createIssue(integration.type, config, violations, { projectKey, teamId });
      
      await createIntegrationLog({
        integrationId: integration.id,
        action: 'create_issue',
        status: result.success ? 'success' : 'failed',
        payload: JSON.stringify({ violationIds, projectKey, teamId }),
        response: JSON.stringify(result),
        error: result.error,
      });

      return NextResponse.json(result);
    }

    // Send notification
    if (actionType === 'notify') {
      const parsed = notifySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid notification data', details: parsed.error.flatten() }, { status: 400 });
      }

      const { message, severity, channelId } = parsed.data;
      const result = await sendNotification(integration.type, config, message, severity, channelId);
      
      await createIntegrationLog({
        integrationId: integration.id,
        action: 'notify',
        status: result.success ? 'success' : 'failed',
        payload: JSON.stringify({ message, severity, channelId }),
        response: JSON.stringify(result),
        error: result.error,
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unknown action type' }, { status: 400 });
  } catch (error) {
    logger.error({ err: error, integrationId: integration.id }, 'Integration action failed');
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}

// --- Integration-specific implementations ---

async function testIntegration(type: string, config: Record<string, any>): Promise<{ success: boolean; error?: string }> {
  try {
    switch (type) {
      case 'jira':
        return await testJira(config);
      case 'linear':
        return await testLinear(config);
      case 'slack':
        return await testSlack(config);
      case 'teams':
        return await testTeams(config);
      default:
        return { success: false, error: 'Unknown integration type' };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function testJira(config: any): Promise<{ success: boolean; error?: string }> {
  if (!config.baseUrl || !config.email || !config.apiToken) {
    return { success: false, error: 'Missing Jira config (baseUrl, email, apiToken)' };
  }
  const res = await fetch(`${config.baseUrl}/rest/api/3/myself`, {
    headers: {
      'Authorization': `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')}`,
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return { success: false, error: `Jira auth failed: ${res.status}` };
  return { success: true };
}

async function testLinear(config: any): Promise<{ success: boolean; error?: string }> {
  if (!config.apiKey) {
    return { success: false, error: 'Missing Linear API key' };
  }
  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { 'Authorization': config.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ viewer { id } }' }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return { success: false, error: `Linear auth failed: ${res.status}` };
  return { success: true };
}

async function testSlack(config: any): Promise<{ success: boolean; error?: string }> {
  if (!config.webhookUrl && !config.botToken) {
    return { success: false, error: 'Missing Slack webhook URL or bot token' };
  }
  if (config.webhookUrl) {
    const res = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'AccessGuard integration test' }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { success: false, error: `Slack webhook failed: ${res.status}` };
  }
  return { success: true };
}

async function testTeams(config: any): Promise<{ success: boolean; error?: string }> {
  if (!config.teamsWebhookUrl) {
    return { success: false, error: 'Missing Teams webhook URL' };
  }
  const res = await fetch(config.teamsWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'AccessGuard integration test' }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return { success: false, error: `Teams webhook failed: ${res.status}` };
  return { success: true };
}

async function createIssue(type: string, config: any, violations: any[], options: { projectKey?: string; teamId?: string }): Promise<{ success: boolean; issueUrl?: string; error?: string }> {
  try {
    switch (type) {
      case 'jira':
        return await createJiraIssue(config, violations, options.projectKey);
      case 'linear':
        return await createLinearIssue(config, violations, options.teamId);
      default:
        return { success: false, error: `${type} does not support issue creation` };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function createJiraIssue(config: any, violations: any[], projectKey?: string): Promise<{ success: boolean; issueUrl?: string; error?: string }> {
  const key = projectKey || config.projectKey;
  if (!key) return { success: false, error: 'Jira project key not configured' };

  const summary = `Fix ${violations.length} accessibility issue(s)`;
  const description = violations.map(v => 
    `* ${v.ruleId} (${v.wcagCriteria || 'N/A'}): ${v.description}\nURL: ${v.url}\nSeverity: ${v.severity}`
  ).join('\n\n');

  const res = await fetch(`${config.baseUrl}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        project: { key },
        summary,
        description: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }] },
        issuetype: { name: 'Task' },
      },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text();
    return { success: false, error: `Jira API error: ${res.status} ${text}` };
  }

  const data = await res.json();
  return { success: true, issueUrl: `${config.baseUrl}/browse/${data.key}` };
}

async function createLinearIssue(config: any, violations: any[], teamId?: string): Promise<{ success: boolean; issueUrl?: string; error?: string }> {
  const tid = teamId || config.teamId;
  if (!tid) return { success: false, error: 'Linear team ID not configured' };

  const title = `Fix ${violations.length} accessibility issue(s)`;
  const description = violations.map(v => 
    `- **${v.ruleId}** (${v.wcagCriteria || 'N/A'}): ${v.description}\n  URL: ${v.url}\n  Severity: ${v.severity}`
  ).join('\n\n');

  const mutation = `
    mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { url }
      }
    }
  `;

  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { 'Authorization': config.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: mutation,
      variables: {
        input: {
          teamId: tid,
          title,
          description,
          labelIds: [],
        },
      },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text();
    return { success: false, error: `Linear API error: ${res.status} ${text}` };
  }

  const data = await res.json();
  if (data.errors) return { success: false, error: data.errors[0].message };
  return { success: true, issueUrl: data.data?.issueCreate?.issue?.url };
}

async function sendNotification(type: string, config: any, message: string, severity?: string, channelId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    switch (type) {
      case 'slack':
        return await sendSlackNotification(config, message, severity, channelId);
      case 'teams':
        return await sendTeamsNotification(config, message, channelId);
      default:
        return { success: false, error: `${type} does not support notifications` };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function sendSlackNotification(config: any, message: string, severity?: string, channelId?: string): Promise<{ success: boolean; error?: string }> {
  const webhookUrl = config.webhookUrl;
  if (!webhookUrl) return { success: false, error: 'Slack webhook URL not configured' };

  const color = severity === 'critical' ? 'danger' : severity === 'warning' ? 'warning' : 'good';
  
  const payload = channelId 
    ? { channel: channelId, text: message, attachments: [{ color, text: message }] }
    : { text: message, attachments: [{ color, text: message }] };

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) return { success: false, error: `Slack API error: ${res.status}` };
  return { success: true };
}

async function sendTeamsNotification(config: any, message: string, channelId?: string): Promise<{ success: boolean; error?: string }> {
  const webhookUrl = config.teamsWebhookUrl;
  if (!webhookUrl) return { success: false, error: 'Teams webhook URL not configured' };

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) return { success: false, error: `Teams API error: ${res.status}` };
  return { success: true };
}