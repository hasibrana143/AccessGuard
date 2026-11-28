// GitHub integration for AccessGuard
import { Octokit } from '@octokit/rest';
import { decodeHtmlEntities, parseTagAttributes, URI_BASE } from '@/lib/html-attributes';
import type { ElementContext } from '@/lib/element-ancestors';
import type { CssContext } from '@/lib/css-context';

const REPOSITORY_ORIGIN = new URL(URI_BASE).origin;

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
 * The script sources of a file.
 *
 * A browser executes the response of a `<script src>` by its MIME type, not by
 * its name, so the target of a script source is runtime code whatever its
 * suffix is.
 */
function extractScriptSources(content: string): string[] {
  const sources: string[] = [];
  const pattern = /<script\b((?:[^>"']|"[^"]*"|'[^']*')*)/gi;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    for (const attribute of parseTagAttributes(match[1] ?? '')) {
      if (attribute.name === 'src' && attribute.value) {
        sources.push(decodeHtmlEntities(attribute.value));
      }
    }
  }

  return sources;
}

/** Elements whose content the browser does not parse as live markup. */
const RAW_TEXT_TAGS = new Set([
  'iframe',
  'noembed',
  'noframes',
  'noscript',
  'plaintext',
  'script',
  'style',
  'textarea',
  'title',
  'xmp',
]);

interface DocumentBase {
  url: URL | null;
  problem: string | null;
}

/** The effective base URL of a document, or why it cannot be proved. */
function resolveDocumentBase(documentPath: string, content: string | null): DocumentBase {
  let documentUrl: URL;
  try {
    documentUrl = new URL(documentPath, URI_BASE);
  } catch {
    return { url: null, problem: 'the document URL cannot be resolved' };
  }

  // A script file is runtime code, not a document, and a document without a
  // <base> element has its own URL as the base. Neither is read as markup:
  // a file that is not a document may hold anything.
  if (content === null || !/<base[\s/>]/i.test(content)) {
    return { url: documentUrl, problem: null };
  }

  const extracted = extractEventHandlerAttributes(content);
  if (extracted.incomplete) {
    return { url: null, problem: 'the document base cannot be read' };
  }
  if (extracted.baseHref === null) return { url: documentUrl, problem: null };

  const href = extracted.baseHref.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) {
    return { url: null, problem: 'the document base points outside the repository' };
  }

  try {
    const baseUrl = new URL(href, documentUrl);
    if (baseUrl.origin !== REPOSITORY_ORIGIN) {
      return { url: null, problem: 'the document base points outside the repository' };
    }
    return { url: baseUrl, problem: null };
  } catch {
    return { url: null, problem: 'the document base cannot be resolved' };
  }
}

/**
 * The live base and event-handler attributes of a document.
 *
 * Markup whose attribute value cannot be read cannot be followed safely.
 */
