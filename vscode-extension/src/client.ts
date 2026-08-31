import * as vscode from 'vscode';

export interface Violation {
  id: string;
  ruleId: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  message: string;
  element: string;
  selector: string;
  wcagCriterion: string;
  filePath?: string;
  line?: number;
  column?: number;
  fixSuggestion?: string;
  confidence?: number;
}

export interface ScanResult {
  scanId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalPages: number;
  scannedPages: number;
  violations: Violation[];
  summary: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
}

export interface FixResult {
  violationId: string;
  code: string;
  explanation: string;
  confidence: number;
  approach: string;
}

export class AccessGuardClient {
  private apiKey: string;
  private orgId: string;
  private apiUrl: string;
  private statusBarItem: vscode.StatusBarItem;

  constructor(apiKey: string, orgId: string, apiUrl: string) {
    this.apiKey = apiKey;
    this.orgId = orgId;
    this.apiUrl = apiUrl;

    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'accessguard.scanFile';
    this.statusBarItem.tooltip = 'Click to scan current file';
    this.updateStatusBar('idle');
    this.statusBarItem.show();
  }

  private updateStatusBar(status: 'idle' | 'scanning' | 'error') {
    switch (status) {
      case 'scanning':
        this.statusBarItem.text = '$(sync~spin) AccessGuard';
        this.statusBarItem.tooltip = 'Scanning...';
        break;
      case 'error':
        this.statusBarItem.text = '$(error) AccessGuard';
        this.statusBarItem.tooltip = 'Error - click to configure';
        break;
      default:
        this.statusBarItem.text = '$(check) AccessGuard';
        this.statusBarItem.tooltip = 'Click to scan current file';
    }
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiKey) {
      throw new Error('AccessGuard API key not configured. Run: AccessGuard: Configure Settings');
    }

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

  async scanFile(filePath: string, content: string): Promise<ScanResult> {
    this.updateStatusBar('scanning');
    try {
      const result = await this.request<ScanResult>('/api/scan/file', {
        method: 'POST',
        body: JSON.stringify({
          filePath,
          content,
          orgId: this.orgId,
        }),
      });
      this.updateStatusBar('idle');
      return result;
    } catch (error) {
      this.updateStatusBar('error');
      throw error;
    }
  }

  async getViolations(projectId: string, filters?: {
    severity?: string;
    status?: string;
    limit?: number;
  }): Promise<{ violations: Violation[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.severity) params.set('severity', filters.severity);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.limit) params.set('limit', String(filters.limit));

    const query = params.toString();
    return this.request(`/api/violations?projectId=${projectId}${query ? `&${query}` : ''}`);
  }

  async generateFix(violationId: string): Promise<FixResult> {
    return this.request(`/api/violations/${violationId}/fix`, {
      method: 'POST',
      body: JSON.stringify({ forceRegenerate: false }),
    });
  }

  async listProjects(): Promise<{ projects: Array<{ id: string; name: string }>; total: number }> {
    return this.request(`/api/projects?orgId=${this.orgId}`);
  }

  isConfigured(): boolean {
    return !!this.apiKey && !!this.orgId;
  }

  dispose() {
    this.statusBarItem.dispose();
  }
}
