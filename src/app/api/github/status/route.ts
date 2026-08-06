import { NextRequest, NextResponse } from 'next/server';
import { isGitHubConfigured } from '@/lib/github';
import { requireAuth } from '@/lib/rbac';
import { db } from '@/lib/db';

// GET /api/github/status - Check the caller's GitHub connection status.
// Guard chain: auth first (spec marks this route authed; was previously
// anonymous + cross-tenant demo lookup — fixed to fail closed, per-caller).
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const caller = await db.user.findUnique({
    where: { id: auth.user.id },
    select: { githubLogin: true, githubToken: true },
  });
  const connected = !!caller?.githubLogin && !!caller?.githubToken;

  return NextResponse.json({
    success: true,
    data: {
      configured: isGitHubConfigured(),
      connected,
      login: caller?.githubLogin ?? null,
    },
  });
}