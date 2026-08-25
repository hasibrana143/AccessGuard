/**
 * Event Sourcing
 * 
 * Captures all changes as a sequence of events.
 * Provides complete audit trail and state reconstruction.
 * 
 * Features:
 * - Event store with append-only log
 * - Event replay for state reconstruction
 * - Snapshot optimization
 * - Event versioning
 * 
 * Usage:
 *   import { eventStore } from '@/lib/event-sourcing';
 *   
 *   // Append event
 *   await eventStore.append({
 *     aggregateId: 'project-123',
 *     aggregateType: 'Project',
 *     eventType: 'ProjectCreated',
 *     data: { name: 'My Project', url: 'https://example.com' },
 *   });
 *   
 *   // Replay events
 *   const events = await eventStore.getEvents('project-123');
 */

import { logger } from './error-logger';
import { metrics, metricNames } from './metrics';
import crypto from 'crypto';

export interface DomainEvent {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  version: number;
  timestamp: Date;
  causationId?: string;
  correlationId?: string;
}

export interface EventStoreOptions {
  snapshotInterval: number;  // Events between snapshots
  maxEventsPerQuery: number;
  retentionDays: number;
}

export interface Snapshot {
  aggregateId: string;
  aggregateType: string;
  state: Record<string, unknown>;
  version: number;
  timestamp: Date;
}

export interface EventFilter {
  aggregateId?: string;
  aggregateType?: string;
  eventType?: string;
  fromVersion?: number;
  toVersion?: number;
  fromTimestamp?: Date;
  toTimestamp?: Date;
  limit?: number;
}

const DEFAULT_OPTIONS: EventStoreOptions = {
  snapshotInterval: 100,
  maxEventsPerQuery: 1000,
  retentionDays: 365,
};

// In-memory event store (replace with database in production)
class EventStore {
  private events: DomainEvent[] = [];
  private snapshots = new Map<string, Snapshot>();
  private options: EventStoreOptions;
  private versionCounters = new Map<string, number>();

