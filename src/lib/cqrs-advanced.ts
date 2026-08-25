/**
 * Advanced CQRS (Command Query Responsibility Segregation)
 * 
 * Separates read and write models with:
 * - Command Bus (write operations)
 * - Query Bus (read operations)
 * - Projections (read model materialization)
 * - Snapshots (optimization)
 * - Event Store (audit trail)
 * 
 * Features:
 * - Type-safe commands and queries
 * - Async projection updates
 * - Snapshot optimization for large aggregates
 * - Event versioning and upcasting
 * 
 * Usage:
 *   import { CommandBus, QueryBus } from '@/lib/cqrs-advanced';
 *   
 *   // Execute command
 *   await commandBus.execute(new CreateProjectCommand({
 *     name: 'My Project',
 *     url: 'https://example.com'
 *   }));
 *   
 *   // Execute query
 *   const projects = await queryBus.execute(new GetProjectsQuery(userId));
 */

// ============ Commands ============

export interface Command {
  type: string;
  payload: Record<string, unknown>;
  timestamp: Date;
  userId?: string;
}

export abstract class BaseCommand implements Command {
  abstract type: string;
  payload: Record<string, unknown>;
  timestamp: Date;
  userId?: string;

  constructor(payload: Record<string, unknown>, userId?: string) {
    this.payload = payload;
    this.timestamp = new Date();
    this.userId = userId;
  }
}

export class CreateProjectCommand extends BaseCommand {
  type = 'CreateProject' as const;
}

export class UpdateProjectCommand extends BaseCommand {
  type = 'UpdateProject' as const;
}

export class DeleteProjectCommand extends BaseCommand {
  type = 'DeleteProject' as const;
}

export class CreateScanCommand extends BaseCommand {
  type = 'CreateScan' as const;
}

export class UpdateViolationCommand extends BaseCommand {
  type = 'UpdateViolation' as const;
}

// ============ Command Handlers ============

export interface CommandHandler<T extends Command> {
  handle(command: T): Promise<Record<string, unknown>>;
}

export class CreateProjectHandler implements CommandHandler<CreateProjectCommand> {
  async handle(command: CreateProjectCommand): Promise<Record<string, unknown>> {
    const { name, url, ownerId, organizationId } = command.payload;

    // Validate
    if (!name || !url) {
      throw new Error('Name and URL are required');
    }

    // Create project (in production, save to database)
    const project = {
      id: crypto.randomUUID(),
      name,
      url,
      ownerId,
      organizationId,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return project;
  }
}

export class UpdateProjectHandler implements CommandHandler<UpdateProjectCommand> {
  async handle(command: UpdateProjectCommand): Promise<Record<string, unknown>> {
    const { id, ...updates } = command.payload;

    // Update project (in production, save to database)
    return {
      id,
      ...updates,
      updatedAt: new Date(),
    };
  }
}

export class DeleteProjectHandler implements CommandHandler<DeleteProjectCommand> {
  async handle(command: DeleteProjectCommand): Promise<Record<string, unknown>> {
    const { id } = command.payload;

    // Delete project (in production, soft delete)
    return { deleted: true, id };
  }
}

// ============ Queries ============

export interface Query {
  type: string;
  filters: Record<string, unknown>;
  pagination?: {
    page: number;
    pageSize: number;
  };
}

export abstract class BaseQuery implements Query {
  abstract type: string;
  filters: Record<string, unknown>;
  pagination?: {
    page: number;
    pageSize: number;
  };

  constructor(filters: Record<string, unknown>, pagination?: { page: number; pageSize: number }) {
    this.filters = filters;
    this.pagination = pagination;
  }
}

export class GetProjectsQuery extends BaseQuery {
  type = 'GetProjects' as const;
}

export class GetProjectQuery extends BaseQuery {
  type = 'GetProject' as const;
}

export class GetScansQuery extends BaseQuery {
  type = 'GetScans' as const;
}

export class GetViolationsQuery extends BaseQuery {
  type = 'GetViolations' as const;
}

// ============ Query Handlers ============

export interface QueryHandler<T extends Query> {
  handle(query: T): Promise<Record<string, unknown> | Record<string, unknown>[]>;
}

export class GetProjectsHandler implements QueryHandler<GetProjectsQuery> {
  async handle(query: GetProjectsQuery): Promise<Record<string, unknown>[]> {
    // In production, query read database
    return [];
  }
}

export class GetProjectHandler implements QueryHandler<GetProjectQuery> {
  async handle(query: GetProjectQuery): Promise<Record<string, unknown> | Record<string, unknown>[]> {
    const { id } = query.filters;
    // In production, query read database
    return { id } as Record<string, unknown>;
  }
}

// ============ Command Bus ============

export class CommandBus {
  private handlers = new Map<string, CommandHandler<Command>>();
  private middleware: ((command: Command) => Promise<Command | null>)[] = [];

  /**
   * Register command handler
   */
  register<T extends Command>(
    commandType: string,
    handler: CommandHandler<T>
  ): void {
    this.handlers.set(commandType, handler as CommandHandler<Command>);
  }

  /**
   * Add middleware
   */
  use(middleware: (command: Command) => Promise<Command | null>): void {
    this.middleware.push(middleware);
  }

