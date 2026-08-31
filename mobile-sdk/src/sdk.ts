import type { ScanConfig, ScanResult, Violation, ScreenAnalysis } from './types';

export class AccessGuardSDK {
  private apiUrl: string;
  private apiKey: string;
  private projectId: string;
  private standard: string;

  constructor(config: ScanConfig) {
    this.apiUrl = config.apiUrl || 'https://api.accessguard.io';
    this.apiKey = config.apiKey;
    this.projectId = config.projectId;
    this.standard = config.standard || 'wcag22aa';
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.apiUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      ...(options.headers as Record<string, string> || {}),
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`AccessGuard API error ${response.status}: ${body}`);
    }
    return response.json() as Promise<T>;
  }

  async scanUrl(url: string): Promise<ScanResult> {
    return this.request<ScanResult>('/api/scan/url', {
      method: 'POST',
      body: JSON.stringify({
        url,
        projectId: this.projectId,
        standard: this.standard,
      }),
    });
  }

  async scanHtml(html: string, filePath?: string): Promise<ScanResult> {
    return this.request<ScanResult>('/api/scan/file', {
      method: 'POST',
      body: JSON.stringify({
        content: html,
        filePath: filePath || 'mobile-scan.html',
        projectId: this.projectId,
      }),
    });
  }

  async analyzeScreen(analysis: ScreenAnalysis): Promise<ScanResult> {
    return this.request<ScanResult>('/api/scan/mobile', {
      method: 'POST',
      body: JSON.stringify({
        projectId: this.projectId,
        standard: this.standard,
        analysis,
      }),
    });
  }

  async getViolation(violationId: string): Promise<Violation> {
    return this.request<Violation>(`/api/violations/${violationId}`);
  }

  async generateFix(violationId: string): Promise<{
    code: string;
    explanation: string;
    confidence: number;
  }> {
    return this.request(`/api/violations/${violationId}/fix`, {
      method: 'POST',
    });
  }

  async getProject(): Promise<{
    id: string;
    name: string;
    url: string;
    lastScan: {
      id: string;
      status: string;
      score: number;
    } | null;
  }> {
    return this.request(`/api/projects/${this.projectId}`);
  }

  async checkCompliance(url: string): Promise<{
    score: number;
    passed: number;
    failed: number;
    violations: Violation[];
  }> {
    return this.request('/api/check', {
      method: 'POST',
      body: JSON.stringify({
        url,
        standard: this.standard,
      }),
    });
  }
}
