import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAnalysisStrategy } from '../strategies/fetch-analysis';

const TEST_URL = 'https://example.com';

describe('fetchAnalysisStrategy', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('name is fetch-analysis', () => {
    expect(fetchAnalysisStrategy.name).toBe('fetch-analysis');
  });

  it('canHandle returns true for http/https URLs', () => {
    expect(fetchAnalysisStrategy.canHandle('http://example.com')).toBe(true);
    expect(fetchAnalysisStrategy.canHandle('https://example.com')).toBe(true);
  });

  it('canHandle returns false for non-http URLs', () => {
    expect(fetchAnalysisStrategy.canHandle('ftp://example.com')).toBe(false);
    expect(fetchAnalysisStrategy.canHandle('file:///tmp')).toBe(false);
    expect(fetchAnalysisStrategy.canHandle('')).toBe(false);
  });

  it('detects missing page title when no title element', async () => {
    const html = '<html><body><p>Content</p></body></html>';
    const result = await fetchAnalysisStrategy.scan(TEST_URL, html);
    expect(result.violations.some(v => v.ruleId === 'page-title')).toBe(true);
  });

  it('detects missing page title when title is empty', async () => {
    const html = '<html><body><title></title><p>Content</p></body></html>';
    const result = await fetchAnalysisStrategy.scan(TEST_URL, html);
    expect(result.violations.some(v => v.ruleId === 'page-title')).toBe(true);
  });

  it('does not flag page title when present', async () => {
    const html = '<html><head><title>Valid Title</title></head><body><p>Content</p></body></html>';
    const result = await fetchAnalysisStrategy.scan(TEST_URL, html);
    expect(result.violations.filter(v => v.ruleId === 'page-title')).toHaveLength(0);
  });

  it('detects missing document language', async () => {
    const html = '<html><head><title>Test</title></head><body></body></html>';
    const result = await fetchAnalysisStrategy.scan(TEST_URL, html);
    expect(result.violations.some(v => v.ruleId === 'document-lang')).toBe(true);
  });

  it('does not flag document language when present', async () => {
    const html = '<html lang="en"><head><title>Test</title></head><body></body></html>';
    const result = await fetchAnalysisStrategy.scan(TEST_URL, html);
    expect(result.violations.filter(v => v.ruleId === 'document-lang')).toHaveLength(0);
  });

  it('detects missing alt on image', async () => {
    const html = '<html lang="en"><head><title>Test</title></head><body><img src="test.jpg"></body></html>';
    const result = await fetchAnalysisStrategy.scan(TEST_URL, html);
    expect(result.violations.some(v => v.ruleId === 'image-alt')).toBe(true);
  });

  it('does not flag image with alt', async () => {
    const html = '<html lang="en"><head><title>Test</title></head><body><img src="test.jpg" alt="description"></body></html>';
    const result = await fetchAnalysisStrategy.scan(TEST_URL, html);
    expect(result.violations.filter(v => v.ruleId === 'image-alt')).toHaveLength(0);
  });

  it('detects skipped heading levels', async () => {
    const html = '<html lang="en"><head><title>Test</title></head><body><h1>Title</h1><h3>Skipped h2</h3></body></html>';
    const result = await fetchAnalysisStrategy.scan(TEST_URL, html);
    expect(result.violations.some(v => v.ruleId === 'heading-order')).toBe(true);
  });

  it('does not flag sequential headings', async () => {
    const html = '<html lang="en"><head><title>Test</title></head><body><h1>Title</h1><h2>Subtitle</h2><h3>Section</h3></body></html>';
    const result = await fetchAnalysisStrategy.scan(TEST_URL, html);
    expect(result.violations.filter(v => v.ruleId === 'heading-order')).toHaveLength(0);
  });

  it('detects invalid ARIA roles', async () => {
    const html = '<html lang="en"><head><title>Test</title></head><body><div role="invalid-role-name">Content</div></body></html>';
    const result = await fetchAnalysisStrategy.scan(TEST_URL, html);
    expect(result.violations.some(v => v.ruleId === 'aria-roles')).toBe(true);
  });

  it('does not flag valid ARIA roles', async () => {
    const html = '<html lang="en"><head><title>Test</title></head><body><nav role="navigation">Menu</nav></body></html>';
    const result = await fetchAnalysisStrategy.scan(TEST_URL, html);
    expect(result.violations.filter(v => v.ruleId === 'aria-roles')).toHaveLength(0);
  });

  it('detects viewport that restricts zoom', async () => {
    const html = '<html lang="en"><head><title>Test</title><meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no"></head><body></body></html>';
    const result = await fetchAnalysisStrategy.scan(TEST_URL, html);
    expect(result.violations.some(v => v.ruleId === 'meta-viewport')).toBe(true);
  });

  it('does not flag accessible viewport', async () => {
    const html = '<html lang="en"><head><title>Test</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body></body></html>';
    const result = await fetchAnalysisStrategy.scan(TEST_URL, html);
    expect(result.violations.filter(v => v.ruleId === 'meta-viewport')).toHaveLength(0);
  });

  it('uses provided HTML instead of fetching when available', async () => {
    const html = '<html><body><p>No title, no lang</p></body></html>';
    const result = await fetchAnalysisStrategy.scan(TEST_URL, html);
    expect(result.pagesScanned).toBe(1);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('returns pagesScanned = 1 for single page scan', async () => {
    const html = '<html lang="en"><head><title>Test</title></head><body></body></html>';
    const result = await fetchAnalysisStrategy.scan(TEST_URL, html);
    expect(result.pagesScanned).toBe(1);
  });

  it('handles well-formed HTML with no violations', async () => {
    const html = '<html lang="en"><head><title>All Good</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body><h1>Title</h1><h2>Sub</h2><img src="a.jpg" alt="desc"><nav role="navigation">Menu</nav></body></html>';
    const result = await fetchAnalysisStrategy.scan(TEST_URL, html);
    expect(result.violations).toHaveLength(0);
  });

  it('color-contrast rule returns null (not implemented)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'));
    const html = '<html lang="en"><head><title>Test</title></head><body style="color: #111; background: #fff;"><p>Text</p></body></html>';
    const result = await fetchAnalysisStrategy.scan(TEST_URL, html);
    expect(result.violations.filter(v => v.ruleId === 'general-color-contrast')).toHaveLength(0);
    fetchSpy.mockRestore();
  });
});