  /**
   * Execute command
   */
  async execute<T extends Command>(command: T): Promise<Record<string, unknown>> {
    // Apply middleware
    let processedCommand: Command | null = command;
    for (const mw of this.middleware) {
      if (!processedCommand) throw new Error('Command rejected by middleware');
      processedCommand = await mw(processedCommand);
    }

    if (!processedCommand) throw new Error('Command rejected by middleware');

    // Get handler
    const handler = this.handlers.get(processedCommand.type);
    if (!handler) {
      throw new Error(`No handler registered for command: ${processedCommand.type}`);
    }

    // Execute handler
    return handler.handle(processedCommand);
  }
}

// ============ Query Bus ============

export class QueryBus {
  private handlers = new Map<string, QueryHandler<Query>>();
  private middleware: ((query: Query) => Promise<Query | null>)[] = [];

  /**
   * Register query handler
   */
  register<T extends Query>(
    queryType: string,
    handler: QueryHandler<T>
  ): void {
    this.handlers.set(queryType, handler as QueryHandler<Query>);
  }

  /**
   * Add middleware
   */
  use(middleware: (query: Query) => Promise<Query | null>): void {
    this.middleware.push(middleware);
  }

  /**
   * Execute query
   */
  async execute<T extends Query>(
    query: T
  ): Promise<Record<string, unknown> | Record<string, unknown>[]> {
    // Apply middleware
    let processedQuery: Query | null = query;
    for (const mw of this.middleware) {
      if (!processedQuery) throw new Error('Query rejected by middleware');
      processedQuery = await mw(processedQuery);
    }

    if (!processedQuery) throw new Error('Query rejected by middleware');

    // Get handler
    const handler = this.handlers.get(processedQuery.type);
    if (!handler) {
      throw new Error(`No handler registered for query: ${processedQuery.type}`);
    }

    // Execute handler
    return handler.handle(processedQuery);
  }
}

// ============ Projections ============

export interface Projection {
  name: string;
  version: number;
  lastEventId: string;
}

export class Projector {
  private projections = new Map<string, Projection>();
  private handlers = new Map<string, (event: Record<string, unknown>) => Promise<void>>();

  /**
   * Register projection handler
   */
  on(eventType: string, handler: (event: Record<string, unknown>) => Promise<void>): void {
    this.handlers.set(eventType, handler);
  }

  /**
   * Project event
   */
  async project(event: Record<string, unknown>): Promise<void> {
    const handler = this.handlers.get(event.type as string);
    if (handler) {
      await handler(event);
    }

    // Update projection metadata
    const projectionName = (event.type as string).split('.')[0];
    const existing = this.projections.get(projectionName) || {
      name: projectionName,
      version: 0,
      lastEventId: '',
    };

    this.projections.set(projectionName, {
      ...existing,
      version: existing.version + 1,
      lastEventId: event.id as string,
    });
  }

  /**
   * Get projection status
   */
  getStatus(): Projection[] {
    return Array.from(this.projections.values());
  }

  /**
   * Reset projection
   */
  reset(name: string): void {
    this.projections.set(name, {
      name,
      version: 0,
      lastEventId: '',
    });
  }
}

// ============ Snapshots ============

export class SnapshotStore {
  private snapshots = new Map<string, { state: Record<string, unknown>; version: number }>();
  private snapshotFrequency = 100; // Create snapshot every 100 events

  /**
   * Should create snapshot
   */
  shouldSnapshot(aggregateId: string, eventVersion: number): boolean {
    const snapshot = this.snapshots.get(aggregateId);
    if (!snapshot) return true;
    return eventVersion - snapshot.version >= this.snapshotFrequency;
  }

  /**
   * Save snapshot
   */
  save(aggregateId: string, state: Record<string, unknown>, version: number): void {
    this.snapshots.set(aggregateId, { state, version });
  }

  /**
   * Get snapshot
   */
  get(aggregateId: string): { state: Record<string, unknown>; version: number } | null {
    return this.snapshots.get(aggregateId) || null;
  }

  /**
   * Clear snapshots
   */
  clear(): void {
    this.snapshots.clear();
  }
}

// ============ Event Upcaster ============

export class EventUpcaster {
  private upcasters = new Map<string, (event: Record<string, unknown>) => Record<string, unknown>>();

  /**
   * Register upcaster for event version
   */
  register(
    eventType: string,
    fromVersion: number,
    upcaster: (event: Record<string, unknown>) => Record<string, unknown>
  ): void {
    const key = `${eventType}:${fromVersion}`;
    this.upcasters.set(key, upcaster);
  }

  /**
   * Upcast event to latest version
   */
  upcast(event: Record<string, unknown>): Record<string, unknown> {
    let current = { ...event };
    let version = (current.version as number) || 1;

    while (true) {
      const key = `${current.type}:${version}`;
      const upcaster = this.upcasters.get(key);
      if (!upcaster) break;

      current = upcaster(current);
      version++;
      current.version = version;
    }

    return current;
  }
}

// ============ Singleton Instances ============

export const commandBus = new CommandBus();
export const queryBus = new QueryBus();
export const projector = new Projector();
export const snapshotStore = new SnapshotStore();
export const eventUpcaster = new EventUpcaster();

// Register default handlers
commandBus.register('CreateProject', new CreateProjectHandler());
commandBus.register('UpdateProject', new UpdateProjectHandler());
commandBus.register('DeleteProject', new DeleteProjectHandler());
queryBus.register('GetProjects', new GetProjectsHandler());
queryBus.register('GetProject', new GetProjectHandler());
