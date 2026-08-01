export type Severity = 'critical' | 'serious' | 'moderate' | 'minor';
export type ViolationStatus = 'open' | 'fixed' | 'ignored' | 'false_positive';

export interface ScannerViolation {
  ruleId: string;
  wcagCriteria: string;
  severity: Severity;
  url: string;
  elementSelector: string | null;
  elementHtml: string | null;
  description: string;
  remediationCode: string | null;
  aiExplanation: string | null;
  aiConfidenceScore: number | null;
  status: ViolationStatus;
}

export interface ScanResult {
  violations: ScannerViolation[];
  pagesScanned: number;
  error?: string;
  screenshot?: string;
}

export interface ScanConfig {
  maxPages?: number;
  excludePaths?: string[];
  includeSubdomains?: boolean;
  waitForSelector?: string;
  waitTime?: number;
  takeScreenshot?: boolean;
}

export interface ScannerStrategy {
  name: string;
  canHandle(url: string): boolean;
  scan(url: string, html: string | null, config?: ScanConfig): Promise<ScanResult>;
}
