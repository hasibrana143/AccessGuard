import { NextRequest, NextResponse } from 'next/server';
import { getUserRepositories, isGitHubConfigured } from '@/lib/github';

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

    // Get GitHub token from headers
    const githubToken = request.headers.get('x-github-token') || process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      return NextResponse.json(
        { success: false, error: 'GitHub not connected' },
        { status: 401 }
      );
    }

    const repositories = await getUserRepositories(githubToken);

    return NextResponse.json({
      success: true,
      data: repositories,
    });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch repositories' },
      { status: 500 }
    );
  }
}
