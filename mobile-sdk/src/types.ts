export type ViolationSeverity = 'critical' | 'serious' | 'moderate' | 'minor';

export interface Violation {
  id: string;
  ruleId: string;
  severity: ViolationSeverity;
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

export interface ScanConfig {
  apiUrl?: string;
  apiKey: string;
  projectId: string;
  standard?: 'wcag21aa' | 'wcag22aa' | 'section508';
  includeScreenshots?: boolean;
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
    score: number;
  };
}

export interface AccessibilityNode {
  role: string;
  name: string;
  description?: string;
  states: Record<string, boolean | string>;
  properties: Record<string, string>;
  children: AccessibilityNode[];
}

export interface ScreenAnalysis {
  screenshot?: string;
  nodes: AccessibilityNode[];
  violations: Violation[];
  timestamp: number;
}
