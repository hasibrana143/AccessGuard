import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { chromium } from 'playwright';
import {
  MIN_FIX_CONFIDENCE,
  passesConfidenceGate,
  resolveChromiumExecutable,
  verdictToResult,
  verifyFixes,
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
      [{ id: 'v1', ruleId: 'image-alt', remediationCode: '<img src="a.jpg">' }],
      async (): Promise<RuleVerdict> => ({ fired: true, evaluated: true })
    );
    expect(results.get('v1')?.status).toBe('failed');
    expect(results.get('v1')?.confidence).toBe(0);
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
});

// Real browser evidence. Skipped when no Chromium is reachable (documented in
// .ai/TEST-STATUS.md); CI installs Chromium before the unit suite for this reason.
describe.skipIf(!browserAvailable())('verifyFixes with a real browser', () => {
  it('verifies a fix that adds alt text', async () => {
    const results = await verifyFixes([
      { id: 'v1', ruleId: 'image-alt', remediationCode: '<img src="hero.jpg" alt="A team photo">' },
    ]);
    expect(results.get('v1')?.status).toBe('verified');
    expect(results.get('v1')?.confidence).toBe(1);
  });

  it('fails a fix that leaves the image without alt text', async () => {
    const results = await verifyFixes([
      { id: 'v2', ruleId: 'image-alt', remediationCode: '<img src="hero.jpg">' },
    ]);
    expect(results.get('v2')?.status).toBe('failed');
    expect(results.get('v2')?.confidence).toBe(0);
  });

  it('fails a link fix that leaves the link without an accessible name', async () => {
    const results = await verifyFixes([
      { id: 'v3', ruleId: 'link-name', remediationCode: '<a href="/about"></a>' },
    ]);
    expect(results.get('v3')?.status).toBe('failed');
  });
});
