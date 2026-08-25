/**
 * Backend for Frontend (BFF) Pattern
 * 
 * Creates dedicated backends for each frontend type:
 * - Web BFF (React/Next.js)
 * - Mobile BFF (React Native/Flutter)
 * - Admin BFF (Internal tools)
 * - API BFF (Third-party integrations)
 * 
 * Features:
 * - Frontend-specific data aggregation
 * - Protocol translation (REST ↔ GraphQL)
 * - Authentication per frontend
 * - Response transformation
 * - Caching per frontend
 * 
 * Usage:
 *   import { WebBFF, MobileBFF } from '@/lib/bff';
 *   
 *   // Web BFF - returns full data
 *   const webData = await webBFF.getDashboard(userId);
 *   
 *   // Mobile BFF - returns minimal data
 *   const mobileData = await mobileBFF.getDashboard(userId);
 */

// ============ BFF Interface ============

export interface BFFConfig {
  name: string;
  description: string;
  cacheTtl: number;
  maxPageSize: number;
  includeFields?: string[];
  excludeFields?: string[];
}

export interface DashboardData {
  user: Record<string, unknown>;
  projects: Record<string, unknown>[];
  recentScans: Record<string, unknown>[];
  violations: Record<string, unknown>[];
  stats: Record<string, unknown>;
}

// ============ Base BFF ============

export abstract class BaseBFF {
  protected config: BFFConfig;

  constructor(config: BFFConfig) {
    this.config = config;
  }

  /**
   * Transform data based on BFF config
   */
  protected transform<T extends Record<string, unknown>>(data: T): T {
    const result = { ...data };

    // Remove excluded fields
    if (this.config.excludeFields) {
      for (const field of this.config.excludeFields) {
        delete result[field];
      }
    }

    // Only include specified fields
    if (this.config.includeFields) {
      const filtered: Record<string, unknown> = {};
      for (const field of this.config.includeFields) {
        if (field in result) {
          filtered[field] = result[field];
        }
      }
      return filtered as T;
    }

    return result;
  }

  /**
   * Paginate results
   */
  protected paginate<T>(items: T[], page: number, pageSize?: number): {
    data: T[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  } {
    const size = Math.min(pageSize || this.config.maxPageSize, this.config.maxPageSize);
    const start = (page - 1) * size;
    const end = start + size;
    const data = items.slice(start, end);

    return {
      data,
      pagination: {
        page,
        pageSize: size,
        total: items.length,
        totalPages: Math.ceil(items.length / size),
      },
    };
  }
}

// ============ Web BFF ============

export class WebBFF extends BaseBFF {
  constructor() {
    super({
      name: 'web',
      description: 'Web application BFF',
      cacheTtl: 300_000, // 5 minutes
      maxPageSize: 50,
    });
  }

  /**
   * Get dashboard data for web
   */
  async getDashboard(userId: string): Promise<DashboardData> {
    // In production, aggregate from multiple services
    return {
      user: this.transform({
        id: userId,
        name: 'User',
        email: 'user@example.com',
      }),
      projects: [],
      recentScans: [],
      violations: [],
      stats: {
        totalProjects: 0,
        totalScans: 0,
        totalViolations: 0,
      },
    };
  }

  /**
   * Get projects with full details
   */
  async getProjects(
    userId: string,
    page = 1,
    pageSize?: number
  ): Promise<{
    data: Record<string, unknown>[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    const projects: Record<string, unknown>[] = [];
    return this.paginate(projects, page, pageSize);
  }

  /**
   * Get scan details with violations
   */
  async getScanDetails(scanId: string): Promise<Record<string, unknown>> {
    return this.transform({
      id: scanId,
      status: 'completed',
      violations: [],
      metrics: {},
    });
  }
}

// ============ Mobile BFF ============

export class MobileBFF extends BaseBFF {
  constructor() {
    super({
      name: 'mobile',
      description: 'Mobile application BFF',
      cacheTtl: 600_000, // 10 minutes (longer for mobile)
      maxPageSize: 20, // Smaller pages for mobile
      includeFields: ['id', 'name', 'status', 'updatedAt'],
    });
  }

  /**
   * Get dashboard data for mobile (minimal)
   */
  async getDashboard(userId: string): Promise<DashboardData> {
    return {
      user: this.transform({
        id: userId,
        name: 'User',
      }),
      projects: [],
      recentScans: [],
      violations: [],
      stats: {
        totalProjects: 0,
        totalViolations: 0,
      },
    };
  }

