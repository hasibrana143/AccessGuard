import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const VERSION = 'v1';

function getKey(): Buffer {
  const secret = process.env.CRYPTO_SECRET_KEY || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRYPTO_SECRET_KEY is required in production. Run: openssl rand -hex 32');
    }
    console.warn('WARNING: CRYPTO_SECRET_KEY not set — using insecure dev fallback key. Set it in production.');
  }
  return crypto.createHash('sha256').update(secret || 'accessguard-dev-secret-change-me').digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(payload: string): string | null {
  try {
    const [version, ivB64, tagB64, dataB64] = payload.split(':');
    if (version !== VERSION || !ivB64 || !tagB64 || !dataB64) {
      return null;
    }
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

export function isEncrypted(payload: string): boolean {
  return payload.startsWith(`${VERSION}:`);
}
