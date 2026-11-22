// The repository's own stylesheets can restyle a patched element.
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

import { parseHtmlAttributes } from '@/lib/html-attributes';

/** A CSS rule: the selector and the declarations it applies. */
export interface CssRule {
  selector: string;
  declarations: string;
}

/** The rules of a stylesheet. */
export interface CssContext {
  rules: CssRule[];
}

/** The `<style>` blocks of an HTML document. */
export function extractStyleBlocks(html: string): string[] {
  const blocks: string[] = [];
  const pattern = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    blocks.push(match[1] ?? '');
  }
  return blocks;
}

/** Remove CSS comments: a comment can hide a declaration from a plain reader. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, ' ');
}

/** The offset of the `}` that closes the block opened at `open`. */
function matchingBrace(css: string, open: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < css.length; i++) {
    const char = css[i] as string;
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '{') depth++;
    else if (char === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return css.length;
}

/**
 * Every rule of a stylesheet.
 *
 * A conditional group (`@media`, `@supports`) holds rules that apply like the
 * rules around it, so its content is read as well. Other at-rules (`@font-face`,
 * `@keyframes`) hold no selector that can match an element.
 */
export function collectCssRules(css: string): CssRule[] {
  const rules: CssRule[] = [];
  const source = stripComments(css);
  let i = 0;

  while (i < source.length) {
    const open = source.indexOf('{', i);
    if (open === -1) break;
    const close = matchingBrace(source, open);
    const prelude = source.slice(i, open).trim();
    const body = source.slice(open + 1, close);

    if (prelude.startsWith('@')) {
      if (/^@(media|supports|layer|container|scope|document)\b/i.test(prelude)) {
        rules.push(...collectCssRules(body));
      }
    } else if (prelude) {
      rules.push({ selector: prelude, declarations: body });
    }
    i = close + 1;
  }

  return rules;
}

/** The rules of a stylesheet, ready to be matched against a patched element. */
export function buildCssContext(css: string): CssContext {
  return { rules: collectCssRules(css) };
}

/** The tags a snippet contains. */
function tagsOf(html: string): string[] {
  return [...html.matchAll(/<\s*([a-zA-Z][^\s/>]*)/g)].map(match => (match[1] ?? '').toLowerCase());
}

/** The attributes of every tag in a snippet, by lower-case name. */
function attributesOf(html: string): Map<string, string[]> {
  const attributes = new Map<string, string[]>();
  for (const attribute of parseHtmlAttributes(html)) {
    const values = attributes.get(attribute.name) ?? [];
    values.push(attribute.value);
    attributes.set(attribute.name, values);
  }
  return attributes;
}

/**
 * The hooks a rule can name to reach the patched element.
 *
 * `tags` are the element names, `hooks` the class tokens, ids and data
 * attribute names, `addedAttributes` the attribute names the replacement adds
 * (a rule can select on an attribute the fix introduces).
 */
interface ElementTerms {
  tags: Set<string>;
  hooks: Set<string>;
  addedAttributes: Set<string>;
}

function elementTerms(
  originalElementHtml: string | null | undefined,
  remediationCode: string | null | undefined
): ElementTerms {
  const tags = new Set<string>();
  const hooks = new Set<string>();
  const addedAttributes = new Set<string>();

  const originalAttributes = attributesOf(originalElementHtml ?? '');
  for (const tag of tagsOf(originalElementHtml ?? '')) tags.add(tag);

  const remediationAttributes = attributesOf(remediationCode ?? '');
  for (const tag of tagsOf(remediationCode ?? '')) tags.add(tag);

  for (const [name, values] of [...originalAttributes, ...remediationAttributes]) {
    if (name === 'class') {
      for (const value of values) {
        for (const token of value.split(/\s+/)) {
          if (token) hooks.add(token.toLowerCase());
        }
      }
    } else if (name === 'id') {
      for (const value of values) {
        if (value) hooks.add(value.toLowerCase());
      }
    } else if (name.startsWith('data-')) {
      hooks.add(name);
    }
  }

  for (const name of remediationAttributes.keys()) {
    if (!originalAttributes.has(name)) addedAttributes.add(name);
  }

  return { tags, hooks, addedAttributes };
}

