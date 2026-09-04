import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { parseAndVerifySamlResponse } from '@/lib/saml';
import { signTokenWithCsrf } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { logger } from '@/lib/error-logger';

export async function POST(request: NextRequest) {
  // Rate limit
  const clientId = getClientIdentifier(request);
  const rl = await checkRateLimit(clientId, { interval: 60000, limit: 30 });
  if (!rl.success) {
    return createRateLimitResponse(rl);
  }

  let samlResponse = '';
  let relayState = '';

  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    try {
      const formData = await request.formData();
      samlResponse = (formData.get('SAMLResponse') as string) || '';
      relayState = (formData.get('RelayState') as string) || '';
    } catch {
      return NextResponse.redirect(new URL('/auth/login?error=invalid_payload', request.url), { status: 302 });
    }
  } else if (contentType.includes('application/json')) {
    try {
      const json = await request.json();
      samlResponse = json.SAMLResponse || '';
      relayState = json.RelayState || '';
    } catch {
      return NextResponse.redirect(new URL('/auth/login?error=invalid_payload', request.url), { status: 302 });
    }
  }

  if (!samlResponse) {
    return NextResponse.redirect(new URL('/auth/login?error=missing_saml_response', request.url), { status: 302 });
  }

  // Parse RelayState to locate orgId if present
  let orgIdFromRelay: string | undefined;
  if (relayState) {
    try {
      const decoded = JSON.parse(Buffer.from(relayState, 'base64').toString('utf8'));
      if (decoded && typeof decoded.orgId === 'string') {
        orgIdFromRelay = decoded.orgId;
      }
    } catch {
      // Ignore malformed RelayState, fallback to Issuer lookup
    }
  }

  // Preliminary parse without certificate to extract issuer if orgId not in RelayState
  let preliminaryResult = parseAndVerifySamlResponse(samlResponse, {});
  if (!preliminaryResult.success && !preliminaryResult.issuer) {
    return NextResponse.redirect(new URL('/auth/login?error=malformed_assertion', request.url), { status: 302 });
  }

  // Look up organization
  let org: any = null;
  if (orgIdFromRelay) {
    org = await db.organization.findUnique({
      where: { id: orgIdFromRelay },
    });
  } else if (preliminaryResult.issuer) {
    org = await db.organization.findFirst({
      where: { ssoIssuer: preliminaryResult.issuer, ssoEnabled: true },
    });
  }

  if (!org || !org.ssoEnabled) {
    return NextResponse.redirect(new URL('/auth/login?error=org_sso_not_enabled', request.url), { status: 302 });
  }

  // Full verification with configured IdP certificate
  const verifyResult = parseAndVerifySamlResponse(samlResponse, {
    certificate: org.ssoCertificate,
    expectedIssuer: org.ssoIssuer,
    expectedAcsUrl: `${request.nextUrl.origin}/api/auth/sso/callback`,
  });

  if (!verifyResult.success || !verifyResult.email) {
    logger.warn({ orgId: org.id, error: verifyResult.error }, 'SAML verification failed');
    await createAuditLog({
      orgId: org.id,
      action: 'sso_login_failure',
      metadata: { error: verifyResult.error, issuer: org.ssoIssuer },
    });
    return NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(verifyResult.error || 'verification_failed')}`, request.url), {
      status: 302,
    });
  }

  // Find or provision user in the organization
  const email = verifyResult.email;
  let user = await db.user.findUnique({
    where: { email },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        email,
        name: verifyResult.name || email.split('@')[0],
        orgId: org.id,
        role: 'member',
        emailVerifiedAt: new Date(),
      },
    });
  } else if (user.orgId !== org.id) {
    // Cross-tenant email mismatch
    await createAuditLog({
      orgId: org.id,
      action: 'sso_login_failure',
      metadata: { error: 'User belongs to a different organization', email },
    });
    return NextResponse.redirect(new URL('/auth/login?error=cross_tenant_sso_denied', request.url), { status: 302 });
  }

  // Audit log success
  await createAuditLog({
    orgId: org.id,
    action: 'sso_login_success',
    metadata: {
      email: user.email,
      provider: org.ssoProvider || 'saml',
      issuer: org.ssoIssuer,
    },
    userId: user.id,
  });

  // Issue session token
  const { token, csrfToken } = signTokenWithCsrf({
    userId: user.id,
    email: user.email,
    orgId: org.id,
  });

  // Redirect to dashboard with session cookie
  const response = NextResponse.redirect(new URL('/dashboard', request.url), { status: 302 });
  response.cookies.set('accessguard_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
  response.cookies.set('accessguard_csrf', csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });

  return response;
}
