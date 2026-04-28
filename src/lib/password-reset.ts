// Password reset utilities for AccessGuard
import crypto from 'crypto';

// Generate secure reset token
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Hash token for storage
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Verify token (timing-safe comparison)
export function verifyToken(hashedToken: string, providedToken: string): boolean {
  const providedHash = hashToken(providedToken);
  if (hashedToken.length !== providedHash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(hashedToken), Buffer.from(providedHash));
}

// Get token expiry (1 hour from now)
export function getTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 1);
  return expiry;
}

// Check if token is expired
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}
