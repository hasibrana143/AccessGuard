// GitHub integration for AccessGuard
import { Octokit } from '@octokit/rest';
import { decodeHtmlEntities, parseTagAttributes } from '@/lib/html-attributes';

// Check if GitHub is configured
export function isGitHubConfigured(): boolean {
  return !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

// Get OAuth URL
export function getGitHubOAuthUrl(state: string): string {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/github/callback';
  const scope = 'repo user:email';
  return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;
}

// Exchange code for token
export async function exchangeCodeForToken(code: string): Promise<{ access_token: string; error?: string }> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return { access_token: '', error: 'GitHub not configured' };
  }

  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const data = await response.json();
    if (data.error) {
      return { access_token: '', error: data.error_description || data.error };
    }
    return { access_token: data.access_token };
  } catch (error) {
    return { access_token: '', error: String(error) };
  }
}

// Get Octokit client
function getOctokit(token: string): Octokit {
  return new Octokit({ auth: token });
}

// Get authenticated user
export async function getGitHubUser(token: string): Promise<{ login: string; avatar_url: string; name: string } | null> {
  try {
    const octokit = getOctokit(token);
    const { data } = await octokit.users.getAuthenticated();
    return { login: data.login, avatar_url: data.avatar_url, name: data.name || data.login };
  } catch {
    return null;
  }
}

// Get user repositories
export async function getUserRepositories(token: string): Promise<Array<{ full_name: string; name: string; private: boolean }>> {
  try {
    const octokit = getOctokit(token);
    const { data } = await octokit.repos.listForAuthenticatedUser({ per_page: 100, sort: 'updated' });
    return data.map(repo => ({ full_name: repo.full_name, name: repo.name, private: repo.private }));
  } catch {
    return [];
  }
}

// Create branch
export async function createBranch(token: string, owner: string, repo: string, branchName: string, baseBranch = 'main'): Promise<boolean> {
  try {
    const octokit = getOctokit(token);
    // Get base branch ref
    const { data: ref } = await octokit.git.getRef({ owner, repo, ref: `heads/${baseBranch}` });
    // Create new branch
    await octokit.git.createRef({ owner, repo, ref: `refs/heads/${branchName}`, sha: ref.object.sha });
    return true;
  } catch {
    return false;
  }
}

// Create or update file
export async function createFile(token: string, owner: string, repo: string, path: string, content: string, message: string, branch: string): Promise<boolean> {
  try {
    const octokit = getOctokit(token);
    const contentEncoded = Buffer.from(content).toString('base64');
    await octokit.repos.createOrUpdateFileContents({ owner, repo, path, message, content: contentEncoded, branch });
    return true;
  } catch {
    return false;
  }
}

// Create pull request
export async function createPullRequest(token: string, owner: string, repo: string, title: string, body: string, head: string, base = 'main'): Promise<{ url: string } | null> {
  try {
    const octokit = getOctokit(token);
    const { data } = await octokit.pulls.create({ owner, repo, title, body, head, base });
    return { url: data.html_url };
  } catch {
    return null;
  }
}

// Generate branch name for fixes
export function generateFixBranchName(ruleId: string): string {
  const timestamp = Date.now();
  return `accessguard/fix-${ruleId}-${timestamp}`;
}

// Generate PR title
export function generatePRTitle(violations: Array<{ ruleId: string }>): string {
  if (violations.length === 1) {
    return `Fix accessibility issue: ${violations[0].ruleId}`;
  }
  return `Fix ${violations.length} accessibility issues`;
}

// Generate PR body
export function generatePRBody(violations: Array<{ ruleId: string; description: string; wcagCriteria?: string }>, projectUrl: string): string {
  const violationsList = violations.map(v => 
    `- **${v.ruleId}**${v.wcagCriteria ? ` (WCAG ${v.wcagCriteria})` : ''}: ${v.description}`
  ).join('\n');

  return `
## Accessibility Fixes

This PR fixes ${violations.length} accessibility violation(s) found on ${projectUrl}.

### Violations Fixed
${violationsList}

---
*Generated by [AccessGuard](https://accessguard.io)*
`;
}

// Validate write access to repository
export async function validateWriteAccess(token: string, owner: string, repo: string): Promise<boolean> {
  try {
    const octokit = getOctokit(token);
    // Try to get repository permissions
    const { data } = await octokit.repos.get({ owner, repo });
    return data.permissions?.push === true || data.permissions?.admin === true;
  } catch {
    return false;
  }
}

