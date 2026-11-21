// Parsing helpers for the HTML that arrives from a scanned page.
//
// The browser is the reference: these helpers mirror how a browser splits
// attributes and normalises URI values, so a payload the browser would execute
// is also visible to the validator. A regex over the whole snippet is not
// enough — `<img src=x /onerror=alert(1)>` has two attributes, and
// `<a href=&#106;avascript:...>` decodes to an active scheme.

export interface ParsedAttribute {
  /** Lower-cased attribute name. */
  name: string;
  /** Attribute value (empty for a boolean attribute). */
  value: string;
  /** Offset of the attribute name in the parsed snippet. */
  start: number;
  /** Offset just after the attribute (including its value). */
  end: number;
}

// A tag and the attribute section that follows it. The attribute section stops
// at `>` but may contain quoted values with a `>` inside.
const TAG_PATTERN = /<([a-zA-Z][^\s/>]*)((?:[^>"']|"[^"]*"|'[^']*')*)/g;

/** Parse the attributes of a single tag's attribute section. */
export function parseTagAttributes(section: string): ParsedAttribute[] {
  const attributes: ParsedAttribute[] = [];
  let i = 0;

  while (i < section.length) {
    // Whitespace and `/` separate attributes.
    while (i < section.length && /[\s/]/.test(section[i] as string)) i++;
    const nameStart = i;
    while (i < section.length && !/[\s=/>]/.test(section[i] as string)) i++;
    if (i === nameStart) {
      i++;
      continue;
    }

    const name = section.slice(nameStart, i).toLowerCase();
    const start = nameStart;
    let end = i;
    let value = '';

    let cursor = i;
    while (cursor < section.length && /\s/.test(section[cursor] as string)) cursor++;
    if (section[cursor] === '=') {
      cursor++;
      while (cursor < section.length && /\s/.test(section[cursor] as string)) cursor++;
      const quote = section[cursor];
      if (quote === '"' || quote === "'") {
        cursor++;
        const valueStart = cursor;
        while (cursor < section.length && section[cursor] !== quote) cursor++;
        value = section.slice(valueStart, cursor);
        cursor++; // closing quote
      } else {
        const valueStart = cursor;
        while (cursor < section.length && !/[\s>]/.test(section[cursor] as string)) cursor++;
        value = section.slice(valueStart, cursor);
      }
      i = cursor;
      end = cursor;
    }

    attributes.push({ name, value, start, end });
  }

  return attributes;
}

/** Parse the attributes of every tag in an HTML snippet. */
export function parseHtmlAttributes(html: string): ParsedAttribute[] {
  const attributes: ParsedAttribute[] = [];
  TAG_PATTERN.lastIndex = 0;

  let tag: RegExpExecArray | null;
  while ((tag = TAG_PATTERN.exec(html)) !== null) {
    // The attribute section starts after the tag name.
    const sectionStart = tag.index + 1 + (tag[1]?.length ?? 0);
    for (const attribute of parseTagAttributes(tag[2] ?? '')) {
      attributes.push({
        ...attribute,
        start: attribute.start + sectionStart,
        end: attribute.end + sectionStart,
      });
    }
  }

  return attributes;
}

const TAB = String.fromCharCode(9);
const NEWLINE = String.fromCharCode(10);
const NBSP = String.fromCharCode(160);

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  colon: ':',
  tab: TAB,
  newline: NEWLINE,
  sol: '/',
  lpar: '(',
  rpar: ')',
  semi: ';',
  equals: '=',
  nbsp: NBSP,
};

/** Decode the HTML entities a browser decodes before it looks at a value. */
export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]*);?/gi, (match, entity: string) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith('#x') || lower.startsWith('#')) {
      const code = lower.startsWith('#x')
        ? Number.parseInt(lower.slice(2), 16)
        : Number.parseInt(lower.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return match;
      return String.fromCodePoint(code);
    }
    return NAMED_ENTITIES[lower] ?? match;
  });
}

// ASCII whitespace and control characters: a browser removes them from a URL
// before it resolves the scheme.
const URL_NOISE = new RegExp(
  '[' + String.fromCharCode(0) + '-' + String.fromCharCode(32) + String.fromCharCode(127) + ']+',
  'g'
);

/**
 * Normalise a URI value the way a browser does before it resolves the scheme:
 * entities are decoded and ASCII whitespace and control characters are removed.
 */
export function normalizeUriValue(value: string): string {
  return decodeHtmlEntities(value).replace(URL_NOISE, '').toLowerCase();
}

// `once` is the only standard attribute that starts with "on" and is not an
// event handler.
const NON_HANDLER_ON_ATTRIBUTES = new Set(['once']);

/** True when the attribute name is an event-handler content attribute. */
export function isEventHandlerAttribute(name: string): boolean {
  const lower = name.toLowerCase();
  if (NON_HANDLER_ON_ATTRIBUTES.has(lower)) return false;
  return /^on[a-z]+$/.test(lower);
}

/** Remove every event-handler attribute from an HTML snippet. */
export function stripEventHandlerAttributes(html: string): string {
  const handlers = parseHtmlAttributes(html).filter(a => isEventHandlerAttribute(a.name));
  if (handlers.length === 0) return html;

  let result = html;
  for (const handler of [...handlers].reverse()) {
    result = result.slice(0, handler.start) + result.slice(handler.end);
  }
  return result;
}
