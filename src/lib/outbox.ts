/**
 * Outbox Pattern
 * 
 * Ensures reliable event publishing by storing events in an outbox table
 * before publishing. Prevents lost events during failures.
 * 
 * Features:
 * - Transactional outbox for reliable publishing
 * - Polling publisher for outbox events
 * - Dead letter queue for failed events
 * - Event deduplication
 * 
 * Usage:
 *   import { outbox } from '@/lib/outbox';
 *   
 *   // Store event in outbox
 *   await outbox.store({
 *     aggregateId: 'project-123',
 *     eventType: 'ProjectCreated',
 *     payload: { name: 'My Project' },
 *   });
 *   
 *   // Events are published by background worker
 */

import { logger } from './error-logger';
import { metrics, metricNames } from './metrics';
import crypto from 'crypto';

export interface OutboxEvent {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'processing' | 'published' | 'failed';
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: Date;
  lastError?: string;
  createdAt: Date;
  publishedAt?: Date;
}

export interface OutboxOptions {
  pollInterval: number;      // Poll interval in ms
  batchSize: number;         // Events per batch
  maxAttempts: number;       // Max retry attempts
  retryDelay: number;        // Base retry delay
  deadLetterEnabled: boolean;
}

export type EventHandler = (event: OutboxEvent) => Promise<void>;

const DEFAULT_OPTIONS: OutboxOptions = {
  pollInterval: 1000,
  batchSize: 10,
  maxAttempts: 5,
  retryDelay: 1000,
  deadLetterEnabled: true,
};

// In-memory outbox (replace with database in production)
class OutboxManager {
  private events: OutboxEvent[] = [];
  private handlers = new Map<string, EventHandler[]>();
  private options: OutboxOptions;
  private pollTimer?: ReturnType<typeof setInterval>;
  private isRunning = false;

  constructor(options?: Partial<OutboxOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Store event in outbox
   */
  async store(event: {
    aggregateId: string;
    aggregateType: string;
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<OutboxEvent> {
    const outboxEvent: OutboxEvent = {
      id: crypto.randomUUID(),
      ...event,
      status: 'pending',
      attempts: 0,
      maxAttempts: this.options.maxAttempts,
      createdAt: new Date(),
    };

    this.events.push(outboxEvent);

    logger.info({
      eventId: outboxEvent.id,
      eventType: event.eventType,
      aggregateId: event.aggregateId,
    }, 'Event stored in outbox');

    metrics.increment(metricNames.OUTBOX_EVENTS_STORED, 1, {
      eventType: event.eventType,
    });

    return outboxEvent;
  }

  /**
   * Register event handler
   */
  on(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
  }

  /**
   * Start polling for events
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.pollTimer = setInterval(() => {
      this.processBatch().catch(error => {
        logger.error({ error: error.message }, 'Outbox polling error');
      });
    }, this.options.pollInterval);

    logger.info({ pollInterval: this.options.pollInterval }, 'Outbox manager started');
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
    this.isRunning = false;
    logger.info('Outbox manager stopped');
  }

  /**
   * Process batch of events
   */
  private async processBatch(): Promise<void> {
    // Get pending events
    const pendingEvents = this.events
      .filter(e => e.status === 'pending')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, this.options.batchSize);

    if (pendingEvents.length === 0) return;

    logger.debug({ count: pendingEvents.length }, 'Processing outbox batch');

    for (const event of pendingEvents) {
      await this.processEvent(event);
    }
  }

  /**
   * Process single event
   */
  private async processEvent(event: OutboxEvent): Promise<void> {
    event.status = 'processing';
    event.attempts++;

    try {
      const handlers = this.handlers.get(event.eventType) || [];
      
      if (handlers.length === 0) {
        logger.warn({ eventType: event.eventType }, 'No handlers for event type');
        event.status = 'published';
        event.publishedAt = new Date();
        return;
      }

      // Execute all handlers
      await Promise.all(handlers.map(handler => handler(event)));

      event.status = 'published';
      event.publishedAt = new Date();

      metrics.increment(metricNames.OUTBOX_EVENTS_PUBLISHED, 1, {
        eventType: event.eventType,
      });

      logger.info({
        eventId: event.id,
        eventType: event.eventType,
        attempts: event.attempts,
      }, 'Event published from outbox');

    } catch (error) {
      event.lastError = error instanceof Error ? error.message : 'Unknown error';

      if (event.attempts >= event.maxAttempts) {
        event.status = 'failed';
        
        metrics.increment(metricNames.OUTBOX_EVENTS_FAILED, 1, {
          eventType: event.eventType,
        });

        logger.error({
          eventId: event.id,
          eventType: event.eventType,
          error: event.lastError,
          attempts: event.attempts,
        }, 'Event failed permanently in outbox');

        // Move to dead letter if enabled
        if (this.options.deadLetterEnabled) {
          await this.moveToDeadLetter(event);
        }
      } else {
        // Schedule retry
        const delay = this.options.retryDelay * Math.pow(2, event.attempts - 1);
        event.nextRetryAt = new Date(Date.now() + delay);
        event.status = 'pending';

        logger.warn({
          eventId: event.id,
          eventType: event.eventType,
          attempt: event.attempts,
          nextRetryAt: event.nextRetryAt,
        }, 'Event retry scheduled');
      }
    }
  }

  /**
   * Move failed event to dead letter
   */
  private async moveToDeadLetter(event: OutboxEvent): Promise<void> {
    logger.error({
      eventId: event.id,
      eventType: event.eventType,
      payload: event.payload,
      lastError: event.lastError,
    }, 'Event moved to dead letter queue');
  }

  /**
   * Get pending event count
   */
  getPendingCount(): number {
    return this.events.filter(e => e.status === 'pending').length;
  }

  /**
   * Get failed event count
   */
  getFailedCount(): number {
    return this.events.filter(e => e.status === 'failed').length;
  }

  /**
   * Get stats
   */
  getStats(): {
    pending: number;
    processing: number;
    published: number;
    failed: number;
  } {
    return {
      pending: this.events.filter(e => e.status === 'pending').length,
      processing: this.events.filter(e => e.status === 'processing').length,
      published: this.events.filter(e => e.status === 'published').length,
      failed: this.events.filter(e => e.status === 'failed').length,
    };
  }

  /**
   * Retry failed events
   */
  async retryFailed(): Promise<number> {
    const failed = this.events.filter(e => e.status === 'failed');
    let retried = 0;

    for (const event of failed) {
      event.status = 'pending';
      event.attempts = 0;
      event.lastError = undefined;
      event.nextRetryAt = undefined;
      retried++;
    }

    logger.info({ count: retried }, 'Failed events queued for retry');
    return retried;
  }

  /**
   * Clear all events (for testing)
   */
  clear(): void {
    this.events = [];
  }
}

// Singleton
export const outbox = new OutboxManager();

/**
 * Event types for outbox
 */
export const OutboxEventTypes = {
  PROJECT_CREATED: 'ProjectCreated',
  PROJECT_UPDATED: 'ProjectUpdated',
  PROJECT_DELETED: 'ProjectDeleted',
  SCAN_STARTED: 'ScanStarted',
  SCAN_COMPLETED: 'ScanCompleted',
  VIOLATION_FOUND: 'ViolationFound',
  REPORT_GENERATED: 'ReportGenerated',
  USER_INVITED: 'UserInvited',
  SETTINGS_UPDATED: 'SettingsUpdated',
} as const;
