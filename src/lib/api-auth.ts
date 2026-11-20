import { db } from './db';
import { logger } from './error-logger';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

const API_KEY_PREFIX = 'ag_';

export interface ApiKeyAuthResult {
  success: boolean;
  apiKey?: {
    id: string;
    orgId: string;
    name: string;
    scopes: string[];
  };
  error?: string;
  response?: NextResponse;
}

export function extractApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  if (authHeader.startsWith('ApiKey ')) {
    return authHeader.slice(7);
  }
  return null;
}

export async function verifyApiKey(rawKey: string): Promise<ApiKeyAuthResult> {
  if (!rawKey || !rawKey.startsWith(API_KEY_PREFIX)) {
    return { success: false, error: 'Invalid API key format' };
  }

  const prefix = rawKey.slice(0, 12); // ag_xxxxxxxx
  const apiKeyRecord = await db.apiKey.findFirst({
    where: { prefix },
    select: { id: true, orgId: true, name: true, hash: true, scopes: true, revokedAt: true },
  });

  if (!apiKeyRecord) {
    return { success: false, error: 'API key not found' };
  }

  if (apiKeyRecord.revokedAt) {
    return { success: false, error: 'API key revoked' };
  }

  const isValid = await bcrypt.compare(rawKey, apiKeyRecord.hash);
  if (!isValid) {
    logger.warn({ prefix }, 'API key hash mismatch');
    return { success: false, error: 'Invalid API key' };
  }

  // Update lastUsedAt
  await db.apiKey.update({
    where: { id: apiKeyRecord.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    success: true,
    apiKey: {
      id: apiKeyRecord.id,
      orgId: apiKeyRecord.orgId,
      name: apiKeyRecord.name,
      scopes: apiKeyRecord.scopes.split(',').map(s => s.trim()),
    },
  };
}

export function requireScope(apiKey: { scopes: string[] }, requiredScope: string): boolean {
  return apiKey.scopes.includes(requiredScope) || apiKey.scopes.includes('*');
}

export async function apiKeyAuth(
  request: NextRequest,
  requiredScope?: string
): Promise<ApiKeyAuthResult> {
  const rawKey = extractApiKey(request);
  if (!rawKey) {
    return {
      success: false,
      error: 'Missing API key',
      response: NextResponse.json({ error: 'Missing API key. Provide via Authorization: Bearer <key> or Authorization: ApiKey <key>' }, { status: 401 }),
    };
  }

  const result = await verifyApiKey(rawKey);
  if (!result.success) {
    return {
      success: false,
      error: result.error,
      response: NextResponse.json({ error: result.error }, { status: 401 }),
    };
  }

  if (requiredScope && !requireScope(result.apiKey!, requiredScope)) {
    return {
      success: false,
      error: `Insufficient scope. Required: ${requiredScope}`,
      response: NextResponse.json({ error: `Insufficient scope. Required: ${requiredScope}` }, { status: 403 }),
    };
  }

  return result;
}

export function generateApiKey(): { rawKey: string; prefix: string; hash: string } {
  const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const rawKey = `${API_KEY_PREFIX}${randomPart}`;
  const prefix = rawKey.slice(0, 12);
  const hash = bcrypt.hashSync(rawKey, 12);
  return { rawKey, prefix, hash };
}