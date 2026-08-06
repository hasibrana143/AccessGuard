import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { encryptSecret } from '@/lib/crypto';
import { requireVerifiedEmail } from '@/lib/rbac';
import { verifyOAuthState } from '@/lib/oauth-state';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';

// Handle GitHub OAuth callback
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (!code) {
    return NextResponse.json(
      { success: false, error: 'No authorization code received' },
      { status: 400 }
    );
  }

  try {
    // The browser session cookie is sent on this redirect navigation
    const auth = await requireVerifiedEmail(request);
    if (auth instanceof NextResponse) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      return NextResponse.redirect(`${appUrl}/auth/login?error=Please sign in to connect GitHub`);
    }

    // Verify the signed state returned by GitHub
    const stateData = verifyOAuthState(state || '');
    if (!stateData?.orgId || typeof stateData.redirect !== 'string' || stateData.orgId !== auth.user.orgId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?error=${encodeURIComponent('Invalid state parameter')}`
      );
    }
    const orgId = stateData.orgId as string;
    const redirect = stateData.redirect as string;

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
      throw new Error(tokenData.error_description || 'GitHub OAuth failed');
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
      where: { orgId },
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
          orgId,
          installationId: userData.id.toString(),
          repositories: JSON.stringify(repositories),
          isActive: true,
        },
      });
    }

    // Store encrypted token on the connecting user's record
    const user = await db.user.findUnique({ where: { id: auth.user.id } });
    if (user) {
      await db.user.update({
        where: { id: user.id },
        data: {
          githubToken: encryptSecret(accessToken),
          githubLogin: userData.login,
        },
      });
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        orgId,
        action: 'github_connected',
        metadata: JSON.stringify({
          username: userData.login,
          repoCount: repositories.length,
        }),
      },
    });

    // Redirect back to app
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      `${appUrl}${redirect}?github=connected&repos=${repositories.length}`
    );
  } catch (err) {
    logger.error({ err }, 'GitHub OAuth callback error');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=${encodeURIComponent(err instanceof Error ? err.message : 'GitHub connection failed')}`
    );
  }
}
