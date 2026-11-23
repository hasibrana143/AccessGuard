import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  updateMany: vi.fn(),
  isGitHubConfigured: vi.fn(),
  validateWriteAccess: vi.fn(),
  getRepositoryDetails: vi.fn(),
  createBranch: vi.fn(),
  createFile: vi.fn(),
  createPullRequest: vi.fn(),
  getUserRepositories: vi.fn(),
  requireVerifiedEmail: vi.fn(),
  checkRateLimit: vi.fn(),
  createAuditLogWithRetry: vi.fn(),
  verifyFixes: vi.fn(),
  planRepositoryFixes: vi.fn(),
  applyRepositoryFixPlan: vi.fn(),
  getTree: vi.fn(),
  getContent: vi.fn(),
}));

vi.mock('@octokit/rest', () => ({
  Octokit: class {
    git = { getTree: mocks.getTree };
    repos = { getContent: mocks.getContent };
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    violation: {
      findMany: mocks.findMany,
      updateMany: mocks.updateMany,
    },
    githubConnection: { findFirst: mocks.findFirst },
  },
}));

vi.mock('@/lib/rbac', () => ({ requireVerifiedEmail: mocks.requireVerifiedEmail }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
  rateLimits: { default: { interval: 60000, limit: 100 }, remediation: { interval: 60000, limit: 20 } },
}));
vi.mock('@/lib/audit', () => ({ createAuditLogWithRetry: mocks.createAuditLogWithRetry }));
vi.mock('@/lib/github', () => ({
  isGitHubConfigured: mocks.isGitHubConfigured,
  validateWriteAccess: mocks.validateWriteAccess,
  getRepositoryDetails: mocks.getRepositoryDetails,
  createBranch: mocks.createBranch,
  createFile: mocks.createFile,
  createPullRequest: mocks.createPullRequest,
  getUserRepositories: mocks.getUserRepositories,
  planRepositoryFixes: mocks.planRepositoryFixes,
  applyRepositoryFixPlan: mocks.applyRepositoryFixPlan,
}));
vi.mock('@/lib/fix-verification', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/fix-verification')>();
  return { ...actual, verifyFixes: mocks.verifyFixes };
});

import { POST } from './route';

const USER = { id: 'user-1', orgId: 'org-1', email: 'dev@example.com' };

function violation(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    scanId: 'scan-1',
    projectId: 'project-1',
    ruleId: 'image-alt',
    wcagCriteria: '1.1.1',
    severity: 'serious',
    url: 'https://example.com/',
    elementSelector: 'img',
    elementHtml: '<img src="a.jpg">',
    description: 'Image missing alt text',
    remediationCode: '<img src="a.jpg" alt="A photo">',
    aiExplanation: 'Add alt text',
    aiConfidenceScore: 0.9,
    status: 'open',
    githubPrUrl: null,
    createdAt: new Date(),
    fixedAt: null,
    project: { name: 'Example', url: 'https://example.com' },
    ...overrides,
  };
}

function request(ids: string[]): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/github/create-pr'), {
    method: 'POST',
    body: JSON.stringify({ violationIds: ids, repository: 'owner/repo' }),
    headers: { 'Content-Type': 'application/json', 'x-github-token': 'token' },
  });
}

async function useActualRepositoryPlanner() {
  const actual = await vi.importActual<typeof import('@/lib/github')>('@/lib/github');
  mocks.planRepositoryFixes.mockImplementation(actual.planRepositoryFixes);
}

function mockRepository(files: Record<string, string>) {
  mocks.getTree.mockResolvedValue({
    data: {
      tree: Object.keys(files).map(path => ({ type: 'blob', path })),
    },
  });
  mocks.getContent.mockImplementation(async ({ path }: { path: string }) => {
    const content = files[path];
    if (content === undefined) throw new Error('not found');
    return { data: { content: Buffer.from(content, 'utf8').toString('base64') } };
  });
}

