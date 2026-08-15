import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { requireOrgAccess, requireVerifiedEmail } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { signOAuthState, verifyOAuthState } from '@/lib/oauth-state';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';

// GET - Start OAuth flow
export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`github-oauth:${clientId}`, rateLimits.default);

  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId');
  const redirect = searchParams.get('redirect') || '/dashboard';

  const access = await requireOrgAccess(request, orgId, { permission: PERMISSIONS.MANAGE_GITHUB });
  if (access instanceof NextResponse) return access;

  // Generate signed state for CSRF protection
  const state = signOAuthState({ orgId: access.org.id, redirect });

  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', GITHUB_CLIENT_ID);
  githubAuthUrl.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/github/callback`);
  githubAuthUrl.searchParams.set('scope', 'repo,read:org,write:repo_hook');
  githubAuthUrl.searchParams.set('state', state);

  return NextResponse.redirect(githubAuthUrl.toString());
}

// POST - Handle OAuth callback
export async function POST(request: NextRequest) {
  try {
    const auth = await requireVerifiedEmail(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { code, state } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    // Verify the signed state returned by GitHub
    const stateData = verifyOAuthState(state);
    if (!stateData?.orgId || typeof (stateData.redirect as unknown) !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid state parameter' },
        { status: 400 }
      );
    }
    const orgId = stateData.orgId as string;
    const redirect = stateData.redirect as string;

    // The OAuth flow must be bound to the authenticated user's own org
    if (orgId !== auth.user.orgId) {
      return NextResponse.json(
        { success: false, error: 'OAuth flow does not match your organization' },
        { status: 403 }
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return NextResponse.json(
        { success: false, error: tokenData.error_description || 'GitHub OAuth failed' },
        { status: 400 }
      );
    }

    const accessToken = tokenData.access_token;

    // Get user's GitHub info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const userData = await userResponse.json();

    // Get user's repositories
    const reposResponse = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const reposData = await reposResponse.json();
    const repositories = reposData.map((repo: { id: number; name: string; full_name: string; html_url: string; private: boolean }) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      url: repo.html_url,
      private: repo.private,
    }));

    // Store GitHub connection - find existing or create new
    const existingConnection = await db.githubConnection.findFirst({
      where: { orgId: orgId },
    });

    if (existingConnection) {
      await db.githubConnection.update({
        where: { id: existingConnection.id },
        data: {
          installationId: userData.id.toString(),
          repositories: JSON.stringify(repositories),
          isActive: true,
        },
      });
    } else {
      await db.githubConnection.create({
        data: {
          orgId: orgId,
          installationId: userData.id.toString(),
          repositories: JSON.stringify(repositories),
          isActive: true,
        },
      });
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        orgId: orgId,
        action: 'github_connected',
        metadata: JSON.stringify({
          username: userData.login,
          repoCount: repositories.length,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        username: userData.login,
        repositories,
        redirect: redirect,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'GitHub OAuth failed' },
      { status: 500 }
    );
  }
}
