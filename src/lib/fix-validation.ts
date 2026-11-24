// Rule-aware validation of AI-generated remediation code.
// Verifies that a fix actually addresses the WCAG rule it claims to fix,
// complementing the syntax/safety checks in github-pr.ts.

import { liveTagStarts } from '@/lib/ast-patch';
import { canonicalizeUri, parseHtmlTags } from '@/lib/html-attributes';

export interface FixValidationResult {
  valid: boolean;
  verified: boolean;
  reason?: string;
}

type Attributes = Record<string, string>;

/**
 * The attributes of the first tag the browser really creates.
 *
 * A lexical match is not enough: markup inside a raw-text element (`textarea`,
 * `title`) or inside a bogus comment is text for the browser, so a fix that
 * only exists there fixes nothing.
 */
function liveTagAttributes(html: string, tagName: string): Attributes | null {
  const live = liveTagStarts(html);
  for (const tag of parseHtmlTags(html)) {
    if (tag.name !== tagName) continue;
    if (!live.has(tag.start)) continue;
    const attrs: Attributes = {};
    for (const attribute of tag.attributes) {
      attrs[attribute.name] = attribute.value;
    }
    return attrs;
  }
  return null;
}

/** The canonical URLs of a `srcset` candidate list. */
function canonicalUriList(value: string): string[] {
  return value
    .split(',')
    .map(part => part.trim().split(/\s+/)[0] ?? '')
    .filter(candidate => candidate !== '')
    .map(candidate => canonicalizeUri(candidate))
    .sort();
}

function extractTag(html: string, tagName: string): { tag: string; attrs: Attributes } | null {
  const re = new RegExp(`<${tagName}(\\s[^>]*?)?(\\/?)>`, 'gi');
  const match = html.match(re);
  if (!match) return null;

  const tag = match[0];
  const attrText = tag.replace(new RegExp(`^<${tagName}`), '').replace(/\/?>$/, '');
  const attrs: Attributes = {};
  const attrRe = /([a-zA-Z_:][a-zA-Z0-9_:.-]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(attrText)) !== null) {
    attrs[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? '';
  }
  return { tag, attrs };
}

function hasTextContent(html: string, tagName: string): boolean {
  const re = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i');
  const match = html.match(re);
  if (!match) return false;
  const inner = match[1]
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  const generic = /^(click here|read more|learn more|more|link|here|go|this|that|page|info|click)$/i;
  return inner.length > 0 && !generic.test(inner);
}

function parseColor(value: string): { r: number; g: number; b: number } | null {
  const v = value.trim();
  let hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }
  const rgb = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) {
    return { r: +rgb[1], g: +rgb[2], b: +rgb[3] };
  }
  const named: Record<string, string> = {
    black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000',
    blue: '#0000ff', yellow: '#ffff00', gray: '#808080', grey: '#808080',
    darkgray: '#a9a9a9', darkgrey: '#a9a9a9', lightgray: '#d3d3d3', lightgrey: '#d3d3d3',
    silver: '#c0c0c0', maroon: '#800000', navy: '#000080', teal: '#008080',
    olive: '#808000', purple: '#800080', lime: '#00ff00', aqua: '#00ffff',
    fuchsia: '#ff00ff', orange: '#ffa500', pink: '#ffc0cb', brown: '#a52a2a',
  };
  return named[v.toLowerCase()] ? parseColor(named[v.toLowerCase()]!) : null;
}

function luminance(c: { r: number; g: number; b: number }): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}

export function contrastRatio(c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }): number {
  const l1 = luminance(c1);
  const l2 = luminance(c2);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

function styleValue(attrs: Attributes, prop: string): string | null {
  const style = attrs['style'] ?? '';
  const m = style.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'i'));
  return m ? m[1].trim() : null;
}

