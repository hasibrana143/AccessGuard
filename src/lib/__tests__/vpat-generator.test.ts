import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { VPAT_CONFORMANCE_LABELS } from '@/lib/vpat-generator';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  manualCheckFindMany: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    violation: { findMany: mocks.findMany },
    manualCheck: { findMany: mocks.manualCheckFindMany },
  },
}));

import { generateVPATData } from '@/lib/vpat-generator';

const PDF_ROUTE = path.resolve(__dirname, '../../app/api/reports/vpat/route.tsx');

describe('VPAT conformance labels', () => {
  it('calls an unevaluated criterion "Not Evaluated"', () => {
    expect(VPAT_CONFORMANCE_LABELS['not-evaluated']).toBe('Not Evaluated');
  });

  it('keeps the other labels explicit', () => {
    expect(VPAT_CONFORMANCE_LABELS.supports).toBe('Supports');
    expect(VPAT_CONFORMANCE_LABELS['partially-supports']).toBe('Partially Supports');
    expect(VPAT_CONFORMANCE_LABELS['does-not-support']).toBe('Does Not Support');
  });
});

describe('VPAT PDF route truth', () => {
  const source = fs.readFileSync(PDF_ROUTE, 'utf8');

  it('never claims a criterion is "Not Applicable"', () => {
    expect(source).not.toContain('Not Applicable');
    expect(source).not.toContain('N/A');
  });

  it('labels the document as a draft that needs human review', () => {
    expect(source).toContain('human review required');
  });

  it('renders the remarks column and reuses the shared generator', () => {
    expect(source).toContain('Remarks');
    expect(source).toContain('generateVPATData');
    expect(source).toContain('VPAT_CONFORMANCE_LABELS');
  });
});

describe('generateVPATData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.manualCheckFindMany.mockResolvedValue([]);
  });

  it('reports every criterion as not evaluated when nothing was scanned', async () => {
    mocks.findMany.mockResolvedValue([]);

    const vpat = await generateVPATData('project-1');

    expect(vpat.criteria.every(c => c.conformance === 'not-evaluated')).toBe(true);
    expect(vpat.summary.notEvaluated).toBe(vpat.criteria.length);
    expect(vpat.summary.supports).toBe(0);
    expect(vpat.summary.partiallySupports).toBe(0);
    expect(vpat.summary.doesNotSupport).toBe(0);
  });

  it('never claims full support for a criterion that still has a violation', async () => {
    mocks.findMany.mockResolvedValue([{ wcagCriteria: '1.1.1', severity: 'minor' }]);

    const vpat = await generateVPATData('project-1');
    const criterion = vpat.criteria.find(c => c.id === '1.1.1');

    expect(criterion?.conformance).toBe('partially-supports');
    expect(criterion?.remarks).toContain('violation');
  });

  it('reports critical violations as not supported', async () => {
    mocks.findMany.mockResolvedValue([{ wcagCriteria: '1.1.1', severity: 'critical' }]);

    const vpat = await generateVPATData('project-1');
    const criterion = vpat.criteria.find(c => c.id === '1.1.1');

    expect(criterion?.conformance).toBe('does-not-support');
  });

  it('lets a manual check override the automated result', async () => {
    mocks.findMany.mockResolvedValue([{ wcagCriteria: '1.1.1', severity: 'minor' }]);
    mocks.manualCheckFindMany.mockResolvedValue([
      { checkId: '1.1.1', status: 'pass', notes: 'Checked manually' },
    ]);

    const vpat = await generateVPATData('project-1');
    const criterion = vpat.criteria.find(c => c.id === '1.1.1');

    expect(criterion?.conformance).toBe('supports');
    expect(criterion?.remarks).toContain('Manual check: PASS');
  });
});
