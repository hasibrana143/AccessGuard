// The repository's own stylesheets can restyle the patched element.
//
// A fix is verified in isolation: the remediation snippet is rendered in a
// document that does not contain the repository's CSS. A rule the repository
// applies to the patched element is therefore invisible to the verification —
// adding an existing class verified cleanly and turned the patched element into
// a full-viewport overlay in the customer page.
//
// This module decides whether the repository's stylesheets can turn the patched
// element into an overlay or hide it. The decision is made on the repository's
// CSS, not on the isolated snippet.
//
// The judgement is deliberately conservative. A construct the analyser cannot
// decide (an escape it cannot decode, a nested rule it cannot flatten, a value
// that depends on a custom property) makes the destination **unprovable**, and
// an unprovable destination never receives a source patch. What can be decided
// is decided exactly: the cascade is not simulated, the values of the rules
// that apply are unioned, so the verdict does not depend on the order the
// stylesheets were read in.

import { decodeHtmlEntities, parseTagAttributes } from '@/lib/html-attributes';

/** A CSS rule: the selector and the declarations it applies. */
export interface CssRule {
  /** The selector list of the rule. */
  selector: string;
  /** The declaration block of the rule. */
  declarations: string;
}

/** The rules of a stylesheet and the reasons the stylesheet cannot be judged. */
export interface CssContext {
  rules: CssRule[];
  /**
   * Why the stylesheet could not be judged completely. A non-empty list means
   * the destination is unprovable: no source patch may be written into it.
   */
  unprovable: string[];
  /** The `@import` targets of the stylesheet. */
  imports: string[];
  /**
   * The frames of every animation of the stylesheet, by the name of the
   * animation. The frames matter only when an element animates with them.
   */
  keyframes: Map<string, string[]>;
}

/** The parts of an element a CSS selector can name. */
export interface ElementDescriptor {
  tag: string;
  classes: Set<string>;
  id: string | null;
  attributes: Map<string, string>;
}

/** A repository-owned style source and whether its CSS is dynamic. */
export interface StyleSource {
  css: string;
  dynamic: boolean;
}

/** The `<style>` sources of an HTML document. */
export function collectStyleSources(html: string): StyleSource[] {
  const sources: StyleSource[] = [];
  const pattern = /<style\b([^>]*)>([\s\S]*?)<\/style\s*>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const attributes = parseTagAttributes(match[1] ?? '');
    const css = match[2] ?? '';
    const dynamic =
      css.trim().startsWith('{') ||
      attributes.some(attribute => attribute.name === 'dangerouslysetinnerhtml');
    sources.push({ css, dynamic });
  }
  return sources;
}

/** The `<style>` blocks of an HTML document. */
export function extractStyleBlocks(html: string): string[] {
  return collectStyleSources(html).map(source => source.css);
}

/** The `href` of every `<link rel="stylesheet">` of a document. */
export function extractStylesheetLinks(html: string): string[] {
  const links: string[] = [];
  const pattern = /<link\b([^>]*)>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const attributes = parseTagAttributes(match[1] ?? '');
    const rel = (attributes.find(a => a.name === 'rel')?.value ?? '').toLowerCase();
    if (!rel.split(/\s+/).includes('stylesheet')) continue;
    const href = attributes.find(a => a.name === 'href')?.value;
    if (href) links.push(href.trim());
  }
  return links;
}

