import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  getUserRepositories,
  createBranch,
  createFile,
  createPullRequest,
  validateWriteAccess,
  isGitHubConfigured,
  getRepositoryDetails,
} from '@/lib/github';
import { logger } from '@/lib/error-logger';
import { requireVerifiedEmail } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import {
  createFixBranchName,
  generatePrTitle,
  generatePrBody,
  type ViolationForPR,
} from '@/lib/github-pr';
import {
  MIN_FIX_CONFIDENCE,
  passesConfidenceGate,
  verifyFixes,
} from '@/lib/fix-verification';

// The gate reads verification confidence. An unknown (null) confidence never passes.
// Re-exported for existing importers.
export { MIN_FIX_CONFIDENCE } from '@/lib/fix-verification';

// Type for violation with project
type ViolationWithProject = {
  id: string;
  scanId: string;
  projectId: string;
  ruleId: string;
  wcagCriteria: string | null;
  severity: string;
  url: string;
  elementSelector: string | null;
  elementHtml: string | null;
  description: string;
  remediationCode: string | null;
  aiExplanation: string | null;
  aiConfidenceScore: number | null;
  status: string;
  githubPrUrl: string | null;
  createdAt: Date;
  fixedAt: Date | null;
  project: { name: string; url: string };
};

// Helper to convert Prisma result to ViolationForPR
function toViolationForPR(v: ViolationWithProject): ViolationForPR {
  return {
    id: v.id,
    ruleId: v.ruleId,
    severity: v.severity,
    url: v.url,
    description: v.description,
    wcagCriteria: v.wcagCriteria,
    elementSelector: v.elementSelector,
    elementHtml: v.elementHtml,
    remediationCode: v.remediationCode,
    aiExplanation: v.aiExplanation,
    project: v.project,
  };
}

