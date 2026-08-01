// TOTP MFA helpers
import { generateSecret, generateURI, verifySync } from 'otplib';
import { encryptSecret, decryptSecret } from '@/lib/crypto';

export interface MfaSetupResult {
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
}

export function generateMfaSecret(userEmail: string, issuer = 'AccessGuard'): MfaSetupResult {
  const secret = generateSecret();
  const otpauthUrl = generateURI({ issuer, label: userEmail, secret });
  return { secret, otpauthUrl, qrDataUrl: '' };
}

export function generateQrDataUrl(otpauthUrl: string): Promise<string> {
  return import('qrcode').then(({ toDataURL }) => toDataURL(otpauthUrl, { width: 220, margin: 1 }));
}

export function encryptMfaSecret(secret: string): string {
  return encryptSecret(secret);
}

export function readMfaSecret(stored: string | null): string | null {
  if (!stored) return null;
  return decryptSecret(stored);
}

export function verifyMfaCode(secret: string, code: string): boolean {
  if (!/^\d{6}$/.test(code.trim())) return false;
  try {
    const result = verifySync({ token: code.trim(), secret });
    return result.valid === true;
  } catch {
    return false;
  }
}
