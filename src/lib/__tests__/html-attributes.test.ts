import { describe, it, expect } from 'vitest';
import {
  decodeHtmlEntities,
  isEventHandlerAttribute,
  normalizeUriValue,
  parseHtmlAttributes,
  parseTagAttributes,
  stripEventHandlerAttributes,
} from '@/lib/html-attributes';

describe('parseTagAttributes', () => {
  it('parses quoted, unquoted and boolean attributes', () => {
    const attributes = parseTagAttributes(' src="x.jpg" alt=A hidden data-testid="card"');

    expect(attributes.map(a => a.name)).toEqual(['src', 'alt', 'hidden', 'data-testid']);
    expect(attributes[0]?.value).toBe('x.jpg');
    expect(attributes[1]?.value).toBe('A');
    expect(attributes[2]?.value).toBe('');
    expect(attributes[3]?.value).toBe('card');
  });

  it('treats a slash before an attribute as a separator, like a browser', () => {
    const attributes = parseTagAttributes(' src=x /onerror=alert(1)');

    expect(attributes.map(a => a.name)).toEqual(['src', 'onerror']);
    expect(attributes[1]?.value).toBe('alert(1)');
  });

  it('keeps a greater-than sign inside a quoted value', () => {
    const attributes = parseTagAttributes(' title="a > b"');

    expect(attributes[0]?.value).toBe('a > b');
  });
});

describe('parseHtmlAttributes', () => {
  it('parses every tag of a snippet', () => {
    const attributes = parseHtmlAttributes('<img src="x" onerror="e()"><a href="/about">Link</a>');

    expect(attributes.map(a => a.name)).toEqual(['src', 'onerror', 'href']);
  });
});

describe('decodeHtmlEntities / normalizeUriValue', () => {
  it('decodes numeric and named entities', () => {
    expect(decodeHtmlEntities('&#106;avascript')).toBe('javascript');
    expect(decodeHtmlEntities('&#x6a;avascript')).toBe('javascript');
    expect(decodeHtmlEntities('a&b')).toBe('a&b');
  });

  it('removes the whitespace and control characters a browser ignores in a URL', () => {
    expect(normalizeUriValue('java\tscript:alert(1)')).toBe('javascript:alert(1)');
    expect(normalizeUriValue('  JAVASCRIPT:alert(1)')).toBe('javascript:alert(1)');
    expect(normalizeUriValue('&#106;avascript:alert(1)')).toBe('javascript:alert(1)');
  });
});

describe('isEventHandlerAttribute', () => {
  it('recognises event handlers and ignores "once"', () => {
    expect(isEventHandlerAttribute('onerror')).toBe(true);
    expect(isEventHandlerAttribute('ONCLICK')).toBe(true);
    expect(isEventHandlerAttribute('once')).toBe(false);
    expect(isEventHandlerAttribute('src')).toBe(false);
  });
});

describe('stripEventHandlerAttributes', () => {
  it('removes a handler and keeps the rest of the element', () => {
    expect(stripEventHandlerAttributes('<img src=x onerror=alert(1) alt="A">')).toBe(
      '<img src=x  alt="A">'
    );
  });

  it('removes a slash separated handler', () => {
    expect(stripEventHandlerAttributes('<img src=x /onerror=alert(1) alt="A">')).not.toContain('onerror');
  });

  it('leaves an element without a handler untouched', () => {
    expect(stripEventHandlerAttributes('<img src=x alt="A">')).toBe('<img src=x alt="A">');
  });
});
