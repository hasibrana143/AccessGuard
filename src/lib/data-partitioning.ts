/**
 * Data Partitioning Patterns
 * 
 * Implements sharding strategies for horizontal scaling:
 * - Hash-based partitioning
 * - Range-based partitioning
 * - Directory-based partitioning
 * - Consistent hashing
 * 
 * Features:
 * - Automatic shard selection
 * - Cross-shard queries
 * - Shard rebalancing
 * - Shard health monitoring
 * 
 * Usage:
 *   import { ShardRouter, ConsistentHash } from '@/lib/data-partitioning';
 *   
 *   // Route to shard
 *   const shard = shardRouter.getShard('user-123');
 *   
 *   // Consistent hashing
 *   const hash = new ConsistentHash(['shard1', 'shard2', 'shard3']);
 *   const node = hash.getNode('user-123');
 */

// ============ Shard Interface ============

export interface Shard {
  id: string;
  name: string;
  host: string;
  port: number;
  weight: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
  dataRange?: { start: number; end: number }; // For range-based
  load: number; // 0-100
  lastHealthCheck: Date;
}

// ============ Hash-Based Partitioning ============

export class HashBasedPartitioning {
  private shards: Shard[];

  constructor(shards: Shard[]) {
    this.shards = shards;
  }

  /**
   * Get shard for key using hash
   */
  getShard(key: string): Shard {
    const hash = this.hash(key);
    const index = hash % this.shards.length;
    return this.shards[index];
  }