// Get repository details with default branch
export async function getRepositoryDetails(token: string, owner: string, repo: string): Promise<{
  fullName: string;
  name: string;
  defaultBranch: string;
  private: boolean;
} | null> {
  try {
    const octokit = getOctokit(token);
    const { data } = await octokit.repos.get({ owner, repo });
    return {
      fullName: data.full_name,
      name: data.name,
      defaultBranch: data.default_branch || 'main',
      private: data.private,
    };
  } catch {
    return null;
  }
}

/**
 * Upper bound of source content the writer reads for one pull request. The whole
 * source tree has to be scanned to prove that a match is unique, so a tree that
 * does not fit is never patched: an incomplete scan cannot prove uniqueness.
 */
const MAX_SOURCE_SCAN_BYTES = 5 * 1024 * 1024;

/**
 * Files that cannot hold markup and are not read: images, fonts, media,
 * archives and other binaries in a format that is known. Every other file of
 * the tree is read, because a file with an extension the writer does not know
 * (a template, a partial, a content file) can hold the same element as the
 * file that is patched. An ambiguous suffix (`.dat`, `.bin`) is not proof that
 * a blob is binary, so those are read as well.
 */
const BINARY_FILE_PATTERN =
  /\.(png|jpe?g|gif|webp|bmp|ico|tiff?|avif|heic|svgz|woff2?|ttf|otf|eot|mp3|mp4|m4a|mov|avi|webm|wav|ogg|flac|aac|zip|gz|tgz|bz2|xz|7z|rar|tar|pdf|docx?|xlsx?|pptx?|exe|dll|so|dylib|class|jar|wasm|pyc)$/i;

/**
 * Files that hold stylesheet source. A preprocessor stylesheet is included:
 * the destination is judged from the stylesheet the repository owns, not from
 * the subset of it the writer understands.
 */
const CSS_FILE_PATTERN = /\.(css|scss|sass|less|pcss|styl|stylus|sss|postcss)$/i;

/** Preprocessor stylesheets: their `//` comments are not CSS comments. */
const PREPROCESSOR_FILE_PATTERN = /\.(scss|sass|less|styl|stylus)$/i;

/**
 * The script files of the repository: they can create a style at runtime.
 */
const SCRIPT_FILE_PATTERN = /\.(js|jsx|mjs|cjs|ts|tsx|cts|mts)$/i;

/**
 * Inline scripts are runtime code too; an unclosed block cannot be followed
 * safely.
 */
function extractInlineScripts(content: string): { scripts: string[]; incomplete: boolean; markup: string } {
  const scripts: string[] = [];
  const bodyRanges: Array<{ start: number; end: number }> = [];
  let cursor = 0;

  while (cursor < content.length) {
    const opening = /<script(?=[\s/>])(?:"[^"]*"|'[^']*'|[^'">])*>/gi;
    opening.lastIndex = cursor;
    const open = opening.exec(content);
    if (!open) break;

    const bodyStart = open.index + open[0].length;
    const closing = /<\/script\s*>/gi;
    closing.lastIndex = bodyStart;
    const close = closing.exec(content);
    if (!close) {
      bodyRanges.push({ start: bodyStart, end: content.length });
      return { scripts, incomplete: true, markup: blankRanges(content, bodyRanges) };
    }

    scripts.push(content.slice(bodyStart, close.index));
    bodyRanges.push({ start: bodyStart, end: close.index });
    cursor = close.index + close[0].length;
  }

  return { scripts, incomplete: false, markup: blankRanges(content, bodyRanges) };
}

/** Hide inline script bodies from the markup reader without joining tokens. */
function blankRanges(content: string, ranges: Array<{ start: number; end: number }>): string {
  let result = '';
  let cursor = 0;
  for (const range of ranges) {
    result += content.slice(cursor, range.start);
    result += content.slice(range.start, range.end).replace(/[^\r\n]/g, ' ');
    cursor = range.end;
  }
  return result + content.slice(cursor);
}

/**
 * Event-handler attributes are runtime code too; markup whose attribute value
 * cannot be read cannot be followed safely.
 */
