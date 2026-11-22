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
  planRepositoryFixes,
  applyRepositoryFixPlan,
  type RepositoryFixPlan,
} from '@/lib/github';
import { logger } from '@/lib/error-logger';
import { requireVerifiedEmail } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import {
  codeFence,
  createFixBranchName,
  escapeMarkdownText,
  generatePrTitle,
  generatePrBody,
  inlineCode,
  type ViolationForPR,
} from '@/lib/github-pr';
import {
  MAX_FIXES_PER_PR,
  selectVerifiedFixes,
  verifyFixes,
  type FixCandidate,
} from '@/lib/fix-verification';
import { checkRateLimit, rateLimits } from '@/lib/rate-limit';
import { createAuditLogWithRetry } from '@/lib/audit';

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

    if (violationIds.length > MAX_FIXES_PER_PR) {
      return NextResponse.json(
        {
          success: false,
          error: `At most ${MAX_FIXES_PER_PR} violations can be fixed in one request`,
        },
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

    // Rate limit (guard chain: auth -> org access/permission -> rate limit). Each
    // request launches a browser and runs axe, so the work must be bounded.
    const rateResult = await checkRateLimit(
      `github-create-pr:${auth.user.id}`,
      rateLimits.remediation
    );
    if (!rateResult.success) {
      return NextResponse.json(
        { success: false, error: 'Too many fix requests, please try again shortly' },
        { status: 429 }
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
    const candidates: FixCandidate[] = violationsWithCode.map(v => ({
      id: v.id,
      ruleId: v.ruleId,
      elementHtml: v.elementHtml,
      remediationCode: v.remediationCode,
    }));

    // The request is bounded BEFORE the browser work: every candidate costs one
    // axe run, so the cap has to be applied before verification, not after it.
    const cappedCandidates = candidates.slice(0, MAX_FIXES_PER_PR);
    const overLimit = candidates.length - cappedCandidates.length;

    const verification = await verifyFixes(
      cappedCandidates.map(c => ({
        id: c.id,
        ruleId: c.ruleId,
        elementHtml: c.elementHtml,
        remediationCode: c.remediationCode as string,
      }))
    );

    const selection = selectVerifiedFixes(cappedCandidates, verification);
    selection.skippedOverLimit += overLimit;
    const eligible = new Set(selection.eligibleIds);
    const violationsWithFixes = violationsWithCode.filter(v => eligible.has(v.id));

    if (violationsWithFixes.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            selection.skippedUnverified > 0
              ? 'Fix verification could not run for the selected fixes (no browser available, or the rule cannot be evaluated in isolation).'
              : selection.skippedInvalid > 0
                ? 'The selected fixes were rejected by the safety and rule checks (see the skipped counts).'
                : 'Selected fixes did not pass verification: axe still reports the violation on the patched element.',
          skippedInvalid: selection.skippedInvalid,
          skippedOverLimit: selection.skippedOverLimit,
          skippedLowConfidence: selection.skippedLowConfidence,
          skippedUnverified: selection.skippedUnverified,
        },
        { status: 400 }
      );
    }

    // Prove every repository change before the first irreversible mutation.
    let repositoryPlan: RepositoryFixPlan;
    try {
      repositoryPlan = await planRepositoryFixes(
        githubToken,
        owner,
        repo,
        defaultBranch,
        violationsWithFixes.map(toViolationForPR)
      );
    } catch (err) {
      logger.error({ err }, 'Failed to plan repository fixes');
      repositoryPlan = {
        fileWrites: [],
        appliedFixIds: [],
        refusedFixIds: [],
        reviewFixIds: [],
      };
    }

    const artifactFixIds = new Set([
      ...repositoryPlan.appliedFixIds,
      ...repositoryPlan.reviewFixIds,
    ]);
    if (artifactFixIds.size === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The repository's own stylesheet or runtime can change the patched element, or the fix does not pass the safety checks, so no fix can be applied safely to this repository.",
          skippedRefused: repositoryPlan.refusedFixIds.length,
        },
        { status: 400 }
      );
    }

    const artifactViolations = violationsWithFixes.filter(v => artifactFixIds.has(v.id));
    const branchName = customBranch || createFixBranchName('accessibility-fixes');

    // The intent record makes a later PR recoverable even if its closing
    // record cannot be written.
    let intentRecorded = false;
    try {
      intentRecorded = await createAuditLogWithRetry({
        orgId: auth.user.orgId,
        userId: auth.user.id,
        action: 'github_pr_intent',
        metadata: {
          repository,
          branchName,
          rules: artifactViolations.map(v => v.ruleId),
          plannedArtifacts: repositoryPlan.fileWrites.length + artifactViolations.length + 1,
          plannedFixIds: artifactViolations.map(v => v.id),
          plannedSourceFiles: repositoryPlan.fileWrites.map(write => write.path),
          plannedReviewFixIds: repositoryPlan.reviewFixIds,
          refusedFixIds: repositoryPlan.refusedFixIds,
        },
      });
    } catch (err) {
      logger.error({ err }, 'Failed to write the GitHub pull request audit intent');
    }
    if (!intentRecorded) {
      return NextResponse.json(
        {
          success: false,
          error: 'Pull request was not created because the audit trail could not be written.',
        },
        { status: 500 }
      );
    }

    // Create branch
    const branchCreated = await createBranch(githubToken, owner, repo, branchName, defaultBranch);
    if (!branchCreated) {
      return NextResponse.json(
        { success: false, error: 'Failed to create the fix branch on GitHub' },
        { status: 502 }
      );
    }

    // Generate PR content from the candidates that may carry an artifact.
    const prTitle = generatePrTitle(artifactViolations.map(toViolationForPR));
    const prBody = generatePrBody(artifactViolations.map(toViolationForPR), violations[0].project);

    // Apply the proved source changes.
    let filesModified: Array<{ path: string; fixesApplied: number }> = [];
    let fixesAppliedTotal = 0;
    let appliedFixIds: string[] = [];
    try {
      const fixResult = await applyRepositoryFixPlan(
        githubToken,
        owner,
        repo,
        branchName,
        repositoryPlan
      );
      filesModified = fixResult.filesModified;
      fixesAppliedTotal = fixResult.fixesAppliedTotal;
      appliedFixIds = fixResult.appliedFixIds ?? [];
    } catch (err) {
      logger.error({ err }, 'Failed to apply fixes to repository files');
    }

    // A violation is only linked to the PR when an artifact for it was actually
    // accepted by GitHub: a source file it was patched into, or its own fix
    // document. A refused write means no artifact, so no link.
    const acceptedViolationIds = new Set<string>(appliedFixIds);
    const fixFileIds = new Set<string>();
    let filesCreated = 0;

    // Create individual fix files for violations (docs fallback alongside source edits)
    for (const violation of artifactViolations) {
      const fixFileName = `accessguard-fixes/${violation.ruleId}-${violation.id.slice(0, 8)}.md`;
      const fixContent = generateFixFile(violation);

      const written = await createFile(
        githubToken,
        owner,
        repo,
        fixFileName,
        fixContent,
        `fix(a11y): ${violation.ruleId} - ${violation.description.slice(0, 50)}`,
        branchName
      );
      if (written) {
        acceptedViolationIds.add(violation.id);
        fixFileIds.add(violation.id);
        filesCreated++;
      }
    }

    // Create a summary file with all fixes. It lists the fixes whose own fix
    // document was accepted, so it never points at a file GitHub refused.
    const summaryContent = generateSummaryFile(
      artifactViolations.filter(v => fixFileIds.has(v.id)),
      fixesAppliedTotal,
      filesModified.length
    );
    const summaryWritten = await createFile(
      githubToken,
      owner,
      repo,
      'accessguard-fixes/summary.md',
      summaryContent,
      `docs: Add accessibility fix summary for ${fixFileIds.size} issues`,
      branchName
    );
    if (summaryWritten) filesCreated++;

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

    // Close the intent trail with the PR that now exists. The intent record
    // remains the recoverable trail when this closing write fails.
    const auditEntry = {
      orgId: auth.user.orgId,
      userId: auth.user.id,
      action: 'github_pr_created' as const,
      metadata: {
        repository,
        branchName,
        prUrl: pr.url,
        verifiedFixes: artifactViolations.length,
        fixesAppliedToSource: fixesAppliedTotal,
        filesModified: filesModified.map(f => f.path),
        linkedViolations: [...acceptedViolationIds],
        skippedInvalid: selection.skippedInvalid,
        skippedOverLimit: selection.skippedOverLimit,
        skippedLowConfidence: selection.skippedLowConfidence,
        skippedUnverified: selection.skippedUnverified,
        skippedRefused: repositoryPlan.refusedFixIds.length,
        rules: artifactViolations.map(v => v.ruleId),
      },
    };

    let auditRecorded = false;
    try {
      auditRecorded = await createAuditLogWithRetry(auditEntry);
    } catch (err) {
      logger.error({ err }, 'Failed to close the GitHub pull request audit trail');
    }
    const auditNotice = auditRecorded
      ? 'The pull request and its pre-mutation intent are recorded in the audit trail.'
      : 'The closing pull-request audit record could not be written; the pre-mutation github_pr_intent record holds the recoverable trail.';

    // Update violations with PR URL — only the violations whose fix is in the PR.
    const eligibleViolationIds = [...acceptedViolationIds];
    let violationsUpdated = 0;
    if (eligibleViolationIds.length > 0) {
      try {
        const updated = await db.violation.updateMany({
          where: {
            id: { in: eligibleViolationIds },
          },
          data: {
            githubPrUrl: pr.url,
          },
        });
        violationsUpdated = updated.count;
      } catch (err) {
        // The PR exists and is audited; the link on the violation rows is what
        // failed. Report it instead of pretending the request failed.
        logger.error({ err }, 'Failed to link violations to the pull request');
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        prUrl: pr.url,
        prNumber: 'N/A', // PR number would require additional API call
        branchName,
        filesCreated,
        violationsUpdated,
        verifiedFixes: artifactViolations.length,
        skippedInvalid: selection.skippedInvalid,
        skippedOverLimit: selection.skippedOverLimit,
        skippedLowConfidence: selection.skippedLowConfidence,
        skippedUnverified: selection.skippedUnverified,
        skippedRefused: repositoryPlan.refusedFixIds.length,
        filesModified,
        fixesAppliedTotal,
        fixesWithoutArtifact: artifactViolations.length - acceptedViolationIds.size,
        auditRecorded,
        auditNotice,
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
  lines.push('- Each fix in this PR passed the safety, placeholder and WCAG-rule checks, and its remediation snippet was re-scanned with axe-core for the rule it targets.');
  lines.push('- Fixes that failed or could not be verified were excluded from this PR.');
  lines.push('- Verification is rule-level on the remediation snippet, not a full re-scan of your application.');
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
    lines.push(`- [${escapeMarkdownText(v.ruleId)}](${encodeURIComponent(fileName)}) - ${escapeMarkdownText(v.severity)}`);
  }

  return lines.join('\n');
}

