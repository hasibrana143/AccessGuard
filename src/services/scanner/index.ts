import type { ScanConfig as InternalScanConfig, ScannerViolation, ScanResult, ScannerStrategy } from './types';
import { axeCoreStrategy } from './strategies/axe-core';
import { domAnalysisStrategy } from './strategies/dom-analysis';
import { fetchAnalysisStrategy } from './strategies/fetch-analysis';
import { crawlerStrategy } from './strategies/crawler';
import type { AuthContext } from '@/lib/scan-auth';

const strategies = [crawlerStrategy, axeCoreStrategy, fetchAnalysisStrategy, domAnalysisStrategy];

export type {
  ScannerStrategy, ScanResult, ScannerViolation,
};

export type { AuthContext };

export type BrowserViolation = ScannerViolation;
export type ServerViolation = ScannerViolation;

export interface AdvancedScanConfig {
  requestDelay?: number;
  userAgent?: 'default' | 'chrome' | 'firefox' | 'safari' | 'googlebot';
  timeout?: number;
  retryCount?: number;
}

export function scanUrl(url: string, config?: InternalScanConfig & { authContext?: AuthContext }): Promise<ScanResult> {
  return axeCoreStrategy.scan(url, null, config);
}

export function scanFromHTML(html: string, url: string): Promise<ScanResult> {
  return domAnalysisStrategy.scan(url, html);
}

export function scanUrlServer(url: string, html?: string, config?: InternalScanConfig | AdvancedScanConfig): Promise<ScanResult> {
  const strategy = html ? domAnalysisStrategy : fetchAnalysisStrategy;
  return strategy.scan(url, html || null, config as InternalScanConfig);
}

/** Full-site crawl: sitemap + BFS discovery, per-page axe scans, merged violations. */
export function crawlSite(url: string, config?: InternalScanConfig & { authContext?: AuthContext }): Promise<ScanResult> {
  return crawlerStrategy.scan(url, null, config);
}

export function getAvailableStrategies(): { name: string; canHandle: boolean }[] {
  return strategies.map(s => ({ name: s.name, canHandle: true }));
}


