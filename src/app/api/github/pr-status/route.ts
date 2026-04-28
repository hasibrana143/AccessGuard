import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getPullRequestStatus, getMultiplePRStatuses, isGitHubConfigured } from '@/lib/github';
import { parsePrUrl } from '@/lib/github-pr';

// GET /api/github/pr-status - Get PR status for violations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const violationIds = searchParams.get('violationIds')?.split(',').filter(Boolean);
    const prUrls = searchParams.get('prUrls')?.split(',').filter(Boolean);

    // If specific violation IDs are provided
    if (violationIds && violationIds.length > 0) {
      const violations = await db.violation.findMany({
        where: {
          id: { in: violationIds },
          githubPrUrl: { not: null },
        },
        select: {
          id: true,
          githubPrUrl: true,
        },
      });

      const prUrlsFromDb = violations
        .map(v => v.githubPrUrl)
        .filter((url): url is string => url !== null);

      if (prUrlsFromDb.length === 0) {
        return NextResponse.json({
          success: true,
          data: {},
        });
      }

      // Check if GitHub is configured
      if (!isGitHubConfigured()) {
        // Return mock data in demo mode
        const mockStatuses: Record<string, { state: string; merged: boolean }> = {};
        for (const url of prUrlsFromDb) {
          mockStatuses[url] = { state: 'open', merged: false };
        }
        return NextResponse.json({
          success: true,
          demoMode: true,
          data: mockStatuses,
        });
      }

      // Get GitHub token
      const githubToken = request.headers.get('x-github-token') || process.env.GITHUB_TOKEN;
      
      if (!githubToken) {
        return NextResponse.json({
          success: true,
          demoMode: true,
          data: {},
        });
      }

      // Fetch PR statuses
      const statuses = await getMultiplePRStatuses(githubToken, prUrlsFromDb);

      return NextResponse.json({
        success: true,
        data: Object.fromEntries(statuses),
      });
    }

    // If specific PR URLs are provided
    if (prUrls && prUrls.length > 0) {
      // Check if GitHub is configured
      if (!isGitHubConfigured()) {
        const mockStatuses: Record<string, { state: string; merged: boolean }> = {};
        for (const url of prUrls) {
          mockStatuses[url] = { state: 'open', merged: false };
        }
        return NextResponse.json({
          success: true,
          demoMode: true,
          data: mockStatuses,
        });
      }

      const githubToken = request.headers.get('x-github-token') || process.env.GITHUB_TOKEN;
      
      if (!githubToken) {
        return NextResponse.json({
          success: true,
          demoMode: true,
          data: {},
        });
      }

      const statuses = await getMultiplePRStatuses(githubToken, prUrls);

      return NextResponse.json({
        success: true,
        data: Object.fromEntries(statuses),
      });
    }

    // Get all violations with PRs
    const violationsWithPRs = await db.violation.findMany({
      where: {
        githubPrUrl: { not: null },
      },
      select: {
        id: true,
        githubPrUrl: true,
      },
    });

    const allPrUrls = [...new Set(
      violationsWithPRs
        .map(v => v.githubPrUrl)
        .filter((url): url is string => url !== null)
    )];

    if (allPrUrls.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          prs: [],
          byViolationId: {},
        },
      });
    }

    // Check if GitHub is configured
    if (!isGitHubConfigured()) {
      const mockPRs = allPrUrls.map(url => ({
        url,
        state: 'open',
        merged: false,
      }));

      const byViolationId: Record<string, { state: string; merged: boolean; url: string }> = {};
      for (const v of violationsWithPRs) {
        if (v.githubPrUrl) {
          byViolationId[v.id] = {
            state: 'open',
            merged: false,
            url: v.githubPrUrl,
          };
        }
      }

      return NextResponse.json({
        success: true,
        demoMode: true,
        data: {
          prs: mockPRs,
          byViolationId,
        },
      });
    }

    const githubToken = request.headers.get('x-github-token') || process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      return NextResponse.json({
        success: true,
        demoMode: true,
        data: {
          prs: allPrUrls.map(url => ({ url, state: 'open', merged: false })),
          byViolationId: {},
        },
      });
    }

    // Fetch all PR statuses
    const statuses = await getMultiplePRStatuses(githubToken, allPrUrls);

    const prs = allPrUrls.map(url => ({
      url,
      state: statuses.get(url)?.state || 'unknown',
      merged: statuses.get(url)?.merged || false,
    }));

    const byViolationId: Record<string, { state: string; merged: boolean; url: string }> = {};
    for (const v of violationsWithPRs) {
      if (v.githubPrUrl && statuses.has(v.githubPrUrl)) {
        const status = statuses.get(v.githubPrUrl)!;
        byViolationId[v.id] = {
          state: status.state,
          merged: status.merged,
          url: v.githubPrUrl,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        prs,
        byViolationId,
      },
    });
  } catch (error) {
    console.error('Error fetching PR status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch PR status' },
      { status: 500 }
    );
  }
}

// POST /api/github/pr-status - Check specific PR
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner, repo, pullNumber } = body;

    if (!owner || !repo || !pullNumber) {
      return NextResponse.json(
        { success: false, error: 'Owner, repo, and pullNumber are required' },
        { status: 400 }
      );
    }

    // Check if GitHub is configured
    if (!isGitHubConfigured()) {
      return NextResponse.json({
        success: true,
        demoMode: true,
        data: {
          number: pullNumber,
          state: 'open',
          merged: false,
          htmlUrl: `https://github.com/${owner}/${repo}/pull/${pullNumber}`,
        },
      });
    }

    const githubToken = request.headers.get('x-github-token') || process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      return NextResponse.json({
        success: true,
        demoMode: true,
        data: {
          number: pullNumber,
          state: 'open',
          merged: false,
          htmlUrl: `https://github.com/${owner}/${repo}/pull/${pullNumber}`,
        },
      });
    }

    const status = await getPullRequestStatus(githubToken, owner, repo, pullNumber);

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Error fetching PR status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch PR status' },
      { status: 500 }
    );
  }
}