  /**
   * Get projects (minimal data for mobile)
   */
  async getProjects(
    userId: string,
    page = 1,
    pageSize?: number
  ): Promise<{
    data: Record<string, unknown>[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    const projects: Record<string, unknown>[] = [];
    return this.paginate(projects, page, pageSize);
  }
}

// ============ Admin BFF ============

export class AdminBFF extends BaseBFF {
  constructor() {
    super({
      name: 'admin',
      description: 'Admin dashboard BFF',
      cacheTtl: 60_000, // 1 minute (fresh data for admin)
      maxPageSize: 100,
    });
  }

  /**
   * Get admin dashboard with system metrics
   */
  async getDashboard(): Promise<Record<string, unknown>> {
    return {
      system: {
        uptime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
      },
      users: {
        total: 0,
        active: 0,
      },
      tenants: {
        total: 0,
        active: 0,
      },
      metrics: {
        apiCalls: 0,
        errors: 0,
        avgResponseTime: 0,
      },
    };
  }

  /**
   * Get all users with admin details
   */
  async getUsers(
    page = 1,
    pageSize?: number
  ): Promise<{
    data: Record<string, unknown>[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    const users: Record<string, unknown>[] = [];
    return this.paginate(users, page, pageSize);
  }
}

// ============ API BFF ============

export class APIBFF extends BaseBFF {
  constructor() {
    super({
      name: 'api',
      description: 'Third-party API BFF',
      cacheTtl: 300_000,
      maxPageSize: 100,
    });
  }

  /**
   * Get data for API consumers
   */
  async getPublicData(): Promise<Record<string, unknown>> {
    return {
      version: '1.0.0',
      status: 'healthy',
      endpoints: [],
    };
  }

  /**
   * Transform data for API response format
   */
  forAPIResponse<T>(data: T): {
    success: boolean;
    data: T;
    timestamp: string;
  } {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }
}

// ============ BFF Factory ============

export class BFFFactory {
  private static instances = new Map<string, BaseBFF>();

  /**
   * Get BFF instance by type
   */
  static get(type: 'web' | 'mobile' | 'admin' | 'api'): BaseBFF {
    if (!this.instances.has(type)) {
      switch (type) {
        case 'web':
          this.instances.set(type, new WebBFF());
          break;
        case 'mobile':
          this.instances.set(type, new MobileBFF());
          break;
        case 'admin':
          this.instances.set(type, new AdminBFF());
          break;
        case 'api':
          this.instances.set(type, new APIBFF());
          break;
      }
    }
    return this.instances.get(type)!;
  }

  /**
   * Register custom BFF
   */
  static register(type: string, bff: BaseBFF): void {
    this.instances.set(type, bff);
  }
}

// ============ BFF Middleware ============

export function withBFF<T>(
  bffType: 'web' | 'mobile' | 'admin' | 'api',
  handler: (bff: BaseBFF) => Promise<T>
): () => Promise<T> {
  return async (): Promise<T> => {
    const bff = BFFFactory.get(bffType);
    return handler(bff);
  };
}

// ============ Protocol Translator ============

export class ProtocolTranslator {
  /**
   * REST to GraphQL query
   */
  static restToGraphQL(
    endpoint: string,
    params: Record<string, unknown>
  ): { query: string; variables: Record<string, unknown> } {
    // Simple mapping
    return {
      query: `query { ${endpoint}(${Object.keys(params).map((k) => `$${k}: String`).join(', ')}) { id name } }`,
      variables: params,
    };
  }

  /**
   * GraphQL to REST
   */
  static graphQLToRest(
    query: string
  ): { method: string; endpoint: string; params: Record<string, unknown> } {
    // Simple extraction
    const match = query.match(/query\s+\w+\(([^)]*)\)/);
    const params: Record<string, unknown> = {};

    if (match?.[1]) {
      const paramPairs = match[1].split(',');
      for (const pair of paramPairs) {
        const [key] = pair.split(':').map((s) => s.trim());
        if (key) params[key] = null;
      }
    }

    return {
      method: 'GET',
      endpoint: '/api/data',
      params,
    };
  }
}

// ============ Singleton Instances ============

export const webBFF = BFFFactory.get('web') as WebBFF;
export const mobileBFF = BFFFactory.get('mobile') as MobileBFF;
export const adminBFF = BFFFactory.get('admin') as AdminBFF;
export const apiBFF = BFFFactory.get('api') as APIBFF;
