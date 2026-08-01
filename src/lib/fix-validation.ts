// Rule-aware validation of AI-generated remediation code.
// Verifies that a fix actually addresses the WCAG rule it claims to fix,
// complementing the syntax/safety checks in github-pr.ts.

export interface FixValidationResult {
  valid: boolean;
  verified: boolean;
  reason?: string;
}

type Attributes = Record<string, string>;

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
      const img = extractTag(code, 'img');
      if (!img) return { valid: false, verified: false, reason: 'fix does not contain an <img> element' };
      const hasAlt = 'alt' in img.attrs;
      if (!hasAlt) return { valid: false, verified: true, reason: 'image still missing alt attribute' };
      if (img.attrs['alt'] !== '' && !img.attrs['aria-hidden']) {
        return { valid: true, verified: true };
      }
      // Empty alt is only valid for decorative images (explicitly marked)
      if (img.attrs['alt'] === '' && img.attrs['role'] === 'presentation' || img.attrs['aria-hidden'] === 'true') {
        return { valid: true, verified: true };
      }
      return { valid: false, verified: true, reason: 'empty alt attribute requires decorative role/aria-hidden' };
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
