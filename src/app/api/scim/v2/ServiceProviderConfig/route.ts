import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { resolveScimToken } from '@/lib/scim';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit';

/**
 * SCIM 2.0 (RFC 7644) — /api/scim/v2/ServiceProviderConfig
 * Bearer-token protected (per-org token, stored encrypted in settings).
 * Lets IdPs (Okta/Azure AD) discover the provisioned schema.
 */

const SCHEMA_CONFIG = 'urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig';

async function authorize(request: NextRequest): Promise<string | NextResponse | Response> {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ detail: 'Missing bearer token', schemas: [SCHEMA_CONFIG] }, { status: 401 });
  }
  const orgId = await resolveScimToken(authHeader.slice(7));
  if (!orgId) {
    return NextResponse.json({ detail: 'Invalid token', schemas: [SCHEMA_CONFIG] }, { status: 401 });
  }

  const rateResult = await checkRateLimit(`scim:${orgId}`, { interval: 60 * 1000, limit: 120 });
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }
  return orgId;
}

export async function GET(request: NextRequest) {
  const auth = await authorize(request);
  if (typeof auth !== 'string') return auth;

  return NextResponse.json({
    schemas: [SCHEMA_CONFIG],
    documentationUri: 'https://docs.accessguard.dev/enterprise/scim',
    patch: { supported: true },
    bulk: { supported: false },
    filter: { supported: true, maxResults: 100 },
    changePassword: { supported: false },
    sort: { supported: false },
    etag: { supported: false },
    authenticationSchemes: [
      { name: 'OAuth Bearer Token', description: 'Authentication using a per-org SCIM bearer token', specUri: 'https://www.rfc-editor.org/rfc/rfc6750', type: 'oauthbearertoken', primary: true },
    ],
    meta: {
      resourceType: 'ServiceProviderConfig',
      location: '/api/scim/v2/ServiceProviderConfig',
    },
  });
}

export async function HEAD(request: NextRequest) {
  const auth = await authorize(request);
  if (typeof auth !== 'string') return auth;
  return new NextResponse(null, { status: 200 });
}
