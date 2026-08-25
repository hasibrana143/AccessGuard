/**
 * Strangler Fig Pattern
 * 
 * Enables gradual migration from legacy to new system.
 * Routes traffic between old and new based on configuration.
 * 
 * Features:
 * - Feature flags for gradual rollout
 * - Traffic splitting
 * - Fallback to legacy
 * - Migration tracking
 * 
 * Usage:
 *   import { stranglerFig } from '@/lib/strangler-fig';
 *   
 *   // Register route handlers
 *   stranglerFig.register('projects', {
 *     legacy: legacyProjectsHandler,
 *     modern: modernProjectsHandler,
 *   });
 *   
 *   // Route request
 *   const response = await stranglerFig.route('projects', request);
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from './error-logger';
import { metrics, metricNames } from './metrics';

export interface MigrationRoute {
  name: string;
  legacy: (req: NextRequest) => Promise<NextResponse>;
  modern: (req: NextRequest) => Promise<NextResponse>;
  percentage: number;  // 0-100, percentage of traffic to modern
  enabled: boolean;
  fallbackToLegacy: boolean;
}

export interface MigrationConfig {
  enabled: boolean;
  defaultPercentage: number;
  logComparisons: boolean;
}

export interface MigrationStats {
  name: string;
  totalRequests: number;
  legacyRequests: number;
  modernRequests: number;
  errors: number;
  avgLegacyDuration: number;
  avgModernDuration: number;
}

const DEFAULT_CONFIG: MigrationConfig = {
  enabled: true,
  defaultPercentage: 0,  // Start with 0% modern
  logComparisons: false,
};

// Simple feature flag store
class FeatureFlagStore {
  private flags = new Map<string, number>();  // name -> percentage

  get(name: string): number {
    return this.flags.get(name) || 0;
  }

  set(name: string, percentage: number): void {
    this.flags.set(name, Math.max(0, Math.min(100, percentage)));
    logger.info({ name, percentage }, 'Feature flag updated');
  }

  getAll(): Record<string, number> {
    return Object.fromEntries(this.flags);
  }
}

class StranglerFig {
  private routes = new Map<string, MigrationRoute>();
  private config: MigrationConfig;
  private featureFlags = new FeatureFlagStore();
  private stats = new Map<string, {
    total: number;
    legacy: number;
    modern: number;
    errors: number;
    legacyDuration: number;
    modernDuration: number;
  }>();

  constructor(config?: Partial<MigrationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register a migration route
   */
  register(name: string, handlers: {
    legacy: MigrationRoute['legacy'];
    modern: MigrationRoute['modern'];
  }, options?: {
    percentage?: number;
    enabled?: boolean;
    fallbackToLegacy?: boolean;
  }): void {
    const route: MigrationRoute = {
      name,
      legacy: handlers.legacy,
      modern: handlers.modern,
      percentage: options?.percentage ?? this.config.defaultPercentage,
      enabled: options?.enabled ?? true,
      fallbackToLegacy: options?.fallbackToLegacy ?? true,
    };

    this.routes.set(name, route);
    this.stats.set(name, {
      total: 0,
      legacy: 0,
      modern: 0,
      errors: 0,
      legacyDuration: 0,
      modernDuration: 0,
    });

    logger.info({ name, percentage: route.percentage }, 'Migration route registered');
  }

  /**
   * Route request to legacy or modern handler
   */
  async route(name: string, request: NextRequest): Promise<NextResponse> {
    const route = this.routes.get(name);
    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    const routeStats = this.stats.get(name)!;
    routeStats.total++;

    // Check if migration is enabled
    if (!this.config.enabled || !route.enabled) {
      return this.executeLegacy(route, request, routeStats);
    }

    // Determine which handler to use
    const percentage = this.featureFlags.get(name) || route.percentage;
    const useModern = Math.random() * 100 < percentage;

    if (useModern) {
      try {
        return await this.executeModern(route, request, routeStats);
      } catch (error) {
        if (route.fallbackToLegacy) {
          logger.warn({
            name,
            error: error instanceof Error ? error.message : 'Unknown',
          }, 'Modern handler failed, falling back to legacy');
          return this.executeLegacy(route, request, routeStats);
        }
        throw error;
      }
    } else {
      return this.executeLegacy(route, request, routeStats);
    }
  }

  /**
   * Execute legacy handler
   */
  private async executeLegacy(
    route: MigrationRoute,
    request: NextRequest,
    stats: { legacyDuration: number; legacy: number }
  ): Promise<NextResponse> {
    const startTime = performance.now();
    const response = await route.legacy(request);
    const duration = performance.now() - startTime;

    stats.legacyDuration += duration;
    stats.legacy++;

    metrics.increment(`${metricNames.MIGRATION_REQUESTS}.legacy`, 1, { route: route.name });
    metrics.observe(`${metricNames.MIGRATION_DURATION}.legacy`, duration, { route: route.name });

    return response;
  }

  /**
   * Execute modern handler
   */
  private async executeModern(
    route: MigrationRoute,
    request: NextRequest,
    stats: { modernDuration: number; modern: number }
  ): Promise<NextResponse> {
    const startTime = performance.now();
    const response = await route.modern(request);
    const duration = performance.now() - startTime;

    stats.modernDuration += duration;
    stats.modern++;

    metrics.increment(`${metricNames.MIGRATION_REQUESTS}.modern`, 1, { route: route.name });
    metrics.observe(`${metricNames.MIGRATION_DURATION}.modern`, duration, { route: route.name });

    return response;
  }

  /**
   * Update migration percentage
   */
  setPercentage(name: string, percentage: number): void {
    this.featureFlags.set(name, percentage);
  }

  /**
   * Get migration stats
   */
  getStats(): MigrationStats[] {
    return Array.from(this.routes.entries()).map(([name, route]) => {
      const stats = this.stats.get(name)!;
      return {
        name,
        totalRequests: stats.total,
        legacyRequests: stats.legacy,
        modernRequests: stats.modern,
        errors: stats.errors,
        avgLegacyDuration: stats.legacy > 0 ? stats.legacyDuration / stats.legacy : 0,
        avgModernDuration: stats.modern > 0 ? stats.modernDuration / stats.modern : 0,
      };
    });
  }

  /**
   * Get all feature flags
   */
  getFeatureFlags(): Record<string, number> {
    return this.featureFlags.getAll();
  }

  /**
   * Enable/disable route
   */
  setEnabled(name: string, enabled: boolean): void {
    const route = this.routes.get(name);
    if (route) {
      route.enabled = enabled;
      logger.info({ name, enabled }, 'Migration route enabled/disabled');
    }
  }
}

// Singleton
export const stranglerFig = new StranglerFig();

/**
 * Register common migration routes
 */
export function registerMigrationRoutes(): void {
  stranglerFig.register('projects', {
    legacy: async (req) => {
      // Legacy implementation
      return NextResponse.json({ source: 'legacy' });
    },
    modern: async (req) => {
      // Modern implementation
      return NextResponse.json({ source: 'modern' });
    },
  }, { percentage: 0 });

  stranglerFig.register('scans', {
    legacy: async (req) => {
      return NextResponse.json({ source: 'legacy' });
    },
    modern: async (req) => {
      return NextResponse.json({ source: 'modern' });
    },
  }, { percentage: 0 });
}
