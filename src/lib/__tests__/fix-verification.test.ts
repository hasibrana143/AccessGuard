import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import {
  MIN_FIX_CONFIDENCE,
  MAX_FIXES_PER_PR,
  buildVerificationDocument,
  checkRenderedElement,
  createVerificationContext,
  passesConfidenceGate,
  resolveChromiumExecutable,
  selectVerifiedFixes,
  verdictToResult,
  verifyFixes,
  type FixVerificationResult,
  type RuleVerdict,
} from '@/lib/fix-verification';

function browserAvailable(): boolean {
  try {
    const bundled = chromium.executablePath();
    if (bundled && fs.existsSync(bundled)) return true;
  } catch {
    // Playwright browser not installed, fall through to the system browser.
  }
  return !!resolveChromiumExecutable();
}

describe('confidence gate', () => {
  it('never lets an unknown confidence through', () => {
    expect(passesConfidenceGate(null)).toBe(false);
  });

  it('rejects a confidence below the gate and accepts one at the gate', () => {
    expect(passesConfidenceGate(0.5)).toBe(false);
    expect(passesConfidenceGate(MIN_FIX_CONFIDENCE)).toBe(true);
    expect(passesConfidenceGate(1)).toBe(true);
  });
});

describe('verdictToResult', () => {
  it('maps a rule that still fires to failed with confidence 0', () => {
    const result = verdictToResult({ fired: true, evaluated: true });
    expect(result.status).toBe('failed');
    expect(result.confidence).toBe(0);
  });

  it('maps a rule that cannot be evaluated to unverified with no confidence', () => {
    const result = verdictToResult({ fired: false, evaluated: false });
    expect(result.status).toBe('unverified');
    expect(result.confidence).toBeNull();
    expect(passesConfidenceGate(result.confidence)).toBe(false);
  });

  it('maps a clean rule to verified', () => {
    const result = verdictToResult({ fired: false, evaluated: true });
    expect(result.status).toBe('verified');
    expect(result.confidence).toBe(1);
  });
});

describe('verifyFixes', () => {
  it('records a failing verification as confidence 0', async () => {
    const results = await verifyFixes(
      [{ id: 'v1', ruleId: 'image-alt', remediationCode: '<img src="a.jpg" alt="A">' }],
      async (): Promise<RuleVerdict> => ({ fired: true, evaluated: true })
    );
    expect(results.get('v1')?.status).toBe('failed');
    expect(results.get('v1')?.confidence).toBe(0);
  });

  it('rejects a fix that cannot address the rule before it is verified', async () => {
    const rendered: string[] = [];
    const results = await verifyFixes(
      [{ id: 'v1', ruleId: 'image-alt', remediationCode: '<img src="a.jpg">' }],
      async (code): Promise<RuleVerdict> => {
        rendered.push(code);
        return { fired: false, evaluated: true };
      }
    );
    expect(rendered).toEqual([]);
    expect(results.get('v1')?.status).toBe('unverified');
    expect(results.get('v1')?.reason).toContain('rejected before verification');
  });

  it('records a verified fix with full confidence', async () => {
    const results = await verifyFixes(
      [{ id: 'v1', ruleId: 'image-alt', remediationCode: '<img src="a.jpg" alt="A">' }],
      async (): Promise<RuleVerdict> => ({ fired: false, evaluated: true })
    );
    expect(results.get('v1')?.status).toBe('verified');
    expect(passesConfidenceGate(results.get('v1')?.confidence ?? null)).toBe(true);
  });

  it('marks a fix unverified when the runner cannot run', async () => {
    const results = await verifyFixes(
      [{ id: 'v1', ruleId: 'image-alt', remediationCode: '<img src="a.jpg" alt="A">' }],
      async () => {
        throw new Error('browser unavailable');
      }
    );
    expect(results.get('v1')?.status).toBe('unverified');
    expect(results.get('v1')?.confidence).toBeNull();
    expect(passesConfidenceGate(results.get('v1')?.confidence ?? null)).toBe(false);
  });

  it('never renders a candidate that fails the safety checks', async () => {
    const rendered: string[] = [];
    const results = await verifyFixes(
      [
        { id: 'v1', ruleId: 'image-alt', remediationCode: '<img src="a.jpg" alt="A">' },
        {
          id: 'v2',
          ruleId: 'image-alt',
          elementHtml: '<img src="a.jpg">',
          remediationCode: '<img src="a.jpg" alt="A" onerror="this.remove()">',
        },
        {
          id: 'v3',
          ruleId: 'image-alt',
          elementHtml: '<img src="a.jpg">',
          remediationCode: '<img src="a.jpg" alt="A"><script/x>evil()</script>',
        },
      ],
      async (code): Promise<RuleVerdict> => {
        rendered.push(code);
        return { fired: false, evaluated: true };
      }
    );

    // Only the safe candidate reached the runner.
    expect(rendered).toEqual(['<img src="a.jpg" alt="A">']);
    expect(results.get('v2')?.status).toBe('unverified');
    expect(results.get('v2')?.reason).toContain('rejected before verification');
    expect(results.get('v3')?.status).toBe('unverified');
  });

  it('maps an unknown rule to unverified', async () => {
    const results = await verifyFixes(
      [{ id: 'v1', ruleId: 'not-a-real-rule', remediationCode: '<img src="a.jpg" alt="A">' }],
      async (): Promise<RuleVerdict> => ({ fired: false, evaluated: false, detail: 'unknown rule' })
    );
    expect(results.get('v1')?.status).toBe('unverified');
    expect(passesConfidenceGate(results.get('v1')?.confidence ?? null)).toBe(false);
  });

  it('keeps a mixed batch independent', async () => {
    const results = await verifyFixes(
      [
        { id: 'ok', ruleId: 'image-alt', remediationCode: '<img src="a.jpg" alt="A">' },
        { id: 'bad', ruleId: 'image-alt', remediationCode: '<img src="a.jpg" alt="B">' },
      ],
      async (code): Promise<RuleVerdict> =>
        code.includes('alt="B"')
          ? { fired: true, evaluated: true }
          : { fired: false, evaluated: true }
    );
    expect(results.get('ok')?.status).toBe('verified');
    expect(results.get('bad')?.status).toBe('failed');
  });
});