  constructor(options?: Partial<EventStoreOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Append event to store
   */
  async append(event: Omit<DomainEvent, 'id' | 'version' | 'timestamp'>): Promise<DomainEvent> {
    const aggregateKey = `${event.aggregateType}:${event.aggregateId}`;
    const currentVersion = this.versionCounters.get(aggregateKey) || 0;
    const newVersion = currentVersion + 1;

    const fullEvent: DomainEvent = {
      ...event,
      id: crypto.randomUUID(),
      version: newVersion,
      timestamp: new Date(),
    };

    this.events.push(fullEvent);
    this.versionCounters.set(aggregateKey, newVersion);

    // Record metrics
    metrics.increment(metricNames.EVENTS_APPENDED, 1, {
      aggregateType: event.aggregateType,
      eventType: event.eventType,
    });

    logger.info({
      eventId: fullEvent.id,
      aggregateId: event.aggregateId,
      eventType: event.eventType,
      version: newVersion,
    }, 'Event appended');

    // Check if snapshot needed
    if (newVersion % this.options.snapshotInterval === 0) {
      await this.createSnapshot(event.aggregateId, event.aggregateType);
    }

    return fullEvent;
  }

  /**
   * Get events for aggregate
   */
  async getEvents(
    aggregateId: string,
    aggregateType?: string,
    fromVersion?: number
  ): Promise<DomainEvent[]> {
    let filtered = this.events.filter(e => e.aggregateId === aggregateId);
    
    if (aggregateType) {
      filtered = filtered.filter(e => e.aggregateType === aggregateType);
    }

    if (fromVersion) {
      filtered = filtered.filter(e => e.version >= fromVersion);
    }

    // Apply limit
    if (filtered.length > this.options.maxEventsPerQuery) {
      filtered = filtered.slice(-this.options.maxEventsPerQuery);
    }

    metrics.increment(metricNames.EVENTS_READ, 1);

    return filtered;
  }

  /**
   * Get events with filter
   */
  async queryEvents(filter: EventFilter): Promise<DomainEvent[]> {
    let filtered = [...this.events];

    if (filter.aggregateId) {
      filtered = filtered.filter(e => e.aggregateId === filter.aggregateId);
    }
    if (filter.aggregateType) {
      filtered = filtered.filter(e => e.aggregateType === filter.aggregateType);
    }
    if (filter.eventType) {
      filtered = filtered.filter(e => e.eventType === filter.eventType);
    }
    if (filter.fromVersion) {
      filtered = filtered.filter(e => e.version >= filter.fromVersion!);
    }
    if (filter.toVersion) {
      filtered = filtered.filter(e => e.version <= filter.toVersion!);
    }
    if (filter.fromTimestamp) {
      filtered = filtered.filter(e => e.timestamp >= filter.fromTimestamp!);
    }
    if (filter.toTimestamp) {
      filtered = filtered.filter(e => e.timestamp <= filter.toTimestamp!);
    }

    // Sort by timestamp
    filtered.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Apply limit
    const limit = filter.limit || this.options.maxEventsPerQuery;
    if (filtered.length > limit) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }

  /**
   * Create snapshot
   */
  async createSnapshot(aggregateId: string, aggregateType: string): Promise<void> {
    const events = await this.getEvents(aggregateId, aggregateType);
    if (events.length === 0) return;

    // Rebuild state from events
    const state = this.rebuildState(events);

    const snapshot: Snapshot = {
      aggregateId,
      aggregateType,
      state,
      version: events[events.length - 1].version,
      timestamp: new Date(),
    };

    this.snapshots.set(`${aggregateType}:${aggregateId}`, snapshot);

    logger.info({
      aggregateId,
      aggregateType,
      version: snapshot.version,
    }, 'Snapshot created');

    metrics.increment(metricNames.SNAPSHOTS_CREATED, 1, { aggregateType });
  }

  /**
   * Get latest snapshot
   */
  async getSnapshot(aggregateId: string, aggregateType: string): Promise<Snapshot | null> {
    return this.snapshots.get(`${aggregateType}:${aggregateId}`) || null;
  }

  /**
   * Rebuild state from events
   */
  private rebuildState(events: DomainEvent[]): Record<string, unknown> {
    let state: Record<string, unknown> = {};

    for (const event of events) {
      state = this.applyEvent(state, event);
    }

    return state;
  }

  /**
   * Apply event to state
   */
  private applyEvent(
    state: Record<string, unknown>,
    event: DomainEvent
  ): Record<string, unknown> {
    switch (event.eventType) {
      case 'ProjectCreated':
      case 'ScanStarted':
      case 'ViolationFound':
        return { ...state, ...event.data };

      case 'ProjectUpdated':
        return { ...state, ...event.data };

      case 'ProjectDeleted':
        return { ...state, deleted: true, deletedAt: event.timestamp };

      case 'ScanCompleted':
        return {
          ...state,
          status: 'completed',
          completedAt: event.timestamp,
          ...event.data,
        };

      case 'ViolationFixed':
        return {
          ...state,
          status: 'fixed',
          fixedAt: event.timestamp,
          ...event.data,
        };

      default:
        return { ...state, ...event.data };
    }
  }

  /**
   * Get current version for aggregate
   */
  getCurrentVersion(aggregateId: string, aggregateType: string): number {
    const key = `${aggregateType}:${aggregateId}`;
    return this.versionCounters.get(key) || 0;
  }

  /**
   * Get all events (for debugging)
   */
  getAllEvents(): DomainEvent[] {
    return [...this.events];
  }

  /**
   * Get event count
   */
  getEventCount(): number {
    return this.events.length;
  }

  /**
   * Clear all events (for testing)
   */
  clear(): void {
    this.events = [];
    this.snapshots.clear();
    this.versionCounters.clear();
  }
}

// Singleton
export const eventStore = new EventStore();

/**
 * Event types for AccessGuard
 */
export const EventTypes = {
  // Project events
  PROJECT_CREATED: 'ProjectCreated',
  PROJECT_UPDATED: 'ProjectUpdated',
  PROJECT_DELETED: 'ProjectDeleted',

  // Scan events
  SCAN_STARTED: 'ScanStarted',
  SCAN_COMPLETED: 'ScanCompleted',
  SCAN_FAILED: 'ScanFailed',

  // Violation events
  VIOLATION_FOUND: 'ViolationFound',
  VIOLATION_FIXED: 'ViolationFixed',
  VIOLATION_IGNORED: 'ViolationIgnored',
  VIOLATION_FALSE_POSITIVE: 'ViolationFalsePositive',

  // User events
  USER_CREATED: 'UserCreated',
  USER_UPDATED: 'UserUpdated',
  USER_DELETED: 'UserDeleted',

  // Report events
  REPORT_GENERATED: 'ReportGenerated',
  REPORT_SHARED: 'ReportShared',

  // Settings events
  SETTINGS_UPDATED: 'SettingsUpdated',
} as const;
