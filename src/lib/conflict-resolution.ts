/**
 * Conflict Resolution Patterns
 * 
 * Implements conflict resolution for distributed systems:
 * - Last-Writer-Wins (LWW)
 * - CRDTs (Conflict-free Replicated Data Types)
 * - Version Vectors
 * - Merge Strategies
 * 
 * Features:
 * - Automatic conflict detection
 * - Configurable merge strategies
 * - Version tracking
 * - Vector clocks for causality
 * 
 * Usage:
 *   import { LWWRegister, GCounter, ORSet } from '@/lib/conflict-resolution';
 *   
 *   // LWW Register
 *   const reg = new LWWRegister('value1', Date.now());
 *   reg.merge(new LWWRegister('value2', Date.now() + 1000));
 *   console.log(reg.value); // 'value2'
 *   
 *   // G-Counter
 *   const counter = new GCounter();
 *   counter.increment('node1');
 *   counter.increment('node2');
 *   console.log(counter.value); // 2
 */

// ============ Version Vector ============

export class VersionVector {
  private vector: Map<string, number>;

  constructor(vector?: Map<string, number>) {
    this.vector = vector ? new Map(vector) : new Map();
  }

  /**
   * Increment version for node
   */
  increment(nodeId: string): void {
    const current = this.vector.get(nodeId) || 0;
    this.vector.set(nodeId, current + 1);
  }

  /**
   * Get version for node
   */
  get(nodeId: string): number {
    return this.vector.get(nodeId) || 0;
  }

  /**
   * Check if this vector dominates another
   */
  dominates(other: VersionVector): boolean {
    let dominated = false;
    for (const [node, version] of this.vector) {
      const otherVersion = other.get(node);
      if (version < otherVersion) return false;
      if (version > otherVersion) dominated = true;
    }
    // Check if other has nodes we don't
    for (const [node] of other.vector) {
      if (!this.vector.has(node)) return false;
    }
    return dominated;
  }

  /**
   * Check if vectors are concurrent (neither dominates)
   */
  concurrentWith(other: VersionVector): boolean {
    return !this.dominates(other) && !other.dominates(this);
  }

  /**
   * Merge with another vector (take max of each)
   */
  merge(other: VersionVector): void {
    for (const [node, version] of other.vector) {
      const current = this.vector.get(node) || 0;
      this.vector.set(node, Math.max(current, version));
    }
  }

  /**
   * Convert to plain object
   */
  toJSON(): Record<string, number> {
    return Object.fromEntries(this.vector);
  }

  /**
   * Create from plain object
   */
  static fromJSON(json: Record<string, number>): VersionVector {
    return new VersionVector(new Map(Object.entries(json)));
  }
}

// ============ LWW Register ============

export class LWWRegister<T> {
  private _value: T;
  private _timestamp: number;
  private _nodeId: string;

  constructor(value: T, timestamp: number, nodeId?: string) {
    this._value = value;
    this._timestamp = timestamp;
    this._nodeId = nodeId || 'default';
  }

  get value(): T {
    return this._value;
  }

  get timestamp(): number {
    return this._timestamp;
  }

  get nodeId(): string {
    return this._nodeId;
  }

  /**
   * Merge with another register (last writer wins)
   */
  merge(other: LWWRegister<T>): void {
    if (
      other._timestamp > this._timestamp ||
      (other._timestamp === this._timestamp && other._nodeId > this._nodeId)
    ) {
      this._value = other._value;
      this._timestamp = other._timestamp;
      this._nodeId = other._nodeId;
    }
  }

  /**
   * Update value
   */
  set(value: T, timestamp?: number, nodeId?: string): void {
    this._value = value;
    this._timestamp = timestamp || Date.now();
    this._nodeId = nodeId || this._nodeId;
  }
}

// ============ G-Counter (Grow-only Counter) ============

export class GCounter {
  private counts: Map<string, number>;

  constructor(counts?: Map<string, number>) {
    this.counts = counts ? new Map(counts) : new Map();
  }

  /**
   * Increment counter for node
   */
  increment(nodeId: string, amount = 1): void {
    const current = this.counts.get(nodeId) || 0;
    this.counts.set(nodeId, current + amount);
  }

  /**
   * Get total count
   */
  get value(): number {
    let total = 0;
    for (const count of this.counts.values()) {
      total += count;
    }
    return total;
  }

  /**
   * Get count for specific node
   */
  getCount(nodeId: string): number {
    return this.counts.get(nodeId) || 0;
  }

  /**
   * Merge with another counter
   */
  merge(other: GCounter): void {
    for (const [node, count] of other.counts) {
      const current = this.counts.get(node) || 0;
      this.counts.set(node, Math.max(current, count));
    }
  }

  /**
   * Check if dominated by another
   */
  dominatedBy(other: GCounter): boolean {
    for (const [node, count] of this.counts) {
      if (count > (other.counts.get(node) || 0)) return false;
    }
    return true;
  }
}

// ============ PN-Counter (Positive-Negative Counter) ============

export class PNCounter {
  private positives: GCounter;
  private negatives: GCounter;

  constructor() {
    this.positives = new GCounter();
    this.negatives = new GCounter();
  }

  /**
   * Increment counter
   */
  increment(nodeId: string, amount = 1): void {
    this.positives.increment(nodeId, amount);
  }

  /**
   * Decrement counter
   */
  decrement(nodeId: string, amount = 1): void {
    this.negatives.increment(nodeId, amount);
  }

