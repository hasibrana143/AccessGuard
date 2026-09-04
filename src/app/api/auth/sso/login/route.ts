import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { generateAuthnRequest } from '@/lib/saml';

export async function GET(request: NextRequest) {
  // Rate limit
  const clientId = getClientIdentifier(request);
  const rl = await checkRateLimit(clientId, { interval: 60000, limit: 30 });
  if (!rl.success) {
    return createRateLimitResponse(rl);
  }

  const { searchParams } = request.nextUrl;
  const orgId = searchParams.get('orgId');
  const slug = searchParams.get('slug');
  const email = searchParams.get('email');

  if (!orgId && !slug && !email) {
    return NextResponse.json(
      { success: false, error: 'Must provide orgId, slug, or email' },
      { status: 400 }
    );
  }

  let org: { id: string; ssoEnabled: boolean; ssoEntryPoint: string | null; ssoIssuer: string | null } | null = null;
  if (orgId) {
    org = await db.organization.findUnique({
      where: { id: orgId },
      select: { id: true, ssoEnabled: true, ssoEntryPoint: true, ssoIssuer: true },
    });
  } else if (slug) {
    org = await db.organization.findUnique({
      where: { slug },
      select: { id: true, ssoEnabled: true, ssoEntryPoint: true, ssoIssuer: true },
    });
  } else if (email && email.includes('@')) {
    const domain = email.split('@')[1];
    // Find matching org by domain or membership
    const user = await db.user.findUnique({
      where: { email },
      include: {
        organization: {
          select: { id: true, ssoEnabled: true, ssoEntryPoint: true, ssoIssuer: true },
        },
      },
    });
    if (user?.organization) {
      org = user.organization;
    }
  }

  if (!org || !org.ssoEnabled || !org.ssoEntryPoint) {
    return NextResponse.json(
      { success: false, error: 'SSO is not enabled or configured for this organization' },
      { status: 404 }
    );
  }

  const origin = request.nextUrl.origin;
  const spEntityId = `${origin}/api/auth/sso/metadata`;
  const acsUrl = `${origin}/api/auth/sso/callback`;

  // RelayState encodes orgId for validation on callback
  const relayState = Buffer.from(JSON.stringify({ orgId: org.id, timestamp: Date.now() })).toString('base64');

  const { redirectUrl } = generateAuthnRequest({
    idpEntryPoint: org.ssoEntryPoint,
    spEntityId,
    acsUrl,
    relayState,
  });

  return NextResponse.redirect(redirectUrl, { status: 302 });
}