describe('selectVerifiedFixes', () => {
  const verified = (id: string): [string, FixVerificationResult] => [
    id,
    { status: 'verified', confidence: 1, reason: 'ok' },
  ];

  const candidate = (id: string, remediationCode = '<img src="a.jpg" alt="A">') => ({
    id,
    ruleId: 'image-alt',
    elementHtml: '<img src="a.jpg">',
    remediationCode,
  });

  it('keeps only verified fixes', () => {
    const verification = new Map([verified('v1')]);
    const selection = selectVerifiedFixes([candidate('v1'), candidate('v2')], verification);

    expect(selection.eligibleIds).toEqual(['v1']);
    expect(selection.skippedUnverified).toBe(1);
  });

  it('counts a fix that failed verification as low confidence', () => {
    const verification = new Map<string, FixVerificationResult>([
      ['v1', { status: 'failed', confidence: 0, reason: 'still fires' }],
    ]);
    const selection = selectVerifiedFixes([candidate('v1')], verification);

    expect(selection.eligibleIds).toEqual([]);
    expect(selection.skippedLowConfidence).toBe(1);
    expect(selection.skippedUnverified).toBe(0);
  });

  it('rejects a fix that fails the safety or rule checks before it is verified', () => {
    const verification = new Map([verified('v1'), verified('v2')]);
    const selection = selectVerifiedFixes(
      [
        candidate('v1'),
        candidate('v2', '<img src="a.jpg"><script>evil()</script>'),
        candidate('v3', '<img src="a.jpg" alt="TODO: describe">'),
      ],
      verification
    );

    expect(selection.eligibleIds).toEqual(['v1']);
    expect(selection.skippedInvalid).toBe(2);
  });

  it('caps the batch and reports the overflow', () => {
    const many = Array.from({ length: MAX_FIXES_PER_PR + 3 }, (_, i) => candidate(`v${i}`));
    const verification = new Map(many.map(c => verified(c.id)));
    const selection = selectVerifiedFixes(many, verification);

    expect(selection.eligibleIds).toHaveLength(MAX_FIXES_PER_PR);
    expect(selection.skippedOverLimit).toBe(3);
  });

  it('ignores violations that carry no remediation at all', () => {
    const selection = selectVerifiedFixes(
      [{ id: 'v1', ruleId: 'image-alt', elementHtml: '<img>', remediationCode: null }],
      new Map()
    );
    expect(selection.eligibleIds).toEqual([]);
    expect(selection.skippedInvalid).toBe(0);
  });
});

// Real browser evidence. Skipped when no Chromium is reachable (documented in
// .ai/TEST-STATUS.md); CI installs Chromium before the unit suite for this reason.
// The timeout is raised because the first Chromium launch on a cold CI runner
// takes longer than Vitest's 10 s default (the verification itself has its own
// 15 s deadline inside the product code).
const BROWSER_TEST_TIMEOUT = 60_000;

