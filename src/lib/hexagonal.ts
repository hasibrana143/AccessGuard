/**
 * Hexagonal Architecture (Ports & Adapters)
 * 
 * Isolates core business logic from external concerns.
 * Core domain defines ports (interfaces), adapters implement them.
 * 
 * Benefits:
 * - Testable core (mock adapters)
 * - Swappable implementations (e.g., Redis → Memcached)
 * - Clear separation of concerns
 * 
 * Usage:
 *   import { Port, Adapter, HexagonalCore } from '@/lib/hexagonal';
 *   
 *   // Define port (interface)
 *   interface CachePort extends Port {
 *     get(key: string): Promise<string | null>;
 *     set(key: string, value: string, ttl?: number): Promise<void>;
 *   }
 *   
 *   // Implement adapter
 *   class RedisAdapter implements CachePort {
 *     async get(key: string) { return redis.get(key); }
 *     async set(key: string, value: string, ttl?: number) {
 *       await redis.set(key, value, 'EX', ttl || 300);
 *     }
 *   }
 *   
 *   // Use in core
 *   const core = new HexagonalCore();
 *   core.registerAdapter('cache', new RedisAdapter());
 *   const cache = core.getAdapter<CachePort>('cache');
 */

// ============ Port Interface ============

export interface Port {
  name: string;
  description?: string;
}

// ============ Adapter Interface ============

export interface Adapter<TPort extends Port> {
  port: TPort;
  initialize(): Promise<void>;
  dispose(): Promise<void>;
  healthCheck(): Promise<boolean>;
}

// ============ Hexagonal Core ============

export class HexagonalCore {
  private adapters = new Map<string, Adapter<Port>>();
  private ports = new Map<string, Port>();

  /**
   * Register a port
   */
  registerPort(port: Port): void {
    this.ports.set(port.name, port);
  }

  /**
   * Register an adapter for a port
   */
  registerAdapter<TPort extends Port>(
    portName: string,
    adapter: Adapter<TPort>
  ): void {
    if (!this.ports.has(portName)) {
      throw new Error(`Port '${portName}' not registered`);
    }
    this.adapters.set(portName, adapter);
  }

  /**
   * Get adapter for a port
   */
  getAdapter<TPort extends Port>(portName: string): TPort {
    const adapter = this.adapters.get(portName);
    if (!adapter) {
      throw new Error(`No adapter registered for port '${portName}'`);
    }
    return adapter.port as TPort;
  }

  /**
   * Initialize all adapters
   */
  async initializeAll(): Promise<void> {
    for (const [name, adapter] of this.adapters) {
      try {
        await adapter.initialize();
        console.log(`[Hexagonal] Adapter '${name}' initialized`);
      } catch (error) {
        console.error(`[Hexagonal] Failed to initialize adapter '${name}':`, error);
        throw error;
      }
    }
  }

  /**
   * Dispose all adapters
   */
  async disposeAll(): Promise<void> {
    for (const [name, adapter] of this.adapters) {
      try {
        await adapter.dispose();
        console.log(`[Hexagonal] Adapter '${name}' disposed`);
      } catch (error) {
        console.error(`[Hexagonal] Failed to dispose adapter '${name}':`, error);
      }
    }
  }

  /**
   * Health check all adapters
   */
  async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    for (const [name, adapter] of this.adapters) {
      try {
        results[name] = await adapter.healthCheck();
      } catch {
        results[name] = false;
      }
    }
    return results;
  }

  /**
   * Get registered ports
   */
  getRegisteredPorts(): string[] {
    return Array.from(this.ports.keys());
  }

  /**
   * Get registered adapters
   */
  getRegisteredAdapters(): string[] {
    return Array.from(this.adapters.keys());
  }
}

// ============ Example Ports ============

export interface CachePort extends Port {
  name: 'cache';
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

export interface QueuePort extends Port {
  name: 'queue';
  add<T>(jobName: string, data: T, options?: { priority?: number }): Promise<string>;
  process<T, R>(jobName: string, handler: (data: T) => Promise<R>): void;
  getJobStatus(jobId: string): Promise<string>;
}

export interface StoragePort extends Port {
  name: 'storage';
  upload(key: string, data: Buffer, contentType: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
}

export interface EmailPort extends Port {
  name: 'email';
  send(params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void>;
}

export interface MetricsPort extends Port {
  name: 'metrics';
  counter(name: string, value?: number, tags?: Record<string, string>): void;
  gauge(name: string, value: number, tags?: Record<string, string>): void;
  histogram(name: string, value: number, tags?: Record<string, string>): void;
}

// ============ Example Adapters ============

export class InMemoryCacheAdapter implements Adapter<CachePort> {
  port: CachePort;
  private store = new Map<string, { value: string; expiry: number }>();

  constructor() {
    this.port = {
      name: 'cache',
      get: async (key: string) => {
        const item = this.store.get(key);
        if (!item) return null;
        if (Date.now() > item.expiry) {
          this.store.delete(key);
          return null;
        }
        return item.value;
      },
      set: async (key: string, value: string, ttl?: number) => {
        this.store.set(key, {
          value,
          expiry: Date.now() + (ttl || 300) * 1000,
        });
      },
      delete: async (key: string) => {
        this.store.delete(key);
      },
      has: async (key: string) => {
        return this.store.has(key);
      },
      clear: async () => {
        this.store.clear();
      },
    };
  }

  async initialize(): Promise<void> {
    // No initialization needed for in-memory
  }

  async dispose(): Promise<void> {
    this.store.clear();
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

export class ConsoleMetricsAdapter implements Adapter<MetricsPort> {
  port: MetricsPort;

  constructor() {
    this.port = {
      name: 'metrics',
      counter: (name: string, value?: number, tags?: Record<string, string>) => {
        console.log(`[Metrics] counter ${name}=${value || 1}`, tags);
      },
      gauge: (name: string, value: number, tags?: Record<string, string>) => {
        console.log(`[Metrics] gauge ${name}=${value}`, tags);
      },
      histogram: (name: string, value: number, tags?: Record<string, string>) => {
        console.log(`[Metrics] histogram ${name}=${value}`, tags);
      },
    };
  }

  async initialize(): Promise<void> {}
  async dispose(): Promise<void> {}
  async healthCheck(): Promise<boolean> {
    return true;
  }
}

// ============ Singleton Instance ============

export const hexagonalCore = new HexagonalCore();

// Register default ports
hexagonalCore.registerPort({ name: 'cache', description: 'Key-value cache' });
hexagonalCore.registerPort({ name: 'queue', description: 'Job queue' });
hexagonalCore.registerPort({ name: 'storage', description: 'File storage' });
hexagonalCore.registerPort({ name: 'email', description: 'Email sending' });
hexagonalCore.registerPort({ name: 'metrics', description: 'Metrics collection' });

// Register default adapters
hexagonalCore.registerAdapter('cache', new InMemoryCacheAdapter());
hexagonalCore.registerAdapter('metrics', new ConsoleMetricsAdapter());
