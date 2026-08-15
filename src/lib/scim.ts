import { randomBytes, timingSafeEqual } from 'crypto';
import { db } from './db';
import { encryptSecret, decryptSecret, isEncrypted } from './crypto';

/**
 * SCIM 2.0 (RFC 7644) support — token generation/validation.
 *
 * The SCIM bearer token is stored per-org inside `Organization.settings`
 * (AES-GCM encrypted, same pattern as the API key). Every org has at most
 * one active SCIM token at a time.
 */

const TOKEN_PREFIX = 'ag_scim_';

export function generateScimToken(): string {
  return `${TOKEN_PREFIX}${randomBytes(24).toString('hex')}`;
}

function maskToken(token: string): string {
  return `${token.slice(0, 10)}${'•'.repeat(16)}${token.slice(-4)}`;
}

export async function setScimToken(orgId: string): Promise<{ token: string; maskedToken: string }> {
  const token = generateScimToken();
  const org = await db.organization.findUnique({ where: { id: orgId }, select: { settings: true } });
  const settings = org?.settings ? (JSON.parse(org.settings) as Record<string, unknown>) : {};
  settings.scimToken = encryptSecret(token);
  await db.organization.update({
    where: { id: orgId },
    data: { settings: JSON.stringify(settings) },
  });
  return { token, maskedToken: maskToken(token) };
}

/** Resolve a bearer token to an org id. Returns null when invalid/unknown. */
export async function resolveScimToken(token: string): Promise<string | null> {
  if (!token.startsWith(TOKEN_PREFIX)) return null;

  const orgs = await db.organization.findMany({
    select: { id: true, settings: true },
  });

  const tokenBuf = Buffer.from(token);
  for (const org of orgs) {
    const settings = org.settings ? (JSON.parse(org.settings) as Record<string, unknown>) : {};
    const stored: unknown = settings.scimToken;
    if (typeof stored !== 'string') continue;
    const plain = isEncrypted(stored) ? (decryptSecret(stored) ?? null) : stored;
    if (plain === null) continue;
    const storedBuf = Buffer.from(plain);
    if (storedBuf.length === tokenBuf.length && timingSafeEqual(storedBuf, tokenBuf)) {
      return org.id;
    }
  }
  return null;
}

export function isScimTokenConfigured(settings: string | null): boolean {
  if (!settings) return false;
  try {
    const parsed = JSON.parse(settings) as Record<string, unknown>;
    return typeof parsed.scimToken === 'string' && parsed.scimToken.length > 0;
  } catch {
    return false;
  }
}
