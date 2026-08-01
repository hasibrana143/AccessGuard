import { describe, it, expect } from 'vitest';
import { domAnalysisStrategy } from '../strategies/dom-analysis';

const TEST_URL = 'https://example.com';

function cleanResultViolations(violations: any[]) {
  return violations.map(({ elementHtml, ...rest }) => ({
    ...rest,
    elementHtml: elementHtml?.substring(0, 100),
  }));
}

describe('domAnalysisStrategy', () => {
  it('name is dom-analysis', () => {
    expect(domAnalysisStrategy.name).toBe('dom-analysis');
  });

  it('canHandle returns true for any URL', () => {
    expect(domAnalysisStrategy.canHandle('')).toBe(true);
    expect(domAnalysisStrategy.canHandle('https://x.com')).toBe(true);
  });

  it('returns error when html is null', async () => {
    const result = await domAnalysisStrategy.scan(TEST_URL, null);
    expect(result.error).toBe('No HTML provided for DOM analysis');
    expect(result.violations).toHaveLength(0);
    expect(result.pagesScanned).toBe(0);
  });

  it('detects missing image alt attributes', async () => {
    const html = '<html><body><img src="photo.jpg"></body></html>';
    const result = await domAnalysisStrategy.scan(TEST_URL, html);
    const imageAltViolations = result.violations.filter(v => v.ruleId === 'image-alt' && v.severity === 'critical');
    expect(imageAltViolations).toHaveLength(1);
    expect(imageAltViolations[0].wcagCriteria).toBe('1.1.1');
  });

  it('detects generic alt text', async () => {
    const html = '<html><body><img src="photo.jpg" alt="image"></body></html>';
    const result = await domAnalysisStrategy.scan(TEST_URL, html);
    const genericAltViolations = result.violations.filter(v => v.ruleId === 'image-alt' && v.severity === 'serious');
    expect(genericAltViolations).toHaveLength(1);
  });

  it('detects form fields without labels', async () => {
    const html = '<html><body><input type="text" name="email"></body></html>';
    const result = await domAnalysisStrategy.scan(TEST_URL, html);
    const labelViolations = result.violations.filter(v => v.ruleId === 'label');
    expect(labelViolations).toHaveLength(1);
    expect(labelViolations[0].wcagCriteria).toBe('1.3.1');
  });

  it('skips hidden/submit/button/image inputs', async () => {
    const html = '<html><body><input type="hidden" name="csrf"><input type="submit" value="Go"><input type="button" value="Click"><input type="image" src="btn.png"></body></html>';
    const result = await domAnalysisStrategy.scan(TEST_URL, html);
    const labelViolations = result.violations.filter(v => v.ruleId === 'label');
    expect(labelViolations).toHaveLength(0);
  });

  it('skips inputs with aria-label', async () => {
    const html = '<html><body><input type="text" aria-label="Email"></body></html>';
    const result = await domAnalysisStrategy.scan(TEST_URL, html);
    const labelViolations = result.violations.filter(v => v.ruleId === 'label');
    expect(labelViolations).toHaveLength(0);
  });

  it('skips inputs with title', async () => {
    const html = '<html><body><input type="text" title="Email field"></body></html>';
    const result = await domAnalysisStrategy.scan(TEST_URL, html);
    const labelViolations = result.violations.filter(v => v.ruleId === 'label');
    expect(labelViolations).toHaveLength(0);
  });

  it('detects generic link text', async () => {
    const html = '<html><body><a href="/page">click here</a></body></html>';
    const result = await domAnalysisStrategy.scan(TEST_URL, html);
    const linkViolations = result.violations.filter(v => v.ruleId === 'link-name');
    expect(linkViolations).toHaveLength(1);
    expect(linkViolations[0].wcagCriteria).toBe('2.4.4');
  });

  it('detects multiple generic link texts', async () => {
    const html = '<html><body><a href="/a">click here</a><a href="/b">read more</a></body></html>';
    const result = await domAnalysisStrategy.scan(TEST_URL, html);
    const linkViolations = result.violations.filter(v => v.ruleId === 'link-name');
    expect(linkViolations).toHaveLength(2);
  });

  it('detects missing document language', async () => {
    const html = '<html><body><p>Hello</p></body></html>';
    const result = await domAnalysisStrategy.scan(TEST_URL, html);
    const langViolations = result.violations.filter(v => v.ruleId === 'document-lang');
    expect(langViolations).toHaveLength(1);
    expect(langViolations[0].wcagCriteria).toBe('3.1.1');
  });

  it('detects missing page title', async () => {
    const html = '<html lang="en"><body><p>Content</p></body></html>';
    const result = await domAnalysisStrategy.scan(TEST_URL, html);
    const titleViolations = result.violations.filter(v => v.ruleId === 'page-title');
    expect(titleViolations).toHaveLength(1);
    expect(titleViolations[0].wcagCriteria).toBe('2.4.2');
  });

  it('detects invalid ARIA roles', async () => {
    const html = '<html lang="en"><body><div role="invalid-role">Content</div></body></html>';
    const result = await domAnalysisStrategy.scan(TEST_URL, html);
    const roleViolations = result.violations.filter(v => v.ruleId === 'aria-roles');
    expect(roleViolations).toHaveLength(1);
  });

  it('does not flag valid ARIA roles', async () => {
    const html = '<html lang="en"><body><nav role="navigation"><a href="/">Home</a></nav></body></html>';
    const result = await domAnalysisStrategy.scan(TEST_URL, html);
    const roleViolations = result.violations.filter(v => v.ruleId === 'aria-roles');
    expect(roleViolations).toHaveLength(0);
  });

  it('reports pagesScanned as 1 on success', async () => {
    const result = await domAnalysisStrategy.scan(TEST_URL, '<html lang="en"><title>Test</title></html>');
    expect(result.pagesScanned).toBe(1);
  });

  it('handles well-formed HTML with no violations', async () => {
    const html = '<html lang="en"><head><title>Test Page</title></head><body><img src="ok.jpg" alt="Description"><input type="text" aria-label="Name"><a href="/home">Home Page</a></body></html>';
    const result = await domAnalysisStrategy.scan(TEST_URL, html);
    expect(result.violations).toHaveLength(0);
  });
});
