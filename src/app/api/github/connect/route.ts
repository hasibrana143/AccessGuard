import { NextRequest, NextResponse } from 'next/server';
import { GET as oauthGet } from '../oauth/route';

// Start the signed GitHub OAuth flow (delegates to /api/github/oauth GET,
// which authenticates the session and signs the state parameter).
export async function GET(request: NextRequest): Promise<NextResponse> {
  return oauthGet(request);
}