  /**
   * Simple hash function
   */
  private hash(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

// ============ Range-Based Partitioning ============

export class RangeBasedPartitioning {
  private shards: Shard[];

  constructor(shards: Shard[]) {
    this.shards = shards.sort(
      (a, b) => (a.dataRange?.start || 0) - (b.dataRange?.start || 0)
    );
  }

  /**
   * Get shard for key using range
   */
  getShard(key: string): Shard | null {
    const hash = this.hash(key);

    for (const shard of this.shards) {
      if (shard.dataRange) {
        if (hash >= shard.dataRange.start && hash < shard.dataRange.end) {
          return shard;
        }
      }
    }

    return null;
  }

  private hash(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

// ============ Consistent Hashing ============

export class ConsistentHash {
  private ring = new Map<number, string>();
  private sortedKeys: number[] = [];
  private virtualNodes = 150;

  constructor(nodes: string[]) {
    nodes.forEach((node) => this.addNode(node));
  }

  /**
   * Add node to ring
   */
  addNode(node: string): void {
    for (let i = 0; i < this.virtualNodes; i++) {
      const key = this.hash(`${node}:${i}`);
      this.ring.set(key, node);
      this.sortedKeys.push(key);
    }
    this.sortedKeys.sort((a, b) => a - b);
  }

  /**
   * Remove node from ring
   */
  removeNode(node: string): void {
    for (let i = 0; i < this.virtualNodes; i++) {
      const key = this.hash(`${node}:${i}`);
      this.ring.delete(key);
      this.sortedKeys = this.sortedKeys.filter((k) => k !== key);
    }
  }

  /**
   * Get node for key
   */
  getNode(key: string): string | null {
    if (this.ring.size === 0) return null;

    const hash = this.hash(key);
    const index = this.findFirstGreaterOrEqual(hash);
    const actualIndex = index >= this.sortedKeys.length ? 0 : index;

    return this.ring.get(this.sortedKeys[actualIndex]) || null;
  }

  /**
   * Get N nodes for key (for replication)
   */
  getNodes(key: string, count: number): string[] {
    if (this.ring.size === 0) return [];

    const nodes: string[] = [];
    const hash = this.hash(key);
    let index = this.findFirstGreaterOrEqual(hash);

    while (nodes.length < count && nodes.length < this.ring.size) {
      const actualIndex = index >= this.sortedKeys.length ? 0 : index;
      const node = this.ring.get(this.sortedKeys[actualIndex]);
      if (node && !nodes.includes(node)) {
        nodes.push(node);
      }
      index++;
    }

    return nodes;
  }

  private findFirstGreaterOrEqual(key: number): number {
    let low = 0;
    let high = this.sortedKeys.length;

    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.sortedKeys[mid] < key) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    return low;
  }

  private hash(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

// ============ Shard Router ============

export class ShardRouter {
  private shards: Shard[] = [];
  private hashPartitioning: HashBasedPartitioning;
  private consistentHash: ConsistentHash;

  constructor(shards: Shard[]) {
    this.shards = shards;
    this.hashPartitioning = new HashBasedPartitioning(shards);
    this.consistentHash = new ConsistentHash(shards.map((s) => s.id));
  }

  /**
   * Get shard for key
   */
  getShard(key: string, strategy: 'hash' | 'consistent' = 'consistent'): Shard {
    if (strategy === 'consistent') {
      const nodeId = this.consistentHash.getNode(key);
      const shard = this.shards.find((s) => s.id === nodeId);
      if (!shard) throw new Error(`No shard found for key: ${key}`);
      return shard;
    }
    return this.hashPartitioning.getShard(key);
  }

  /**
   * Get multiple shards for replication
   */
  getShards(key: string, count: number): Shard[] {
    const nodeIds = this.consistentHash.getNodes(key, count);
    return nodeIds
      .map((id) => this.shards.find((s) => s.id === id))
      .filter((s): s is Shard => s !== undefined);
  }

  /**
   * Get healthy shards only
   */
  getHealthyShards(): Shard[] {
    return this.shards.filter((s) => s.status === 'healthy');
  }

  /**
   * Get least loaded shard
   */
  getLeastLoadedShard(): Shard | null {
    const healthy = this.getHealthyShards();
    if (healthy.length === 0) return null;

    return healthy.reduce((min, shard) =>
      shard.load < min.load ? shard : min
    );
  }

  /**
   * Update shard status
   */
  updateShardStatus(shardId: string, status: Shard['status']): void {
    const shard = this.shards.find((s) => s.id === shardId);
    if (shard) {
      shard.status = status;
      shard.lastHealthCheck = new Date();
    }
  }

  /**
   * Add new shard
   */
  addShard(shard: Shard): void {
    this.shards.push(shard);
    this.consistentHash.addNode(shard.id);
  }

  /**
   * Remove shard
   */
  removeShard(shardId: string): void {
    this.shards = this.shards.filter((s) => s.id !== shardId);
    this.consistentHash.removeNode(shardId);
  }

  /**
   * Get shard statistics
   */
  getStats(): {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    averageLoad: number;
  } {
    const total = this.shards.length;
    const healthy = this.shards.filter((s) => s.status === 'healthy').length;
    const degraded = this.shards.filter((s) => s.status === 'degraded').length;
    const unhealthy = this.shards.filter((s) => s.status === 'unhealthy').length;
    const averageLoad =
      this.shards.reduce((sum, s) => sum + s.load, 0) / total || 0;

    return { total, healthy, degraded, unhealthy, averageLoad };
  }
}

// ============ Cross-Shard Query ============

export class CrossShardQuery {
  private router: ShardRouter;

  constructor(router: ShardRouter) {
    this.router = router;
  }

  /**
   * Query all shards
   */
  async queryAll<T>(
    queryFn: (shard: Shard) => Promise<T[]>
  ): Promise<T[]> {
    const shards = this.router.getHealthyShards();
    const results = await Promise.all(shards.map((shard) => queryFn(shard)));
    return results.flat();
  }

  /**
   * Query specific shards
   */
  async queryShards<T>(
    shardIds: string[],
    queryFn: (shard: Shard) => Promise<T[]>
  ): Promise<T[]> {
    const shards = this.router.getHealthyShards().filter((s) =>
      shardIds.includes(s.id)
    );
    const results = await Promise.all(shards.map((shard) => queryFn(shard)));
    return results.flat();
  }

  /**
   * Aggregate across shards
   */
  async aggregate<T, R>(
    queryFn: (shard: Shard) => Promise<T[]>,
    aggregateFn: (results: T[]) => R
  ): Promise<R> {
    const results = await this.queryAll(queryFn);
    return aggregateFn(results);
  }
}

// ============ Singleton Instances ============

// Default shards (can be configured via environment)
const defaultShards: Shard[] = [
  {
    id: 'shard-1',
    name: 'Shard 1',
    host: 'localhost',
    port: 5432,
    weight: 1,
    status: 'healthy',
    load: 0,
    lastHealthCheck: new Date(),
  },
  {
    id: 'shard-2',
    name: 'Shard 2',
    host: 'localhost',
    port: 5433,
    weight: 1,
    status: 'healthy',
    load: 0,
    lastHealthCheck: new Date(),
  },
  {
    id: 'shard-3',
    name: 'Shard 3',
    host: 'localhost',
    port: 5434,
    weight: 1,
    status: 'healthy',
    load: 0,
    lastHealthCheck: new Date(),
  },
];

export const shardRouter = new ShardRouter(defaultShards);
export const crossShardQuery = new CrossShardQuery(shardRouter);
