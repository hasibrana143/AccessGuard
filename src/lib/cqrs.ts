/**
 * CQRS Pattern (Command Query Responsibility Segregation)
 * 
 * Separates read and write operations for better performance and scalability.
 * 
 * Features:
 * - Command bus for write operations
 * - Query bus for read operations
 * - Separate read/write models
 * - Event integration
 * 
 * Usage:
 *   import { commandBus, queryBus } from '@/lib/cqrs';
 *   
 *   // Register handlers
 *   commandBus.register('CreateProject', createProjectHandler);
 *   queryBus.register('GetProject', getProjectHandler);
 *   
 *   // Execute
 *   await commandBus.execute('CreateProject', { name: 'My Project' });
 *   const project = await queryBus.execute('GetProject', { id: '123' });
 */

import { logger } from './error-logger';
import { metrics, metricNames } from './metrics';
import { eventStore, EventTypes } from './event-sourcing';

export interface Command {
  type: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  userId?: string;
  correlationId?: string;
}

export interface Query {
  type: string;
  params: Record<string, unknown>;
  options?: {
    cache?: boolean;
    cacheTtl?: number;
    fields?: string[];
  };
}

export interface CommandResult {
  success: boolean;
  data?: unknown;
  error?: string;
  events?: Array<{
    type: string;
    data: Record<string, unknown>;
  }>;
}

export interface QueryResult<T = unknown> {
  data: T;
  cached: boolean;
  timestamp: Date;
}

export type CommandHandler = (command: Command) => Promise<CommandResult>;
export type QueryHandler<T = unknown> = (query: Query) => Promise<T>;

/**
 * Command Bus
 */
class CommandBus {
  private handlers = new Map<string, CommandHandler>();
  private middleware: Array<(command: Command) => Promise<Command>> = [];

  /**
   * Register command handler
   */
  register(type: string, handler: CommandHandler): void {
    this.handlers.set(type, handler);
    logger.info({ type }, 'Command handler registered');
  }

  /**
   * Add middleware
   */
  use(middleware: (command: Command) => Promise<Command>): void {
    this.middleware.push(middleware);
  }

  /**
   * Execute command
   */
  async execute(
    type: string,
    payload: Record<string, unknown>,
    options?: {
      userId?: string;
      correlationId?: string;
    }
  ): Promise<CommandResult> {
    const handler = this.handlers.get(type);
    if (!handler) {
      return {
        success: false,
        error: `No handler registered for command: ${type}`,
      };
    }

    // Create command
    let command: Command = {
      type,
      payload,
      timestamp: new Date(),
      userId: options?.userId,
      correlationId: options?.correlationId,
    };

    // Apply middleware
    for (const mw of this.middleware) {
      command = await mw(command);
    }

    const startTime = performance.now();

    try {
      // Execute handler
      const result = await handler(command);
      const duration = performance.now() - startTime;

      // Record metrics
      metrics.increment(metricNames.COMMANDS_EXECUTED, 1, { type });
      metrics.observe(`${metricNames.COMMAND_DURATION}.duration`, duration, { type });

      if (!result.success) {
        metrics.increment(metricNames.COMMANDS_FAILED, 1, { type });
      }

      // Store events if any
      if (result.events && result.events.length > 0) {
        for (const event of result.events) {
          await eventStore.append({
            aggregateId: payload.id as string || 'unknown',
            aggregateType: type.replace(/([A-Z])/g, '$1').slice(0, -1),
            eventType: event.type,
            data: event.data,
            metadata: {
              commandType: type,
              userId: options?.userId,
            },
          });
        }
      }

      logger.info({
        type,
        success: result.success,
        duration,
      }, 'Command executed');

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      metrics.increment(metricNames.COMMANDS_FAILED, 1, { type });

      logger.error({
        type,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      }, 'Command execution failed');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Query Bus
 */
class QueryBus {
  private handlers = new Map<string, QueryHandler>();
  private cache = new Map<string, { data: unknown; expiry: number }>();
  private middleware: Array<(query: Query) => Promise<Query>> = [];

  /**
   * Register query handler
   */
  register<T>(type: string, handler: QueryHandler<T>): void {
    this.handlers.set(type, handler as QueryHandler);
    logger.info({ type }, 'Query handler registered');
  }

  /**
   * Add middleware
   */
  use(middleware: (query: Query) => Promise<Query>): void {
    this.middleware.push(middleware);
  }

  /**
   * Execute query
   */
  async execute<T = unknown>(
    type: string,
    params: Record<string, unknown>,
    options?: {
      cache?: boolean;
      cacheTtl?: number;
    }
  ): Promise<QueryResult<T>> {
    const handler = this.handlers.get(type);
    if (!handler) {
      throw new Error(`No handler registered for query: ${type}`);
    }

    // Create query
    let query: Query = {
      type,
      params,
      options,
    };

    // Apply middleware
    for (const mw of this.middleware) {
      query = await mw(query);
    }

    // Check cache
    const cacheKey = `${type}:${JSON.stringify(params)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expiry > Date.now()) {
      metrics.increment(metricNames.QUERY_CACHE_HITS, 1, { type });
      return {
        data: cached.data as T,
        cached: true,
        timestamp: new Date(cached.expiry),
      };
    }

    const startTime = performance.now();

    try {
      const data = await handler(query);
      const duration = performance.now() - startTime;

      // Record metrics
      metrics.increment(metricNames.QUERIES_EXECUTED, 1, { type });
      metrics.observe(`${metricNames.QUERY_DURATION}.duration`, duration, { type });

      // Cache result if enabled
      if (options?.cache) {
        const ttl = options.cacheTtl || 60000; // 1 minute default
        this.cache.set(cacheKey, {
          data,
          expiry: Date.now() + ttl,
        });
      }

      logger.debug({
        type,
        duration,
        cached: false,
      }, 'Query executed');

      return {
        data: data as T,
        cached: false,
        timestamp: new Date(),
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      metrics.increment(metricNames.QUERIES_FAILED, 1, { type });

      logger.error({
        type,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      }, 'Query execution failed');

      throw error;
    }
  }

  /**
   * Invalidate cache
   */
  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// Singletons
export const commandBus = new CommandBus();
export const queryBus = new QueryBus();

/**
 * Command/Query types for AccessGuard
 */
export const CommandTypes = {
  CREATE_PROJECT: 'CreateProject',
  UPDATE_PROJECT: 'UpdateProject',
  DELETE_PROJECT: 'DeleteProject',
  START_SCAN: 'StartScan',
  COMPLETE_SCAN: 'CompleteScan',
  FIX_VIOLATION: 'FixViolation',
  IGNORE_VIOLATION: 'IgnoreViolation',
  GENERATE_REPORT: 'GenerateReport',
  SHARE_REPORT: 'ShareReport',
} as const;

export const QueryTypes = {
  GET_PROJECT: 'GetProject',
  LIST_PROJECTS: 'ListProjects',
  GET_SCAN: 'GetScan',
  LIST_SCANS: 'ListScans',
  GET_VIOLATION: 'GetViolation',
  LIST_VIOLATIONS: 'ListViolations',
  GET_REPORT: 'GetReport',
  LIST_REPORTS: 'ListReports',
  GET_DASHBOARD_STATS: 'GetDashboardStats',
} as const;
