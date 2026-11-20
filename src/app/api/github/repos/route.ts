import { NextRequest, NextResponse } from 'next/server';
import { getUserRepositories, isGitHubConfigured } from '@/lib/github';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';

// GET /api/github/repos - List user's repositories (GitHub OAuth connection required)
export async function GET(request: NextRequest) {
  try {
    if (!isGitHubConfigured()) {
      return NextResponse.json({ success: false, error: 'GitHub integration is not configured' }, { status: 503 });
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
