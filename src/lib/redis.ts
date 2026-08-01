import Redis from 'ioredis';
import { logger } from './error-logger';

let redis: Redis | null = null;
let redisReady = false;

export function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.REDIS_URL;
  if (!url) {
    logger.warn('REDIS_URL not set — running without Redis');
    return null;
  }

  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          logger.error('Redis connection failed after 3 retries — disabling');
          redis = null;
          redisReady = false;
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    redis.on('connect', () => {
      redisReady = true;
      logger.info('Redis connected');
    });

    redis.on('error', (err) => {
      logger.error({ err }, 'Redis connection error');
      redisReady = false;
    });

    redis.on('close', () => {
      redisReady = false;
    });

    redis.connect().catch((err) => {
      logger.error({ err }, 'Redis initial connection failed');
      redis = null;
      redisReady = false;
    });
  } catch (err) {
    logger.error({ err }, 'Failed to create Redis client');
    redis = null;
    redisReady = false;
  }

  return redis;
}

export function isRedisReady(): boolean {
  return redis !== null && redisReady;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    redisReady = false;
  }
}
