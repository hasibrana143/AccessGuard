import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getTree: vi.fn(),
  getContent: vi.fn(),
  createOrUpdateFileContents: vi.fn(),
  getAuthenticated: vi.fn(),
  listForAuthenticatedUser: vi.fn(),
  getRef: vi.fn(),
  createRef: vi.fn(),
  pullCreate: vi.fn(),
  pullGet: vi.fn(),
  repoGet: vi.fn(),
}));

vi.mock('@octokit/rest', () => ({
  Octokit: class {
    git = { getTree: mocks.getTree, getRef: mocks.getRef, createRef: mocks.createRef };
    repos = {
      getContent: mocks.getContent,
      createOrUpdateFileContents: mocks.createOrUpdateFileContents,
      listForAuthenticatedUser: mocks.listForAuthenticatedUser,
      get: mocks.repoGet,
    };
    users = { getAuthenticated: mocks.getAuthenticated };
    pulls = { create: mocks.pullCreate, get: mocks.pullGet };
  },
}));

import {
  applyFixesToRepository,
  isGitHubConfigured,
  getGitHubOAuthUrl,
  exchangeCodeForToken,
  getGitHubUser,
  getUserRepositories,
  createBranch,
  createFile,
  createPullRequest,
  generateFixBranchName,
  generatePRTitle,
  generatePRBody,
  validateWriteAccess,
  getRepositoryDetails,
  revokeToken,
  getPullRequestStatus,
  getMultiplePRStatuses,
} from '@/lib/github';

function tree(paths: string[]) {
  mocks.getTree.mockResolvedValue({
    data: { tree: paths.map(path => ({ type: 'blob', path })) },
  });
}

const fileContents = new Map<string, string>();

function fileContent(path: string, content: string) {
  fileContents.set(path, content);
  mocks.getContent.mockImplementation(async ({ path: requested }: { path: string }) => {
    const body = fileContents.get(requested);
    if (body === undefined) throw new Error('not found');
    return { data: { content: Buffer.from(body, 'utf8').toString('base64') } };
  });
}