  /**
   * Get current value
   */
  get value(): number {
    return this.positives.value - this.negatives.value;
  }

  /**
   * Merge with another counter
   */
  merge(other: PNCounter): void {
    this.positives.merge(other.positives);
    this.negatives.merge(other.negatives);
  }
}

// ============ OR-Set (Observed-Remove Set) ============

export class ORSet<T> {
  private elements: Map<T, Set<string>>; // element -> set of tags
  private tagCounter: number;

  constructor() {
    this.elements = new Map();
    this.tagCounter = 0;
  }

  /**
   * Add element
   */
  add(element: T, nodeId: string): void {
    const tags = this.elements.get(element) || new Set();
    tags.add(`${nodeId}:${this.tagCounter++}`);
    this.elements.set(element, tags);
  }

  /**
   * Remove element
   */
  remove(element: T): void {
    this.elements.delete(element);
  }

  /**
   * Check if element exists
   */
  has(element: T): boolean {
    const tags = this.elements.get(element);
    return tags !== undefined && tags.size > 0;
  }

  /**
   * Get all elements
   */
  values(): T[] {
    return Array.from(this.elements.keys()).filter((e) => this.has(e));
  }

  /**
   * Get size
   */
  get size(): number {
    return this.values().length;
  }

  /**
   * Merge with another set
   */
  merge(other: ORSet<T>): void {
    for (const [element, otherTags] of other.elements) {
      const existingTags = this.elements.get(element) || new Set();
      for (const tag of otherTags) {
        existingTags.add(tag);
      }
      if (existingTags.size > 0) {
        this.elements.set(element, existingTags);
      }
    }
  }
}

// ============ LWW-Element-Set ============

export class LWWElementSet<T> {
  private additions: Map<T, number>;
  private removals: Map<T, number>;

  constructor() {
    this.additions = new Map();
    this.removals = new Map();
  }

  /**
   * Add element
   */
  add(element: T, timestamp?: number): void {
    this.additions.set(element, timestamp || Date.now());
  }

  /**
   * Remove element
   */
  remove(element: T, timestamp?: number): void {
    this.removals.set(element, timestamp || Date.now());
  }

  /**
   * Check if element exists
   */
  has(element: T): boolean {
    const addTime = this.additions.get(element) || 0;
    const removeTime = this.removals.get(element) || 0;
    return addTime > removeTime;
  }

  /**
   * Get all elements
   */
  values(): T[] {
    return Array.from(this.additions.keys()).filter((e) => this.has(e));
  }

  /**
   * Merge with another set
   */
  merge(other: LWWElementSet<T>): void {
    for (const [element, timestamp] of other.additions) {
      const existing = this.additions.get(element) || 0;
      if (timestamp > existing) {
        this.additions.set(element, timestamp);
      }
    }
    for (const [element, timestamp] of other.removals) {
      const existing = this.removals.get(element) || 0;
      if (timestamp > existing) {
        this.removals.set(element, timestamp);
      }
    }
  }
}

// ============ Conflict Resolver ============

export class ConflictResolver {
  /**
   * Resolve conflict using configured strategy
   */
  static resolve<T>(
    local: T,
    remote: T,
    strategy: 'lww' | 'merge' | 'custom',
    customResolver?: (local: T, remote: T) => T
  ): T {
    switch (strategy) {
      case 'lww':
        // Last-Writer-Wins: remote wins (assumed newer)
        return remote;

      case 'merge':
        // Deep merge
        if (typeof local === 'object' && typeof remote === 'object') {
          return { ...local, ...remote } as T;
        }
        return remote;

      case 'custom':
        if (!customResolver) {
          throw new Error('Custom resolver function required');
        }
        return customResolver(local, remote);

      default:
        return remote;
    }
  }
}

// ============ Vector Clock ============

export class VectorClock {
  private clocks: Map<string, number>;

  constructor(clocks?: Map<string, number>) {
    this.clocks = clocks ? new Map(clocks) : new Map();
  }

  /**
   * Increment clock for node
   */
  increment(nodeId: string): void {
    const current = this.clocks.get(nodeId) || 0;
    this.clocks.set(nodeId, current + 1);
  }

  /**
   * Update clock from received message
   */
  update(received: VectorClock, nodeId: string): void {
    // Merge clocks
    for (const [node, time] of received.clocks) {
      const current = this.clocks.get(node) || 0;
      this.clocks.set(node, Math.max(current, time));
    }
    // Increment own clock
    this.increment(nodeId);
  }

  /**
   * Check if happened-before
   */
  happenedBefore(other: VectorClock): boolean {
    let dominated = false;
    for (const [node, time] of this.clocks) {
      const otherTime = other.clocks.get(node) || 0;
      if (time > otherTime) return false;
      if (time < otherTime) dominated = true;
    }
    return dominated;
  }

  /**
   * Check if concurrent
   */
  concurrentWith(other: VectorClock): boolean {
    return !this.happenedBefore(other) && !other.happenedBefore(this);
  }

  /**
   * Merge with another clock
   */
  merge(other: VectorClock): void {
    for (const [node, time] of other.clocks) {
      const current = this.clocks.get(node) || 0;
      this.clocks.set(node, Math.max(current, time));
    }
  }

  /**
   * Convert to JSON
   */
  toJSON(): Record<string, number> {
    return Object.fromEntries(this.clocks);
  }

  /**
   * Create from JSON
   */
  static fromJSON(json: Record<string, number>): VectorClock {
    return new VectorClock(new Map(Object.entries(json)));
  }
}
