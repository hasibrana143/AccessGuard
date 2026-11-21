import { describe, it, expect } from 'vitest';
import {
  validateRemediation,
  applyFixesToFile,
  createFixBranchName,
  parsePrUrl,
  generatePrTitle,
  generatePrBody,
  escapeMarkdownText,
  codeFence,
  inlineCode,
} from '@/lib/github-pr';

describe('PR text escaping', () => {
  it('neutralizes raw HTML in untrusted text', () => {
    const escaped = escapeMarkdownText('<img src=x onerror=alert(1)>');
    expect(escaped).not.toContain('<');
    expect(escaped).not.toContain('>');
    expect(escaped).toContain('lt;img');
    expect(escaped).toContain('gt;');
  });

  it('sizes the code fence to the content it wraps', () => {
    expect(codeFence('plain')).toBe('```');
    expect(codeFence('has ``` fence')).toBe('````');
    expect(codeFence('has ```` fence')).toBe('`````');
  });

  it('keeps untrusted HTML out of the PR body', () => {
    const body = generatePrBody([
      {
        id: 'v1',
        ruleId: 'image-alt',
        severity: 'serious',
        url: 'https://example.com/',
        description: '<img src=x onerror="steal()">',
        wcagCriteria: '1.1.1',
      },
    ]);
    expect(body).not.toContain('<img src=x');
  });

  it('neutralizes Markdown links, images and mentions in untrusted text', () => {
    const escaped = escapeMarkdownText(
      '![tracking pixel](https://attacker.example/pixel?x=1) @victim [click](https://attacker.example)'
    );

    expect(escaped).not.toContain('](');
    expect(escaped).toContain('\\]\\(');
    expect(escaped).toContain('\\@');
  });

  it('keeps a Markdown injected description out of the PR body', () => {
    const body = generatePrBody([
      {
        id: 'v1',
        ruleId: 'image-alt',
        severity: 'serious',
        url: 'https://example.com/',
        description: '![tracking pixel](https://attacker.example/pixel?x=1) @victim',
        wcagCriteria: '1.1.1',
      },
    ]);

    expect(body).not.toContain('![tracking pixel]');
    expect(body).toContain('\\!\\[tracking pixel\\]');
  });

  it('fences an inline code span longer than any backtick run in the value', () => {
    expect(inlineCode('plain')).toBe('`plain`');
    // A value with two backticks needs a three backtick fence, otherwise it
    // closes the span and the rest of the value is rendered as Markdown.
    expect(inlineCode('has `` ticks')).toBe('```has `` ticks```');
    // A value that starts or ends with a backtick is padded so the fence is
    // not read as part of the content.
    expect(inlineCode('`edge`')).toBe('`` `edge` ``');
  });

  it('keeps a Markdown injected selector inside one code span', () => {
    // The selector comes from the scanned page: it can carry a Markdown link.
    const selector = 'img[data-mark="`` [x](https://a.test)"]';
    const body = generatePrBody([
      {
        id: 'v1',
        ruleId: 'image-alt',
        severity: 'serious',
        url: 'https://example.com/',
        description: 'd',
        elementSelector: selector,
      },
    ]);

    const line = body.split('\n').find(l => l.includes('Selector:')) ?? '';
    const fence = line.match(/`+/)![0];
    // The fence is longer than the longest backtick run inside the value, so
    // the value cannot close the span.
    expect(fence.length).toBeGreaterThan(2);
    expect(line).toContain(selector);
  });
});

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

  it('rejects an event handler that existed in the original element', () => {
    // The scanned page controls the handler code, so a handler is never carried
    // into a remediation — not even one that was already there.
    const result = validateRemediation(
      '<img src="x.jpg" onerror="fallback()" alt="desc">',
      '<img src="x.jpg" onerror="fallback()">'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('event handler');
  });

  it('rejects a slash separated event handler', () => {
    // `<img src=x /onerror=...>` is two attributes for the browser.
    const result = validateRemediation('<img src="x.jpg" /onerror="globalThis.__pwned=1" alt="A">');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('event handler');
  });

  it('rejects an entity encoded javascript: URI', () => {
    const result = validateRemediation('<a href="&#106;avascript:globalThis.__pwned=1" aria-label="safe">safe</a>');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('active URI scheme');
  });

  it('rejects a full screen overlay style', () => {
    const result = validateRemediation(
      '<img src="x" alt="A" style="position:fixed;inset:0;width:100vw;height:100vh;z-index:999999">'
    );
    expect(result.valid).toBe(false);
  });

  it('rejects an overlay style hidden behind CSS escapes', () => {
    // The browser decodes the escapes before it reads the declaration, so the
    // check has to see the decoded form.
    const result = validateRemediation(
      '<img src="x" alt="A" style="p\\6fsition:fixed;l\\65 ft:0;t\\6fp:0;z-\\69 ndex:2147483647;width:100%;height:100%">'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('overlay-capable');
  });

  it('rejects an overlay style hidden behind a CSS comment', () => {
    // A comment is whitespace to the browser: `position/**/:fixed` is the
    // declaration `position: fixed`.
    const result = validateRemediation(
      '<img src="x" alt="A" style="position/**/:fixed;left:0;top:0;z-index:2147483647;width:100%;height:100%">'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('overlay-capable');
  });

  it('rejects an overlay style hidden behind an HTML entity', () => {
    // The browser decodes the attribute value before the CSS is parsed.
    const result = validateRemediation(
      '<img src="x" alt="A" style="position&#58;fixed;left:0;top:0;z-index:2147483647;width:100%;height:100%">'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('overlay-capable');
  });

  it('rejects portal and fencedframe elements', () => {
    expect(validateRemediation('<portal src="http://127.0.0.1:9/x"></portal>').valid).toBe(false);
    expect(validateRemediation('<fencedframe src="http://127.0.0.1:9/x"></fencedframe>').valid).toBe(false);
  });

  it('rejects frame and frameset elements', () => {
    // A frame loads a remote document into the customer's page.
    const result = validateRemediation(
      '<html lang="en"><head></head><frameset><frame src="http://127.0.0.1:9/attacker"></frame></frameset></html>'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('frame');
  });

  it('allows ordinary https and mailto URIs', () => {
    expect(validateRemediation('<a href="https://example.com/about">About</a>').valid).toBe(true);
    expect(validateRemediation('<a href="mailto:team@example.com">Mail</a>').valid).toBe(true);
    expect(validateRemediation('<a href="/about">About</a>').valid).toBe(true);
  });

  it('rejects a script tag in any spelling', () => {
    expect(validateRemediation('<img src="x" alt="A"><script/x>evil()</script>').valid).toBe(false);
    expect(validateRemediation('<img src="x" alt="A">< script >evil()</script>').valid).toBe(false);
    expect(validateRemediation('<SCRIPT>evil()</SCRIPT>').valid).toBe(false);
  });

  it('rejects unquoted javascript: URIs', () => {
    expect(validateRemediation('<a href=javascript:alert(1)>x</a>').valid).toBe(false);
    expect(validateRemediation('<a href="javascript :alert(1)">x</a>').valid).toBe(false);
  });

  it('rejects data:text/html URIs', () => {
    expect(validateRemediation('<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>').valid).toBe(false);
  });

  it('rejects event handlers written with spaces around the equals sign', () => {
    const result = validateRemediation(
      '<img src="x.jpg" onerror = "alert(1)" alt="desc">',
      '<img src="x.jpg">'
    );
    expect(result.valid).toBe(false);
  });

  it('rejects active and embedding elements', () => {
    expect(validateRemediation('<iframe src="http://evil.example"></iframe>').valid).toBe(false);
    expect(validateRemediation('<object data="x"></object>').valid).toBe(false);
    expect(validateRemediation('<svg onload="x()"></svg>').valid).toBe(false);
    expect(validateRemediation('<style>body{}</style>').valid).toBe(false);
    expect(validateRemediation('<link rel="stylesheet" href="http://evil.example/x.css">').valid).toBe(false);
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

  it('patches the nth occurrence of the same element', () => {
    const original = '<html><body><img src="a.jpg"><img src="a.jpg"></body></html>';
    const result = applyFixesToFile(original, [
      { ruleId: 'image-alt', elementHtml: '<img src="a.jpg">', remediationCode: '<img src="a.jpg" alt="First">' },
      { ruleId: 'image-alt', elementHtml: '<img src="a.jpg">', remediationCode: '<img src="a.jpg" alt="Second">' },
    ], 'index.html');

    expect(result.fixesApplied).toBe(2);
    expect(result.content).toContain('alt="First"');
    expect(result.content).toContain('alt="Second"');
  });

  it('does not patch the first of two identical elements when only one was selected', () => {
    // The fixes are matched to the occurrences in order, so the mapping to a
    // specific occurrence is only provable when every occurrence is covered.
    const original = '<html><body><img src="same.jpg"><img src="same.jpg"></body></html>';
    const result = applyFixesToFile(original, [
      { ruleId: 'image-alt', elementHtml: '<img src="same.jpg">', remediationCode: '<img src="same.jpg" alt="A">' },
    ], 'index.html');

    expect(result.fixesApplied).toBe(0);
    expect(result.content).toContain('<img src="same.jpg"><img src="same.jpg">');
  });

  it('neutralizes a comment terminator in untrusted text', () => {
    const result = applyFixesToFile('<html><body></body></html>', [
      {
        ruleId: 'image-alt',
        elementHtml: '<img src="missing.jpg">',
        remediationCode: '<img src="missing.jpg" alt="A">',
        description: 'evil --> <script>alert(1)</script>',
      },
    ], 'index.html');

    expect(result.fixesApplied).toBe(0);
    expect(result.content).not.toContain('--><script>');
  });

  it('patches two different elements of the same rule independently', () => {
    const original = '<html><body><img src="a.jpg"><img src="b.jpg"></body></html>';
    const result = applyFixesToFile(original, [
      { ruleId: 'image-alt', elementHtml: '<img src="a.jpg">', remediationCode: '<img src="a.jpg" alt="A">' },
      { ruleId: 'image-alt', elementHtml: '<img src="b.jpg">', remediationCode: '<img src="b.jpg" alt="B">' },
    ], 'index.html');

    expect(result.fixesApplied).toBe(2);
    expect(result.content).toContain('src="a.jpg" alt="A"');
    expect(result.content).toContain('src="b.jpg" alt="B"');
  });

  it('rejects a fix that still contains a placeholder', () => {
    const original = '<html><body><img src="a.jpg"></body></html>';
    const result = applyFixesToFile(original, [
      { ruleId: 'image-alt', elementHtml: '<img src="a.jpg">', remediationCode: '<img src="a.jpg" alt="TODO: describe">' },
    ], 'index.html');

    expect(result.fixesApplied).toBe(0);
    expect(result.errors[0]).toContain('placeholder');
  });

  it('does not count an unchanged file as a fix', () => {
    const original = '<html><body><img src="a.jpg" alt="A"></body></html>';
    const result = applyFixesToFile(original, [
      { ruleId: 'image-alt', elementHtml: '<img src="a.jpg" alt="A">', remediationCode: '<img src="a.jpg" alt="A">' },
    ], 'index.html');

    expect(result.fixesApplied).toBe(0);
    expect(result.errors[0]).toContain('no-op');
  });

  it('patches a JSX element through the AST even when the DOM HTML differs', () => {
    const original = 'export const Card = () => <img src="hero.jpg" />;';
    const result = applyFixesToFile(original, [
      { ruleId: 'image-alt', elementHtml: '<img src="hero.jpg">', remediationCode: '<img src="hero.jpg" alt="Hero">' },
    ], 'Card.tsx');

    expect(result.fixesApplied).toBe(1);
    expect(result.content).toBe('export const Card = () => <img src="hero.jpg" alt="Hero" />;');
  });

  it('discards a patch that would break the file', () => {
    const original = 'export const Card = () => <img src="hero.jpg" />;';
    const result = applyFixesToFile(original, [
      { ruleId: 'image-alt', elementHtml: '<img src="hero.jpg">', remediationCode: '<img src="hero.jpg" alt="x">}' },
    ], 'Card.tsx');

    expect(result.fixesApplied).toBe(0);
    expect(result.errors[0]).toContain('no longer parses');
  });

  it('rejects a patch that deletes the visible text of the element', () => {
    const original = '<html><body><a href="/about">Read more</a></body></html>';
    const result = applyFixesToFile(original, [
      {
        ruleId: 'link-name',
        elementHtml: '<a href="/about">Read more</a>',
        remediationCode: '<a href="/about" aria-label="Read more"></a>',
      },
    ], 'index.html');

    expect(result.fixesApplied).toBe(0);
    expect(result.errors[0]).toContain('visible text');
    expect(result.content).toContain('Read more');
  });

  it('rejects a JSX patch that deletes the visible text of the element', () => {
    const original = 'export const Card = () => <a href="/about">Read more</a>;';
    const result = applyFixesToFile(original, [
      {
        ruleId: 'link-name',
        elementHtml: '<a href="/about">Read more</a>',
        remediationCode: '<a href="/about" aria-label="Read more"></a>',
      },
    ], 'Card.tsx');

    expect(result.fixesApplied).toBe(0);
    expect(result.errors[0]).toContain('visible text');
    expect(result.content).toContain('Read more');
  });

  it('allows a patch that replaces the text with different text', () => {
    const original = '<html><body><a href="/about">click here</a></body></html>';
    const result = applyFixesToFile(original, [
      {
        ruleId: 'link-name',
        elementHtml: '<a href="/about">click here</a>',
        remediationCode: '<a href="/about">About our team</a>',
      },
    ], 'index.html');

    expect(result.fixesApplied).toBe(1);
    expect(result.content).toContain('About our team');
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