// POST /api/github/create-pr - Create a PR with accessibility fixes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { violationIds, repository, branch: customBranch } = body;

    if (!violationIds || !Array.isArray(violationIds) || violationIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Violation IDs are required' },
        { status: 400 }
      );
    }

    const auth = await requireVerifiedEmail(request, { permission: PERMISSIONS.CREATE_PR });
    if (auth instanceof NextResponse) return auth;

    // Fetch violations (scoped to the user's org)
    const violations = await db.violation.findMany({
      where: {
        id: { in: violationIds },
        project: { orgId: auth.user.orgId },
      },
      include: {
        project: {
          select: {
            name: true,
            url: true,
          },
        },
      },
    });

    if (violations.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No violations found' },
        { status: 404 }
      );
    }

    if (violations.length !== violationIds.length) {
      return NextResponse.json(
        { success: false, error: 'One or more violations are not accessible' },
        { status: 403 }
      );
    }

    // Only violations that carry a remediation can be verified and applied.
    const violationsWithCode = violations.filter(v => v.remediationCode);

    if (violationsWithCode.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No violations have remediation code. Generate fixes first.',
          skippedLowConfidence: 0,
          skippedUnverified: 0,
        },
        { status: 400 }
      );
    }

    if (!isGitHubConfigured()) {
      return NextResponse.json({ success: false, error: 'GitHub integration is not configured' }, { status: 503 });
    }

    // Real GitHub integration
    if (!repository) {
      return NextResponse.json(
        { success: false, error: 'Repository is required' },
        { status: 400 }
      );
    }

    // Parse repository (format: "owner/repo")
    const [owner, repo] = repository.split('/');
    if (!owner || !repo) {
      return NextResponse.json(
        { success: false, error: 'Invalid repository format. Use "owner/repo"' },
        { status: 400 }
      );
    }

    // Whitelist repository against the org's connected GitHub repositories
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
    if (allowedRepos.length === 0 || !allowedRepos.includes(repository)) {
      return NextResponse.json(
        { success: false, error: 'Repository is not part of your connected GitHub repositories' },
        { status: 403 }
      );
    }

    // Get GitHub token from user (in real app, this would come from session/OAuth)
    // For now, check if we have a token in headers or environment
    const githubToken = request.headers.get('x-github-token') || process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      return NextResponse.json(
        { success: false, error: 'GitHub not connected. Please connect your GitHub account.' },
        { status: 401 }
      );
    }

    // Validate write access
    const hasAccess = await validateWriteAccess(githubToken, owner, repo);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'You do not have write access to this repository' },
        { status: 403 }
      );
    }

    // Get repository details including default branch
    const repoDetails = await getRepositoryDetails(githubToken, owner, repo);
    const defaultBranch = repoDetails?.defaultBranch || 'main';

    // Verification decides what may be applied: axe is re-run on each patched element.
    // A fix that cannot be verified (no browser, or a rule that cannot be evaluated in
    // isolation) never reaches the repository.
    const verification = await verifyFixes(
      violationsWithCode.map(v => ({
        id: v.id,
        ruleId: v.ruleId,
        remediationCode: v.remediationCode as string,
      }))
    );

    const violationsWithFixes = violationsWithCode.filter(v =>
      passesConfidenceGate(verification.get(v.id)?.confidence ?? null)
    );
    const skippedLowConfidence = violationsWithCode.filter(v => {
      const confidence = verification.get(v.id)?.confidence ?? null;
      return confidence !== null && confidence < MIN_FIX_CONFIDENCE;
    }).length;
    const skippedUnverified = violationsWithCode.filter(
      v => (verification.get(v.id)?.confidence ?? null) === null
    ).length;

    if (violationsWithFixes.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            skippedUnverified > 0
              ? 'Fix verification could not run for the selected fixes (no browser available, or the rule cannot be evaluated in isolation).'
              : 'Selected fixes did not pass verification: axe still reports the violation on the patched element.',
          skippedLowConfidence,
          skippedUnverified,
        },
        { status: 400 }
      );
    }

    // Create branch name
    const branchName = customBranch || createFixBranchName('accessibility-fixes');

    // Create branch
    await createBranch(githubToken, owner, repo, branchName, defaultBranch);

    // Generate PR content
    const prTitle = generatePrTitle(violationsWithFixes.map(toViolationForPR));
    const prBody = generatePrBody(violationsWithFixes.map(toViolationForPR), violations[0].project);

    // Apply fixes to real source files where the offending HTML can be located
    let filesModified: Array<{ path: string; fixesApplied: number }> = [];
    let fixesAppliedTotal = 0;
    try {
      const { applyFixesToRepository } = await import('@/lib/github');
      const fixResult = await applyFixesToRepository(
        githubToken,
        owner,
        repo,
        branchName,
        defaultBranch,
        violationsWithFixes.map(toViolationForPR)
      );
      filesModified = fixResult.filesModified;
      fixesAppliedTotal = fixResult.fixesAppliedTotal;
    } catch (err) {
      logger.error({ err }, 'Failed to apply fixes to repository files');
    }

    // Create a summary file with all fixes
    const summaryContent = generateSummaryFile(violationsWithFixes, fixesAppliedTotal, filesModified.length);
    await createFile(
      githubToken,
      owner,
      repo,
      'accessguard-fixes/summary.md',
      summaryContent,
      `docs: Add accessibility fix summary for ${violationsWithFixes.length} issues`,
      branchName
    );

    // Create individual fix files for violations (docs fallback alongside source edits)
    for (const violation of violationsWithFixes) {
      const fixFileName = `accessguard-fixes/${violation.ruleId}-${violation.id.slice(0, 8)}.md`;
      const fixContent = generateFixFile(violation);

      await createFile(
        githubToken,
        owner,
        repo,
        fixFileName,
        fixContent,
        `fix(a11y): ${violation.ruleId} - ${violation.description.slice(0, 50)}`,
        branchName
      );
    }

    // Create pull request
    const pr = await createPullRequest(
      githubToken,
      owner,
      repo,
      prTitle,
      prBody,
      branchName,
      defaultBranch
    );

    if (!pr) {
      return NextResponse.json(
        { success: false, error: 'Failed to create pull request' },
        { status: 500 }
      );
    }

    // Update violations with PR URL
    await db.violation.updateMany({
      where: {
        id: { in: violationIds },
      },
      data: {
        githubPrUrl: pr.url,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        prUrl: pr.url,
        prNumber: 'N/A', // PR number would require additional API call
        branchName,
        filesCreated: violationsWithFixes.length + 1, // +1 for summary
        violationsUpdated: violationIds.length,
        verifiedFixes: violationsWithFixes.length,
        skippedLowConfidence,
        skippedUnverified,
        filesModified,
        fixesAppliedTotal,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create PR' },
      { status: 500 }
    );
  }
}

