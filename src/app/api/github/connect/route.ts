import { NextResponse } from 'next/server';
import { getGitHubOAuthUrl, generateInviteToken } from '@/lib/github';

// GET /api/github/connect - Redirect to GitHub OAuth
export async function GET() {
  const state = generateInviteToken();
  const url = getGitHubOAuthUrl(state);
  return NextResponse.redirect(url);
}
