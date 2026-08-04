import { NextRequest, NextResponse } from 'next/server';
import { getUserRepositories, isGitHubConfigured } from '@/lib/github';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';

// GET /api/github/repos - List user's repositories
export async function GET(request: NextRequest) {
  try {
    // Check if GitHub is configured
    if (!isGitHubConfigured()) {
      // Return demo repositories
      return NextResponse.json({
        success: true,
        demoMode: true,
        data: [
          {
            id: 'demo-1',
            name: 'my-website',
            fullName: 'acme-corp/my-website',
            owner: 'acme-corp',
            private: false,
            description: 'Main company website',
            defaultBranch: 'main',
            htmlUrl: 'https://github.com/acme-corp/my-website',
          },
          {
            id: 'demo-2',
            name: 'docs',
            fullName: 'acme-corp/docs',
            owner: 'acme-corp',
            private: true,
            description: 'Internal documentation',
            defaultBranch: 'main',
            htmlUrl: 'https://github.com/acme-corp/docs',
          },
        ],
      });
    }

    // Resolve the token from the authenticated user's stored GitHub connection —
    // never trust a client-supplied token or fall back to the server-wide token.
    const { requireVerifiedEmail } = await import('@/lib/rbac');
    const auth = await requireVerifiedEmail(request);
    if (auth instanceof NextResponse) return auth;

    const user = await db.user.findUnique({
      where: { id: auth.user.id },
      select: { githubToken: true },
    });
    const storedToken = user?.githubToken ?? null;
    if (!storedToken) {
      return NextResponse.json(
        { success: false, error: 'GitHub not connected' },
        { status: 401 }
      );
    }
    const { decryptSecret, isEncrypted } = await import('@/lib/crypto');
    const githubToken = isEncrypted(storedToken) ? (decryptSecret(storedToken) ?? storedToken) : storedToken;

    const repositories = await getUserRepositories(githubToken);

    return NextResponse.json({
      success: true,
      data: repositories,
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to fetch repositories' },
      { status: 500 }
    );
  }
}