describe.skipIf(!browserAvailable())('verifyFixes with a real browser', () => {
  it('verifies a fix that adds alt text', async () => {
    const results = await verifyFixes([
      { id: 'v1', ruleId: 'image-alt', remediationCode: '<img src="hero.jpg" alt="A team photo">' },
    ]);
    expect(results.get('v1')?.status).toBe('verified');
    expect(results.get('v1')?.confidence).toBe(1);
  }, BROWSER_TEST_TIMEOUT);

  it('rejects a fix that leaves the image without alt text before rendering it', async () => {
    const results = await verifyFixes([
      { id: 'v2', ruleId: 'image-alt', remediationCode: '<img src="hero.jpg">' },
    ]);
    expect(results.get('v2')?.status).toBe('unverified');
    expect(results.get('v2')?.confidence).toBeNull();
    expect(passesConfidenceGate(results.get('v2')?.confidence ?? null)).toBe(false);
  }, BROWSER_TEST_TIMEOUT);

  it('rejects a link fix that leaves the link without an accessible name', async () => {
    const results = await verifyFixes([
      { id: 'v3', ruleId: 'link-name', remediationCode: '<a href="/about"></a>' },
    ]);
    expect(results.get('v3')?.status).toBe('unverified');
    expect(passesConfidenceGate(results.get('v3')?.confidence ?? null)).toBe(false);
  }, BROWSER_TEST_TIMEOUT);

  it('fails a fix whose alt text is only whitespace', async () => {
    const results = await verifyFixes([
      { id: 'v4', ruleId: 'image-alt', remediationCode: '<img src="hero.jpg" alt=" ">' },
    ]);
    expect(results.get('v4')?.status).toBe('failed');
    expect(results.get('v4')?.confidence).toBe(0);
  }, BROWSER_TEST_TIMEOUT);

  it('never renders a candidate that injects an event handler', async () => {
    const results = await verifyFixes([
      {
        id: 'v5',
        ruleId: 'image-alt',
        elementHtml: '<img src="hero.jpg">',
        remediationCode: '<img src="hero.jpg" alt="A" onerror="document.title=\'pwned\'">',
      },
    ]);
    expect(results.get('v5')?.status).toBe('unverified');
    expect(results.get('v5')?.reason).toContain('rejected before verification');
  }, BROWSER_TEST_TIMEOUT);

  it('rejects a candidate that carries a handler the scanned page already had', async () => {
    const results = await verifyFixes([
      {
        id: 'v6',
        ruleId: 'image-alt',
        elementHtml: '<img src="hero.jpg" onerror="globalThis.__pwned=1">',
        remediationCode: '<img src="hero.jpg" onerror="globalThis.__pwned=1" alt="A">',
      },
    ]);
    expect(results.get('v6')?.status).toBe('unverified');
    expect(results.get('v6')?.reason).toContain('rejected before verification');
  }, BROWSER_TEST_TIMEOUT);

  it('rejects a candidate whose URI scheme is only active after decoding', async () => {
    const results = await verifyFixes([
      {
        id: 'v7',
        ruleId: 'link-name',
        elementHtml: '<a href="/about">Read more</a>',
        remediationCode: '<a href="&#106;avascript:globalThis.__pwned=1" aria-label="safe">Read more</a>',
      },
    ]);
    expect(results.get('v7')?.status).toBe('unverified');
    expect(results.get('v7')?.reason).toContain('rejected before verification');
  }, BROWSER_TEST_TIMEOUT);

  it('fails a fix that hides the visible text of the element', async () => {
    const results = await verifyFixes([
      {
        id: 'v8',
        ruleId: 'link-name',
        elementHtml: '<a href="/about">Read more</a>',
        remediationCode: '<a href="/about" aria-label="Read more"><span hidden>Read more</span></a>',
      },
    ]);
    expect(results.get('v8')?.status).toBe('failed');
    expect(results.get('v8')?.confidence).toBe(0);
    expect(results.get('v8')?.reason).toContain('visible text');
  }, BROWSER_TEST_TIMEOUT);

  it('fails a fix whose text the user cannot see', async () => {
    // The text is read from the computed style, not from `innerText`: text that
    // is transparent or not rendered is still part of `innerText`.
    const results = await verifyFixes([
      {
        id: 'v9',
        ruleId: 'link-name',
        elementHtml: '<a href="/about">Read more</a>',
        remediationCode: '<a href="/about" aria-label="Read more"><span style="visibility:hidden">Read more</span></a>',
      },
    ]);
    expect(results.get('v9')?.status).toBe('failed');
    expect(results.get('v9')?.confidence).toBe(0);
    expect(results.get('v9')?.reason).toContain('visible text');
  }, BROWSER_TEST_TIMEOUT);

  it('catches a patched element that the browser hides', async () => {
    // The computed style is the browser's own answer: the check does not
    // depend on how the hiding was written.
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await createVerificationContext(browser);
      const page = await context.newPage();

      for (const markup of [
        '<img src="a.jpg" alt="A" hidden>',
        '<img src="a.jpg" alt="A" style="display:none">',
        '<img src="a.jpg" alt="A" style="visibility:hidden">',
      ]) {
        await page.setContent(buildVerificationDocument(markup));
        expect(await checkRenderedElement(page)).toContain('hidden');
      }

      await page.setContent(buildVerificationDocument('<img src="a.jpg" alt="A">'));
      expect(await checkRenderedElement(page)).toBeNull();
    } finally {
      await browser.close();
    }
  }, BROWSER_TEST_TIMEOUT);

  it('catches a patched element whose text the browser cannot show', async () => {
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await createVerificationContext(browser);
      const page = await context.newPage();

      await page.setContent(
        buildVerificationDocument('<a href="/about" style="color:transparent">Read more</a>')
      );
      expect(await checkRenderedElement(page)).toContain('transparent');

      await page.setContent(
        buildVerificationDocument('<a href="/about">Read more</a>')
      );
      expect(await checkRenderedElement(page)).toBeNull();
    } finally {
      await browser.close();
    }
  }, BROWSER_TEST_TIMEOUT);

  it('catches a patched element the browser paints nowhere', async () => {
    // The computed style is the browser's own answer: a zero-size text, an
    // unpainted element and an element moved off-screen are all invisible.
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await createVerificationContext(browser);
      const page = await context.newPage();

      for (const style of [
        'font-size:0;line-height:0;overflow:hidden',
        'content-visibility:hidden',
        'translate:-9999px',
        'filter:opacity(0)',
        'scale:0',
      ]) {
        await page.setContent(
          buildVerificationDocument(`<a href="/about" style="${style}">Read more</a>`)
        );
        expect(await checkRenderedElement(page)).not.toBeNull();
      }

      await page.setContent(buildVerificationDocument('<a href="/about">Read more</a>'));
      expect(await checkRenderedElement(page)).toBeNull();
    } finally {
      await browser.close();
    }
  }, BROWSER_TEST_TIMEOUT);

  it('never lets a fix through that hides the text of the element', async () => {
    const results = await verifyFixes([
      {
        id: 'v10',
        ruleId: 'link-name',
        elementHtml: '<a href="/about">Read more</a>',
        remediationCode:
          '<a href="/about" aria-label="About us" style="font-size:0;line-height:0;overflow:hidden">Read more</a>',
      },
    ]);
    expect(passesConfidenceGate(results.get('v10')?.confidence ?? null)).toBe(false);
  }, BROWSER_TEST_TIMEOUT);

  it('never lets the verification document open a WebSocket', async () => {
    let upgrades = 0;
    const server = createServer();
    server.on('upgrade', (_request, socket) => {
      upgrades++;
      socket.destroy();
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    try {
      const browser = await chromium.launch({ headless: true });
      try {
        const context = await createVerificationContext(browser);
        const page = await context.newPage();
        await page.setContent(buildVerificationDocument('<p>hello</p>'));

        await page.evaluate(async (url) => {
          try {
            const socket = new WebSocket(url);
            await new Promise(resolve => setTimeout(resolve, 500));
            socket.close();
          } catch {
            // A blocked connection throws in the page: that is the expected result.
          }
        }, `ws://127.0.0.1:${port}/internal`);

        expect(upgrades).toBe(0);
      } finally {
        await browser.close();
      }
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  }, BROWSER_TEST_TIMEOUT);

  it('never lets the verification document make an HTTP request', async () => {
    let hits = 0;
    const server = createServer((_request, response) => {
      hits++;
      response.end('ok');
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    try {
      const browser = await chromium.launch({ headless: true });
      try {
        const context = await createVerificationContext(browser);
        const page = await context.newPage();
        await page.setContent(
          buildVerificationDocument(`<img src="http://127.0.0.1:${port}/pixel.png" alt="A">`)
        );
        await page.waitForTimeout(500);

        expect(hits).toBe(0);
      } finally {
        await browser.close();
      }
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  }, BROWSER_TEST_TIMEOUT);
});
