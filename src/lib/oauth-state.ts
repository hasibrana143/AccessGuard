import crypto from 'crypto';

/**
 * Sign a value so it cannot be forged or tampered with. Used for OAuth
 * `state` round-trip validation (CSRF + account-binding).
 */
function getSignature(payload: string): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.OAUTH_STATE_SECRET;
  if (!secret) {
    throw new Error('OAuth state signing secret is not configured (set NEXTAUTH_SECRET or OAUTH_STATE_SECRET)');
  }
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

export function signOAuthState(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${getSignature(body)}`;
}

export function verifyOAuthState(state: string): Record<string, unknown> | null {
  if (!state || typeof state !== 'string') return null;
  const parts = state.split('.');
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  const expected = getSignature(body);
  const received = Buffer.from(String(signature).replace(/-/g, '+').replace(/_/g, '/')).toString('base64');
  const expectedBuf = Buffer.from(expected.replace(/-/g, '+').replace(/_/g, '/'));
  if (Buffer.byteLength(received) !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(received), expectedBuf)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString());
  } catch {
    return null;
  }
}