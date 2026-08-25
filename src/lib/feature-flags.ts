/**
 * Feature Flags
 * 
 * Runtime feature toggling without deployment.
 * Supports gradual rollouts, user segments, and A/B testing.
 * 
 * Features:
 * - Boolean, percentage, and user-segment flags
 * - Gradual rollout (percentage-based)
 * - User segment targeting
 * - A/B testing support
 * - Cache with TTL
 * - Analytics tracking
 * 
 * Usage:
 *   import { featureFlags } from '@/lib/feature-flags';
 *   
 *   // Check if feature is enabled
 *   const enabled = await featureFlags.isEnabled('new-dashboard', userId);
 *   
 *   // Get flag with default
 *   const flag = await featureFlags.get('dark-mode', { default: false });
 */

export interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  percentage?: number; // 0-100 for gradual rollout
  segments?: string[]; // User segments (e.g., ['beta', 'enterprise'])
  variants?: Record<string, unknown>; // A/B test variants
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureFlagContext {
  userId?: string;
  email?: string;
  segment?: string;
  attributes?: Record<string, unknown>;
}

// In-memory flag store (replace with database in production)
const flagStore = new Map<string, FeatureFlag>();

// Default flags
const defaultFlags: FeatureFlag[] = [
  {
    id: 'new-dashboard',
    name: 'New Dashboard',
    enabled: true,
    percentage: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'dark-mode',
    name: 'Dark Mode',
    enabled: true,
    percentage: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'ai-remediation',
    name: 'AI Remediation',
    enabled: true,
    percentage: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'advanced-analytics',
    name: 'Advanced Analytics',
    enabled: false,
    percentage: 0,
    segments: ['beta', 'enterprise'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'new-pricing',
    name: 'New Pricing',
    enabled: false,
    percentage: 10, // 10% rollout
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Initialize flags
defaultFlags.forEach((flag) => flagStore.set(flag.id, flag));

export class FeatureFlagService {
  private cache = new Map<string, { value: FeatureFlag; expiry: number }>();
  private cacheTtl = 60_000; // 1 minute

  /**
   * Check if feature is enabled
   */
  async isEnabled(
    flagId: string,
    context?: FeatureFlagContext
  ): Promise<boolean> {
    const flag = await this.get(flagId);
    if (!flag) return false;

    // Check if flag is globally disabled
    if (!flag.enabled) return false;

    // Check segment targeting
    if (flag.segments && context?.segment) {
      if (!flag.segments.includes(context.segment)) {
        return false;
      }
    }

    // Check percentage rollout
    if (flag.percentage !== undefined && flag.percentage < 100) {
      if (context?.userId) {
        // Deterministic based on userId
        const hash = this.hashString(context.userId + flagId);
        const bucket = hash % 100;
        if (bucket >= flag.percentage) {
          return false;
        }
      } else {
        // Random for anonymous users
        if (Math.random() * 100 >= flag.percentage) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get feature flag
   */
  async get(
    flagId: string,
    options?: { default?: boolean }
  ): Promise<FeatureFlag | null> {
    // Check cache
    const cached = this.cache.get(flagId);
    if (cached && Date.now() < cached.expiry) {
      return cached.value;
    }

    // Get from store
    const flag = flagStore.get(flagId) || null;

    if (flag) {
      // Cache the result
      this.cache.set(flagId, {
        value: flag,
        expiry: Date.now() + this.cacheTtl,
      });
    }

    return flag;
  }

  /**
   * Get all flags
   */
  async getAll(): Promise<FeatureFlag[]> {
    return Array.from(flagStore.values());
  }

  /**
   * Get flag value (for A/B testing)
   */
  async getValue<T>(
    flagId: string,
    context?: FeatureFlagContext
  ): Promise<T | undefined> {
    const flag = await this.get(flagId);
    if (!flag?.variants) return undefined;

    if (!context?.userId) {
      // Random variant for anonymous users
      const variants = Object.keys(flag.variants);
      const randomIndex = Math.floor(Math.random() * variants.length);
      return flag.variants[variants[randomIndex]] as T;
    }

    // Deterministic variant for logged-in users
    const variants = Object.keys(flag.variants);
    const hash = this.hashString(context.userId + flagId);
    const index = hash % variants.length;
    return flag.variants[variants[index]] as T;
  }

  /**
   * Update flag
   */
  async update(
    flagId: string,
    updates: Partial<Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<FeatureFlag | null> {
    const existing = flagStore.get(flagId);
    if (!existing) return null;

    const updated: FeatureFlag = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    flagStore.set(flagId, updated);
    this.cache.delete(flagId); // Invalidate cache

    return updated;
  }

  /**
   * Create new flag
   */
  async create(flag: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>): Promise<FeatureFlag> {
    const newFlag: FeatureFlag = {
      ...flag,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    flagStore.set(flag.id, newFlag);
    return newFlag;
  }

  /**
   * Delete flag
   */
  async delete(flagId: string): Promise<boolean> {
    this.cache.delete(flagId);
    return flagStore.delete(flagId);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Simple hash function for deterministic bucketing
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

// Singleton instance
export const featureFlags = new FeatureFlagService();

// ============ Legacy API Compatibility ============

export interface FlagDefinition {
  key: string;
  description: string;
  defaultValue: boolean;
}

const flagDefinitions: FlagDefinition[] = [
  { key: 'new-dashboard', description: 'New Dashboard UI', defaultValue: true },
  { key: 'dark-mode', description: 'Dark Mode support', defaultValue: true },
  { key: 'ai-remediation', description: 'AI Remediation suggestions', defaultValue: true },
  { key: 'advanced-analytics', description: 'Advanced Analytics dashboard', defaultValue: false },
  { key: 'new-pricing', description: 'New Pricing page', defaultValue: false },
];

export function getAllFlagDefinitions(): FlagDefinition[] {
  return flagDefinitions;
}

export function getFlagDefinition(key: string): FlagDefinition | undefined {
  return flagDefinitions.find((f) => f.key === key);
}

export async function isEnabled(key: string, _orgId?: string): Promise<boolean> {
  const flag = await featureFlags.get(key);
  return flag?.enabled ?? false;
}

export async function setFlag(key: string, enabled: boolean, _orgId?: string): Promise<void> {
  await featureFlags.update(key, { enabled });
}
