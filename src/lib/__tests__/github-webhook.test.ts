import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyWebhookSignature } from '@/lib/github-webhook';

const SECRET = 'test-webhook-secret';

function sign(payload: string): string {
  return `sha256=${crypto.createHmac('sha256', SECRET).update(payload, 'utf8').digest('hex')}`;
}

describe('verifyWebhookSignature', () => {
  const body = JSON.stringify({ action: 'created', installation: { id: 1 } });

  it('accepts a valid signature', () => {
    expect(verifyWebhookSignature(body, sign(body), SECRET)).toBe(true);
  });

  it('rejects a tampered body', () => {
    expect(verifyWebhookSignature(body + '"', sign(body), SECRET)).toBe(false);
  });

  it('rejects a wrong secret', () => {
    expect(verifyWebhookSignature(body, sign(body), 'other-secret')).toBe(false);
  });

  it('rejects a forged signature', () => {
    expect(verifyWebhookSignature(body, 'sha256=deadbeef', SECRET)).toBe(false);
  });

  it('rejects malformed signatures', () => {
    expect(verifyWebhookSignature(body, 'hmac=abcdef', SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, 'sha256=zz', SECRET)).toBe(false);
  });

  it('returns false when the secret is not configured', () => {
    expect(verifyWebhookSignature(body, sign(body), undefined)).toBe(false);
    expect(verifyWebhookSignature(body, sign(body), '')).toBe(false);
  });

  it('returns false when no signature header is present', () => {
    expect(verifyWebhookSignature(body, null, SECRET)).toBe(false);
  });

  it('is constant-time (no throw on differing lengths)', () => {
    expect(verifyWebhookSignature('a', sign('b'), SECRET)).toBe(false);
  });
});