function extractEventHandlerAttributes(markup: string): {
  handlers: string[];
  baseHref: string | null;
  baseIds: string[];
  hasBase: boolean;
  incomplete: boolean;
} {
  const handlers: string[] = [];
  let baseHref: string | null = null;
  const baseIds: string[] = [];
  let hasBase = false;
  let templateDepth = 0;
  let cursor = 0;

  while (cursor < markup.length) {
    const open = markup.indexOf('<', cursor);
    if (open < 0) break;

    if (markup.startsWith('<!--', open)) {
      const close = markup.indexOf('-->', open + 4);
      if (close < 0) return { handlers, baseHref, baseIds, hasBase, incomplete: true };
      cursor = close + 3;
      continue;
    }

    if (markup.startsWith('<!', open) || markup.startsWith('<?', open)) {
      const close = markup.indexOf('>', open + 2);
      if (close < 0) return { handlers, baseHref, baseIds, hasBase, incomplete: true };
      cursor = close + 1;
      continue;
    }

    if (markup.startsWith('</', open)) {
      const end = markup.indexOf('>', open + 2);
      if (end < 0) return { handlers, baseHref, baseIds, hasBase, incomplete: true };
      const name = markup.slice(open + 2, end).trim().split(/[\s/]/)[0]?.toLowerCase();
      if (name === 'template' && templateDepth > 0) templateDepth--;
      cursor = end + 1;
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
    if (end < 0 || quote) return { handlers, baseHref, baseIds, hasBase, incomplete: true };

    const attributes = parseTagAttributes(markup.slice(sectionStart, end));
    if (tagName === 'base' && templateDepth === 0) {
      hasBase = true;
      const id = attributes.find(attribute => attribute.name === 'id')?.value;
      if (id) baseIds.push(decodeHtmlEntities(id));
    }
    for (const attribute of attributes) {
      if (/^on/i.test(attribute.name) && attribute.value) {
        handlers.push(decodeHtmlEntities(attribute.value));
      }
      if (
        tagName === 'base' &&
        templateDepth === 0 &&
        baseHref === null &&
        attribute.name === 'href'
      ) {
        baseHref = decodeHtmlEntities(attribute.value);
      }
    }
    cursor = end + 1;

    if (tagName === 'template') {
      templateDepth++;
      continue;
    }
    if (RAW_TEXT_TAGS.has(tagName)) {
      if (tagName === 'plaintext') break;
      const closing = new RegExp(`</${tagName}\\s*>`, 'ig');
      closing.lastIndex = cursor;
      const close = closing.exec(markup);
      if (!close) return { handlers, baseHref, baseIds, hasBase, incomplete: true };
      cursor = close.index + close[0].length;
    }
  }

  return { handlers, baseHref, baseIds, hasBase, incomplete: false };
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
  /\bgetAttributeNames\s*\(|\bgetNamedItem\s*\(|\bReflect\s*\.\s*(?:get|getOwnPropertyDescriptor)\s*\(|\bmatches\s*\(|\bclosest\s*\(\s*['"`][^'"`]*\[|\b(?:querySelector|querySelectorAll)\s*\(\s*['"`][^'"`]*\[/i;

/**
 * Reads of every attribute, which can react to any attribute the fix adds.
 *
 * The markup of the element carries its attributes, so a read of it is a read
 * of the attribute the fix adds.
 */
const RUNTIME_GENERIC_STATE_READ_PATTERN =
  /\bgetAttributeNames\s*\(|\bhasAttributes\s*\(|\.\s*attributes\b(?!\s*\.\s*getNamedItem\s*\()|\.\s*outerHTML\b/i;

/**
 * The string a concatenation of string literals evaluates to, or null.
 *
 * Only a literal is resolved: a variable, a call or an interpolated template
 * is a name the analyser cannot read.
 */
function resolveStringExpression(expression: string): string | null {
  const parts: string[] = [];
  let part = '';
  let quote: string | null = null;
  let escaped = false;

  for (const character of expression) {
    if (quote) {
      part += character;
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      part += character;
      continue;
    }
    if (character === '+') {
      parts.push(part);
      part = '';
      continue;
    }
    part += character;
  }

  if (quote) return null;
  parts.push(part);

  let out = '';
  for (const rawPart of parts) {
    const literal = /^(['"`])((?:\\.|(?!\1)[^\\])*)\1$/.exec(rawPart.trim());
    if (!literal) return null;
    // An interpolated template is not a constant.
    if (literal[1] === '`' && literal[2]?.includes('${')) return null;
    out += literal[2] ?? '';
  }

  return out || null;
}

/**
 * The name of a computed member: a string literal or a number.
 *
 * `fns[0]` names the member `0` and `fns['0']` names the same member, so an
 * unrelated computed call is neither a DOM write nor a name the analyser
 * cannot read.
 */
function resolveMemberName(expression: string): string | null {
  const resolved = resolveStringExpression(expression);
  if (resolved !== null) return resolved;
  const trimmed = expression.trim();
  return /^\d+$/.test(trimmed) ? trimmed : null;
}

/**
 * The DOM methods that read one attribute by name.
 *
 * The family is a pattern, not a list of names: every method that reads a
 * single attribute — `getAttribute`, `getAttributeNode`, `hasAttribute` and
 * their namespaced variants (`getAttributeNS`, `getAttributeNodeNS`,
 * `hasAttributeNS`) — belongs to it, while a method that only *writes* an
 * attribute (`toggleAttribute`) does not. The namespaced variants read the
 * **local** name, which is their second argument, because the namespace comes
 * first.
 */
const ATTRIBUTE_READ_PATTERN = /^(?:get|has)attribute(?:node)?(?:ns)?$/;

/** The method that reads an attribute of a named node map. */
const NAMED_ITEM_READ = 'getnameditem';

/**
 * The argument that names the attribute a read method reads.
 *
 * Null when the method does not read an attribute by name.
 */
function attributeReadPosition(name: string): number | null {
  const lower = name.toLowerCase();
  if (lower === NAMED_ITEM_READ) return 0;
  if (!ATTRIBUTE_READ_PATTERN.test(lower)) return null;
  return lower.endsWith('ns') ? 1 : 0;
}

/** True when a method reads an attribute by name. */
function isAttributeReadMethod(name: string): boolean {
  return attributeReadPosition(name) !== null;
}

/**
 * The members of an expression, and the computed ones it cannot resolve.
 *
 * A dot member, an optional-dot member (`?.name`), a computed member
 * (`['name']`) and an optional computed member (`?.['name']`) are all members
 * of the chain, and a call contributes no member: the arguments of
 * `querySelectorAll('img')` are not members of the callee, so
 * `Element.prototype.getAttribute?.call` ends in `call` while
 * `Reflect['get']` ends in `get`.
 */
function calleeMembers(callee: string): { name: string | null; computed: boolean }[] {
  const members: { name: string | null; computed: boolean }[] = [];
  let i = 0;

  while (i < callee.length) {
    const character = callee[i] as string;

    if (/\s/.test(character)) {
      i++;
      continue;
    }

    if (character === '?') {
      // An optional access: `?.member` and `?.[member]` read the same member,
      // and an optional call `?.(` is a call.
      i++;
      while (i < callee.length && /\s/.test(callee[i] as string)) i++;
      if (callee[i] === '.') i++;
      continue;
    }

    if (character === '.') {
      i++;
      while (i < callee.length && /\s/.test(callee[i] as string)) i++;
      const member = /^[A-Za-z_$][\w$]*/.exec(callee.slice(i));
      if (!member) break;
      members.push({ name: member[0], computed: false });
      i += member[0].length;
      continue;
    }

    if (character === '[') {
      const end = callee.indexOf(']', i);
      if (end === -1) break;
      const resolved = resolveMemberName(callee.slice(i + 1, end).trim());
      members.push({ name: resolved, computed: resolved === null });
      i = end + 1;
      continue;
    }

    if (character === '(') {
      const end = callee.indexOf(')', i);
      if (end === -1) break;
      i = end + 1;
      continue;
    }

    const member = /^[A-Za-z_$][\w$]*/.exec(callee.slice(i));
    if (!member) break;
    members.push({ name: member[0], computed: false });
    i += member[0].length;
  }

  return members;
}

/**
 * One member of a member chain.
 *
 * A dot member (`a.b`), an optional-dot member (`a?.b`), a computed member
 * (`a['b']`), an optional computed member (`a?.['b']`) and an optional access
 * of a computed member (`a?.['b']` after a dot) all read a member of the
 * chain, so every one of them is part of the pattern.
 */
const MEMBER_ACCESS_SOURCE =
  '(?:\\s*\\.\\s*[A-Za-z_$][\\w$]*' +
  '|\\s*\\?\\s*\\.\\s*[A-Za-z_$][\\w$]*' +
  '|\\s*\\?\\s*\\.\\s*\\[[^\\]]*\\]' +
  '|\\s*\\[\\s*[^\\]]*?\\s*\\]' +
  '|\\s*\\?\\s*\\[[^\\]]*\\])';

/** A method call and the receiver it is called on. */
const METHOD_CALL_PATTERN = new RegExp(
  `([A-Za-z_$][\\w$]*(?:${MEMBER_ACCESS_SOURCE}|\\s*\\([^()\\n]*\\))*)\\s*(?:\\?\\.\\s*)?\\(`,
  'g'
);

/**
 * A tagged-template invocation: `tag`text`` calls `tag` with the template
 * strings as its first argument.
 */
const TAGGED_TEMPLATE_CALL_PATTERN = new RegExp(
  `([A-Za-z_$][\\w$]*(?:${MEMBER_ACCESS_SOURCE}|\\s*\\([^()\\n]*\\))*)\\s*\\x60([^\\x60]*)\\x60`,
  'g'
);

/**
 * A call whose callee is an object literal.
 *
 * `({assign: Object.assign}).assign(element, source)` calls the member of an
 * object literal, so its callee does not start with an identifier.
 */
const LITERAL_CALL_PATTERN =
  /\(\s*(\{[\s\S]*?\})\s*\)\s*\.\s*([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)\s*\(/g;

/**
 * The attribute names a script reads through a DOM call, and the ones it
 * cannot resolve.
 *
 * The spelling of the call does not matter: `img.getAttribute('alt')`,
 * `img.getAttribute?.('alt')`, `img['get'+'Attribute']('alt')` and
 * `Element.prototype.getAttribute.call(img,'alt')` all read the `alt`
 * attribute of the image. A method name or an attribute name the analyser
 * cannot resolve is a generic state read.
 */
function attributeReadCalls(content: string): { name: string | null }[] {
  const reads: { name: string | null }[] = [];

  for (const match of content.matchAll(METHOD_CALL_PATTERN)) {
    const members = calleeMembers(match[1] ?? '');
    if (members.length === 0) continue;

    let method = members[members.length - 1] as { name: string | null; computed: boolean };
    let args = readCallArguments(content, match.index + match[0].length);

    // `fn.call(receiver, argument)` and `fn.apply(receiver, [argument])` call
    // `fn` with the receiver as the first argument.
    if (method.name !== null && (method.name === 'call' || method.name === 'apply') && members.length >= 2) {
      const spelling = method.name;
      method = members[members.length - 2] as { name: string | null; computed: boolean };
      if (spelling === 'apply') {
        const list = args && args.length > 1 ? args[1] : null;
        const first = list === null ? null : /^\s*\[([^\]]*)\]/.exec(list)?.[1]?.split(',')[0] ?? null;
        args = first === null ? null : [first];
      } else {
        args = args ? args.slice(1) : null;
      }
    }

    if (method.name === null) {
      // A computed method name may be an attribute read.
      if (method.computed) reads.push({ name: null });
      continue;
    }
    if (!isAttributeReadMethod(method.name)) continue;

    // The namespaced methods read the local name, which follows the namespace.
    const position = attributeReadPosition(method.name) ?? 0;
    const argument = args && args.length > position ? args[position] : null;
    reads.push({ name: argument === null ? null : resolveStringExpression(argument.trim()) });
  }

  // A tagged-template invocation is a call: `img.getAttribute`alt`` calls the
  // method with the template strings as its first argument, so it reads the
  // attribute the template names.
  for (const match of content.matchAll(TAGGED_TEMPLATE_CALL_PATTERN)) {
    const members = calleeMembers(match[1] ?? '');
    if (members.length === 0) continue;
    const method = members[members.length - 1];
    if (method.name === null || !isAttributeReadMethod(method.name)) continue;
    reads.push({ name: resolveStringExpression(`\`${match[2] ?? ''}\``) });
  }

  return reads;
}

/** The attribute names a script reads, and the ones it cannot resolve. */
function attributeNameReads(content: string): { name: string | null }[] {
  return attributeReadCalls(content);
}

/** A computed property read such as `element["al"+"t"]`. */
const COMPUTED_PROPERTY_READ_PATTERN = /\b[A-Za-z_$][\w$]*\s*(?:\?\.)?\s*\[\s*([^\]]*)\]/g;

/**
 * The arguments of a call, split at the commas outside nested calls.
 *
 * This is only used for the small DOM APIs whose property-name argument the
 * analyser has to read. A call it cannot read stays unresolved.
 */
function readCallArguments(source: string, from: number): string[] | null {
  return callSpan(source, from)?.args ?? null;
}

/**
 * The arguments of a call and the position after it.
 *
 * The position is what a member chain needs: the call of a chain is one
 * segment of it, and the chain continues after it.
 */
function callSpan(source: string, from: number): { args: string[]; end: number } | null {
  const args: string[] = [];
  let start = from;
  let depth = 0;
  let quote: string | null = null;
  let escaped = false;

  for (let i = from; i < source.length; i++) {
    const character = source[i] as string;

    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }

    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '(' || character === '[' || character === '{') {
      depth++;
      continue;
    }
    if (character === ')' || character === ']' || character === '}') {
      if (depth === 0) {
        if (character !== ')') return null;
        args.push(source.slice(start, i));
        return { args, end: i + 1 };
      }
      depth--;
      continue;
    }
    if (character === ',' && depth === 0) {
      args.push(source.slice(start, i));
      start = i + 1;
    }
  }

  return null;
}

/** The Reflect property readers whose second argument names a property. */
const REFLECT_PROPERTY_METHODS = new Set(['get', 'getownpropertydescriptor']);

/** An expression that is a member chain the analyser can read. */
const MEMBER_CHAIN_EXPRESSION = new RegExp(
  `^[A-Za-z_$][\\w$]*(?:${MEMBER_ACCESS_SOURCE})*$`
);

/**
 * A Reflect property read and the receiver it reads from.
 *
 * The spelling of the call does not matter: `Reflect.get(obj,'alt')`,
 * `Reflect['get'](obj,'alt')`, `Reflect?.get(obj,'alt')` and
 * `Reflect.get?.(obj,'alt')` all read the `alt` property. A receiver that is
 * not a member chain cannot be resolved, so the read is a generic state read.
 */
function reflectPropertyReads(content: string): { receiver: string; name: string | null }[] {
  const reads: { receiver: string; name: string | null }[] = [];

  for (const match of content.matchAll(METHOD_CALL_PATTERN)) {
    const members = calleeMembers(match[1] ?? '');
    if (members.length < 2) continue;

    const method = members[members.length - 1];
    if (method.name === null || !REFLECT_PROPERTY_METHODS.has(method.name.toLowerCase())) continue;
    const object = members[members.length - 2];
    if (object.name === null || object.name.toLowerCase() !== 'reflect') continue;

    const args = readCallArguments(content, match.index + match[0].length);
    const receiver = args && args.length > 0 ? (args[0] ?? '').trim() : '';
    const expression = args && args.length > 1 ? args[1] : null;
    if (!MEMBER_CHAIN_EXPRESSION.test(receiver)) {
      // The receiver cannot be resolved: the read may be of any object.
      reads.push({ receiver: '', name: null });
      continue;
    }

    reads.push({
      receiver,
      name: expression === null ? null : resolveStringExpression(expression.trim()),
    });
  }

  return reads;
}

/** The property names a Reflect reader reads, and the ones it cannot resolve. */
function reflectPropertyNameReads(content: string): { name: string | null }[] {
  return reflectPropertyReads(content).map(read => ({ name: read.name }));
}

/** A selector argument passed to a DOM selection API. */
const SELECTOR_READ_PATTERN =
  /\b(?:matches|closest|querySelector|querySelectorAll)\s*\(\s*([^)]*)\)/gi;

/** The property names a script reads, and the ones it cannot resolve. */
function propertyNameReads(content: string): { name: string | null }[] {
  return computedPropertyReads(content).map(read => ({ name: read.name }));
}

/** A computed property read and the object it reads from. */
function computedPropertyReads(content: string): { object: string; name: string | null }[] {
  const reads: { object: string; name: string | null }[] = [];

  for (const match of content.matchAll(COMPUTED_PROPERTY_READ_PATTERN)) {
    const expression = (match[1] ?? '').trim();
    if (/^\d+$/.test(expression)) continue;
    const bracket = match[0].indexOf('[');
    reads.push({
      object: bracket === -1 ? '' : match[0].slice(0, bracket).trim(),
      name: resolveStringExpression(expression),
    });
  }

  return reads;
}

/** The selectors a script reads, and the ones it cannot resolve. */
function selectorNameReads(content: string): { name: string | null }[] {
  const reads: { name: string | null }[] = [];

  for (const match of content.matchAll(SELECTOR_READ_PATTERN)) {
    reads.push({ name: resolveStringExpression((match[1] ?? '').trim()) });
  }

  return reads;
}

/** The attributes a selector names, and whether one is unreadable. */
interface SelectorAttributes {
  names: string[];
  dynamic: boolean;
}

/** The element a selector names: the last compound of the selector. */
function selectorSubject(selector: string): string {
  const parts = selector.split(/[\s>+~]+/).filter(Boolean);
  return parts[parts.length - 1] ?? selector.trim();
}

/** The class names a selector names. */
function selectorClasses(selector: string): string[] {
  const names: string[] = [];
  for (const match of selector.matchAll(/\.([A-Za-z_][\w-]*)/g)) names.push(match[1] ?? '');
  return names;
}

/**
 * True when a literal selector can name one of the elements the fix
 * introduced.
 *
 * The selector names an element by its tag, its id, one of its classes or one
 * of its attributes, so a script that selects one of them reaches the element
 * the fix introduced. The values of the attribute selectors are not compared:
 * a selector that names the attribute of the element is close enough.
 */
function selectorNamesIntroducedElement(
  selector: string,
  elements: { tag: string; classes: Set<string>; id: string | null; attributes: Map<string, string> }[]
): boolean {
  const subject = selectorSubject(selector);
  const tag = /^([A-Za-z][\w-]*)/.exec(subject)?.[1]?.toLowerCase() ?? null;
  const id = /#([A-Za-z_][\w-]*)/.exec(subject)?.[1] ?? null;
  const classes = selectorClasses(subject);
  const attributes = selectorAttributes(subject).names;

  return elements.some(element => {
    if (tag !== null && tag !== element.tag.toLowerCase()) return false;
    if (id !== null && id !== element.id) return false;
    if (classes.some(name => !element.classes.has(name))) return false;
    if (attributes.some(name => !element.attributes.has(name))) return false;
    return true;
  });
}

/**
 * True when a script selects one of the elements the fix introduced.
 *
 * A literal selector names an element by its tag, its id, one of its classes
 * or one of its attributes. A selector the analyser cannot resolve may name
 * one of them as well, so it fails closed.
 */
function scriptSelectsIntroducedElement(
  content: string,
  elements: { tag: string; classes: Set<string>; id: string | null; attributes: Map<string, string> }[]
): boolean {
  if (elements.length === 0) return false;

  for (const read of selectionSelectorReads(content)) {
    if (read === null) return true;
    if (selectorNamesIntroducedElement(read, elements)) return true;
  }

  for (const read of tagNameReads(content)) {
    if (read === null) return true;
    if (elements.some(element => element.tag.toLowerCase() === read.toLowerCase())) return true;
  }

  return false;
}

/** The attribute names a selector names, and whether one is unreadable. */
function selectorAttributes(selector: string): SelectorAttributes {
  const names: string[] = [];
  let dynamic = false;

  for (const match of selector.matchAll(/\[\s*([^\s~^$=\]#:]+)/g)) {
    const name = match[1] ?? '';
    if (!/^[A-Za-z_][\w-]*$/.test(name)) {
      dynamic = true;
      continue;
    }
    names.push(name.toLowerCase());
  }

  return { names, dynamic };
}

/**
 * True when a script reads an attribute whose name it cannot resolve.
 *
 * The read may be the attribute the fix adds, so the script reacts to the fix
 * in a way the analyser cannot follow: it is a generic state read.
 */
function scriptReadsDynamicAttribute(content: string): boolean {
  return attributeNameReads(content).some(read => read.name === null);
}

/** True when a computed property name cannot be read statically. */
function scriptReadsDynamicProperty(content: string): boolean {
  return (
    propertyNameReads(content).some(read => read.name === null) ||
    reflectPropertyNameReads(content).some(read => read.name === null)
  );
}

/** True when a selector argument or its attribute name cannot be read. */
function scriptReadsDynamicSelector(content: string): boolean {
  return selectorNameReads(content).some(
    read => read.name === null || selectorAttributes(read.name).dynamic
  );
}

/** An assignment operator, including the compound ones. */
const ASSIGNMENT_OPERATOR_SOURCE =
  String.raw`(?:\*\*=|<<=|>>=|\|\|=|&&=|\?\?=|\+=|-=|\*=|\/=|%=|=(?![=>]))`;

/** The DOM methods that write an attribute, and the argument that names it. */
const ATTRIBUTE_WRITING_METHODS = new Map<string, number>([
  ['setattribute', 0],
  ['setattributens', 1],
  ['removeattribute', 0],
  ['removeattributens', 1],
  ['toggleattribute', 0],
  ['setattributenode', 0],
  ['removeattributenode', 0],
]);

/** The class list methods that write a class. */
const CLASS_LIST_WRITING_METHODS = new Set(['add', 'remove', 'toggle', 'replace']);

/** The inline style methods that write a property. */
const STYLE_WRITING_METHODS = new Set(['setproperty', 'removeproperty']);

/** The DOM methods that change the markup of an element. */
const ELEMENT_MUTATION_METHODS = new Set([
  'after',
  'append',
  'appendchild',
  'before',
  'insertadjacentelement',
  'insertadjacenthtml',
  'insertbefore',
  'prepend',
  'replacechildren',
  'replacechild',
  'replacewith',
]);

/** The class name assignments of a script. */
const CLASS_NAME_ASSIGNMENT_PATTERN = new RegExp(
  String.raw`\bclassName\s*${ASSIGNMENT_OPERATOR_SOURCE}`,
  'i'
);

/** The whole inline style assignments of a script, such as `element.style = '…'`. */
const STYLE_ASSIGNMENT_PATTERN = new RegExp(
  String.raw`\.\s*style\s*${ASSIGNMENT_OPERATOR_SOURCE}`,
  'i'
);

/** The inline style property assignments of a script, such as `element.style.top = '0'`. */
const STYLE_PROPERTY_ASSIGNMENT_PATTERN = new RegExp(
  String.raw`\.\s*style\s*\.\s*[A-Za-z_$][\w$]*\s*${ASSIGNMENT_OPERATOR_SOURCE}`,
  'i'
);

/** The markup replacements of a script, such as `element.outerHTML = '…'`. */
const MARKUP_ASSIGNMENT_PATTERN = new RegExp(
  String.raw`\.\s*(?:outerHTML|innerHTML)\s*${ASSIGNMENT_OPERATOR_SOURCE}`,
  'i'
);

/**
 * The attribute an attribute-writing call writes.
 *
 * The name is an argument of the call: the first one for `setAttribute` and
 * `removeAttribute`, the second one for the namespaced spellings, because the
 * namespace comes first. A name the analyser cannot read is null.
 */
function writtenAttributeName(method: string, args: string[] | null): string | null {
  const position = ATTRIBUTE_WRITING_METHODS.get(method.toLowerCase());
  if (position === undefined) return null;
  const argument = args && args.length > position ? args[position] : null;
  return argument === null ? null : resolveStringExpression(argument.trim());
}

/** A DOM mutation the reader follows. */
interface RuntimeMutation {
  /** True when the script mutates an element. */
  mutates: boolean;
  /** True when the mutation writes a name the analyser cannot read. */
  dynamic: boolean;
}

/**
 * The DOM mutations a script performs.
 *
 * Every statically resolvable spelling counts: the attribute methods, the
 * class, the inline style, the attribute node, the markup and the object
 * assignment. A method name the analyser cannot resolve may be a DOM mutation
 * it cannot follow, and a mutation whose written name it cannot read may write
 * the attribute the fix adds: both fail closed like a generic state read.
 */
function runtimeMutations(content: string, bindings: ElementBindings): RuntimeMutation {
  let mutates = false;
  let dynamic = false;
  const utilities = new HeldValues(content);

  for (const match of content.matchAll(METHOD_CALL_PATTERN)) {
    const members = calleeMembers(match[1] ?? '');
    if (members.length === 0) continue;

    const method = members[members.length - 1] as { name: string | null; computed: boolean };
    const receiver = members.length >= 2 ? members[members.length - 2] : null;
    const args = readCallArguments(content, match.index + match[0].length);

    if (method.name === null) {
      // A computed method name may be a DOM mutation the analyser cannot
      // follow: the script fails closed when it reads state as well. A
      // computed call on a receiver that cannot be an element (`fns[i]()`)
      // mutates nothing the fix adds.
      const chain = members.slice(0, -1).map(member => ({ name: member.name, args: null }));
      if (chainObject(chain, bindings).kind === 'element') {
        mutates = true;
        dynamic = true;
      }
      continue;
    }

    const name = method.name.toLowerCase();
    const receiverName = receiver?.name?.toLowerCase() ?? null;

    if (ATTRIBUTE_WRITING_METHODS.has(name)) {
      mutates = true;
      if (writtenAttributeName(method.name, args) === null) dynamic = true;
      continue;
    }

    if (receiverName === 'classlist' && CLASS_LIST_WRITING_METHODS.has(name)) {
      mutates = true;
      // `toggle` names the class first and takes the force flag second.
      const names = args ? (name === 'toggle' ? args.slice(0, 1) : args) : [];
      if (names.length === 0) {
        dynamic = true;
        continue;
      }
      for (const className of names) {
        if (resolveStringExpression(className.trim()) === null) dynamic = true;
      }
      continue;
    }

    if (receiverName === 'style' && STYLE_WRITING_METHODS.has(name)) {
      mutates = true;
      const argument = args && args.length > 0 ? args[0] : null;
      if (argument === null || resolveStringExpression(argument.trim()) === null) dynamic = true;
      continue;
    }

    if (ELEMENT_MUTATION_METHODS.has(name)) {
      mutates = true;
      continue;
    }

    // `Object.assign(element, source)` and its spellings write to the element
    // they receive as an argument, not to their receiver.
    const utility = objectUtilityCall(match[1] ?? '', args, utilities);
    if (utility && utility.method !== null && OBJECT_UTILITY_METHODS.has(utility.method)) {
      mutates = true;
      // The written names are the keys of the object: a literal without a
      // spread names them, anything else the analyser cannot read.
      if (utility.args === null) dynamic = true;
      else if (objectUtilityAttributes(utility.method, utility.args).some(attribute => attribute === null)) {
        dynamic = true;
      }
    }
  }

  // A tagged-template invocation is a call: the tag receives the template
  // strings as its first argument.
  for (const match of content.matchAll(TAGGED_TEMPLATE_CALL_PATTERN)) {
    const members = calleeMembers(match[1] ?? '');
    if (members.length === 0) continue;
    const method = members[members.length - 1];
    if (method.name === null) continue;
    if (!ATTRIBUTE_WRITING_METHODS.has(method.name.toLowerCase())) continue;
    mutates = true;
    if (writtenAttributeName(method.name, [`\`${match[2] ?? ''}\``]) === null) dynamic = true;
  }

  for (const match of content.matchAll(ATTRIBUTE_VALUE_ASSIGNMENT_PATTERN)) {
    mutates = true;
    const attribute = match[2] ?? match[3] ?? null;
    if (attribute === null || resolveStringExpression(attribute.trim()) === null) dynamic = true;
  }

  if (
    CLASS_NAME_ASSIGNMENT_PATTERN.test(content) ||
    STYLE_ASSIGNMENT_PATTERN.test(content) ||
    STYLE_PROPERTY_ASSIGNMENT_PATTERN.test(content) ||
    MARKUP_ASSIGNMENT_PATTERN.test(content)
  ) {
    mutates = true;
  }

  return { mutates, dynamic };
}

/**
 * The DOM methods that only read.
 *
 * A method that is not in the list is treated as a write: the analyser fails
 * closed on a runtime it cannot follow. The attribute readers the file
 * already knows (`isAttributeReadMethod`) are pure reads too, and a property
 * getter such as `textContent` is a read because only an assignment writes.
 */
const PURE_READ_METHODS = new Set([
  'getboundingclientrect',
  'getclientrects',
  'closest',
  'matches',
  'contains',
  'comparedocumentposition',
  'isequalnode',
  'getanimations',
  'getcomputedstyle',
  'queryselector',
  'queryselectorall',
  'getelementsbytagname',
  'getelementsbyclassname',
  'getelementbyid',
  'getpropertyvalue',
  'getpropertypriority',
  'hasattributes',
  'getattributenames',
]);

/**
 * The DOM methods that do not write the page.
 *
 * An iteration helper over an element collection changes nothing by itself —
 * the writes inside its callback are read separately — and the focus helpers
 * change nothing the markup or the attributes of the element depend on. A
 * method that is in neither list is treated as a write, so an unknown runtime
 * fails closed.
 */
const NON_WRITING_METHODS = new Set([
  'foreach',
  'entries',
  'keys',
  'values',
  'item',
  'focus',
  'blur',
]);

/** True when a method does not write the page. */
function isPureReadMethod(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    isAttributeReadMethod(name) || PURE_READ_METHODS.has(lower) || NON_WRITING_METHODS.has(lower)
  );
}

/** The methods that remove the element they are called on. */
const DESTROYING_METHODS = new Set(['remove', 'removechild', 'replacechild', 'replacewith']);

/** The properties that replace the markup of the element they are written to. */
const DESTROYING_PROPERTIES = new Set(['innerhtml', 'outerhtml']);

/** The methods that write the class list of an element. */
const CLASS_LIST_METHODS = new Set(['add', 'remove', 'toggle', 'replace']);

/**
 * What a write may reach: the ids, tags and classes it selects.
 *
 * The reach is what tells a write of the patched element apart from a write
 * of another element: a script that removes every `img` destroys the fix, a
 * script that removes every `p` does not.
 */
interface ElementReach {
  ids: Set<string>;
  tags: Set<string>;
  classes: Set<string>;
  /** True when the reach cannot be read. */
  any: boolean;
}

/** The reach of an element the analyser cannot name. */
function unknownReach(): ElementReach {
  return { ids: new Set(), tags: new Set(), classes: new Set(), any: true };
}

/** The reach of a selector: the element it names, or the elements it may name. */
function selectorReach(selector: string): ElementReach {
  const subject = selectorSubject(selector);
  const tag = /^([A-Za-z][\w-]*)/.exec(subject)?.[1]?.toLowerCase() ?? null;
  const id = /#([A-Za-z_][\w-]*)/.exec(subject)?.[1] ?? null;
  const reach: ElementReach = { ids: new Set(), tags: new Set(), classes: new Set(), any: false };

  if (id) reach.ids.add(id);
  if (tag) reach.tags.add(tag);
  for (const name of selectorClasses(subject)) reach.classes.add(name);
  if (reach.ids.size === 0 && reach.tags.size === 0 && reach.classes.size === 0) reach.any = true;

  return reach;
}

/** One segment of a member chain. */
interface ChainSegment {
  /** The member name, when the analyser can read it. */
  name: string | null;
  /** The arguments of the call, when the segment is a call. */
  args: string[] | null;
}

/** The segments of a member chain. */
function parseChain(text: string): ChainSegment[] {
  const segments: ChainSegment[] = [];
  let i = 0;

  while (i < text.length) {
    const character = text[i] as string;

    if (/\s/.test(character)) {
      i++;
      continue;
    }

    if (character === '?') {
      // An optional access: `?.member` and `?.[member]` read the same member.
      i++;
      while (i < text.length && /\s/.test(text[i] as string)) i++;
      if (text[i] === '.') i++;
      continue;
    }

    if (character === '.') {
      i++;
      while (i < text.length && /\s/.test(text[i] as string)) i++;
      const member = /^[A-Za-z_$][\w$]*/.exec(text.slice(i));
      if (!member) break;
      segments.push({ name: member[0], args: null });
      i += member[0].length;
      continue;
    }

    if (character === '[') {
      const end = text.indexOf(']', i);
      if (end === -1) break;
      segments.push({ name: resolveMemberName(text.slice(i + 1, end).trim()), args: null });
      i = end + 1;
      continue;
    }

    if (character === '(') {
      const call = callSpan(text, i + 1);
      if (!call) break;
      const last = segments[segments.length - 1];
      if (last) last.args = call.args;
      i = call.end;
      continue;
    }

    const identifier = /^[A-Za-z_$][\w$]*/.exec(text.slice(i));
    if (!identifier) break;
    segments.push({ name: identifier[0], args: null });
    i += identifier[0].length;
  }

  return segments;
}

/** The object a chain reads. */
interface ChainObject {
  kind: 'document' | 'element' | 'other';
  reach: ElementReach | null;
}

/** The object a call on the document returns. */
function documentCallObject(name: string | null, args: string[]): ChainObject {
  const argument = args[0] ? resolveStringExpression(args[0].trim()) : null;

  if (name === 'queryselector' || name === 'queryselectorall') {
    return { kind: 'element', reach: argument === null ? unknownReach() : selectorReach(argument) };
  }
  if (name === 'getelementbyid') {
    return {
      kind: 'element',
      reach:
        argument === null
          ? unknownReach()
          : { ids: new Set([argument]), tags: new Set(), classes: new Set(), any: false },
    };
  }
  if (name === 'getelementsbytagname') {
    return {
      kind: 'element',
      reach:
        argument === null
          ? unknownReach()
          : { ids: new Set(), tags: new Set([argument.toLowerCase()]), classes: new Set(), any: false },
    };
  }
  if (name === 'getelementsbyclassname') {
    return {
      kind: 'element',
      reach:
        argument === null
          ? unknownReach()
          : { ids: new Set(), tags: new Set(), classes: new Set([argument]), any: false },
    };
  }
  if (name === 'createelement') {
    return {
      kind: 'element',
      reach:
        argument === null
          ? unknownReach()
          : { ids: new Set(), tags: new Set([argument.toLowerCase()]), classes: new Set(), any: false },
    };
  }

  return { kind: 'other', reach: null };
}

/**
 * The object a chain reads, and what it may reach.
 *
 * The chain is read from its root: a selection call produces an element, a
 * member of an element stays element-ish, and everything else is an object
 * the analyser knows nothing about.
 */
function chainObject(segments: ChainSegment[], bindings: ElementBindings): ChainObject {
  let object: ChainObject = { kind: 'other', reach: null };
  let first = true;

  for (const segment of segments) {
    const name = segment.name?.toLowerCase() ?? null;

    if (first) {
      first = false;
      if (name === 'document') {
        object = { kind: 'document', reach: null };
      } else if (name && bindings.elements.has(name)) {
        object = { kind: 'element', reach: bindings.elements.get(name) ?? null };
      } else if (name && /^(?:html[a-z]*)?element$/.test(name)) {
        // `Element.prototype` and `HTMLImageElement.prototype` are elements.
        object = { kind: 'element', reach: unknownReach() };
      } else if (name === 'proxy' && segment.args && segment.args.length > 0) {
        // A proxy forwards to its target: `new Proxy(element, handler)` writes
        // the element it wraps.
        const reach = expressionReach(segment.args[0] ?? '', bindings);
        object = reach === null ? { kind: 'other', reach: null } : { kind: 'element', reach };
      } else {
        object = { kind: 'other', reach: null };
      }
      continue;
    }

    if (segment.args === null) {
      // A member of the current object.
      if (
        object.kind === 'document' &&
        (name === 'body' || name === 'head' || name === 'documentelement')
      ) {
        object = { kind: 'element', reach: unknownReach() };
      }
      continue;
    }

    // A call on the current object.
    if (object.kind === 'document') {
      object = documentCallObject(name, segment.args);
      continue;
    }
    if (object.kind === 'element') {
      if (name === 'queryselector' || name === 'queryselectorall') {
        const selector = segment.args[0]
          ? resolveStringExpression(segment.args[0].trim())
          : null;
        object = {
          kind: 'element',
          reach: selector === null ? unknownReach() : selectorReach(selector),
        };
      }
      continue;
    }
    object = { kind: 'other', reach: null };
  }

  return object;
}

/** The elements a script can reach, by the variables that hold them. */
interface ElementBindings {
  /** The variables that hold an element, and what they may reach. */
  elements: Map<string, ElementReach>;
  /** The variables that hold a method bound to an element. */
  bound: Map<string, BoundMethod>;
  /** The variables that hold an array of elements. */
  arrays: Map<string, string[]>;
}
/** A method bound to an element. */
interface BoundMethod {
  /** The method the binding holds, when it can be read. */
  method: string | null;
  /** The receiver the method is called on. */
  receiver: ChainSegment[];
}

/** A variable assigned an expression. */
const VARIABLE_ASSIGNMENT_PATTERN =
  /(?:\b(?:const|let|var)\s+)?\b([A-Za-z_$][\w$]*)\s*=(?!=)\s*([^;\n]+)/g;

/** A variable destructured from an expression. */
const DESTRUCTURING_PATTERN =
  /\b(?:const|let|var)\s*\{([^}]*)\}\s*=(?!=)\s*([^;\n]+)/g;

/** A member assigned on a variable, such as `namespace.assign = Object.assign`. */
const MEMBER_ASSIGNMENT_PATTERN =
  /\b([A-Za-z_$][\w$]*)\s*\.\s*([A-Za-z_$][\w$]*)\s*=(?!=)\s*([^;\n]+)/g;

/** A chain the analyser reads, with the calls it may hold. */
const CHAIN_SOURCE = `[A-Za-z_$][\\w$]*(?:${MEMBER_ACCESS_SOURCE}|\\s*\\([^()\\n]*\\))*`;

/** A callback parameter of an iteration over a collection. */
const ITERATION_CALLBACK_PATTERN = new RegExp(
  `(${CHAIN_SOURCE})\\s*\\.\\s*(?:forEach|map|filter|some|every|find|findIndex|flatMap)\\s*\\(\\s*` +
    `(?:function\\s*(?:\\*\\s*)?(?:\\(\\s*)?([A-Za-z_$][\\w$]*)|` +
    `\\(\\s*([A-Za-z_$][\\w$]*)\\s*\\)\\s*=>|([A-Za-z_$][\\w$]*)\\s*=>)`,
  'g'
);

/** An element of an array literal, indexed: `[element][0]`. */
const ARRAY_INDEX_PATTERN =
  /^\[([\s\S]*)\]\s*(?:\[\s*(\d+)\s*\]|\.\s*at\s*\(\s*(\d+)\s*\))/;

/** An element of an array a variable holds, indexed: `array[0]`. */
const HELD_ARRAY_INDEX_PATTERN =
  /^([A-Za-z_$][\w$]*)\s*(?:\[\s*(\d+)\s*\]|\.\s*at\s*\(\s*(\d+)\s*\))$/;

/**
 * The reach of an expression, when it can be an element.
 *
 * A selection call, a created element, an event target, a variable that
 * holds an element and a member of such a variable are elements.
 */
function expressionReach(expression: string, bindings: ElementBindings): ElementReach | null {
  const trimmed = expression.trim();
  if (!trimmed) return null;

  // A bound method keeps the reach of the element it is bound to.
  const bind = /\.\s*bind\s*\(/.exec(trimmed);
  if (bind) return expressionReach(trimmed.slice(0, bind.index), bindings);

  // A plain variable.
  if (/^[A-Za-z_$][\w$]*$/.test(trimmed)) return bindings.elements.get(trimmed) ?? null;

  // The target of an event is an element.
  if (/\.\s*(?:currentTarget|target)$/.test(trimmed)) return unknownReach();

  // An element of an array literal: `[element][0]`.
  const literal = ARRAY_INDEX_PATTERN.exec(trimmed);
  if (literal) {
    const elements = splitTopLevel((literal[1] ?? '').trim());
    const element = elements[Number(literal[2] ?? literal[3] ?? '0')];
    return element === undefined ? null : expressionReach(element, bindings);
  }

  // An element of an array a variable holds: `array[0]`.
  const held = HELD_ARRAY_INDEX_PATTERN.exec(trimmed);
  if (held) {
    const elements = bindings.arrays.get(held[1] ?? '');
    if (!elements) return null;
    const element = elements[Number(held[2] ?? held[3] ?? '0')];
    return element === undefined ? null : expressionReach(element, bindings);
  }

  const object = chainObject(parseChain(trimmed), bindings);
  return object.kind === 'element' ? object.reach : null;
}

/** The parameters a named function declares. */
const FUNCTION_DECLARATION_PATTERN =
  /\b(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g;

/** The parameters a function expression assigned to a name declares. */
const FUNCTION_ASSIGNMENT_PATTERN =
  /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\s*\*?\s*\(([^)]*)\)|\(\s*([^)]*)\s*\)\s*=>|([A-Za-z_$][\w$]*)\s*=>)/g;

/** The names of the parameters a parameter list declares. */
function parameterNames(list: string): string[] {
  return list
    .split(',')
    .map(raw => (raw.split('=')[0] ?? '').split(':')[0]?.replace(/^\.\.\./, '').trim() ?? '')
    .filter(name => /^[A-Za-z_$][\w$]*$/.test(name));
}

/** The functions the script declares, and the parameters they declare. */
function functionParameters(content: string): Map<string, string[]> {
  const functions = new Map<string, string[]>();

  for (const match of content.matchAll(FUNCTION_DECLARATION_PATTERN)) {
    const name = match[1] ?? '';
    if (name) functions.set(name, parameterNames(match[2] ?? ''));
  }
  for (const match of content.matchAll(FUNCTION_ASSIGNMENT_PATTERN)) {
    const name = match[1] ?? '';
    if (!name || functions.has(name)) continue;
    functions.set(name, parameterNames(match[2] ?? match[3] ?? match[4] ?? ''));
  }

  return functions;
}

/**
 * The elements a script can reach, by the variables that hold them.
 *
 * The bindings are read until they stop changing: an assignment may use a
 * variable an earlier assignment bound, and a function parameter holds what
 * the call site passes.
 */
function elementBindings(content: string): ElementBindings {
  const bindings: ElementBindings = {
    elements: new Map(),
    bound: new Map(),
    arrays: new Map(),
  };
  const functions = functionParameters(content);

  // A variable that holds an array of elements.
  for (const match of content.matchAll(VARIABLE_ASSIGNMENT_PATTERN)) {
    const name = match[1] ?? '';
    const expression = (match[2] ?? '').trim();
    if (!name || bindings.arrays.has(name)) continue;
    if (!expression.startsWith('[')) continue;
    const end = matchingBracket(expression);
    if (end === -1) continue;
    bindings.arrays.set(name, splitTopLevel(expression.slice(1, end)));
  }

  for (let round = 0; round < 3; round++) {
    let changed = false;

    // The parameter of a callback over a collection of elements is an element.
    for (const match of content.matchAll(ITERATION_CALLBACK_PATTERN)) {
      const parameter = match[2] ?? match[3] ?? match[4] ?? '';
      if (!parameter || bindings.elements.has(parameter)) continue;
      const reach = expressionReach(match[1] ?? '', bindings);
      if (!reach) continue;
      bindings.elements.set(parameter, reach);
      changed = true;
    }

    // The parameter of a function is the element the call site passes.
    for (const match of content.matchAll(METHOD_CALL_PATTERN)) {
      const callee = (match[1] ?? '').trim();
      if (!/^[A-Za-z_$][\w$]*$/.test(callee)) continue;
      const parameters = functions.get(callee);
      if (!parameters) continue;
      const args = readCallArguments(content, match.index + match[0].length) ?? [];
      for (let index = 0; index < parameters.length; index++) {
        const parameter = parameters[index] as string;
        const argument = args[index];
        if (argument === undefined) continue;
        if (bindings.elements.has(parameter)) continue;
        const reach = expressionReach(argument, bindings);
        if (!reach) continue;
        bindings.elements.set(parameter, reach);
        changed = true;
      }
    }

    for (const match of content.matchAll(VARIABLE_ASSIGNMENT_PATTERN)) {
      const name = match[1] ?? '';
      const expression = match[2] ?? '';
      if (!name || bindings.elements.has(name)) continue;
      const reach = expressionReach(expression, bindings);
      if (!reach) continue;
      bindings.elements.set(name, reach);
      const bind = /\.\s*bind\s*\(/.exec(expression);
      if (bind) {
        const bound = parseChain(expression.slice(0, bind.index));
        bindings.bound.set(name, {
          method: bound[bound.length - 1]?.name ?? null,
          receiver: bound.slice(0, -1),
        });
      }
      changed = true;
    }

    // A destructured member of an element is an element too.
    for (const match of content.matchAll(DESTRUCTURING_PATTERN)) {
      const reach = expressionReach(match[2] ?? '', bindings);
      if (!reach) continue;
      for (const raw of (match[1] ?? '').split(',')) {
        const name = raw.split(':')[0]?.split('=')[0]?.trim() ?? '';
        if (!/^[A-Za-z_$][\w$]*$/.test(name) || bindings.elements.has(name)) continue;
        bindings.elements.set(name, reach);
        changed = true;
      }
    }

    if (!changed) break;
  }

  return bindings;
}

/** A write a script performs. */
interface ScriptWrite {
  /** The property or method the write names, when the analyser can read it. */
  property: string | null;
  /** The attribute the write names, when it names one. */
  attribute: string | null;
  /** True when the write names an attribute through a DOM call. */
  attributeMethod: boolean;
  /** True when the write may reach an element. */
  element: boolean;
  /** What the write may reach. */
  reach: ElementReach | null;
  /** True when the write removes the element or its content. */
  destroys: boolean;
  /** True when the write replaces the page. */
  page: boolean;
  /** The class names a class list write names. */
  classes: (string | null)[];
  /** The class list method the write calls, when it calls one. */
  classMethod: string | null;
}

/** An assignment to a property or an indexed member. */
const ASSIGNMENT_WRITE_PATTERN = new RegExp(
  `(${CHAIN_SOURCE})\\s*${ASSIGNMENT_OPERATOR_SOURCE}`,
  'g'
);

/** A deletion of a property. */
const DELETE_WRITE_PATTERN = new RegExp(`\\bdelete\\s+(${CHAIN_SOURCE})`, 'g');

/** True when an assignment is a declaration. */
function isDeclaration(content: string, index: number): boolean {
  return /\b(?:const|let|var)\s+$/.test(content.slice(Math.max(0, index - 12), index));
}

/** The attribute a property write names. */
function attributeOfProperty(property: string): string {
  const lower = property.toLowerCase();
  if (lower === 'classname') return 'class';
  if (lower === 'htmlfor') return 'for';
  return lower;
}

/** True when a chain writes the page itself. */
function isPageChain(segments: ChainSegment[]): boolean {
  if (segments.length < 2) return false;
  if (segments[0]?.name?.toLowerCase() !== 'document') return false;
  const last = segments[segments.length - 1]?.name?.toLowerCase() ?? '';
  return last === 'body' || last === 'documentelement';
}

/** The elements of an array literal. */
function literalArguments(text: string): string[] {
  const match = /^\s*\[([^\]]*)\]\s*$/.exec(text);
  if (!match) return [];
  return (match[1] ?? '')
    .split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0);
}

/** A write whose target the analyser cannot read. */
function unresolvedWrite(reach: ElementReach | null): ScriptWrite {
  return {
    property: null,
    attribute: null,
    attributeMethod: false,
    element: true,
    reach,
    destroys: false,
    page: false,
    classes: [],
    classMethod: null,
  };
}

/**
 * A write whose attribute the analyser cannot read.
 *
 * The write may be the attribute the fix adds, so it fails closed.
 */
function unresolvedAttributeWrite(reach: ElementReach | null): ScriptWrite {
  return {
    property: null,
    attribute: null,
    attributeMethod: true,
    element: true,
    reach,
    destroys: false,
    page: false,
    classes: [],
    classMethod: null,
  };
}

/** A write for each attribute a write may touch. */
function attributeWrites(names: (string | null)[], reach: ElementReach | null): ScriptWrite[] {
  return names.map(name => ({
    property: null,
    attribute: name,
    attributeMethod: true,
    element: true,
    reach,
    destroys: false,
    page: false,
    classes: [],
    classMethod: null,
  }));
}

/**
 * The keys of an object literal.
 *
 * A key the analyser cannot read is null: the write may touch any attribute,
 * so it fails closed. A spread may carry any key, so a literal with a spread
 * has no readable key at all.
 */
function objectLiteralKeys(source: string): (string | null)[] {
  const text = source.trim();
  if (!text.startsWith('{') || !text.endsWith('}')) return [null];

  const body = text.slice(1, -1);
  if (body.includes('...')) return [null];

  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const character of body) {
    if (character === '{' || character === '[' || character === '(') depth++;
    if (character === '}' || character === ']' || character === ')') depth--;
    if (character === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += character;
  }
  parts.push(current);

  const keys: (string | null)[] = [];
  for (const part of parts) {
    const key = part.split(':')[0]?.trim() ?? '';
    if (key === '') return [null];
    const resolved = resolveStringExpression(key);
    if (resolved !== null) {
      keys.push(resolved);
      continue;
    }
    // A bare identifier is the key of an object literal: `{alt: '…'}`.
    keys.push(/^[A-Za-z_$][\w$]*$/.test(key) ? key : null);
  }

  return keys.length > 0 ? keys : [null];
}

/** The object utilities that write to the element they receive as an argument. */
const OBJECT_UTILITY_METHODS = new Set(['assign', 'defineproperty', 'defineproperties']);

/** The global names the `Object` constructor is reached through. */
const OBJECT_SCOPE_NAMES = new Set(['window', 'globalthis', 'self']);

/** What an expression holds. */
type HeldValue =
  /** The `Object` constructor. */
  | { kind: 'constructor' }
  /** One of the object utilities, by its method name. */
  | { kind: 'utility'; method: string }
  /** An object literal, by the members it holds. */
  | { kind: 'literal'; members: Map<string, string> }
  /** The reflective namespace. */
  | { kind: 'reflect' }
  /** A property descriptor, by the name of the property it describes. */
  | { kind: 'descriptor'; name: string | null };

/** What a chain holds: the value, or why it cannot be read. */
type HeldResult = HeldValue | 'unreadable' | null;

/** One member of a chain the resolver reads. */
interface HeldMember {
  /** The member name; null when the analyser cannot read it. */
  name: string | null;
  /** The arguments of the call that follows the member. */
  args: string[] | null;
}

/** A chain the resolver reads: the expression it starts with and its members. */
interface HeldChain {
  /** The expression the chain starts with. */
  head: string;
  /** The members the chain reads. */
  members: HeldMember[];
}

/**
 * The index of the bracket that closes the one the text starts with.
 *
 * A bracket inside a string does not close the literal.
 */
function matchingBracket(text: string): number {
  const closing: Record<string, string> = { '{': '}', '[': ']', '(': ')' };
  const stack: string[] = [];
  let quote: string | null = null;

  for (let index = 0; index < text.length; index++) {
    const character = text[index] as string;
    if (quote !== null) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (closing[character] !== undefined) {
      stack.push(closing[character] as string);
      continue;
    }
    if (character === '}' || character === ']' || character === ')') {
      if (stack.pop() !== character) return -1;
      if (stack.length === 0) return index;
    }
  }
  return -1;
}

/**
 * The parts of a body, split at the commas that are not nested.
 *
 * A comma inside a string, an object, an array or a call does not separate
 * two parts.
 */
function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let current = '';
  for (let index = 0; index < body.length; index++) {
    const character = body[index] as string;
    if (quote !== null) {
      current += character;
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      current += character;
      continue;
    }
    if (character === '{' || character === '[' || character === '(') depth++;
    else if (character === '}' || character === ']' || character === ')') depth--;
    if (character === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += character;
  }
  parts.push(current);
  return parts;
}

/**
 * The members an object literal holds.
 *
 * A member the analyser cannot read — a spread, a computed key — makes the
 * literal unreadable: the analyser cannot tell what it holds.
 */
function objectLiteralMembers(text: string): Map<string, string> | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) return null;
  const end = matchingBracket(trimmed);
  if (end === -1) return null;

  const members = new Map<string, string>();
  for (const part of splitTopLevel(trimmed.slice(1, end))) {
    if (part.trim() === '') continue;
    const entry = /^\s*(?:'([^']*)'|"([^"]*)"|([A-Za-z_$][\w$]*))\s*:\s*([\s\S]+)$/.exec(part);
    if (entry) {
      const key = entry[1] ?? entry[2] ?? entry[3] ?? '';
      members.set(key.toLowerCase(), (entry[4] ?? '').trim());
      continue;
    }
    // A shorthand member holds the variable of the same name.
    const shorthand = /^\s*([A-Za-z_$][\w$]*)\s*$/.exec(part);
    if (!shorthand) return null;
    members.set((shorthand[1] ?? '').toLowerCase(), shorthand[1] ?? '');
  }
  return members;
}

/**
 * The members a chain reads after its head.
 *
 * A member the analyser cannot read is null: the member may be the utility,
 * so the write fails closed. A text that is not a member chain is null.
 */
function chainMembers(text: string): HeldMember[] | null {
  const members: HeldMember[] = [];
  let index = 0;
  while (index < text.length) {
    const character = text[index] as string;
    if (/\s/.test(character)) {
      index++;
      continue;
    }
    if (character === '?') {
      index++;
      while (index < text.length && /\s/.test(text[index] as string)) index++;
      if (text[index] === '.') index++;
      continue;
    }
    if (character === '.') {
      index++;
      while (index < text.length && /\s/.test(text[index] as string)) index++;
      const member = /^[A-Za-z_$][\w$]*/.exec(text.slice(index));
      if (!member) return null;
      members.push({ name: member[0], args: null });
      index += member[0].length;
      continue;
    }
    if (character === '[') {
      const end = text.indexOf(']', index);
      if (end === -1) return null;
      members.push({ name: resolveMemberName(text.slice(index + 1, end).trim()), args: null });
      index = end + 1;
      continue;
    }
    if (character === '(') {
      // A call in the middle of a chain: `Object.assign.bind(Object)`.
      const call = callSpan(text, index + 1);
      if (!call) return null;
      const last = members[members.length - 1];
      if (last) last.args = call.args;
      index = call.end;
      continue;
    }
    // Anything else the resolver cannot read.
    return null;
  }
  return members;
}

/**
 * The expression a chain starts with, and the members that follow it.
 *
 * A chain starts with an identifier, an object literal or a parenthesised
 * object literal; every member after it is a property name.
 */
function heldChain(text: string): HeldChain | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // A parenthesised object literal: `({assign: Object.assign}).assign`.
  const parenthesised = /^\(\s*(\{[\s\S]*\})\s*\)/.exec(trimmed);
  if (parenthesised) {
    const members = chainMembers(trimmed.slice(parenthesised[0].length));
    return members ? { head: parenthesised[1] as string, members } : null;
  }

  // An object literal: `{assign: Object.assign}.assign`.
  if (trimmed.startsWith('{')) {
    const end = matchingBracket(trimmed);
    if (end === -1) return null;
    const members = chainMembers(trimmed.slice(end + 1));
    return members ? { head: trimmed.slice(0, end + 1), members } : null;
  }

  // An identifier, then the members it reads.
  const identifier = /^[A-Za-z_$][\w$]*/.exec(trimmed);
  if (!identifier) return null;
  const members = chainMembers(trimmed.slice(identifier[0].length));
  return members ? { head: identifier[0], members } : null;
}

/**
 * The values the repository's runtime holds.
 *
 * The object utilities are not reached through one spelling: the constructor
 * can be held by a variable, by a member of an object literal or by a
 * destructured name, and the utility itself can be held the same ways. The
 * resolver follows those holders, so the family does not depend on the
 * spelling of its receiver.
 */
class HeldValues {
  /** The expression every variable holds. */
  private readonly expressions = new Map<string, string>();

  /** The members every variable is given, by the member name. */
  private readonly members = new Map<string, Map<string, string>>();

  constructor(content: string) {
    for (const match of content.matchAll(VARIABLE_ASSIGNMENT_PATTERN)) {
      const name = match[1] ?? '';
      const expression = (match[2] ?? '').trim();
      if (!name || !expression) continue;
      this.expressions.set(name, expression);
    }
    for (const match of content.matchAll(DESTRUCTURING_PATTERN)) {
      const source = (match[2] ?? '').trim();
      if (!source) continue;
      for (const raw of (match[1] ?? '').split(',')) {
        const parts = raw.split(':');
        const property = (parts[0] ?? '').split('=')[0]?.trim() ?? '';
        const name = (parts[1] ?? parts[0] ?? '').split('=')[0]?.trim() ?? '';
        if (!/^[A-Za-z_$][\w$]*$/.test(property)) continue;
        if (!/^[A-Za-z_$][\w$]*$/.test(name)) continue;
        this.expressions.set(name, `${source}.${property}`);
      }
    }
    // A member assigned on a variable: `namespace.assign = Object.assign`.
    for (const match of content.matchAll(MEMBER_ASSIGNMENT_PATTERN)) {
      const name = match[1] ?? '';
      const member = match[2] ?? '';
      const expression = (match[3] ?? '').trim();
      if (!name || !member || !expression) continue;
      const members = this.members.get(name) ?? new Map<string, string>();
      members.set(member.toLowerCase(), expression);
      this.members.set(name, members);
    }
  }

  /** What a chain holds. */
  hold(text: string, depth = 0): HeldResult {
    const chain = heldChain(text);
    if (!chain) return null;
    return this.holdChain(chain, depth);
  }

  /** What a chain holds, when the chain is already split. */
  holdChain(chain: HeldChain, depth = 0): HeldResult {
    if (depth > 4) return null;

    const head = this.holdHead(chain.head, depth);
    if (head === null || head === 'unreadable') return head;

    let value: HeldValue = head;
    for (const member of chain.members) {
      const next = this.holdMember(value, member, depth);
      if (next === null || next === 'unreadable') return next;
      value = next;
    }
    return value;
  }

  /** What a member of a chain holds. */
  private holdMember(value: HeldValue, member: HeldMember, depth: number): HeldResult {
    const name = member.name?.toLowerCase() ?? null;

    if (value.kind === 'constructor') {
      // The constructor's members are the utilities.
      if (name === null) return 'unreadable';
      if (name === 'getownpropertydescriptor' && member.args !== null) {
        return this.descriptor(member.args);
      }
      if (!OBJECT_UTILITY_METHODS.has(name)) return null;
      return { kind: 'utility', method: name };
    }

    if (value.kind === 'reflect') {
      // `Reflect.get(Object, 'assign')` reads the utility the constructor
      // holds.
      if (name !== 'get' || member.args === null) return null;
      return this.reflected(member.args);
    }

    if (value.kind === 'descriptor') {
      // The value of a descriptor is the property it describes.
      if (name !== 'value') return null;
      if (value.name === null) return 'unreadable';
      if (!OBJECT_UTILITY_METHODS.has(value.name)) return null;
      return { kind: 'utility', method: value.name };
    }

    if (value.kind === 'literal') {
      // A member of an object literal holds what the literal gave it.
      if (name === null) return null;
      const held = value.members.get(name);
      if (held === undefined) return null;
      return this.hold(held, depth + 1);
    }

    // A bound utility holds the utility itself.
    if (name === 'bind') return value;
    return null;
  }

  /** The descriptor a `getOwnPropertyDescriptor` call reads. */
  private descriptor(args: string[]): HeldResult {
    const target = args[0] ? this.hold(args[0].trim(), 1) : null;
    if (target === null) return null;
    if (target === 'unreadable') return 'unreadable';
    if (target.kind !== 'constructor') return null;
    const name = args[1] ? resolveStringExpression(args[1].trim()) : null;
    return { kind: 'descriptor', name };
  }

  /** The property a `Reflect.get` call reads. */
  private reflected(args: string[]): HeldResult {
    const target = args[0] ? this.hold(args[0].trim(), 1) : null;
    if (target === null) return null;
    if (target === 'unreadable') return 'unreadable';
    if (target.kind !== 'constructor') return null;
    const name = args[1] ? resolveStringExpression(args[1].trim()) : null;
    if (name === null) return 'unreadable';
    if (!OBJECT_UTILITY_METHODS.has(name)) return null;
    return { kind: 'utility', method: name };
  }

  /** What the head of a chain holds. */
  private holdHead(head: string, depth: number): HeldResult {
    const trimmed = head.trim();
    if (!trimmed) return null;

    // A variable holds the expression it was assigned.
    if (/^[A-Za-z_$][\w$]*$/.test(trimmed)) {
      const members = this.members.get(trimmed);
      const expression = this.expressions.get(trimmed);
      if (expression !== undefined) {
        const held = this.hold(expression, depth + 1);
        if (!members) return held;
        if (held === 'unreadable') return held;
        if (held === null) return { kind: 'literal', members: new Map(members) };
        if (held.kind !== 'literal') return held;
        const merged = new Map(held.members);
        for (const [member, value] of members) merged.set(member, value);
        return { kind: 'literal', members: merged };
      }
      if (members) return { kind: 'literal', members: new Map(members) };
      if (trimmed.toLowerCase() === 'object') return { kind: 'constructor' };
      if (trimmed.toLowerCase() === 'reflect') return { kind: 'reflect' };
      // The global object holds the constructor: `window.Object`.
      if (OBJECT_SCOPE_NAMES.has(trimmed.toLowerCase())) {
        return { kind: 'literal', members: new Map([['object', 'Object']]) };
      }
      return null;
    }

    // An object literal holds its members.
    const members = objectLiteralMembers(trimmed);
    if (members) return { kind: 'literal', members };

    return null;
  }
}

/**
 * The arguments an `.apply` call passes, or null when the list cannot be read.
 *
 * `fn.apply(target, [a, b])` calls `fn` with the arguments the array holds; a
 * list that is not an array literal is a list the analyser cannot read.
 */
function applyArguments(list: string | null): string[] | null {
  if (list === null) return null;
  const args = literalArguments(list);
  return args.length > 0 ? args : null;
}

/**
 * The object utility a callee chain calls, and the arguments it receives.
 *
 * The utility is `Object.assign`, `Object.defineProperty` or
 * `Object.defineProperties` — whatever the spelling of its receiver and
 * whatever the holder it reaches it through. A `.call` or an `.apply` passes
 * the utility its own argument list after the receiver argument, so the target
 * of the utility is the first argument of that list.
 */
function objectUtilityCall(
  text: string,
  args: string[] | null,
  utilities: HeldValues
): { method: string | null; args: string[] | null } | null {
  const chain = heldChain(text);
  if (!chain) return null;

  const last = chain.members[chain.members.length - 1]?.name?.toLowerCase() ?? null;
  if ((last === 'call' || last === 'apply') && chain.members.length >= 1) {
    const inner = utilities.holdChain({ head: chain.head, members: chain.members.slice(0, -1) });
    if (inner === null) return null;
    if (inner === 'unreadable') return { method: null, args: null };
    if (inner.kind !== 'utility') return null;
    if (args === null) return { method: inner.method, args: null };
    if (last === 'apply') {
      return {
        method: inner.method,
        args: applyArguments(args.length > 1 ? args[1] ?? null : null),
      };
    }
    return { method: inner.method, args: args.slice(1) };
  }

  const inner = utilities.holdChain(chain);
  if (inner === null) return null;
  if (inner === 'unreadable') return { method: null, args };
  if (inner.kind !== 'utility') return null;
  return { method: inner.method, args };
}

/**
 * The writes an object utility performs.
 *
 * The utility writes to the element it receives as its first argument, not to
 * its receiver. An argument list the analyser cannot read fails closed.
 */
function utilityWrites(
  utility: { method: string | null; args: string[] | null },
  bindings: ElementBindings
): ScriptWrite[] {
  if (utility.args === null) return [unresolvedAttributeWrite(unknownReach())];

  const target = utility.args[0] ?? null;
  if (target === null) return [];

  const reach = expressionReach(target, bindings);
  if (reach === null) return [];

  if (utility.method === null) {
    // The utility cannot be read: it may write the attribute the fix adds,
    // so it fails closed.
    return [unresolvedAttributeWrite(reach)];
  }
  if (!OBJECT_UTILITY_METHODS.has(utility.method)) return [];

  return attributeWrites(objectUtilityAttributes(utility.method, utility.args), reach);
}

/**
 * The attributes an object utility writes, and the ones it cannot name.
 *
 * `Object.assign` copies every source, `Object.defineProperty` names one
 * attribute and `Object.defineProperties` defines every key of the descriptor
 * literal. A name the analyser cannot read is null: the write may touch any
 * attribute.
 */
function objectUtilityAttributes(method: string, args: string[]): (string | null)[] {
  if (method === 'defineproperty') {
    return [args[1] ? resolveStringExpression(args[1].trim()) : null];
  }

  const sources = method === 'assign' ? args.slice(1) : [args[1] ?? ''];
  const names: (string | null)[] = [];
  for (const source of sources) {
    names.push(...objectLiteralKeys(source));
  }
  return names;
}

/**
 * The method a `.call` or an `.apply` chain calls.
 *
 * The method is the function the chain holds: `Element.prototype.setAttribute`
 * holds it in its last member, and
 * `Object.getOwnPropertyDescriptor(proto, 'removeAttribute').value` holds it in
 * the `value` of the descriptor the reader names. A chain the analyser cannot
 * resolve is null and the write fails closed.
 */
function calledMethod(receiver: ChainSegment[]): string | null {
  const last = receiver[receiver.length - 1] as ChainSegment;

  // A bound method holds the method it binds:
  // `element.removeAttribute.bind(element)` holds `removeAttribute`.
  if (last.name?.toLowerCase() === 'bind' && receiver.length >= 2) {
    return receiver[receiver.length - 2]?.name ?? null;
  }

  // A function held by a property: the descriptor of the method the reader
  // names.
  if (last.name?.toLowerCase() === 'value' && receiver.length >= 2) {
    const reader = receiver[receiver.length - 2] as ChainSegment;
    const owner = receiver.length >= 3 ? receiver[receiver.length - 3]?.name?.toLowerCase() ?? null : null;
    if (
      reader.name?.toLowerCase() === 'getownpropertydescriptor' &&
      (owner === 'object' || owner === 'reflect')
    ) {
      const name = reader.args && reader.args.length > 1 ? reader.args[1] ?? '' : '';
      return resolveStringExpression(name.trim());
    }
    return null;
  }

  return last.name;
}

/** The write of a method call. */
function methodWrite(
  method: string,
  receiver: ChainSegment[],
  reach: ElementReach | null,
  args: string[]
): ScriptWrite {
  const lower = method.toLowerCase();
  const attributeMethod = ATTRIBUTE_WRITING_METHODS.has(lower);
  const attribute = attributeMethod ? writtenAttributeName(method, args) : null;

  // A class list write names the classes it writes.
  const classes: (string | null)[] = [];
  let classMethod: string | null = null;
  if (receiver[receiver.length - 1]?.name?.toLowerCase() === 'classlist' && CLASS_LIST_METHODS.has(lower)) {
    classMethod = lower;
    const names = lower === 'toggle' || lower === 'replace' ? args.slice(0, 1) : args;
    for (const name of names) classes.push(resolveStringExpression(name.trim()));
  }

  return {
    property: method,
    attribute,
    attributeMethod,
    element: true,
    reach,
    destroys: DESTROYING_METHODS.has(lower),
    page: false,
    classes,
    classMethod,
  };
}

/** The write of a property assignment or a deletion. */
function chainWrite(chain: string, bindings: ElementBindings): ScriptWrite | null {
  const segments = parseChain(chain);
  // A variable is not an element: only a property of an element is.
  if (segments.length < 2) return null;

  const property = segments[segments.length - 1]?.name ?? null;
  const receiver = segments.slice(0, -1);
  const object = chainObject(receiver, bindings);
  if (object.kind !== 'element') return null;

  // `element.attributes.name.value = '…'` writes the attribute.
  let attribute = property === null ? null : attributeOfProperty(property);
  const attributeNode =
    receiver.length >= 2 && receiver[receiver.length - 2]?.name?.toLowerCase() === 'attributes';
  if (attributeNode) attribute = receiver[receiver.length - 1]?.name ?? null;

  // `element.dataset.name = '…'` writes the `data-name` attribute.
  if (
    receiver.length >= 1 &&
    receiver[receiver.length - 1]?.name?.toLowerCase() === 'dataset' &&
    property !== null
  ) {
    attribute = attributeOfDatasetKey(property);
  }

  return {
    property,
    attribute,
    attributeMethod: false,
    element: true,
    reach: object.reach,
    destroys: property !== null && DESTROYING_PROPERTIES.has(property.toLowerCase()),
    page: isPageChain(receiver),
    classes: [],
    classMethod: null,
  };
}

/**
 * The writes a script performs.
 *
 * The write side is general: a property assignment, an indexed assignment, a
 * deletion, a method call, a call of a bound alias, a reflective write and a
 * `.call` or `.apply` invocation. Only the reads are a list: a method that
 * only reads does not write, and every other method is treated as a write.
 */
function scriptWrites(content: string, bindings: ElementBindings): ScriptWrite[] {
  const writes: ScriptWrite[] = [];
  const utilities = new HeldValues(content);

  // A property assignment or a deletion.
  for (const match of content.matchAll(ASSIGNMENT_WRITE_PATTERN)) {
    if (isDeclaration(content, match.index)) continue;
    const write = chainWrite(match[1] ?? '', bindings);
    if (write) writes.push(write);
  }

  for (const match of content.matchAll(DELETE_WRITE_PATTERN)) {
    const write = chainWrite(match[1] ?? '', bindings);
    if (write) writes.push(write);
  }

  // A method call.
  for (const match of content.matchAll(METHOD_CALL_PATTERN)) {
    const args = readCallArguments(content, match.index + match[0].length) ?? [];

    // `Object.assign(element, source)`, `Object.defineProperty(element, name,
    // descriptor)` and `Object.defineProperties(element, descriptors)` write
    // to the element they receive as an argument, not to their receiver. The
    // target is the first argument of the utility, whatever the spelling of
    // its receiver and whatever the holder it reaches it through.
    const utility = objectUtilityCall(match[1] ?? '', args, utilities);
    if (utility) {
      writes.push(...utilityWrites(utility, bindings));
      continue;
    }

    const segments = parseChain(match[1] ?? '');
    if (segments.length === 0) continue;

    const method = segments[segments.length - 1] as ChainSegment;
    const receiver = segments.slice(0, -1);
    const methodName = method.name?.toLowerCase() ?? null;

    // A call of a bound alias: `set('class','overlay')`.
    if (segments.length === 1 && method.name && bindings.bound.has(method.name)) {
      const bound = bindings.bound.get(method.name);
      const reach = bindings.elements.get(method.name) ?? unknownReach();
      if (!bound?.method) {
        // The bound method cannot be read: it is a write the analyser cannot
        // follow, so it fails closed.
        writes.push(unresolvedAttributeWrite(reach));
        continue;
      }
      if (isPureReadMethod(bound.method)) continue;
      writes.push(methodWrite(bound.method, bound.receiver, reach, args));
      continue;
    }

    // A bound method called at once: `element.removeAttribute.bind(element)('alt')`.
    if (methodName === 'bind') {
      if (method.args === null) {
        // The binding itself writes nothing: the bound function is called
        // later, under the name it was given.
        continue;
      }
      const bound = segments[segments.length - 2] ?? null;
      const receiver = segments.slice(0, -2);
      const object = chainObject(receiver, bindings);
      if (object.kind !== 'element') continue;
      if (!bound?.name) {
        // The bound method cannot be read: it is a write the analyser cannot
        // follow, so it fails closed.
        writes.push(unresolvedAttributeWrite(object.reach));
        continue;
      }
      if (isPureReadMethod(bound.name)) continue;
      // The binding argument is the receiver the method is bound to.
      const boundTo = method.args?.[0] ?? null;
      const reach = boundTo ? expressionReach(boundTo, bindings) : null;
      writes.push(methodWrite(bound.name, receiver, reach ?? object.reach, args));
      continue;
    }

    // `Reflect.set(target, property, value)` and `Reflect.apply(fn, target, args)`.
    if (receiver.length === 1 && receiver[0]?.name?.toLowerCase() === 'reflect') {
      if (methodName !== 'set' && methodName !== 'apply') continue;

      if (methodName === 'apply') {
        // The applied function may be an object utility: the utility's own
        // argument list decides the target, not the receiver `Reflect.apply`
        // is given.
        const utility = objectUtilityCall(
          args[0]?.trim() ?? '',
          args[2] ? literalArguments(args[2]) : null,
          utilities
        );
        if (utility) {
          writes.push(...utilityWrites(utility, bindings));
          continue;
        }
      }

      const target = methodName === 'set' ? args[0] ?? '' : args[1] ?? '';
      const object = chainObject(parseChain(target), bindings);
      if (object.kind !== 'element') continue;

      if (methodName === 'set') {
        const property = args[1] ? resolveStringExpression(args[1].trim()) : null;
        writes.push({
          property,
          attribute: property === null ? null : attributeOfProperty(property),
          attributeMethod: property === null,
          element: true,
          reach: object.reach,
          destroys: false,
          page: false,
          classes: [],
          classMethod: null,
        });
        continue;
      }

      // `Reflect.apply(fn, target, args)` calls `fn` with the target as its
      // receiver: the method decides what the write touches.
      const applied = args[0] ? parseChain(args[0].trim()) : [];
      const appliedArguments = args[2] ? literalArguments(args[2]) : [];
      let appliedMethod = applied[applied.length - 1]?.name ?? null;
      let appliedReceiver = applied.slice(0, -1);

      // `fn.bind(element)` is a bound function: the method it binds decides
      // what the write touches.
      if (appliedMethod?.toLowerCase() === 'bind') {
        appliedMethod = appliedReceiver[appliedReceiver.length - 1]?.name ?? null;
        appliedReceiver = appliedReceiver.slice(0, -1);
      }

      if (applied.length < 2 || appliedMethod === null) {
        // The applied method cannot be read: the write may be the attribute the
        // fix adds, so it fails closed.
        writes.push(unresolvedAttributeWrite(object.reach));
        continue;
      }

      writes.push(
        methodWrite(appliedMethod, appliedReceiver, object.reach, appliedArguments)
      );
      continue;
    }

    // `fn.call(target, ...)` and `fn.apply(target, [...])` call `fn` with the
    // target as its receiver.
    if ((methodName === 'call' || methodName === 'apply') && receiver.length > 0) {
      // A bound method ignores the receiver the call gives it: the element it
      // is bound to is the one it writes.
      const bind = receiver[receiver.length - 1];
      const isBound = bind?.name?.toLowerCase() === 'bind';
      const boundTo = isBound ? bind?.args?.[0] ?? null : null;
      const object = chainObject(parseChain(boundTo ?? args[0] ?? ''), bindings);
      if (object.kind !== 'element') continue;

      // A bound alias: `f.apply(element, ['alt'])` calls the method it holds.
      const alias = receiver.length === 1 ? bindings.bound.get(receiver[0]?.name ?? '') : undefined;
      const called = alias ? alias.method : calledMethod(receiver);
      if (called === null) {
        // The called method cannot be read: it is a write the analyser cannot
        // follow, so it fails closed.
        writes.push(unresolvedAttributeWrite(object.reach));
        continue;
      }
      if (isPureReadMethod(called)) continue;
      const calledArgs =
        methodName === 'apply' ? literalArguments(args[1] ?? '') : args.slice(1);
      writes.push(
        methodWrite(called, alias ? alias.receiver : receiver, object.reach, calledArgs)
      );
      continue;
    }

    // `document.write(...)` and `document.open(...)` replace the page.
    if (
      receiver.length === 1 &&
      receiver[0]?.name?.toLowerCase() === 'document' &&
      (methodName === 'write' || methodName === 'writeln' || methodName === 'open')
    ) {
      writes.push({
        property: method.name,
        attribute: null,
        attributeMethod: false,
        element: false,
        reach: null,
        destroys: false,
        page: true,
        classes: [],
        classMethod: null,
      });
      continue;
    }

    // A computed method name may be a DOM mutation the analyser cannot
    // follow: it is a write when the receiver can be an element.
    if (method.name === null) {
      const object = chainObject(receiver, bindings);
      if (object.kind === 'element') writes.push(unresolvedWrite(object.reach));
      continue;
    }

    if (isPureReadMethod(method.name)) continue;

    const object = chainObject(receiver, bindings);
    if (object.kind !== 'element') continue;
    writes.push(methodWrite(method.name, receiver, object.reach, args));
  }

  // A call whose callee is an object literal:
  // `({assign: Object.assign}).assign(element, source)`.
  for (const match of content.matchAll(LITERAL_CALL_PATTERN)) {
    const args = readCallArguments(content, match.index + match[0].length) ?? [];
    const callee = `(${match[1] ?? ''}).${match[2] ?? ''}`;
    const utility = objectUtilityCall(callee, args, utilities);
    if (utility) {
      writes.push(...utilityWrites(utility, bindings));
    }
  }

  // A tagged-template invocation is a call: `img.removeAttribute`alt`` calls
  // the method with the template strings as its first argument.
  for (const match of content.matchAll(TAGGED_TEMPLATE_CALL_PATTERN)) {
    const segments = parseChain(match[1] ?? '');
    if (segments.length === 0) continue;
    const method = segments[segments.length - 1] as ChainSegment;
    const receiver = segments.slice(0, -1);
    const object = chainObject(receiver, bindings);
    if (object.kind !== 'element') continue;
    if (method.name === null) {
      // The called method cannot be read: it is a write the analyser cannot
      // follow, so it fails closed.
      writes.push(unresolvedAttributeWrite(object.reach));
      continue;
    }
    if (isPureReadMethod(method.name)) continue;
    writes.push(methodWrite(method.name, receiver, object.reach, [`\`${match[2] ?? ''}\``]));
  }

  return writes;
}

/** A script and the writes it performs. */
interface RuntimeScript {
  content: string;
  writes: ScriptWrite[];
}

/**
 * True when a script observes attribute changes.
 *
 * A mutation observer that watches attributes reacts to every attribute the
 * fix adds, so the script that owns it reacts to the fix. An observer that
 * watches the child list alone does not.
 */
function scriptObservesAttributes(content: string): boolean {
  if (!/MutationObserver\s*\(/.test(content)) return false;

  const observe = /\.observe\s*\(/.exec(content);
  if (!observe) return true;
  const args = readCallArguments(content, observe.index + observe[0].length);
  if (args === null || args.length < 2) return true;

  const options = (args[1] ?? '').trim();
  if (!options.startsWith('{')) return true;
  if (/attributes\s*:\s*true/.test(options)) return true;
  if (/\battributes\b\s*:/.test(options)) return false;
  return false;
}

/**
 * True when a script reads the state of the page generically.
 *
 * A generic read reacts to every attribute the fix adds: the analyser cannot
 * tell which one the runtime waits for.
 */
function scriptReadsGenericState(content: string): boolean {
  return (
    RUNTIME_GENERIC_STATE_READ_PATTERN.test(content) ||
    scriptReadsDynamicAttribute(content) ||
    scriptReadsDynamicProperty(content) ||
    scriptReadsDynamicSelector(content) ||
    scriptObservesAttributes(content)
  );
}

/**
 * True when a script reads one of the attributes the fix adds.
 *
 * The read may be a DOM call (`img.getAttribute('alt')`), a property
 * (`img.alt`), a reflected read (`Reflect.get(img,'alt')`), a dataset key or
 * a selector that names the attribute.
 */
function scriptReadsFixAttribute(content: string, names: Set<string>): boolean {
  const wanted = new Set([...names].map(name => name.toLowerCase()));

  for (const read of attributeReadCalls(content)) {
    if (read.name !== null && wanted.has(read.name.toLowerCase())) return true;
  }

  return (
    scriptReadsAttributeProperty(content, names) || scriptSelectorNamesAttribute(content, names)
  );
}

/**
 * True when the runtime reacts to the fix.
 *
 * A script that reads the attribute the fix adds (or reads the state of the
 * page generically) and then writes to the page reacts to the fix: what it
 * does is invisible to the isolated verification browser.
 */
function scriptReactsToFix(script: RuntimeScript, readsFixState: boolean): boolean {
  if (!readsFixState) return false;
  return script.writes.some(write => write.element || write.page);
}

/** True when a reach may include an element. */
function reachMayInclude(
  reach: ElementReach | null,
  element: { tag: string; id: string | null; classes: Set<string> }
): boolean {
  if (!reach || reach.any) return true;
  if (reach.ids.size > 0 && !(element.id !== null && reach.ids.has(element.id))) return false;
  if (
    reach.classes.size > 0 &&
    ![...reach.classes].some(name => element.classes.has(name))
  ) {
    return false;
  }
  if (reach.tags.size > 0 && !reach.tags.has(element.tag.toLowerCase())) return false;
  return true;
}

/**
 * True when a reach may include the patched element or one of its containers.
 *
 * A write that removes a container of the patched element removes the fix
 * with it, so the reach is compared with the whole chain that contains the
 * element. A chain the analyser cannot read fails closed: the reach may name
 * a container the scan did not establish.
 */
function reachMayReachElement(
  reach: ElementReach | null,
  patched: { tag: string; id: string | null; classes: Set<string> },
  containers: ElementContext[] | null
): boolean {
  if (reachMayInclude(reach, patched)) return true;
  if (containers === null) return true;
  return containers.some(container =>
    reachMayInclude(reach, {
      tag: container.tag,
      id: container.id,
      classes: new Set(container.classes),
    })
  );
}

/**
 * True when the runtime neutralises or destroys the fix.
 *
 * The neutralisation is decided by name: a write of the attribute or of the
 * class the fix adds removes it, whatever the spelling of the write is. The
 * destruction is decided by reach: a write that removes the patched element,
 * one of its containers or that replaces the page removes the fix with it.
 */
function scriptNeutralisesFix(
  script: RuntimeScript,
  added: Set<string>,
  addedClasses: Set<string>,
  patched: { tag: string; id: string | null; classes: Set<string> },
  containers: ElementContext[] | null
): boolean {
  const addedNames = new Set([...added].map(name => name.toLowerCase()));

  for (const write of script.writes) {
    // The page itself is replaced: the fix does not survive.
    if (write.page) return true;

    if (!write.element) continue;

    // The patched element or one of its containers is removed: the fix does
    // not survive.
    if (write.destroys && reachMayReachElement(write.reach, patched, containers)) return true;

    if (addedNames.size === 0 && addedClasses.size === 0) continue;

    // The attribute the fix adds is written or removed.
    if (write.attributeMethod) {
      // A name the analyser cannot read may be the attribute the fix adds.
      if (write.attribute === null) return true;
      if (addedNames.has(write.attribute.toLowerCase())) return true;
      continue;
    }
    if (write.attribute !== null && addedNames.has(write.attribute.toLowerCase())) return true;

    // A class the fix adds is removed.
    if (addedClasses.size > 0) {
      if (write.property !== null && write.property.toLowerCase() === 'classname') return true;
      for (const name of write.classes) {
        if (name === null) {
          // A class name the analyser cannot read may be the class the fix
          // adds. `add` cannot remove it.
          if (write.classMethod !== 'add') return true;
          continue;
        }
        if (addedClasses.has(name)) return true;
      }
    }
  }

  return false;
}

/** Service workers can deliver stylesheet bytes after the static scan. */
const SERVICE_WORKER_PATTERN =
  /navigator\s*\.\s*serviceWorker\s*\.\s*register\s*\(|serviceWorker\s*\.\s*addEventListener\s*\(|self\s*\.\s*addEventListener\s*\(\s*['"`](?:fetch|install)\b|caches\s*\.\s*open\s*\(|self\s*\.\s*skipWaiting\b|self\s*\.\s*clients\s*\.\s*claim\b/i;

/** CSS-in-JS builds selectors and declarations that no static reader can see. */
const CSS_IN_JS_PATTERN =
  /(?:from\s*|require\s*\(\s*|import\s*(?:\(\s*)?)['"`](?:styled-components(?:\/[^'"`]*)?|emotion(?:\/[^'"`]*)?)['"`]|['"`]@emotion\/|\bcreateGlobalStyle\b|\bmakeStyles\b|\bstyled\s*\.\s*[A-Za-z_$][\w$]*\s*(?:`|\()|\bstyled\s*\(\s*`/i;

/** The ids a `getElementById` call names, and the ones it cannot resolve. */
function elementIdReads(content: string): (string | null)[] {
  const reads: (string | null)[] = [];

  for (const match of content.matchAll(/\bgetElementById\s*\(/g)) {
    const args = readCallArguments(content, match.index + match[0].length);
    const argument = args && args.length > 0 ? args[0] : null;
    reads.push(argument === null ? null : resolveStringExpression(argument.trim()));
  }

  return reads;
}

/** The selectors a selection call names, and the ones it cannot resolve. */
function selectionSelectorReads(content: string): (string | null)[] {
  const reads: (string | null)[] = [];

  for (const match of content.matchAll(/\b(?:querySelector|querySelectorAll)\s*\(/g)) {
    const args = readCallArguments(content, match.index + match[0].length);
    const argument = args && args.length > 0 ? args[0] : null;
    reads.push(argument === null ? null : resolveStringExpression(argument.trim()));
  }

  return reads;
}

/** The tags a tag collection call names, and the ones it cannot resolve. */
function tagNameReads(content: string): (string | null)[] {
  const reads: (string | null)[] = [];

  for (const match of content.matchAll(/\bgetElementsByTagName\s*\(/g)) {
    const args = readCallArguments(content, match.index + match[0].length);
    const argument = args && args.length > 0 ? args[0] : null;
    reads.push(argument === null ? null : resolveStringExpression(argument.trim()));
  }

  return reads;
}

/**
 * True when a script names an element by its id.
 *
 * The id argument and the selector are resolved before the comparison: a
 * script that builds the id at runtime names the element too. An expression
 * the analyser cannot resolve fails closed when the id is one the fix
 * introduced — the script may name that element.
 */
function scriptRefersToElementId(content: string, id: string, failClosed = false): boolean {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const quote = "['\"`]";
  if (
    new RegExp(
      `#${escapedId}(?![\\w-])|\\bgetElementById\\s*\\(\\s*${quote}${escapedId}${quote}|\\bquerySelector(?:All)?\\s*\\(\\s*${quote}#${escapedId}${quote}`
    ).test(content)
  ) {
    return true;
  }

  const selectorPattern = new RegExp(`#${escapedId}(?![\\w-])`);

  for (const read of elementIdReads(content)) {
    if (read === null) {
      if (failClosed) return true;
      continue;
    }
    if (read === id) return true;
  }

  for (const read of selectionSelectorReads(content)) {
    if (read === null) {
      if (failClosed) return true;
      continue;
    }
    if (selectorPattern.test(read)) return true;
  }

  return false;
}

/** Assignments to the `href` property of an element. */
const HREF_PROPERTY_ASSIGNMENT_PATTERN =
  /([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*(?:\s*\([^()\n]*\))?(?:\s*\[\s*[^\]\n]*\s*\])?)\s*(?:\.\s*href\b|\[\s*['"`]href['"`]\s*\])\s*(?:\*\*=|<<=|>>=|\|\|=|&&=|\?\?=|\+=|-=|\*=|\/=|%=|=(?![=>]))/gi;

/** Calls that set an attribute by name. */
const SET_ATTRIBUTE_PATTERN =
  /([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*(?:\s*\([^()\n]*\))?(?:\s*\[\s*[^\]\n]*\s*\])?)\s*\.\s*setAttribute\s*\(/gi;

/** Calls that set an attribute by name and namespace. */
const SET_ATTRIBUTE_NS_PATTERN =
  /([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*(?:\s*\([^()\n]*\))?(?:\s*\[\s*[^\]\n]*\s*\])?)\s*\.\s*setAttributeNS\s*\(/gi;

/**
 * Assignments to the `value` property of an attribute node.
 *
 * `element.attributes.href.value = '/sub/'` writes the `href` attribute of the
 * element exactly like `element.setAttribute('href','/sub/')` does.
 */
const ATTRIBUTE_VALUE_ASSIGNMENT_PATTERN =
  /([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*(?:\s*\([^()\n]*\))?(?:\s*\[\s*[^\]\n]*\s*\])?)\s*\.\s*attributes\s*(?:\.\s*([A-Za-z_$][\w$]*)|\[\s*([^\]\n]*)\s*\])\s*\.\s*value\b\s*(?:\*\*=|<<=|>>=|\|\|=|&&=|\?\?=|\+=|-=|\*=|\/=|%=|=(?![=>]))/gi;

/**
 * The collection an indexed receiver reads from, and the index it reads.
 *
 * `document.querySelectorAll('base')[0]` reads the first base element of the
 * collection, so the collection decides which element the receiver is.
 */
function indexedReceiver(receiver: string): { collection: string; index: string } | null {
  const match = /^(.*?)\s*\[\s*([^\]]*)\s*\]$/.exec(receiver.trim());
  if (!match) return null;
  return { collection: (match[1] ?? '').trim(), index: (match[2] ?? '').trim() };
}

/** True when a selector can name a base element. */
function selectorNamesBase(selector: string, baseIds: Set<string>): boolean {
  const normalized = selector.trim();
  if (/(?:^|[\s>+~])base(?:$|[#.\[])/i.test(normalized)) return true;

  for (const id of baseIds) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`#${escaped}(?![\\w-])`).test(normalized)) return true;
    if (new RegExp(`\\[\\s*id\\s*=\\s*['\"]?${escaped}(?:['\"]|\\s|\\])`, 'i').test(normalized)) {
      return true;
    }
  }

  return false;
}

/** True when an expression resolves to a base element. */
function expressionNamesBase(
  expression: string,
  baseIds: Set<string>,
  baseVariables: Set<string>
): boolean {
  const normalized = expression.trim();
  if (baseVariables.has(normalized)) return true;

  // A base the runtime creates is a base element too.
  if (/\bcreateElement\s*\(\s*['"`]base['"`]\s*\)/i.test(normalized)) return true;

  const elementId = /\bgetElementById\s*\(\s*(['"`])(.*?)\1\s*\)/.exec(normalized);
  if (elementId) return baseIds.has(elementId[2] ?? '');

  const selector = /\bquerySelector(?:All)?\s*\(\s*(['"`])(.*?)\1\s*\)/.exec(normalized);
  if (selector) return selectorNamesBase(selector[2] ?? '', baseIds);

  const tagName = /\bgetElementsByTagName\s*\(\s*(['"`])(.*?)\1\s*\)/.exec(normalized);
  return tagName?.[2]?.toLowerCase() === 'base';
}

/** True when an expression resolves to an element that is not the base. */
function expressionNamesOtherElement(
  expression: string,
  baseIds: Set<string>,
  baseVariables: Set<string>,
  otherVariables: Set<string>
): boolean {
  const normalized = expression.trim();
  if (baseVariables.has(normalized)) return false;
  if (otherVariables.has(normalized)) return true;

  const elementId = /\bgetElementById\s*\(\s*(['"`])(.*?)\1\s*\)/.exec(normalized);
  if (elementId) return !baseIds.has(elementId[2] ?? '');

  const tagName = /\bgetElementsByTagName\s*\(\s*(['"`])(.*?)\1\s*\)/.exec(normalized);
  if (tagName) return tagName[2]?.toLowerCase() !== 'base';

  const selector = /\bquerySelector(?:All)?\s*\(\s*(['"`])(.*?)\1\s*\)/.exec(normalized);
  if (selector) {
    const value = selector[2] ?? '';
    if (selectorNamesBase(value, baseIds)) return false;
    const explicitId = /#([A-Za-z_][\w-]*)/.exec(value);
    if (explicitId) return !baseIds.has(explicitId[1] ?? '');
    const explicitTag = /^[A-Za-z][\w-]*/.exec(value);
    if (explicitTag) return explicitTag[0].toLowerCase() !== 'base';
  }

  return false;
}

/** The variables that hold the base element and those that hold another element. */
function elementVariables(
  content: string,
  baseIds: Set<string>
): { base: Set<string>; other: Set<string> } {
  const variables = { base: new Set<string>(), other: new Set<string>() };
  const assignments = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\n]+)/g;

  // An alias of a base variable is a base variable too.
  for (let depth = 0; depth < 3; depth++) {
    let changed = false;
    for (const match of content.matchAll(assignments)) {
      const name = match[1] ?? '';
      const expression = match[2] ?? '';
      if (variables.base.has(name) || variables.other.has(name)) continue;
      if (expressionNamesBase(expression, baseIds, variables.base)) {
        variables.base.add(name);
        changed = true;
      } else if (
        expressionNamesOtherElement(expression, baseIds, variables.base, variables.other)
      ) {
        variables.other.add(name);
        changed = true;
      }
    }
    if (!changed) break;
  }

  return variables;
}

/** True when a mutation receiver may be the document's base element. */
function receiverMayBeBase(
  receiver: string,
  baseIds: Set<string>,
  variables: { base: Set<string>; other: Set<string> },
  runtimeBase: boolean
): boolean {
  const normalized = receiver.trim();

  // An indexed receiver reads an element of a collection: the collection
  // decides which element it is, and the analyser cannot know that the index
  // picks the base element.
  const indexed = indexedReceiver(normalized);
  if (indexed) {
    return receiverMayBeBase(indexed.collection, baseIds, variables, runtimeBase);
  }

  if (variables.base.has(normalized)) return true;
  if (variables.other.has(normalized)) return false;
  if (/^(?:window|document)\.location$/i.test(normalized)) return false;

  const elementId = /\bgetElementById\s*\(\s*(['"`])(.*?)\1\s*\)/.exec(normalized);
  if (elementId) return baseIds.has(elementId[2] ?? '');

  const selector = /\bquerySelector(?:All)?\s*\(\s*(['"`])(.*?)\1\s*\)/.exec(normalized);
  if (selector) {
    if (selectorNamesBase(selector[2] ?? '', baseIds)) return true;
    return !expressionNamesOtherElement(normalized, baseIds, variables.base, variables.other);
  }

  const tagName = /\bgetElementsByTagName\s*\(\s*(['"`])(.*?)\1\s*\)/.exec(normalized);
  if (tagName) return tagName[2]?.toLowerCase() === 'base';

  // An unresolved receiver may still hold the base element — but only when the
  // document has a base the analyser cannot name. A base the runtime creates is
  // known: the variable that holds it.
  return !runtimeBase;
}

/**
 * True when a script creates a base element at runtime.
 *
 * A document without a `<base>` element can still get one: the runtime creates
 * it and assigns its `href`, and the browser loads its stylesheet from there.
 */
function scriptCreatesBase(content: string): boolean {
  return /\bcreateElement\s*\(\s*['"`]base['"`]\s*\)/i.test(content);
}

/**
 * True when runtime code can change the href of the document's base element.
 *
 * Every statically resolvable way of writing the attribute counts: the `href`
 * property, `setAttribute('href', …)`, `setAttributeNS(…, 'href', …)` and the
 * `value` of an attribute node. A base the runtime creates is a base element
 * too, so the variable that holds it is read as the base.
 */
function scriptMutatesBaseHref(
  scripts: string[],
  baseIds: Set<string>,
  runtimeBase: boolean
): boolean {
  const content = scripts.join('\n');
  const variables = elementVariables(content, baseIds);

  for (const match of content.matchAll(HREF_PROPERTY_ASSIGNMENT_PATTERN)) {
    if (receiverMayBeBase(match[1] ?? '', baseIds, variables, runtimeBase)) return true;
  }

  for (const match of content.matchAll(SET_ATTRIBUTE_PATTERN)) {
    const args = readCallArguments(content, match.index + match[0].length);
    const name = writtenAttributeName('setAttribute', args);
    if (name !== null && name.toLowerCase() !== 'href') continue;
    if (receiverMayBeBase(match[1] ?? '', baseIds, variables, runtimeBase)) return true;
  }

  for (const match of content.matchAll(SET_ATTRIBUTE_NS_PATTERN)) {
    const args = readCallArguments(content, match.index + match[0].length);
    // The namespace is the first argument; the attribute name is the second.
    const name = writtenAttributeName('setAttributeNS', args);
    if (name !== null && name.toLowerCase() !== 'href') continue;
    if (receiverMayBeBase(match[1] ?? '', baseIds, variables, runtimeBase)) return true;
  }

  for (const match of content.matchAll(ATTRIBUTE_VALUE_ASSIGNMENT_PATTERN)) {
    const attribute = match[2] ?? match[3] ?? null;
    const name = attribute === null ? null : resolveStringExpression(attribute.trim());
    if (name !== null && name.toLowerCase() !== 'href') continue;
    if (receiverMayBeBase(match[1] ?? '', baseIds, variables, runtimeBase)) return true;
  }

  return false;
}

/** True when a selector read names one of the attributes. */
function scriptSelectorNamesAttribute(content: string, names: Set<string>): boolean {
  const wanted = new Set([...names].map(name => name.toLowerCase()));

  for (const read of selectorNameReads(content)) {
    if (read.name === null) continue;
    if (selectorAttributes(read.name).names.some(name => wanted.has(name))) return true;
  }

  return false;
}

/**
 * True when a script names one of the attributes the fix adds.
 *
 * A script that reads an attribute the fix adds and then mutates an element
 * reacts to the fix: the mutation it performs is invisible to the isolated
 * verification browser. A name the script builds at runtime counts as well:
 * `'a' + 'lt'` is the name of the attribute the fix adds.
 */
function scriptNamesAttribute(content: string, names: Set<string>): boolean {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(content)) return true;
  }

  const wanted = new Set([...names].map(name => name.toLowerCase()));
  for (const read of attributeNameReads(content)) {
    if (read.name !== null && wanted.has(read.name.toLowerCase())) return true;
  }

  return scriptSelectorNamesAttribute(content, names);
}

/**
 * True when a script reads one of the attributes by its DOM API.
 *
 * The crude word search of `scriptNamesAttribute()` is not used for the
 * attributes an added element carries: a name like `for` is a word in almost
 * every script, and the word says nothing about the attribute.
 */
function scriptReadsIntroducedAttribute(content: string, names: Set<string>): boolean {
  const wanted = new Set([...names].map(name => name.toLowerCase()));

  for (const read of attributeNameReads(content)) {
    if (read.name !== null && wanted.has(read.name.toLowerCase())) return true;
  }

  return scriptReadsAttributeProperty(content, names);
}

/** The DOM property names that reflect an attribute. */
function attributePropertyAliases(name: string): string[] {
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

  return aliases;
}

/** The attribute a dataset key reflects. */
function attributeOfDatasetKey(key: string): string {
  return `data-${key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`;
}

/** A member chain such as `img['dataset']['state']` or `img.dataset?.state`. */
const MEMBER_CHAIN_PATTERN = new RegExp(
  `[A-Za-z_$][\\w$]*(?:${MEMBER_ACCESS_SOURCE})+`,
  'g'
);

/**
 * The dataset keys a script reads, and the ones it cannot resolve.
 *
 * The chain is read as a chain: `dataset.state`, `dataset['state']`,
 * `dataset?.state`, `el['dataset']['state']` and `el['data'+'set']['state']`
 * all read the same `data-state` attribute. A key the analyser cannot resolve
 * is `null`, and the read fails closed.
 */
function datasetKeyReads(content: string): (string | null)[] {
  const keys: (string | null)[] = [];

  for (const match of content.matchAll(MEMBER_CHAIN_PATTERN)) {
    const members = calleeMembers(match[0]);
    for (let index = 0; index < members.length - 1; index++) {
      const member = members[index];
      if (member.name === null || member.name.toLowerCase() !== 'dataset') continue;
      const key = members[index + 1];
      keys.push(key?.name ?? null);
    }
  }

  return keys;
}

/**
 * True when a script reads a `data-*` attribute through the dataset.
 *
 * `dataset.state`, `dataset['state']`, `dataset?.state`,
 * `el['dataset']['state']` and `Reflect.get(el.dataset,'state')` all read the
 * `data-state` attribute.
 */
function scriptReadsDatasetAttribute(content: string, names: Set<string>): boolean {
  const wanted = new Set(
    [...names]
      .filter(name => name.toLowerCase().startsWith('data-'))
      .map(name => name.toLowerCase())
  );
  if (wanted.size === 0) return false;

  for (const key of datasetKeyReads(content)) {
    // A key the analyser cannot resolve may be the attribute the fix adds.
    if (key === null) return true;
    if (wanted.has(attributeOfDatasetKey(key).toLowerCase())) return true;
  }

  for (const read of reflectPropertyReads(content)) {
    const members = calleeMembers(read.receiver);
    const receiver = members[members.length - 1];
    if (!receiver || receiver.name === null || receiver.name.toLowerCase() !== 'dataset') continue;
    if (read.name === null) continue;
    if (wanted.has(attributeOfDatasetKey(read.name).toLowerCase())) return true;
  }

  return false;
}

/**
 * True when a script reads an attribute through the DOM property that
 * reflects it.
 */
function scriptReadsAttributeProperty(content: string, names: Set<string>): boolean {
  for (const name of names) {
    for (const alias of attributePropertyAliases(name)) {
      const [object, property] = alias.includes('.') ? alias.split('.', 2) : ['', alias];
      const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const expression = object
        ? `\\.\\s*${object}\\s*\\.\\s*${escapedProperty}\\b`
        : `\\.\\s*${escapedProperty}\\b`;
      if (new RegExp(expression, 'i').test(content)) return true;
    }
  }

  for (const read of propertyNameReads(content)) {
    if (read.name === null) continue;
    const propertyName = read.name;
    for (const name of names) {
      const aliases = attributePropertyAliases(name).filter(alias => !alias.includes('.'));
      if (aliases.some(alias => alias.toLowerCase() === propertyName.toLowerCase())) return true;
    }
  }

  for (const read of reflectPropertyReads(content)) {
    if (read.name === null) continue;
    const propertyName = read.name.toLowerCase();
    for (const name of names) {
      if (name.toLowerCase() === propertyName) return true;
      const aliases = attributePropertyAliases(name).filter(alias => !alias.includes('.'));
      if (aliases.some(alias => alias.toLowerCase() === propertyName)) return true;
    }
  }

  return scriptReadsDatasetAttribute(content, names);
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
function resolveRepositoryPath(basePath: string, reference: string, baseUrl?: URL): string | null {
  const href = reference.trim().split('#')[0]?.split('?')[0] ?? '';
  if (!href) return null;
  // A reference with a scheme or a protocol-relative URL is not in the tree.
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) return null;

  try {
    const base = baseUrl ?? new URL(basePath, URI_BASE);
    const resolved = new URL(href, base);
    if (resolved.origin !== REPOSITORY_ORIGIN) return null;
    return decodeURIComponent(resolved.pathname.replace(/^\/+/, '')) || null;
  } catch {
    return null;
  }
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
  const { locateElement, isPatchableFile, countElementOccurrences } =
    await import('@/lib/ast-patch');
  // The ancestor reader carries the TypeScript compiler, so it is loaded the
  // same way the element locator is: the compiler stays out of the hot path.
  const { elementAncestors } = await import('@/lib/element-ancestors');
  const { buildCssContext, destinationCssHarm, collectDocumentStyleSources, extractCssImports, stripCssLineComments, describeElements, introducedElements } =
    await import('@/lib/css-context');

  const candidates = violations.filter(v => v.remediationCode && v.elementHtml);
  // The source patch budget is ten; the rest stay review documents after the
  // same safety analysis every source candidate receives.
  const sourceCandidateIds = new Set(candidates.slice(0, 10).map(violation => violation.id));
  const pendingFixIds = new Set<string>();
  for (const violation of candidates) {
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
  const cssFiles = new Map<string, string>();
  const referencedCss = new Set<string>();
  const styleProblems: string[] = [];
  const documentBases = new Map<string, URL>();
  const documentBaseInfo = new Map<string, { ids: Set<string>; hasBase: boolean }>();
  const runtimeMutationScripts: string[] = [];
  const conditionalMutationScripts: string[] = [];
  const selectorMutationScripts: string[] = [];
  const genericStateReadMutationScripts: string[] = [];
  // The scripts that write to the page, by the spelling of the write. The
  // writer decides by reach and effect, not by a list of DOM methods.
  const runtimeWriteScripts: RuntimeScript[] = [];

  /**
   * The CSS a style source applies, with the imports before its own rules.
   *
   * A browser applies the sheet an `@import` rule names before the sheet that
   * imports it, so the imported CSS comes first.
   */
  const cssTextOf = (
    path: string,
    css: string,
    baseUrl: URL | undefined,
    seen: Set<string>
  ): string[] => {
    const texts: string[] = [];

    for (const imported of extractCssImports(css)) {
      const target = resolveRepositoryPath(path, imported, baseUrl);
      if (!target || !cssFiles.has(target)) {
        styleProblems.push(`the stylesheet ${path} imports ${imported}, which is not part of the repository`);
        continue;
      }
      referencedCss.add(target);
      if (seen.has(target)) continue;
      seen.add(target);
      texts.push(...cssTextOf(target, cssFiles.get(target) as string, undefined, seen));
    }

    texts.push(css);
    return texts;
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
    const bindings = elementBindings(content);
    const mutation = runtimeMutations(content, bindings);
    if (mutation.mutates) {
      // A script that mutates an element can take the patched element over
      // even without a state read, so the scripts are kept for the check
      // that decides whether the fix activates them.
      runtimeMutationScripts.push(content);
      if (RUNTIME_STATE_READ_PATTERN.test(content) || attributeReadCalls(content).length > 0) {
        conditionalMutationScripts.push(content);
      }
      if (selectorNameReads(content).length > 0) {
        selectorMutationScripts.push(content);
      }
      if (RUNTIME_GENERIC_STATE_READ_PATTERN.test(content)) {
        genericStateReadMutationScripts.push(content);
      }
      if (scriptReadsDynamicAttribute(content)) {
        // The script reads an attribute whose name it builds at runtime: the
        // read may be the attribute the fix adds.
        genericStateReadMutationScripts.push(content);
      }
      if (scriptReadsDynamicProperty(content) || scriptReadsDynamicSelector(content)) {
        // A computed property or selector may read the state the fix adds.
        genericStateReadMutationScripts.push(content);
      }
      if (mutation.dynamic) {
        // The script writes a name the analyser cannot read: the mutation may
        // write the attribute the fix adds, so the script fails closed like a
        // generic state read.
        genericStateReadMutationScripts.push(content);
      }
    }

    // The writes of the script, whatever their spelling: the writer decides
    // by reach and effect, so a write the analyser cannot follow fails closed.
    const writes = scriptWrites(content, bindings);
    if (writes.length > 0) {
      runtimeWriteScripts.push({ content, writes });
    }
  };

  // The stylesheet files of the repository. A stylesheet the browser never
  // applies is still read: the page that applies it may be one the analyser
  // cannot name.
  for (const [path, content] of contentCache) {
    if (!CSS_FILE_PATTERN.test(path)) continue;
    const preprocessor = PREPROCESSOR_FILE_PATTERN.test(path);
    if (preprocessor && PREPROCESSOR_SYNTAX.test(content)) {
      // The preprocessor resolves the syntax into CSS the analyser cannot
      // see, so the destination is unprovable.
      styleProblems.push(`the stylesheet ${path} uses syntax the analyser cannot resolve`);
    }
    cssFiles.set(path, preprocessor ? stripCssLineComments(content) : content);
  }

  for (const [path, content] of contentCache) {
    // A script file is runtime code, not a document: it carries no base.
    if (!SCRIPT_FILE_PATTERN.test(path)) {
      const extracted = extractEventHandlerAttributes(content);
      documentBaseInfo.set(path, {
        ids: new Set(extracted.baseIds),
        hasBase: extracted.hasBase,
      });
    }
    const base = resolveDocumentBase(path, SCRIPT_FILE_PATTERN.test(path) ? null : content);
    if (!base.url) {
      styleProblems.push(`the document base in ${path} ${base.problem ?? 'cannot be resolved'}`);
      continue;
    }
    documentBases.set(path, base.url);
  }

  // The script targets of the repository. A browser executes the response of a
  // `<script src>` by its MIME type, so the name of the file says nothing:
  // every target is runtime code and is inspected as such.
  const scriptTargets = new Set<string>();
  const documentScriptTargets = new Map<string, Set<string>>();
  for (const [path, content] of contentCache) {
    const base = documentBases.get(path);
    if (!base) continue;
    for (const source of extractScriptSources(content)) {
      const target = resolveRepositoryPath(path, source, base);
      if (!target || !contentCache.has(target)) {
        styleProblems.push(`the script ${source} is not part of the repository`);
        continue;
      }
      scriptTargets.add(target);
      const targets = documentScriptTargets.get(path) ?? new Set<string>();
      targets.add(target);
      documentScriptTargets.set(path, targets);
    }
  }

  // Runtime code can change the base after the static markup was read. The
  // effective base is then unknowable, so the destination is unprovable and the
  // document URL is not a safe fallback. A document without a `<base>` element
  // is inspected as well when the runtime creates one.
  for (const [path, content] of contentCache) {
    const info = documentBaseInfo.get(path);

    const inline = extractInlineScripts(content);
    const handlers = extractEventHandlerAttributes(content);
    const linked = [...(documentScriptTargets.get(path) ?? [])]
      .map(target => contentCache.get(target))
      .filter((script): script is string => script !== undefined);
    const runtime = [...inline.scripts, ...handlers.handlers, ...linked];

    const createsBase = runtime.some(script => scriptCreatesBase(script));
    if (!info?.hasBase && !createsBase) continue;
    // A base the runtime creates is known: only the variable that holds it is
    // the base, so an unresolved receiver is another element.
    const runtimeBase = !info?.hasBase && createsBase;

    if (scriptMutatesBaseHref(runtime, info?.ids ?? new Set(), runtimeBase)) {
      documentBases.delete(path);
      styleProblems.push(
        `the document base in ${path} is changed by repository runtime, which the analyser cannot resolve`
      );
    }
  }

  // The stylesheets of the repository, one cascade per document.
  //
  // A browser applies the `<style>` blocks and the `<link rel="stylesheet">`
  // elements of a document in the order the document applies them, and the
  // stylesheets of two documents never share one cascade. Every document
  // therefore gets its own cascade, in the order the document applies it.
  const documentTexts: string[] = [];

  for (const [path, content] of contentCache) {
    // Every `<style>` block is a style source of the file that holds it: its
    // imports are relative to that file.
    const texts: string[] = [];
    for (const source of collectDocumentStyleSources(content)) {
      if (source.unprovable !== null) {
        styleProblems.push(`the stylesheet link in ${path} is unprovable: ${source.unprovable}`);
        continue;
      }
      if (source.dynamic) {
        styleProblems.push(`the stylesheet ${path} uses a dynamic style source the analyser cannot resolve`);
        continue;
      }
      if (source.href !== null) {
        const base = documentBases.get(path);
        if (!base) continue;
        const target = resolveRepositoryPath(path, source.href, base);
        const linked = target === null ? undefined : contentCache.get(target);
        if (target === null || linked === undefined) {
          styleProblems.push(`the stylesheet ${source.href} is not part of the repository`);
          continue;
        }
        // A stylesheet the document links is one the browser applies, whatever
        // its name says.
        if (!cssFiles.has(target)) cssFiles.set(target, linked);
        referencedCss.add(target);
        texts.push(...cssTextOf(target, cssFiles.get(target) as string, undefined, new Set()));
        continue;
      }
      texts.push(
        ...cssTextOf(path, source.css ?? '', documentBases.get(path), new Set())
      );
    }
    documentTexts.push(texts.join('\n'));

    if (SCRIPT_FILE_PATTERN.test(path) || scriptTargets.has(path)) {
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

  // The stylesheets no document references: they belong to a page the analyser
  // cannot name, and their order among themselves is unknown, so each of them
  // is judged on its own. A stylesheet another stylesheet imports belongs to
  // the importer's cascade, so it is judged there and not on its own — the
  // name of a file may not decide the verdict.
  const orphans = [...cssFiles.keys()].filter(path => !referencedCss.has(path)).sort();
  const importedByOrphan = new Set<string>();
  for (const path of orphans) {
    for (const imported of extractCssImports(cssFiles.get(path) as string)) {
      const target = resolveRepositoryPath(path, imported, undefined);
      if (target && cssFiles.has(target)) importedByOrphan.add(target);
    }
  }
  const roots = orphans.filter(path => !importedByOrphan.has(path));
  const cssContexts: CssContext[] = documentTexts.map(text => buildCssContext(text));
  for (const path of roots.length > 0 ? roots : orphans) {
    cssContexts.push(
      buildCssContext(
        cssTextOf(path, cssFiles.get(path) as string, undefined, new Set()).join('\n')
      )
    );
  }

  // Selected fixes for the same element with different remediations cannot be
  // mapped to the occurrences of that element.
  const conflictingKeys = conflictingRemediationKeys(violations);

  /**
   * The elements that contain an element of the repository.
   *
   * A runtime that removes one of them removes the fix with it, so the chain
   * is read from the repository's own markup. Only a file that can hold markup
   * contributes a chain — a module or a stylesheet holds no element — and an
   * element the scan cannot place leaves the relation unprovable.
   */
  const containersOf = (elementHtml: string): ElementContext[] | null => {
    const containers = new Map<string, ElementContext>();
    let located = false;

    for (const file of textFiles) {
      if (!isPatchableFile(file.path)) continue;
      const content = contentCache.get(file.path);
      if (content === undefined) continue;
      const occurrences = countElementOccurrences(content, file.path, elementHtml);
      for (let occurrence = 0; occurrence < occurrences; occurrence++) {
        const chain = elementAncestors(content, file.path, elementHtml, occurrence);
        if (chain === null) continue;
        located = true;
        for (const container of chain) {
          containers.set(
            `${container.tag}|${container.id ?? ''}|${container.classes.join(' ')}`,
            container
          );
        }
      }
    }

    return located ? [...containers.values()] : null;
  };

  for (const violation of candidates) {
    if (!pendingFixIds.has(violation.id)) continue;

    // A script that names the patched element can take it over at runtime even
    // without a state read, so this destination cannot be proved safe.
    const originalElement = describeElements(violation.elementHtml ?? '')[0];
    const patchedElements = describeElements(violation.remediationCode ?? '');
    const patchedElement = patchedElements[0];
    // The element the remediation patches and the elements it introduces. The
    // patched element is paired with the original by its id, or by its kind
    // when the original carries no id.
    const pairing = introducedElements(violation.elementHtml ?? '', violation.remediationCode ?? '');
    if (originalElement && patchedElement) {
      if (
        originalElement.id &&
        runtimeMutationScripts.some(content => scriptRefersToElementId(content, originalElement.id as string))
      ) {
        pendingFixIds.delete(violation.id);
        refusedFixIds.add(violation.id);
        continue;
      }

      // The remediation may add elements of its own. A script that finds one
      // of them by its id, or reads one of its attributes, reaches it only
      // after the fix: what it does to the page is invisible to the isolated
      // verification browser.
      const introducedIds = new Set<string>();
      const introducedAttributes = new Set<string>();
      for (const element of patchedElements) {
        // A new id on the patched target is an introduced id too: the script
        // finds the element by that id only after the fix.
        if (element.id && element.id !== originalElement.id) introducedIds.add(element.id);
      }
      for (const element of pairing.introduced) {
        for (const name of element.attributes.keys()) {
          // The id is judged by the id check above, which needs the literal
          // id in a selector and not a property read.
          if (name !== 'id') introducedAttributes.add(name);
        }
      }

      if (
        introducedIds.size > 0 &&
        runtimeMutationScripts.some(content =>
          [...introducedIds].some(id => scriptRefersToElementId(content, id, true))
        )
      ) {
        pendingFixIds.delete(violation.id);
        refusedFixIds.add(violation.id);
        continue;
      }

      // A script that selects one of the elements the remediation introduced
      // reaches it only after the fix: a literal selector names an element by
      // its tag, its id, one of its classes or one of its attributes.
      if (
        pairing.introduced.length > 0 &&
        runtimeMutationScripts.some(content =>
          scriptSelectsIntroducedElement(content, pairing.introduced)
        )
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
      // The classes the fix adds: a write of the class list removes them.
      const addedClasses = new Set<string>();
      for (const name of patchedElement.classes) {
        if (!originalElement.classes.has(name)) addedClasses.add(name);
      }
      if (
        added.size > 0 &&
        (conditionalMutationScripts.some(content => scriptNamesAttribute(content, added)) ||
          selectorMutationScripts.some(content => scriptSelectorNamesAttribute(content, added)) ||
          runtimeMutationScripts.some(content => scriptReadsAttributeProperty(content, added)) ||
          genericStateReadMutationScripts.length > 0)
      ) {
        pendingFixIds.delete(violation.id);
        refusedFixIds.add(violation.id);
        continue;
      }

      // The runtime reacts to the fix: it reads the attribute the fix adds (or
      // the state of the page generically) and then writes to the page. The
      // write is judged by reach and effect, not by a list of DOM methods.
      if (
        added.size > 0 &&
        runtimeWriteScripts.some(script =>
          scriptReactsToFix(
            script,
            scriptReadsFixAttribute(script.content, added) ||
              scriptReadsGenericState(script.content)
          )
        )
      ) {
        pendingFixIds.delete(violation.id);
        refusedFixIds.add(violation.id);
        continue;
      }

      // The runtime neutralises the fix: it writes the attribute or the class
      // the fix adds, or it destroys the patched element, one of its
      // containers or the page.
      const destroys = runtimeWriteScripts.some(script =>
        script.writes.some(write => write.destroys)
      );
      const containers = destroys
        ? containersOf(violation.elementHtml ?? '')
        : [];
      if (
        runtimeWriteScripts.some(script =>
          scriptNeutralisesFix(script, added, addedClasses, patchedElement, containers)
        )
      ) {
        pendingFixIds.delete(violation.id);
        refusedFixIds.add(violation.id);
        continue;
      }

      if (
        introducedAttributes.size > 0 &&
        (runtimeMutationScripts.some(content =>
          scriptReadsIntroducedAttribute(content, introducedAttributes)
        ) ||
          runtimeMutationScripts.some(content =>
            scriptSelectorNamesAttribute(content, introducedAttributes)
          ) ||
          genericStateReadMutationScripts.length > 0 ||
          runtimeWriteScripts.some(script =>
            scriptReactsToFix(
              script,
              scriptReadsIntroducedAttribute(script.content, introducedAttributes) ||
                scriptReadsGenericState(script.content)
            )
          ))
      ) {
        pendingFixIds.delete(violation.id);
        refusedFixIds.add(violation.id);
        continue;
      }
    }

    // The repository's own stylesheet can restyle the patched element: the
    // isolated verification does not see it. A refused destination gets no
    // artifact at all. Every document has its own cascade, so a stylesheet
    // that another page applies cannot decide the verdict of this one.
    if (
      styleProblems.length > 0 ||
      cssContexts.some(context =>
        destinationCssHarm(context, violation.elementHtml, violation.remediationCode)
      )
    ) {
      pendingFixIds.delete(violation.id);
      refusedFixIds.add(violation.id);
      continue;
    }

    if (!sourceCandidateIds.has(violation.id)) {
      pendingFixIds.delete(violation.id);
      reviewFixIds.add(violation.id);
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
