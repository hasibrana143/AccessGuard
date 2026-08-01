import { describe, it, expect } from 'vitest';
import {
  validateRemediation,
  applyFixesToFile,
  createFixBranchName,
  parsePrUrl,
  generatePrTitle,
  generatePrBody,
  generateDemoPreview,
} from '@/lib/github-pr';

describe('validateRemediation', () => {
  it('rejects empty remediation code', () => {
    expect(validateRemediation('').valid).toBe(false);
    expect(validateRemediation(null).valid).toBe(false);
    expect(validateRemediation(undefined).valid).toBe(false);
  });

  it('rejects script tag injection', () => {
    const result = validateRemediation('<div><script>alert(1)</script></div>');
    expect(result.valid).toBe(false);
  });

  it('rejects javascript: URI injection', () => {
    expect(validateRemediation('<a href="javascript:alert(1)">x</a>').valid).toBe(false);
  });

  it('rejects newly injected event handlers', () => {
    const result = validateRemediation(
      '<img src="x.jpg" onerror="alert(1)">',
      '<img src="x.jpg">'
    );
    expect(result.valid).toBe(false);
  });

  it('allows event handlers that existed in the original element', () => {
    const result = validateRemediation(
      '<img src="x.jpg" onerror="fallback()" alt="desc">',
      '<img src="x.jpg" onerror="fallback()">'
    );
    expect(result.valid).toBe(true);
  });

  it('rejects unclosed HTML tags', () => {
    expect(validateRemediation('<div><span>text</div>').valid).toBe(false);
  });

  it('accepts well-formed remediation code', () => {
    const result = validateRemediation('<a href="/about" aria-label="About us">About</a>');
    expect(result.valid).toBe(true);
  });

  it('rejects oversized remediation code', () => {
    expect(validateRemediation('<div>' + 'x'.repeat(20_001) + '</div>').valid).toBe(false);
  });
});

describe('applyFixesToFile', () => {
  it('applies valid fixes and reports skipped invalid ones', () => {
    const original = '<html><body><img src="a.jpg"></body></html>';
    const result = applyFixesToFile(original, [
      {
        ruleId: 'image-alt',
        elementHtml: '<img src="a.jpg">',
        remediationCode: '<img src="a.jpg" alt="A">',
      },
      {
        ruleId: 'script-inject',
        elementHtml: '<img src="a.jpg">',
        remediationCode: '<img src="a.jpg"><script>evil()</script>',
      },
    ], 'index.html');

    expect(result.fixesApplied).toBe(1);
    expect(result.errors.length).toBe(1);
    expect(result.content).toContain('alt="A"');
    expect(result.content).not.toContain('<script>evil()</script>');
  });

  it('adds comment block when fixes cannot be matched', () => {
    const original = '<html><body><img src="a.jpg"></body></html>';
    const result = applyFixesToFile(original, [
      {
        ruleId: 'image-alt',
        elementHtml: '<img src="missing.jpg">',
        remediationCode: '<img src="missing.jpg" alt="A">',
      },
    ], 'index.html');

    expect(result.fixesApplied).toBe(0);
    expect(result.content).toContain('AccessGuard Accessibility Fixes');
  });
});

describe('createFixBranchName', () => {
  it('generates a sanitized branch name', () => {
    const name = createFixBranchName('color-contrast', new Date('2026-08-01'));
    expect(name).toMatch(/^accessguard\/fix-color-contrast-20260801-[a-z0-9]+$/);
  });
});

describe('parsePrUrl', () => {
  it('parses GitHub PR URLs', () => {
    const parsed = parsePrUrl('https://github.com/acme/website/pull/42');
    expect(parsed).toEqual({ owner: 'acme', repo: 'website', pullNumber: 42 });
  });

  it('returns null for non-PR URLs', () => {
    expect(parsePrUrl('https://github.com/acme/website')).toBeNull();
  });
});

describe('generatePrTitle / generatePrBody failure paths', () => {
  it('returns a generic title for an empty violation list', () => {
    expect(generatePrTitle([])).toBe('AccessGuard: Accessibility fixes');
  });

  it('groups multiple rule ids with a critical summary', () => {
    const title = generatePrTitle([
      { id: '1', ruleId: 'image-alt', severity: 'critical', url: 'https://x.dev/', description: 'd' },
      { id: '2', ruleId: 'color-contrast', severity: 'critical', url: 'https://x.dev/', description: 'd' },
    ]);
    expect(title).toContain('2 accessibility issues (2 critical)');
  });

  it('returns a generic body for an empty violation list', () => {
    const body = generatePrBody([]);
    expect(body).toContain('**Total Issues:** 0');
    expect(body).toContain('AccessGuard - Accessibility Fixes');
  });

  it('omits WCAG section when no violations carry criteria', () => {
    const body = generatePrBody([
      { id: '1', ruleId: 'image-alt', severity: 'serious', url: 'https://x.dev/', description: 'd' },
    ]);
    expect(body).not.toContain('WCAG Criteria Addressed');
  });

  it('includes the project block and WCAG criteria when present', () => {
    const body = generatePrBody(
      [{ id: '1', ruleId: 'image-alt', severity: 'minor', url: 'https://x.dev/', description: 'd', wcagCriteria: '1.1.1' }],
      { name: 'Acme', url: 'https://acme.dev' }
    );
    expect(body).toContain('**Project:** Acme');
    expect(body).toContain('WCAG 1.1.1');
  });
});

describe('generateDemoPreview failure paths', () => {
  it('falls back to index.html for unparseable urls', () => {
    const preview = generateDemoPreview([
      { id: '1', ruleId: 'image-alt', severity: 'serious', url: 'not-a-url', description: 'd' },
    ]);
    expect(preview.filesToModify).toContain('index.html');
  });

  it('returns an empty file list for empty violations', () => {
    expect(generateDemoPreview([]).filesToModify).toEqual([]);
  });
});
