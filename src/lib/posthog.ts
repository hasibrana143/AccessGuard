import { logger } from './error-logger';

export interface AnalyticsEventProperties {
  orgId?: string;
  plan?: string;
  projectId?: string;
  scanId?: string;
  violationCount?: number;
  score?: number;
  currency?: string;
  amount?: number;
  [key: string]: unknown;
}

export type CoreAnalyticsEvent =
  | 'signup_started'
  | 'email_verified'
  | 'project_created'
  | 'scan_started'
  | 'scan_completed'
  | 'scan_failed'
  | 'violation_fixed'
  | 'ai_fix_generated'
  | 'pr_created'
  | 'report_generated'
  | 'checkout_started'
  | 'plan_upgraded'
  | 'plan_cancelled'
  | 'sso_login';

function getPostHogConfig() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.POSTHOG_API_KEY || '';
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || process.env.POSTHOG_HOST || 'https://app.posthog.com';
  return { key, host, configured: Boolean(key) };
}

/**
 * Returns true if PostHog API credentials are configured
 */
export function isPostHogConfigured(): boolean {
  return getPostHogConfig().configured;
}

/**
 * Capture an analytics event (server or client).
 * If PostHog key is not set, safely logs in debug mode without failing.
 */
export async function captureAnalytics(
  event: CoreAnalyticsEvent | string,
  properties: AnalyticsEventProperties = {},
  distinctId = 'anonymous'
): Promise<boolean> {
  const { key, host, configured } = getPostHogConfig();
  if (!configured) {
    logger.debug({ event, properties, distinctId }, '[Analytics Mock] Event recorded (PostHog not configured)');
    return true;
  }

  try {
    const payload = {
      api_key: key,
      event,
      properties: {
        distinct_id: distinctId,
        $lib: 'accessguard-telemetry',
        timestamp: new Date().toISOString(),
        ...properties,
      },
    };

    const response = await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      logger.warn({ status: response.status, event }, 'PostHog capture request failed');
      return false;
    }

    return true;
  } catch (error) {
    logger.warn({ err: error, event }, 'Failed to dispatch PostHog event');
    return false;
  }
}

/**
 * Identify a user in PostHog.
 */
export async function identifyUser(
  distinctId: string,
  traits: Record<string, unknown> = {}
): Promise<boolean> {
  const { key, host, configured } = getPostHogConfig();
  if (!configured) {
    logger.debug({ distinctId, traits }, '[Analytics Mock] User identified (PostHog not configured)');
    return true;
  }

  try {
    const payload = {
      api_key: key,
      event: '$identify',
      properties: {
        distinct_id: distinctId,
        $set: traits,
        timestamp: new Date().toISOString(),
      },
    };

    const response = await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    logger.warn({ err: error, distinctId }, 'Failed to identify user in PostHog');
    return false;
  }
}
