import { NextResponse } from 'next/server';
import { isGitHubConfigured } from '@/lib/github';
import { db } from '@/lib/db';

// GET /api/github/status - Check GitHub connection status
export async function GET() {
  const isConfigured = isGitHubConfigured();
  
  const user = await db.user.findFirst({ where: { email: 'demo@accessguard.com' } });
  const isConnected = !!(user?.githubToken);

  if (!isConfigured) {
    return NextResponse.json({
      success: true,
      data: {
        connected: false,
        demo: true,
        user: { login: 'demo-user', avatar_url: '', name: 'Demo User' }
      }
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      connected: isConnected,
      demo: false,
      user: isConnected ? { login: 'Connected User', avatar_url: '', name: 'Connected' } : null
    }
  });
}
