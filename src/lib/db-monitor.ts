import { db } from './db';
import { logger } from './error-logger';

interface QueryMetric {
  query: string;
  duration: number;
  timestamp: Date;
}

class DatabaseMonitor {
  private slowQueryThreshold = 100; // ms
  private metrics: QueryMetric[] = [];
  private maxMetrics = 1000;

  logSlowQuery(query: string, duration: number) {
    if (duration > this.slowQueryThreshold) {
      logger.warn({ query, duration }, 'Slow database query detected');
      
      this.metrics.push({
        query,
        duration,
        timestamp: new Date(),
      });

      // Keep only recent metrics
      if (this.metrics.length > this.maxMetrics) {
        this.metrics = this.metrics.slice(-this.maxMetrics / 2);
      }
    }
  }

  getSlowQueries(limit = 10): QueryMetric[] {
    return this.metrics
      .filter(m => m.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  async getConnectionStats() {
    try {
      const result = await db.$queryRaw<Array<{total: bigint; active: bigint; idle: bigint}>>`
        SELECT 
          count(*) as total,
          count(*) FILTER (WHERE state = 'active') as active,
          count(*) FILTER (WHERE state = 'idle') as idle
        FROM pg_stat_activity
        WHERE datname = current_database()
      `;
      return result[0] || { total: 0, active: 0, idle: 0 };
    } catch {
      return { total: 0, active: 0, idle: 0 };
    }
  }

  async getTableStats() {
    try {
      const result = await db.$queryRaw<Array<Record<string, unknown>>>`
        SELECT 
          schemaname,
          relname,
          n_live_tup,
          n_dead_tup,
          last_vacuum,
          last_autovacuum
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
        LIMIT 10
      `;
      return result;
    } catch {
      return [];
    }
  }

  async getIndexUsage() {
    try {
      const result = await db.$queryRaw<Array<Record<string, unknown>>>`
        SELECT 
          indexrelname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes
        ORDER BY idx_scan DESC
        LIMIT 10
      `;
      return result;
    } catch {
      return [];
    }
  }
}

export const dbMonitor = new DatabaseMonitor();
