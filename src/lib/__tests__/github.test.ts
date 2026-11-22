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
        { id: 'v1', ruleId: 'image-alt', elementHtml: '<img src="a.jpg">', remediationCode: '<img src="a.jpg" alt="Photo">' },
        { id: 'v2', ruleId: 'image-alt', elementHtml: '<img src="a.jpg">', remediationCode: '<img src="a.jpg" alt="Photo">' },
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
    expect(written.match(/alt="Photo"/g)).toHaveLength(2);
  });

  it('does not swap the remediations of two selected copies of the same element', async () => {
    tree(['index.html']);
    fileContent('index.html', '<html><body><img src="same.jpg"><img src="same.jpg"></body></html>');

    const result = await applyFixesToRepository(
      'token',
      'owner',
      'repo',
      'accessguard/fix-x',
      'main',
      [
        { id: 'v1', ruleId: 'image-alt', elementHtml: '<img src="same.jpg">', remediationCode: '<img src="same.jpg" alt="Second">' },
        { id: 'v2', ruleId: 'image-alt', elementHtml: '<img src="same.jpg">', remediationCode: '<img src="same.jpg" alt="First">' },
      ]
    );

    expect(mocks.createOrUpdateFileContents).not.toHaveBeenCalled();
    expect(result.filesModified).toEqual([]);
    expect(result.fixesAppliedTotal).toBe(0);
  });

  it('does not patch a file whose content the API could not inline', async () => {
    // `encoding: none` means the API did not return the content: the element
    // may live in that file, so no match can be proven unique.
    tree(['a.html', 'b.html']);
    mocks.getContent.mockImplementation(async ({ path: requested }: { path: string }) => {
      if (requested === 'a.html') {
        return { data: { content: '', encoding: 'none' } };
      }
      return {
        data: {
          content: Buffer.from('<html><body><img src="a.jpg"></body></html>', 'utf8').toString('base64'),
          encoding: 'base64',
        },
      };
    });

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

  it('scans the source extensions a fix is never written into', async () => {
    // A duplicate in a file that is not scanned makes the remaining match look
    // unique, so the file has to be part of the scan.
    tree(['index.html', 'app.mjs']);
    fileContent('index.html', '<html><body><img src="a.jpg"></body></html>');
    fileContent('app.mjs', 'const s = \'<img src="a.jpg">\';');

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

  it('scans a file whose extension the writer does not know', async () => {
    // A template holds the same element as the HTML file: the match is not
    // unique, so nothing is patched.
    tree(['index.html', 'page.hbs']);
    fileContent('index.html', '<html><body><img src="a.jpg"></body></html>');
    fileContent('page.hbs', '<img src="a.jpg">');

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

  it('reads a blob whose extension does not say whether it is binary', async () => {
    // A `.dat` file may hold anything: the content decides, not the name. A
    // text blob holds the element too, so the match is not unique.
    tree(['index.html', 'payload.dat']);
    fileContent('index.html', '<html><body><img src="a.jpg"></body></html>');
    fileContent('payload.dat', '<img src="a.jpg">');

    const result = await applyFixesToRepository(
      'token',
      'owner',
      'repo',
      'accessguard/fix-x',
      'main',
      [{ id: 'v1', ruleId: 'image-alt', elementHtml: '<img src="a.jpg">', remediationCode: '<img src="a.jpg" alt="A">' }]
    );

    expect(mocks.getContent).toHaveBeenCalledWith(expect.objectContaining({ path: 'payload.dat' }));
    expect(mocks.createOrUpdateFileContents).not.toHaveBeenCalled();
    expect(result.filesModified).toEqual([]);
  });

  it('leaves a blob out of the scan when its content is binary', async () => {
    // A NUL byte cannot appear in a text file: the blob is binary, so it
    // cannot hold the element and the match stays unique.
    tree(['index.html', 'payload.dat']);
    fileContent('index.html', '<html><body><img src="a.jpg"></body></html>');
    fileContent('payload.dat', '<img src="a.jpg">\u0000\u0001binary');

    const result = await applyFixesToRepository(
      'token',
      'owner',
      'repo',
      'accessguard/fix-x',
      'main',
      [{ id: 'v1', ruleId: 'image-alt', elementHtml: '<img src="a.jpg">', remediationCode: '<img src="a.jpg" alt="A">' }]
    );

    expect(mocks.getContent).toHaveBeenCalledWith(expect.objectContaining({ path: 'payload.dat' }));
    expect(result.filesModified).toEqual([{ path: 'index.html', fixesApplied: 1 }]);
  });

  it('does not patch an element the repository stylesheet turns into an overlay', async () => {
    // The rule that restyles the patched element lives in a preprocessor
    // stylesheet of the repository: the isolated verification does not see it.
    tree(['index.html', 'site.scss']);
    fileContent('index.html', '<html><body><img id="target" src="x"></body></html>');
    fileContent(
      'site.scss',
      '[alt]{position:fixed;inset:0;width:100%;height:100%;z-index:999999}'
    );

    const result = await applyFixesToRepository(
      'token',
      'owner',
      'repo',
      'accessguard/fix-x',
      'main',
      [{ id: 'v1', ruleId: 'image-alt', elementHtml: '<img id="target" src="x">', remediationCode: '<img id="target" src="x" alt="Photo">' }]
    );

    expect(mocks.createOrUpdateFileContents).not.toHaveBeenCalled();
    expect(result.filesModified).toEqual([]);
  });

  it('does not patch an element a linked stylesheet turns into an overlay', async () => {
    // The stylesheet is linked from the page: it is part of the destination.
    tree(['index.html', 'styles.css']);
    fileContent(
      'index.html',
      '<html><head><link rel="stylesheet" href="styles.css"></head><body><img id="target" src="x"></body></html>'
    );
    fileContent(
      'styles.css',
      '[alt]{position:fixed;inset:0;width:100%;height:100%;z-index:999999}'
    );

    const result = await applyFixesToRepository(
      'token',
      'owner',
      'repo',
      'accessguard/fix-x',
      'main',
      [{ id: 'v1', ruleId: 'image-alt', elementHtml: '<img id="target" src="x">', remediationCode: '<img id="target" src="x" alt="Photo">' }]
    );

    expect(mocks.createOrUpdateFileContents).not.toHaveBeenCalled();
    expect(result.filesModified).toEqual([]);
  });

  it('does not patch an element when a dynamic style source cannot be judged', async () => {
    // React resolves the expression before Chromium sees the stylesheet.
    tree(['App.jsx']);
    fileContent(
      'App.jsx',
      'const css="[alt]{position:fixed;inset:0;width:100%;height:100%;z-index:999999}"; export const Card=()=> (<div className="parent"><style>{css}</style><img id="target" src="x" /></div>);'
    );

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
          elementHtml: '<img id="target" src="x" />',
          remediationCode: '<img id="target" src="x" alt="Photo" />',
        },
      ]
    );

    expect(mocks.createOrUpdateFileContents).not.toHaveBeenCalled();
    expect(result.fixesAppliedTotal).toBe(0);
    expect(result.filesModified).toEqual([]);
  });

  it('does not patch an element when a script creates a style at runtime', async () => {
    // The script builds the stylesheet at runtime, so the analyser cannot read
    // the rule that the fix activates.
    tree(['index.html', 'app.js']);
    fileContent('index.html', '<html><body><img id="target" src="x"></body></html>');
    fileContent(
      'app.js',
      "const css='[alt]{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647}'; const s=document.createElement('style'); s.textContent=css; document.head.appendChild(s);"
    );

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
          elementHtml: '<img id="target" src="x">',
          remediationCode: '<img id="target" src="x" alt="Photo">',
        },
      ]
    );

    expect(mocks.createOrUpdateFileContents).not.toHaveBeenCalled();
    expect(result.fixesAppliedTotal).toBe(0);
    expect(result.filesModified).toEqual([]);
  });

  it('does not patch an element when a script injects a rule at runtime', async () => {
    // The second spelling of the same path: a rule inserted into a sheet.
    tree(['index.html', 'app.js']);
    fileContent('index.html', '<html><body><img id="target" src="x"></body></html>');
    fileContent(
      'app.js',
      "document.styleSheets[0].insertRule('[alt]{position:fixed;inset:0;width:100%;height:100%}', 0);"
    );

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
          elementHtml: '<img id="target" src="x">',
          remediationCode: '<img id="target" src="x" alt="Photo">',
        },
      ]
    );

    expect(mocks.createOrUpdateFileContents).not.toHaveBeenCalled();
    expect(result.fixesAppliedTotal).toBe(0);
    expect(result.filesModified).toEqual([]);
  });

  it('does not patch an element when a script conditionally adds a class', async () => {
    // The script reacts to the attribute the fix adds and restyles the target.
    tree(['index.html', 'app.js']);
    fileContent('index.html', '<html><body><img id="target" src="x"></body></html>');
    fileContent(
      'app.js',
      "const img=document.querySelector('#target');if(img&&img.hasAttribute('alt'))img.classList.add('overlay');"
    );

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
          elementHtml: '<img id="target" src="x">',
          remediationCode: '<img id="target" src="x" alt="Photo">',
        },
      ]
    );

    expect(mocks.createOrUpdateFileContents).not.toHaveBeenCalled();
    expect(result.fixesAppliedTotal).toBe(0);
    expect(result.filesModified).toEqual([]);
  });

  it('does not patch an element when a script conditionally changes an inline style', async () => {
    // The inline-style twin of the conditional class mutation.
    tree(['index.html', 'app.js']);
    fileContent('index.html', '<html><body><img id="target" src="x"></body></html>');
    fileContent(
      'app.js',
      "const img=document.querySelector('#target');if(img&&img.hasAttribute('alt'))img.style.position='fixed';"
    );

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
          elementHtml: '<img id="target" src="x">',
          remediationCode: '<img id="target" src="x" alt="Photo">',
        },
      ]
    );

    expect(mocks.createOrUpdateFileContents).not.toHaveBeenCalled();
    expect(result.fixesAppliedTotal).toBe(0);
    expect(result.filesModified).toEqual([]);
  });

  it('does not patch an element when a script registers a service worker', async () => {
    // A service worker can deliver the stylesheet bytes the static scan cannot see.
    tree(['index.html', 'app.js']);
    fileContent('index.html', '<html><body><img id="target" src="x"></body></html>');
    fileContent('app.js', "navigator.serviceWorker.register('/sw.js');");

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
          elementHtml: '<img id="target" src="x">',
          remediationCode: '<img id="target" src="x" alt="Photo">',
        },
      ]
    );

    expect(mocks.createOrUpdateFileContents).not.toHaveBeenCalled();
    expect(result.fixesAppliedTotal).toBe(0);
    expect(result.filesModified).toEqual([]);
  });

  it('does not patch an element when a script builds CSS with a CSS-in-JS library', async () => {
    // The library builds the selector and declaration at runtime.
    tree(['index.html', 'app.js']);
    fileContent('index.html', '<html><body><img id="target" src="x"></body></html>');
    fileContent(
      'app.js',
      "import styled from 'styled-components'; const Box=styled.div`position:fixed;`;"
    );

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
          elementHtml: '<img id="target" src="x">',
          remediationCode: '<img id="target" src="x" alt="Photo">',
        },
      ]
    );

    expect(mocks.createOrUpdateFileContents).not.toHaveBeenCalled();
    expect(result.fixesAppliedTotal).toBe(0);
    expect(result.filesModified).toEqual([]);
  });

  it('does not patch an element when a script mutates it by id', async () => {
    // The script owns the target directly, without a state read.
    tree(['index.html', 'app.js']);
    fileContent('index.html', '<html><body><img id="target" src="x"></body></html>');
    fileContent('app.js', "document.getElementById('target').classList.add('overlay');");

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
          elementHtml: '<img id="target" src="x">',
          remediationCode: '<img id="target" src="x" alt="Photo">',
        },
      ]
    );

    expect(mocks.createOrUpdateFileContents).not.toHaveBeenCalled();
    expect(result.fixesAppliedTotal).toBe(0);
    expect(result.filesModified).toEqual([]);
  });

  it('does not patch an element when a script reads the attribute the fix adds', async () => {
    // The script never names the target: it selects every image and reacts to
    // the attribute the fix adds.
    tree(['index.html', 'app.js']);
    fileContent('index.html', '<html><body><img id="target" src="x"></body></html>');
    fileContent(
      'app.js',
      "document.querySelectorAll('img').forEach(i=>{if(i.hasAttribute('alt'))i.classList.add('overlay');});"
    );

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
          elementHtml: '<img id="target" src="x">',
          remediationCode: '<img id="target" src="x" alt="Photo">',
        },
      ]
    );

    expect(mocks.createOrUpdateFileContents).not.toHaveBeenCalled();
    expect(result.fixesAppliedTotal).toBe(0);
    expect(result.filesModified).toEqual([]);
  });

  it('does not patch an element when a script activates a sibling with the attribute the fix adds', async () => {
    // The script touches the sibling of the target, not the target itself.
    tree(['index.html', 'app.js']);
    fileContent(
      'index.html',
      '<html><body><img id="target" src="x"><div class="overlay">owned</div></body></html>'
    );
    fileContent(
      'app.js',
      "document.querySelectorAll('.overlay').forEach(o=>{if(o.previousElementSibling.hasAttribute('alt'))o.classList.add('on');});"
    );

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
          elementHtml: '<img id="target" src="x">',
          remediationCode: '<img id="target" src="x" alt="Photo">',
        },
      ]
    );

    expect(mocks.createOrUpdateFileContents).not.toHaveBeenCalled();
    expect(result.fixesAppliedTotal).toBe(0);
    expect(result.filesModified).toEqual([]);
  });

  it('writes a fix when an ordinary script mutates an unrelated element', async () => {
    // The script reads and writes the state of an element the fix does not
    // touch, so the fix does not activate it.
    tree(['index.html', 'app.js']);
    fileContent('index.html', '<html><body><img id="target" src="x"></body></html>');
    fileContent(
      'app.js',
      "document.querySelector('.card').addEventListener('click',()=>{if(card.dataset.open)card.classList.add('active');});"
    );

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
          elementHtml: '<img id="target" src="x">',
          remediationCode: '<img id="target" src="x" alt="Photo">',
        },
      ]
    );

    expect(mocks.createOrUpdateFileContents).toHaveBeenCalledTimes(1);
    expect(result.filesModified).toEqual([{ path: 'index.html', fixesApplied: 1 }]);
    expect(result.fixesAppliedTotal).toBe(1);
  });

  it('writes a fix when an ordinary script only mutates another element', async () => {
    // Ordinary repository JavaScript owns neither the target nor its state.
    tree(['index.html', 'app.js']);
    fileContent('index.html', '<html><body><img id="target" src="x"></body></html>');
    fileContent(
      'app.js',
      "document.querySelector('.button').addEventListener('click',()=>console.log('clicked')); document.querySelector('.other').classList.add('active');"
    );

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
          elementHtml: '<img id="target" src="x">',
          remediationCode: '<img id="target" src="x" alt="Photo">',
        },
      ]
    );

    expect(mocks.createOrUpdateFileContents).toHaveBeenCalledTimes(1);
    expect(result.filesModified).toEqual([{ path: 'index.html', fixesApplied: 1 }]);
    expect(result.fixesAppliedTotal).toBe(1);
  });

  it('writes a fix into a repository whose script creates no style', async () => {
    // An ordinary script is not a style source: the fix still lands.
    tree(['index.html', 'app.js']);
    fileContent('index.html', '<html><body><img id="target" src="x"></body></html>');
    fileContent('app.js', "console.log('hello');");

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
          elementHtml: '<img id="target" src="x">',
          remediationCode: '<img id="target" src="x" alt="Photo">',
        },
      ]
    );

    expect(result.filesModified).toEqual([{ path: 'index.html', fixesApplied: 1 }]);
    expect(result.fixesAppliedTotal).toBe(1);
  });

  it('does not patch an element when a repository stylesheet hides its text', async () => {
    tree(['index.html', 'styles.css']);
    fileContent('index.html', '<html><body><p id="target">Text</p></body></html>');
    fileContent(
      'styles.css',
      '[aria-label]{font-size:0;line-height:0;overflow:hidden}'
    );

    const result = await applyFixesToRepository(
      'token',
      'owner',
      'repo',
      'accessguard/fix-x',
      'main',
      [
        {
          id: 'v1',
          ruleId: 'link-name',
          elementHtml: '<p id="target">Text</p>',
          remediationCode: '<p id="target" aria-label="Label">Text</p>',
        },
      ]
    );

    expect(mocks.createOrUpdateFileContents).not.toHaveBeenCalled();
    expect(result.fixesAppliedTotal).toBe(0);
    expect(result.filesModified).toEqual([]);
  });

  it('does not patch an element when a repository stylesheet uses priority and logical viewport units', async () => {
    tree(['index.html', 'styles.css']);
    fileContent('index.html', '<html><body><img id="target" src="x"></body></html>');
    fileContent(
      'styles.css',
      '[alt]{position:fixed!important;top:0;left:0;width:100vi;height:100vb;z-index:999999}'
    );

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
          elementHtml: '<img id="target" src="x">',
          remediationCode: '<img id="target" src="x" alt="Photo">',
        },
      ]
    );

    expect(mocks.createOrUpdateFileContents).not.toHaveBeenCalled();
    expect(result.fixesAppliedTotal).toBe(0);
    expect(result.filesModified).toEqual([]);
  });

  it('does not patch an element when a preprocessor stylesheet cannot be judged', async () => {
    // The preprocessor resolves the variable into a value the analyser cannot
    // see, so the destination is unprovable.
    tree(['index.html', 'site.scss']);
    fileContent('index.html', '<html><body><img id="target" src="x"></body></html>');
    fileContent('site.scss', '[alt]{position:fixed;inset:0;width:$w;height:100%}');

    const result = await applyFixesToRepository(
      'token',
      'owner',
      'repo',
      'accessguard/fix-x',
      'main',
      [{ id: 'v1', ruleId: 'image-alt', elementHtml: '<img id="target" src="x">', remediationCode: '<img id="target" src="x" alt="Photo">' }]
    );

    expect(mocks.createOrUpdateFileContents).not.toHaveBeenCalled();
    expect(result.filesModified).toEqual([]);
  });

  it('does not patch anything when the tree holds a submodule', async () => {
    // A submodule holds files the tree does not list: the scan is incomplete,
    // so no match can be proven unique.
    mocks.getTree.mockResolvedValue({
      data: {
        tree: [
          { type: 'blob', path: 'index.html' },
          { type: 'commit', path: 'components/ui', sha: 'abc123' },
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

    expect(mocks.createOrUpdateFileContents).not.toHaveBeenCalled();
    expect(result.filesModified).toEqual([]);
  });

  it('does not write a fix into a file whose stylesheet turns the element into an overlay', async () => {
    // The isolated verification does not contain the repository's stylesheet:
    // a class the repository styles as a full-viewport overlay has to be
    // judged on the repository's CSS.
    tree(['index.html']);
    fileContent(
      'index.html',
      '<style>.overlay{position:fixed;inset:0;width:100%;height:100%;z-index:999999}</style><img id="target" class="overlay" src="x">'
    );

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
          elementHtml: '<img id="target" class="overlay" src="x">',
          remediationCode: '<img id="target" class="overlay" src="x" alt="Photo">',
        },
      ]
    );

    expect(mocks.createOrUpdateFileContents).not.toHaveBeenCalled();
    expect(result.fixesAppliedTotal).toBe(0);
  });

  it('does not write a fix into a file whose stylesheet hides the element', async () => {
    tree(['index.html', 'site.css']);
    fileContent('index.html', '<html><body><img id="target" class="hidden" src="x"></body></html>');
    fileContent('site.css', '.hidden{display:none}');

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
          elementHtml: '<img id="target" class="hidden" src="x">',
          remediationCode: '<img id="target" class="hidden" src="x" alt="Photo">',
        },
      ]
    );

    expect(mocks.createOrUpdateFileContents).not.toHaveBeenCalled();
    expect(result.fixesAppliedTotal).toBe(0);
  });

  it('writes a fix into a file whose stylesheet does not touch the element', async () => {
    tree(['index.html', 'site.css']);
    fileContent('index.html', '<html><body><img id="target" class="hero" src="x"></body></html>');
    fileContent('site.css', '.hero{border-radius:8px}.overlay{position:fixed;inset:0;width:100%;height:100%}');

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
          elementHtml: '<img id="target" class="hero" src="x">',
          remediationCode: '<img id="target" class="hero" src="x" alt="Photo">',
        },
      ]
    );

    expect(result.filesModified).toEqual([{ path: 'index.html', fixesApplied: 1 }]);
    expect(result.fixesAppliedTotal).toBe(1);
  });

  it('does not write a fix into a server template', async () => {
    // The template engine of the customer's build evaluates the markers, so a
    // fix written into the file becomes executable server code.
    tree(['template.html']);
    fileContent('template.html', '<% const pageTitle = "Home"; %><img src="x">');

    const result = await applyFixesToRepository(
      'token',
      'owner',
      'repo',
      'accessguard/fix-x',
      'main',
      [{ id: 'v1', ruleId: 'image-alt', elementHtml: '<img src="x">', remediationCode: '<img src="x" alt="Photo">' }]
    );

    expect(mocks.createOrUpdateFileContents).not.toHaveBeenCalled();
    expect(result.fixesAppliedTotal).toBe(0);
  });

  it('does not write a fix into a file whose context cannot be proven', async () => {
    // A TypeScript module can hold the element inside a string: the fix would
    // become code there, so it stays a review suggestion.
    tree(['app.ts']);
    fileContent('app.ts', 'const s = "<img src=\\"a.jpg\\">";');

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

  it('does not patch an element that only exists inside a comment', async () => {
    tree(['index.html']);
    fileContent('index.html', '<html><body><!-- <img src="a.jpg"> --></body></html>');

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
    expect(result.fixesAppliedTotal).toBe(0);
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
