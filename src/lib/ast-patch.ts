// AST-aware location and replacement of accessibility violations in source files.
//
// The scanner reports DOM HTML (axe output), but a repository holds source code.
// For JSX/TSX the DOM HTML does not exist verbatim in the file, so the element is
// located through a real AST (TypeScript compiler API) and the patch is spliced at
// AST-derived offsets. For plain HTML the exact element text is located, occurrence
// aware, so the Nth reported occurrence patches the Nth copy in the file.

import ts from 'typescript';

export interface ElementSignature {
  tag: string;
  attrs: Record<string, string>;
}

export interface ElementLocation {
  start: number;
  end: number;
}

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
]);

// HTML attribute name -> JSX attribute name.
const JSX_ATTR_NAMES: Record<string, string> = {
  class: 'className',
  for: 'htmlFor',
  tabindex: 'tabIndex',
  readonly: 'readOnly',
  maxlength: 'maxLength',
  minlength: 'minLength',
  autofocus: 'autoFocus',
  autocomplete: 'autoComplete',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  srcset: 'srcSet',
  crossorigin: 'crossOrigin',
  usemap: 'useMap',
  contenteditable: 'contentEditable',
  spellcheck: 'spellCheck',
  datetime: 'dateTime',
  novalidate: 'noValidate',
  enctype: 'encType',
  acceptcharset: 'acceptCharset',
};

const BOOLEAN_ATTRS = new Set([
  'disabled', 'checked', 'readonly', 'required', 'hidden', 'async', 'defer',
  'multiple', 'selected', 'autofocus', 'novalidate', 'open', 'controls', 'loop',
  'muted', 'playsinline', 'default', 'ismap', 'itemscope', 'reversed',
]);

// Attributes that identify one element among several with the same tag.
const DISTINGUISHING_ATTRS = ['src', 'href', 'id', 'name', 'type', 'alt'];

// Attributes that must match when the candidate reports them: an element without
// them is a different element (two <img> with the same src but different ids).
const STRICT_IDENTITY_ATTRS = new Set(['src', 'href', 'id', 'name']);

const PLACEHOLDER_PATTERN =
  /\b(TODO|FIXME|XXX|PLACEHOLDER|LOREM IPSUM)\b|\bYOUR[_\s-]?(ALT|TEXT|LABEL|DESCRIPTION|NAME)|\bINSERT[_\s-]?(HERE|TEXT|ALT|LABEL)\b|<\s*insert|\{\{[^}]*\}\}/i;
function canonicalAttr(name: string): string {
  const n = name.toLowerCase();
  if (n === 'classname') return 'class';
  if (n === 'htmlfor') return 'for';
  return n;
}

function attrPattern(): RegExp {
  return /([a-zA-Z_:][a-zA-Z0-9_:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
}

/** Extract tag + attributes from the first element of an HTML snippet. */
export function parseElementSignature(html: string | null | undefined): ElementSignature | null {
  if (!html) return null;
  const match = html.match(/<([a-zA-Z][a-zA-Z0-9:._-]*)\b([^>]*)>/);
  if (!match) return null;

  const attrs: Record<string, string> = {};
  const re = attrPattern();
  let m: RegExpExecArray | null;
  while ((m = re.exec(match[2] ?? '')) !== null) {
    const name = canonicalAttr(m[1]);
    if (!(name in attrs)) attrs[name] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return { tag: match[1].toLowerCase(), attrs };
}

/** True when the file holds JSX (React) source that must be patched through the AST. */
export function isJsxLikeFile(filePath: string): boolean {
  return /\.(tsx|jsx|js)$/i.test(filePath);
}

function scriptKind(filePath: string): ts.ScriptKind {
  if (/\.tsx$/i.test(filePath)) return ts.ScriptKind.TSX;
  if (/\.(jsx|js)$/i.test(filePath)) return ts.ScriptKind.JSX;
  return ts.ScriptKind.TS;
}

/** Reject fixes that still contain an unfinished marker instead of real code. */
export function containsPlaceholder(code: string): boolean {
  return PLACEHOLDER_PATTERN.test(code);
}

interface JsxCandidate {
  tag: string;
  attrs: Record<string, string>;
  start: number;
  end: number;
}

function readJsxAttributes(
  node: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
  sf: ts.SourceFile
): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const prop of node.attributes.properties) {
    if (!ts.isJsxAttribute(prop)) continue;
    const name = canonicalAttr(prop.name.getText(sf));
    if (!prop.initializer) {
      attrs[name] = '';
      continue;
    }
    const init = prop.initializer;
    if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) {
      attrs[name] = init.text;
    } else if (ts.isJsxExpression(init)) {
      const expr = init.expression;
      if (expr && (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr))) {
        attrs[name] = expr.text;
      } else {
        attrs[name] = '';
      }
    }
  }
  return attrs;
}