// Generate individual fix file content
function generateFixFile(violation: ViolationWithProject): string {
  const elementHtml = violation.elementHtml || 'No element HTML available.';
  const selector = violation.elementSelector || 'No selector available.';
  const remediation = violation.remediationCode || 'No fix code available.';
  const htmlFence = codeFence(elementHtml);
  const codeFenceMarker = codeFence(remediation);

  const lines: string[] = [
    `# Fix: ${violation.ruleId}`,
    '',
    '## Issue Details',
    '',
    `**Severity:** ${violation.severity}`,
    `**WCAG Criteria:** ${violation.wcagCriteria || 'Not listed'}`,
    `**URL:** ${escapeMarkdownText(violation.url)}`,
    '',
    '### Description',
    escapeMarkdownText(violation.description),
    '',
    '### Element Selector',
    // The selector comes from the scanned page. An inline code span with a
    // fence longer than any backtick run in the value cannot break out of it,
    // so the selector stays readable and never becomes a Markdown link.
    inlineCode(selector),
    '',
    '### Original HTML',
    `${htmlFence}html`,
    elementHtml,
    htmlFence,
    '',
    '## Suggested Fix',
    '',
    '### Explanation',
    escapeMarkdownText(violation.aiExplanation || 'No explanation available.'),
    '',
    '### Code',
    `${codeFenceMarker}html`,
    remediation,
    codeFenceMarker,
    '',
    '---',
    '*Generated by AccessGuard*',
  ];

  return lines.join('\n');
}
