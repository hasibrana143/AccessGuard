// AccessGuard Types

export type View = 'landing' | 'login' | 'register' | 'dashboard' | 'projects' | 'violations' | 'scans' | 'reports' | 'settings';

export type Severity = 'critical' | 'serious' | 'moderate' | 'minor';
export type ViolationStatus = 'open' | 'fixed' | 'ignored' | 'false_positive';
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Violation {
  id: string;
  scanId: string;
  projectId: string;
  ruleId: string;
  wcagCriteria: string | null;
  severity: Severity;
  url: string;
  elementSelector: string | null;
  elementHtml: string | null;
  description: string;
  remediationCode: string | null;
  aiExplanation: string | null;
  aiConfidenceScore: number | null;
  status: ViolationStatus;
  githubPrUrl: string | null;
  createdAt: string;
  fixedAt: string | null;
  project?: {
    name: string;
    url: string;
  };
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  url: string;
  description: string | null;
  crawlConfig: string;
  lastScanAt: string | null;
  riskScore: number | null;
  nextScheduledScan: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  scans?: Scan[];
  violations?: ViolationSummary;
  totalViolations?: number;
}

export interface ViolationSummary {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
}

export interface Scan {
  id: string;
  projectId: string;
  status: ScanStatus;
  startedAt: string;
  completedAt: string | null;
  pagesScanned: number;
  violationsFound: number;
  summary: string | null;
  errorMessage: string | null;
  createdAt: string;
  project?: {
    name: string;
    url: string;
  };
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  settings: string;
  createdAt: string;
}

export interface WcagRule {
  ruleId: string;
  name: string;
  description: string;
  wcagCriteria: string;
  level: string;
  category: string;
  howToFix: string;
}

export interface CreateProjectInput {
  name: string;
  url: string;
  description?: string;
  orgSlug?: string;
  crawlConfig?: {
    maxPages: number;
    excludePaths: string[];
    includeSubdomains: boolean;
  };
}

export interface RemediationResponse {
  remediationCode: string;
  explanation: string;
  confidence: number;
  cached: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ViolationStats {
  severity: ViolationSummary & { total: number };
  status: {
    open: number;
    fixed: number;
    ignored: number;
    falsePositive: number;
  };
  topRules: Array<{ ruleId: string; count: number }>;
  recent: Violation[];
}