function checkColorContrast(html: string): FixValidationResult {
  const element = extractTag(html, 'img') || extractTag(html, 'a') || extractTag(html, 'div')
    || extractTag(html, 'p') || extractTag(html, 'span') || extractTag(html, 'button');
  if (!element) return { valid: false, verified: false, reason: 'no element found to validate contrast' };

  const fg = styleValue(element.attrs, 'color') ?? '#000000';
  const bg = styleValue(element.attrs, 'background-color')
    ?? styleValue(element.attrs, 'background')
    ?? '#ffffff';

  const fgColor = parseColor(fg);
  const bgColor = parseColor(bg);
  if (!fgColor || !bgColor) return { valid: true, verified: false, reason: 'colors not parseable' };

  const ratio = contrastRatio(fgColor, bgColor);
  const fontSize = styleValue(element.attrs, 'font-size');
  const sizePx = fontSize ? parseFloat(fontSize) : 16;
  const isLarge = sizePx >= 24 || (sizePx >= 18.66 && (styleValue(element.attrs, 'font-weight') ?? '') === 'bold');
  const required = isLarge ? 3 : 4.5;

  return {
    valid: ratio >= required,
    verified: true,
    reason: `contrast ratio ${ratio.toFixed(2)}:1 (needs ${required}:1)`,
  };
}

/** True when the attributes hide the element from the accessibility tree. */
function hidesFromAccessibilityTree(attrs: Attributes): boolean {
  if ((attrs['aria-hidden'] ?? '').trim().toLowerCase() === 'true') return true;
  const role = (attrs['role'] ?? '').trim().toLowerCase();
  return role === 'presentation' || role === 'none';
}

/** True when the image is decorative: it carries no content of its own. */
function isDecorativeImage(attrs: Attributes): boolean {
  return hidesFromAccessibilityTree(attrs) || attrs['alt'] === '';
}

/**
 * The element of a remediation that carries the button semantics of the rule.
 *
 * A native control, a link with an `href` and an element with `role="button"`
 * all behave like a button for the user.
 */
function buttonSemanticsOf(html: string): { name: string; attrs: Attributes } | null {
  const live = liveTagStarts(html);
  for (const tag of parseHtmlTags(html)) {
    if (!live.has(tag.start)) continue;
    const attrs: Attributes = {};
    for (const attribute of tag.attributes) {
      if (!(attribute.name in attrs)) attrs[attribute.name] = attribute.value;
    }
    const role = (attrs['role'] ?? '').trim().toLowerCase();
    if (tag.name === 'button' || tag.name === 'input' || tag.name === 'select' || tag.name === 'textarea') {
      return { name: tag.name, attrs };
    }
    if ((tag.name === 'a' || tag.name === 'area') && 'href' in attrs) {
      return { name: tag.name, attrs };
    }
    if (role === 'button') return { name: tag.name, attrs };
  }
  return null;
}

/**
 * True when the element shows text that a screen reader announces.
 *
 * The content of an `aria-hidden` element is not announced, so it is not a
 * name: `<button><span aria-hidden="true">x</span></button>` has no accessible
 * name at all.
 */