/**
 * True when a selector can name the patched element.
 *
 * The selector is read as a list of words: a class (`.overlay`), an id
 * (`#target`), an attribute (`[aria-label]`) and a tag (`img`) are all words.
 * A word that belongs to the element makes the rule relevant; the universal
 * selector matches every element.
 */
function selectorMentions(selector: string, terms: Set<string>): boolean {
  if (selector.includes('*')) return true;
  const words = selector.toLowerCase().split(/[^a-z0-9_-]+/).filter(Boolean);
  return words.some(word => terms.has(word));
}

/** The declarations of a rule, by property. */
function parseDeclarations(body: string): Map<string, string> {
  const declarations = new Map<string, string>();
  for (const part of body.split(';')) {
    const separator = part.indexOf(':');
    if (separator === -1) continue;
    const property = part.slice(0, separator).trim().toLowerCase();
    // The priority suffix is not part of the value.
    const value = part
      .slice(separator + 1)
      .trim()
      .toLowerCase()
      .replace(/\s*!\s*important\s*$/, '')
      .trim();
    if (!property) continue;
    declarations.set(property, value);
  }
  return declarations;
}

/** The declarations of several rules, as one element would see them. */
function mergeDeclarations(rules: CssRule[]): Map<string, string> {
  const merged = new Map<string, string>();
  for (const rule of rules) {
    for (const [property, value] of parseDeclarations(rule.declarations)) {
      merged.set(property, value);
    }
  }
  return merged;
}

/**
 * True when the declarations put the element over the whole viewport.
 *
 * A positioned element that spans the viewport is an overlay: it covers the
 * page the customer sees.
 */
function coversViewport(declarations: Map<string, string>): boolean {
  const position = declarations.get('position');
  // A position behind a custom property cannot be read here: it is treated as
  // positioned, because the rule that matters is the one that hides the value.
  const positioned =
    position === undefined
      ? false
      : position === 'fixed' || position === 'absolute' || position === 'sticky' || position.includes('var(');
  if (!positioned) return false;

  const zero = (value: string | undefined) => value === '0' || value === '0px' || value === '0%';
  const inset = declarations.get('inset');
  const insetZero = inset !== undefined && /^0(\s|$)/.test(inset);
  const width = declarations.get('width');
  const height = declarations.get('height');

  const coversX =
    insetZero ||
    (zero(declarations.get('left')) && zero(declarations.get('right'))) ||
    width === '100%' ||
    width === '100vw';
  const coversY =
    insetZero ||
    (zero(declarations.get('top')) && zero(declarations.get('bottom'))) ||
    height === '100%' ||
    height === '100vh';

  return coversX && coversY;
}

/** True when the declarations hide the element and the text it holds. */
function hidesElement(declarations: Map<string, string>): boolean {
  if (declarations.get('display') === 'none') return true;
  const visibility = declarations.get('visibility');
  if (visibility === 'hidden' || visibility === 'collapse') return true;
  const opacity = declarations.get('opacity');
  if (opacity !== undefined && /^0(\.0+)?$/.test(opacity)) return true;
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
  const terms = elementTerms(originalElementHtml, remediationCode);
  if (terms.tags.size === 0 && terms.hooks.size === 0) return null;

  // A rule that names the tag can reach the element as well, but a tag rule is
  // often about a variant of the tag (`input[type=hidden]`), so it only counts
  // for the overlay, not for hiding.
  const overlayTerms = new Set([...terms.tags, ...terms.hooks, ...terms.addedAttributes]);
  const hidingTerms = new Set([...terms.hooks, ...terms.addedAttributes]);

  const overlayRules = context.rules.filter(rule => selectorMentions(rule.selector, overlayTerms));
  if (overlayRules.length > 0 && coversViewport(mergeDeclarations(overlayRules))) {
    return 'the repository stylesheet can turn the patched element into a full-viewport overlay';
  }

  const hidingRules = context.rules.filter(rule => selectorMentions(rule.selector, hidingTerms));
  if (hidingRules.length > 0 && hidesElement(mergeDeclarations(hidingRules))) {
    return 'the repository stylesheet can hide the patched element';
  }

  return null;
}
