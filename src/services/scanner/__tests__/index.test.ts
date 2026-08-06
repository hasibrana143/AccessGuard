import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../strategies/axe-core', () => ({
  axeCoreStrategy: {
    name: 'axe-core',
    canHandle: vi.fn(() => true),
    scan: vi.fn(() => Promise.resolve({ violations: [], pagesScanned: 0, error: 'mocked error' })),
  },
}));

vi.mock('../strategies/dom-analysis', () => ({
  domAnalysisStrategy: {
    name: 'dom-analysis',
    canHandle: vi.fn(() => true),
    scan: vi.fn((_url: string, html: string | null) =>
      Promise.resolve(
        html
          ? { violations: [{ ruleId: 'image-alt', wcagCriteria: '1.1.1', severity: 'critical' as const, url: _url, elementSelector: null, elementHtml: '<img>', description: 'test', remediationCode: '', aiExplanation: '', aiConfidenceScore: null, status: 'open' as const }], pagesScanned: 1 }
          : { violations: [], pagesScanned: 0, error: 'No HTML' }
      )
    ),
  },
}));

vi.mock('../strategies/fetch-analysis', () => ({
  fetchAnalysisStrategy: {
    name: 'fetch-analysis',
    canHandle: vi.fn(() => true),
    scan: vi.fn(() => Promise.resolve({ violations: [], pagesScanned: 0 })),
  },
}));

describe('scanner index', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('scanUrl', () => {
    it('calls axeCoreStrategy.scan', async () => {
      const { scanUrl } = await import('../index');
      const { axeCoreStrategy } = await import('../strategies/axe-core');
      await scanUrl('https://example.com');
      expect(axeCoreStrategy.scan).toHaveBeenCalledWith('https://example.com', null, undefined);
    });

    it('passes config to axeCoreStrategy', async () => {
      const { scanUrl } = await import('../index');
      const { axeCoreStrategy } = await import('../strategies/axe-core');
      await scanUrl('https://example.com', { waitTime: 3000, takeScreenshot: true });
      expect(axeCoreStrategy.scan).toHaveBeenCalledWith('https://example.com', null, { waitTime: 3000, takeScreenshot: true });
    });
  });

  describe('scanFromHTML', () => {
    it('calls domAnalysisStrategy.scan', async () => {
      const { scanFromHTML } = await import('../index');
      const { domAnalysisStrategy } = await import('../strategies/dom-analysis');
      const result = await scanFromHTML('<html></html>', 'https://example.com');
      expect(domAnalysisStrategy.scan).toHaveBeenCalledWith('https://example.com', '<html></html>');
      expect(result.violations).toHaveLength(1);
    });
  });

  describe('scanUrlServer', () => {
    it('calls domAnalysisStrategy with html', async () => {
      const { scanUrlServer } = await import('../index');
      const { domAnalysisStrategy } = await import('../strategies/dom-analysis');
      await scanUrlServer('https://example.com', '<html></html>');
      expect(domAnalysisStrategy.scan).toHaveBeenCalledWith('https://example.com', '<html></html>', undefined);
    });

    it('calls fetchAnalysisStrategy without html', async () => {
      const { scanUrlServer } = await import('../index');
      const { fetchAnalysisStrategy } = await import('../strategies/fetch-analysis');
      await scanUrlServer('https://example.com');
      expect(fetchAnalysisStrategy.scan).toHaveBeenCalled();
    });

    it('passes config to strategy', async () => {
      const { scanUrlServer } = await import('../index');
      const { fetchAnalysisStrategy } = await import('../strategies/fetch-analysis');
      await scanUrlServer('https://example.com', undefined, { requestDelay: 500 });
      expect(fetchAnalysisStrategy.scan).toHaveBeenCalled();
    });
  });

  describe('getAvailableStrategies', () => {
    it('returns all strategies', async () => {
      const { getAvailableStrategies } = await import('../index');
      const strategies = getAvailableStrategies();
      expect(strategies).toHaveLength(3);
      expect(strategies.map(s => s.name)).toContain('axe-core');
      expect(strategies.map(s => s.name)).toContain('dom-analysis');
      expect(strategies.map(s => s.name)).toContain('fetch-analysis');
    });
  });
});
