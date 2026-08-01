import { NextResponse } from 'next/server';
import { getGitHubOAuthUrl } from '@/lib/github';
import crypto from 'crypto';

export async function GET() {
  const state = crypto.randomBytes(32).toString('hex');
  const url = getGitHubOAuthUrl(state);
  return NextResponse.redirect(url);
}
