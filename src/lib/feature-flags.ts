import { getRedis, isRedisReady } from './redis';
import { logger } from './error-logger';

export type FeatureFlag = {
  key: string;
  description: string;
  defaultValue: boolean;
  owners: string[];
};

const BUILT_IN_FLAGS: FeatureFlag[] = [
  { key: 'scanner.browser', description: 'Enable browser-based scanner', defaultValue: true, owners: ['platform'] },
  { key: 'scanner.ai_remediation', description: 'Enable AI-powered remediation suggestions', defaultValue: true, owners: ['ai'] },
  { key: 'reports.pdf', description: 'Enable PDF report generation', defaultValue: true, owners: ['platform'] },
  { key: 'auth.github', description: 'Enable GitHub OAuth login', defaultValue: true, owners: ['auth'] },
  { key: 'billing.stripe', description: 'Enable Stripe billing integration', defaultValue: true, owners: ['billing'] },
  { key: 'notifications.email', description: 'Enable email notifications', defaultValue: true, owners: ['platform'] },
  { key: 'scheduler.automation', description: 'Enable automated scheduled scans', defaultValue: true, owners: ['platform'] },
  { key: 'team.invites', description: 'Enable team member invites', defaultValue: true, owners: ['auth'] },
  { key: 'experimental.new_dashboard', description: 'New dashboard UI (experimental)', defaultValue: false, owners: ['frontend'] },
  { key: 'experimental.bulk_actions', description: 'Bulk violation actions', defaultValue: false, owners: ['frontend'] },
];

const FLAG_CACHE_TTL = parseInt(process.env.FLAG_CACHE_TTL || '300', 10);

const envOverridePrefix = 'FF_';

function getEnvOverride(key: string): boolean | undefined {
  const envKey = `${envOverridePrefix}${key.toUpperCase().replace(/\./g, '_')}`;
  const val = process.env[envKey];
  if (val === undefined) return undefined;
  return val === '1' || val === 'true' || val === 'yes';
}

export function getFlagDefinition(key: string): FeatureFlag | undefined {
  return BUILT_IN_FLAGS.find((f) => f.key === key);
}

export function getAllFlagDefinitions(): FeatureFlag[] {
  return [...BUILT_IN_FLAGS];
}

export async function isEnabled(key: string, orgId?: string): Promise<boolean> {
  const flag = BUILT_IN_FLAGS.find((f) => f.key === key);
  if (!flag) {
    logger.warn({ key }, 'Unknown feature flag checked');
    return false;
  }

  const envOverride = getEnvOverride(key);
  if (envOverride !== undefined) return envOverride;

  if (isRedisReady()) {
    try {
      const redis = getRedis();
      if (redis) {
        const redisKey = orgId ? `ff:${orgId}:${key}` : `ff:global:${key}`;
        const val = await redis.get(redisKey);
        if (val !== null) {
          return val === '1' || val === 'true';
        }
      }
    } catch (err) {
      logger.error({ err, key }, 'Redis feature flag check failed');
    }
  }

  return flag.defaultValue;
}

export async function setFlag(key: string, value: boolean, orgId?: string): Promise<void> {
  if (!isRedisReady()) {
    logger.warn({ key }, 'Cannot set flag — Redis not available');
    return;
  }

  try {
    const redis = getRedis();
    if (!redis) return;

    const redisKey = orgId ? `ff:${orgId}:${key}` : `ff:global:${key}`;
    await redis.set(redisKey, value ? '1' : '0', 'EX', FLAG_CACHE_TTL);
    logger.info({ key, value, orgId }, 'Feature flag set');
  } catch (err) {
    logger.error({ err, key }, 'Failed to set feature flag');
  }
}

export async function deleteFlag(key: string, orgId?: string): Promise<void> {
  if (!isRedisReady()) return;

  try {
    const redis = getRedis();
    if (!redis) return;

    const redisKey = orgId ? `ff:${orgId}:${key}` : `ff:global:${key}`;
    await redis.del(redisKey);
  } catch (err) {
    logger.error({ err, key }, 'Failed to delete feature flag');
  }
}

export function createFlagGuard(key: string) {
  return {
    async guard<T>(fn: () => T, fallback: T, orgId?: string): Promise<T> {
      const enabled = await isEnabled(key, orgId);
      if (!enabled) return fallback;
      return fn();
    },
  };
}
