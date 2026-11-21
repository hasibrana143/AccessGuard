import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getTree: vi.fn(),
  getContent: vi.fn(),
  createOrUpdateFileContents: vi.fn(),
}));

vi.mock('@octokit/rest', () => ({
  Octokit: class {
    git = { getTree: mocks.getTree };
    repos = {
      getContent: mocks.getContent,
      createOrUpdateFileContents: mocks.createOrUpdateFileContents,
    };
  },
}));

import { applyFixesToRepository } from '@/lib/github';

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
});
