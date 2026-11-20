// Slack / Teams webhook notification service with HMAC signing and retries
import { logger } from '@/lib/error-logger';
import { createHmac } from 'crypto';

interface WebhookPayload {
  text: string;
  title?: string;
  color?: string;
  fields?: Array<{ label: string; value: string }>;
}

interface WebhookConfig {
  url: string;
  secret?: string; // HMAC secret for signing
  retries?: number;
  retryDelayMs?: number;
}

function isTeamsWebhook(url: string): boolean {
  return url.includes('webhook.office.com') || url.includes('office.com/webhook');
}

function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

async function postWithRetry(
  url: string,
  body: string,
  headers: Record<string, string>,
  retries: number,
  delayMs: number
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(10_000),
      });
      return res;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastError || new Error('Webhook request failed after retries');
}

export async function sendWebhookNotification(
  webhookUrl: string,
  payload: WebhookPayload,
  config?: { secret?: string; retries?: number; retryDelayMs?: number }
): Promise<{ success: boolean; error?: string }> {
  if (!webhookUrl || !webhookUrl.startsWith('https://')) {
    return { success: false, error: 'Invalid webhook URL' };
  }

  const secret = config?.secret;
  const retries = config?.retries ?? 2;
  const retryDelayMs = config?.retryDelayMs ?? 1000;

  try {
    let body: string;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (isTeamsWebhook(webhookUrl)) {
      const teamsPayload = {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        summary: payload.text,
        title: payload.title || 'AccessGuard Alert',
        themeColor: payload.color === 'red' ? 'D13438' : payload.color === 'green' ? '2EB086' : 'C07F00',
        sections: [
          {
            text: payload.text,
            facts: payload.fields?.map((f) => ({ name: f.label, value: f.value })) || [],
          },
        ],
      };
      body = JSON.stringify(teamsPayload);
    } else {
      const slackPayload = {
        text: `${payload.title ? `*${payload.title}*\n` : ''}${payload.text}`,
        attachments: payload.fields?.length
          ? [
              {
                color: payload.color || 'warning',
                fields: payload.fields.map((f) => ({ title: f.label, value: f.value, short: true })),
              },
            ]
          : [],
      };
      body = JSON.stringify(slackPayload);
    }

    // Add HMAC signature if secret provided
    if (secret) {
      headers['X-AccessGuard-Signature'] = signPayload(body, secret);
      headers['X-AccessGuard-Timestamp'] = String(Math.floor(Date.now() / 1000));
    }

    const res = await postWithRetry(webhookUrl, body, headers, retries, retryDelayMs);
    
    if (!res.ok) {
      return { success: false, error: `Webhook returned ${res.status}` };
    }
    return { success: true };
  } catch (error) {
    logger.error({ err: error }, '');
    return { success: false, error: String(error) };
  }
}