/** The targets of the `@import` rules of a stylesheet. */
export function extractCssImports(css: string): string[] {
  const imports: string[] = [];
  const source = stripCssComments(css);

  for (const block of parseBlocks(source)) {
    if (!/^@import\b/i.test(block.prelude)) continue;
    const target = /@import\s+(?:url\(\s*)?["']?([^"'\s;)]+)/i.exec(block.prelude)?.[1];
    if (target) imports.push(target);
  }

  return imports;
}

/**
 * Decode the CSS escapes of a value.
 *
 * A browser resolves `p\6fsition` to `position` and `fix\65 d` to `fixed`
 * before it reads a declaration. An escape that cannot be decoded becomes the
 * replacement character, which never matches a property or a value.
 */
export function decodeCssEscapes(value: string): string {
  return value.replace(
    /\\(?:([0-9a-fA-F]{1,6})(?:\r\n|[ \n\r\t\f])?|(\r\n|[\n\r\f])|(.))/g,
    (_match, hex: string | undefined, continuation: string | undefined, literal: string | undefined) => {
      if (hex !== undefined) {
        const code = Number.parseInt(hex, 16);
        if (!Number.isFinite(code) || code === 0 || code > 0x10ffff) return '\uFFFD';
        return String.fromCodePoint(code);
      }
      // A backslash before a newline is a line continuation: it joins two lines.
      if (continuation !== undefined) return '';
      return literal ?? '';
    }
  );
}

/**
 * Remove CSS comments.
 *
 * A comment is only a comment outside a string: `content:"/*"` is text, not the
 * start of a comment. A parser that strips it anyway reads a rule that the
 * browser does not.
 */
export function stripCssComments(css: string): string {
  let out = '';
  let i = 0;
  let quote: string | null = null;

  while (i < css.length) {
    const char = css[i] as string;

    if (quote) {
      out += char;
      if (char === '\\') {
        out += css[i + 1] ?? '';
        i += 2;
        continue;
      }
      if (char === quote) quote = null;
      i++;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      out += char;
      i++;
      continue;
    }

    if (char === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end === -1 ? css.length : end + 2;
      out += ' ';
      continue;
    }

    out += char;
    i++;
  }

  return out;
}

/** Remove the `//` comments of a preprocessor stylesheet (outside strings). */
export function stripCssLineComments(css: string): string {
  let out = '';
  let i = 0;
  let quote: string | null = null;

  while (i < css.length) {
    const char = css[i] as string;

    if (quote) {
      out += char;
      if (char === '\\') {
        out += css[i + 1] ?? '';
        i += 2;
        continue;
      }
      if (char === quote) quote = null;
      i++;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      out += char;
      i++;
      continue;
    }

    if (char === '/' && css[i + 1] === '/') {
      while (i < css.length && css[i] !== '\n') i++;
      continue;
    }

    out += char;
    i++;
  }

  return out;
}

/** Split a text at a separator that is not inside a string, a bracket or a parenthesis. */
function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quote: string | null = null;
  let depth = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i] as string;

    if (quote) {
      current += char;
      if (char === '\\') {
        current += text[i + 1] ?? '';
        i++;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }

    if (char === '(' || char === '[') depth++;
    else if (char === ')' || char === ']') depth = Math.max(0, depth - 1);

    if (char === separator && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  parts.push(current);
  return parts;
}

/** A block of a stylesheet: the text before its `{` and its body. */
interface CssBlock {
  prelude: string;
  body: string;
}

/** The blocks of a stylesheet, in source order. */
function parseBlocks(css: string): CssBlock[] {
  const blocks: CssBlock[] = [];
  let i = 0;
  let prelude = '';

  while (i < css.length) {
    const char = css[i] as string;

    if (char === '"' || char === "'") {
      const quote = char;
      let j = i + 1;
      while (j < css.length) {
        if (css[j] === '\\') {
          j += 2;
          continue;
        }
        if (css[j] === quote) break;
        j++;
      }
      prelude += css.slice(i, Math.min(j + 1, css.length));
      i = j + 1;
      continue;
    }

    if (char === '{') {
      const block = readBlockBody(css, i + 1);
      blocks.push({ prelude: prelude.trim(), body: block.body });
      prelude = '';
      i = block.end;
      continue;
    }

    if (char === ';' && prelude.trim().startsWith('@')) {
      // An at-rule without a body (`@import`, `@charset`).
      blocks.push({ prelude: prelude.trim(), body: '' });
      prelude = '';
      i++;
      continue;
    }

    prelude += char;
    i++;
  }

  return blocks;
}

/** The body of a block and the offset behind its closing brace. */
function readBlockBody(css: string, from: number): { body: string; end: number } {
  let depth = 0;
  let quote: string | null = null;

  for (let i = from; i < css.length; i++) {
    const char = css[i] as string;

    if (quote) {
      if (char === '\\') {
        i++;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === '{') depth++;
    else if (char === '}') {
      if (depth === 0) return { body: css.slice(from, i), end: i + 1 };
      depth--;
    }
  }

  return { body: css.slice(from), end: css.length };
}

/** The at-rules whose body holds rules that apply like the rules around them. */
const CONDITIONAL_AT_RULES = /^@(media|supports|layer|container|scope|document|starting-style)\b/i;

/** The at-rules that only define values and never select an element. */
const VALUE_AT_RULES = /^@(charset|namespace|font-face|page|counter-style|font-feature-values|property|font-palette-values|view-transition)\b/i;

/** The at-rules of a preprocessor: their content cannot be judged statically. */
const PREPROCESSOR_AT_RULES = /^@(mixin|include|extend|function|use|forward|each|for|while|if|else|debug|warn|error|return)\b/i;

/**
 * The rules of a stylesheet.
 *
 * A conditional group (`@media`, `@supports`) holds rules that apply like the
 * rules around it, so its content is read as well. A nested rule is flattened
 * the way CSS nesting defines it: `&` is the parent selector, a nested
 * selector without `&` is a descendant of the parent.
 */
export function collectCssRules(css: string): CssContext {
  const context: CssContext = { rules: [], unprovable: [], imports: [], keyframes: new Map() };
  collectInto(stripCssComments(css), null, context);
  return context;
}

function collectInto(css: string, parentSelector: string | null, context: CssContext): void {
  for (const block of parseBlocks(css)) {
    const prelude = block.prelude;

    if (!prelude) continue;

    if (prelude.startsWith('@')) {
      const name = prelude.split(/\s+/)[0] ?? '';

      if (/^@import\b/i.test(name)) {
        const target = /@import\s+(?:url\(\s*)?["']?([^"'\s;)]+)/i.exec(prelude)?.[1];
        if (target) context.imports.push(target);
        continue;
      }

      if (PREPROCESSOR_AT_RULES.test(name)) {
        context.unprovable.push(`the stylesheet uses the preprocessor at-rule ${name}`);
        continue;
      }

      if (VALUE_AT_RULES.test(name)) continue;

      if (/^@keyframes\b/i.test(name) || /^@-webkit-keyframes\b/i.test(name)) {
        // The frames of an animation only matter when an element animates with
        // them. They are collected under the name of the animation, so a
        // harmless fade does not block a fix while a frame that covers the
        // screen does.
        const animationName = /^@(?:-webkit-)?keyframes\s+([^\s{]+)/i.exec(prelude)?.[1];
        if (!animationName) {
          context.unprovable.push('the stylesheet defines an animation without a name');
          continue;
        }
        const frames: string[] = [];
        for (const frame of parseBlocks(block.body)) {
          frames.push(frame.body);
        }
        context.keyframes.set(animationName, [
          ...(context.keyframes.get(animationName) ?? []),
          ...frames,
        ]);
        continue;
      }

      if (CONDITIONAL_AT_RULES.test(name)) {
        collectInto(block.body, parentSelector, context);
        continue;
      }

      // An at-rule the analyser does not know: its content may hold rules that
      // apply to any element.
      context.unprovable.push(`the stylesheet uses the unknown at-rule ${name}`);
      continue;
    }

    const selector = parentSelector ? flattenSelector(parentSelector, prelude) : prelude;
    collectBody(selector, block.body, context);
  }
}

/** A rule nested inside the body of another rule (CSS nesting). */
interface NestedRule {
  prelude: string;
  body: string;
}

/**
 * The declarations and the nested rules of a rule body.
 *
 * The declarations that do not belong to a nested rule are the declarations of
 * the parent rule; the nested rules are rules of their own.
 */
function parseRuleBody(body: string): { declarations: string; nested: NestedRule[] } {
  const declarations: string[] = [];
  const nested: NestedRule[] = [];
  let i = 0;
  let pending = '';
  let quote: string | null = null;

  while (i < body.length) {
    const char = body[i] as string;

    if (quote) {
      pending += char;
      if (char === '\\') {
        pending += body[i + 1] ?? '';
        i += 2;
        continue;
      }
      if (char === quote) quote = null;
      i++;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      pending += char;
      i++;
      continue;
    }

    if (char === '{') {
      const block = readBlockBody(body, i + 1);
      nested.push({ prelude: pending.trim(), body: block.body });
      pending = '';
      i = block.end;
      continue;
    }

    pending += char;
    i++;
  }

  declarations.push(pending);
  return { declarations: declarations.join(' '), nested };
}

/** The rules of a rule body: its own declarations and its nested rules. */
function collectBody(selector: string, body: string, context: CssContext): void {
  const { declarations, nested } = parseRuleBody(body);

  if (declarations.trim()) {
    if (/:has\s*\(/i.test(decodeCssEscapes(selector))) {
      context.unprovable.push('the stylesheet uses a relational selector the analyser cannot resolve');
    }
    context.rules.push({ selector, declarations });
  }

  for (const child of nested) {
    const prelude = child.prelude;
    if (!prelude) continue;

    if (prelude.startsWith('@')) {
      const name = prelude.split(/\s+/)[0] ?? '';
      if (CONDITIONAL_AT_RULES.test(name)) {
        // The rules inside the conditional group apply like the rules around
        // it, and `&` still refers to the parent rule.
        collectInto(child.body, selector, context);
        continue;
      }
      context.unprovable.push(`the stylesheet uses the at-rule ${name} inside a rule`);
      continue;
    }

    collectBody(flattenSelector(selector, prelude), child.body, context);
  }
}

/** Flatten a nested selector: `&` is the parent selector. */
function flattenSelector(parent: string, child: string): string {
  if (child.includes('&')) return child.split('&').join(parent);
  return `${parent} ${child}`;
}

/** The rules of a stylesheet, ready to be matched against a patched element. */
export function buildCssContext(css: string): CssContext {
  return collectCssRules(css);
}

/** The elements of an HTML snippet. */
export function describeElements(html: string): ElementDescriptor[] {
  const elements: ElementDescriptor[] = [];
  const pattern = /<([a-zA-Z][^\s/>]*)((?:[^>"']|"[^"]*"|'[^']*')*)/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    const attributes = new Map<string, string>();
    const classes = new Set<string>();
    let id: string | null = null;

    for (const attribute of parseTagAttributes(match[2] ?? '')) {
      if (!attributes.has(attribute.name)) {
        attributes.set(attribute.name, decodeHtmlEntities(attribute.value));
      }
      if (attribute.name === 'class') {
        for (const token of decodeHtmlEntities(attribute.value).split(/\s+/)) {
          if (token) classes.add(token.toLowerCase());
        }
      }
      if (attribute.name === 'id') id = decodeHtmlEntities(attribute.value);
    }

    elements.push({
      tag: (match[1] ?? '').toLowerCase(),
      classes,
      id,
      attributes,
    });
  }

  return elements;
}

/** What a selector requires of the element it matches. */
interface SelectorRequirements {
  tag: string | null;
  classes: string[];
  id: string | null;
  attributes: Array<{ name: string; operator: string | null; value: string | null }>;
  /** The selector contains a pseudo-class or a pseudo-element. */
  conditional: boolean;
  /** The selector could not be read. */
  malformed: boolean;
}

/** The requirements of the subject compound of a selector. */
function parseSubject(selector: string): SelectorRequirements {
  const requirements: SelectorRequirements = {
    tag: null,
    classes: [],
    id: null,
    attributes: [],
    conditional: false,
    malformed: false,
  };

  let i = 0;
  let expectTag = true;

  while (i < selector.length) {
    const char = selector[i] as string;

    if (/\s/.test(char)) {
      i++;
      expectTag = false;
      continue;
    }

    if (char === '.') {
      const name = readIdentifier(selector, i + 1);
      if (!name) {
        requirements.malformed = true;
        return requirements;
      }
      requirements.classes.push(name.toLowerCase());
      i += 1 + name.length;
      expectTag = false;
      continue;
    }

    if (char === '#') {
      const name = readIdentifier(selector, i + 1);
      if (!name) {
        requirements.malformed = true;
        return requirements;
      }
      requirements.id = name;
      i += 1 + name.length;
      expectTag = false;
      continue;
    }

    if (char === '[') {
      const end = selector.indexOf(']', i);
      if (end === -1) {
        requirements.malformed = true;
        return requirements;
      }
      const body = selector.slice(i + 1, end);
      const parsed = /^\s*([^\s~^$*|=]+)\s*(?:([~^$*|]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\s\]]*)))?\s*([iIsS])?\s*$/.exec(
        body
      );
      if (!parsed) {
        requirements.malformed = true;
        return requirements;
      }
      const value = parsed[3] ?? parsed[4] ?? parsed[5] ?? null;
      requirements.attributes.push({
        name: (parsed[1] ?? '').toLowerCase(),
        operator: parsed[2] ?? null,
        value: value === null ? null : decodeCssEscapes(decodeHtmlEntities(value)),
      });
      if (parsed[6]) requirements.conditional = true;
      i = end + 1;
      expectTag = false;
      continue;
    }

    if (char === ':') {
      // A pseudo-class or a pseudo-element: the rule may or may not apply.
      requirements.conditional = true;
      i += selector[i + 1] === ':' ? 2 : 1;
      const name = readIdentifier(selector, i);
      i += name.length;
      if (selector[i] === '(') {
        const end = skipParentheses(selector, i);
        if (end === -1) {
          requirements.malformed = true;
          return requirements;
        }
        i = end;
      }
      expectTag = false;
      continue;
    }

    if (expectTag && char === '*') {
      requirements.tag = '*';
      i++;
      expectTag = false;
      continue;
    }

    if (expectTag && /[a-zA-Z]/.test(char)) {
      const name = readIdentifier(selector, i);
      if (!name) {
        requirements.malformed = true;
        return requirements;
      }
      requirements.tag = name.toLowerCase();
      i += name.length;
      expectTag = false;
      continue;
    }

    // Anything else (a combinator, a stray character) cannot be read.
    requirements.malformed = true;
    return requirements;
  }

  return requirements;
}

/** A CSS identifier (a name, an escape or a character). */
function readIdentifier(source: string, from: number): string {
  let out = '';
  let i = from;

  while (i < source.length) {
    const char = source[i] as string;
    if (char === '\\') {
      const match = /^\\(?:[0-9a-fA-F]{1,6}(?:\r\n|[ \n\r\t\f])?|.)/.exec(source.slice(i));
      if (!match) break;
      out += decodeCssEscapes(match[0]);
      i += match[0].length;
      continue;
    }
    if (!/[a-zA-Z0-9_-]/.test(char)) break;
    out += char;
    i++;
  }

  return out;
}

/** The offset behind the parenthesis that closes the one at `from`. */
function skipParentheses(source: string, from: number): number {
  let depth = 0;
  for (let i = from; i < source.length; i++) {
    if (source[i] === '(') depth++;
    else if (source[i] === ')') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/** The compounds of a selector, split at the combinators that are outside brackets. */
function splitCompounds(selector: string): string[] {
  const compounds: string[] = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < selector.length; i++) {
    const char = selector[i] as string;

    if (char === '"' || char === "'") {
      const quote = char;
      let j = i + 1;
      while (j < selector.length && selector[j] !== quote) j++;
      current += selector.slice(i, Math.min(j + 1, selector.length));
      i = j;
      continue;
    }

    if (char === '(' || char === '[') depth++;
    else if (char === ')' || char === ']') depth = Math.max(0, depth - 1);

    if (depth === 0 && (char === '>' || char === '+' || char === '~' || /\s/.test(char))) {
      if (current.trim()) compounds.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) compounds.push(current.trim());

  return compounds;
}

/** How a selector matches an element. */
type Match = 'yes' | 'no' | 'maybe';

/** True when the attribute value satisfies the selector's operator. */
function attributeMatches(
  elementValue: string,
  operator: string | null,
  selectorValue: string | null
): Match {
  if (operator === null || selectorValue === null) return 'yes';

  const exact = elementValue === selectorValue;
  const loose = elementValue.toLowerCase() === selectorValue.toLowerCase();

  switch (operator) {
    case '=':
      if (exact) return 'yes';
      return loose ? 'maybe' : 'no';
    case '^=':
      if (elementValue.startsWith(selectorValue)) return 'yes';
      return elementValue.toLowerCase().startsWith(selectorValue.toLowerCase()) ? 'maybe' : 'no';
    case '$=':
      if (elementValue.endsWith(selectorValue)) return 'yes';
      return elementValue.toLowerCase().endsWith(selectorValue.toLowerCase()) ? 'maybe' : 'no';
    case '*=':
      if (elementValue.includes(selectorValue)) return 'yes';
      return elementValue.toLowerCase().includes(selectorValue.toLowerCase()) ? 'maybe' : 'no';
    case '~=':
      if (elementValue.split(/\s+/).includes(selectorValue)) return 'yes';
      return elementValue.toLowerCase().split(/\s+/).includes(selectorValue.toLowerCase())
        ? 'maybe'
        : 'no';
    case '|=':
      if (elementValue === selectorValue || elementValue.startsWith(`${selectorValue}-`)) return 'yes';
      const lower = elementValue.toLowerCase();
      const wanted = selectorValue.toLowerCase();
      return lower === wanted || lower.startsWith(`${wanted}-`) ? 'maybe' : 'no';
    default:
      return 'maybe';
  }
}

/** How the subject compound of a selector matches an element. */
function matchSubject(requirements: SelectorRequirements, element: ElementDescriptor): Match {
  if (requirements.malformed) return 'maybe';

  if (requirements.tag && requirements.tag !== '*' && requirements.tag !== element.tag) return 'no';

  for (const className of requirements.classes) {
    if (!element.classes.has(className)) return 'no';
  }

  if (requirements.id !== null && element.id !== requirements.id) return 'no';

  let maybe = requirements.conditional;

  for (const requirement of requirements.attributes) {
    const value = element.attributes.get(requirement.name);
    if (value === undefined) return 'no';
    const result = attributeMatches(value, requirement.operator, requirement.value);
    if (result === 'no') return 'no';
    if (result === 'maybe') maybe = true;
  }

  return maybe ? 'maybe' : 'yes';
}

/** How a selector list matches an element. */
function matchSelector(selector: string, element: ElementDescriptor): Match {
  let maybe = false;

  for (const part of splitTopLevel(selector, ',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Only the subject compound decides: an ancestor may or may not match, so
    // a rule with an ancestor is judged by its subject alone.
    const compounds = splitCompounds(trimmed);
    const subject = compounds[compounds.length - 1] ?? trimmed;
    const result = matchSubject(parseSubject(subject), element);

    if (result === 'yes') return 'yes';
    if (result === 'maybe') maybe = true;
  }

  return maybe ? 'maybe' : 'no';
}

/** A declaration of a rule. */
interface Declaration {
  property: string;
  value: string;
}

/** The declarations of a rule. */
function parseDeclarations(body: string): Declaration[] {
  const declarations: Declaration[] = [];

  for (const part of splitTopLevel(body, ';')) {
    const separator = part.indexOf(':');
    if (separator === -1) continue;
    const property = decodeCssEscapes(part.slice(0, separator).trim()).toLowerCase();
    const value = stripCssPriority(
      decodeCssEscapes(part.slice(separator + 1).trim()).toLowerCase()
    );
    if (!property) continue;
    declarations.push({ property, value });
  }

  return declarations;
}

/** Remove the CSS priority suffix, which is not part of the declaration value. */
function stripCssPriority(value: string): string {
  return value.replace(/\s*!\s*important\s*$/i, '').trim();
}

/**
 * The properties that decide whether an element covers the viewport or is not
 * rendered. A value of one of them that the analyser cannot compute makes the
 * destination unprovable when the fix changes it.
 */
const RELEVANT_PROPERTIES = new Set([
  'position', 'inset', 'inset-block', 'inset-inline', 'top', 'right', 'bottom', 'left',
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'display', 'visibility', 'opacity', 'transform', 'scale', 'rotate', 'translate',
  'zoom', 'perspective', 'margin', 'padding', 'overflow', 'clip', 'clip-path',
  'content', 'font-size', 'line-height', 'text-indent', 'letter-spacing',
  'white-space', 'word-break', 'vertical-align', 'color', '-webkit-text-fill-color',
  'background', 'background-color', 'background-position', 'background-size',
  'float', 'clear', 'flex', 'flex-basis', 'order', 'aspect-ratio', 'contain',
  'isolation', 'mix-blend-mode', 'filter', 'backdrop-filter', 'mask', '-webkit-mask',
  'content-visibility',
  'z-index', 'animation', 'animation-name', 'box-sizing', 'gap', 'grid-area',
  'grid-template', 'grid-template-columns', 'grid-template-rows', 'columns', 'column-count',
]);

/** The values that make an element span the viewport horizontally. */
const COVERS_X = /^(100%|100(vw|vi|dvw|dvi|svw|svi|lvw|lvi))$/;

/** The values that make an element span the viewport vertically. */
const COVERS_Y = /^(100%|100(vh|vb|dvh|dvb|svh|svb|lvh|lvb))$/;

/** The viewport units whose axis depends on the viewport shape. */
const COVERS_EITHER_AXIS = /^(100(vmin|vmax|dvmin|dvmax|svmin|svmax|lvmin|lvmax))$/;

/** The values that position an element out of the normal flow. */
const POSITIONED = /^(fixed|absolute|sticky)$/;

/** The values that remove an element from the rendering. */
const HIDDEN_DISPLAY = /^none$/;
const HIDDEN_VISIBILITY = /^(hidden|collapse)$/;

/** The properties whose values decide whether the patched element is visible. */
const JUDGEMENT_PROPERTIES = new Set([
  'position', 'inset', 'inset-block', 'inset-inline', 'top', 'right', 'bottom', 'left',
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'display', 'visibility', 'opacity', 'transform', 'scale', 'translate', 'filter',
  'content-visibility', 'font-size', 'line-height', 'text-indent',
]);

/** The CSS length units the analyser can recognise. */
const LENGTH_UNITS = new Set([
  'px', 'cm', 'mm', 'q', 'in', 'pt', 'pc', 'em', 'rem', 'ex', 'rex', 'ch', 'rch',
  'cap', 'rcap', 'ic', 'ric', 'lh', 'rlh', 'vw', 'vh', 'vmin', 'vmax', 'vi', 'vb',
  'svw', 'svh', 'svmin', 'svmax', 'svi', 'svb', 'lvw', 'lvh', 'lvmin', 'lvmax',
  'lvi', 'lvb', 'dvw', 'dvh', 'dvmin', 'dvmax', 'dvi', 'dvb',
]);

/** The keywords of `position`. */
const POSITION_VALUES = new Set(['static', 'relative', 'absolute', 'fixed', 'sticky']);

/** The keywords of `visibility`. */
const VISIBILITY_VALUES = new Set(['visible', 'hidden', 'collapse']);

/** The keywords of `content-visibility`. */
const CONTENT_VISIBILITY_VALUES = new Set(['visible', 'auto', 'hidden']);

/** The components of the `display` property. */
const DISPLAY_VALUES = new Set([
  'block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid',
  'flow', 'inline-flow', 'flow-root', 'inline-flow-root', 'table', 'inline-table',
  'table-row-group', 'table-header-group', 'table-footer-group', 'table-row',
  'table-cell', 'table-column-group', 'table-column', 'table-caption', 'none',
  'contents', 'ruby', 'ruby-base', 'ruby-text', 'ruby-base-container',
  'ruby-text-container', 'list-item', 'inline-list-item',
]);

/** The absolute and relative keywords of `font-size`. */
const FONT_SIZE_VALUES = new Set([
  'xx-small', 'x-small', 'small', 'medium', 'large', 'x-large', 'xx-large',
  'xxx-large', 'smaller', 'larger',
]);

/** The tags whose text can be hidden by text-only CSS. */
const TEXT_BEARING_TAGS = new Set([
  'a', 'button', 'p', 'span', 'div', 'li', 'label', 'h1', 'h2', 'h3', 'h4', 'h5',
  'h6', 'td', 'th', 'strong', 'em', 'small', 'code', 'summary', 'legend', 'option',
  'textarea',
]);

/** The replaced and media tags whose own content is not hidden by text CSS. */
const REPLACED_TAGS = new Set([
  'img', 'svg', 'video', 'audio', 'canvas', 'iframe', 'input', 'embed', 'object',
  'track', 'source', 'picture',
]);

/**
 * The properties a keyframe may use to cover the screen.
 *
 * Only the geometry of a frame can turn the element into an overlay: a frame
 * that fades the element in and out is ordinary, and the browser shows the
 * element between the frames.
 */
const GEOMETRY_PROPERTIES = new Set([
  'position', 'inset', 'inset-block', 'inset-inline', 'top', 'right', 'bottom', 'left',
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
]);

/** The keywords of the `animation` shorthand that are not the name. */
const ANIMATION_KEYWORDS = new Set([
  'infinite', 'alternate', 'alternate-reverse', 'reverse', 'both', 'forwards', 'backwards',
  'normal', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', 'step-start', 'step-end',
  'running', 'paused',
]);

/** The name of the animation of a declaration value. */
function animationNameOf(value: string): string | null {
  for (const token of value.split(/\s+/).filter(Boolean)) {
    const lower = token.toLowerCase();
    if (lower === 'none') return null;
    // A time, a number or a keyword is not the name of the animation.
    if (/^[\d.]+m?s$/.test(lower) || /^[\d.]+$/.test(lower)) continue;
    if (ANIMATION_KEYWORDS.has(lower)) continue;
    return lower;
  }
  return null;
}

/** The animations that may run on an element. */
function animationNamesOf(state: ElementState): string[] {
  const names = new Set<string>();
  const values = [
    ...(state.values.get('animation') ?? []),
    ...(state.values.get('animation-name') ?? []),
  ];

  for (const value of values) {
    for (const part of splitTopLevel(value, ',')) {
      const name = animationNameOf(part);
      if (name) names.add(name);
    }
  }

  return [...names];
}

/** True when a value is a length or percentage the analyser can recognise. */
function isLengthOrPercentage(value: string): boolean {
  if (value === '0') return true;
  if (/^-?(?:\d+|\d*\.\d+)%$/.test(value)) return true;
  const match = /^(-?(?:\d+|\d*\.\d+))([a-z]+)$/.exec(value);
  return match !== null && LENGTH_UNITS.has(match[2] ?? '');
}

/** True when a value is a number the analyser can recognise. */
function isNumber(value: string): boolean {
  return /^(?:\d+|\d*\.\d+)$/.test(value);
}

/** True when a value is a non-negative number or percentage. */
function isNonNegativeNumberOrPercentage(value: string): boolean {
  if (isNumber(value)) return Number(value) >= 0;
  const match = /^(\d+(?:\.\d+)?|\.\d+)%$/.exec(value);
  return match !== null && Number(match[1]) >= 0;
}

/** True when a sizing value is one the analyser can recognise. */
function isSizingValue(value: string, property: string): boolean {
  if (value === 'auto' && property !== 'max-width' && property !== 'max-height') return true;
  if (value === 'none' && (property === 'max-width' || property === 'max-height')) return true;
  if (['min-content', 'max-content', 'fit-content', 'stretch'].includes(value)) return true;
  return isLengthOrPercentage(value);
}

/** True when a scale value is one the analyser can read. */
function isScaleValue(value: string): boolean {
  if (value === 'none') return true;
  return value.split(/\s+/).filter(Boolean).length <= 2 && value.split(/\s+/).filter(Boolean).every(isNumber);
}

/** True when a translate value is one the analyser can read. */
function isTranslateValue(value: string): boolean {
  if (value === 'none') return true;
  const parts = value.split(/\s+/).filter(Boolean);
  return parts.length <= 2 && parts.every(isLengthOrPercentage);
}

/**
 * True when a value cannot be computed by the analyser.
 *
 * A custom property, an unknown function, an unknown unit or an unknown
 * keyword can compute anything, so the verdict cannot be decided.
 */
function isUnprovableValue(property: string, value: string): boolean {
  if (!value) return true;
  if (value.includes('var(')) return true;
  if (/\b(inherit|initial|unset|revert|revert-layer)\b/.test(value)) return true;

  if (JUDGEMENT_PROPERTIES.has(property)) {
    if (property === 'position') return !POSITION_VALUES.has(value);
    if (property === 'inset' || property === 'inset-block' || property === 'inset-inline') {
      const parts = value.split(/\s+/).filter(Boolean);
      return parts.length > 4 || !parts.every(part => part === 'auto' || isLengthOrPercentage(part));
    }
    if (property === 'top' || property === 'right' || property === 'bottom' || property === 'left') {
      return value !== 'auto' && !isLengthOrPercentage(value);
    }
    if (property === 'width' || property === 'height' || property === 'min-width' || property === 'min-height' || property === 'max-width' || property === 'max-height') {
      return !isSizingValue(value, property);
    }
    if (property === 'display') {
      const parts = value.split(/\s+/).filter(Boolean);
      return parts.length === 0 || !parts.every(part => DISPLAY_VALUES.has(part));
    }
    if (property === 'visibility') return !VISIBILITY_VALUES.has(value);
    if (property === 'opacity') return !isNonNegativeNumberOrPercentage(value);
    if (property === 'transform') {
      return value !== 'none' && !hasZeroScaleFunction(value) && !isLargeNegativeOffset(value);
    }
    if (property === 'scale') return !isScaleValue(value);
    if (property === 'translate') return !isTranslateValue(value);
    if (property === 'filter') return value !== 'none' && !hasZeroOpacity(value);
    if (property === 'content-visibility') return !CONTENT_VISIBILITY_VALUES.has(value);
    if (property === 'font-size') {
      return !FONT_SIZE_VALUES.has(value) && !isLengthOrPercentage(value);
    }
    if (property === 'line-height') {
      return value !== 'normal' && !isNumber(value) && !isLengthOrPercentage(value);
    }
    if (property === 'text-indent') return !isLengthOrPercentage(value);
  }

  if (/[a-z-]+\(/i.test(value)) return true;
  return false;
}

/** True when a length or percentage is zero. */
function isZeroLength(value: string): boolean {
  if (value === '0') return true;
  const match = /^(-?(?:\d+|\d*\.\d+))([a-z%]+)$/.exec(value);
  return (
    match !== null &&
    Number(match[1]) === 0 &&
    (match[2] === '%' || LENGTH_UNITS.has(match[2] ?? ''))
  );
}

/** True when a length moves content far enough off-screen to hide it. */
function isLargeNegativeOffset(value: string): boolean {
  const matches = [...value.matchAll(/(-?(?:\d+|\d*\.\d+))([a-z]+)/gi)];
  return matches.some(
    match =>
      match[2] !== '%' &&
      LENGTH_UNITS.has(match[2] ?? '') &&
      Number(match[1]) <= -999
  );
}

/** True when text-only hiding rules apply to an element. */
function textRulesApply(element: ElementDescriptor): boolean {
  if (!element.tag) return true;
  if (TEXT_BEARING_TAGS.has(element.tag)) return true;
  return !REPLACED_TAGS.has(element.tag);
}

/** True when a transform scale function collapses the element to zero. */
function hasZeroScaleFunction(value: string): boolean {
  const matches = [...value.matchAll(/\bscale(?:3d|x|y)?\(([^)]*)\)/gi)];
  return matches.some(match =>
    match[1]
      ?.split(/[\s,]+/)
      .filter(Boolean)
      .some(part => isNumber(part) && Number(part) === 0)
  );
}

/** True when an individual scale value collapses the element to zero. */
function hasZeroScaleValue(value: string): boolean {
  return value
    .split(/[\s,]+/)
    .filter(Boolean)
    .some(part => isNumber(part) && Number(part) === 0);
}

/** True when a filter makes the element fully transparent. */
function hasZeroOpacity(value: string): boolean {
  const matches = [...value.matchAll(/\bopacity\(([^)]*)\)/gi)];
  return matches.some(match => {
    const opacity = match[1]?.trim() ?? '';
    return (isNumber(opacity) && Number(opacity) === 0) || opacity === '0%';
  });
}

/** The rendering state of an element under a set of rules. */
interface ElementState {
  positioned: boolean;
  coversX: boolean;
  coversY: boolean;
  widthZero: boolean;
  heightZero: boolean;
  hidden: boolean;
  unprovable: Set<string>;
  /** The values of every property, by property name. */
  values: Map<string, string[]>;
}

/** The state of an element under the rules that apply to it. */
function stateOf(
  rules: CssRule[],
  element: ElementDescriptor,
  keyframes: Map<string, string[]>
): ElementState {
  const state: ElementState = {
    positioned: false,
    coversX: false,
    coversY: false,
    widthZero: false,
    heightZero: false,
    hidden: false,
    unprovable: new Set(),
    values: new Map(),
  };

  const edges = { top: false, right: false, bottom: false, left: false };

  const apply = ({ property, value }: Declaration): void => {
    const values = state.values.get(property) ?? [];
    values.push(value);
    state.values.set(property, values);

    if (!RELEVANT_PROPERTIES.has(property)) return;

    if (isUnprovableValue(property, value)) {
      state.unprovable.add(property);
      return;
    }

    if (property === 'position') {
      if (POSITIONED.test(value)) state.positioned = true;
    } else if (property === 'inset' || property === 'inset-block' || property === 'inset-inline') {
      if (isZeroLength(value)) {
        edges.top = true;
        edges.right = true;
        edges.bottom = true;
        edges.left = true;
      }
    } else if (property === 'top' || property === 'bottom' || property === 'right' || property === 'left') {
      if (isZeroLength(value)) edges[property] = true;
    } else if (property === 'width' || property === 'min-width') {
      if (COVERS_X.test(value) || COVERS_EITHER_AXIS.test(value)) state.coversX = true;
      if (property === 'width' && isZeroLength(value)) state.widthZero = true;
    } else if (property === 'height' || property === 'min-height') {
      if (COVERS_Y.test(value) || COVERS_EITHER_AXIS.test(value)) state.coversY = true;
      if (property === 'height' && isZeroLength(value)) state.heightZero = true;
    } else if (property === 'display') {
      if (HIDDEN_DISPLAY.test(value)) state.hidden = true;
    } else if (property === 'visibility') {
      if (HIDDEN_VISIBILITY.test(value)) state.hidden = true;
    } else if (property === 'opacity') {
      if (/^0(\.0+)?(?:%)?$/.test(value)) state.hidden = true;
    } else if (property === 'content-visibility') {
      if (value === 'hidden') state.hidden = true;
    } else if (property === 'transform') {
      if (hasZeroScaleFunction(value) || isLargeNegativeOffset(value)) state.hidden = true;
    } else if (property === 'scale') {
      if (hasZeroScaleValue(value)) state.hidden = true;
    } else if (property === 'translate') {
      if (isLargeNegativeOffset(value)) state.hidden = true;
    } else if (property === 'filter') {
      if (hasZeroOpacity(value)) state.hidden = true;
    } else if (property === 'font-size' || property === 'line-height') {
      if (textRulesApply(element) && isZeroLength(value)) state.hidden = true;
    } else if (property === 'text-indent') {
      if (textRulesApply(element) && isLargeNegativeOffset(value)) state.hidden = true;
    }
  };

  for (const rule of rules) {
    for (const declaration of parseDeclarations(rule.declarations)) {
      apply(declaration);
    }
  }

  // The frames of an animation that runs on the element may move it over the
  // page. Only the geometry of a frame can cover the screen, so a frame that
  // fades the element does not hide it.
  for (const name of animationNamesOf(state)) {
    const frames = keyframes.get(name);
    if (!frames) continue;
    for (const declaration of parseDeclarations(frames.join(';'))) {
      if (!GEOMETRY_PROPERTIES.has(declaration.property)) continue;
      apply(declaration);
    }
  }

  if (edges.top && edges.bottom) state.coversY = true;
  if (edges.left && edges.right) state.coversX = true;
  // `inset:0` puts the element on every edge.
  if (edges.top && edges.right && edges.bottom && edges.left) {
    state.coversX = true;
    state.coversY = true;
  }
  if (state.widthZero && state.heightZero) state.hidden = true;

  return state;
}

/** True when the state covers the whole viewport. */
function coversViewport(state: ElementState): boolean {
  return state.positioned && state.coversX && state.coversY;
}

/**
 * The reason the repository's stylesheet can harm the patched element, or null.
 *
 * The check is made on the repository's CSS: a rule that can turn the patched
 * element into a full-viewport overlay or hide it means the fix cannot be
 * verified in isolation, so it must not be written into the repository.
 */
export function destinationCssHarm(
  context: CssContext,
  originalElementHtml: string | null | undefined,
  remediationCode: string | null | undefined
): string | null {
  if (context.unprovable.length > 0) {
    return `the repository stylesheet cannot be judged: ${context.unprovable[0]}`;
  }

  const patched = describeElements(remediationCode ?? '');
  if (patched.length === 0) return null;

  const original = describeElements(originalElementHtml ?? '');

  for (let index = 0; index < patched.length; index++) {
    const element = patched[index] as ElementDescriptor;
    const before = original[index] ?? null;

    // A rule that applies after the fix but not before it is the only rule that
    // can change what the element looks like. A rule with a pseudo-class may
    // apply before as well, so it is judged as well.
    const afterRules: CssRule[] = [];
    const beforeRules: CssRule[] = [];

    for (const rule of context.rules) {
      const after = matchSelector(rule.selector, element);
      if (after === 'no') continue;
      afterRules.push(rule);

      if (!before) continue;
      const earlier = matchSelector(rule.selector, before);
      if (earlier === 'yes') beforeRules.push(rule);
    }

    const after = stateOf(afterRules, element, context.keyframes);
    const earlier = before ? stateOf(beforeRules, before, context.keyframes) : null;

    if (coversViewport(after)) {
      return 'the repository stylesheet can turn the patched element into a full-viewport overlay';
    }

    if (after.hidden) {
      return 'the repository stylesheet can hide the patched element';
    }

    // A value the analyser cannot compute only matters when the fix changes
    // the property it belongs to: an unchanged `width: var(--w)` is the
    // customer's own CSS, not something the fix introduced.
    const changed = new Set<string>();
    for (const [property, values] of after.values) {
      if (!RELEVANT_PROPERTIES.has(property)) continue;
      const previous = earlier?.values.get(property);
      const same =
        previous !== undefined &&
        previous.length === values.length &&
        [...previous].sort().join(' ') === [...values].sort().join(' ');
      if (!same) changed.add(property);
    }

    if (changed.size > 0) {
      for (const property of after.unprovable) {
        if (RELEVANT_PROPERTIES.has(property)) {
          return `the repository stylesheet cannot be judged: ${property} depends on a value the analyser cannot compute`;
        }
      }
    }
  }

  return null;
}