function extractEventHandlerAttributes(markup: string): { handlers: string[]; incomplete: boolean } {
  const handlers: string[] = [];
  let cursor = 0;

  while (cursor < markup.length) {
    const open = markup.indexOf('<', cursor);
    if (open < 0) break;

    if (markup.startsWith('<!--', open)) {
      const close = markup.indexOf('-->', open + 4);
      if (close < 0) return { handlers, incomplete: true };
      cursor = close + 3;
      continue;
    }

    if (markup.startsWith('<!', open) || markup.startsWith('<?', open)) {
      const close = markup.indexOf('>', open + 2);
      if (close < 0) return { handlers, incomplete: true };
      cursor = close + 1;
      continue;
    }

    const nameStart = open + 1;
    if (!/[a-z]/i.test(markup[nameStart] ?? '')) {
      cursor = open + 1;
      continue;
    }

    let sectionStart = nameStart;
    while (sectionStart < markup.length && !/[\s/>]/.test(markup[sectionStart])) sectionStart++;
    const tagName = markup.slice(nameStart, sectionStart).toLowerCase();

    let index = sectionStart;
    let quote: string | null = null;
    let end = -1;
    while (index < markup.length) {
      const character = markup[index];
      if (quote) {
        if (character === quote) quote = null;
        index++;
        continue;
      }
      if (character === '"' || character === "'") {
        quote = character;
        index++;
        continue;
      }
      if (character === '>') {
        end = index;
        break;
      }
      index++;
    }
    if (end < 0 || quote) return { handlers, incomplete: true };

    for (const attribute of parseTagAttributes(markup.slice(sectionStart, end))) {
      if (/^on/i.test(attribute.name) && attribute.value) {
        handlers.push(decodeHtmlEntities(attribute.value));
      }
    }
    cursor = end + 1;

    if (tagName === 'style' || tagName === 'textarea' || tagName === 'title') {
      const closing = new RegExp(`</${tagName}\\s*>`, 'ig');
      closing.lastIndex = cursor;
      const close = closing.exec(markup);
      if (!close) return { handlers, incomplete: true };
      cursor = close.index + close[0].length;
    }
  }

  return { handlers, incomplete: false };
}

/**
 * The paths that create a style element at runtime.
 *
 * The CSS of such a style is built at runtime, so the analyser cannot read it
 * and the destination is unprovable. A style that the repository creates this
 * way can activate a rule as soon as the fix changes the selector match.
 */
