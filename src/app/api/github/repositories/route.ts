import { NextResponse } from 'next/server';
import { getUserRepositories, isGitHubConfigured } from '@/lib/github';
import { db } from '@/lib/db';

// GET /api/github/repositories - List user repositories
export async function GET() {
  const isConfigured = isGitHubConfigured();
  
  if (!isConfigured) {
    // Demo mode: return mock repositories
    return NextResponse.json({
      success: true,
      data: [
        { full_name: 'demo-user/project-1', name: 'project-1', private: false },
        { full_name: 'demo-user/project-2', name: 'project-2', private: true },
      ]
    });
  }

  const user = await db.user.findFirst({ where: { email: 'demo@accessguard.com' } });
  if (!user?.githubToken) {
    return NextResponse.json({ success: false, error: 'Not connected to GitHub' }, { status: 401 });
  }

  const repos = await getUserRepositories(user.githubToken);
  return NextResponse.json({ success: true, data: repos });
}
