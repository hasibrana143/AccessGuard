import { logger } from './error-logger';

export type IncidentSeverity = 'critical' | 'error' | 'warning' | 'info';

export interface TriggerIncidentOptions {
  summary: string;
  severity?: IncidentSeverity;
  source?: string;
  component?: string;
  dedupKey?: string;
  customDetails?: Record<string, unknown>;
}

const PAGERDUTY_EVENTS_API = 'https://events.pagerduty.com/v2/enqueue';

function getRoutingKey(): string {
  return process.env.PAGERDUTY_ROUTING_KEY || process.env.PAGERDUTY_INTEGRATION_KEY || '';
}

/**
 * Returns true if PagerDuty routing key is configured
 */
export function isPagerDutyConfigured(): boolean {
  return Boolean(getRoutingKey());
}

/**
 * Trigger an incident via PagerDuty Events API v2.
 * When unconfigured, safely logs the incident as a warning/error without throwing.
 */
export async function triggerIncident(
  options: TriggerIncidentOptions
): Promise<{ success: boolean; dedupKey?: string; error?: string }> {
  const routingKey = getRoutingKey();
  const severity = options.severity || 'error';
  const source = options.source || 'accessguard-prod';
  const dedupKey = options.dedupKey || `ag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (!routingKey) {
    logger.warn(
      {
        summary: options.summary,
        severity,
        source,
        dedupKey,
        customDetails: options.customDetails,
      },
      '[PagerDuty Mock] Incident triggered (PagerDuty routing key not configured)'
    );
    return { success: true, dedupKey };
  }

  try {
    const payload = {
      routing_key: routingKey,
      event_action: 'trigger',
      dedup_key: dedupKey,
      payload: {
        summary: options.summary,
        severity,
        source,
        component: options.component || 'core-engine',
        custom_details: options.customDetails || {},
      },
    };

    const response = await fetch(PAGERDUTY_EVENTS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error({ status: response.status, errText }, 'PagerDuty event trigger failed');
      return { success: false, error: `PagerDuty HTTP ${response.status}: ${errText}` };
    }

    const data = await response.json();
    logger.info({ dedupKey: data.dedup_key || dedupKey }, 'PagerDuty incident triggered successfully');
    return { success: true, dedupKey: data.dedup_key || dedupKey };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown PagerDuty error';
    logger.error({ err }, 'Failed to send PagerDuty alert');
    return { success: false, error: msg };
  }
}

/**
 * Resolve an active incident in PagerDuty.
 */
export async function resolveIncident(
  dedupKey: string,
  summary = 'Incident resolved by AccessGuard'
): Promise<boolean> {
  const routingKey = getRoutingKey();

  if (!routingKey) {
    logger.info({ dedupKey, summary }, '[PagerDuty Mock] Incident resolved (PagerDuty not configured)');
    return true;
  }

  try {
    const payload = {
      routing_key: routingKey,
      event_action: 'resolve',
      dedup_key: dedupKey,
      payload: {
        summary,
        source: 'accessguard-prod',
        severity: 'info',
      },
    };

    const response = await fetch(PAGERDUTY_EVENTS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (err) {
    logger.error({ err, dedupKey }, 'Failed to resolve PagerDuty incident');
    return false;
  }
}