const RUNTIME_STYLE_PATTERN =
  /createElement\s*\(\s*['"`]style['"`]|insertRule\s*\(|adoptedStyleSheets|\w*style\w*\s*\.\s*(?:textContent|innerHTML|innerText|cssText)\s*=|['"`][^'"`]*<style/i;

/** Reads that can gate an element mutation at runtime. */
const RUNTIME_STATE_READ_PATTERN =
  /\b(?:hasAttribute|getAttribute|getAttributeNames|getAttributeNode|toggleAttribute)\s*\(|\bgetNamedItem\s*\(|\bmatches\s*\(|\bclosest\s*\(\s*['"`][^'"`]*\[|\b(?:querySelector|querySelectorAll)\s*\(\s*['"`][^'"`]*\[/i;

/** Reads of every attribute, which can react to any attribute the fix adds. */
const RUNTIME_GENERIC_STATE_READ_PATTERN =
  /\bgetAttributeNames\s*\(|\.\s*attributes\b(?!\s*\.\s*getNamedItem\s*\()/i;

/** Class, inline-style and attribute mutations the analyser cannot follow. */
const RUNTIME_MUTATION_PATTERN =
  /\bclassList\s*\.\s*(?:add|remove|toggle|replace)\s*\(|\bclassName\s*=(?![=>])|\b(?:setAttribute|removeAttribute|toggleAttribute)\s*\(|\.\s*style\s*\.\s*[A-Za-z_$][\w$]*\s*=(?![=>])|\.\s*style\s*\.\s*(?:setProperty\s*\(|cssText\s*=(?![=>]))/i;

/** Service workers can deliver stylesheet bytes after the static scan. */
const SERVICE_WORKER_PATTERN =
  /navigator\s*\.\s*serviceWorker\s*\.\s*register\s*\(|serviceWorker\s*\.\s*addEventListener\s*\(|self\s*\.\s*addEventListener\s*\(\s*['"`](?:fetch|install)\b|caches\s*\.\s*open\s*\(|self\s*\.\s*skipWaiting\b|self\s*\.\s*clients\s*\.\s*claim\b/i;

/** CSS-in-JS builds selectors and declarations that no static reader can see. */
const CSS_IN_JS_PATTERN =
  /(?:from\s*|require\s*\(\s*|import\s*(?:\(\s*)?)['"`](?:styled-components(?:\/[^'"`]*)?|emotion(?:\/[^'"`]*)?)['"`]|['"`]@emotion\/|\bcreateGlobalStyle\b|\bmakeStyles\b|\bstyled\s*\.\s*[A-Za-z_$][\w$]*\s*(?:`|\()|\bstyled\s*\(\s*`/i;

/** True when a script names an element by its static id. */
function scriptRefersToElementId(content: string, id: string): boolean {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const quote = "['\"`]";
  return new RegExp(
    `#${escapedId}(?![\\w-])|\\bgetElementById\\s*\\(\\s*${quote}${escapedId}${quote}|\\bquerySelector(?:All)?\\s*\\(\\s*${quote}#${escapedId}${quote}`
  ).test(content);
}

/**
 * True when a script names one of the attributes the fix adds.
 *
 * A script that reads an attribute the fix adds and then mutates an element
 * reacts to the fix: the mutation it performs is invisible to the isolated
 * verification browser.
 */
function scriptNamesAttribute(content: string, names: Set<string>): boolean {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(content)) return true;
  }
  return false;
}

/**
 * True when a script reads an attribute through the DOM property that
 * reflects it.
 */
function scriptReadsAttributeProperty(content: string, names: Set<string>): boolean {
  for (const name of names) {
    const lower = name.toLowerCase();
    const aliases: string[] = [];

    if (lower.startsWith('data-')) {
      const key = name
        .slice(5)
        .replace(/-([a-z0-9])/gi, (_, character: string) => character.toUpperCase());
      if (key) aliases.push(`dataset.${key}`);
    } else {
      aliases.push(name.replace(/-([a-z0-9])/gi, (_, character: string) => character.toUpperCase()));
      if (lower === 'class') aliases.push('className');
      if (lower === 'for') aliases.push('htmlFor');
    }

    for (const alias of aliases) {
      const [object, property] = alias.includes('.') ? alias.split('.', 2) : ['', alias];
      const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const expression = object
        ? `\\.\\s*${object}\\s*\\.\\s*${escapedProperty}\\b`
        : `\\.\\s*${escapedProperty}\\b`;
      if (new RegExp(expression, 'i').test(content)) return true;
    }
  }
  return false;
}

/**
 * The syntax of a preprocessor that the analyser cannot resolve: an
 * interpolated selector or value (`#{$x}`, `@{x}`), a variable (`$x`, `@x`)
 * and an escaped import (`~"x"`). A stylesheet that uses it is not judged.
 */
const PREPROCESSOR_SYNTAX = /#\{|@\{|\$[@a-zA-Z_]|~["']|\b[a-z-]+\(\s*[@$]/i;

/**
 * True when a blob holds binary data.
 *
 * A NUL byte cannot appear in a text file, and the browser replaces it, so the
 * markup around it is not markup. A blob that holds one is not part of the
 * scan — no matter what its name says: a `.dat` file may hold anything.
 */
function isBinaryBlob(content: string): boolean {
  return content.includes('\u0000');
}

/** How many files of the tree are read at the same time. */
const SCAN_CONCURRENCY = 8;

/**
 * Resolve a stylesheet reference against the tree.
 *
 * A reference to a file outside the repository (a CDN stylesheet, an absolute
 * path of another site) cannot be judged: the destination is unprovable and no
 * source patch may be written into it.
 */
function resolveRepositoryPath(basePath: string, reference: string): string | null {
  const href = reference.trim().split('#')[0]?.split('?')[0] ?? '';
  if (!href) return null;
  // A reference with a scheme or a protocol-relative URL is not in the tree.
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) return null;

  const base = basePath.includes('/') ? basePath.slice(0, basePath.lastIndexOf('/')) : '';
  const parts = (href.startsWith('/') ? href.slice(1) : `${base}/${href}`).split('/');
  const resolved: string[] = [];

  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      resolved.pop();
      continue;
    }
    resolved.push(part);
  }

  return resolved.join('/');
}

export interface RepositoryFixPlan {
  /** The files to write and their patched content. */
  fileWrites: Array<{ path: string; content: string; message: string; fixesApplied: number }>;
  /** The ids of the fixes that will be written into a source file. */
  appliedFixIds: string[];
  /** The ids of the candidates the destination or the runtime analysis refused. */
  refusedFixIds: string[];
  /** The ids of the candidates that need a human review (no provable source file). */
  reviewFixIds: string[];
}

interface RepositoryFixCandidate {
  id: string;
  ruleId: string;
  elementHtml?: string | null;
  remediationCode?: string | null;
}

/** Plan repository source changes before the first irreversible GitHub write. */
export async function planRepositoryFixes(
  token: string,
  owner: string,
  repo: string,
  ref: string,
  violations: RepositoryFixCandidate[]
): Promise<RepositoryFixPlan> {
  const octokit = getOctokit(token);
  const fileWrites: RepositoryFixPlan['fileWrites'] = [];
  const appliedFixIds = new Set<string>();
  const refusedFixIds = new Set<string>();
  const reviewFixIds = new Set<string>();

  const { applyFixesToFile, fixOccurrenceKey, validateFixCandidate, conflictingRemediationKeys } =
    await import('@/lib/github-pr');
  const { locateElement, isPatchableFile } = await import('@/lib/ast-patch');
  const { buildCssContext, destinationCssHarm, collectStyleSources, extractStylesheetLinks, extractCssImports, stripCssLineComments, describeElements } =
    await import('@/lib/css-context');

  const candidates = violations.filter(v => v.remediationCode && v.elementHtml);
  // The source patch budget is ten; the rest stay review documents.
  const sourceCandidates = candidates.slice(0, 10);
  const pendingFixIds = new Set<string>();
  for (const [index, violation] of candidates.entries()) {
    if (index >= 10) {
      reviewFixIds.add(violation.id);
      continue;
    }
    if (!validateFixCandidate(violation).valid) {
      refusedFixIds.add(violation.id);
      continue;
    }
    pendingFixIds.add(violation.id);
  }
  for (const violation of violations) {
    if (!violation.remediationCode || !violation.elementHtml) {
      refusedFixIds.add(violation.id);
    }
  }

  const finishPlan = (): RepositoryFixPlan => {
    // An unresolved candidate has no provable source file: it needs review.
    for (const id of pendingFixIds) reviewFixIds.add(id);
    return {
      fileWrites,
      appliedFixIds: [...appliedFixIds],
      refusedFixIds: [...refusedFixIds],
      reviewFixIds: [...reviewFixIds],
    };
  };

  // List source files in the default branch tree
  const { data: tree } = await octokit.git.getTree({ owner, repo, tree_sha: ref, recursive: '1' });

  // A truncated tree is an incomplete list: an element may live in a file that
  // is not in it, so no match can be proven unique and nothing is patched.
  if (tree.truncated) {
    return finishPlan();
  }

  // Every text file of the tree is scanned, even the ones a fix is never
  // written into: a duplicate in an omitted file would make the remaining
  // match look unique. A file with an extension the writer does not know (a
  // template, a partial) can hold the same element, and a submodule holds a
  // tree of its own — both make the scan incomplete.
  let scanIncomplete = false;
  const textFiles: Array<{ path: string; size?: number }> = [];
  for (const entry of tree.tree || []) {
    if (!entry.path) continue;
    if (entry.type === 'tree') continue;
    if (entry.type !== 'blob') {
      // A submodule (`type: "commit"`) holds files the tree does not list.
      scanIncomplete = true;
      continue;
    }
    // A binary file cannot hold markup.
    if (BINARY_FILE_PATTERN.test(entry.path)) continue;
    textFiles.push({ path: entry.path, size: entry.size });
  }

  // The complete tree is scanned: uniqueness may only be decided on it. A
  // truncated scan patched the wrong file before.
  const treeBytes = textFiles.reduce((sum, file) => sum + (file.size ?? 0), 0);
  if (treeBytes > MAX_SOURCE_SCAN_BYTES) {
    return finishPlan();
  }

  if (textFiles.length === 0) return finishPlan();

  // One fetch per file: the content is cached so several fixes can land in the same
  // file without the later write overwriting the earlier fix.
  const contentCache = new Map<string, string>();
  const binaryFiles = new Set<string>();
  const assignments = new Map<string, RepositoryFixCandidate[]>();
  const localOccurrence = new Map<string, number>();
  let scannedBytes = 0;
  let scanTruncated = false;

  const loadFile = async (path: string): Promise<string | undefined> => {
    if (binaryFiles.has(path)) return undefined;
    const cached = contentCache.get(path);
    if (cached !== undefined) return cached;
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path, ref });
      if (!('content' in data)) {
        // The file exists but its content is not readable (a symlink or a
        // submodule). The scan is incomplete: the element may be in it.
        scanIncomplete = true;
        return undefined;
      }
      if (data.encoding === 'none') {
        // The API could not inline the file (too large or binary). The empty
        // content is not a scanned file: the element may be in it, so the scan
        // is incomplete and nothing may be patched elsewhere.
        scanIncomplete = true;
        return undefined;
      }
      const content = Buffer.from(data.content, 'base64').toString('utf8');
      // A blob that holds binary data is not markup, even when its name does
      // not say so. It cannot hold the element, so it is not part of the scan
      // and it does not use the scan budget.
      if (isBinaryBlob(content)) {
        binaryFiles.add(path);
        return undefined;
      }
      if (scannedBytes + content.length > MAX_SOURCE_SCAN_BYTES) {
        // The budget is exhausted: the scan is incomplete, so no match can be
        // proven unique and nothing is patched.
        scanTruncated = true;
        return undefined;
      }
      scannedBytes += content.length;
      contentCache.set(path, content);
      return content;
    } catch {
      // The file could not be read. The scan is incomplete for the same
      // reason: the element may be in this file, so it must not be patched in
      // another one.
      scanIncomplete = true;
      return undefined;
    }
  };

  // The whole tree is read before the first match is judged: a file that is
  // not read may hold the element, and the repository's stylesheets have to be
  // known before a fix can be written into the repository.
  const queue = [...textFiles];
  const workers = Array.from({ length: Math.min(SCAN_CONCURRENCY, queue.length) }, async () => {
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) break;
      await loadFile(file.path);
    }
  });
  await Promise.all(workers);
  if (scannedBytes > MAX_SOURCE_SCAN_BYTES) scanTruncated = true;

  // The repository's stylesheets are part of the destination: a rule the
  // repository applies to the patched element is invisible to the isolated
  // verification. Every style source the repository owns is read: the
  // stylesheet files (including the preprocessors), the `<style>` blocks of
  // every file, the stylesheets a file links and the stylesheets they import.
  // A style source that cannot be read makes the destination unprovable, and an
  // unprovable destination never receives a source patch.
  const cssSources: Array<{ path: string; css: string }> = [];
  const cssPaths = new Set<string>();
  const styleProblems: string[] = [];
  const runtimeMutationScripts: string[] = [];
  const conditionalMutationScripts: string[] = [];
  const genericStateReadMutationScripts: string[] = [];

  const addCssSource = (path: string, css: string): void => {
    if (cssPaths.has(path)) return;
    cssPaths.add(path);
    const preprocessor = PREPROCESSOR_FILE_PATTERN.test(path);
    if (preprocessor && PREPROCESSOR_SYNTAX.test(css)) {
      // The preprocessor resolves the syntax into CSS the analyser cannot
      // see, so the destination is unprovable.
      styleProblems.push(`the stylesheet ${path} uses syntax the analyser cannot resolve`);
    }
    cssSources.push({ path, css: preprocessor ? stripCssLineComments(css) : css });
  };

  const inspectRuntimeScript = (sourcePath: string, content: string): void => {
    // Runtime code owns effects the isolated verification browser cannot see.
    if (RUNTIME_STYLE_PATTERN.test(content)) {
      styleProblems.push(`the script ${sourcePath} creates a style at runtime, which the analyser cannot resolve`);
    }
    if (SERVICE_WORKER_PATTERN.test(content)) {
      styleProblems.push(`the script ${sourcePath} can deliver styles at runtime, which the analyser cannot resolve`);
    }
    if (CSS_IN_JS_PATTERN.test(content)) {
      styleProblems.push(`the script ${sourcePath} builds CSS at runtime, which the analyser cannot resolve`);
    }
    if (RUNTIME_MUTATION_PATTERN.test(content)) {
      // A script that mutates an element can take the patched element over
      // even without a state read, so the scripts are kept for the check
      // that decides whether the fix activates them.
      runtimeMutationScripts.push(content);
      if (RUNTIME_STATE_READ_PATTERN.test(content)) {
        conditionalMutationScripts.push(content);
      }
      if (RUNTIME_GENERIC_STATE_READ_PATTERN.test(content)) {
        genericStateReadMutationScripts.push(content);
      }
    }
  };

  for (const [path, content] of contentCache) {
    if (CSS_FILE_PATTERN.test(path)) addCssSource(path, content);
  }

  for (const [path, content] of contentCache) {
    // Every `<style>` block is a style source of the file that holds it: its
    // imports are relative to that file.
    for (const source of collectStyleSources(content)) {
      if (source.dynamic) {
        styleProblems.push(`the stylesheet ${path} uses a dynamic style source the analyser cannot resolve`);
        continue;
      }
      cssSources.push({ path, css: source.css });
    }
    for (const href of extractStylesheetLinks(content)) {
      const target = resolveRepositoryPath(path, href);
      if (!target || !contentCache.has(target)) {
        styleProblems.push(`the stylesheet ${href} is not part of the repository`);
        continue;
      }
      addCssSource(target, contentCache.get(target) as string);
    }
    if (SCRIPT_FILE_PATTERN.test(path)) {
      inspectRuntimeScript(path, content);
    } else {
      // Inline script blocks carry the same runtime code as a linked script.
      const inline = extractInlineScripts(content);
      if (inline.incomplete) {
        styleProblems.push(`the inline script in ${path} is incomplete, which the analyser cannot resolve`);
      }
      inline.scripts.forEach((script, index) => {
        inspectRuntimeScript(`${path}#inline-script-${index + 1}`, script);
      });
      const handlers = extractEventHandlerAttributes(inline.markup);
      if (handlers.incomplete) {
        styleProblems.push(`an event handler in ${path} is incomplete, which the analyser cannot resolve`);
      }
      handlers.handlers.forEach((handler, index) => {
        inspectRuntimeScript(`${path}#event-handler-${index + 1}`, handler);
      });
    }
  }

  // The imports of a stylesheet are relative to the stylesheet itself.
  const pending = [...cssSources];
  while (pending.length > 0) {
    const source = pending.shift() as { path: string; css: string };
    for (const imported of extractCssImports(source.css)) {
      const target = resolveRepositoryPath(source.path, imported);
      if (!target || !contentCache.has(target)) {
        styleProblems.push(`the stylesheet ${source.path} imports ${imported}, which is not part of the repository`);
        continue;
      }
      const already = cssPaths.has(target);
      addCssSource(target, contentCache.get(target) as string);
      if (!already) pending.push({ path: target, css: contentCache.get(target) as string });
    }
  }

  const cssContext = buildCssContext(cssSources.map(source => source.css).join('\n'));
  cssContext.unprovable.push(...styleProblems);

  // Selected fixes for the same element with different remediations cannot be
  // mapped to the occurrences of that element.
  const conflictingKeys = conflictingRemediationKeys(violations);

  for (const violation of sourceCandidates) {
    if (!pendingFixIds.has(violation.id)) continue;

    // A script that names the patched element can take it over at runtime even
    // without a state read, so this destination cannot be proved safe.
    const originalElement = describeElements(violation.elementHtml ?? '')[0];
    const patchedElement = describeElements(violation.remediationCode ?? '')[0];
    if (originalElement && patchedElement) {
      if (
        originalElement.id &&
        runtimeMutationScripts.some(content => scriptRefersToElementId(content, originalElement.id as string))
      ) {
        pendingFixIds.delete(violation.id);
        refusedFixIds.add(violation.id);
        continue;
      }

      // A script that reads an attribute the fix adds and then mutates an
      // element reacts to the fix: what it does to the page is invisible to
      // the isolated verification browser.
      const added = new Set<string>();
      for (const [name, value] of patchedElement.attributes) {
        if (originalElement.attributes.get(name) !== value) added.add(name);
      }
      if (
        added.size > 0 &&
        (conditionalMutationScripts.some(content => scriptNamesAttribute(content, added)) ||
          runtimeMutationScripts.some(content => scriptReadsAttributeProperty(content, added)) ||
          genericStateReadMutationScripts.length > 0)
      ) {
        pendingFixIds.delete(violation.id);
        refusedFixIds.add(violation.id);
        continue;
      }
    }

    // The repository's own stylesheet can restyle the patched element: the
    // isolated verification does not see it. A refused destination gets no
    // artifact at all.
    if (destinationCssHarm(cssContext, violation.elementHtml, violation.remediationCode)) {
      pendingFixIds.delete(violation.id);
      refusedFixIds.add(violation.id);
      continue;
    }

    if (conflictingKeys.has(fixOccurrenceKey(violation))) {
      pendingFixIds.delete(violation.id);
      reviewFixIds.add(violation.id);
      continue;
    }

    // Find every file that contains the element. If it exists in more than one
    // file the match is ambiguous: the fix is left as a review suggestion instead
    // of patching an arbitrary file.
    const containing: string[] = [];

    for (const file of textFiles) {
      const original = await loadFile(file.path);
      if (original === undefined) continue;
      if (!locateElement(original, file.path, violation.elementHtml!, 0)) continue;
      containing.push(file.path);
    }

    if (containing.length !== 1 || scanTruncated || scanIncomplete) {
      pendingFixIds.delete(violation.id);
      reviewFixIds.add(violation.id);
      continue; // no match, ambiguous or incomplete: review file only
    }

    const path = containing[0];
    // The destination context has to be provable. A TypeScript module or a
    // component file that mixes markup and code has none: the element text can
    // sit inside a string or an expression there, and the fix would become
    // code. Such a fix ships as a review suggestion.
    if (!isPatchableFile(path)) {
      pendingFixIds.delete(violation.id);
      reviewFixIds.add(violation.id);
      continue;
    }

    const key = `${path}::${fixOccurrenceKey(violation)}`;
    const occurrence = localOccurrence.get(key) ?? 0;
    const original = contentCache.get(path);
    if (original === undefined) {
      pendingFixIds.delete(violation.id);
      reviewFixIds.add(violation.id);
      continue;
    }
    if (!locateElement(original, path, violation.elementHtml!, occurrence)) {
      pendingFixIds.delete(violation.id);
      reviewFixIds.add(violation.id);
      continue;
    }

    const list = assignments.get(path) ?? [];
    list.push(violation);
    assignments.set(path, list);
    localOccurrence.set(key, occurrence + 1);
  }

  for (const [path, list] of assignments) {
    const original = contentCache.get(path);
    if (original === undefined) {
      for (const violation of list) {
        pendingFixIds.delete(violation.id);
        reviewFixIds.add(violation.id);
      }
      continue;
    }

    const result = applyFixesToFile(original, list, path);
    if (result.fixesApplied !== list.length) {
      // A partial or failed patch cannot prove which candidate reached the
      // source file, so the whole file stays for human review.
      for (const violation of list) {
        pendingFixIds.delete(violation.id);
        reviewFixIds.add(violation.id);
      }
      continue;
    }

    fileWrites.push({
      path,
      content: result.content,
      message: `fix(a11y): ${list[0].ruleId}`,
      fixesApplied: result.fixesApplied,
    });
    for (const violation of list) {
      pendingFixIds.delete(violation.id);
      appliedFixIds.add(violation.id);
    }
  }

  return finishPlan();
}

/** Write only the source files that the plan proved. */
export async function applyRepositoryFixPlan(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  plan: RepositoryFixPlan
): Promise<{
  filesModified: Array<{ path: string; fixesApplied: number }>;
  fixesAppliedTotal: number;
  /** Ids of the fixes that were written into a source file. */
  appliedFixIds: string[];
}> {
  const filesModified: Array<{ path: string; fixesApplied: number }> = [];
  const appliedFixIds: string[] = [];
  let fixesAppliedTotal = 0;
  let fixIdOffset = 0;

  for (const write of plan.fileWrites) {
    // The planner emits ids in file-write order, so a refused write cannot
    // make the next accepted file claim its fixes.
    const fixIds = plan.appliedFixIds.slice(fixIdOffset, fixIdOffset + write.fixesApplied);
    fixIdOffset += write.fixesApplied;

    const written = await createFile(
      token,
      owner,
      repo,
      write.path,
      write.content,
      write.message,
      branch
    );
    if (!written) continue;

    filesModified.push({ path: write.path, fixesApplied: write.fixesApplied });
    fixesAppliedTotal += write.fixesApplied;
    // Only an accepted write proves that its fixes reached the repository.
    appliedFixIds.push(...fixIds);
  }

  return { filesModified, fixesAppliedTotal, appliedFixIds };
}

/** Keep the original writer contract while separating proof from mutation. */
export async function applyFixesToRepository(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  ref: string,
  violations: RepositoryFixCandidate[]
): Promise<{
  filesModified: Array<{ path: string; fixesApplied: number }>;
  fixesAppliedTotal: number;
  /** Ids of the fixes that were written into a source file. */
  appliedFixIds: string[];
}> {
  const plan = await planRepositoryFixes(token, owner, repo, ref, violations);
  return applyRepositoryFixPlan(token, owner, repo, branch, plan);
}

// Revoke GitHub OAuth token
export async function revokeToken(token: string): Promise<boolean> {
  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return false;
    }
    
    // Delete the OAuth application grant
    const response = await fetch(`https://api.github.com/applications/${clientId}/grant`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ access_token: token }),
    });
    
    return response.status === 204 || response.status === 202;
  } catch {
    return false;
  }
}

// Get pull request status
export async function getPullRequestStatus(token: string, owner: string, repo: string, prNumber: number): Promise<{
  state: string;
  merged: boolean;
  html_url: string;
} | null> {
  try {
    const octokit = getOctokit(token);
    const { data } = await octokit.pulls.get({ owner, repo, pull_number: prNumber });
    return {
      state: data.state,
      merged: data.merged || false,
      html_url: data.html_url,
    };
  } catch {
    return null;
  }
}

// Get multiple PR statuses
export async function getMultiplePRStatuses(token: string, prs: Array<{ owner: string; repo: string; prNumber: number }>): Promise<Map<string, { state: string; merged: boolean }>> {
  const results = new Map<string, { state: string; merged: boolean }>();
  
  for (const pr of prs) {
    const status = await getPullRequestStatus(token, pr.owner, pr.repo, pr.prNumber);
    if (status) {
      results.set(`${pr.owner}/${pr.repo}/${pr.prNumber}`, { state: status.state, merged: status.merged });
    }
  }
  
  return results;
}
