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
  createAuditLog: vi.fn(),
  verifyFixes: vi.fn(),
  applyFixesToRepository: vi.fn(),
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
vi.mock('@/lib/audit', () => ({ createAuditLog: mocks.createAuditLog }));
vi.mock('@/lib/github', () => ({
  isGitHubConfigured: mocks.isGitHubConfigured,
  validateWriteAccess: mocks.validateWriteAccess,
  getRepositoryDetails: mocks.getRepositoryDetails,
  createBranch: mocks.createBranch,
  createFile: mocks.createFile,
  createPullRequest: mocks.createPullRequest,
  getUserRepositories: mocks.getUserRepositories,
  applyFixesToRepository: mocks.applyFixesToRepository,
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
    mocks.createAuditLog.mockResolvedValue(true);
    mocks.applyFixesToRepository.mockResolvedValue({
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

    expect(mocks.createAuditLog).toHaveBeenCalledWith(
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
    mocks.applyFixesToRepository.mockResolvedValue({
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

  it('reports an audit failure instead of claiming a trail', async () => {
    mocks.findMany.mockResolvedValue([violation('v1')]);
    mocks.verifyFixes.mockResolvedValue(
      new Map([['v1', { status: 'verified', confidence: 1, reason: 'ok' }]])
    );
    mocks.createAuditLog.mockResolvedValue(false);

    const res = await POST(request(['v1']));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.auditRecorded).toBe(false);
  });

  it('keeps the audit trail when the violation update fails', async () => {
    mocks.findMany.mockResolvedValue([violation('v1')]);
    mocks.verifyFixes.mockResolvedValue(
      new Map([['v1', { status: 'verified', confidence: 1, reason: 'ok' }]])
    );
    mocks.updateMany.mockRejectedValue(new Error('db down'));

    const res = await POST(request(['v1']));

    expect(res.status).toBe(200);
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'github_pr_created' })
    );
  });
});