describe('POST /api/github/create-pr', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireVerifiedEmail.mockResolvedValue({ user: USER });
    mocks.checkRateLimit.mockResolvedValue({ success: true, limit: 20, remaining: 19, reset: Date.now() + 60000 });
    mocks.isGitHubConfigured.mockReturnValue(true);
    mocks.validateWriteAccess.mockResolvedValue(true);
    mocks.getRepositoryDetails.mockResolvedValue({ fullName: 'owner/repo', name: 'repo', defaultBranch: 'main', private: false });
    mocks.findFirst.mockResolvedValue({ repositories: JSON.stringify([{ fullName: 'owner/repo' }]) });
    mocks.createBranch.mockResolvedValue(true);
    mocks.createFile.mockResolvedValue(true);
    mocks.createPullRequest.mockResolvedValue({ url: 'https://github.com/owner/repo/pull/1' });
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.createAuditLogWithRetry.mockResolvedValue(true);
    mocks.planRepositoryFixes.mockImplementation(
      async (
        _token: string,
        _owner: string,
        _repo: string,
        _ref: string,
        violations: Array<{ id: string }>
      ) => ({
        fileWrites: [],
        appliedFixIds: [],
        refusedFixIds: [],
        reviewFixIds: violations.map(violation => violation.id),
      })
    );
    mocks.applyRepositoryFixPlan.mockResolvedValue({
      filesModified: [],
      fixesAppliedTotal: 0,
      appliedFixIds: [],
    });
  });

  it('rejects a request without remediation code before touching GitHub', async () => {
    mocks.findMany.mockResolvedValue([violation('v1', { remediationCode: null })]);

    const res = await POST(request(['v1']));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(mocks.verifyFixes).not.toHaveBeenCalled();
    expect(mocks.createBranch).not.toHaveBeenCalled();
    expect(mocks.createPullRequest).not.toHaveBeenCalled();
  });

  it('rejects a request with more violations than the per-request limit', async () => {
    const ids = Array.from({ length: 30 }, (_, i) => `v${i}`);
    const res = await POST(request(ids));

    expect(res.status).toBe(400);
    expect(mocks.verifyFixes).not.toHaveBeenCalled();
    expect(mocks.createBranch).not.toHaveBeenCalled();
  });

  it('opens no PR when every fix is unverified', async () => {
    mocks.findMany.mockResolvedValue([violation('v1')]);
    mocks.verifyFixes.mockResolvedValue(
      new Map([['v1', { status: 'unverified', confidence: null, reason: 'no browser' }]])
    );

    const res = await POST(request(['v1']));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(mocks.createBranch).not.toHaveBeenCalled();
    expect(mocks.createPullRequest).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it('opens no branch, document or pull request when every candidate is refused', async () => {
    mocks.findMany.mockResolvedValue([violation('v1')]);
    mocks.verifyFixes.mockResolvedValue(
      new Map([['v1', { status: 'verified', confidence: 1, reason: 'ok' }]])
    );
    mocks.planRepositoryFixes.mockResolvedValue({
      fileWrites: [],
      appliedFixIds: [],
      refusedFixIds: ['v1'],
      reviewFixIds: [],
    });

    const res = await POST(request(['v1']));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain("repository's own stylesheet or runtime");
    expect(mocks.createBranch).not.toHaveBeenCalled();
    expect(mocks.createFile).not.toHaveBeenCalled();
    expect(mocks.createPullRequest).not.toHaveBeenCalled();
    expect(mocks.createAuditLogWithRetry).not.toHaveBeenCalled();
  });

  it('writes the audit intent before creating the branch', async () => {
    mocks.findMany.mockResolvedValue([violation('v1')]);
    mocks.verifyFixes.mockResolvedValue(
      new Map([['v1', { status: 'verified', confidence: 1, reason: 'ok' }]])
    );

    const res = await POST(request(['v1']));

    expect(res.status).toBe(200);
    expect(mocks.createAuditLogWithRetry.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        action: 'github_pr_intent',
        metadata: expect.objectContaining({
          repository: 'owner/repo',
          branchName: expect.any(String),
          rules: ['image-alt'],
          plannedArtifacts: 2,
        }),
      })
    );
    expect(mocks.planRepositoryFixes.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.createAuditLogWithRetry.mock.invocationCallOrder[0]
    );
    expect(mocks.createAuditLogWithRetry.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.createBranch.mock.invocationCallOrder[0]
    );
  });

  it('opens no pull request when the audit intent cannot be written', async () => {
    mocks.findMany.mockResolvedValue([violation('v1')]);
    mocks.verifyFixes.mockResolvedValue(
      new Map([['v1', { status: 'verified', confidence: 1, reason: 'ok' }]])
    );
    mocks.createAuditLogWithRetry.mockResolvedValue(false);

    const res = await POST(request(['v1']));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain('audit trail could not be written');
    expect(mocks.createBranch).not.toHaveBeenCalled();
    expect(mocks.applyRepositoryFixPlan).not.toHaveBeenCalled();
    expect(mocks.createFile).not.toHaveBeenCalled();
    expect(mocks.createPullRequest).not.toHaveBeenCalled();
  });

  it('creates no fix document for a refused candidate', async () => {
    mocks.findMany.mockResolvedValue([
      violation('v1'),
      violation('v2', {
        ruleId: 'button-name',
        elementHtml: '<button>Save</button>',
        remediationCode: '<button aria-label="Save">Save</button>',
        description: 'Button has no accessible name',
      }),
    ]);
    mocks.verifyFixes.mockResolvedValue(
      new Map([
        ['v1', { status: 'verified', confidence: 1, reason: 'ok' }],
        ['v2', { status: 'verified', confidence: 1, reason: 'ok' }],
      ])
    );
    mocks.planRepositoryFixes.mockResolvedValue({
      fileWrites: [
        {
          path: 'index.html',
          content: '<html><body><img src="a.jpg" alt="A photo"></body></html>',
          message: 'fix(a11y): image-alt',
          fixesApplied: 1,
        },
      ],
      appliedFixIds: ['v1'],
      refusedFixIds: ['v2'],
      reviewFixIds: [],
    });
    mocks.applyRepositoryFixPlan.mockResolvedValue({
      filesModified: [{ path: 'index.html', fixesApplied: 1 }],
      fixesAppliedTotal: 1,
      appliedFixIds: ['v1'],
    });

    const res = await POST(request(['v1', 'v2']));
    const body = await res.json();
    const writtenPaths = mocks.createFile.mock.calls.map(call => call[3]);

    expect(res.status).toBe(200);
    expect(writtenPaths).toContain('accessguard-fixes/image-alt-v1.md');
    expect(writtenPaths).not.toContain('accessguard-fixes/button-name-v2.md');
    const summaryCall = mocks.createFile.mock.calls.find(call => call[3] === 'accessguard-fixes/summary.md');
    expect(summaryCall?.[4]).not.toContain('button-name');
    expect(mocks.createPullRequest.mock.calls[0][4]).not.toContain('button-name');
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['v1'] } } })
    );
    expect(body.data.skippedRefused).toBe(1);
  });

  it('opens no PR when repository planning fails', async () => {
    mocks.findMany.mockResolvedValue([violation('v1')]);
    mocks.verifyFixes.mockResolvedValue(
      new Map([['v1', { status: 'verified', confidence: 1, reason: 'ok' }]])
    );
    mocks.planRepositoryFixes.mockRejectedValue(new Error('scan failed'));

    const res = await POST(request(['v1']));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('no fix can be applied safely');
    expect(mocks.createBranch).not.toHaveBeenCalled();
    expect(mocks.createPullRequest).not.toHaveBeenCalled();
  });

  it('opens no PR when the branch cannot be created', async () => {
    mocks.findMany.mockResolvedValue([violation('v1')]);
    mocks.verifyFixes.mockResolvedValue(
      new Map([['v1', { status: 'verified', confidence: 1, reason: 'ok' }]])
    );
    mocks.createBranch.mockResolvedValue(false);

    const res = await POST(request(['v1']));

    expect(res.status).toBe(502);
    expect(mocks.createPullRequest).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it('links only the violations whose fix is in the PR', async () => {
    mocks.findMany.mockResolvedValue([
      violation('v1'),
      violation('v2', { elementHtml: '<img src="b.jpg">', remediationCode: '<img src="b.jpg" alt="B">' }),
    ]);
    mocks.verifyFixes.mockResolvedValue(
      new Map([
        ['v1', { status: 'verified', confidence: 1, reason: 'ok' }],
        ['v2', { status: 'failed', confidence: 0, reason: 'still fires' }],
      ])
    );

    const res = await POST(request(['v1', 'v2']));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.verifiedFixes).toBe(1);
    expect(body.data.skippedLowConfidence).toBe(1);
    expect(body.data.violationsUpdated).toBe(1);
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['v1'] } } })
    );
  });

  it('writes an audit trail for the PR it opened', async () => {
    mocks.findMany.mockResolvedValue([violation('v1')]);
    mocks.verifyFixes.mockResolvedValue(
      new Map([['v1', { status: 'verified', confidence: 1, reason: 'ok' }]])
    );

    const res = await POST(request(['v1']));
    expect(res.status).toBe(200);

    expect(mocks.createAuditLogWithRetry).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'github_pr_created',
        orgId: USER.orgId,
        metadata: expect.objectContaining({ verifiedFixes: 1 }),
      })
    );
  });

  it('counts only the files GitHub actually accepted', async () => {
    mocks.findMany.mockResolvedValue([violation('v1')]);
    mocks.verifyFixes.mockResolvedValue(
      new Map([['v1', { status: 'verified', confidence: 1, reason: 'ok' }]])
    );
    mocks.createFile.mockResolvedValue(false);

    const res = await POST(request(['v1']));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.filesCreated).toBe(0);
  });

  it('does not link a violation whose fix file was refused', async () => {
    mocks.findMany.mockResolvedValue([violation('v1')]);
    mocks.verifyFixes.mockResolvedValue(
      new Map([['v1', { status: 'verified', confidence: 1, reason: 'ok' }]])
    );
    mocks.createFile.mockResolvedValue(false); // GitHub refuses every write

    const res = await POST(request(['v1']));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.violationsUpdated).toBe(0);
    expect(body.data.fixesWithoutArtifact).toBe(1);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it('links a violation whose fix was written into a source file', async () => {
    mocks.findMany.mockResolvedValue([violation('v1')]);
    mocks.verifyFixes.mockResolvedValue(
      new Map([['v1', { status: 'verified', confidence: 1, reason: 'ok' }]])
    );
    mocks.planRepositoryFixes.mockResolvedValue({
      fileWrites: [
        {
          path: 'index.html',
          content: '<html><body><img src="a.jpg" alt="A photo"></body></html>',
          message: 'fix(a11y): image-alt',
          fixesApplied: 1,
        },
      ],
      appliedFixIds: ['v1'],
      refusedFixIds: [],
      reviewFixIds: [],
    });
    mocks.applyRepositoryFixPlan.mockResolvedValue({
      filesModified: [{ path: 'index.html', fixesApplied: 1 }],
      fixesAppliedTotal: 1,
      appliedFixIds: ['v1'],
    });
    mocks.createFile.mockResolvedValue(false); // only the documentation file is refused

    const res = await POST(request(['v1']));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.violationsUpdated).toBe(1);
    expect(body.data.fixesWithoutArtifact).toBe(0);
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['v1'] } } })
    );
  });

  it('reports the degraded closing audit state while keeping the intent trail', async () => {
    mocks.findMany.mockResolvedValue([violation('v1')]);
    mocks.verifyFixes.mockResolvedValue(
      new Map([['v1', { status: 'verified', confidence: 1, reason: 'ok' }]])
    );
    mocks.createAuditLogWithRetry.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const res = await POST(request(['v1']));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.prUrl).toBe('https://github.com/owner/repo/pull/1');
    expect(body.data.auditRecorded).toBe(false);
    expect(body.data.auditNotice).toContain('github_pr_intent');
  });

  it('keeps the audit trail when the violation update fails', async () => {
    mocks.findMany.mockResolvedValue([violation('v1')]);
    mocks.verifyFixes.mockResolvedValue(
      new Map([['v1', { status: 'verified', confidence: 1, reason: 'ok' }]])
    );
    mocks.updateMany.mockRejectedValue(new Error('db down'));

    const res = await POST(request(['v1']));

    expect(res.status).toBe(200);
    expect(mocks.createAuditLogWithRetry).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'github_pr_created' })
    );
  });

  it('13-H1: opens no pull request when the document base selects a different stylesheet', async () => {
    await useActualRepositoryPlanner();
    mocks.findMany.mockResolvedValue([
      violation('v1', {
        elementHtml: '<img id="target" src="x">',
        remediationCode: '<img id="target" src="x" alt="Photo">',
      }),
    ]);
    mocks.verifyFixes.mockResolvedValue(
      new Map([['v1', { status: 'verified', confidence: 1, reason: 'ok' }]])
    );
    mockRepository({
      'index.html':
        '<html><head><base href="/sub/"><link rel="stylesheet" href="theme.bin"></head><body><img id="target" src="x"></body></html>',
      'theme.bin': 'img{color:red}',
      'sub/theme.bin':
        '[alt]{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}',
    });

    const res = await POST(request(['v1']));

    expect(res.status).toBe(400);
    expect(mocks.createBranch).not.toHaveBeenCalled();
    expect(mocks.createFile).not.toHaveBeenCalled();
    expect(mocks.createPullRequest).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it('13-H2a: opens no pull request when a computed property read reacts to the fix', async () => {
    await useActualRepositoryPlanner();
    mocks.findMany.mockResolvedValue([
      violation('v1', {
        elementHtml: '<img id="target" src="x">',
        remediationCode: '<img id="target" src="x" alt="Photo">',
      }),
    ]);
    mocks.verifyFixes.mockResolvedValue(
      new Map([['v1', { status: 'verified', confidence: 1, reason: 'ok' }]])
    );
    mockRepository({
      'index.html':
        '<html><head><style>.overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}</style></head><body><img id="target" src="x"><script>document.querySelectorAll("img").forEach(function(img){if(img["al"+"t"])img.classList.add("overlay")});</script></body></html>',
    });

    const res = await POST(request(['v1']));

    expect(res.status).toBe(400);
    expect(mocks.createBranch).not.toHaveBeenCalled();
    expect(mocks.createFile).not.toHaveBeenCalled();
    expect(mocks.createPullRequest).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it('13-H2b: opens no pull request when a computed selector read reacts to the fix', async () => {
    await useActualRepositoryPlanner();
    mocks.findMany.mockResolvedValue([
      violation('v1', {
        elementHtml: '<img id="target" src="x">',
        remediationCode: '<img id="target" src="x" alt="Photo">',
      }),
    ]);
    mocks.verifyFixes.mockResolvedValue(
      new Map([['v1', { status: 'verified', confidence: 1, reason: 'ok' }]])
    );
    mockRepository({
      'index.html':
        '<html><head><style>.overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}</style></head><body><img id="target" src="x"><script>document.querySelectorAll("img").forEach(function(img){if(img.matches("["+"al"+"t"+"]"))img.classList.add("overlay")});</script></body></html>',
    });

    const res = await POST(request(['v1']));

    expect(res.status).toBe(400);
    expect(mocks.createBranch).not.toHaveBeenCalled();
    expect(mocks.createFile).not.toHaveBeenCalled();
    expect(mocks.createPullRequest).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it('13-M2: opens no pull request when the unsafe candidate is after the source budget', async () => {
    await useActualRepositoryPlanner();
    const targets = Array.from({ length: 11 }, (_, index) => `target${index + 1}`);
    mocks.findMany.mockResolvedValue(
      targets.map(id =>
        violation(`v-${id}`, {
          elementHtml: `<img id="${id}" src="${id}.jpg">`,
          remediationCode: `<img id="${id}" src="${id}.jpg" alt="Photo">`,
        })
      )
    );
    mocks.verifyFixes.mockResolvedValue(
      new Map(
        targets.map(id => [`v-${id}`, { status: 'verified', confidence: 1, reason: 'ok' }])
      )
    );
    mockRepository({
      'index.html': `<html><body>${targets.map(id => `<img id="${id}" src="${id}.jpg">`).join('')}</body></html>`,
      'styles.css': `${targets.slice(0, 10).map(id => `#${id}{display:none}`).join('')}#target11:nth-child(11 of [alt]){position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}`,
    });

    const res = await POST(request(targets.map(id => `v-${id}`)));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(mocks.createBranch).not.toHaveBeenCalled();
    expect(mocks.createFile).not.toHaveBeenCalled();
    expect(mocks.createPullRequest).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});
