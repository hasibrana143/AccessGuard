// Slack / Teams webhook notification service
import { logger } from '@/lib/error-logger';

interface WebhookPayload {
  text: string;
  title?: string;
  color?: string;
  fields?: Array<{ label: string; value: string }>;
}

function isTeamsWebhook(url: string): boolean {
  return url.includes('webhook.office.com') || url.includes('office.com/webhook');
}

export async function sendWebhookNotification(
  webhookUrl: string,
  payload: WebhookPayload
): Promise<{ success: boolean; error?: string }> {
  if (!webhookUrl || !webhookUrl.startsWith('https://')) {
    return { success: false, error: 'Invalid webhook URL' };
  }

  try {
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
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamsPayload),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        return { success: false, error: `Webhook returned ${res.status}` };
      }
      return { success: true };
    }

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
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return { success: false, error: `Webhook returned ${res.status}` };
    }
    return { success: true };
  } catch (error) {
    logger.error({ err: error }, '');
    return { success: false, error: String(error) };
  }
}