// Generate summary file content
function generateSummaryFile(violations: ViolationWithProject[], sourceFixesApplied: number, filesModified: number): string {
  const lines: string[] = [
    '# AccessGuard Accessibility Fixes Summary',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    `**Total Issues:** ${violations.length}`,
    '',
  ];

  if (filesModified > 0) {
    lines.push('## Source Fixes Applied');
    lines.push('');
    lines.push(`- **Files Modified:** ${filesModified}`);
    lines.push(`- **Fixes Applied Directly:** ${sourceFixesApplied}`);
    lines.push('- These changes were applied to the actual source files in this PR.');
    lines.push('');
    lines.push('### Files Changed');
    lines.push('');
  }

  lines.push('## Verification');
  lines.push('');
  lines.push('- Every fix in this PR was re-scanned with axe-core on the patched element before the PR was opened.');
  lines.push('- Fixes that could not be verified were excluded from this PR.');
  lines.push('');

  lines.push('## Issues by Severity');
  lines.push('');

  const critical = violations.filter(v => v.severity === 'critical');
  const serious = violations.filter(v => v.severity === 'serious');
  const moderate = violations.filter(v => v.severity === 'moderate');
  const minor = violations.filter(v => v.severity === 'minor');

  if (critical.length > 0) lines.push(`- **Critical:** ${critical.length}`);
  if (serious.length > 0) lines.push(`- **Serious:** ${serious.length}`);
  if (moderate.length > 0) lines.push(`- **Moderate:** ${moderate.length}`);
  if (minor.length > 0) lines.push(`- **Minor:** ${minor.length}`);

  lines.push('');
  lines.push('## Files in this PR');
  lines.push('');
  lines.push('Each violation has its own fix file in this directory.');
  lines.push('');

  for (const v of violations) {
    const fileName = `${v.ruleId}-${v.id.slice(0, 8)}.md`;
    lines.push(`- [${v.ruleId}](${fileName}) - ${v.severity}`);
  }

  return lines.join('\n');
}

// Generate individual fix file content
function generateFixFile(violation: ViolationWithProject): string {
  const lines: string[] = [
    `# Fix: ${violation.ruleId}`,
    '',
    '## Issue Details',
    '',
    `**Severity:** ${violation.severity}`,
    `**WCAG Criteria:** ${violation.wcagCriteria || 'N/A'}`,
    `**URL:** ${violation.url}`,
    '',
    '### Description',
    violation.description,
    '',
    '### Element Selector',
    '```',
    violation.elementSelector || 'N/A',
    '```',
    '',
    '### Original HTML',
    '```html',
    violation.elementHtml || 'N/A',
    '```',
    '',
    '## Suggested Fix',
    '',
    '### Explanation',
    violation.aiExplanation || 'No explanation available.',
    '',
    '### Code',
    '```html',
    violation.remediationCode || 'No fix code available.',
    '```',
    '',
    '---',
    '*Generated by AccessGuard*',
  ];

  return lines.join('\n');
}
