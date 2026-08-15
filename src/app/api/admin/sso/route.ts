import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/error-logger';
import { createAuditLog } from '@/lib/audit';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';

const ALLOWED_PROVIDERS = ['okta', 'azure-ad', 'google-workspace', 'custom-saml'] as const;
type SsoProvider = (typeof ALLOWED_PROVIDERS)[number];

function isProvider(value: string): value is SsoProvider {
  return (ALLOWED_PROVIDERS as readonly string[]).includes(value);
}

/** Loosely validate an SSO cert — must look like a PEM (BEGIN CERTIFICATE). */
function looksLikePemCert(value: string): boolean {
  return value.includes('-----BEGIN CERTIFICATE-----') && value.includes('-----END CERTIFICATE-----');
}

// GET /api/admin/sso - Read SSO configuration (admin/owner)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'No organization found' }, { status: 403 });
    }
    const role = (session.user as { role?: string }).role;
    if (role !== 'admin' && role !== 'owner') {
      return NextResponse.json({ success: false, error: 'Access denied. Admin role required.' }, { status: 403 });
    }

    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { ssoEnabled: true, ssoProvider: true, ssoIssuer: true, ssoEntryPoint: true, ssoCertificate: true },
    });
    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ssoEnabled: org.ssoEnabled,
        ssoProvider: org.ssoProvider,
        ssoIssuer: org.ssoIssuer,
        ssoEntryPoint: org.ssoEntryPoint,
        certificateConfigured: Boolean(org.ssoCertificate),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'get sso config failed');
    return NextResponse.json({ success: false, error: 'Failed to read SSO config' }, { status: 500 });
  }
}

// PATCH /api/admin/sso - Upsert SSO configuration (admin/owner)
export async function PATCH(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`sso-config:${clientId}`, rateLimits.default);
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'No organization found' }, { status: 403 });
    }
    const role = (session.user as { role?: string }).role;
    if (role !== 'admin' && role !== 'owner') {
      return NextResponse.json({ success: false, error: 'Access denied. Admin role required.' }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as {
      ssoEnabled?: unknown;
      ssoProvider?: unknown;
      ssoIssuer?: unknown;
      ssoEntryPoint?: unknown;
      ssoCertificate?: unknown;
    } | null;

    if (!body) {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    const ssoEnabled = typeof body.ssoEnabled === 'boolean' ? body.ssoEnabled : undefined;
    const ssoProvider = typeof body.ssoProvider === 'string' ? body.ssoProvider : undefined;
    const ssoIssuer = typeof body.ssoIssuer === 'string' && body.ssoIssuer.trim() ? body.ssoIssuer.trim() : undefined;
    const ssoEntryPoint = typeof body.ssoEntryPoint === 'string' && body.ssoEntryPoint.trim() ? body.ssoEntryPoint.trim() : undefined;
    const ssoCertificate = typeof body.ssoCertificate === 'string' && body.ssoCertificate.trim() ? body.ssoCertificate.trim() : undefined;

    if (ssoProvider !== undefined && !isProvider(ssoProvider)) {
      return NextResponse.json(
        { success: false, error: `Invalid provider. Supported: ${ALLOWED_PROVIDERS.join(', ')}` },
        { status: 400 }
      );
    }

    if (ssoEntryPoint !== undefined) {
      try {
        const parsed = new URL(ssoEntryPoint);
        if (parsed.protocol !== 'https:') {
          return NextResponse.json({ success: false, error: 'SSO entry point must be an https URL' }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ success: false, error: 'SSO entry point must be an https URL' }, { status: 400 });
      }
    }

    if (ssoCertificate !== undefined && !looksLikePemCert(ssoCertificate)) {
      return NextResponse.json(
        { success: false, error: 'Certificate must be a PEM block (-----BEGIN CERTIFICATE-----…)' },
        { status: 400 }
      );
    }

    // Enabling SSO requires provider + issuer + entry point + cert
    if (ssoEnabled === true) {
      if (!ssoProvider || !ssoIssuer || !ssoEntryPoint || !ssoCertificate) {
        return NextResponse.json(
          { success: false, error: 'Enabling SSO requires provider, issuer, entry point and certificate' },
          { status: 400 }
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (ssoEnabled !== undefined) data.ssoEnabled = ssoEnabled;
    if (ssoProvider !== undefined) data.ssoProvider = ssoProvider;
    if (ssoIssuer !== undefined) data.ssoIssuer = ssoIssuer;
    if (ssoEntryPoint !== undefined) data.ssoEntryPoint = ssoEntryPoint;
    if (ssoCertificate !== undefined) data.ssoCertificate = ssoCertificate;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    const updated = await db.organization.update({ where: { id: orgId }, data });

    await createAuditLog({
      orgId,
      action: ssoEnabled === false ? 'sso.config_removed' : 'sso.config_updated',
      metadata: {
        provider: updated.ssoProvider,
        enabled: updated.ssoEnabled,
        issuer: updated.ssoIssuer,
        entryPoint: updated.ssoEntryPoint,
        actorId: (session.user as { id?: string }).id,
      },
      userId: (session.user as { id?: string }).id,
    });

    return NextResponse.json({
      success: true,
      data: {
        ssoEnabled: updated.ssoEnabled,
        ssoProvider: updated.ssoProvider,
        ssoIssuer: updated.ssoIssuer,
        ssoEntryPoint: updated.ssoEntryPoint,
        certificateConfigured: Boolean(updated.ssoCertificate),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'update sso config failed');
    return NextResponse.json({ success: false, error: 'Failed to update SSO config' }, { status: 500 });
  }
}
