import { describe, it, expect } from 'vitest';
import {
  buildReplacement,
  containsPlaceholder,
  hasSyntaxErrors,
  htmlToJsx,
  locateElement,
  parseElementSignature,
} from '@/lib/ast-patch';

const JSX_SOURCE = `export default function Card() {
  return (
    <div className="card">
      <img src="hero.jpg" />
      <img src="hero.jpg" />
      <a href="/about">Read more</a>
    </div>
  );
}
`;

describe('parseElementSignature', () => {
  it('reads the tag and attributes of the first element', () => {
    const signature = parseElementSignature('<img src="hero.jpg" alt="Hero">');
    expect(signature?.tag).toBe('img');
    expect(signature?.attrs.src).toBe('hero.jpg');
  });

  it('returns null when there is no element', () => {
    expect(parseElementSignature('just text')).toBeNull();
    expect(parseElementSignature(null)).toBeNull();
  });
});

describe('locateElement (JSX)', () => {
  it('matches a JSX element that never appears verbatim in the source', () => {
    const location = locateElement(JSX_SOURCE, 'Card.tsx', '<img src="hero.jpg">', 0);
    expect(location).not.toBeNull();
    expect(JSX_SOURCE.slice(location!.start, location!.end)).toContain('<img src="hero.jpg" />');
  });

  it('is occurrence aware: the second occurrence resolves to the second element', () => {
    const first = locateElement(JSX_SOURCE, 'Card.tsx', '<img src="hero.jpg">', 0);
    const second = locateElement(JSX_SOURCE, 'Card.tsx', '<img src="hero.jpg">', 1);
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second!.start).toBeGreaterThan(first!.start);
  });

  it('returns null when the requested occurrence does not exist', () => {
    expect(locateElement(JSX_SOURCE, 'Card.tsx', '<img src="hero.jpg">', 5)).toBeNull();
  });

  it('does not match an element with a different source', () => {
    expect(locateElement(JSX_SOURCE, 'Card.tsx', '<img src="other.jpg">', 0)).toBeNull();
  });
});

describe('locateElement (HTML)', () => {
  const html = '<html><body><img src="a.jpg"><img src="a.jpg"></body></html>';

  it('matches the exact element text', () => {
    const location = locateElement(html, 'index.html', '<img src="a.jpg">', 0);
    expect(location).not.toBeNull();
    expect(html.slice(location!.start, location!.end)).toBe('<img src="a.jpg">');
  });

  it('resolves the nth occurrence', () => {
    const first = locateElement(html, 'index.html', '<img src="a.jpg">', 0);
    const second = locateElement(html, 'index.html', '<img src="a.jpg">', 1);
    expect(first!.start).toBeLessThan(second!.start);
    expect(second!.end - second!.start).toBe('<img src="a.jpg">'.length);
  });
});

describe('htmlToJsx', () => {
  it('renames HTML attributes to their JSX names', () => {
    expect(htmlToJsx('<div class="box">Text</div>')).toBe('<div className="box">Text</div>');
    expect(htmlToJsx('<label for="email">Email</label>')).toBe('<label htmlFor="email">Email</label>');
  });

  it('self closes void elements', () => {
    expect(htmlToJsx('<img src="a.jpg" alt="A">')).toBe('<img src="a.jpg" alt="A" />');
  });

  it('converts a style attribute into a style object', () => {
    expect(htmlToJsx('<p style="color: #fff">Text</p>')).toBe("<p style={{ color: '#fff' }}>Text</p>");
  });

  it('leaves aria and data attributes untouched', () => {
    expect(htmlToJsx('<button aria-label="Close" data-testid="x">x</button>')).toBe(
      '<button aria-label="Close" data-testid="x">x</button>'
    );
  });
});

describe('buildReplacement', () => {
  it('converts for JSX files and keeps HTML verbatim', () => {
    expect(buildReplacement('Card.tsx', '<img src="a.jpg" alt="A">')).toBe('<img src="a.jpg" alt="A" />');
    expect(buildReplacement('index.html', '<img src="a.jpg" alt="A">')).toBe('<img src="a.jpg" alt="A">');
  });
});

describe('containsPlaceholder', () => {
  it('rejects unfinished markers', () => {
    expect(containsPlaceholder('<img src="a.jpg" alt="TODO: describe this">')).toBe(true);
    expect(containsPlaceholder('<img src="a.jpg" alt="FIXME">')).toBe(true);
    expect(containsPlaceholder('<img src="a.jpg" alt="{{alt_text}}">')).toBe(true);
    expect(containsPlaceholder('<img src="a.jpg" alt="YOUR_ALT_TEXT">')).toBe(true);
  });

  it('accepts a real fix', () => {
    expect(containsPlaceholder('<img src="a.jpg" alt="Team photo">')).toBe(false);
  });
});

describe('hasSyntaxErrors', () => {
  it('detects broken JSX', () => {
    expect(hasSyntaxErrors('const a = <div>', 'a.tsx')).toBe(true);
    expect(hasSyntaxErrors('const a = <div>ok</div>;', 'a.tsx')).toBe(false);
  });

  it('does not judge plain HTML files', () => {
    expect(hasSyntaxErrors('<div>', 'index.html')).toBe(false);
  });
});
