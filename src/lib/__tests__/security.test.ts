import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { encryptMfaSecret, readMfaSecret, verifyMfaCode } from '@/lib/mfa';
import { getPlanLimits, checkPagesLimit } from '@/lib/plan-limits';
import { db } from '@/lib/db';
import { generateSecret, generateSync } from 'otplib';

describe('mfa secret encryption', () => {
  it('encrypts secrets at rest with v1 prefix', () => {
    const stored = encryptMfaSecret('JBSWY3DPEHPK3PXP');
    expect(stored.startsWith('v1:')).toBe(true);
    expect(stored).not.toContain('JBSWY3DPEHPK3PXP');
  });

  it('round-trips through readMfaSecret', () => {
    const stored = encryptMfaSecret('KRSXG5CTMVRXEZLU');
    expect(readMfaSecret(stored)).toBe('KRSXG5CTMVRXEZLU');
  });

  it('returns null for non-encrypted / garbage input', () => {
    expect(readMfaSecret('plaintext-secret')).toBeNull();
    expect(readMfaSecret(null)).toBeNull();
  });

  it('produces different ciphertexts for the same secret (random IV)', () => {
    const a = encryptMfaSecret('JBSWY3DPEHPK3PXP');
    const b = encryptMfaSecret('JBSWY3DPEHPK3PXP');
    expect(a).not.toBe(b);
    expect(readMfaSecret(a)).toBe(readMfaSecret(b));
  });

  it('still verifies TOTP codes after encryption round-trip', async () => {
    const secret = await generateSecret();
    const token = await generateSync({ secret });
    const stored = encryptMfaSecret(secret);
    expect(verifyMfaCode(readMfaSecret(stored) || '', token)).toBe(true);
    expect(verifyMfaCode(readMfaSecret(stored) || '', '000000')).toBe(false);
  });
});

describe('plan limits', () => {
  it('applies settings overrides', () => {
    const limits = getPlanLimits('agency', JSON.stringify({ planLimits: { websites: 3, pagesPerMonth: 100 } }));
    expect(limits.websites).toBe(3);
    expect(limits.pagesPerMonth).toBe(100);
  });

  it('falls back to plan defaults when settings are malformed', () => {
    expect(getPlanLimits('agency', 'not-json').pagesPerMonth).toBe(25000);
    expect(getPlanLimits('agency', null).pagesPerMonth).toBe(25000);
  });

  it('unlimited plan returns unlimited', async () => {
    const org = await db.organization.upsert({
      where: { slug: 'limits-test' },
      create: { slug: 'limits-test', name: 'Limits Test', plan: 'enterprise' },
      update: {},
    });
    const check = await checkPagesLimit(org.id, 'enterprise');
    expect(check.allowed).toBe(true);
    expect(check.limit).toBe(Infinity);
    await db.organization.delete({ where: { id: org.id } });
  });

  it('blocks when monthly pages used exceed limit', async () => {
    const org = await db.organization.upsert({
      where: { slug: 'limits-test-2' },
      create: { slug: 'limits-test-2', name: 'Limits Test 2', plan: 'free' },
      update: {},
    });
    const project = await db.project.create({
      data: { name: 'Limits Project', url: 'https://limits.example.com', orgId: org.id },
    });
    await db.scan.create({ data: { projectId: project.id, status: 'completed', pagesScanned: 500, violationsFound: 0 } });

    const check = await checkPagesLimit(org.id, 'free');
    expect(check.allowed).toBe(false);
    expect(check.current).toBeGreaterThanOrEqual(500);

    const checkAgency = await checkPagesLimit(org.id, 'agency');
    expect(checkAgency.allowed).toBe(true);

    await db.scan.deleteMany({ where: { projectId: project.id } });
    await db.project.delete({ where: { id: project.id } });
    await db.organization.delete({ where: { id: org.id } });
  });
});
