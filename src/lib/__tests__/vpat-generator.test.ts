import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { VPAT_CONFORMANCE_LABELS } from '@/lib/vpat-generator';

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
