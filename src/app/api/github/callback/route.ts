import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;

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
    // Decode state
    let stateData: { orgId: string; redirect: string };
    try {
      stateData = JSON.parse(Buffer.from(state || '', 'base64').toString());
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid state parameter' },
        { status: 400 }
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
      where: { orgId: stateData.orgId },
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
          orgId: stateData.orgId,
          installationId: userData.id.toString(),
          repositories: JSON.stringify(repositories),
          isActive: true,
        },
      });
    }

    // Store token in user record (you would normally encrypt this)
    // For demo, we're just marking the connection as active

    // Create audit log
    await db.auditLog.create({
      data: {
        orgId: stateData.orgId,
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
      `${appUrl}${stateData.redirect}?github=connected&repos=${repositories.length}`
    );
  } catch (err) {
    console.error('GitHub OAuth callback error:', err);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=${encodeURIComponent(err instanceof Error ? err.message : 'GitHub connection failed')}`
    );
  }
}
