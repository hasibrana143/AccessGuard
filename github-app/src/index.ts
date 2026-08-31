import { Probot, ProbotOctokit } from 'probot';

const API_URL = process.env.ACCESSGUARD_API_URL || 'https://api.accessguard.io';
const API_KEY = process.env.ACCESSGUARD_API_KEY || '';

interface ViolationAnnotation {
  path: string;
  start_line: number;
  end_line: number;
  annotation_level: 'notice' | 'warning' | 'failure';
  message: string;
  title: string;
  raw_details?: string;
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_KEY}`,
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error ${response.status}: ${body}`);
  }
  return response.json() as Promise<T>;
}

export default function accessGuardApp(app: Probot) {
  app.on('push', async (context) => {
    const repo = context.repo();
    const branch = context.payload.ref.replace('refs/heads/', '');

    context.log.info(`Push to ${repo.owner}/${repo.repo} on ${branch}`);

    try {
      await triggerScan(context, repo, branch, 'push');
    } catch (error: any) {
      context.log.error('Scan trigger failed:', error);
    }
  });

  app.on('pull_request.opened', async (context) => {
    const repo = context.repo();
    const pr = context.payload.pull_request;

    context.log.info(`PR #${pr.number} opened in ${repo.owner}/${repo.repo}`);

    try {
      await annotatePR(context, repo, pr.number, pr.head.sha);
    } catch (error: any) {
      context.log.error('PR annotation failed:', error);
    }
  });

  app.on('pull_request.synchronize', async (context) => {
    const repo = context.repo();
    const pr = context.payload.pull_request;

    context.log.info(`PR #${pr.number} updated in ${repo.owner}/${repo.repo}`);

    try {
      await annotatePR(context, repo, pr.number, pr.head.sha);
    } catch (error: any) {
      context.log.error('PR annotation failed:', error);
    }
  });

  app.on('check_run.requested_action', async (context) => {
    const action = context.payload.requested_action?.identifier;
    if (action !== 'fix') return;

    const repo = context.repo();
    const checkRun = context.payload.check_run;
    const violationId = checkRun.output?.summary?.match(/violation_id: (.+)/)?.[1];

    if (!violationId) {
      context.log.warn('No violation ID found in check run output');
      return;
    }

    context.log.info(`Fix requested for violation ${violationId}`);

    try {
      await createFixPR(context, repo, violationId, checkRun.head_sha);
    } catch (error: any) {
      context.log.error('Fix PR creation failed:', error);
    }
  });

  async function triggerScan(
    context: any,
    repo: { owner: string; repo: string },
    branch: string,
    trigger: string
  ) {
    const checkRun = await context.octokit.checks.create({
      ...repo,
      name: 'AccessGuard Accessibility Scan',
      head_sha: context.payload.after || context.payload.pull_request?.head?.sha,
      status: 'in_progress',
      output: {
        title: 'Accessibility Scan in Progress',
        summary: 'Scanning for accessibility violations...',
      },
    });

    try {
      const result = await apiRequest<{
        scanId: string;
        violations: Array<{
          path: string;
          line: number;
          severity: string;
          ruleId: string;
          message: string;
          wcagCriterion: string;
        }>;
        summary: {
          critical: number;
          serious: number;
          moderate: number;
          minor: number;
          score: number;
        };
      }>('/api/scan/github', {
        method: 'POST',
        body: JSON.stringify({
          owner: repo.owner,
          repo: repo.repo,
          branch,
          trigger,
        }),
      });

      const annotations: ViolationAnnotation[] = result.violations.map((v) => ({
        path: v.path,
        start_line: v.line,
        end_line: v.line,
        annotation_level: v.severity === 'critical' || v.severity === 'serious'
          ? 'failure'
          : 'warning',
        message: `[${v.ruleId}] ${v.message} (WCAG ${v.wcagCriterion})`,
        title: `${v.severity.toUpperCase()}: ${v.ruleId}`,
      }));

      const conclusion = result.summary.critical > 0 ? 'failure' : 'success';

      await context.octokit.checks.update({
        ...repo,
        check_run_id: checkRun.data.id,
        status: 'completed',
        conclusion,
        output: {
          title: `Accessibility Scan: ${conclusion === 'success' ? 'Passed' : 'Failed'}`,
          summary: [
            `**Score**: ${result.summary.score}%`,
            `**Critical**: ${result.summary.critical}`,
            `**Serious**: ${result.summary.serious}`,
            `**Moderate**: ${result.summary.moderate}`,
            `**Minor**: ${result.summary.minor}`,
            '',
            `violation_id: ${result.violations[0]?.ruleId || 'none'}`,
          ].join('\n'),
          annotations: annotations.slice(0, 50),
        },
        actions: result.violations.length > 0 ? [{
          identifier: 'fix',
          label: 'Fix with AccessGuard',
          description: 'Generate AI-powered fix for violations',
        }] : [],
      });
    } catch (error: any) {
      await context.octokit.checks.update({
        ...repo,
        check_run_id: checkRun.data.id,
        status: 'completed',
        conclusion: 'failure',
        output: {
          title: 'Accessibility Scan: Error',
          summary: `Scan failed: ${error.message}`,
        },
      });
    }
  }

  async function annotatePR(
    context: any,
    repo: { owner: string; repo: string },
    prNumber: number,
    headSha: string
  ) {
    const result = await apiRequest<{
      violations: Array<{
        path: string;
        line: number;
        severity: string;
        ruleId: string;
        message: string;
        wcagCriterion: string;
      }>;
      summary: {
        critical: number;
        serious: number;
        moderate: number;
        minor: number;
        score: number;
      };
    }>('/api/scan/github-pr', {
      method: 'POST',
      body: JSON.stringify({
        owner: repo.owner,
        repo: repo.repo,
        prNumber,
      }),
    });

    if (result.violations.length === 0) return;

    const annotations: ViolationAnnotation[] = result.violations.map((v) => ({
      path: v.path,
      start_line: v.line,
      end_line: v.line,
      annotation_level: v.severity === 'critical' ? 'failure' : 'warning',
      message: `[${v.ruleId}] ${v.message} (WCAG ${v.wcagCriterion})`,
      title: `${v.severity.toUpperCase()}: ${v.ruleId}`,
    }));

    await context.octokit.checks.create({
      ...repo,
      name: 'AccessGuard PR Scan',
      head_sha: headSha,
      status: 'completed',
      conclusion: result.summary.critical > 0 ? 'failure' : 'success',
      output: {
        title: `PR Accessibility: ${result.summary.critical > 0 ? 'Issues Found' : 'Passed'}`,
        summary: `Score: ${result.summary.score}% | Critical: ${result.summary.critical} | Serious: ${result.summary.serious}`,
        annotations: annotations.slice(0, 50),
      },
    });
  }

  async function createFixPR(
    context: any,
    repo: { owner: string; repo: string },
    violationId: string,
    headSha: string
  ) {
    const fix = await apiRequest<{
      code: string;
      explanation: string;
      confidence: number;
      filePath: string;
      originalCode: string;
    }>(`/api/violations/${violationId}/fix`, {
      method: 'POST',
    });

    const branchName = `accessguard/fix-${violationId}-${Date.now()}`;
    const { owner, repo: repoName } = repo;

    const baseRef = await context.octokit.git.getRef({
      owner,
      repo: repoName,
      ref: `heads/${context.payload.repository.default_branch}`,
    });

    await context.octokit.git.createRef({
      owner,
      repo: repoName,
      ref: `refs/heads/${branchName}`,
      sha: baseRef.data.object.sha,
    });

    const fileContent = await context.octokit.repos.getContent({
      owner,
      repo: repoName,
      path: fix.filePath,
      ref: baseRef.data.object.sha,
    });

    const content = Buffer.from(
      (fileContent.data as any).content,
      'base64'
    ).toString('utf-8');

    const updatedContent = content.replace(fix.originalCode, fix.code);

    await context.octokit.repos.createOrUpdateFileContents({
      owner,
      repo: repoName,
      path: fix.filePath,
      message: `fix: resolve ${violationId} on ${fix.filePath}`,
      content: Buffer.from(updatedContent).toString('base64'),
      branch: branchName,
      sha: (fileContent.data as any).sha,
    });

    const pr = await context.octokit.pulls.create({
      owner,
      repo: repoName,
      title: `Fix: Accessibility violation on ${fix.filePath}`,
      body: [
        `## AccessGuard Auto-Fix`,
        '',
        `**Violation**: \`${violationId}\``,
        `**Confidence**: ${Math.round(fix.confidence * 100)}%`,
        `**Explanation**: ${fix.explanation}`,
        '',
        `### Before`,
        '```',
        fix.originalCode,
        '```',
        '',
        `### After`,
        '```',
        fix.code,
        '```',
        '',
        `---`,
        `*Generated by AccessGuard. Re-scan after merge to verify.*`,
      ].join('\n'),
      head: branchName,
      base: context.payload.repository.default_branch,
    });

    context.log.info(`Fix PR created: #${pr.data.number}`);
  }
}
