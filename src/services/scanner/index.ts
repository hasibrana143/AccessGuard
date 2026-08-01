import type { ScanConfig as InternalScanConfig, ScannerViolation, ScanResult, ScannerStrategy } from './types';
import { axeCoreStrategy } from './strategies/axe-core';
import { domAnalysisStrategy } from './strategies/dom-analysis';
import { fetchAnalysisStrategy } from './strategies/fetch-analysis';

const strategies = [axeCoreStrategy, fetchAnalysisStrategy, domAnalysisStrategy];

export type {
  ScannerStrategy, ScanResult, ScannerViolation,
};

export type BrowserViolation = ScannerViolation;
export type ServerViolation = ScannerViolation;

export interface AdvancedScanConfig {
  requestDelay?: number;
  userAgent?: 'default' | 'chrome' | 'firefox' | 'safari' | 'googlebot';
  timeout?: number;
  retryCount?: number;
}

export function scanUrl(url: string, config?: InternalScanConfig): Promise<ScanResult> {
  return axeCoreStrategy.scan(url, null, config);
}

export function scanFromHTML(html: string, url: string): Promise<ScanResult> {
  return domAnalysisStrategy.scan(url, html);
}

export function scanUrlServer(url: string, html?: string, config?: InternalScanConfig | AdvancedScanConfig): Promise<ScanResult> {
  const strategy = html ? domAnalysisStrategy : fetchAnalysisStrategy;
  return strategy.scan(url, html || null, config as InternalScanConfig);
}

export function getAvailableStrategies(): { name: string; canHandle: boolean }[] {
  return strategies.map(s => ({ name: s.name, canHandle: true }));
}


