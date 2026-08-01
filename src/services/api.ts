// AccessGuard API Service
import type {
  Project,
  Violation,
  Scan,
  ApiResponse,
  CreateProjectInput,
  RemediationResponse,
  ViolationStats,
  Severity,
  ViolationStatus,
} from '@/types';

const API_BASE = '/api';

class ApiService {
  private async fetch<T>(url: string, options?: RequestInit): Promise<ApiResponse<T> & { status?: number }> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Request failed', status: response.status };
      }

      return { success: true, data, status: response.status };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Projects
  async getProjects(orgSlug = 'default-org'): Promise<ApiResponse<Project[]>> {
    return this.fetch<Project[]>(`${API_BASE}/projects?orgId=${orgSlug}`);
  }

  async getProject(id: string): Promise<ApiResponse<Project>> {
    return this.fetch<Project>(`${API_BASE}/projects/${id}`);
  }

  async createProject(input: CreateProjectInput): Promise<ApiResponse<{ project: Project; scan: Scan }>> {
    return this.fetch(`${API_BASE}/projects`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async deleteProject(id: string): Promise<ApiResponse<void>> {
    return this.fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Violations
  async getViolations(params: {
    projectId?: string;
    severity?: Severity | 'all';
    status?: ViolationStatus | 'all';
    ruleId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<ApiResponse<Violation[]>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== 'all') {
        searchParams.append(key, String(value));
      }
    });

    return this.fetch<Violation[]>(`${API_BASE}/violations?${searchParams}`);
  }

  async getViolation(id: string): Promise<ApiResponse<Violation>> {
    return this.fetch<Violation>(`${API_BASE}/violations/${id}`);
  }

  async updateViolationStatus(id: string, status: ViolationStatus): Promise<ApiResponse<Violation>> {
    return this.fetch(`${API_BASE}/violations`, {
      method: 'PUT',
      body: JSON.stringify({ id, status }),
    });
  }

  async bulkUpdateViolations(ids: string[], status: ViolationStatus, projectId?: string): Promise<ApiResponse<{ updated: number }>> {
    return this.fetch(`${API_BASE}/violations/batch`, {
      method: 'PATCH',
      body: JSON.stringify({ ids, status, projectId }),
    });
  }

  async getViolationStats(projectId?: string): Promise<ApiResponse<ViolationStats>> {
    return this.fetch(`${API_BASE}/violations`, {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    });
  }

  // Scans
  async getScans(projectId?: string, status?: string, limit = 20): Promise<ApiResponse<Scan[]>> {
    const searchParams = new URLSearchParams();
    if (projectId) searchParams.append('projectId', projectId);
    if (status) searchParams.append('status', status);
    searchParams.append('limit', String(limit));

    return this.fetch<Scan[]>(`${API_BASE}/scans?${searchParams}`);
  }

  async createScan(projectId: string): Promise<ApiResponse<Scan>> {
    return this.fetch(`${API_BASE}/scans`, {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    });
  }

  // Remediation
  async getRemediation(violationId: string, forceRegenerate = false): Promise<ApiResponse<RemediationResponse>> {
    return this.fetch(`${API_BASE}/remediate`, {
      method: 'POST',
      body: JSON.stringify({ violationId, forceRegenerate }),
    });
  }

  // Domain Verification
  async generateVerificationToken(projectId: string): Promise<ApiResponse<{
    verificationToken: string;
    instructions: { method: string; html: string; location: string; domain: string };
    alternativeMethods: Array<{ method: string; instruction: string }>;
  }>> {
    return this.fetch(`${API_BASE}/projects/verify`, {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    });
  }

  async checkVerificationStatus(projectId: string): Promise<ApiResponse<{ verified: boolean; message?: string; verificationToken?: string; needsToken?: boolean }>> {
    return this.fetch(`${API_BASE}/projects/verify?projectId=${projectId}`);
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; database: string }>> {
    return this.fetch(`${API_BASE}`);
  }
}

export const api = new ApiService();
