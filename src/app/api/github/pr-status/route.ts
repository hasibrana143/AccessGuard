import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getPullRequestStatus, getMultiplePRStatuses, isGitHubConfigured } from '@/lib/github';
import { parsePrUrl } from '@/lib/github-pr';
import { logger } from '@/lib/error-logger';
import { requireVerifiedEmail } from '@/lib/rbac';

// GET /api/github/pr-status - Get PR status for violations
export async function GET(request: NextRequest) {
  const auth = await requireVerifiedEmail(request);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

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
          project: { orgId: user.orgId },
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

      const parsedPrs = prUrlsFromDb
        .map(url => parsePrUrl(url))
        .filter(Boolean)
        .map(p => ({ owner: p!.owner, repo: p!.repo, prNumber: p!.pullNumber }));

      if (!isGitHubConfigured() || parsedPrs.length === 0) {
        const mockStatuses: Record<string, { state: string; merged: boolean }> = {};
        for (const pr of parsedPrs) {
          const url = `https://github.com/${pr.owner}/${pr.repo}/pull/${pr.prNumber}`;
          mockStatuses[url] = { state: 'open', merged: false };
        }
        return NextResponse.json({ success: true, demoMode: true, data: mockStatuses });
      }

      const githubToken = request.headers.get('x-github-token') || process.env.GITHUB_TOKEN;

      if (!githubToken) {
        return NextResponse.json({ success: true, demoMode: true, data: {} });
      }

      const statuses = await getMultiplePRStatuses(githubToken, parsedPrs);

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

      const parsedPrUrls = (prUrls || [])
        .map(url => parsePrUrl(url))
        .filter(Boolean)
        .map(p => ({ owner: p!.owner, repo: p!.repo, prNumber: p!.pullNumber }));
      const statuses = await getMultiplePRStatuses(githubToken, parsedPrUrls);

      return NextResponse.json({
        success: true,
        data: Object.fromEntries(statuses),
      });
    }

    // Get all violations with PRs in the user's org
    const violationsWithPRs = await db.violation.findMany({
      where: {
        githubPrUrl: { not: null },
        project: { orgId: user.orgId },
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

    const parsedAllPrs = allPrUrls
      .map(url => parsePrUrl(url))
      .filter(Boolean)
      .map(p => ({ owner: p!.owner, repo: p!.repo, prNumber: p!.pullNumber }));

    const statuses = await getMultiplePRStatuses(githubToken, parsedAllPrs);

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
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to fetch PR status' },
      { status: 500 }
    );
  }
}

// POST /api/github/pr-status - Check specific PR
export async function POST(request: NextRequest) {
  const auth = await requireVerifiedEmail(request);
  if (auth instanceof NextResponse) return auth;

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

    // Whitelist the repository against the org's connected repositories
    const connection = await db.githubConnection.findFirst({
      where: { orgId: auth.user.orgId, isActive: true },
    });
    if (!connection) {
      return NextResponse.json(
        { success: false, error: 'GitHub not connected. Please connect your GitHub account first.' },
        { status: 400 }
      );
    }
    const allowedRepos: string[] = connection.repositories
      ? (JSON.parse(connection.repositories) as Array<{ fullName?: string }> | null)
          ?.map((r) => r.fullName)
          .filter((n: unknown): n is string => typeof n === 'string') ?? []
      : [];
    if (allowedRepos.length === 0 || !allowedRepos.includes(`${owner}/${repo}`)) {
      return NextResponse.json(
        { success: false, error: 'Repository is not part of your connected GitHub repositories' },
        { status: 403 }
      );
    }

    // Resolve the token from the authenticated user's stored GitHub connection
    const user = await db.user.findUnique({
      where: { id: auth.user.id },
      select: { githubToken: true },
    });
    if (!user?.githubToken) {
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
    const { decryptSecret, isEncrypted } = await import('@/lib/crypto');
    const githubToken = isEncrypted(user.githubToken) ? (decryptSecret(user.githubToken) ?? user.githubToken) : user.githubToken;

    const status = await getPullRequestStatus(githubToken, owner, repo, pullNumber);

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to fetch PR status' },
      { status: 500 }
    );
  }
}