describe('applyFixesToRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fileContents.clear();
    mocks.createOrUpdateFileContents.mockResolvedValue({ data: { content: {} } });
  });

  it('fetches a file once and writes it once when two fixes land in it', async () => {
    tree(['index.html']);
    fileContent('index.html', '<html><body><img src="a.jpg"><img src="a.jpg"></body></html>');

    const result = await applyFixesToRepository(
      'token',
      'owner',
      'repo',
      'accessguard/fix-x',
      'main',
      [
        { id: 'v1', ruleId: 'image-alt', elementHtml: '<img src="a.jpg">', remediationCode: '<img src="a.jpg" alt="First">' },
        { id: 'v2', ruleId: 'image-alt', elementHtml: '<img src="a.jpg">', remediationCode: '<img src="a.jpg" alt="Second">' },
      ]
    );

    expect(mocks.getContent).toHaveBeenCalledTimes(1);
    expect(mocks.createOrUpdateFileContents).toHaveBeenCalledTimes(1);
    expect(result.filesModified).toEqual([{ path: 'index.html', fixesApplied: 2 }]);
    expect(result.fixesAppliedTotal).toBe(2);

    const written = Buffer.from(
      mocks.createOrUpdateFileContents.mock.calls[0][0].content,
      'base64'
    ).toString('utf8');
    expect(written).toContain('alt="First"');
    expect(written).toContain('alt="Second"');
  });

  it('does not report a file as modified when the GitHub write fails', async () => {
    tree(['index.html']);
    fileContent('index.html', '<html><body><img src="a.jpg"></body></html>');
    mocks.createOrUpdateFileContents.mockRejectedValue(new Error('boom'));

    const result = await applyFixesToRepository(
      'token',
      'owner',
      'repo',
      'accessguard/fix-x',
      'main',
      [{ id: 'v1', ruleId: 'image-alt', elementHtml: '<img src="a.jpg">', remediationCode: '<img src="a.jpg" alt="A">' }]
    );

    expect(result.filesModified).toEqual([]);
    expect(result.fixesAppliedTotal).toBe(0);
  });

  it('leaves an ambiguous match alone instead of patching an arbitrary file', async () => {
    tree(['a.html', 'b.html']);
    fileContent('a.html', '<html><body><img src="a.jpg"></body></html>');
    fileContent('b.html', '<html><body><img src="a.jpg"></body></html>');

    const result = await applyFixesToRepository(
      'token',
      'owner',
      'repo',
      'accessguard/fix-x',
      'main',
      [{ id: 'v1', ruleId: 'image-alt', elementHtml: '<img src="a.jpg">', remediationCode: '<img src="a.jpg" alt="A">' }]
    );

    expect(mocks.createOrUpdateFileContents).not.toHaveBeenCalled();
    expect(result.filesModified).toEqual([]);
  });

  it('does not patch a file when the GitHub tree is truncated', async () => {
    // A truncated tree is an incomplete list: the element may live in a file
    // that is not in it.
    mocks.getTree.mockResolvedValue({
      data: { tree: [{ type: 'blob', path: 'index.html' }], truncated: true },
    });
    fileContent('index.html', '<html><body><img src="a.jpg"></body></html>');

    const result = await applyFixesToRepository(
      'token',
      'owner',
      'repo',
      'accessguard/fix-x',
      'main',
      [{ id: 'v1', ruleId: 'image-alt', elementHtml: '<img src="a.jpg">', remediationCode: '<img src="a.jpg" alt="A">' }]
    );

    expect(mocks.createOrUpdateFileContents).not.toHaveBeenCalled();
    expect(result.filesModified).toEqual([]);
  });

  it('does not patch another file when a file cannot be read', async () => {
    tree(['a.html', 'b.html']);
    // a.html cannot be read: the element may live in it.
    fileContent('b.html', '<html><body><img src="a.jpg"></body></html>');

    const result = await applyFixesToRepository(
      'token',
      'owner',
      'repo',
      'accessguard/fix-x',
      'main',
      [{ id: 'v1', ruleId: 'image-alt', elementHtml: '<img src="a.jpg">', remediationCode: '<img src="a.jpg" alt="A">' }]
    );

    expect(mocks.createOrUpdateFileContents).not.toHaveBeenCalled();
    expect(result.filesModified).toEqual([]);
  });

  it('writes each file once when the fixes target different files', async () => {
    tree(['a.html', 'b.html']);
    fileContent('a.html', '<html><body><img src="a.jpg"></body></html>');
    fileContent('b.html', '<html><body><img src="b.jpg"></body></html>');

    const result = await applyFixesToRepository(
      'token',
      'owner',
      'repo',
      'accessguard/fix-x',
      'main',
      [
        { id: 'v1', ruleId: 'image-alt', elementHtml: '<img src="a.jpg">', remediationCode: '<img src="a.jpg" alt="A">' },
        { id: 'v2', ruleId: 'image-alt', elementHtml: '<img src="b.jpg">', remediationCode: '<img src="b.jpg" alt="B">' },
      ]
    );

    expect(mocks.createOrUpdateFileContents).toHaveBeenCalledTimes(2);
    expect(result.filesModified).toEqual([
      { path: 'a.html', fixesApplied: 1 },
      { path: 'b.html', fixesApplied: 1 },
    ]);
    expect(result.fixesAppliedTotal).toBe(2);
  });

  it('never writes a fix that fails the safety checks', async () => {
    tree(['index.html']);
    fileContent('index.html', '<html><body><img src="a.jpg"></body></html>');

    const result = await applyFixesToRepository(
      'token',
      'owner',
      'repo',
      'accessguard/fix-x',
      'main',
      [
        {
          id: 'v1',
          ruleId: 'image-alt',
          elementHtml: '<img src="a.jpg">',
          remediationCode: '<img src="a.jpg" alt="A"><script/x>evil()</script>',
        },
      ]
    );

    expect(mocks.createOrUpdateFileContents).not.toHaveBeenCalled();
    expect(result.fixesAppliedTotal).toBe(0);
  });

  it('reports the ids of the fixes that were written into a source file', async () => {
    tree(['index.html']);
    fileContent('index.html', '<html><body><img src="a.jpg"></body></html>');

    const result = await applyFixesToRepository(
      'token',
      'owner',
      'repo',
      'accessguard/fix-x',
      'main',
      [{ id: 'v1', ruleId: 'image-alt', elementHtml: '<img src="a.jpg">', remediationCode: '<img src="a.jpg" alt="A">' }]
    );

    expect(result.appliedFixIds).toEqual(['v1']);
  });

  it('reports no applied id when the write is refused', async () => {
    tree(['index.html']);
    fileContent('index.html', '<html><body><img src="a.jpg"></body></html>');
    mocks.createOrUpdateFileContents.mockRejectedValue(new Error('boom'));

    const result = await applyFixesToRepository(
      'token',
      'owner',
      'repo',
      'accessguard/fix-x',
      'main',
      [{ id: 'v1', ruleId: 'image-alt', elementHtml: '<img src="a.jpg">', remediationCode: '<img src="a.jpg" alt="A">' }]
    );

    expect(result.appliedFixIds).toEqual([]);
  });

  it('scans the whole source tree, so a match beyond the first files is found', async () => {
    // The target file is the 51st entry and another file holds the same element:
    // patching the first match would change the wrong file.
    const paths = Array.from({ length: 50 }, (_, index) => `page-${index}.html`);
    paths.push('target.html');
    tree(paths);
    fileContent('page-0.html', '<html><body><img src="a.jpg"></body></html>');
    fileContent('target.html', '<html><body><img src="a.jpg"></body></html>');

    const result = await applyFixesToRepository(
      'token',
      'owner',
      'repo',
      'accessguard/fix-x',
      'main',
      [{ id: 'v1', ruleId: 'image-alt', elementHtml: '<img src="a.jpg">', remediationCode: '<img src="a.jpg" alt="A">' }]
    );

    // Two files hold the element: the match is ambiguous, so nothing is patched.
    expect(result.filesModified).toEqual([]);
    expect(mocks.createOrUpdateFileContents).not.toHaveBeenCalled();
  });

  it('patches the only file that holds the element, wherever it sits in the tree', async () => {
    const paths = Array.from({ length: 50 }, (_, index) => `page-${index}.html`);
    paths.push('target.html');
    tree(paths);
    // Every file has to be readable: a file that cannot be read makes the scan
    // incomplete and nothing is patched.
    for (const path of paths) {
      fileContent(path, '<html><body><img src="other.jpg"></body></html>');
    }
    fileContent('target.html', '<html><body><img src="a.jpg"></body></html>');

    const result = await applyFixesToRepository(
      'token',
      'owner',
      'repo',
      'accessguard/fix-x',
      'main',
      [{ id: 'v1', ruleId: 'image-alt', elementHtml: '<img src="a.jpg">', remediationCode: '<img src="a.jpg" alt="A">' }]
    );

    expect(result.filesModified).toEqual([{ path: 'target.html', fixesApplied: 1 }]);
    expect(result.appliedFixIds).toEqual(['v1']);
  });

  it('does not patch anything when the source tree is too large to scan completely', async () => {
    mocks.getTree.mockResolvedValue({
      data: {
        tree: [
          { type: 'blob', path: 'index.html', size: 6 * 1024 * 1024 },
        ],
      },
    });
    fileContent('index.html', '<html><body><img src="a.jpg"></body></html>');

    const result = await applyFixesToRepository(
      'token',
      'owner',
      'repo',
      'accessguard/fix-x',
      'main',
      [{ id: 'v1', ruleId: 'image-alt', elementHtml: '<img src="a.jpg">', remediationCode: '<img src="a.jpg" alt="A">' }]
    );

    expect(result.filesModified).toEqual([]);
    expect(mocks.getContent).not.toHaveBeenCalled();
  });
});

