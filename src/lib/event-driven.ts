/**
 * Event-Driven Architecture
 * 
 * Implements event-driven patterns:
 * - Event Bus (in-process messaging)
 * - Pub/Sub (topic-based distribution)
 * - Event Store (persistence)
 * - Event Replay (rebuild state)
 * - Dead Letter Queue (failed events)
 * 
 * Features:
 * - Type-safe event handling
 * - Event filtering and routing
 * - Event persistence and replay
 * - Failed event handling
 * - Event versioning
 * 
 * Usage:
 *   import { EventBus, EventStore } from '@/lib/event-driven';
 *   
 *   // Subscribe to events
 *   eventBus.subscribe('scan.completed', async (event) => {
 *     console.log('Scan completed:', event.payload);
 *   });
 *   
 *   // Publish event
 *   await eventBus.publish({
 *     type: 'scan.completed',
 *     payload: { scanId: '123', projectId: '456' }
 *   });
 */

// ============ Event Types ============

export interface Event {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  metadata: {
    timestamp: Date;
    source: string;
    version: number;
    correlationId?: string;
    causationId?: string;
  };
}

export interface EventHandler {
  (event: Event): Promise<void>;
}

export interface EventFilter {
  type?: string;
  source?: string;
  after?: Date;
  before?: Date;
}

// ============ Event Bus ============

export class EventBus {
  private handlers = new Map<string, EventHandler[]>();
  private wildcardHandlers: EventHandler[] = [];
  private middleware: ((event: Event) => Promise<Event | null>)[] = [];

  /**
   * Subscribe to event type
   */
  subscribe(type: string, handler: EventHandler): () => void {
    const existing = this.handlers.get(type) || [];
    existing.push(handler);
    this.handlers.set(type, existing);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(type) || [];
      this.handlers.set(
        type,
        handlers.filter((h) => h !== handler)
      );
    };
  }

  /**
   * Subscribe to all events
   */
  subscribeAll(handler: EventHandler): () => void {
    this.wildcardHandlers.push(handler);
    return () => {
      this.wildcardHandlers = this.wildcardHandlers.filter((h) => h !== handler);
    };
  }

  /**
   * Add middleware
   */
  use(middleware: (event: Event) => Promise<Event | null>): void {
    this.middleware.push(middleware);
  }

  /**
   * Publish event
   */
  async publish(event: Event): Promise<void> {
    // Apply middleware
    let processedEvent: Event | null = event;
    for (const mw of this.middleware) {
      if (!processedEvent) return;
      processedEvent = await mw(processedEvent);
    }

    if (!processedEvent) return;

    // Notify type-specific handlers
    const handlers = this.handlers.get(processedEvent.type) || [];
    await Promise.all(handlers.map((h) => h(processedEvent!)));

    // Notify wildcard handlers
    await Promise.all(this.wildcardHandlers.map((h) => h(processedEvent!)));
  }

  /**
   * Get handler count for type
   */
  getHandlerCount(type: string): number {
    return (this.handlers.get(type) || []).length;
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
    this.wildcardHandlers = [];
  }
}

// ============ Pub/Sub ============

export class PubSub {
  private topics = new Map<string, Set<EventHandler>>();
  private subscriptions = new Map<string, Set<string>>(); // subscriberId -> topics

  /**
   * Subscribe to topic
   */
  subscribe(topic: string, subscriberId: string, handler: EventHandler): void {
    // Add handler to topic
    const handlers = this.topics.get(topic) || new Set();
    handlers.add(handler);
    this.topics.set(topic, handlers);

    // Track subscription
    const subs = this.subscriptions.get(subscriberId) || new Set();
    subs.add(topic);
    this.subscriptions.set(subscriberId, subs);
  }

  /**
   * Unsubscribe from topic
   */
  unsubscribe(topic: string, subscriberId: string): void {
    const subs = this.subscriptions.get(subscriberId);
    if (subs) {
      subs.delete(topic);
    }
  }

  /**
   * Publish to topic
   */
  async publish(topic: string, event: Event): Promise<void> {
    const handlers = this.topics.get(topic);
    if (handlers) {
      await Promise.all(Array.from(handlers).map((h) => h(event)));
    }
  }

  /**
   * Publish to multiple topics
   */
  async publishMany(topics: string[], event: Event): Promise<void> {
    await Promise.all(topics.map((topic) => this.publish(topic, event)));
  }

  /**
   * Get subscriber count for topic
   */
  getSubscriberCount(topic: string): number {
    return this.topics.get(topic)?.size || 0;
  }

  /**
   * Get topics for subscriber
   */
  getSubscriberTopics(subscriberId: string): string[] {
    return Array.from(this.subscriptions.get(subscriberId) || []);
  }
}

// ============ Event Store ============

export class EventStore {
  private events: Event[] = [];
  private snapshots = new Map<string, { state: unknown; version: number }>();

  /**
   * Append event
   */
  async append(event: Event): Promise<void> {
    this.events.push(event);
  }

