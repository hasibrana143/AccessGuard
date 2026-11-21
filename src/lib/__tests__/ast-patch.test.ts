import { describe, it, expect } from 'vitest';
import {
  buildReplacement,
  containsPlaceholder,
  elementTextContent,
  hasSyntaxErrors,
  htmlToJsx,
  locateElement,
  parseElementSignature,
  preservesVisibleContent,
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

  it('matches every distinguishing attribute, not only the first', () => {
    const source = '<img src="x" id="a" />\n<img src="x" id="b" />';
    const location = locateElement(source, 'Card.tsx', '<img src="x" id="b">', 0);

    expect(location).not.toBeNull();
    expect(source.slice(location!.start, location!.end)).toContain('id="b"');
  });

  it('does not match an element that is missing a supplied identity attribute', () => {
    const source = '<img src="x" />';
    expect(locateElement(source, 'Card.tsx', '<img src="x" id="b">', 0)).toBeNull();
  });
});

describe('elementTextContent / preservesVisibleContent', () => {
  it('reads the visible text of an element', () => {
    expect(elementTextContent('<a href="/about">Read more</a>')).toBe('Read more');
    expect(elementTextContent('<button><span>Save</span></button>')).toBe('Save');
  });

  it('treats void and self-closing elements as having no text', () => {
    expect(elementTextContent('<img src="a.jpg">')).toBe('');
    expect(elementTextContent('<img src="a.jpg" />')).toBe('');
  });

  it('rejects a replacement that empties the element', () => {
    expect(preservesVisibleContent('<a href="/about">Read more</a>', '<a href="/about" aria-label="Read more"></a>')).toBe(false);
  });

  it('accepts a replacement that keeps text', () => {
    expect(preservesVisibleContent('<a href="/about">Read more</a>', '<a href="/about">Read more</a>')).toBe(true);
    expect(preservesVisibleContent('<a href="/about">click here</a>', '<a href="/about">About us</a>')).toBe(true);
  });

  it('accepts a replacement of an element that had no text', () => {
    expect(preservesVisibleContent('<img src="a.jpg">', '<img src="a.jpg" alt="A">')).toBe(true);
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

describe('attribute forms', () => {
  it('reads single-quoted, unquoted and valueless attributes', () => {
    expect(parseElementSignature("<img src='a.jpg'>")?.attrs.src).toBe('a.jpg');
    expect(parseElementSignature('<img src=a.jpg>')?.attrs.src).toBe('a.jpg');
    expect(parseElementSignature('<input disabled>')?.attrs.disabled).toBe('');
  });

  it('canonicalises JSX attribute names', () => {
    const signature = parseElementSignature('<div className="box" htmlFor="email"></div>');
    expect(signature?.attrs.class).toBe('box');
    expect(signature?.attrs.for).toBe('email');
  });

  it('reads JSX attributes written as an expression or without a value', () => {
    const source = `const view = (
      <div>
        <input disabled />
        <img src={url} alt={"Photo"} />
      </div>
    );`;

    // A valueless attribute carries no identity, so the element still matches.
    expect(locateElement(source, 'a.tsx', '<input disabled>', 0)).not.toBeNull();
    // A string expression is read as its value.
    expect(locateElement(source, 'a.tsx', '<img alt="Photo">', 0)).not.toBeNull();
    // An expression that is not a string is not an identity value.
    expect(locateElement(source, 'a.tsx', '<img src="url">', 0)).toBeNull();
  });

  it('keeps boolean attributes and drops valueless non-boolean attributes', () => {
    expect(htmlToJsx('<input disabled>')).toBe('<input disabled />');
    expect(htmlToJsx('<div data-x>text</div>')).toBe('<div>text</div>');
  });
});

describe('class list fallback', () => {
  const source = '<div class="card wide">x</div>\n<div class="other">y</div>';

  it('matches on the class list when the report carries no distinguishing attribute', () => {
    const location = locateElement(source, 'Card.tsx', '<div class="card">', 0);
    expect(location).not.toBeNull();
    expect(source.slice(location!.start, location!.end)).toContain('card wide');
  });

  it('does not match an element with a different class list', () => {
    expect(locateElement(source, 'Card.tsx', '<div class="card">', 1)).toBeNull();
  });

  it('does not filter on a blank class list', () => {
    expect(locateElement(source, 'Card.tsx', '<div class=" ">', 0)).not.toBeNull();
  });
});

describe('locateElement edge cases', () => {
  const html = '<html><body><img src="a.jpg"></body></html>';

  it('returns null for an empty or non-element snippet', () => {
    expect(locateElement(html, 'index.html', '', 0)).toBeNull();
    expect(locateElement(JSX_SOURCE, 'Card.tsx', 'not an element', 0)).toBeNull();
  });

  it('matches the trimmed element text when the raw snippet is absent', () => {
    const location = locateElement(html, 'index.html', '  <img src="a.jpg">  ', 0);
    expect(location).not.toBeNull();
  });

  it('returns null when the element is not in the file', () => {
    expect(locateElement(html, 'index.html', '<img src="b.jpg">', 0)).toBeNull();
  });
});

describe('style allow-list', () => {
  it('drops declarations that could escape the JS expression', () => {
    expect(htmlToJsx('<p style="color: {red}">x</p>')).toBe('<p style={{  }}>x</p>');
    expect(htmlToJsx('<p style="background: url(x)">x</p>')).toBe('<p style={{  }}>x</p>');
    expect(htmlToJsx('<p style="width: expression(1)">x</p>')).toBe('<p style={{  }}>x</p>');
    expect(htmlToJsx('<p style="2bad: red">x</p>')).toBe('<p style={{  }}>x</p>');
    expect(htmlToJsx('<p style="color">x</p>')).toBe('<p style={{  }}>x</p>');
    expect(htmlToJsx('<p style="color:">x</p>')).toBe('<p style={{  }}>x</p>');
  });
});

describe('elementTextContent edge cases', () => {
  it('returns an empty string for text that is not an element', () => {
    expect(elementTextContent('plain text')).toBe('');
  });

  it('returns an empty string for a self-closing non-void element', () => {
    expect(elementTextContent('<div />')).toBe('');
  });

  it('returns an empty string for an element that is never closed', () => {
    expect(elementTextContent('<div>unclosed')).toBe('');
  });
});