function collectJsxCandidates(content: string, filePath: string): JsxCandidate[] {
  const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, scriptKind(filePath));
  const candidates: JsxCandidate[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isJsxElement(node)) {
      candidates.push({
        tag: node.openingElement.tagName.getText(sf).toLowerCase(),
        attrs: readJsxAttributes(node.openingElement, sf),
        start: node.getStart(sf),
        end: node.getEnd(),
      });
    } else if (ts.isJsxSelfClosingElement(node)) {
      candidates.push({
        tag: node.tagName.getText(sf).toLowerCase(),
        attrs: readJsxAttributes(node, sf),
        start: node.getStart(sf),
        end: node.getEnd(),
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  return candidates;
}

function candidateMatches(candidate: JsxCandidate, signature: ElementSignature): boolean {
  if (candidate.tag !== signature.tag) return false;

  // Every distinguishing attribute the report carries has to match. Comparing only
  // the first one patched the wrong copy when two elements shared it (same src,
  // different id).
  let compared = 0;
  for (const key of DISTINGUISHING_ATTRS) {
    const want = signature.attrs[key];
    if (want === undefined || want === '') continue;
    const have = candidate.attrs[key];
    if (have === undefined) {
      // A missing identity attribute means a different element; a missing type/alt
      // is common (the violation may be exactly that the alt is missing).
      if (STRICT_IDENTITY_ATTRS.has(key)) return false;
      continue;
    }
    if (have.trim() !== want.trim()) return false;
    compared++;
  }

  if (compared > 0) return true;

  const wantClass = signature.attrs['class'];
  if (wantClass) {
    const have = (candidate.attrs['class'] || '').split(/\s+/).filter(Boolean);
    const want = wantClass.split(/\s+/).filter(Boolean);
    if (want.length === 0) return true;
    return want.every(w => have.includes(w));
  }

  return true;
}

/**
 * Locate the `occurrence`-th matching element (0 based) in the file.
 * JSX/JS files are matched through the AST; other files match the element text.
 */
export function locateElement(
  content: string,
  filePath: string,
  elementHtml: string,
  occurrence: number
): ElementLocation | null {
  if (!elementHtml) return null;

  if (isJsxLikeFile(filePath)) {
    const signature = parseElementSignature(elementHtml);
    if (!signature) return null;
    const matches = collectJsxCandidates(content, filePath).filter(c =>
      candidateMatches(c, signature)
    );
    const match = matches[occurrence];
    return match ? { start: match.start, end: match.end } : null;
  }

  const trimmed = elementHtml.trim();
  const needle = content.includes(elementHtml)
    ? elementHtml
    : trimmed && content.includes(trimmed)
      ? trimmed
      : null;
  if (!needle) return null;

  let index = -1;
  let from = 0;
  for (let i = 0; i <= occurrence; i++) {
    index = content.indexOf(needle, from);
    if (index === -1) return null;
    from = index + needle.length;
  }
  return { start: index, end: index + needle.length };
}

// A style value is emitted into a JS expression, so it must not be able to close
// the expression context. Only plain CSS values are allowed.
const SAFE_CSS_PROP = /^[a-zA-Z][a-zA-Z0-9-]*$/;
const SAFE_CSS_VALUE = /^[a-zA-Z0-9\s#%.,()\/_-]*$/;

function styleToJsx(value: string): string {
  const declarations = value
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const idx = part.indexOf(':');
      if (idx === -1) return null;
      const prop = part
        .slice(0, idx)
        .trim()
        .replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      const val = part.slice(idx + 1).trim();
      if (!prop || !val) return null;
      // No braces, quotes or backslashes (they would escape the expression) and no
      // url()/expression() (they load remote content or execute in legacy engines).
      if (!SAFE_CSS_PROP.test(prop) || !SAFE_CSS_VALUE.test(val)) return null;
      if (/url\s*\(|expression\s*\(/i.test(val)) return null;
      return `${prop}: '${val.replace(/'/g, "\\'")}'`;
    })
    .filter((d): d is string => !!d);
  return `{{ ${declarations.join(', ')} }}`;
}

function transformAttributes(raw: string): string {
  const parts: string[] = [];
  const re = attrPattern();
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const rawName = m[1];
    const lower = rawName.toLowerCase();
    const name = JSX_ATTR_NAMES[lower] ?? rawName;
    const value = m[2] ?? m[3] ?? m[4];

    if (value === undefined) {
      if (BOOLEAN_ATTRS.has(lower)) parts.push(` ${name}`);
      continue;
    }
    if (lower === 'style') {
      parts.push(` style=${styleToJsx(value)}`);
      continue;
    }
    parts.push(` ${name}="${value.replace(/"/g, '"')}"`);
  }
  return parts.join('');
}

/** Convert an HTML remediation snippet into JSX source (attribute names, self closing). */
export function htmlToJsx(html: string): string {
  return html.replace(
    /<([a-zA-Z][a-zA-Z0-9:._-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)(\/?)>/g,
    (_match, tag: string, rawAttrs: string, selfClosing: string) => {
      const attrs = transformAttributes(rawAttrs);
      if (VOID_TAGS.has(tag.toLowerCase()) || selfClosing === '/') return `<${tag}${attrs} />`;
      return `<${tag}${attrs}>`;
    }
  );
}

/** The text that replaces the located element in the target file. */
export function buildReplacement(filePath: string, remediationCode: string): string {
  return isJsxLikeFile(filePath) ? htmlToJsx(remediationCode) : remediationCode;
}

/**
 * The visible text of an element snippet (tags stripped). Empty for void and
 * self-closing elements.
 */
export function elementTextContent(element: string): string {
  const open = element.match(/^<([a-zA-Z][a-zA-Z0-9:._-]*)\b([^>]*)>/);
  if (!open) return '';
  const tag = open[1].toLowerCase();
  if (VOID_TAGS.has(tag)) return '';
  if (/\/\s*$/.test(open[2] ?? '')) return '';
  const close = new RegExp(`</${tag}\\s*>`, 'i');
  const closeIndex = element.search(close);
  if (closeIndex === -1) return '';
  const inner = element.slice(open[0].length, closeIndex);
  return inner.replace(/<[^>]*>/g, '').replace(/\{[^{}]*\}/g, '').trim();
}

/**
 * A replacement may not delete the visible text of the element it replaces. An
 * axe-verified fix that empties a link or a button would pass the rule check while
 * removing what the user reads.
 */
export function preservesVisibleContent(original: string, replacement: string): boolean {
  const before = elementTextContent(original);
  if (!before) return true;
  return elementTextContent(replacement).length > 0;
}

/** True when the patched content no longer parses (TypeScript/JSX syntax errors). */
export function hasSyntaxErrors(content: string, filePath: string): boolean {
  if (!isJsxLikeFile(filePath)) return false;
  const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, scriptKind(filePath));
  const diagnostics = (sf as unknown as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics;
  return Array.isArray(diagnostics) && diagnostics.length > 0;
}
