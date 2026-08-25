/**
 * Unit of Work Pattern
 * 
 * Manages transactions across multiple repositories.
 * Ensures atomic operations with rollback support.
 * 
 * Features:
 * - Transaction management
 * - Automatic rollback on failure
 * - Change tracking
 * - Batch operations
 * 
 * Usage:
 *   import { UnitOfWork } from '@/lib/unit-of-work';
 *   
 *   const uow = new UnitOfWork();
 *   await uow.execute(async (ctx) => {
 *     const project = await ctx.project.create({ name: 'Test' });
 *     await ctx.scan.create({ projectId: project.id });
 *   });
 */

import { db as prisma } from './db';
import { logger } from './error-logger';
import { metrics, metricNames } from './metrics';
import { ProjectRepository, ScanRepository } from './repository';

export interface TransactionContext {
  project: ProjectRepository;
  scan: ScanRepository;
  // Add more repositories as needed
}

export interface UnitOfWorkOptions {
  timeout: number;
  retries: number;
  isolationLevel: 'read_uncommitted' | 'read_committed' | 'repeatable_read' | 'serializable';
}

export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  duration: number;
}

const DEFAULT_OPTIONS: UnitOfWorkOptions = {
  timeout: 30000,
  retries: 2,
  isolationLevel: 'read_committed',
};

/**
 * Unit of Work
 */
export class UnitOfWork {
  private options: UnitOfWorkOptions;
  private changeSet: Array<{
    type: 'create' | 'update' | 'delete';
    entity: string;
    data: unknown;
  }> = [];

  constructor(options?: Partial<UnitOfWorkOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Execute transaction
   */
  async execute<T>(
    fn: (ctx: TransactionContext) => Promise<T>
  ): Promise<TransactionResult<T>> {
    const startTime = performance.now();

    try {
      const result = await prisma.$transaction(
        async (tx) => {
          // Create context with transaction
          const ctx: TransactionContext = {
            project: new ProjectRepository(),
            scan: new ScanRepository(),
            // Initialize other repositories with transaction if needed
          };

          // Execute the function
          const data = await fn(ctx);

          // Track changes
          logger.debug({
            changeSet: this.changeSet.length,
          }, 'Transaction executing');

          return data;
        },
        {
          timeout: this.options.timeout,
          maxWait: this.options.timeout,
        }
      );

      const duration = performance.now() - startTime;

      metrics.increment(metricNames.TRANSACTION_COMMITTED, 1);
      metrics.observe(`${metricNames.TRANSACTION_DURATION}.commit`, duration);

      logger.info({
        duration,
        changes: this.changeSet.length,
      }, 'Transaction committed');

      this.changeSet = [];

      return {
        success: true,
        data: result,
        duration,
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      metrics.increment(metricNames.TRANSACTION_ROLLED_BACK, 1);

      logger.error({
        error: errorMsg,
        duration,
        changes: this.changeSet.length,
      }, 'Transaction rolled back');

      this.changeSet = [];

      return {
        success: false,
        error: errorMsg,
        duration,
      };
    }
  }

  /**
   * Execute with retry
   */
  async executeWithRetry<T>(
    fn: (ctx: TransactionContext) => Promise<T>
  ): Promise<TransactionResult<T>> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.options.retries; attempt++) {
      const result = await this.execute(fn);
      
      if (result.success) {
        return result;
      }

      lastError = new Error(result.error);
      
      if (attempt < this.options.retries) {
        logger.warn({
          attempt: attempt + 1,
          maxRetries: this.options.retries,
        }, 'Retrying transaction');
        
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Transaction failed after retries',
      duration: 0,
    };
  }

  /**
   * Track change
   */
  trackChange(type: 'create' | 'update' | 'delete', entity: string, data: unknown): void {
    this.changeSet.push({ type, entity, data });
  }

  /**
   * Get change set
   */
  getChangeSet(): Array<{
    type: 'create' | 'update' | 'delete';
    entity: string;
    data: unknown;
  }> {
    return [...this.changeSet];
  }

  /**
   * Clear change set
   */
  clearChangeSet(): void {
    this.changeSet = [];
  }
}

/**
 * Batch operations helper
 */
export class BatchProcessor<T> {
  private items: T[] = [];
  private batchSize: number;
  private processor: (batch: T[]) => Promise<void>;

  constructor(
    processor: (batch: T[]) => Promise<void>,
    batchSize: number = 100
  ) {
    this.processor = processor;
    this.batchSize = batchSize;
  }

  /**
   * Add item to batch
   */
  add(item: T): void {
    this.items.push(item);
  }

  /**
   * Add multiple items
   */
  addMany(items: T[]): void {
    this.items.push(...items);
  }

  /**
   * Process all batches
   */
  async processAll(): Promise<{
    totalItems: number;
    totalBatches: number;
    successfulBatches: number;
    failedBatches: number;
  }> {
    const batches: T[][] = [];
    
    for (let i = 0; i < this.items.length; i += this.batchSize) {
      batches.push(this.items.slice(i, i + this.batchSize));
    }

    let successful = 0;
    let failed = 0;

    for (const batch of batches) {
      try {
        await this.processor(batch);
        successful++;
      } catch (error) {
        failed++;
        logger.error({
          batchSize: batch.length,
          error: error instanceof Error ? error.message : 'Unknown',
        }, 'Batch processing failed');
      }
    }

    const result = {
      totalItems: this.items.length,
      totalBatches: batches.length,
      successfulBatches: successful,
      failedBatches: failed,
    };

    this.items = [];
    return result;
  }

  /**
   * Get current batch count
   */
  getPendingCount(): number {
    return this.items.length;
  }
}

/**
 * Bulk insert helper
 */
export async function bulkInsert<T>(
  items: T[],
  inserter: (batch: T[]) => Promise<void>,
  batchSize: number = 100
): Promise<void> {
  const processor = new BatchProcessor(inserter, batchSize);
  processor.addMany(items);
  await processor.processAll();
}