describe('GitHub API helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('GITHUB_CLIENT_ID', 'client-id');
    vi.stubEnv('GITHUB_CLIENT_SECRET', 'client-secret');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('reports whether the OAuth app is configured', () => {
    expect(isGitHubConfigured()).toBe(true);
    vi.stubEnv('GITHUB_CLIENT_SECRET', '');
    expect(isGitHubConfigured()).toBe(false);
  });

  it('builds the OAuth URL with the default and a custom redirect', () => {
    const defaultUrl = getGitHubOAuthUrl('state-1');
    expect(defaultUrl).toContain('client_id=client-id');
    expect(defaultUrl).toContain('state=state-1');
    expect(defaultUrl).toContain(encodeURIComponent('http://localhost:3000/api/github/callback'));

    vi.stubEnv('GITHUB_REDIRECT_URI', 'https://app.example.com/api/github/callback');
    expect(getGitHubOAuthUrl('state-1')).toContain(
      encodeURIComponent('https://app.example.com/api/github/callback')
    );
  });

  it('exchanges an OAuth code for a token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ access_token: 'token-1' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(exchangeCodeForToken('code-1')).resolves.toEqual({ access_token: 'token-1' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://github.com/login/oauth/access_token',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('reports an OAuth exchange failure instead of throwing', async () => {
    vi.stubEnv('GITHUB_CLIENT_ID', '');
    await expect(exchangeCodeForToken('code-1')).resolves.toEqual({
      access_token: '',
      error: 'GitHub not configured',
    });

    vi.stubEnv('GITHUB_CLIENT_ID', 'client-id');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ error: 'bad_verification_code', error_description: 'expired' }),
    }));
    await expect(exchangeCodeForToken('code-1')).resolves.toEqual({
      access_token: '',
      error: 'expired',
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ error: 'bad_verification_code' }),
    }));
    const fallback = await exchangeCodeForToken('code-1');
    expect(fallback.error).toBe('bad_verification_code');

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const failed = await exchangeCodeForToken('code-1');
    expect(failed.access_token).toBe('');
    expect(failed.error).toContain('network down');
  });

  it('reads the authenticated user and falls back to the login name', async () => {
    mocks.getAuthenticated.mockResolvedValue({
      data: { login: 'dev', avatar_url: 'https://avatar', name: 'Dev' },
    });
    await expect(getGitHubUser('token')).resolves.toEqual({
      login: 'dev',
      avatar_url: 'https://avatar',
      name: 'Dev',
    });

    mocks.getAuthenticated.mockResolvedValue({
      data: { login: 'dev', avatar_url: 'https://avatar', name: null },
    });
    await expect(getGitHubUser('token')).resolves.toMatchObject({ name: 'dev' });

    mocks.getAuthenticated.mockRejectedValue(new Error('unauthorized'));
    await expect(getGitHubUser('token')).resolves.toBeNull();
  });

  it('lists the user repositories and survives a failure', async () => {
    mocks.listForAuthenticatedUser.mockResolvedValue({
      data: [{ full_name: 'owner/repo', name: 'repo', private: true }],
    });
    await expect(getUserRepositories('token')).resolves.toEqual([
      { full_name: 'owner/repo', name: 'repo', private: true },
    ]);

    mocks.listForAuthenticatedUser.mockRejectedValue(new Error('nope'));
    await expect(getUserRepositories('token')).resolves.toEqual([]);
  });

  it('creates a branch from the base ref and reports a failure', async () => {
    mocks.getRef.mockResolvedValue({ data: { object: { sha: 'sha-1' } } });
    mocks.createRef.mockResolvedValue({ data: {} });

    await expect(createBranch('token', 'owner', 'repo', 'fix/x')).resolves.toBe(true);
    expect(mocks.createRef).toHaveBeenCalledWith(
      expect.objectContaining({ ref: 'refs/heads/fix/x', sha: 'sha-1' })
    );

    mocks.getRef.mockRejectedValue(new Error('no ref'));
    await expect(createBranch('token', 'owner', 'repo', 'fix/x')).resolves.toBe(false);
  });

  it('creates a file with base64 content and reports a refused write', async () => {
    mocks.createOrUpdateFileContents.mockResolvedValue({ data: {} });

    await expect(createFile('token', 'owner', 'repo', 'a.html', 'body', 'msg', 'branch')).resolves.toBe(true);
    expect(mocks.createOrUpdateFileContents).toHaveBeenCalledWith(
      expect.objectContaining({
        content: Buffer.from('body').toString('base64'),
        branch: 'branch',
      })
    );

    mocks.createOrUpdateFileContents.mockRejectedValue(new Error('403'));
    await expect(createFile('token', 'owner', 'repo', 'a.html', 'body', 'msg', 'branch')).resolves.toBe(false);
  });

  it('creates a pull request and reports a failure', async () => {
    mocks.pullCreate.mockResolvedValue({ data: { html_url: 'https://github.com/owner/repo/pull/1' } });
    await expect(createPullRequest('token', 'owner', 'repo', 'title', 'body', 'head')).resolves.toEqual({
      url: 'https://github.com/owner/repo/pull/1',
    });

    mocks.pullCreate.mockRejectedValue(new Error('422'));
    await expect(createPullRequest('token', 'owner', 'repo', 'title', 'body', 'head')).resolves.toBeNull();
  });

  it('generates branch names, titles and bodies', () => {
    expect(generateFixBranchName('image-alt')).toMatch(/^accessguard\/fix-image-alt-\d+$/);
    expect(generatePRTitle([{ ruleId: 'image-alt' }])).toBe('Fix accessibility issue: image-alt');
    expect(generatePRTitle([{ ruleId: 'a' }, { ruleId: 'b' }])).toBe('Fix 2 accessibility issues');

    const withCriteria = generatePRBody(
      [{ ruleId: 'image-alt', description: 'missing alt', wcagCriteria: '1.1.1' }],
      'https://example.com'
    );
    expect(withCriteria).toContain('WCAG 1.1.1');
    expect(withCriteria).toContain('https://example.com');

    const withoutCriteria = generatePRBody(
      [{ ruleId: 'image-alt', description: 'missing alt' }],
      'https://example.com'
    );
    expect(withoutCriteria).not.toContain('WCAG');
  });

  it('validates write access through push or admin permission', async () => {
    mocks.repoGet.mockResolvedValue({ data: { permissions: { push: true } } });
    await expect(validateWriteAccess('token', 'owner', 'repo')).resolves.toBe(true);

    mocks.repoGet.mockResolvedValue({ data: { permissions: { admin: true } } });
    await expect(validateWriteAccess('token', 'owner', 'repo')).resolves.toBe(true);

    mocks.repoGet.mockResolvedValue({ data: { permissions: { push: false } } });
    await expect(validateWriteAccess('token', 'owner', 'repo')).resolves.toBe(false);

    mocks.repoGet.mockRejectedValue(new Error('403'));
    await expect(validateWriteAccess('token', 'owner', 'repo')).resolves.toBe(false);
  });

  it('reads repository details and defaults the branch to main', async () => {
    mocks.repoGet.mockResolvedValue({
      data: { full_name: 'owner/repo', name: 'repo', default_branch: 'develop', private: true },
    });
    await expect(getRepositoryDetails('token', 'owner', 'repo')).resolves.toEqual({
      fullName: 'owner/repo',
      name: 'repo',
      defaultBranch: 'develop',
      private: true,
    });

    mocks.repoGet.mockResolvedValue({
      data: { full_name: 'owner/repo', name: 'repo', private: false },
    });
    const fallback = await getRepositoryDetails('token', 'owner', 'repo');
    expect(fallback?.defaultBranch).toBe('main');

    mocks.repoGet.mockRejectedValue(new Error('404'));
    await expect(getRepositoryDetails('token', 'owner', 'repo')).resolves.toBeNull();
  });

  it('revokes a token and reports the outcome', async () => {
    vi.stubEnv('GITHUB_CLIENT_ID', '');
    await expect(revokeToken('token')).resolves.toBe(false);

    vi.stubEnv('GITHUB_CLIENT_ID', 'client-id');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 204 }));
    await expect(revokeToken('token')).resolves.toBe(true);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 202 }));
    await expect(revokeToken('token')).resolves.toBe(true);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 500 }));
    await expect(revokeToken('token')).resolves.toBe(false);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(revokeToken('token')).resolves.toBe(false);
  });

  it('reads pull request statuses', async () => {
    mocks.pullGet.mockResolvedValue({
      data: { state: 'closed', merged: true, html_url: 'https://github.com/owner/repo/pull/1' },
    });
    await expect(getPullRequestStatus('token', 'owner', 'repo', 1)).resolves.toEqual({
      state: 'closed',
      merged: true,
      html_url: 'https://github.com/owner/repo/pull/1',
    });

    mocks.pullGet.mockResolvedValue({
      data: { state: 'open', html_url: 'https://github.com/owner/repo/pull/2' },
    });
    const open = await getPullRequestStatus('token', 'owner', 'repo', 2);
    expect(open?.merged).toBe(false);

    mocks.pullGet.mockRejectedValue(new Error('404'));
    await expect(getPullRequestStatus('token', 'owner', 'repo', 3)).resolves.toBeNull();
  });

  it('collects the statuses of several pull requests', async () => {
    mocks.pullGet.mockImplementation(async ({ pull_number: number }: { pull_number: number }) => {
      if (number === 2) throw new Error('404');
      return {
        data: { state: 'closed', merged: true, html_url: 'https://github.com/owner/repo/pull/1' },
      };
    });

    const statuses = await getMultiplePRStatuses('token', [
      { owner: 'owner', repo: 'repo', prNumber: 1 },
      { owner: 'owner', repo: 'repo', prNumber: 2 },
    ]);

    expect(statuses.get('owner/repo/1')).toEqual({ state: 'closed', merged: true });
    expect(statuses.has('owner/repo/2')).toBe(false);
  });
});