function hasAccessibleText(html: string, tagName: string): boolean {
  // The tag name has to end at the tag: `<a` must not match `<article`.
  const re = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)</${tagName}>`, 'i');
  const match = html.match(re);
  if (!match) return false;
  const inner = match[1]
    .replace(/<[^>]*aria-hidden\s*=\s*["']?true["']?[^>]*>[\s\S]*?<\/[a-zA-Z][^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  const generic = /^(click here|read more|learn more|more|link|here|go|this|that|page|info|click)$/i;
  return inner.length > 0 && !generic.test(inner);
}

/** True when the element has a name a screen reader announces. */
function hasAccessibleName(html: string, element: { name: string; attrs: Attributes }): boolean {
  const { name, attrs } = element;
  if ((attrs['aria-label'] ?? '').trim() !== '') return true;
  if ((attrs['aria-labelledby'] ?? '').trim() !== '') return true;
  if ((attrs['title'] ?? '').trim() !== '') return true;
  if (name === 'input') {
    const type = (attrs['type'] ?? 'text').trim().toLowerCase();
    if (type === 'image') return (attrs['alt'] ?? '').trim() !== '';
    if (type === 'submit' || type === 'button' || type === 'reset') {
      return (attrs['value'] ?? '').trim() !== '';
    }
  }
  // An image inside the element names it: an icon button carries its name in
  // the `alt` of the icon.
  if (/<img\b[^>]*\balt\s*=\s*["'][^"']+["']/i.test(html)) return true;
  return hasAccessibleText(html, name);
}

export function validateFixForRule(
  ruleId: string,
  remediationCode: string,
  originalElementHtml?: string | null
): FixValidationResult {
  const code = remediationCode.trim();
  if (!code) return { valid: false, verified: false, reason: 'empty remediation code' };

  const hasTag = (tag: string) => new RegExp(`<${tag}(\\s|>)`, 'i').test(code);
  const originalHadTag = (tag: string) => originalElementHtml ? new RegExp(`<${tag}(\\s|>)`, 'i').test(originalElementHtml) : false;

  switch (ruleId) {
    case 'image-alt': {
      const img = liveTagAttributes(code, 'img');
      if (!img) {
        return { valid: false, verified: false, reason: 'fix does not contain a live <img> element' };
      }
      // The fix has to keep the image the user sees: a fix that drops the
      // source leaves a broken image behind.
      if (originalElementHtml) {
        const originalImg = liveTagAttributes(originalElementHtml, 'img');
        if (originalImg) {
          if (originalImg['src'] !== undefined) {
            const kept = img['src'];
            if (kept === undefined) {
              return { valid: false, verified: true, reason: 'fix removes the image source' };
            }
            if (canonicalizeUri(kept) !== canonicalizeUri(originalImg['src'])) {
              return { valid: false, verified: true, reason: 'fix changes the image source' };
            }
          }
          if (originalImg['srcset'] !== undefined) {
            const kept = img['srcset'];
            if (kept === undefined) {
              return { valid: false, verified: true, reason: 'fix removes the image source' };
            }
            if (canonicalUriList(kept).join('|') !== canonicalUriList(originalImg['srcset']).join('|')) {
              return { valid: false, verified: true, reason: 'fix changes the image source' };
            }
          }
        }
      }
      const hasAlt = 'alt' in img;
      if (!hasAlt) return { valid: false, verified: true, reason: 'image still missing alt attribute' };

      // An image that is hidden from the accessibility tree passes the axe rule
      // because the rule no longer sees the image. A remediation may only do
      // that to an image the customer already marked as decorative: hiding the
      // very image it claims to repair is not a repair.
      if (hidesFromAccessibilityTree(img)) {
        if (originalElementHtml) {
          const originalImg = liveTagAttributes(originalElementHtml, 'img');
          if (originalImg && !isDecorativeImage(originalImg)) {
            return { valid: false, verified: true, reason: 'fix hides the image from the accessibility tree' };
          }
        }
        return { valid: true, verified: true };
      }
      if (img['alt'] !== '') {
        return { valid: true, verified: true };
      }
      // Empty alt is only valid for decorative images (explicitly marked)
      return { valid: false, verified: true, reason: 'empty alt attribute requires decorative role/aria-hidden' };
    }

    case 'button-name': {
      // A button keeps its semantics: a `div` with an `aria-label` is a box
      // with a name, not a button — it has no activation behaviour and it is
      // not in the focus order.
      const control = buttonSemanticsOf(code);
      if (!control) {
        return { valid: false, verified: false, reason: 'fix does not contain a button element' };
      }
      if (hasAccessibleName(code, control)) {
        return { valid: true, verified: true };
      }
      return { valid: false, verified: true, reason: 'button has no accessible name' };
    }

    case 'label': {
      const input = extractTag(code, 'input') || extractTag(code, 'select') || extractTag(code, 'textarea');
      if (!input) return { valid: false, verified: false, reason: 'fix does not contain a form control' };
      if ('id' in input.attrs && new RegExp(`<label[^>]*for=["']${input.attrs['id']}["']`, 'i').test(code)) {
        return { valid: true, verified: true };
      }
      if (new RegExp(`<label[^>]*>[\\s\\S]*?<input`, 'i').test(code)) {
        return { valid: true, verified: true };
      }
      if ('aria-label' in input.attrs || 'aria-labelledby' in input.attrs) {
        return { valid: true, verified: true };
      }
      return { valid: false, verified: true, reason: 'input has no associated label' };
    }

    case 'link-name': {
      const link = extractTag(code, 'a');
      if (!link) return { valid: false, verified: false, reason: 'fix does not contain an <a> element' };
      if ('aria-label' in link.attrs || 'aria-labelledby' in link.attrs) {
        return { valid: true, verified: true };
      }
      if (hasTextContent(code, 'a')) return { valid: true, verified: true };
      return { valid: false, verified: true, reason: 'link has no descriptive text or accessible name' };
    }

    case 'document-lang': {
      const htmlEl = extractTag(code, 'html');
      if (!htmlEl) return { valid: false, verified: false, reason: 'fix does not contain an <html> element' };
      if ('lang' in htmlEl.attrs && htmlEl.attrs['lang']) return { valid: true, verified: true };
      return { valid: false, verified: true, reason: '<html> still missing lang attribute' };
    }

    case 'page-title': {
      const m = code.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (!m || !m[1].trim()) return { valid: false, verified: true, reason: 'no non-empty <title> found' };
      return { valid: true, verified: true };
    }

    case 'heading-order': {
      const levels = [...code.matchAll(/<h([1-6])(\s|>)/gi)].map((mm) => parseInt(mm[1], 10));
      if (levels.length === 0) return { valid: false, verified: false, reason: 'no heading elements found' };
      for (let i = 1; i < levels.length; i++) {
        if (levels[i]! > levels[i - 1]! + 1) {
          return { valid: false, verified: true, reason: `heading level jumps from h${levels[i - 1]} to h${levels[i]}` };
        }
      }
      return { valid: true, verified: true };
    }

    case 'keyboard-navigation': {
      const interactive = extractTag(code, 'a') || extractTag(code, 'button') || extractTag(code, 'input')
        || extractTag(code, 'select') || extractTag(code, 'textarea');
      if (!interactive) return { valid: false, verified: false, reason: 'no interactive element found' };
      if ('tabindex' in interactive.attrs || hasTag('a') || hasTag('button') || hasTag('input') || hasTag('select') || hasTag('textarea')) {
        return { valid: true, verified: true };
      }
      return { valid: false, verified: true, reason: 'interactive element not keyboard focusable' };
    }

    case 'focus-visible': {
      if (/focus-visible|:focus\s*\{|outline\s*:/i.test(code)) return { valid: true, verified: true };
      return { valid: false, verified: true, reason: 'no visible focus indicator styles found' };
    }

    case 'aria-roles': {
      const el = extractTag(code, 'button') || extractTag(code, 'div') || extractTag(code, 'span');
      if (!el) return { valid: false, verified: false, reason: 'no element found' };
      const hasRole = Object.keys(el.attrs).some((k) => k === 'role' || k.startsWith('aria-'));
      if (hasRole) return { valid: true, verified: true };
      // Semantic native elements are acceptable alternatives to ARIA
      if (hasTag('button') || hasTag('a') || hasTag('input') || hasTag('select') || hasTag('textarea')) {
        return { valid: true, verified: true };
      }
      return { valid: false, verified: true, reason: 'no ARIA role/state or semantic element found' };
    }

    case 'form-error': {
      const input = extractTag(code, 'input') || extractTag(code, 'textarea');
      if (!input) return { valid: false, verified: false, reason: 'no form control found' };
      if ('aria-describedby' in input.attrs) return { valid: true, verified: true };
      if (/role="alert"|aria-live/i.test(code)) return { valid: true, verified: true };
      return { valid: false, verified: true, reason: 'error message not associated via aria-describedby' };
    }

    case 'bypass-blocks': {
      if (hasTag('a') && /href=["']#|href=["']\/?main|class=["'][^"']*skip/i.test(code)) {
        return { valid: true, verified: true };
      }
      return { valid: false, verified: true, reason: 'no skip link found' };
    }

    case 'color-contrast':
      return checkColorContrast(code);

    default:
      // Rules without a specific checker are accepted if the fix preserves the element
      if (originalHadTag('img') || originalHadTag('a') || originalHadTag('div') || originalHadTag('button')) {
        if (!hasTag('img') && !hasTag('a') && !hasTag('div') && !hasTag('button') && !hasTag('p') && !hasTag('span')) {
          return { valid: false, verified: false, reason: 'fix removed the original element' };
        }
      }
      return { valid: true, verified: false, reason: 'no rule-specific checker' };
  }
}
