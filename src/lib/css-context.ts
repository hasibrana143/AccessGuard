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

import { decodeHtmlEntities, parseHtmlTags, parseTagAttributes } from '@/lib/html-attributes';

/** A CSS rule: the selector and the declarations it applies. */
export interface CssRule {
  /** The selector list of the rule. */
  selector: string;
  /** The declaration block of the rule. */
  declarations: string;
}

/** One frame of an animation and its position on the timeline. */
export interface CssKeyframe {
  offset: number;
  body: string;
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
  keyframes: Map<string, CssKeyframe[]>;
  /** The `src` descriptors of every `@font-face`, by font family. */
  fontFaces: Map<string, string[]>;
  /**
   * Whether every `@font-face` of the stylesheet was read.
   *
   * A face whose family the analyser cannot read belongs to a family the
   * browser may still resolve, so a family without a face is unknown rather
   * than absent.
   */
  fontFacesComplete: boolean;
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

/** A `<style>` block of a document and where it stands in the document. */
interface StyleBlock {
  /** The position of the block in the document. */
  position: number;
  /** The CSS of the block. */
  css: string;
  /** The block is built at runtime, so the analyser cannot read it. */
  dynamic: boolean;
}

/** The `<style>` blocks of an HTML document, in the order they appear. */
function styleBlocks(html: string): StyleBlock[] {
  const blocks: StyleBlock[] = [];
  const pattern = /<style\b([^>]*)>([\s\S]*?)<\/style\s*>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const attributes = parseTagAttributes(match[1] ?? '');
    const css = match[2] ?? '';
    const dynamic =
      css.trim().startsWith('{') ||
      attributes.some(attribute => attribute.name === 'dangerouslysetinnerhtml');
    blocks.push({ position: match.index, css, dynamic });
  }
  return blocks;
}

/** The `<style>` sources of an HTML document. */
export function collectStyleSources(html: string): StyleSource[] {
  return styleBlocks(html).map(block => ({ css: block.css, dynamic: block.dynamic }));
}

/**
 * A style source of a document, in the order the browser applies it.
 *
 * The browser applies the `<style>` blocks and the `<link rel="stylesheet">`
 * elements of a document in the order they appear in it, so the analyser reads
 * them in that order too.
 */
export interface DocumentStyleSource {
  /** The CSS of a `<style>` block, or null when the source is a link. */
  css: string | null;
  /** The `href` of a `<link rel="stylesheet">`, or null when the source is a block. */
  href: string | null;
  /** The block is built at runtime, so the analyser cannot read it. */
  dynamic: boolean;
  /** Why the source cannot be read, or null when it can. */
  unprovable: string | null;
}

/** The style sources of a document, in the order the browser applies them. */
export function collectDocumentStyleSources(html: string): DocumentStyleSource[] {
  const entries: Array<{ position: number; source: DocumentStyleSource }> = [];

  for (const block of styleBlocks(html)) {
    entries.push({
      position: block.position,
      source: { css: block.css, href: null, dynamic: block.dynamic, unprovable: null },
    });
  }

  for (const link of orderedStylesheetLinks(html)) {
    entries.push({
      position: link.position,
      source: { css: null, href: link.href, dynamic: false, unprovable: link.unprovable },
    });
  }

  entries.sort((a, b) => a.position - b.position);
  return entries.map(entry => entry.source);
}

/** The `<style>` blocks of an HTML document. */
export function extractStyleBlocks(html: string): string[] {
  return collectStyleSources(html).map(source => source.css);
}

/** The stylesheet links of a document and the links the analyser cannot read. */
export interface StylesheetLinkAnalysis {
  /** The decoded `href` of every readable stylesheet link. */
  links: string[];
  /** Why a stylesheet link cannot be judged. */
  unprovable: string[];
}

