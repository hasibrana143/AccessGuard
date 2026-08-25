import { logger } from './error-logger';

interface MetricValue {
  value: number;
  timestamp: number;
}

class MetricsCollector {
  private counters = new Map<string, number>();
  private histograms = new Map<string, MetricValue[]>();
  private gauges = new Map<string, number>();
  private maxHistogramSize = 1000;

  // Counter methods
  increment(name: string, value: number = 1, labels?: Record<string, string>) {
    const key = labels ? `${name}:${JSON.stringify(labels)}` : name;
    this.counters.set(key, (this.counters.get(key) || 0) + value);
  }

  decrement(name: string, value: number = 1, labels?: Record<string, string>) {
    const key = labels ? `${name}:${JSON.stringify(labels)}` : name;
    this.counters.set(key, (this.counters.get(key) || 0) - value);
  }

  // Gauge methods
  gauge(name: string, value: number, labels?: Record<string, string>) {
    const key = labels ? `${name}:${JSON.stringify(labels)}` : name;
    this.gauges.set(key, value);
  }

  // Histogram methods
  observe(name: string, value: number, labels?: Record<string, string>) {
    const key = labels ? `${name}:${JSON.stringify(labels)}` : name;
    const histogram = this.histograms.get(key) || [];
    
    histogram.push({
      value,
      timestamp: Date.now(),
    });

    // Keep only recent values
    if (histogram.length > this.maxHistogramSize) {
      histogram.splice(0, histogram.length - this.maxHistogramSize);
    }

    this.histograms.set(key, histogram);
  }

  // Timing helper
  startTimer(name: string, labels?: Record<string, string>): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.observe(name, duration, labels);
    };
  }

  // Get percentile from histogram
  getPercentile(name: string, percentile: number): number {
    const histogram = this.histograms.get(name) || [];
    if (histogram.length === 0) return 0;

    const sorted = histogram.map(v => v.value).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  // Get all metrics for export
  getMetrics() {
    const metrics: Record<string, unknown> = {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: {},
    };

    for (const [key, values] of this.histograms) {
      const numValues = values.map(v => v.value).sort((a, b) => a - b);
      if (numValues.length > 0) {
        (metrics.histograms as Record<string, unknown>)[key] = {
          count: numValues.length,
          min: numValues[0],
          max: numValues[numValues.length - 1],
          avg: numValues.reduce((a, b) => a + b, 0) / numValues.length,
          p50: this.getPercentile(key, 50),
          p95: this.getPercentile(key, 95),
          p99: this.getPercentile(key, 99),
        };
      }
    }

    return metrics;
  }

  // Reset all metrics
  reset() {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
  }

  // Export to structured log
  exportToLog() {
    const metrics = this.getMetrics();
    logger.info({ metrics }, 'Metrics export');
  }
}

export const metrics = new MetricsCollector();

// Pre-defined metric names
export const metricNames = {
  API_REQUESTS: 'api.requests',
  API_DURATION: 'api.duration',
  API_ERRORS: 'api.errors',
  DB_QUERIES: 'db.queries',
  DB_DURATION: 'db.duration',
  CACHE_HITS: 'cache.hits',
  CACHE_MISSES: 'cache.misses',
  QUEUE_JOBS: 'queue.jobs',
  QUEUE_DURATION: 'queue.duration',
  SCAN_DURATION: 'scan.duration',
  SCAN_VIOLATIONS: 'scan.violations',
  EMAIL_SENT: 'email.sent',
  EMAIL_FAILED: 'email.failed',
  CIRCUIT_BREAKER_CALLS: 'circuit-breaker.calls',
  CIRCUIT_BREAKER_STATE_CHANGES: 'circuit-breaker.state-changes',
  REQUEST_QUEUE_DEPTH: 'request-queue.depth',
  LOCK_ACQUIRED: 'lock.acquired',
  LOCK_FAILED: 'lock.failed',
  BULKHEAD_REJECTED: 'bulkhead.rejected',
  BULKHEAD_TIMEOUT: 'bulkhead.timeout',
  BULKHEAD_EXECUTED: 'bulkhead.executed',
  BULKHEAD_FAILED: 'bulkhead.failed',
  BULKHEAD_QUEUE: 'bulkhead.queue',
  BULKHEAD_CONCURRENT: 'bulkhead.concurrent',
  BULKHEAD_EXECUTION_TIME: 'bulkhead.execution-time',
  RETRY_ATTEMPT: 'retry.attempt',
  IDEMPOTENCY_HIT: 'idempotency.hit',
  IDEMPOTENCY_MISS: 'idempotency.miss',
  DEDUPLICATION_HIT: 'deduplication.hit',
  EVENTS_APPENDED: 'events.appended',
  EVENTS_READ: 'events.read',
  SNAPSHOTS_CREATED: 'snapshots.created',
  COMMANDS_EXECUTED: 'commands.executed',
  COMMANDS_FAILED: 'commands.failed',
  COMMAND_DURATION: 'command.duration',
  QUERIES_EXECUTED: 'queries.executed',
  QUERIES_FAILED: 'queries.failed',
  QUERY_DURATION: 'query.duration',
  QUERY_CACHE_HITS: 'query.cache-hits',
  OUTBOX_EVENTS_STORED: 'outbox.events-stored',
  OUTBOX_EVENTS_PUBLISHED: 'outbox.events-published',
  OUTBOX_EVENTS_FAILED: 'outbox.events-failed',
  SAGA_EXECUTED: 'saga.executed',
  SAGA_FAILED: 'saga.failed',
  SAGA_DURATION: 'saga.duration',
  GATEWAY_REQUESTS: 'gateway.requests',
  GATEWAY_ERRORS: 'gateway.errors',
  GATEWAY_DURATION: 'gateway.duration',
  GATEWAY_CACHE_HITS: 'gateway.cache-hits',
  ACL_CALLS: 'acl.calls',
  ACL_DURATION: 'acl.duration',
  MIGRATION_REQUESTS: 'migration.requests',
  MIGRATION_DURATION: 'migration.duration',
  REPO_CACHE_HITS: 'repo.cache-hits',
  REPO_QUERY_DURATION: 'repo.query-duration',
  REPO_OPERATIONS: 'repo.operations',
  TRANSACTION_COMMITTED: 'transaction.committed',
  TRANSACTION_ROLLED_BACK: 'transaction.rolled-back',
  TRANSACTION_DURATION: 'transaction.duration',
  FUNCTION_DURATION: 'function.duration',
  RATE_LIMIT_EXCEEDED: 'rate-limit.exceeded',
};