  /**
   * Get events for aggregate
   */
  async getEvents(aggregateId: string): Promise<Event[]> {
    return this.events.filter(
      (e) => (e.payload.aggregateId as string) === aggregateId
    );
  }

  /**
   * Get events by type
   */
  async getEventsByType(type: string): Promise<Event[]> {
    return this.events.filter((e) => e.type === type);
  }

  /**
   * Get events in time range
   */
  async getEventsInRange(
    start: Date,
    end: Date,
    filter?: EventFilter
  ): Promise<Event[]> {
    return this.events.filter((e) => {
      const timestamp = e.metadata.timestamp;
      if (timestamp < start || timestamp > end) return false;
      if (filter?.type && e.type !== filter.type) return false;
      if (filter?.source && e.metadata.source !== filter.source) return false;
      return true;
    });
  }

  /**
   * Get all events
   */
  async getAllEvents(): Promise<Event[]> {
    return [...this.events];
  }

  /**
   * Save snapshot
   */
  async saveSnapshot(aggregateId: string, state: unknown, version: number): Promise<void> {
    this.snapshots.set(aggregateId, { state, version });
  }

  /**
   * Get snapshot
   */
  async getSnapshot(aggregateId: string): Promise<{ state: unknown; version: number } | null> {
    return this.snapshots.get(aggregateId) || null;
  }

  /**
   * Replay events to rebuild state
   */
  async replay<T>(
    aggregateId: string,
    initialState: T,
    applier: (state: T, event: Event) => T
  ): Promise<T> {
    const events = await this.getEvents(aggregateId);
    return events.reduce((state, event) => applier(state, event), initialState);
  }

  /**
   * Clear store
   */
  async clear(): Promise<void> {
    this.events = [];
    this.snapshots.clear();
  }
}

// ============ Dead Letter Queue ============

export class DeadLetterQueue {
  private failedEvents: { event: Event; error: string; timestamp: Date; retryCount: number }[] = [];
  private maxRetries = 3;

  /**
   * Add failed event
   */
  async add(event: Event, error: string): Promise<void> {
    this.failedEvents.push({
      event,
      error,
      timestamp: new Date(),
      retryCount: 0,
    });
  }

  /**
   * Get failed events ready for retry
   */
  async getRetryable(): Promise<Event[]> {
    return this.failedEvents
      .filter((item) => item.retryCount < this.maxRetries)
      .map((item) => item.event);
  }

  /**
   * Mark event as retried
   */
  async markRetried(eventId: string): Promise<void> {
    const item = this.failedEvents.find((i) => i.event.id === eventId);
    if (item) {
      item.retryCount++;
    }
  }

  /**
   * Get permanently failed events
   */
  async getPermanentlyFailed(): Promise<typeof this.failedEvents> {
    return this.failedEvents.filter((item) => item.retryCount >= this.maxRetries);
  }

  /**
   * Remove event from DLQ
   */
  async remove(eventId: string): Promise<void> {
    this.failedEvents = this.failedEvents.filter((i) => i.event.id !== eventId);
  }

  /**
   * Clear DLQ
   */
  async clear(): Promise<void> {
    this.failedEvents = [];
  }

  /**
   * Get DLQ stats
   */
  async getStats(): Promise<{
    total: number;
    retryable: number;
    permanentlyFailed: number;
  }> {
    const total = this.failedEvents.length;
    const retryable = this.failedEvents.filter((i) => i.retryCount < this.maxRetries).length;
    const permanentlyFailed = total - retryable;
    return { total, retryable, permanentlyFailed };
  }
}

// ============ Event Router ============

export class EventRouter {
  private routes = new Map<string, EventHandler[]>();

  /**
   * Add route
   */
  route(pattern: string, handler: EventHandler): void {
    const handlers = this.routes.get(pattern) || [];
    handlers.push(handler);
    this.routes.set(pattern, handlers);
  }

  /**
   * Route event to handlers
   */
  async routeEvent(event: Event): Promise<void> {
    // Exact match
    const exactHandlers = this.routes.get(event.type);
    if (exactHandlers) {
      await Promise.all(exactHandlers.map((h) => h(event)));
    }

    // Pattern match (e.g., 'scan.*' matches 'scan.completed')
    for (const [pattern, handlers] of this.routes) {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        if (regex.test(event.type)) {
          await Promise.all(handlers.map((h) => h(event)));
        }
      }
    }
  }
}

// ============ Singleton Instances ============

export const eventBus = new EventBus();
export const pubSub = new PubSub();
export const eventStore = new EventStore();
export const deadLetterQueue = new DeadLetterQueue();
export const eventRouter = new EventRouter();

// ============ Event Factory ============

export function createEvent(
  type: string,
  payload: Record<string, unknown>,
  source: string,
  options?: {
    correlationId?: string;
    causationId?: string;
    version?: number;
  }
): Event {
  return {
    id: crypto.randomUUID(),
    type,
    payload,
    metadata: {
      timestamp: new Date(),
      source,
      version: options?.version || 1,
      correlationId: options?.correlationId,
      causationId: options?.causationId,
    },
  };
}