/** True when a link tag stops before its attributes can be read completely. */
function linkAttributesAreUnreadable(html: string, attributeEnd: number): boolean {
  const trailing = html.slice(attributeEnd);
  const tagEnd = trailing.indexOf('>');
  if (tagEnd === -1) return true;
  // A quote left after the last parsed attribute means the tag ended inside a
  // quoted value. The browser reads that quote as part of the value.
  return /["']/.test(trailing.slice(0, tagEnd));
}

/** A stylesheet link of a document and where it stands in the document. */
interface OrderedStylesheetLink {
  /** The position of the link in the document. */
  position: number;
  /** The decoded `href`, or null when the link cannot be read. */
  href: string | null;
  /** Why the link cannot be read, or null when it can. */
  unprovable: string | null;
}

/** The stylesheet links of a document, in the order they appear in it. */
function orderedStylesheetLinks(html: string): OrderedStylesheetLink[] {
  const ordered: OrderedStylesheetLink[] = [];
  const tags = parseHtmlTags(html);
  const tagsByStart = new Map(tags.map(tag => [tag.start, tag]));

  for (const candidate of html.matchAll(/<link\b/gi)) {
    const position = candidate.index;
    const tag = tagsByStart.get(position);
    if (!tag) {
      ordered.push({
        position,
        href: null,
        unprovable: 'a stylesheet link has attributes the analyser cannot read',
      });
      continue;
    }

    const relAttribute = tag.attributes.find(attribute => attribute.name === 'rel');
    const rel = decodeHtmlEntities(relAttribute?.value ?? '').toLowerCase();
    const hrefAttribute = tag.attributes.find(attribute => attribute.name === 'href');
    const href = decodeHtmlEntities(hrefAttribute?.value ?? '').trim();
    const lastAttributeEnd = tag.attributes[tag.attributes.length - 1]?.end ?? tag.start + 5;

    if (rel.split(/\s+/).includes('stylesheet')) {
      if (!href) {
        ordered.push({
          position,
          href: null,
          unprovable: 'a stylesheet link has no readable href',
        });
        continue;
      }
      if (linkAttributesAreUnreadable(html, lastAttributeEnd)) {
        ordered.push({
          position,
          href: null,
          unprovable: 'a stylesheet link has attributes the analyser cannot read',
        });
        continue;
      }
      ordered.push({ position, href, unprovable: null });
      continue;
    }

    // Without a readable `rel`, an unreadable tag may hide the stylesheet
    // token the browser would use.
    if (!relAttribute && linkAttributesAreUnreadable(html, lastAttributeEnd)) {
      ordered.push({
        position,
        href: null,
        unprovable: 'a stylesheet link has attributes the analyser cannot read',
      });
    }
  }

  return ordered;
}

/**
 * The stylesheet links of a document.
 *
 * The browser decodes the entities of `rel` and `href`, and a `>` inside a
 * quoted attribute does not end the tag. A link whose attributes cannot be
 * read may hide a stylesheet, so the destination is unprovable.
 */
export function analyzeStylesheetLinks(html: string): StylesheetLinkAnalysis {
  const links: string[] = [];
  const unprovable: string[] = [];

  for (const link of orderedStylesheetLinks(html)) {
    if (link.unprovable !== null) {
      unprovable.push(link.unprovable);
      continue;
    }
    links.push(link.href as string);
  }

  return { links, unprovable };
}

/** The `href` of every readable `<link rel="stylesheet">` of a document. */
export function extractStylesheetLinks(html: string): string[] {
  return analyzeStylesheetLinks(html).links;
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
const VALUE_AT_RULES = /^@(charset|namespace|page|counter-style|font-feature-values|property|font-palette-values|view-transition)\b/i;

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
  const context: CssContext = {
    rules: [],
    unprovable: [],
    imports: [],
    keyframes: new Map(),
    fontFaces: new Map(),
    fontFacesComplete: true,
  };
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

      if (/^@font-face\b/i.test(name)) {
        collectFontFace(block.body, context);
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
        const frames: CssKeyframe[] = [];
        for (const frame of parseBlocks(block.body)) {
          const offset = keyframeOffsetOf(frame.prelude);
          if (offset === null) {
            context.unprovable.push('the stylesheet defines an animation frame without a readable offset');
            continue;
          }
          frames.push({ offset, body: frame.body });
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

/** Collect the family and source descriptors of one `@font-face`. */
function collectFontFace(body: string, context: CssContext): void {
  const declarations = parseDeclarations(body);
  // The browser reads the declaration order: the last descriptor of a face is
  // the effective one, for the family as well as for the source.
  const familyDeclarations = declarations.filter(
    declaration => declaration.property === 'font-family'
  );
  const familyDeclaration = familyDeclarations[familyDeclarations.length - 1];
  const family = familyDeclaration ? fontFamilyNameOf(familyDeclaration.value) : null;

  if (!family) {
    // The face may belong to a family the browser resolves and the analyser
    // cannot, so the family table is incomplete.
    context.fontFacesComplete = false;
    context.unprovable.push('the stylesheet defines a font face without a readable font family');
    return;
  }

  const sources = context.fontFaces.get(family) ?? [];
  // The last `src` declaration of a face is the effective one: the browser
  // reads the declaration order, not the first source the analyser finds.
  const declared = declarations.filter(declaration => declaration.property === 'src');
  const source = declared[declared.length - 1];
  if (source) sources.push(source.value);
  context.fontFaces.set(family, sources);
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
      // React maps `className` to the browser's `class` attribute, so a JSX
      // element carries its class tokens under the other name.
      if (attribute.name === 'class' || attribute.name === 'classname') {
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
  /** The arguments of an `:is()` or `:where()` selector. */
  alternatives: SelectorRequirements[];
  /** The arguments of a `:not()` selector. */
  negated: SelectorRequirements[];
  /** The selector lists of an `:nth-child()` or `:nth-last-child()` rule. */
  functionalAlternatives: SelectorRequirements[];
  /** A functional pseudo-class whose transition semantics cannot be read. */
  opaqueFunctional: boolean;
  /** The selector contains a conditional whose state the analyser cannot read. */
  opaqueConditional: boolean;
  /** The compound contains a focus pseudo-class. */
  focusPseudo: boolean;
  /** The compound contains a link pseudo-class. */
  linkPseudo: boolean;
  /** The compound contains a control-state pseudo-class. */
  controlState: 'enabled' | 'disabled' | null;
  /** The selector could not be read. */
  malformed: boolean;
}

/** The pseudo-classes the `autofocus` remediation can activate. */
const FOCUS_PSEUDO_CLASSES = new Set(['focus', 'focus-within', 'focus-visible']);

/** The pseudo-classes that match a link with an `href`. */
const LINK_PSEUDO_CLASSES = new Set(['link', 'any-link']);

/** The pseudo-classes that match a control by its disabled state. */
const CONTROL_STATE_PSEUDO_CLASSES = new Set(['enabled', 'disabled']);

/** The positive requirement a double negation is equivalent to. */
function doubleNegationPositive(requirements: SelectorRequirements): SelectorRequirements | null {
  if (
    requirements.malformed ||
    requirements.opaqueConditional ||
    requirements.opaqueFunctional ||
    requirements.tag !== null ||
    requirements.classes.length > 0 ||
    requirements.id !== null ||
    requirements.attributes.length > 0 ||
    requirements.alternatives.length > 0 ||
    requirements.functionalAlternatives.length > 0 ||
    requirements.negated.length !== 1
  ) {
    return null;
  }

  return requirements.negated[0] ?? null;
}

/** Merge a positive requirement into the compound that contains it. */
function mergePositiveRequirements(
  target: SelectorRequirements,
  source: SelectorRequirements
): void {
  if (source.tag !== null && source.tag !== '*') {
    if (target.tag !== null && target.tag !== source.tag) target.malformed = true;
    else target.tag = source.tag;
  }

  if (source.id !== null) {
    if (target.id !== null && target.id !== source.id) target.malformed = true;
    else target.id = source.id;
  }

  target.classes.push(...source.classes);
  target.attributes.push(...source.attributes);
  target.alternatives.push(...source.alternatives);
  target.focusPseudo ||= source.focusPseudo;
  target.linkPseudo ||= source.linkPseudo;
}

/** The selector list of an `:nth-child()` or `:nth-last-child()` rule. */
function nthChildSelectorList(argument: string): string | null {
  const words = splitTopLevel(argument.replace(/[\t\n\r\f]+/g, ' '), ' ').filter(Boolean);
  const ofIndex = words.findIndex(word => word.toLowerCase() === 'of');
  if (ofIndex <= 0 || ofIndex === words.length - 1) return null;
  return words.slice(ofIndex + 1).join(' ');
}

/** The offset of the `]` that closes an attribute selector. */
function attributeSelectorEnd(selector: string, from: number): number | null {
  let quote: string | null = null;

  for (let i = from + 1; i < selector.length; i++) {
    const char = selector[i] as string;

    if (quote) {
      if (char === '\\') {
        i++;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }

    if (char === '\\') {
      i++;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '[') return null;
    if (char === ']') return i;
  }

  return null;
}

/** The requirements of the subject compound of a selector. */
function parseSubject(selector: string): SelectorRequirements {
  const requirements: SelectorRequirements = {
    tag: null,
    classes: [],
    id: null,
    attributes: [],
    alternatives: [],
    negated: [],
    functionalAlternatives: [],
    opaqueFunctional: false,
    opaqueConditional: false,
    focusPseudo: false,
    linkPseudo: false,
    controlState: null,
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
      const identifier = readIdentifier(selector, i + 1);
      if (!identifier) {
        requirements.malformed = true;
        return requirements;
      }
      requirements.classes.push(identifier.value.toLowerCase());
      i = identifier.end;
      expectTag = false;
      continue;
    }

    if (char === '#') {
      const identifier = readIdentifier(selector, i + 1);
      if (!identifier) {
        requirements.malformed = true;
        return requirements;
      }
      requirements.id = identifier.value;
      i = identifier.end;
      expectTag = false;
      continue;
    }

    if (char === '[') {
      const end = attributeSelectorEnd(selector, i);
      if (end === null) {
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
        name: decodeCssEscapes(parsed[1] ?? '').toLowerCase(),
        operator: parsed[2] ?? null,
        value: value === null ? null : decodeCssEscapes(decodeHtmlEntities(value)),
      });
      i = end + 1;
      expectTag = false;
      continue;
    }

    if (char === ':') {
      // A pseudo-class or a pseudo-element: the rule may or may not apply.
      const pseudoElement = selector[i + 1] === ':';
      i += pseudoElement ? 2 : 1;
      const identifier = readIdentifier(selector, i);
      if (!identifier) {
        requirements.malformed = true;
        return requirements;
      }
      const name = identifier.value.toLowerCase();
      if (FOCUS_PSEUDO_CLASSES.has(name)) {
        requirements.focusPseudo = true;
      }
      if (LINK_PSEUDO_CLASSES.has(name)) {
        requirements.linkPseudo = true;
      }
      if (CONTROL_STATE_PSEUDO_CLASSES.has(name)) {
        requirements.controlState = name as 'enabled' | 'disabled';
      }
      i = identifier.end;
      if (selector[i] === '(') {
        const end = skipParentheses(selector, i);
        if (end === -1) {
          requirements.malformed = true;
          return requirements;
        }

        if (!pseudoElement && (name === 'is' || name === 'where' || name === 'not')) {
          const argumentsList = splitTopLevel(selector.slice(i + 1, end - 1), ',');
          if (argumentsList.length === 0 || argumentsList.every(part => !part.trim())) {
            requirements.malformed = true;
            return requirements;
          }

          const parsed = argumentsList
            .map(part => part.trim())
            .filter(Boolean)
            .map(part => {
              const argument = parseSubject(part);
              if (splitCompounds(part).length !== 1) argument.malformed = true;
              return argument;
            });
          if (name === 'not') {
            const positive = parsed.length === 1 ? doubleNegationPositive(parsed[0] as SelectorRequirements) : null;
            if (positive) {
              mergePositiveRequirements(requirements, positive);
            } else {
              requirements.negated.push(...parsed);
              if (parsed.some(argument => argument.malformed || argument.negated.length > 0 || argument.opaqueFunctional)) {
                requirements.opaqueFunctional = true;
              }
            }
          } else {
            requirements.alternatives.push(...parsed);
            if (parsed.some(argument => argument.malformed || argument.opaqueFunctional)) {
              requirements.opaqueFunctional = true;
            }
          }
        } else if (!pseudoElement && (name === 'nth-child' || name === 'nth-last-child')) {
          const selectorList = nthChildSelectorList(selector.slice(i + 1, end - 1));
          if (selectorList !== null) {
            const parts = splitTopLevel(selectorList, ',');
            if (parts.length === 0 || parts.every(part => !part.trim())) {
              requirements.opaqueFunctional = true;
            }
            for (const part of parts) {
              const argument = parseSubject(part);
              if (splitCompounds(part).length !== 1) argument.malformed = true;
              if (argument.malformed || argument.opaqueFunctional) requirements.opaqueFunctional = true;
              else requirements.functionalAlternatives.push(argument);
            }
          }
          requirements.opaqueConditional = true;
        } else {
          requirements.opaqueConditional = true;
          if (!pseudoElement) requirements.opaqueFunctional = true;
        }
        i = end;
      } else {
        if (!requirements.linkPseudo) requirements.opaqueConditional = true;
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
      const identifier = readIdentifier(selector, i);
      if (!identifier) {
        requirements.malformed = true;
        return requirements;
      }
      requirements.tag = identifier.value.toLowerCase();
      i = identifier.end;
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
function readIdentifier(source: string, from: number): { value: string; end: number } | null {
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

  return out ? { value: out, end: i } : null;
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

/** True when an element is an HTML link with an `href`. */
function isLinkElement(element: ElementDescriptor | null): boolean {
  if (!element) return false;
  return (element.tag === 'a' || element.tag === 'area') && element.attributes.has('href');
}

/** How the subject compound of a selector matches an element. */
function matchSubject(requirements: SelectorRequirements, element: ElementDescriptor): Match {
  if (requirements.malformed) return 'maybe';

  if (requirements.tag && requirements.tag !== '*' && requirements.tag !== element.tag) return 'no';
  if (requirements.linkPseudo && !isLinkElement(element)) return 'no';

  for (const className of requirements.classes) {
    if (!element.classes.has(className)) return 'no';
  }

  if (requirements.id !== null && element.id !== requirements.id) return 'no';

  let maybe = requirements.opaqueConditional;

  for (const requirement of requirements.attributes) {
    const value = element.attributes.get(requirement.name);
    if (value === undefined) return 'no';
    const result = attributeMatches(value, requirement.operator, requirement.value);
    if (result === 'no') return 'no';
    if (result === 'maybe') maybe = true;
  }

  if (requirements.alternatives.length > 0) {
    let matched = false;
    let uncertain = false;
    for (const alternative of requirements.alternatives) {
      if (alternative.malformed) return 'maybe';
      const result = matchSubject(alternative, element);
      if (result === 'yes') {
        matched = true;
        break;
      }
      if (result === 'maybe') uncertain = true;
    }
    if (!matched) return uncertain ? 'maybe' : 'no';
  }

  for (const negated of requirements.negated) {
    const result = matchSubject(negated, element);
    if (result === 'yes') return 'no';
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

/** The tags that are focusable without a tabindex attribute. */
const NATIVE_FOCUSABLE_TAGS = new Set([
  'button', 'select', 'textarea', 'iframe', 'object', 'embed',
]);

/** The tags whose disabled attribute removes them from the focus order. */
const DISABLEABLE_TAGS = new Set([
  'button', 'input', 'select', 'textarea', 'fieldset', 'optgroup', 'option',
]);

/** The numeric tabindex of an element, when it has a valid one. */
function tabIndexOf(element: ElementDescriptor): number | null {
  const value = element.attributes.get('tabindex');
  if (value === undefined || !/^[+-]?\d+$/.test(value.trim())) return null;
  const tabIndex = Number(value.trim());
  return Number.isSafeInteger(tabIndex) ? tabIndex : null;
}

/** True when an element can receive focus. */
function canReceiveFocus(element: ElementDescriptor | null): boolean {
  if (!element) return false;
  if (element.attributes.has('hidden') || element.attributes.has('inert')) return false;
  if (DISABLEABLE_TAGS.has(element.tag) && element.attributes.has('disabled')) return false;

  if (tabIndexOf(element) !== null) return true;

  const editable = element.attributes.get('contenteditable');
  if (editable !== undefined && editable.toLowerCase() !== 'false') return true;

  if (element.tag === 'a' || element.tag === 'area') {
    return element.attributes.has('href');
  }

  if (element.tag === 'input') {
    return (element.attributes.get('type') ?? 'text').toLowerCase() !== 'hidden';
  }

  if (element.tag === 'audio' || element.tag === 'video') {
    return element.attributes.has('controls');
  }

  return NATIVE_FOCUSABLE_TAGS.has(element.tag);
}

/** True when an element can receive focus from the keyboard. */
function isKeyboardFocusable(element: ElementDescriptor | null): boolean {
  if (!canReceiveFocus(element) || element === null) return false;

  const tabIndex = tabIndexOf(element);
  return tabIndex === null || tabIndex >= 0;
}

/** What the fix changes about the patched element. */
interface ElementChanges {
  attributes: Map<string, string>;
  changedAttributes: Map<string, { before: string; after: string }>;
  classes: Set<string>;
  removedAttributes: Map<string, string>;
  removedClasses: Set<string>;
  /** The fix gives the patched element focus without user interaction. */
  focus: boolean;
  /** The fix makes the patched element focusable. */
  focusable: boolean;
  /** The fix turns a non-link into a link. */
  linkActivated: boolean;
  /** The fix turns a link into a non-link. */
  linkDeactivated: boolean;
  /** The link state changes. */
  linkChanged: boolean;
  /** The fix enables a control the `disabled` attribute switched off. */
  enabledActivated: boolean;
  /** The fix disables a control with the `disabled` attribute. */
  disabledActivated: boolean;
}

/** True when the element is a control the `disabled` attribute switches off. */
function isDisabledControl(element: ElementDescriptor | null): boolean {
  if (!element) return false;
  return DISABLEABLE_TAGS.has(element.tag) && element.attributes.has('disabled');
}

/**
 * What the fix changes about the element.
 *
 * An attribute the fix adds and a class it adds are the hooks a repository
 * stylesheet can use to activate a rule the customer did not have before.
 */
function changesBetween(
  before: ElementDescriptor | null,
  after: ElementDescriptor
): ElementChanges {
  const attributes = new Map<string, string>();
  const changedAttributes = new Map<string, { before: string; after: string }>();
  const classes = new Set<string>();
  const removedAttributes = new Map<string, string>();
  const removedClasses = new Set<string>();

  for (const [name, value] of after.attributes) {
    const previous = before?.attributes.get(name);
    if (previous === value) continue;
    attributes.set(name, value);
    if (previous !== undefined) changedAttributes.set(name, { before: previous, after: value });
  }
  for (const token of after.classes) {
    if (!before?.classes.has(token)) classes.add(token);
  }
  if (before) {
    for (const [name, value] of before.attributes) {
      if (!after.attributes.has(name)) removedAttributes.set(name, value);
    }
    for (const token of before.classes) {
      if (!after.classes.has(token)) removedClasses.add(token);
    }
  }

  const focus = after.attributes.has('autofocus') && !before?.attributes.has('autofocus');
  const focusable =
    (!canReceiveFocus(before) && canReceiveFocus(after)) ||
    (!isKeyboardFocusable(before) && isKeyboardFocusable(after));
  const wasLink = isLinkElement(before);
  const isLink = isLinkElement(after);
  const linkActivated = !wasLink && isLink;
  const linkDeactivated = wasLink && !isLink;
  const wasDisabled = isDisabledControl(before);
  const isDisabled = isDisabledControl(after);

  return {
    attributes,
    changedAttributes,
    classes,
    removedAttributes,
    removedClasses,
    focus,
    focusable,
    linkActivated,
    linkDeactivated,
    linkChanged: linkActivated || linkDeactivated,
    enabledActivated: wasDisabled && !isDisabled,
    disabledActivated: !wasDisabled && isDisabled,
  };
}

/**
 * True when a compound of a selector can only match after the fix.
 *
 * The compound asks for an attribute value or a class the fix adds, so the
 * rule it belongs to starts to apply when the fix lands.
 */
function compoundActivatedByFix(compound: string, changes: ElementChanges): boolean | 'unprovable' {
  const requirements = parseSubject(compound);
  if (requirements.malformed) return 'unprovable';

  const positiveRequirementActivated = (candidate: SelectorRequirements): boolean => {
    if (candidate.linkPseudo && changes.linkActivated) return true;
    if (candidate.controlState === 'enabled' && changes.enabledActivated) return true;
    if (candidate.controlState === 'disabled' && changes.disabledActivated) return true;

    for (const requirement of candidate.attributes) {
      const value = changes.attributes.get(requirement.name);
      if (value === undefined) continue;

      const changed = changes.changedAttributes.get(requirement.name);
      if (changed) {
        const before = attributeMatches(changed.before, requirement.operator, requirement.value);
        const after = attributeMatches(changed.after, requirement.operator, requirement.value);
        if (before === 'no' && after !== 'no') return true;
      } else if (attributeMatches(value, requirement.operator, requirement.value) !== 'no') {
        return true;
      }
    }

    for (const className of candidate.classes) {
      if (changes.classes.has(className)) return true;
    }

    return candidate.alternatives.some(positiveRequirementActivated);
  };

  const positiveRequirementRemoved = (candidate: SelectorRequirements): boolean => {
    if (candidate.linkPseudo && changes.linkDeactivated) return true;
    // A control that becomes disabled stops matching `:enabled`.
    if (candidate.controlState === 'enabled' && changes.disabledActivated) return true;
    if (candidate.controlState === 'disabled' && changes.enabledActivated) return true;

    for (const requirement of candidate.attributes) {
      const removed = changes.removedAttributes.get(requirement.name);
      if (removed !== undefined && attributeMatches(removed, requirement.operator, requirement.value) !== 'no') {
        return true;
      }

      const changed = changes.changedAttributes.get(requirement.name);
      if (
        changed &&
        attributeMatches(changed.before, requirement.operator, requirement.value) !== 'no' &&
        attributeMatches(changed.after, requirement.operator, requirement.value) === 'no'
      ) {
        return true;
      }
    }

    for (const className of candidate.classes) {
      if (changes.removedClasses.has(className)) return true;
    }

    return candidate.alternatives.some(positiveRequirementRemoved);
  };

  const functionalRequirementMayChange = (candidate: SelectorRequirements): boolean => {
    if (candidate.linkPseudo && changes.linkChanged) return true;
    if (candidate.controlState && (changes.enabledActivated || changes.disabledActivated)) return true;

    for (const requirement of candidate.attributes) {
      if (
        changes.attributes.has(requirement.name) ||
        changes.removedAttributes.has(requirement.name) ||
        changes.changedAttributes.has(requirement.name)
      ) {
        return true;
      }
    }

    for (const className of candidate.classes) {
      if (changes.classes.has(className) || changes.removedClasses.has(className)) return true;
    }

    return (
      candidate.alternatives.some(functionalRequirementMayChange) ||
      candidate.negated.some(functionalRequirementMayChange)
    );
  };

  const requirementMayBecomeMatching = (candidate: SelectorRequirements): boolean => {
    if (positiveRequirementActivated(candidate)) return true;
    if (candidate.alternatives.some(requirementMayBecomeMatching)) return true;
    return candidate.negated.some(positiveRequirementRemoved);
  };

  if (requirements.opaqueFunctional) return 'unprovable';
  if (requirements.functionalAlternatives.some(functionalRequirementMayChange)) return 'unprovable';
  return requirementMayBecomeMatching(requirements);
}

/**
 * True when a focus state the fix creates can activate a compound.
 *
 * `autofocus` focuses the patched element on load, so a focus compound that
 * can match it starts applying without any user interaction.
 */
function compoundActivatedByFocus(compound: string, element: ElementDescriptor): boolean {
  const requirements = parseSubject(compound);
  if (!requirements.focusPseudo) return false;
  return matchSubject(requirements, element) !== 'no';
}

/** A declaration of a rule. */
interface Declaration {
  property: string;
  value: string;
  /** The declaration carries the `!important` priority suffix. */
  important: boolean;
}

/** The declarations of a rule. */
function parseDeclarations(body: string): Declaration[] {
  const declarations: Declaration[] = [];

  for (const part of splitTopLevel(body, ';')) {
    const separator = part.indexOf(':');
    if (separator === -1) continue;
    const property = decodeCssEscapes(part.slice(0, separator).trim()).toLowerCase();
    const rawValue = decodeCssEscapes(part.slice(separator + 1).trim()).toLowerCase();
    // The priority suffix is not part of the value, but it decides the
    // cascade: an important declaration wins over an important declaration of
    // a higher specificity.
    const important = /\s*!\s*important\s*$/i.test(rawValue);
    const value = stripCssPriority(rawValue);
    if (!property) continue;
    declarations.push({ property, value, important });
  }

  return declarations;
}

/** Remove the CSS priority suffix, which is not part of the declaration value. */
function stripCssPriority(value: string): string {
  return value.replace(/\s*!\s*important\s*$/i, '').trim();
}

/**
 * True when a declaration value can load a resource.
 *
 * The verification browser blocks every network request, so a repository
 * stylesheet that loads a resource when the fix lands is invisible to it: the
 * customer browser issues the request instead.
 */
function carriesResource(value: string): boolean {
  return /url\s*\(|\bimage-set\s*\(|\bsrc\s*\(/i.test(value);
}

/** Whether a declaration carries a resource after its custom properties resolve. */
function resourceState(
  value: string,
  definitions: Map<string, string>
): 'present' | 'absent' | 'unknown' {
  const resolved = resolveCustomProperties(value, definitions);
  if (resolved.includes('var(')) return 'unknown';
  return carriesResource(resolved) ? 'present' : 'absent';
}

/** The normalized name of one font family. */
function fontFamilyNameOf(value: string): string | null {
  const family = value.trim();
  if (!family || family.includes('var(')) return null;

  if (
    (family.startsWith('"') && family.endsWith('"')) ||
    (family.startsWith("'") && family.endsWith("'"))
  ) {
    return family.slice(1, -1).trim().toLowerCase() || null;
  }

  if (family.includes(',')) return null;
  return family.toLowerCase();
}

/** Whether a font-face source loads a resource or cannot be resolved. */
function fontSourceState(
  value: string,
  definitions: Map<string, string>
): 'present' | 'absent' | 'unknown' {
  const resolved = resolveCustomProperties(value, definitions);
  if (!resolved.trim() || resolved.includes('var(')) return 'unknown';
  if (carriesResource(resolved)) return 'present';
  if (/^local\s*\([\s\S]*\)$/i.test(resolved.trim())) return 'absent';
  return 'unknown';
}

/** The font sizes a `font` shorthand may carry. */
const FONT_SIZE_KEYWORDS = new Set([
  'xx-small', 'x-small', 'small', 'medium', 'large', 'x-large', 'xx-large',
  'smaller', 'larger',
]);

/**
 * The units that are not a length.
 *
 * A number with one of them is not a font size: `oblique 20deg` carries an
 * angle, not a size, and a size after it must still be found.
 */
const NON_LENGTH_UNITS = new Set([
  'deg', 'grad', 'rad', 'turn', 's', 'ms', 'hz', 'khz', 'dpi', 'dpcm', 'dppx',
]);

/** The system fonts the `font` shorthand may name. */
const SYSTEM_FONT_KEYWORDS = new Set([
  'caption', 'icon', 'menu', 'message-box', 'small-caption', 'status-bar',
]);

/** The CSS-wide keywords. */
const CSS_WIDE_KEYWORDS = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer']);

/** The whitespace-separated components of a value, with a quoted part kept whole. */
function splitCssValue(value: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quote: string | null = null;

  for (const character of value) {
    if (quote) {
      current += character;
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      current += character;
      continue;
    }
    if (/\s/.test(character)) {
      if (current) {
        parts.push(current);
        current = '';
      }
      continue;
    }
    current += character;
  }
  if (current) parts.push(current);

  return parts;
}

/**
 * The family list of a `font` shorthand.
 *
 * The grammar is `[ <font-style> || <font-variant> || <font-weight> ||
 * <font-stretch> ]? <font-size> [ / <line-height> ]? <font-family>`, so the
 * family is everything after the size. An empty string means the shorthand
 * selects no family of its own (a CSS-wide or system font keyword, or a
 * shorthand without a family component resets the family to its initial
 * value), and `null` means the family cannot be read.
 */
function fontShorthandFamily(value: string): string | null {
  const parts = splitCssValue(value);
  if (parts.length === 0) return '';

  // A CSS-wide keyword and a system font name no family of their own: the
  // element keeps the font it has.
  const first = (parts[0] ?? '').toLowerCase();
  if (
    parts.length === 1 &&
    (CSS_WIDE_KEYWORDS.has(first) || SYSTEM_FONT_KEYWORDS.has(first))
  ) {
    return '';
  }

  let sizeIndex = -1;
  for (let index = 0; index < parts.length; index++) {
    const size = (parts[index] ?? '').split('/')[0] ?? '';
    const lower = size.toLowerCase();
    if (FONT_SIZE_KEYWORDS.has(lower)) {
      sizeIndex = index;
      break;
    }
    // A number with a length unit is a size; a number without a unit is a
    // weight, and a number with an angle or a time unit is neither.
    const unit = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)([a-z]+|%)?$/i.exec(size);
    if (unit && unit[1] && !NON_LENGTH_UNITS.has(unit[1].toLowerCase())) {
      sizeIndex = index;
      break;
    }
  }
  if (sizeIndex === -1) return null;

  // The line height follows the size, attached to it or separated from it.
  let familyStart = sizeIndex + 1;
  if (!(parts[sizeIndex] ?? '').includes('/')) {
    const next = parts[familyStart];
    if (next === '/') familyStart += 2;
    else if (next?.startsWith('/')) familyStart += 1;
  }

  return parts.slice(familyStart).join(' ').trim();
}

/**
 * The family list an activated declaration selects.
 *
 * The `font-family` longhand names the family; the `font` shorthand names it
 * after its size component. An empty string means the declaration selects no
 * family, and `null` means the family cannot be read.
 */
function activatedFontFamily(
  declaration: Declaration,
  definitions: Map<string, string>
): string | null {
  if (declaration.property === 'font-family') return declaration.value;
  if (declaration.property !== 'font') return '';

  const resolved = resolveCustomProperties(declaration.value, definitions);
  if (resolved.includes('var(')) return null;
  return fontShorthandFamily(resolved);
}

/** Whether a font-family selects a font-face that loads a resource. */
function fontFamilyResourceState(
  value: string,
  definitions: Map<string, string>,
  fontFaces: Map<string, string[]>,
  fontFacesComplete: boolean
): 'present' | 'absent' | 'unknown' {
  const resolved = resolveCustomProperties(value, definitions);
  if (!resolved.trim()) return 'unknown';

  let unknown = false;
  for (const part of splitTopLevel(resolved, ',')) {
    const family = fontFamilyNameOf(part);
    if (!family) {
      unknown = true;
      continue;
    }

    const sources = fontFaces.get(family);
    if (!sources) {
      // A face the analyser could not read may belong to this family, so the
      // family is unknown rather than absent when the table is incomplete.
      if (!fontFacesComplete) unknown = true;
      continue;
    }

    for (const source of sources) {
      const state = fontSourceState(source, definitions);
      if (state === 'present') return 'present';
      if (state === 'unknown') unknown = true;
    }
  }

  return unknown ? 'unknown' : 'absent';
}

/**
 * The reason a set of declarations loads a resource in the customer browser,
 * or null when it does not.
 *
 * A declaration that carries a resource is judged like a declared value: the
 * custom properties it reads are resolved against the definitions that reach
 * the element, and a value the analyser cannot resolve is unprovable.
 */
function declarationHarm(
  declarations: Declaration[],
  definitions: Map<string, string>,
  fontFaces: Map<string, string[]>,
  fontFacesComplete: boolean
): string | null {
  for (const declaration of declarations) {
    const resource = resourceState(declaration.value, definitions);
    if (resource === 'present') {
      return 'the repository stylesheet can activate a customer-side request';
    }
    if (resource === 'unknown') {
      return 'the repository stylesheet cannot be judged: an activated resource depends on a custom property the analyser cannot resolve';
    }

    if (declaration.property !== 'font-family' && declaration.property !== 'font') continue;
    const family = activatedFontFamily(declaration, definitions);
    if (family === null) {
      return 'the repository stylesheet cannot be judged: an activated font family or resource cannot be resolved';
    }
    if (family === '') continue;
    const fontResource = fontFamilyResourceState(family, definitions, fontFaces, fontFacesComplete);
    if (fontResource === 'present') {
      return 'the repository stylesheet can activate a customer-side request';
    }
    if (fontResource === 'unknown') {
      return 'the repository stylesheet cannot be judged: an activated font family or resource cannot be resolved';
    }
  }

  return null;
}

/**
 * The edges an `inset` shorthand sets.
 *
 * The browser assigns the values of the shorthand the way it assigns the
 * values of `margin`: one value sets every edge, two values set the block
 * edges and the inline edges, three values set the top, the inline edges and
 * the bottom, four values set every edge on its own.
 */
function insetEdges(value: string): {
  top: string;
  right: string;
  bottom: string;
  left: string;
} {
  const parts = value.split(/\s+/).filter(Boolean);
  const edges = { top: '', right: '', bottom: '', left: '' };

  if (parts.length === 1) {
    edges.top = edges.right = edges.bottom = edges.left = parts[0] ?? '';
  } else if (parts.length === 2) {
    edges.top = edges.bottom = parts[0] ?? '';
    edges.left = edges.right = parts[1] ?? '';
  } else if (parts.length === 3) {
    edges.top = parts[0] ?? '';
    edges.left = edges.right = parts[1] ?? '';
    edges.bottom = parts[2] ?? '';
  } else if (parts.length === 4) {
    edges.top = parts[0] ?? '';
    edges.right = parts[1] ?? '';
    edges.bottom = parts[2] ?? '';
    edges.left = parts[3] ?? '';
  }

  return edges;
}

/** The block edges an `inset-block` shorthand sets. */
function insetBlockEdges(value: string): { top: string; bottom: string } {
  const parts = value.split(/\s+/).filter(Boolean);
  const first = parts[0] ?? '';
  const second = parts[1] ?? first;
  return { top: first, bottom: second };
}

/** The inline edges an `inset-inline` shorthand sets. */
function insetInlineEdges(value: string): { left: string; right: string } {
  const parts = value.split(/\s+/).filter(Boolean);
  const first = parts[0] ?? '';
  const second = parts[1] ?? first;
  return { left: first, right: second };
}

/** The physical edge a logical inset longhand sets in a horizontal writing mode. */
const LOGICAL_INSET_EDGES: Record<string, 'top' | 'bottom' | 'left' | 'right'> = {
  'inset-block-start': 'top',
  'inset-block-end': 'bottom',
  'inset-inline-start': 'left',
  'inset-inline-end': 'right',
};

/** The colour functions whose comma or slash alpha the analyser reads. */
const COLOR_FUNCTIONS = new Set([
  'rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'oklch', 'oklab', 'lab', 'lch', 'color',
]);

/** The alpha a colour component carries, or null when it cannot be read. */
function alphaNumber(value: string): number | null {
  const alpha = value.trim();
  if (!alpha) return null;
  const percent = alpha.endsWith('%');
  const number = percent ? alpha.slice(0, -1) : alpha;
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(number)) return null;
  const parsed = Number(number);
  if (!Number.isFinite(parsed)) return null;
  return percent ? parsed / 100 : parsed;
}

/**
 * The alpha of a `color-mix()` of two colours.
 *
 * The mix carries the weighted alpha of the two colours it mixes: both weights
 * omitted split the mix evenly, one omitted takes the rest, and two given
 * weights have to add up to 100 %.
 */
function colorMixAlpha(body: string): number | null {
  const parts = splitTopLevel(body, ',').map(part => part.trim());
  // The first part is the interpolation method and space: `in srgb`.
  if (parts.length !== 3) return null;

  const colours: string[] = [];
  const weights: (number | null)[] = [];
  for (const part of parts.slice(1)) {
    const weighted = /^(.*?)\s+(\d+(?:\.\d+)?%)$/.exec(part);
    if (weighted) {
      colours.push((weighted[1] ?? '').trim());
      weights.push(Number.parseFloat(weighted[2] ?? '') / 100);
    } else {
      colours.push(part);
      weights.push(null);
    }
  }

  const firstWeight = weights[0] ?? null;
  const secondWeight = weights[1] ?? null;
  let first: number;
  let second: number;
  if (firstWeight === null && secondWeight === null) {
    first = 0.5;
    second = 0.5;
  } else if (firstWeight === null) {
    second = secondWeight as number;
    first = 1 - second;
  } else if (secondWeight === null) {
    first = firstWeight;
    second = 1 - first;
  } else {
    if (Math.abs(firstWeight + secondWeight - 1) > 0.001) {
      // The weights do not add up: the declaration is invalid.
      return null;
    }
    first = firstWeight;
    second = secondWeight;
  }

  const firstAlpha = colorAlpha(colours[0] ?? '');
  const secondAlpha = colorAlpha(colours[1] ?? '');
  if (firstAlpha === null || secondAlpha === null) return null;
  return first * firstAlpha + second * secondAlpha;
}

/**
 * The alpha of a colour value, or null when the analyser cannot read it.
 *
 * A named colour is opaque, a colour function carries its alpha in the legacy
 * comma component or after the modern slash, and a `color-mix()` carries the
 * weighted alpha of the two colours it mixes.
 */
function colorAlpha(value: string): number | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'transparent') return 0;
  if (
    normalized === 'currentcolor' ||
    normalized === 'inherit' ||
    normalized === 'initial' ||
    normalized === 'unset' ||
    normalized === 'revert'
  ) {
    return 1;
  }

  // A hex colour with an alpha of zero is transparent: `#0000` and `#00000000`.
  if (/^#[0-9a-f]{4}$/.test(normalized)) return normalized[4] === '0' ? 0 : 1;
  if (/^#[0-9a-f]{8}$/.test(normalized)) return Number.parseInt(normalized.slice(7, 8), 16) / 255;
  if (/^#[0-9a-f]{3}$/.test(normalized) || /^#[0-9a-f]{6}$/.test(normalized)) return 1;

  const functional = /^([a-z-]+)\((.*)\)$/.exec(normalized);
  if (!functional) {
    // A named colour is opaque; anything else cannot be read.
    return /^[a-z]+$/.test(normalized) ? 1 : null;
  }

  const name = functional[1] ?? '';
  const body = functional[2] ?? '';
  if (name === 'color-mix') return colorMixAlpha(body);
  if (!COLOR_FUNCTIONS.has(name)) return null;

  const commaParts = splitTopLevel(body, ',');
  const slashParts = splitTopLevel(body, '/');

  // Legacy syntax puts the alpha in the fourth comma-separated component.
  // Modern syntax puts it after a top-level slash. Both forms are valid for
  // rgb(), rgba(), hsl() and hsla(); the other colour functions use slash.
  const alpha =
    commaParts.length === 4 ? commaParts[3] : slashParts.length === 2 ? slashParts[1] : null;
  // A colour function without an alpha component is opaque.
  if (alpha === null) return 1;
  return alphaNumber(alpha);
}

/**
 * True when a colour value makes the text invisible.
 *
 * `transparent` and every colour with an alpha of zero are invisible: the text
 * stays in the document, so only the colour tells the user that it is there. A
 * colour function whose alpha the analyser cannot read may hide the text as
 * well, so it fails closed.
 */
export function isTransparentColor(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'transparent') return true;

  // A custom property is resolved elsewhere: an unresolved reference is
  // unprovable there, and the value must not be read as a colour here.
  if (normalized.includes('var(')) return false;

  const alpha = colorAlpha(normalized);
  if (alpha !== null) return alpha === 0;

  // A colour function the analyser cannot read may make the text invisible.
  return /^([a-z-]+)\(.*\)$/.test(normalized);
}

/** The custom properties a set of declarations defines. */
function customPropertyDefinitions(declarations: Declaration[]): Map<string, string> {
  const definitions = new Map<string, string>();
  for (const declaration of declarations) {
    if (!declaration.property.startsWith('--')) continue;
    definitions.set(declaration.property, declaration.value);
  }
  return definitions;
}

/** The custom properties that a root rule can inherit into every element. */
function globalCustomPropertyDefinitions(rules: CssRule[]): Map<string, string> {
  const definitions = new Map<string, string>();
  for (const rule of rules) {
    const global = splitTopLevel(rule.selector, ',').some(part => {
      const selector = decodeCssEscapes(part.trim()).toLowerCase();
      return selector === ':root' || selector === 'html';
    });
    if (!global) continue;
    for (const [name, value] of customPropertyDefinitions(parseDeclarations(rule.declarations))) {
      definitions.set(name, value);
    }
  }
  return definitions;
}

/**
 * Resolve the `var()` references of a value with the custom properties.
 *
 * A reference that cannot be resolved stays in the value, so the value is
 * still unprovable — the analyser never guesses what a custom property holds.
 */
function resolveCustomProperties(value: string, definitions: Map<string, string>): string {
  let resolved = value;
  for (let depth = 0; depth < 5 && resolved.includes('var('); depth++) {
    let replaced = false;
    resolved = resolved.replace(
      /var\(\s*(--[\w-]+)\s*(?:,([^()]*))?\)/g,
      (match, name: string, fallback: string | undefined) => {
        const definition = definitions.get(name);
        if (definition === undefined) return fallback !== undefined ? fallback : match;
        replaced = true;
        return definition;
      }
    );
    if (!replaced) break;
  }
  return resolved;
}

/**
 * True when a value reads one of the given custom properties.
 *
 * The `var()` references of a value decide which custom properties it needs:
 * a declaration that reads none of them keeps the value it had.
 */
function consumesCustomProperty(value: string, names: ReadonlySet<string>): boolean {
  for (const match of value.matchAll(/var\(\s*(--[\w-]+)/g)) {
    if (names.has(match[1] ?? '')) return true;
  }
  return false;
}

/** The specificity of a selector. */
interface Specificity {
  ids: number;
  classes: number;
  types: number;
}

/** Compare two specificities: the ids first, then the classes, then the types. */
function compareSpecificity(a: Specificity, b: Specificity): number {
  if (a.ids !== b.ids) return a.ids - b.ids;
  if (a.classes !== b.classes) return a.classes - b.classes;
  return a.types - b.types;
}

/** The index of the parenthesis that closes the one at `open`. */
function closingParenthesis(text: string, open: number): number {
  let depth = 0;

  for (let index = open; index < text.length; index++) {
    const character = text[index] as string;

    if (character === '"' || character === "'") {
      const quote = character;
      index++;
      while (index < text.length && text[index] !== quote) index++;
      continue;
    }

    if (character === '(') depth++;
    else if (character === ')') {
      depth--;
      if (depth === 0) return index;
    }
  }

  return -1;
}

/**
 * The end of the identifier that starts at `index`.
 *
 * A CSS escape is part of the identifier: `.md\:flex` is one class and
 * `.\000063ard` is one class too. The escape is a backslash with up to six
 * hexadecimal digits and an optional whitespace, or a backslash with the
 * character it escapes.
 */
function endOfIdentifier(text: string, index: number): number {
  let cursor = index;

  while (cursor < text.length) {
    const character = text[cursor] as string;

    if (/[\w-]/.test(character)) {
      cursor++;
      continue;
    }

    if (character === '\\') {
      cursor++;
      const hexadecimal = /^[0-9a-fA-F]{1,6}/.exec(text.slice(cursor));
      if (hexadecimal) {
        cursor += hexadecimal[0].length;
        // A hexadecimal escape is terminated by one whitespace.
        if (/[\r\n\f\t ]/.test(text[cursor] ?? '')) cursor++;
        continue;
      }
      // The escaped character belongs to the identifier.
      cursor++;
      continue;
    }

    break;
  }

  return cursor;
}

/**
 * The specificity of one compound selector.
 *
 * The counts follow the CSS cascade: an id counts 100, a class, an attribute
 * and a pseudo-class count 10, a type and a pseudo-element count 1. The
 * functional pseudo-classes that take a selector list take the specificity of
 * their most specific argument, and `:where()` takes none.
 *
 * Null when the compound cannot be read: the caller then fails closed.
 */
function compoundSpecificity(compound: string): Specificity | null {
  const specificity: Specificity = { ids: 0, classes: 0, types: 0 };
  let index = 0;

  while (index < compound.length) {
    const character = compound[index] as string;

    if (character === '#') {
      specificity.ids++;
      index = endOfIdentifier(compound, index + 1);
      continue;
    }

    if (character === '.') {
      specificity.classes++;
      index = endOfIdentifier(compound, index + 1);
      continue;
    }

    if (character === '[') {
      const end = compound.indexOf(']', index);
      if (end === -1) return null;
      specificity.classes++;
      index = end + 1;
      continue;
    }

    if (character === ':') {
      // A pseudo-element (`::before`) counts as a type.
      if (compound[index + 1] === ':') {
        specificity.types++;
        index = endOfIdentifier(compound, index + 2);
        continue;
      }

      index++;
      const nameEnd = endOfIdentifier(compound, index);
      const name = decodeCssEscapes(compound.slice(index, nameEnd)).toLowerCase();
      index = nameEnd;

      let argument: string | null = null;
      if (compound[index] === '(') {
        const end = closingParenthesis(compound, index);
        if (end === -1) return null;
        argument = compound.slice(index + 1, end);
        index = end + 1;
      }

      // `:where()` contributes no specificity.
      if (name === 'where') continue;

      // The legacy spelling of a pseudo-element (`:before`) counts as a type.
      if (name === 'before' || name === 'after' || name === 'first-line' || name === 'first-letter') {
        specificity.types++;
        continue;
      }

      if (name === 'not' || name === 'is' || name === 'has') {
        if (argument === null) return null;
        const best = mostSpecificArgument(argument);
        if (best === null) return null;
        specificity.ids += best.ids;
        specificity.classes += best.classes;
        specificity.types += best.types;
        continue;
      }

      // Every other pseudo-class counts as a class.
      specificity.classes++;

      // `:nth-child(2n of .card)` adds the specificity of its `of` list.
      if (name === 'nth-child' || name === 'nth-last-child') {
        const of = argument === null ? null : (/\bof\s+(.+)$/i.exec(argument)?.[1] ?? null);
        if (of !== null) {
          const value = specificityOfSelector(of);
          if (value === null) return null;
          specificity.ids += value.ids;
          specificity.classes += value.classes;
          specificity.types += value.types;
        }
      }
      continue;
    }

    // The universal selector adds nothing.
    if (character === '*') {
      index++;
      continue;
    }

    // A type selector counts as a type.
    if (/[A-Za-z_\\]/.test(character)) {
      specificity.types++;
      index = endOfIdentifier(compound, index);
      // A namespace (`svg|a`) continues the name.
      if (compound[index] === '|' && compound[index + 1] !== '=') {
        index++;
        index = endOfIdentifier(compound, index);
      }
      continue;
    }

    // Anything else is not part of a compound the analyser can read.
    return null;
  }

  return specificity;
}

/** The most specific argument of a functional pseudo-class. */
function mostSpecificArgument(argument: string): Specificity | null {
  let best: Specificity | null = null;

  for (const part of splitTopLevel(argument, ',')) {
    const trimmed = part.trim();
    if (!trimmed) return null;
    const value = specificityOfSelector(trimmed);
    if (value === null) return null;
    if (best === null || compareSpecificity(value, best) > 0) best = value;
  }

  return best;
}

/** The specificity of a selector, over every compound it has. */
function specificityOfSelector(selector: string): Specificity | null {
  const compounds = splitCompounds(selector);
  if (compounds.length === 0) return null;

  const total: Specificity = { ids: 0, classes: 0, types: 0 };
  for (const compound of compounds) {
    const value = compoundSpecificity(compound);
    if (value === null) return null;
    total.ids += value.ids;
    total.classes += value.classes;
    total.types += value.types;
  }

  return total;
}

/**
 * The specificity of the part of a selector list that may match the element.
 *
 * The specificity of a selector list is the specificity of the part that
 * matches, so a rule that names the element twice is judged by the more
 * specific of its two parts. A selector list with no part that matches the
 * element has no specificity at all (`none`), and a part that matches but
 * whose specificity cannot be read leaves the destination unprovable
 * (`unreadable`).
 */
type MatchingSpecificity =
  | { kind: 'none' }
  | { kind: 'unreadable' }
  | { kind: 'specificity'; value: Specificity };

function matchingSpecificity(
  selector: string,
  element: ElementDescriptor
): MatchingSpecificity {
  let best: Specificity | null = null;

  for (const part of splitTopLevel(selector, ',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // The root element's own declarations are inherited by the element, not
    // declared on it: they are the fallback of the resolution, never a
    // candidate of the element's own cascade.
    const global = decodeCssEscapes(trimmed).toLowerCase();
    if ((global === ':root' || global === 'html') && element.tag !== 'html') continue;

    const compounds = splitCompounds(trimmed);
    const subject = compounds[compounds.length - 1] ?? trimmed;
    if (matchSubject(parseSubject(subject), element) === 'no') continue;

    const value = specificityOfSelector(trimmed);
    if (value === null) return { kind: 'unreadable' };
    if (best === null || compareSpecificity(value, best) > 0) best = value;
  }

  if (best === null) return { kind: 'none' };
  return { kind: 'specificity', value: best };
}

/** A declaration that applies to the patched element, with the rank the cascade gives it. */
interface CascadeCandidate {
  declaration: Declaration;
  specificity: Specificity;
  /** The inline style outranks every rule of the stylesheet. */
  inline: boolean;
  /** The source order of the declaration. */
  order: number;
  /** The rule provably applies to the element. */
  definite: boolean;
}

/** Compare two candidates by the cascade: important, inline, specificity, source order. */
function compareCascade(a: CascadeCandidate, b: CascadeCandidate): number {
  const important = Number(a.declaration.important) - Number(b.declaration.important);
  if (important !== 0) return important;

  const inline = Number(a.inline) - Number(b.inline);
  if (inline !== 0) return inline;

  const specificity = compareSpecificity(a.specificity, b.specificity);
  if (specificity !== 0) return specificity;

  return a.order - b.order;
}

/**
 * The declarations that may be the cascade winner of their property.
 *
 * A rule that only *may* apply to the element is a candidate as well: when it
 * outranks the rule that provably applies, the browser's winner is uncertain
 * and both declarations are judged.
 */
function cascadeWinners(candidates: CascadeCandidate[]): Map<string, CascadeCandidate[]> {
  const winners = new Map<string, CascadeCandidate[]>();
  const definite = new Map<string, CascadeCandidate>();
  const possible = new Map<string, CascadeCandidate>();

  for (const candidate of candidates) {
    const property = candidate.declaration.property;

    const current = possible.get(property);
    if (current === undefined || compareCascade(candidate, current) > 0) {
      possible.set(property, candidate);
    }

    if (!candidate.definite) continue;
    const currentDefinite = definite.get(property);
    if (currentDefinite === undefined || compareCascade(candidate, currentDefinite) > 0) {
      definite.set(property, candidate);
    }
  }

  for (const [property, candidate] of possible) {
    const certain = definite.get(property);
    winners.set(property, certain && certain !== candidate ? [certain, candidate] : [candidate]);
  }

  return winners;
}

/**
 * The declarations that may be the cascade winner of their property.
 *
 * The rules are read in the order the browser applies them, so the order of
 * the candidates is the source order of the cascade. A rule that only *may*
 * apply to the element is a candidate as well: when it outranks the rule that
 * provably applies, the browser's winner is uncertain and both declarations
 * are judged.
 */
function cascadeCandidates(
  rules: CssRule[],
  element: ElementDescriptor,
  inline: Declaration[]
): { candidates: CascadeCandidate[]; unreadable: boolean } {
  const candidates: CascadeCandidate[] = [];
  let order = 0;

  for (const rule of rules) {
    const match = matchSelector(rule.selector, element);
    if (match === 'no') continue;
    const specificity = matchingSpecificity(rule.selector, element);
    if (specificity.kind === 'none') continue;
    if (specificity.kind === 'unreadable') return { candidates, unreadable: true };
    for (const declaration of parseDeclarations(rule.declarations)) {
      candidates.push({
        declaration,
        specificity: specificity.value,
        inline: false,
        order: order++,
        definite: match === 'yes',
      });
    }
  }

  // The inline style outranks every rule of the stylesheet.
  for (const declaration of inline) {
    candidates.push({
      declaration,
      specificity: { ids: 0, classes: 0, types: 0 },
      inline: true,
      order: order++,
      definite: true,
    });
  }

  return { candidates, unreadable: false };
}

/**
 * The custom properties the fix's chain reaches.
 *
 * A property that a declaration defines while it references a property already
 * in the set joins the set, so the chain is closed transitively: `--a` → `--b`
 * → `font-family` is judged end to end.
 */
function closeCustomPropertyChain(
  seed: ReadonlySet<string>,
  candidates: CascadeCandidate[]
): Set<string> {
  const closed = new Set(seed);
  let changed = true;

  while (changed) {
    changed = false;
    for (const candidate of candidates) {
      const declaration = candidate.declaration;
      if (!declaration.property.startsWith('--')) continue;
      if (closed.has(declaration.property)) continue;
      if (!consumesCustomProperty(declaration.value, closed)) continue;
      closed.add(declaration.property);
      changed = true;
    }
  }

  return closed;
}

/**
 * The inline style declarations of an element.
 *
 * The inline style is part of the effective style: the repository's CSS and
 * the inline declarations are composed, and a declaration of the inline style
 * wins. A style that is not a plain CSS declaration list (the JSX object form
 * `style={{ width: '100%' }}`) cannot be read, so the destination is
 * unprovable.
 */
function inlineStyleOf(element: ElementDescriptor): {
  declarations: Declaration[];
  unprovable: boolean;
} {
  const style = element.attributes.get('style');
  if (style === undefined) return { declarations: [], unprovable: false };
  const value = style.trim();
  if (!value) return { declarations: [], unprovable: false };
  if (/[{}]/.test(value)) return { declarations: [], unprovable: true };
  return { declarations: parseDeclarations(value), unprovable: false };
}

/**
 * The properties that decide whether an element covers the viewport or is not
 * rendered. A value of one of them that the analyser cannot compute makes the
 * destination unprovable when the fix changes it.
 */
const RELEVANT_PROPERTIES = new Set([
  'position', 'inset', 'inset-block', 'inset-inline', 'top', 'right', 'bottom', 'left',
  'inset-block-start', 'inset-block-end', 'inset-inline-start', 'inset-inline-end',
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'inline-size', 'block-size', 'min-inline-size', 'min-block-size',
  'margin-left', 'margin-right', 'margin-top', 'margin-bottom',
  'margin-inline-start', 'margin-inline-end', 'margin-block-start', 'margin-block-end',
  'display', 'visibility', 'opacity', 'transform', 'scale', 'rotate', 'translate',
  'zoom', 'perspective', 'margin', 'padding', 'overflow', 'clip', 'clip-path',
  'content', 'font-size', 'line-height', 'text-indent', 'letter-spacing',
  'white-space', 'word-break', 'vertical-align', 'color', '-webkit-text-fill-color',
  'background', 'background-color', 'background-position', 'background-size',
  'float', 'clear', 'flex', 'flex-basis', 'order', 'aspect-ratio', 'contain',
  'isolation', 'mix-blend-mode', 'filter', 'backdrop-filter', 'mask', '-webkit-mask',
  'content-visibility', 'outline', 'outline-width', 'outline-style', 'outline-offset',
  'z-index', 'animation', 'animation-name', 'animation-duration', 'animation-delay',
  'animation-fill-mode', 'animation-play-state', 'animation-direction', 'box-sizing', 'gap', 'grid-area',
  'grid-template', 'grid-template-columns', 'grid-template-rows', 'columns', 'column-count',
]);

/** The viewport units that size the horizontal axis. */
const VIEWPORT_X_UNITS = new Set(['vw', 'vi', 'dvw', 'dvi', 'svw', 'svi', 'lvw', 'lvi']);

/** The viewport units that size the vertical axis. */
const VIEWPORT_Y_UNITS = new Set(['vh', 'vb', 'dvh', 'dvb', 'svh', 'svb', 'lvh', 'lvb']);

/** The viewport units whose axis depends on the shape of the viewport. */
const VIEWPORT_EITHER_UNITS = new Set([
  'vmin', 'vmax', 'dvmin', 'dvmax', 'svmin', 'svmax', 'lvmin', 'lvmax',
]);

/** The units that are the same length everywhere. */
const FIXED_LENGTH_UNITS = new Set(['px', 'cm', 'mm', 'q', 'in', 'pt', 'pc']);

/**
 * A fixed length that may be as large as the viewport.
 *
 * The analyser does not know the size of the customer's screen, so a fixed
 * length of 1024px or more may span it: the destination is unprovable.
 */
const VIEWPORT_LENGTH = 1024;

/** The number of `em` units that are as long as the viewport at the default font size. */
const VIEWPORT_EM = 64;

/**
 * True when a sizing value spans an axis of the viewport.
 *
 * A viewport unit of exactly 100 is the size of the screen, so it spans the
 * axis it belongs to. A larger one is not computable: `maySpanViewport` makes
 * it unprovable instead.
 */
function spansAxis(value: string, axis: 'x' | 'y'): boolean {
  if (value === '100%') return true;

  const match = /^(\d+(?:\.\d+)?)([a-z]+)$/.exec(value);
  if (!match) return false;

  if (Number(match[1]) !== 100) return false;
  const unit = match[2] ?? '';

  if (VIEWPORT_EITHER_UNITS.has(unit)) return true;
  if (axis === 'x' && VIEWPORT_X_UNITS.has(unit)) return true;
  if (axis === 'y' && VIEWPORT_Y_UNITS.has(unit)) return true;

  return false;
}

/**
 * True when a size may be larger than the viewport.
 *
 * The size of the customer's screen is unknown, so a fixed length of 1024px
 * or more may span it, and a viewport unit above 100 is larger than the
 * screen by definition: the bounds of the element cannot be computed and the
 * destination is unprovable.
 */
function maySpanViewport(value: string, property: string): boolean {
  // A maximum does not grow the element: it caps it.
  if (property === 'max-width' || property === 'max-height') return false;

  const match = /^(\d+(?:\.\d+)?)([a-z]+)$/.exec(value);
  if (!match) return false;

  const amount = Number(match[1]);
  const unit = match[2] ?? '';

  if (VIEWPORT_UNITS.has(unit)) return amount > 100;

  // The font size is unknown, so a font-relative length may be as long as
  // the viewport: 64em is 1024px at the default font size.
  if (unit === 'em' || unit === 'rem') return amount >= VIEWPORT_EM;

  return FIXED_LENGTH_UNITS.has(unit) && amount >= VIEWPORT_LENGTH;
}

/** The values that position an element out of the normal flow. */
const POSITIONED = /^(fixed|absolute|sticky)$/;

/** The values that remove an element from the rendering. */
const HIDDEN_DISPLAY = /^none$/;
const HIDDEN_VISIBILITY = /^(hidden|collapse)$/;

/** The properties whose values decide whether the patched element is visible. */
const JUDGEMENT_PROPERTIES = new Set([
  'position', 'inset', 'inset-block', 'inset-inline', 'top', 'right', 'bottom', 'left',
  'inset-block-start', 'inset-block-end', 'inset-inline-start', 'inset-inline-end',
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'inline-size', 'block-size', 'min-inline-size', 'min-block-size',
  'display', 'visibility', 'opacity', 'transform', 'scale', 'zoom', 'translate', 'filter',
  'animation-duration', 'animation-delay', 'animation-fill-mode', 'animation-play-state',
  'animation-direction', 'content-visibility', 'font-size', 'line-height', 'text-indent',
  'color', '-webkit-text-fill-color',
]);

/** The CSS length units the analyser can recognise. */
const LENGTH_UNITS = new Set([
  'px', 'cm', 'mm', 'q', 'in', 'pt', 'pc', 'em', 'rem', 'ex', 'rex', 'ch', 'rch',
  'cap', 'rcap', 'ic', 'ric', 'lh', 'rlh', 'vw', 'vh', 'vmin', 'vmax', 'vi', 'vb',
  'svw', 'svh', 'svmin', 'svmax', 'svi', 'svb', 'lvw', 'lvh', 'lvmin', 'lvmax',
  'lvi', 'lvb', 'dvw', 'dvh', 'dvmin', 'dvmax', 'dvi', 'dvb',
]);

/** The units that are the size of the screen. */
const VIEWPORT_UNITS = new Set([
  'vw', 'vh', 'vmin', 'vmax', 'vi', 'vb', 'svw', 'svh', 'svmin', 'svmax', 'svi',
  'svb', 'lvw', 'lvh', 'lvmin', 'lvmax', 'lvi', 'lvb', 'dvw', 'dvh', 'dvmin',
  'dvmax', 'dvi', 'dvb',
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
  'inset-block-start', 'inset-block-end', 'inset-inline-start', 'inset-inline-end',
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'inline-size', 'block-size', 'min-inline-size', 'min-block-size',
]);

/**
 * The properties a keyframe may use to hide the element.
 *
 * The end state of an animation is what the user sees after it runs: a frame
 * that leaves the element invisible hides it, whatever the base style says.
 */
const HIDE_FRAME_PROPERTIES = new Set([
  'opacity', 'visibility', 'display', 'content-visibility', 'filter', 'scale',
  'translate', 'transform', 'font-size', 'line-height', 'text-indent',
  'color', '-webkit-text-fill-color',
]);

/** The position of a keyframe on its animation timeline. */
function keyframeOffsetOf(prelude: string): number | null {
  const normalized = prelude.trim().toLowerCase();
  if (normalized === 'from') return 0;
  if (normalized === 'to') return 100;
  const match = /^(\d+(?:\.\d+)?|\.\d+)%$/.exec(normalized);
  if (!match) return null;
  const offset = Number(match[1]);
  return offset >= 0 && offset <= 100 ? offset : null;
}

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

/** The animation names in a list of animation values. */
function animationNamesFromValues(values: string[]): string[] {
  const names: string[] = [];
  for (const value of values) {
    for (const part of splitTopLevel(value, ',')) {
      const name = animationNameOf(part);
      if (name && !names.includes(name)) names.push(name);
    }
  }
  return names;
}

/** The animations that may run on an element. */
function animationNamesOf(state: ElementState): string[] {
  return [
    ...new Set([
      ...animationNamesFromValues(state.values.get('animation') ?? []),
      ...animationNamesFromValues(state.values.get('animation-name') ?? []),
    ]),
  ];
}

/** The animation list whose positions the longhands use. */
function orderedAnimationNamesOf(state: ElementState): string[] {
  const explicit = animationNamesFromValues(state.values.get('animation-name') ?? []);
  return explicit.length > 0
    ? explicit
    : animationNamesFromValues(state.values.get('animation') ?? []);
}

/**
 * The direction an animation runs in, read from the `animation` shorthand.
 *
 * A reversed animation ends at its first frame, so the state the user sees
 * after it runs is the `from` frame, not the `to` frame.
 */
function animationDirectionOf(state: ElementState, name: string): string {
  // The longhand decides the direction on its own, including `normal`.
  const longhand = animationLonghandValue(state, 'animation-direction', name);
  if (
    longhand === 'normal' ||
    longhand === 'reverse' ||
    longhand === 'alternate' ||
    longhand === 'alternate-reverse'
  ) {
    return longhand;
  }

  const shorthand = animationShorthandPart(state, name);
  if (shorthand) {
    for (const token of shorthand.split(/\s+/)) {
      if (token === 'reverse' || token === 'alternate' || token === 'alternate-reverse') {
        return token;
      }
    }
  }

  return 'normal';
}

/**
 * The play state of an animation.
 *
 * A paused animation stays on its first frame, so the state the customer sees
 * is not the endpoint the direction would otherwise select.
 */
function animationPlayStateOf(state: ElementState, name: string): 'running' | 'paused' {
  const longhand = animationLonghandValue(state, 'animation-play-state', name);
  if (longhand === 'running' || longhand === 'paused') return longhand;

  const shorthand = animationShorthandPart(state, name);
  if (shorthand?.split(/\s+/).some(token => token.toLowerCase() === 'paused')) {
    return 'paused';
  }

  return 'running';
}

/** The duration and delay of one animation, in milliseconds. */
interface AnimationTiming {
  duration: number;
  delay: number;
  unknown: boolean;
}

/** Parse a CSS animation time in milliseconds. */
function parseAnimationTime(value: string): number | null {
  const match = /^([+-]?(?:\d+|\d*\.\d+))(ms|s)$/.exec(value.trim());
  if (!match) return null;
  const amount = Number(match[1]);
  return match[2] === 's' ? amount * 1000 : amount;
}

/** One longhand value aligned with an animation name. */
function animationLonghandValue(
  state: ElementState,
  property: string,
  name: string
): string | undefined {
  const index = orderedAnimationNamesOf(state).indexOf(name);
  for (const value of state.values.get(property) ?? []) {
    const values = splitTopLevel(value, ',').map(part => part.trim());
    const selected = values.length === 1 ? values[0] : values[index];
    if (selected !== undefined) return selected;
  }
  return undefined;
}

/** The `animation` shorthand that declares an animation name. */
function animationShorthandPart(state: ElementState, name: string): string | undefined {
  for (const value of state.values.get('animation') ?? []) {
    for (const part of splitTopLevel(value, ',')) {
      if (animationNameOf(part) === name) return part;
    }
  }
  return undefined;
}

/** Read the timing values from one `animation` shorthand. */
function animationShorthandTiming(value: string): AnimationTiming {
  const times: number[] = [];
  let unknown = false;

  for (const token of value.split(/\s+/).filter(Boolean)) {
    const time = parseAnimationTime(token);
    if (time !== null) {
      times.push(time);
      continue;
    }
    if (/^[+-]?(?:\d|\.)/.test(token) || /^(?:calc|var)\(/i.test(token)) unknown = true;
  }

  if (times.length > 2) unknown = true;
  const duration = times[0] ?? 0;
  const delay = times[1] ?? 0;
  if (duration < 0) unknown = true;
  return { duration, delay, unknown };
}

/** True when an `animation` shorthand contains timing the analyser cannot read. */
function animationShorthandIsUnprovable(value: string): boolean {
  for (const part of splitTopLevel(value, ',')) {
    if (animationNameOf(part) === null) continue;
    if (animationShorthandTiming(part).unknown) return true;
  }
  return false;
}

/** The duration and delay that apply to one animation. */
function animationTimingOf(state: ElementState, name: string): AnimationTiming {
  const shorthand = animationShorthandPart(state, name);
  const shorthandTiming = shorthand
    ? animationShorthandTiming(shorthand)
    : { duration: 0, delay: 0, unknown: false };
  let duration = shorthandTiming.duration;
  let delay = shorthandTiming.delay;
  let unknown = shorthandTiming.unknown;

  const durationValue = animationLonghandValue(state, 'animation-duration', name);
  if (durationValue !== undefined) {
    const parsed = parseAnimationTime(durationValue);
    if (parsed === null || parsed < 0) unknown = true;
    else duration = parsed;
  }

  const delayValue = animationLonghandValue(state, 'animation-delay', name);
  if (delayValue !== undefined) {
    const parsed = parseAnimationTime(delayValue);
    if (parsed === null) unknown = true;
    else delay = parsed;
  }

  return { duration, delay, unknown };
}

/** The fill mode that applies to one animation. */
function animationFillModeOf(
  state: ElementState,
  name: string
): 'none' | 'forwards' | 'backwards' | 'both' | 'unknown' {
  const longhand = animationLonghandValue(state, 'animation-fill-mode', name);
  if (longhand !== undefined) {
    if (longhand === 'none' || longhand === 'forwards' || longhand === 'backwards' || longhand === 'both') {
      return longhand;
    }
    return 'unknown';
  }

  const shorthand = animationShorthandPart(state, name);
  if (!shorthand) return 'none';
  for (const token of shorthand.split(/\s+/)) {
    if (token === 'forwards' || token === 'backwards' || token === 'both' || token === 'none') {
      return token;
    }
  }
  return 'none';
}

/** The keyframe in effect at a position on the animation timeline. */
function keyframeAtProgress(frames: CssKeyframe[], progress: number): CssKeyframe | null {
  const sorted = [...frames].sort((left, right) => left.offset - right.offset);
  let selected: CssKeyframe | null = null;
  for (const frame of sorted) {
    if (frame.offset > progress) break;
    selected = frame;
  }
  return selected ?? sorted[0] ?? null;
}

/** The frames whose paint the customer sees for one animation. */
function customerAnimationFrames(
  state: ElementState,
  name: string,
  frames: CssKeyframe[],
  timing: AnimationTiming
): CssKeyframe[] | null {
  const fillMode = animationFillModeOf(state, name);
  if (fillMode === 'unknown') return null;

  const sorted = [...frames].sort((left, right) => left.offset - right.offset);
  if (sorted.length === 0) return [];

  if (animationPlayStateOf(state, name) === 'paused') {
    if (timing.delay >= 0) return [sorted[0] as CssKeyframe];

    if (timing.duration <= 0) return null;
    const activeTime = -timing.delay;
    const iteration = Math.floor(activeTime / timing.duration);
    const localProgress = (activeTime % timing.duration) / timing.duration;
    const direction = animationDirectionOf(state, name);
    const reverse =
      direction === 'reverse' ||
      (direction === 'alternate' && iteration % 2 === 1) ||
      (direction === 'alternate-reverse' && iteration % 2 === 0);
    const progress = reverse ? 1 - localProgress : localProgress;
    const frame = keyframeAtProgress(sorted, progress * 100);
    return frame ? [frame] : null;
  }

  const direction = animationDirectionOf(state, name);
  const endpoints =
    direction === 'reverse'
      ? [sorted[0] as CssKeyframe]
      : direction === 'normal'
        ? [sorted[sorted.length - 1] as CssKeyframe]
        : [sorted[0] as CssKeyframe, sorted[sorted.length - 1] as CssKeyframe];

  if (timing.delay > 0 && (fillMode === 'backwards' || fillMode === 'both')) {
    // The backwards fill shows the first frame during the delay; the endpoint
    // still governs the state after the animation runs.
    return [sorted[0] as CssKeyframe, ...endpoints];
  }

  return endpoints;
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
  if (property === 'animation') return animationShorthandIsUnprovable(value);

  if (JUDGEMENT_PROPERTIES.has(property)) {
    if (property === 'position') return !POSITION_VALUES.has(value);
    if (property === 'inset' || property === 'inset-block' || property === 'inset-inline') {
      const parts = value.split(/\s+/).filter(Boolean);
      return parts.length > 4 || !parts.every(part => part === 'auto' || isLengthOrPercentage(part));
    }
    if (property === 'top' || property === 'right' || property === 'bottom' || property === 'left' ||
        property === 'inset-block-start' || property === 'inset-block-end' || property === 'inset-inline-start' || property === 'inset-inline-end') {
      return value !== 'auto' && !isLengthOrPercentage(value);
    }
    if (property === 'width' || property === 'height' || property === 'min-width' || property === 'min-height' || property === 'max-width' || property === 'max-height' || property === 'inline-size' || property === 'block-size' || property === 'min-inline-size' || property === 'min-block-size') {
      if (!isSizingValue(value, property)) return true;
      // The size of the customer's screen is unknown, so a fixed length may be
      // as large as the viewport: the bounds cannot be computed.
      return maySpanViewport(value, property);
    }
    if (property === 'display') {
      const parts = value.split(/\s+/).filter(Boolean);
      return parts.length === 0 || !parts.every(part => DISPLAY_VALUES.has(part));
    }
    if (property === 'visibility') return !VISIBILITY_VALUES.has(value);
    if (property === 'opacity') return !isNonNegativeNumberOrPercentage(value);
    if (property === 'transform') {
      return value !== 'none' && !hasZeroScaleFunction(value) && !isLargeOffset(value);
    }
    if (property === 'scale') return !isScaleValue(value);
    if (property === 'zoom') return zoomFactorOf(value) === null;
    if (property === 'translate') return !isTranslateValue(value);
    if (property === 'animation-duration') {
      return !splitTopLevel(value, ',').every(part => parseAnimationTime(part) !== null);
    }
    if (property === 'animation-delay') {
      return !splitTopLevel(value, ',').every(part => parseAnimationTime(part) !== null);
    }
    if (property === 'animation-fill-mode') {
      return !splitTopLevel(value, ',').every(part => ['none', 'forwards', 'backwards', 'both'].includes(part.trim()));
    }
    if (property === 'animation-play-state') {
      return !splitTopLevel(value, ',').every(part => ['running', 'paused'].includes(part.trim()));
    }
    if (property === 'animation-direction') {
      return !splitTopLevel(value, ',').every(part => ['normal', 'reverse', 'alternate', 'alternate-reverse'].includes(part.trim()));
    }
    if (property === 'filter') return value !== 'none' && !hasZeroOpacity(value);
    if (property === 'content-visibility') return !CONTENT_VISIBILITY_VALUES.has(value);
    if (property === 'font-size') {
      return !FONT_SIZE_VALUES.has(value) && !isLengthOrPercentage(value);
    }
    if (property === 'line-height') {
      return value !== 'normal' && !isNumber(value) && !isLengthOrPercentage(value);
    }
    if (property === 'text-indent') return !isLengthOrPercentage(value);
    // A colour is readable: only a custom property can make it unknowable,
    // and that case is already caught above.
    if (property === 'color' || property === '-webkit-text-fill-color') return false;
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
function isLargeOffset(value: string, composedSize = 0): boolean {
  const matches = [...value.matchAll(/(-?(?:\d+|\d*\.\d+))([a-z%]+)/gi)];
  return matches.some(match => {
    const amount = Math.abs(Number(match[1]));
    const unit = match[2] ?? '';
    // A viewport unit is the size of the screen: moving an element by a whole
    // viewport puts it off-screen even though the number is small. A smaller
    // offset still hides the element when its declared size crosses the edge.
    if (VIEWPORT_UNITS.has(unit)) {
      return amount >= 100 || (amount / 100) * VIEWPORT_LENGTH + composedSize > VIEWPORT_LENGTH;
    }
    // A percentage of the element itself: 100% moves it out of the view.
    if (unit === '%') return amount >= 100;
    return LENGTH_UNITS.has(unit) && amount >= 999;
  });
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

/** The axes on which the element clips overflow. */
function clippingOverflowOf(state: ElementState): { x: boolean; y: boolean } {
  const clipping = { x: false, y: false };
  const clips = (value: string): boolean => value === 'hidden' || value === 'clip';

  for (const value of state.values.get('overflow') ?? []) {
    const values = splitBoxShorthand(value);
    if (!values) continue;
    const x = values[0] ?? '';
    const y = values.length > 1 ? (values[1] ?? '') : x;
    clipping.x ||= clips(x);
    clipping.y ||= clips(y);
  }

  for (const value of state.values.get('overflow-x') ?? []) {
    if (clips(value.trim())) clipping.x = true;
  }
  for (const value of state.values.get('overflow-y') ?? []) {
    if (clips(value.trim())) clipping.y = true;
  }

  return clipping;
}

/** The painted bounds of an element on one axis. */
interface PaintedBox {
  coversX: boolean;
  coversY: boolean;
  unprovableX: boolean;
  unprovableY: boolean;
}

/** A CSS length and its unit. */
interface CssLength {
  amount: number;
  unit: string;
}

/** The growth a length adds to one axis of a painted box. */
interface AxisGrowth {
  ratio: number;
  fixedPx: number;
  unknown: boolean;
}

/** The outside growth painted by the box shadows of an element. */
interface ShadowGrowth {
  x: number;
  y: number;
  unknown: boolean;
}

/** A declared size on one axis of a painted box. */
interface AxisSize {
  ratio: number;
  fixedPx: number;
  known: boolean;
  declared: boolean;
  unknown: boolean;
}

/** The scale factors of the horizontal and vertical axes. */
interface ScaleFactors {
  x: number;
  y: number;
}

/** The lengths and unprovable values declared for each side of a box. */
interface SideInputs {
  top: { lengths: CssLength[]; unknown: boolean };
  right: { lengths: CssLength[]; unknown: boolean };
  bottom: { lengths: CssLength[]; unknown: boolean };
  left: { lengths: CssLength[]; unknown: boolean };
}

/** Parse a CSS length, leaving values the analyser cannot read as null. */
function parseCssLength(value: string): CssLength | null {
  const match = /^(-?(?:\d+|\d*\.\d+))([a-z%]*)$/.exec(value);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2] ?? '';
  if (!unit && amount !== 0) return null;
  if (unit && unit !== '%' && !LENGTH_UNITS.has(unit)) return null;
  return { amount, unit };
}

/** The fixed pixel equivalent of a length at the analyser's conservative defaults. */
function fixedPixelsOf(length: CssLength): number | null {
  if (length.unit === '' || length.unit === 'px') return length.amount;

  const absolute: Record<string, number> = {
    cm: 96 / 2.54,
    mm: 96 / 25.4,
    q: 96 / 101.6,
    in: 96,
    pt: 96 / 72,
    pc: 16,
  };
  if (absolute[length.unit] !== undefined) return length.amount * absolute[length.unit];

  // The viewport thresholds define the default font size used here.
  if (length.unit === 'em' || length.unit === 'rem') {
    return length.amount * (VIEWPORT_LENGTH / VIEWPORT_EM);
  }

  return null;
}

/** The growth a length adds to one axis of a painted box. */
function growthForLength(length: CssLength, axis: 'x' | 'y'): AxisGrowth {
  if (length.amount < 0) return { ratio: 0, fixedPx: 0, unknown: true };

  const fixedPx = fixedPixelsOf(length);
  if (fixedPx !== null) return { ratio: 0, fixedPx, unknown: false };

  if (length.unit === '%') {
    return { ratio: length.amount, fixedPx: 0, unknown: false };
  }

  if (VIEWPORT_UNITS.has(length.unit)) {
    const horizontal = VIEWPORT_X_UNITS.has(length.unit) || VIEWPORT_EITHER_UNITS.has(length.unit);
    const vertical = VIEWPORT_Y_UNITS.has(length.unit) || VIEWPORT_EITHER_UNITS.has(length.unit);
    if ((axis === 'x' && horizontal) || (axis === 'y' && vertical)) {
      return { ratio: length.amount, fixedPx: 0, unknown: false };
    }
  }

  return { ratio: 0, fixedPx: 0, unknown: true };
}

/** Merge two possible declarations of the same side without adding them together. */
function mergeGrowth(left: AxisGrowth, right: AxisGrowth): AxisGrowth {
  return {
    ratio: Math.max(left.ratio, right.ratio),
    fixedPx: Math.max(left.fixedPx, right.fixedPx),
    unknown: left.unknown || right.unknown,
  };
}

/** The outside growth of the box shadows declared on an element. */
function boxShadowGrowthOf(state: ElementState): ShadowGrowth {
  const growth: ShadowGrowth = { x: 0, y: 0, unknown: false };

  for (const value of state.values.get('box-shadow') ?? []) {
    if (value.trim() === 'none') continue;

    for (const shadow of splitTopLevel(value, ',')) {
      const trimmed = shadow.trim();
      if (!trimmed || trimmed === 'none') continue;
      // An inset shadow paints inside the border box.
      if (trimmed.split(/\s+/)[0] === 'inset') continue;

      const withoutColors = trimmed.replace(
        /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\([^)]*\)/gi,
        ' '
      );
      const lengths: CssLength[] = [];
      let unknown = false;

      for (const token of withoutColors.split(/\s+/).filter(Boolean)) {
        const length = parseCssLength(token);
        if (length && length.unit !== '%') {
          lengths.push(length);
          continue;
        }
        // Colours are not lengths; an unknown function or token is not readable.
        if (!/^#[0-9a-f]+$/i.test(token) && !/^[a-z-]+$/i.test(token)) unknown = true;
      }

      if (lengths.length < 2 || lengths.length > 4) {
        growth.unknown = true;
        continue;
      }

      const fixed = lengths.map(length => fixedPixelsOf(length));
      if (fixed.some(value => value === null)) {
        growth.unknown = true;
        continue;
      }

      const [offsetX, offsetY, blur = 0, spread = 0] = fixed as number[];
      if (blur < 0) {
        growth.unknown = true;
        continue;
      }

      const outside = Math.max(0, blur + spread);
      growth.x = Math.max(growth.x, Math.abs(offsetX) + outside);
      growth.y = Math.max(growth.y, Math.abs(offsetY) + outside);
      growth.unknown ||= unknown;
    }
  }

  return growth;
}

/** The outline styles that paint an outline. */
const OUTLINE_STYLES = new Set([
  'auto', 'dashed', 'dotted', 'double', 'groove', 'hidden', 'inset', 'none', 'outset', 'ridge', 'solid',
]);

/** The outline width keywords in pixels. */
const OUTLINE_WIDTH_KEYWORDS: Record<string, number> = { thin: 1, medium: 3, thick: 5 };

/** The parsed parts of an `outline` shorthand. */
interface OutlineShorthand {
  style: 'painted' | 'none' | 'unknown';
  width: number | null;
  widthUnknown: boolean;
}

/** The fixed pixel width of an outline width. */
function outlineWidthPixels(value: string): number | null {
  const keyword = OUTLINE_WIDTH_KEYWORDS[value];
  if (keyword !== undefined) return keyword;

  const length = parseCssLength(value);
  if (!length || length.amount < 0) return null;
  return fixedPixelsOf(length);
}

/** True when a token is a colour in an outline shorthand. */
function isOutlineColor(value: string): boolean {
  return (
    /^#[0-9a-f]+$/i.test(value) ||
    /^[a-z-]+$/i.test(value) ||
    /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\(/i.test(value)
  );
}

/** Parse the width and style of an `outline` shorthand. */
function parseOutlineShorthand(value: string): OutlineShorthand {
  const tokens = splitTopLevel(value.replace(/[\t\n\r\f]+/g, ' '), ' ').filter(Boolean);
  let style: OutlineShorthand['style'] | null = null;
  let width: number | null = null;
  let widthUnknown = false;
  let widthSeen = false;

  for (const token of tokens) {
    if (OUTLINE_STYLES.has(token)) {
      const candidate = token === 'none' || token === 'hidden'
        ? 'none'
        : token === 'auto'
          ? 'unknown'
          : 'painted';
      style = style === null || style === candidate ? candidate : 'unknown';
      continue;
    }

    const parsed = outlineWidthPixels(token);
    if (parsed !== null) {
      if (widthSeen) widthUnknown = true;
      else width = parsed;
      widthSeen = true;
      continue;
    }

    if (!isOutlineColor(token)) widthUnknown = true;
  }

  if (style === null) style = 'none';
  if (style === 'painted' && !widthSeen) width = 3;
  return { style, width, widthUnknown };
}

/** The outside growth painted by the outline of an element. */
function outlineGrowthOf(state: ElementState): ShadowGrowth {
  const growth: ShadowGrowth = { x: 0, y: 0, unknown: false };
  const widths: number[] = [];
  let paintedStyle = false;
  let unknownStyle = false;
  let unknownWidth = false;

  for (const value of state.values.get('outline') ?? []) {
    const parsed = parseOutlineShorthand(value);
    if (parsed.style === 'painted') paintedStyle = true;
    else if (parsed.style === 'unknown') unknownStyle = true;
    if (parsed.width !== null) widths.push(parsed.width);
    unknownWidth ||= parsed.widthUnknown;
  }

  for (const value of state.values.get('outline-style') ?? []) {
    if (value === 'none' || value === 'hidden') continue;
    if (value === 'auto' || !OUTLINE_STYLES.has(value)) unknownStyle = true;
    else paintedStyle = true;
  }

  for (const value of state.values.get('outline-width') ?? []) {
    const width = outlineWidthPixels(value);
    if (width === null) unknownWidth = true;
    else widths.push(width);
  }

  if (!paintedStyle && !unknownStyle) return growth;
  if (unknownStyle || unknownWidth) growth.unknown = true;
  if (!paintedStyle) return growth;

  const width = widths.length > 0 ? Math.max(...widths) : 3;
  const offsets = [0];
  for (const value of state.values.get('outline-offset') ?? []) {
    const length = parseCssLength(value);
    const offset = length ? fixedPixelsOf(length) : null;
    if (offset === null) growth.unknown = true;
    else offsets.push(offset);
  }

  const outside = Math.max(0, width + Math.max(...offsets));
  growth.x = outside;
  growth.y = outside;
  return growth;
}

/** Split a one-to-four-value shorthand. */
function splitBoxShorthand(value: string): string[] | null {
  if (value.includes('(')) return null;
  const parts = value.split(/\s+/).filter(Boolean);
  return parts.length >= 1 && parts.length <= 4 ? parts : null;
}

/** A border width keyword or length. */
function borderWidthToken(value: string): CssLength | null {
  const keyword: Record<string, number> = { thin: 1, medium: 3, thick: 5 };
  if (keyword[value] !== undefined) return { amount: keyword[value], unit: 'px' };

  const length = parseCssLength(value);
  return length && length.amount >= 0 ? length : null;
}

/** The width component of a border shorthand. */
function borderWidthOf(value: string): CssLength | null | 'none' {
  const tokens = value.match(/[^\s]+/g) ?? [];
  if (tokens.some(token => token === 'none' || token === 'hidden')) return 'none';

  for (const token of tokens) {
    const width = borderWidthToken(token);
    if (width) return width;
    if (/^(?:calc|min|max|clamp)\(/i.test(token)) return null;
  }

  return { amount: 3, unit: 'px' };
}

/** The padding and border widths declared for every side of the element. */
function sideInputsOf(state: ElementState): SideInputs {
  const sides: SideInputs = {
    top: { lengths: [], unknown: false },
    right: { lengths: [], unknown: false },
    bottom: { lengths: [], unknown: false },
    left: { lengths: [], unknown: false },
  };

  const add = (side: keyof SideInputs, length: CssLength | null): void => {
    if (!length) sides[side].unknown = true;
    else sides[side].lengths.push(length);
  };
  const addShorthand = (
    values: string[],
    mapping: Array<[keyof SideInputs, number]>
  ): void => {
    for (const [side, index] of mapping) {
      const length = parseCssLength(values[index] ?? '');
      add(side, length);
    }
  };

  for (const value of state.values.get('padding') ?? []) {
    const values = splitBoxShorthand(value);
    if (!values) {
      for (const side of Object.keys(sides) as Array<keyof SideInputs>) add(side, null);
      continue;
    }
    if (values.length === 1) addShorthand(values, [['top', 0], ['right', 0], ['bottom', 0], ['left', 0]]);
    else if (values.length === 2) addShorthand(values, [['top', 0], ['right', 1], ['bottom', 0], ['left', 1]]);
    else if (values.length === 3) addShorthand(values, [['top', 0], ['right', 1], ['bottom', 2], ['left', 1]]);
    else addShorthand(values, [['top', 0], ['right', 1], ['bottom', 2], ['left', 3]]);
  }

  for (const [property, side] of [
    ['padding-top', 'top'],
    ['padding-right', 'right'],
    ['padding-bottom', 'bottom'],
    ['padding-left', 'left'],
  ] as Array<[string, keyof SideInputs]>) {
    for (const value of state.values.get(property) ?? []) {
      add(side, parseCssLength(value));
    }
  }

  for (const [property, side] of [
    ['padding-block-start', 'top'],
    ['padding-block-end', 'bottom'],
    ['padding-inline-start', 'left'],
    ['padding-inline-end', 'right'],
  ] as Array<[string, keyof SideInputs]>) {
    for (const value of state.values.get(property) ?? []) {
      add(side, parseCssLength(value));
    }
  }

  for (const value of state.values.get('padding-block') ?? []) {
    const values = splitBoxShorthand(value);
    if (!values) {
      add('top', null);
      add('bottom', null);
    } else {
      add('top', parseCssLength(values[0] ?? ''));
      add('bottom', parseCssLength(values[Math.min(1, values.length - 1)] ?? ''));
    }
  }

  for (const value of state.values.get('padding-inline') ?? []) {
    const values = splitBoxShorthand(value);
    if (!values) {
      add('left', null);
      add('right', null);
    } else {
      add('left', parseCssLength(values[0] ?? ''));
      add('right', parseCssLength(values[Math.min(1, values.length - 1)] ?? ''));
    }
  }

  for (const value of state.values.get('border') ?? []) {
    const width = borderWidthOf(value);
    if (width === 'none') continue;
    for (const side of Object.keys(sides) as Array<keyof SideInputs>) add(side, width);
  }

  for (const value of state.values.get('border-width') ?? []) {
    const values = splitBoxShorthand(value);
    if (!values) {
      for (const side of Object.keys(sides) as Array<keyof SideInputs>) add(side, null);
      continue;
    }
    const widths = values.map(borderWidthToken);
    const mapping: Array<[keyof SideInputs, number]> =
      widths.length === 1
        ? [['top', 0], ['right', 0], ['bottom', 0], ['left', 0]]
        : widths.length === 2
          ? [['top', 0], ['right', 1], ['bottom', 0], ['left', 1]]
          : widths.length === 3
            ? [['top', 0], ['right', 1], ['bottom', 2], ['left', 1]]
            : [['top', 0], ['right', 1], ['bottom', 2], ['left', 3]];
    addShorthand(
      widths.map(width => (width ? `${width.amount}${width.unit}` : '')),
      mapping
    );
  }

  for (const [property, side] of [
    ['border-top', 'top'],
    ['border-right', 'right'],
    ['border-bottom', 'bottom'],
    ['border-left', 'left'],
  ] as Array<[string, keyof SideInputs]>) {
    for (const value of state.values.get(property) ?? []) {
      const width = borderWidthOf(value);
      if (width === 'none') continue;
      add(side, width);
    }
  }

  for (const [property, side] of [
    ['border-top-width', 'top'],
    ['border-right-width', 'right'],
    ['border-bottom-width', 'bottom'],
    ['border-left-width', 'left'],
  ] as Array<[string, keyof SideInputs]>) {
    for (const value of state.values.get(property) ?? []) {
      add(side, borderWidthToken(value));
    }
  }

  for (const [property, side] of [
    ['border-block-start-width', 'top'],
    ['border-block-end-width', 'bottom'],
    ['border-inline-start-width', 'left'],
    ['border-inline-end-width', 'right'],
  ] as Array<[string, keyof SideInputs]>) {
    for (const value of state.values.get(property) ?? []) {
      add(side, borderWidthToken(value));
    }
  }

  for (const [property, sides] of [
    ['border-block-start', ['top']],
    ['border-block-end', ['bottom']],
    ['border-inline-start', ['left']],
    ['border-inline-end', ['right']],
  ] as Array<[string, Array<keyof SideInputs>]>) {
    for (const value of state.values.get(property) ?? []) {
      const width = borderWidthOf(value);
      if (width === 'none') continue;
      for (const side of sides) add(side, width);
    }
  }

  for (const [property, sides] of [
    ['border-block', ['top', 'bottom']],
    ['border-inline', ['left', 'right']],
  ] as Array<[string, Array<keyof SideInputs>]>) {
    for (const value of state.values.get(property) ?? []) {
      const width = borderWidthOf(value);
      if (width === 'none') continue;
      for (const side of sides) add(side, width);
    }
  }

  return sides;
}

/** The padding and border growth on one axis of the painted box. */
function axisGrowthOf(sides: SideInputs, axis: 'x' | 'y'): AxisGrowth {
  const relevant = axis === 'x' ? ['left', 'right'] : ['top', 'bottom'];
  const sideGrowth = relevant.map(side => {
    const input = sides[side as keyof SideInputs];
    let growth: AxisGrowth = { ratio: 0, fixedPx: 0, unknown: input.unknown };
    for (const length of input.lengths) {
      growth = mergeGrowth(growth, growthForLength(length, axis));
    }
    return growth;
  });

  return {
    ratio: sideGrowth.reduce((sum, growth) => sum + growth.ratio, 0),
    fixedPx: sideGrowth.reduce((sum, growth) => sum + growth.fixedPx, 0),
    unknown: sideGrowth.some(growth => growth.unknown),
  };
}

/** True when the element declares a usable aspect ratio. */
function hasAspectRatio(state: ElementState): boolean {
  for (const value of state.values.get('aspect-ratio') ?? []) {
    const normalized = value.trim().replace(/\s+/g, ' ').replace(/\s*\/\s*/g, '/');
    if (normalized === 'auto') continue;
    const ratio = normalized.startsWith('auto ') ? normalized.slice(5) : normalized;
    const match = /^(\d+(?:\.\d+)?|\.\d+)(?:\/(\d+(?:\.\d+)?|\.\d+))?$/.exec(ratio);
    if (!match) return false;
    if (Number(match[1]) <= 0 || (match[2] !== undefined && Number(match[2]) <= 0)) return false;
    return true;
  }
  return false;
}

/** The declared size on one axis of the painted box. */
function axisSizeOf(state: ElementState, axis: 'x' | 'y'): AxisSize {
  const properties =
    axis === 'x'
      ? ['width', 'inline-size', 'min-width', 'min-inline-size']
      : ['height', 'block-size', 'min-height', 'min-block-size'];
  const size: AxisSize = { ratio: 0, fixedPx: 0, known: false, declared: false, unknown: false };

  for (const property of properties) {
    for (const value of state.values.get(property) ?? []) {
      if (['auto', 'min-content', 'max-content', 'fit-content', 'stretch'].includes(value)) continue;
      const length = parseCssLength(value);
      if (!length) {
        size.unknown = true;
        continue;
      }
      if (property === 'width' || property === 'inline-size' || property === 'height' || property === 'block-size') {
        size.declared = true;
      }
      const growth = growthForLength(length, axis);
      size.ratio = Math.max(size.ratio, growth.ratio);
      size.fixedPx = Math.max(size.fixedPx, growth.fixedPx);
      size.known = true;
      size.unknown ||= growth.unknown;
      // A size that may be as long as the customer's screen cannot be pinned
      // down, so it stays unprovable instead of becoming a painted overlay.
      size.unknown ||= maySpanViewport(value, property);
    }
  }

  return size;
}

/** The size of an element on one axis, including its HTML size attribute. */
function elementSizeOnAxis(
  state: ElementState,
  element: ElementDescriptor,
  axis: 'x' | 'y'
): number | null {
  const cssSize = axisSizeOf(state, axis);
  if (cssSize.known) {
    return Math.max(cssSize.fixedPx, (cssSize.ratio / 100) * VIEWPORT_LENGTH);
  }

  const attribute = element.attributes.get(axis === 'x' ? 'width' : 'height');
  const match = attribute ? /^(\d+(?:\.\d+)?)$/.exec(attribute.trim()) : null;
  return match?.[1] ? Number(match[1]) : null;
}

/** The factor of a readable numeric `zoom` value. */
function zoomFactorOf(value: string): number | null {
  if (!isNumber(value)) return null;
  const factor = Number(value);
  return factor >= 0 ? factor : null;
}

/** The scale factors of the independent `scale` property. */
function propertyScaleFactors(value: string): ScaleFactors | null {
  if (value === 'none') return { x: 1, y: 1 };
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length < 1 || parts.length > 2) return null;
  const numbers = parts.map(part => (/^-?(?:\d+|\d*\.\d+)$/.test(part) ? Number(part) : null));
  if (numbers.some(number => number === null)) return null;
  if (numbers.length === 1) return { x: numbers[0] as number, y: numbers[0] as number };
  return { x: numbers[0] as number, y: numbers[1] as number };
}

/** The scale factors of a transform made only of scale functions. */
function transformScaleFactors(value: string): ScaleFactors | null {
  if (value === 'none') return { x: 1, y: 1 };

  let remainder = value;
  let factors: ScaleFactors = { x: 1, y: 1 };
  let found = false;
  const pattern = /([a-z0-9]+)\(([^)]*)\)/gi;

  for (const match of value.matchAll(pattern)) {
    found = true;
    remainder = remainder.replace(match[0], '');
    const name = (match[1] ?? '').toLowerCase();
    const args = (match[2] ?? '')
      .split(',')
      .map(part => part.trim())
      .filter(Boolean);
    const numbers = args.map(part => (/^-?(?:\d+|\d*\.\d+)$/.test(part) ? Number(part) : null));
    if (numbers.some(number => number === null)) return null;

    if (name === 'scale') {
      if (numbers.length !== 1 && numbers.length !== 2) return null;
      factors.x *= numbers[0] as number;
      factors.y *= numbers.length === 1 ? (numbers[0] as number) : (numbers[1] as number);
    } else if (name === 'scalex') {
      if (numbers.length !== 1) return null;
      factors.x *= numbers[0] as number;
    } else if (name === 'scaley') {
      if (numbers.length !== 1) return null;
      factors.y *= numbers[0] as number;
    } else if (name === 'scale3d') {
      if (numbers.length !== 3) return null;
      factors.x *= numbers[0] as number;
      factors.y *= numbers[1] as number;
    } else {
      return null;
    }
  }

  return found && remainder.trim() === '' ? factors : null;
}

/** Keep the larger scale factor while preserving a collapse to zero. */
function largerScaleFactor(current: number, candidate: number): number {
  if (current === 0 || candidate === 0) return 0;
  return Math.max(Math.abs(current), Math.abs(candidate));
}

/** The effective scale on each axis of the painted box. */
function scaleFactorsOf(state: ElementState): ScaleFactors {
  let property: ScaleFactors = { x: 1, y: 1 };
  for (const value of state.values.get('scale') ?? []) {
    const factors = propertyScaleFactors(value);
    if (!factors) continue;
    property.x = largerScaleFactor(property.x, factors.x);
    property.y = largerScaleFactor(property.y, factors.y);
  }

  let zoom: ScaleFactors = { x: 1, y: 1 };
  for (const value of state.values.get('zoom') ?? []) {
    const factor = zoomFactorOf(value);
    if (factor === null) continue;
    zoom.x = largerScaleFactor(zoom.x, factor);
    zoom.y = largerScaleFactor(zoom.y, factor);
  }

  let transform: ScaleFactors = { x: 1, y: 1 };
  for (const value of state.values.get('transform') ?? []) {
    const factors = transformScaleFactors(value);
    if (!factors) continue;
    transform.x = largerScaleFactor(transform.x, factors.x);
    transform.y = largerScaleFactor(transform.y, factors.y);
  }

  return { x: property.x * zoom.x * transform.x, y: property.y * zoom.y * transform.y };
}

/** The box-sizing rule that decides whether padding and borders grow the box. */
function boxSizingOf(state: ElementState): 'content-box' | 'border-box' {
  const values = state.values.get('box-sizing') ?? [];
  if (values.includes('border-box') && !values.includes('content-box')) return 'border-box';
  return 'content-box';
}

/**
 * The painted bounds of the element.
 *
 * Padding, borders, box sizing and scale all change the box the customer
 * sees, so the content-box dimensions alone cannot prove that a rule is safe.
 */
function paintedBoxOf(state: ElementState): PaintedBox {
  const box: PaintedBox = {
    coversX: false,
    coversY: false,
    unprovableX: false,
    unprovableY: false,
  };
  const shadow = boxShadowGrowthOf(state);
  const outline = outlineGrowthOf(state);
  const outsideGrowth: ShadowGrowth = {
    x: shadow.x + outline.x,
    y: shadow.y + outline.y,
    unknown: shadow.unknown || outline.unknown,
  };
  box.unprovableX = outsideGrowth.unknown || outsideGrowth.x >= VIEWPORT_LENGTH;
  box.unprovableY = outsideGrowth.unknown || outsideGrowth.y >= VIEWPORT_LENGTH;

  const sides = sideInputsOf(state);
  const growthX = axisGrowthOf(sides, 'x');
  const growthY = axisGrowthOf(sides, 'y');
  const sizeX = axisSizeOf(state, 'x');
  const sizeY = axisSizeOf(state, 'y');
  if (hasAspectRatio(state)) {
    // The missing axis depends on the shape of the customer's screen.
    if (sizeX.declared && !sizeY.declared) sizeY.unknown = true;
    else if (sizeY.declared && !sizeX.declared) sizeX.unknown = true;
  }
  const factors = scaleFactorsOf(state);
  const borderBox = boxSizingOf(state) === 'border-box';

  if (state.coversX) {
    sizeX.ratio = Math.max(sizeX.ratio, 100);
    sizeX.known = true;
  }
  if (state.coversY) {
    sizeY.ratio = Math.max(sizeY.ratio, 100);
    sizeY.known = true;
  }

  const paintAxis = (
    size: AxisSize,
    growth: AxisGrowth,
    factor: number,
    outside: ShadowGrowth,
    axis: 'x' | 'y'
  ): { covers: boolean; unprovable: boolean } => {
    const outsideSize = axis === 'x' ? outside.x : outside.y;
    let ratio = size.ratio;
    let fixedPx = size.fixedPx + outsideSize * 2;
    let unknown = size.unknown || outside.unknown || outsideSize >= VIEWPORT_LENGTH;

    // Scaling an intrinsic size cannot be computed: the element's own size is
    // unknown, so a scale above one may carry it across the viewport.
    if (factor > 1 && !size.declared) unknown = true;

    if (!borderBox) {
      ratio += growth.ratio;
      fixedPx += growth.fixedPx;
      unknown ||= growth.unknown;
    } else if (!size.known && (growth.ratio >= 100 || growth.fixedPx >= VIEWPORT_LENGTH || growth.unknown)) {
      // A border-box does not grow past a known declaration, but an unknown
      // declared size leaves the large padding or border unprovable.
      unknown = true;
    }

    const scaledRatio = ratio * factor;
    const scaledFixedPx = fixedPx * factor;
    // A declared size above the viewport cannot be computed: the screen of the
    // customer is unknown, so the destination is unprovable, never harmless.
    const oversized = ratio > 100;
    const covers = scaledRatio >= 100 && !oversized;
    const growthMaySpan =
      growth.fixedPx >= VIEWPORT_LENGTH || growth.ratio > 100 || growth.unknown;

    return {
      covers,
      unprovable:
        unknown ||
        oversized ||
        scaledFixedPx >= VIEWPORT_LENGTH ||
        (!borderBox && growthMaySpan),
    };
  };

  const x = paintAxis(sizeX, growthX, factors.x, outsideGrowth, 'x');
  const y = paintAxis(sizeY, growthY, factors.y, outsideGrowth, 'y');
  box.coversX = x.covers;
  box.coversY = y.covers;
  box.unprovableX = x.unprovable;
  box.unprovableY = y.unprovable;
  return box;
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
  /** The painted bounds the customer sees. */
  painted: PaintedBox;
  /** The values of every property, by property name. */
  values: Map<string, string[]>;
}

/** The state of an element under the rules that apply to it. */
function stateOf(
  rules: CssRule[],
  element: ElementDescriptor,
  keyframes: Map<string, CssKeyframe[]>,
  inline: Declaration[] = [],
  definitions: Map<string, string> = new Map(),
  inlineDefinitions: Map<string, string> = definitions
): ElementState {
  const state: ElementState = {
    positioned: false,
    coversX: false,
    coversY: false,
    widthZero: false,
    heightZero: false,
    hidden: false,
    unprovable: new Set(),
    painted: { coversX: false, coversY: false, unprovableX: false, unprovableY: false },
    values: new Map(),
  };

  const edges = { top: false, right: false, bottom: false, left: false };
  const applyInsetEdge = (edge: keyof typeof edges, value: string): void => {
    if (isZeroLength(value)) edges[edge] = true;
    if (isLargeOffset(value)) state.hidden = true;
  };

  const apply = ({ property, value }: { property: string; value: string }): void => {
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
    } else if (property === 'inset') {
      const assigned = insetEdges(value);
      applyInsetEdge('top', assigned.top);
      applyInsetEdge('right', assigned.right);
      applyInsetEdge('bottom', assigned.bottom);
      applyInsetEdge('left', assigned.left);
    } else if (property === 'inset-block') {
      const assigned = insetBlockEdges(value);
      applyInsetEdge('top', assigned.top);
      applyInsetEdge('bottom', assigned.bottom);
    } else if (property === 'inset-inline') {
      const assigned = insetInlineEdges(value);
      applyInsetEdge('left', assigned.left);
      applyInsetEdge('right', assigned.right);
    } else if (property === 'top' || property === 'bottom' || property === 'right' || property === 'left') {
      if (isZeroLength(value)) edges[property] = true;
      // A large offset moves the element out of the view.
      if (isLargeOffset(value)) state.hidden = true;
    } else if (
      property === 'inset-block-start' ||
      property === 'inset-block-end' ||
      property === 'inset-inline-start' ||
      property === 'inset-inline-end'
    ) {
      // The logical edges are the physical edges in a horizontal writing mode.
      const edge = LOGICAL_INSET_EDGES[property] as 'top' | 'bottom' | 'left' | 'right';
      if (isZeroLength(value)) edges[edge] = true;
      if (isLargeOffset(value)) state.hidden = true;
    } else if (
      property === 'width' ||
      property === 'min-width' ||
      property === 'inline-size' ||
      property === 'min-inline-size'
    ) {
      if (spansAxis(value, 'x')) state.coversX = true;
      if ((property === 'width' || property === 'inline-size') && isZeroLength(value)) {
        state.widthZero = true;
      }
    } else if (
      property === 'height' ||
      property === 'min-height' ||
      property === 'block-size' ||
      property === 'min-block-size'
    ) {
      if (spansAxis(value, 'y')) state.coversY = true;
      if ((property === 'height' || property === 'block-size') && isZeroLength(value)) {
        state.heightZero = true;
      }
    } else if (property === 'display') {
      if (HIDDEN_DISPLAY.test(value)) state.hidden = true;
      // `display:contents` removes the box of the element: a replaced element
      // has nothing left to paint.
      if (value === 'contents' && !textRulesApply(element)) state.hidden = true;
    } else if (property === 'color' || property === '-webkit-text-fill-color') {
      // A transparent colour leaves the text in the document but invisible.
      if (textRulesApply(element) && isTransparentColor(value)) state.hidden = true;
    } else if (property === 'visibility') {
      if (HIDDEN_VISIBILITY.test(value)) state.hidden = true;
    } else if (property === 'opacity') {
      if (/^0(\.0+)?(?:%)?$/.test(value)) state.hidden = true;
    } else if (property === 'content-visibility') {
      if (value === 'hidden') state.hidden = true;
    } else if (property === 'transform') {
      if (hasZeroScaleFunction(value) || isLargeOffset(value)) state.hidden = true;
    } else if (property === 'scale') {
      if (hasZeroScaleValue(value)) state.hidden = true;
    } else if (property === 'zoom') {
      if (zoomFactorOf(value) === 0) state.hidden = true;
    } else if (property === 'translate') {
      if (isLargeOffset(value)) state.hidden = true;
    } else if (property === 'filter') {
      if (hasZeroOpacity(value)) state.hidden = true;
    } else if (property === 'font-size' || property === 'line-height') {
      if (textRulesApply(element) && isZeroLength(value)) state.hidden = true;
    } else if (property === 'text-indent') {
      if (textRulesApply(element) && isLargeOffset(value)) state.hidden = true;
    } else if (property === 'margin' || property.startsWith('margin-')) {
      // A large margin moves the element out of the view.
      if (isLargeOffset(value)) state.hidden = true;
    }
  };

  // The effective style is the repository's rules plus the inline style of the
  // element: the inline declarations are the last word. The custom properties
  // they define resolve the `var()` references of the repository's rules, so a
  // fix that supplies a custom property cannot hide behind one.
  for (const rule of rules) {
    for (const declaration of parseDeclarations(rule.declarations)) {
      apply({
        property: declaration.property,
        value: resolveCustomProperties(declaration.value, definitions),
      });
    }
  }
  for (const declaration of inline) {
    apply({
      property: declaration.property,
      value: resolveCustomProperties(declaration.value, inlineDefinitions),
    });
  }

  // Compose a viewport-unit offset with the element's declared size. A 99vw
  // shift moves a 64px target beyond the viewport even though the offset alone
  // is smaller than one viewport.
  const width = elementSizeOnAxis(state, element, 'x');
  const height = elementSizeOnAxis(state, element, 'y');
  const largestSize = Math.max(width ?? 0, height ?? 0);
  for (const [property, values] of state.values) {
    let size: number | null = null;
    if (
      property === 'left' ||
      property === 'right' ||
      property === 'inset-inline-start' ||
      property === 'inset-inline-end' ||
      property === 'margin-left' ||
      property === 'margin-right' ||
      property === 'margin-inline-start' ||
      property === 'margin-inline-end' ||
      property === 'text-indent'
    ) {
      size = width;
    } else if (
      property === 'top' ||
      property === 'bottom' ||
      property === 'inset-block-start' ||
      property === 'inset-block-end' ||
      property === 'margin-top' ||
      property === 'margin-bottom' ||
      property === 'margin-block-start' ||
      property === 'margin-block-end'
    ) {
      size = height;
    } else if (
      property === 'inset-inline' ||
      property === 'inset-block'
    ) {
      size = property === 'inset-inline' ? width : height;
    } else if (property === 'inset' || property === 'margin' || property === 'transform' || property === 'translate') {
      size = largestSize;
    }
    if (size !== null && values.some(value => isLargeOffset(value, size))) state.hidden = true;
  }

  // A zero maximum size with clipping removes the control from the customer's
  // paint even though the repository never sets `display:none`.
  const clipping = clippingOverflowOf(state);
  const zeroMaxHeight = (state.values.get('max-height') ?? []).some(isZeroLength);
  const zeroMaxWidth = (state.values.get('max-width') ?? []).some(isZeroLength);
  if ((zeroMaxHeight && clipping.y) || (zeroMaxWidth && clipping.x)) state.hidden = true;

  // The frames of an animation that runs on the element may move it over the
  // page. Only the geometry of a frame can cover the screen, so a frame that
  // fades the element does not cover it.
  for (const name of animationNamesOf(state)) {
    const frames = keyframes.get(name);
    if (!frames) continue;

    for (const frame of frames) {
      for (const declaration of parseDeclarations(frame.body)) {
        if (!GEOMETRY_PROPERTIES.has(declaration.property)) continue;
        apply(declaration);
      }
    }

    const timing = animationTimingOf(state, name);
    if (timing.unknown) {
      state.unprovable.add('animation-duration');
      continue;
    }

    // The frame the customer sees depends on the play state, delay, duration,
    // fill mode and direction, not on the endpoint alone.
    const customerFrames = customerAnimationFrames(state, name, frames, timing);
    if (!customerFrames) {
      state.unprovable.add('animation-duration');
      continue;
    }

    for (const frame of customerFrames) {
      for (const declaration of parseDeclarations(frame.body)) {
        if (!HIDE_FRAME_PROPERTIES.has(declaration.property)) continue;
        apply(declaration);
      }
    }
  }

  if (edges.top && edges.bottom) state.coversY = true;
  if (edges.left && edges.right) state.coversX = true;
  // `inset:0` puts the element on every edge.
  if (edges.top && edges.right && edges.bottom && edges.left) {
    state.coversX = true;
    state.coversY = true;
  }
  // A zero width or a zero height leaves the element without an area: it
  // paints nothing where the user looks.
  if (state.widthZero || state.heightZero) state.hidden = true;

  state.painted = paintedBoxOf(state);
  return state;
}

/** True when the state covers the whole viewport. */
function coversViewport(state: ElementState): boolean {
  return (
    state.positioned &&
    (state.coversX || state.painted.coversX) &&
    (state.coversY || state.painted.coversY)
  );
}

/**
 * True when two element descriptors describe the same element.
 *
 * The identity of an element is its tag and its id. A fix may change the
 * attributes of an element it keeps — an added `aria-label`, a changed class —
 * and that is neither a removal nor a new element.
 */
function sameElement(left: ElementDescriptor, right: ElementDescriptor): boolean {
  if (left.id !== null || right.id !== null) {
    return left.id !== null && left.id === right.id;
  }
  return left.tag === right.tag;
}

/** The patched target and the elements the remediation adds or removes. */
interface ElementPairing {
  target: ElementDescriptor;
  before: ElementDescriptor | null;
  introduced: ElementDescriptor[];
  removed: boolean;
}

/** Pair the patched target with the original element. */
function pairElements(
  originalElements: ElementDescriptor[],
  patchedElements: ElementDescriptor[]
): ElementPairing | { error: string } {
  if (patchedElements.length === 0) {
    return { error: 'the patched element cannot be identified because the remediation has no element' };
  }

  const original = originalElements[0] ?? null;
  if (!original) {
    return { error: 'the patched element cannot be identified because the original element cannot be read' };
  }
  let target: ElementDescriptor | undefined;

  if (original.id) {
    const candidates = patchedElements.filter(element => element.id === original.id);
    if (candidates.length !== 1) {
      return { error: 'the patched element cannot be identified by its id' };
    }
    target = candidates[0];
  } else {
    // Without an id the patched element is the one of the same kind: a
    // remediation carries the children of the original element as well, and
    // they are not the element the fix is about.
    const candidates = patchedElements.filter(element => element.tag === original.tag);
    if (candidates.length !== 1) {
      return {
        error:
          'the patched element cannot be identified because the remediation must contain exactly one element of its kind',
      };
    }
    target = candidates[0];
  }

  const originalOthers = originalElements.slice(1);
  const patchedOthers = patchedElements.filter(element => element !== target);
  const removed = originalOthers.some(
    originalElement => !patchedOthers.some(patchedElement => sameElement(originalElement, patchedElement))
  );
  const introduced = patchedOthers.filter(
    patchedElement => !originalElements.some(originalElement => sameElement(originalElement, patchedElement))
  );

  return { target, before: original, introduced, removed };
}

/**
 * The elements a remediation introduces, and the element it patches.
 *
 * The patched element is paired with the original by its id, or by its kind
 * when the original carries no id. Every other element of the remediation that
 * the original does not carry is introduced by the fix.
 */
export function introducedElements(
  originalHtml: string,
  patchedHtml: string
): { target: ElementDescriptor | null; introduced: ElementDescriptor[] } {
  const pairing = pairElements(describeElements(originalHtml), describeElements(patchedHtml));
  if ('error' in pairing) return { target: null, introduced: [] };
  return { target: pairing.target, introduced: pairing.introduced };
}

/** The name of the CSS function that opens at `index`. */
function functionNameBefore(source: string, index: number): string {
  const match = /([a-zA-Z_-][\w-]*)\s*$/.exec(source.slice(0, index));
  return match?.[1] ? decodeCssEscapes(match[1]).toLowerCase() : '';
}

/**
 * True when a selector depends on the DOM position of an element.
 *
 * A sibling combinator and an `nth-child()` selector change what they match
 * when a remediation introduces an element. The analyser sees the remediation
 * snippet rather than the customer's document, so it cannot compute that
 * transition.
 */
function hasStructuralSelector(selector: string): boolean {
  let quote: string | null = null;
  let bracketDepth = 0;
  const functions: string[] = [];

  for (let i = 0; i < selector.length; i++) {
    const char = selector[i] as string;

    if (quote) {
      if (char === '\\') {
        i++;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }

    if (char === '\\') {
      i++;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '[') {
      bracketDepth++;
      continue;
    }
    if (char === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1);
      continue;
    }
    if (char === '(') {
      functions.push(functionNameBefore(selector, i));
      continue;
    }
    if (char === ')') {
      functions.pop();
      continue;
    }
    if (bracketDepth > 0) continue;

    if (char === ':' && /^:nth-(?:last-)?child\(/i.test(selector.slice(i))) return true;
    if (
      (char === '+' || char === '~') &&
      !functions.some(name => name === 'nth-child' || name === 'nth-last-child')
    ) {
      return true;
    }
  }

  return false;
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
  const original = describeElements(originalElementHtml ?? '');
  const pairing = pairElements(original, patched);

  if ('error' in pairing) {
    return `the destination cannot be judged: ${pairing.error}`;
  }
  if (pairing.removed) {
    return 'the destination cannot be judged: the remediation removes an element from the original';
  }
  if (
    pairing.introduced.length > 0 &&
    context.rules.some(rule => hasStructuralSelector(rule.selector))
  ) {
    return 'the repository stylesheet cannot be judged: an introduced element changes a structural selector';
  }

  const elementPairs: Array<{ element: ElementDescriptor; before: ElementDescriptor | null }> = [
    { element: pairing.target, before: pairing.before },
    ...pairing.introduced.map(element => ({ element, before: null })),
  ];

  for (const { element, before } of elementPairs) {

    // A rule that applies after the fix but not before it is the only rule that
    // can change what the element looks like. A rule with a pseudo-class may
    // apply before as well, so it is judged as well.
    const afterRules: CssRule[] = [];
    const beforeRules: CssRule[] = [];
    const matchedRules: CssRule[] = [];

    for (const rule of context.rules) {
      const after = matchSelector(rule.selector, element);
      if (after === 'no') continue;
      afterRules.push(rule);
      if (after === 'yes') matchedRules.push(rule);

      if (!before) continue;
      const earlier = matchSelector(rule.selector, before);
      if (earlier === 'yes') beforeRules.push(rule);
    }

    const inline = inlineStyleOf(element);
    if (inline.unprovable) {
      return 'the patched element carries a style the analyser cannot read';
    }

    // A custom property is resolved when the fix defines it or when a rule that
    // provably matches the element defines it. A property that only an
    // ancestor may define stays unprovable.
    const definitions = customPropertyDefinitions([
      ...matchedRules.flatMap(rule => parseDeclarations(rule.declarations)),
      ...inline.declarations,
    ]);

    // The resource check may use inherited root definitions, but the effective
    // style above must not: a root value can be conditional or overridden.
    const resourceDefinitions = globalCustomPropertyDefinitions(context.rules);
    for (const [name, value] of definitions) resourceDefinitions.set(name, value);

    // The remediation's own inline style can request a resource too. Resolve
    // its custom properties before the check: an unresolved reference is
    // unprovable, never "no resource".
    for (const declaration of inline.declarations) {
      const resource = resourceState(declaration.value, resourceDefinitions);
      if (resource === 'present') {
        return "the remediation's inline style can introduce a customer-side request";
      }
      if (resource === 'unknown') {
        return "the repository stylesheet cannot be judged: a remediation resource depends on a custom property the analyser cannot resolve";
      }
    }

    const after = stateOf(
      afterRules,
      element,
      context.keyframes,
      inline.declarations,
      definitions,
      resourceDefinitions
    );
    const earlier = before ? stateOf(beforeRules, before, context.keyframes) : null;

    if (coversViewport(after)) {
      return 'the repository stylesheet can turn the patched element into a full-viewport overlay';
    }

    if (
      after.painted.coversX &&
      after.painted.coversY &&
      !(earlier?.painted.coversX && earlier.painted.coversY)
    ) {
      return 'the repository stylesheet can turn the patched element into a full-viewport overlay';
    }

    if (after.hidden) {
      return 'the repository stylesheet can hide the patched element';
    }

    if (after.painted.unprovableX && !earlier?.painted.unprovableX) {
      return 'the repository stylesheet cannot be judged: the painted width may span the viewport';
    }
    if (after.painted.unprovableY && !earlier?.painted.unprovableY) {
      return 'the repository stylesheet cannot be judged: the painted height may span the viewport';
    }

    // A rule the fix activates may reach another element or load a resource.
    // The isolated verification does not see the repository's stylesheet, so
    // neither the other element nor the request can be judged: the
    // destination is unprovable.
    const changes = changesBetween(before, element);

    // The custom properties the fix introduces: the ones an activated rule
    // defines and the ones the remediation's inline style declares.
    const introducedDefinitions = new Map<string, string>();

    // The declarations that apply to the patched element, with the rank the
    // cascade gives them. A rule the fix activates is judged against the rule
    // the browser keeps, so the cascade of the element is computed once, here.
    // A selector whose specificity cannot be read leaves the winner unknown:
    // the activated rules are then judged as they were, and the destination
    // fails closed in the cascade block below.
    const cascade = cascadeCandidates(context.rules, element, inline.declarations);
    const candidates = cascade.candidates;
    const winners = cascadeWinners(candidates);

    if (
      changes.attributes.size > 0 ||
      changes.classes.size > 0 ||
      changes.removedAttributes.size > 0 ||
      changes.removedClasses.size > 0 ||
      changes.focus ||
      changes.focusable ||
      changes.linkChanged
    ) {
      for (const rule of context.rules) {
        for (const part of splitTopLevel(rule.selector, ',')) {
          const trimmed = part.trim();
          if (!trimmed) continue;

          const compounds = splitCompounds(trimmed);
          const subject = compounds[compounds.length - 1] ?? trimmed;
          const fixActivation = compounds.map(compound => compoundActivatedByFix(compound, changes));
          if (fixActivation.includes('unprovable')) {
            return 'the repository stylesheet cannot be judged: a functional pseudo-class may activate a rule on the patched element or another element';
          }
          const activated = fixActivation.some(Boolean) ||
            compounds.some(
              compound =>
                (changes.focus || changes.focusable) && compoundActivatedByFocus(compound, element)
            );
          if (!activated) continue;

          if (matchSubject(parseSubject(subject), element) === 'no') {
            return 'the repository stylesheet can activate a rule on another element';
          }

          const declarations = parseDeclarations(rule.declarations);
          // The custom properties the activated rule defines become part of
          // the effective custom properties of the patched element.
          for (const [name, value] of customPropertyDefinitions(declarations)) {
            introducedDefinitions.set(name, value);
          }
          const ruleDefinitions = new Map(resourceDefinitions);
          for (const [name, value] of customPropertyDefinitions(declarations)) {
            ruleDefinitions.set(name, value);
          }
          // The browser keeps the declaration that wins the cascade: a rule
          // the fix activates that loses the tie does not apply to the
          // element, so it is not judged. The winner of every property the
          // activated rule declares is judged instead.
          for (const declaration of declarations) {
            const kept = cascade.unreadable ? [] : (winners.get(declaration.property) ?? []);
            const judged =
              kept.length > 0 ? kept.map(candidate => candidate.declaration) : [declaration];
            for (const judgedDeclaration of judged) {
              const harm = declarationHarm(
                [judgedDeclaration],
                ruleDefinitions,
                context.fontFaces,
                context.fontFacesComplete
              );
              if (harm) return harm;
            }
          }
        }
      }
    }

    for (const [name, value] of customPropertyDefinitions(inline.declarations)) {
      introducedDefinitions.set(name, value);
    }

    // The rules that apply to the patched element resolve their `var()`
    // references against the effective custom properties of the element: its
    // own definitions, the global ones, the ones the activated rules define
    // and the ones the remediation declares. The resolved value of a
    // declaration that reads one of them is judged like a declared value.
    if (introducedDefinitions.size > 0) {
      if (cascade.unreadable) {
        return 'the repository stylesheet cannot be judged: a selector whose specificity cannot be read';
      }
      // The custom properties the browser computes: the cascade winner of
      // every custom property. The inherited root definitions stay the
      // fallback; a property with more than one possible value leaves the
      // destination unprovable.
      const effectiveDefinitions = new Map(resourceDefinitions);
      for (const [property, declarations] of winners) {
        if (!property.startsWith('--')) continue;
        const values = new Set(declarations.map(candidate => candidate.declaration.value));
        if (values.size > 1) {
          return 'the repository stylesheet cannot be judged: a custom property has more than one possible value';
        }
        const winner = declarations[0];
        if (winner === undefined) continue;
        effectiveDefinitions.set(property, winner.declaration.value);
      }

      // The chain of custom properties the fix reaches, closed transitively: a
      // property that an applicable declaration defines while it references a
      // property already in the set joins the set.
      const chain = closeCustomPropertyChain(
        new Set(introducedDefinitions.keys()),
        candidates
      );

      // Only the declaration the browser keeps is judged.
      for (const [property, declarations] of winners) {
        if (property.startsWith('--')) continue;
        for (const candidate of declarations) {
          // A declaration that reads no property of the chain keeps the value
          // it had before the fix.
          if (!consumesCustomProperty(candidate.declaration.value, chain)) continue;
          const harm = declarationHarm(
            [candidate.declaration],
            effectiveDefinitions,
            context.fontFaces,
            context.fontFacesComplete
          );
          if (harm) return harm;
        }
      }

      // The fix must not change the value the customer already sees. A custom
      // property the element already computes is the customer's own: when the
      // fix activates a rule that wins the cascade over the rule that defined
      // it, the browser computes a different value. The analyser proves the
      // new value harmless by following it to the declarations that read it;
      // a value that no declaration reads cannot be followed, so the
      // destination is unprovable.
      if (before) {
        const beforeCascade = cascadeCandidates(
          context.rules,
          before,
          inlineStyleOf(before).declarations
        );
        if (beforeCascade.unreadable) {
          return 'the repository stylesheet cannot be judged: a selector whose specificity cannot be read';
        }
        const beforeWinners = cascadeWinners(beforeCascade.candidates);

        for (const [property, declarations] of winners) {
          if (!property.startsWith('--')) continue;
          const beforeValue = beforeWinners.get(property)?.[0]?.declaration.value;
          const afterValue = declarations[0]?.declaration.value;
          if (beforeValue === undefined || afterValue === undefined) continue;
          // The value the customer sees does not change: the fix is harmless.
          if (beforeValue === afterValue) continue;
          // Does any declaration the browser keeps read the property?
          const names = new Set([property]);
          const read = [...winners.values()].some(kept =>
            kept.some(candidate => consumesCustomProperty(candidate.declaration.value, names))
          );
          if (!read) {
            return 'the repository stylesheet cannot be judged: the fix changes a custom property the element already computes';
          }
        }
      }
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
        [...previous].sort().join('\u0000') === [...values].sort().join('\u0000');
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
