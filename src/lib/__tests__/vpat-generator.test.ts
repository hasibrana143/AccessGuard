import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { VPAT_CONFORMANCE_LABELS } from '@/lib/vpat-generator';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  manualCheckFindMany: vi.fn(),
  projectFindFirst: vi.fn(),
  scanFindFirst: vi.fn(),
  apiKeyAuth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    violation: { findMany: mocks.findMany },
    manualCheck: { findMany: mocks.manualCheckFindMany },
    project: { findFirst: mocks.projectFindFirst },
    scan: { findFirst: mocks.scanFindFirst },
  },
}));

vi.mock('@/lib/api-auth', () => ({
  apiKeyAuth: mocks.apiKeyAuth,
}));

import { generateVPATData } from '@/lib/vpat-generator';
import { GET } from '@/app/api/v1/reports/vpat/route';

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

describe('VPAT API scan isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.apiKeyAuth.mockResolvedValue({
      success: true,
      apiKey: { id: 'key-1', orgId: 'org-1', name: 'Test key', scopes: ['reports:read'] },
    });
    mocks.projectFindFirst.mockResolvedValue({
      id: 'project-1',
      name: 'Project 1',
      url: 'https://example.com',
    });
    mocks.scanFindFirst.mockResolvedValue({ id: 'scan-1' });
    mocks.findMany.mockResolvedValue([]);
    mocks.manualCheckFindMany.mockResolvedValue([]);
  });

  it('returns not found when the scan does not belong to the authorized project', async () => {
    mocks.scanFindFirst.mockResolvedValue(null);

    const response = await GET(new NextRequest(
      'http://localhost:3000/api/v1/reports/vpat?projectId=project-1&scanId=foreign-scan'
    ));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Scan not found' });
    expect(mocks.scanFindFirst).toHaveBeenCalledWith({
      where: { id: 'foreign-scan', projectId: 'project-1' },
      select: { id: true },
    });
    expect(mocks.findMany).not.toHaveBeenCalled();
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

    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { projectId: 'project-1', status: { not: 'fixed' }, deletedAt: null },
      select: { wcagCriteria: true, severity: true },
    });
    expect(vpat.criteria.every(c => c.conformance === 'not-evaluated')).toBe(true);
    expect(vpat.summary.notEvaluated).toBe(vpat.criteria.length);
    expect(vpat.summary.supports).toBe(0);
    expect(vpat.summary.partiallySupports).toBe(0);
    expect(vpat.summary.doesNotSupport).toBe(0);
  });

  it('scopes scan violations to both the project and scan', async () => {
    mocks.findMany.mockResolvedValue([]);

    await generateVPATData('project-1', 'scan-1');

    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { projectId: 'project-1', scanId: 'scan-1' },
      select: { wcagCriteria: true, severity: true },
    });
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

  it('lets a real manual check id override the automated result', async () => {
    mocks.findMany.mockResolvedValue([{ wcagCriteria: '1.1.1', severity: 'minor' }]);
    mocks.manualCheckFindMany.mockResolvedValue([
      { checkId: 'meaningful-alt', status: 'pass', notes: 'Checked manually' },
    ]);

    const vpat = await generateVPATData('project-1');
    const criterion = vpat.criteria.find(c => c.id === '1.1.1');

    expect(criterion?.conformance).toBe('supports');
    expect(criterion?.remarks).toContain('Manual check: PASS');
    expect(criterion?.manualCheckId).toBe('meaningful-alt');
  });

  it('marks a criterion not supported when a real manual check fails', async () => {
    mocks.findMany.mockResolvedValue([]);
    mocks.manualCheckFindMany.mockResolvedValue([
      { checkId: 'keyboard-flow', status: 'fail', notes: 'Keyboard trap found' },
    ]);

    const vpat = await generateVPATData('project-1');
    const criterion = vpat.criteria.find(c => c.id === '2.1.1');

    expect(criterion?.conformance).toBe('does-not-support');
    expect(criterion?.remarks).toContain('Manual check: FAIL');
    expect(criterion?.manualCheckId).toBe('keyboard-flow');
  });

  it('never lets a manual pass clear a critical violation', async () => {
    mocks.findMany.mockResolvedValue([{ wcagCriteria: '1.1.1', severity: 'critical' }]);
    mocks.manualCheckFindMany.mockResolvedValue([
      { checkId: 'meaningful-alt', status: 'pass', notes: 'Checked manually' },
    ]);

    const vpat = await generateVPATData('project-1');
    const criterion = vpat.criteria.find(c => c.id === '1.1.1');

    expect(criterion?.conformance).toBe('does-not-support');
  });
});
