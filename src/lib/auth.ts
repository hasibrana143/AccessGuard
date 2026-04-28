// Authentication utilities for AccessGuard
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'accessguard-default-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface JwtPayload {
  userId: string;
  email: string;
  orgId: string;
  csrfToken?: string;
}

// Hash password with bcrypt
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Compare password with hash
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Sign JWT token
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Sign JWT with CSRF token
export function signTokenWithCsrf(payload: Omit<JwtPayload, 'csrfToken'>): { token: string; csrfToken: string } {
  const csrfToken = generateCsrfToken();
  const token = jwt.sign({ ...payload, csrfToken }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { token, csrfToken };
}

// Verify JWT token
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

// Generate CSRF token
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Verify CSRF token (timing-safe comparison)
export function verifyCsrfToken(token1: string, token2: string): boolean {
  if (token1.length !== token2.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token1), Buffer.from(token2));
}

// Extract token from Authorization header
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}
