/**
 * Domain-Driven Design (DDD) Patterns
 * 
 * Implements DDD building blocks:
 * - Value Objects (immutable, equality by value)
 * - Entities (identity-based, mutable)
 * - Aggregates (consistency boundaries)
 * - Domain Events
 * - Repositories (persistence abstraction)
 * 
 * Usage:
 *   import { ValueObject, Entity, AggregateRoot } from '@/lib/ddd';
 *   
 *   class Email extends ValueObject<{ value: string }> {
 *     get value() { return this.props.value; }
 *     
 *     static create(email: string): Email {
 *       if (!email.includes('@')) throw new Error('Invalid email');
 *       return new Email({ value: email });
 *     }
 *   }
 */

// ============ Value Objects ============

export abstract class ValueObject<T> {
  protected readonly props: T;

  constructor(props: T) {
    this.props = Object.freeze(props);
  }

  equals(other: ValueObject<T>): boolean {
    if (!other) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}

// ============ Entities ============

export abstract class Entity<T> {
  protected readonly _id: string;
  protected props: T;

  constructor(id: string, props: T) {
    this._id = id;
    this.props = props;
  }

  get id(): string {
    return this._id;
  }

  equals(other: Entity<T>): boolean {
    if (!other) return false;
    return this._id === other._id;
  }
}

// ============ Aggregate Root ============

export abstract class AggregateRoot<T> extends Entity<T> {
  private _domainEvents: DomainEvent[] = [];
  private _version = 0;

  get version(): number {
    return this._version;
  }

  protected incrementVersion(): void {
    this._version++;
  }

  get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
    this._version++;
  }

  clearDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }

  /**
   * Validate aggregate invariants
   */
  abstract validate(): void;
}

// ============ Domain Events ============

export interface DomainEvent {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  payload: Record<string, unknown>;
  timestamp: Date;
  version: number;
}

export class DomainEventPublisher {
  private handlers = new Map<string, ((event: DomainEvent) => Promise<void>)[]>();

  /**
   * Subscribe to domain events
   */
  subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void {
    const existing = this.handlers.get(eventType) || [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
  }

  /**
   * Publish domain event
   */
  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType) || [];
    await Promise.all(handlers.map((handler) => handler(event)));
  }

  /**
   * Publish multiple events
   */
  async publishAll(events: DomainEvent[]): Promise<void> {
    await Promise.all(events.map((event) => this.publish(event)));
  }
}

// Singleton publisher
export const eventPublisher = new DomainEventPublisher();

// ============ Repository Interface ============

export interface Repository<T extends AggregateRoot<unknown>> {
  findById(id: string): Promise<T | null>;
  save(aggregate: T): Promise<void>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

// ============ Specifications ============

export abstract class Specification<T> {
  abstract isSatisfiedBy(candidate: T): boolean;

  and(other: Specification<T>): AndSpecification<T> {
    return new AndSpecification(this, other);
  }

  or(other: Specification<T>): OrSpecification<T> {
    return new OrSpecification(this, other);
  }

  not(): NotSpecification<T> {
    return new NotSpecification(this);
  }
}

export class AndSpecification<T> extends Specification<T> {
  constructor(
    private left: Specification<T>,
    private right: Specification<T>
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
  }
}

export class OrSpecification<T> extends Specification<T> {
  constructor(
    private left: Specification<T>,
    private right: Specification<T>
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
  }
}

export class NotSpecification<T> extends Specification<T> {
  constructor(private spec: Specification<T>) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return !this.spec.isSatisfiedBy(candidate);
  }
}

// ============ Unit of Work ============

export interface UnitOfWork {
  start(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  getRepository<T extends AggregateRoot<unknown>>(
    aggregateType: new (...args: unknown[]) => T
  ): Repository<T>;
}

// ============ Example: Project Aggregate ============

export interface ProjectProps {
  name: string;
  url: string;
  ownerId: string;
  organizationId: string;
  status: 'active' | 'inactive' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export class Project extends AggregateRoot<ProjectProps> {
  get name(): string {
    return this.props.name;
  }

  get url(): string {
    return this.props.url;
  }

  get status(): string {
    return this.props.status;
  }

  static create(props: {
    id: string;
    name: string;
    url: string;
    ownerId: string;
    organizationId: string;
  }): Project {
    const project = new Project(props.id, {
      ...props,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    project.validate();
    project.addDomainEvent({
      id: crypto.randomUUID(),
      aggregateId: props.id,
      aggregateType: 'Project',
      eventType: 'ProjectCreated',
      payload: { name: props.name, url: props.url },
      timestamp: new Date(),
      version: 1,
    });

    return project;
  }

  archive(): void {
    this.props.status = 'archived';
    this.props.updatedAt = new Date();
    this.validate();

    this.addDomainEvent({
      id: crypto.randomUUID(),
      aggregateId: this._id,
      aggregateType: 'Project',
      eventType: 'ProjectArchived',
      payload: {},
      timestamp: new Date(),
      version: this.version,
    });
  }

  validate(): void {
    if (!this.props.name || this.props.name.length < 1) {
      throw new Error('Project name is required');
    }
    if (!this.props.url) {
      throw new Error('Project URL is required');
    }
  }
}

// ============ Example: Violation Aggregate ============

export interface ViolationProps {
  projectId: string;
  ruleId: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  remediation?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'dismissed';
  createdAt: Date;
  updatedAt: Date;
}

export class Violation extends AggregateRoot<ViolationProps> {
  get severity(): string {
    return this.props.severity;
  }

  get status(): string {
    return this.props.status;
  }

  static create(props: {
    id: string;
    projectId: string;
    ruleId: string;
    severity: ViolationProps['severity'];
    description: string;
    remediation?: string;
  }): Violation {
    const violation = new Violation(props.id, {
      ...props,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    violation.validate();
    violation.addDomainEvent({
      id: crypto.randomUUID(),
      aggregateId: props.id,
      aggregateType: 'Violation',
      eventType: 'ViolationCreated',
      payload: { projectId: props.projectId, ruleId: props.ruleId },
      timestamp: new Date(),
      version: 1,
    });

    return violation;
  }

  resolve(): void {
    this.props.status = 'resolved';
    this.props.updatedAt = new Date();

    this.addDomainEvent({
      id: crypto.randomUUID(),
      aggregateId: this._id,
      aggregateType: 'Violation',
      eventType: 'ViolationResolved',
      payload: {},
      timestamp: new Date(),
      version: this.version,
    });
  }

  validate(): void {
    if (!this.props.projectId) {
      throw new Error('Project ID is required');
    }
    if (!this.props.ruleId) {
      throw new Error('Rule ID is required');
    }
  }
}
