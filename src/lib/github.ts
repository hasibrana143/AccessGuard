// GitHub integration for AccessGuard
import { Octokit } from '@octokit/rest';
import { decodeHtmlEntities, parseTagAttributes, URI_BASE } from '@/lib/html-attributes';

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

/** Reads of every attribute, which can react to any attribute the fix adds. */
const RUNTIME_GENERIC_STATE_READ_PATTERN =
  /\bgetAttributeNames\s*\(|\bhasAttributes\s*\(|\.\s*attributes\b(?!\s*\.\s*getNamedItem\s*\()/i;

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

/** The DOM methods that read an attribute by name. */
function isAttributeReadMethod(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower === 'hasattribute' ||
    lower === 'getattribute' ||
    lower === 'getattributenode' ||
    lower === 'toggleattribute' ||
    lower === 'getnameditem'
  );
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
      const resolved = resolveStringExpression(callee.slice(i + 1, end).trim());
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
      method = members[members.length - 2] as { name: string | null; computed: boolean };
      if (method.name === 'apply') {
        const list = args && args.length > 1 ? args[1] : null;
        const first = list === null ? null : /^\s*\[([^\]]*)\]/.exec(list)?.[1] ?? null;
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

    const argument = args && args.length > 0 ? args[0] : null;
    reads.push({ name: argument === null ? null : resolveStringExpression(argument.trim()) });
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
        return args;
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
function runtimeMutations(content: string): RuntimeMutation {
  let mutates = false;
  let dynamic = false;

  for (const match of content.matchAll(METHOD_CALL_PATTERN)) {
    const members = calleeMembers(match[1] ?? '');
    if (members.length === 0) continue;

    const method = members[members.length - 1] as { name: string | null; computed: boolean };
    const receiver = members.length >= 2 ? members[members.length - 2] : null;
    const args = readCallArguments(content, match.index + match[0].length);

    if (method.name === null) {
      // A computed method name may be a DOM mutation the analyser cannot
      // follow: the script fails closed when it reads state as well.
      mutates = true;
      dynamic = true;
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

    if (name === 'assign' && receiverName === 'object') {
      mutates = true;
      const source = args && args.length > 1 ? (args[1] ?? '').trim() : '';
      // The written names are the keys of the object: a literal without a
      // spread names them, anything else the analyser cannot read.
      if (!source.startsWith('{') || source.includes('...')) dynamic = true;
    }
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
  const { locateElement, isPatchableFile } = await import('@/lib/ast-patch');
  const { buildCssContext, destinationCssHarm, collectStyleSources, analyzeStylesheetLinks, extractCssImports, stripCssLineComments, describeElements, introducedElements } =
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
  const cssSources: Array<{ path: string; css: string; baseUrl?: URL }> = [];
  const cssPaths = new Set<string>();
  const styleProblems: string[] = [];
  const documentBases = new Map<string, URL>();
  const documentBaseInfo = new Map<string, { ids: Set<string>; hasBase: boolean }>();
  const runtimeMutationScripts: string[] = [];
  const conditionalMutationScripts: string[] = [];
  const selectorMutationScripts: string[] = [];
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
    const mutation = runtimeMutations(content);
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
  };

  for (const [path, content] of contentCache) {
    if (CSS_FILE_PATTERN.test(path)) addCssSource(path, content);
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

  for (const [path, content] of contentCache) {
    // Every `<style>` block is a style source of the file that holds it: its
    // imports are relative to that file.
    for (const source of collectStyleSources(content)) {
      if (source.dynamic) {
        styleProblems.push(`the stylesheet ${path} uses a dynamic style source the analyser cannot resolve`);
        continue;
      }
      cssSources.push({ path, css: source.css, baseUrl: documentBases.get(path) });
    }
    const stylesheetLinks = analyzeStylesheetLinks(content);
    for (const reason of stylesheetLinks.unprovable) {
      styleProblems.push(`the stylesheet link in ${path} is unprovable: ${reason}`);
    }
    for (const href of stylesheetLinks.links) {
      const base = documentBases.get(path);
      if (!base) continue;
      const target = resolveRepositoryPath(path, href, base);
      if (!target || !contentCache.has(target)) {
        styleProblems.push(`the stylesheet ${href} is not part of the repository`);
        continue;
      }
      addCssSource(target, contentCache.get(target) as string);
    }
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

  // The imports of a stylesheet are relative to the stylesheet itself.
  const pending = [...cssSources];
  while (pending.length > 0) {
    const source = pending.shift() as { path: string; css: string; baseUrl?: URL };
    for (const imported of extractCssImports(source.css)) {
      const target = resolveRepositoryPath(source.path, imported, source.baseUrl);
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

      if (
        introducedAttributes.size > 0 &&
        (runtimeMutationScripts.some(content =>
          scriptReadsIntroducedAttribute(content, introducedAttributes)
        ) ||
          runtimeMutationScripts.some(content =>
            scriptSelectorNamesAttribute(content, introducedAttributes)
          ) ||
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
