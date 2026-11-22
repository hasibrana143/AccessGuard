import { describe, it, expect } from 'vitest';
import {
  buildReplacement,
  containsPlaceholder,
  countElementOccurrences,
  elementTextContent,
  hasSyntaxErrors,
  htmlToJsx,
  isPatchableFile,
  liveTagStarts,
  locateElement,
  parseElementSignature,
  preservesVisibleContent,
  visibleTextContent,
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

  it('compares the class list, so the wrong copy is not patched', () => {
    const source = '<img src="x" className="wrong" />\n<img src="x" className="right" />';
    const location = locateElement(source, 'Card.tsx', '<img src="x" class="right">', 0);

    expect(location).not.toBeNull();
    expect(source.slice(location!.start, location!.end)).toContain('className="right"');
  });

  it('does not match an element that is missing a supplied class', () => {
    const source = '<img src="x" />';
    expect(locateElement(source, 'Card.tsx', '<img src="x" class="right">', 0)).toBeNull();
  });

  it('compares aria-label, role and data-testid when the report carries them', () => {
    const source = '<button aria-label="Close" role="button" data-testid="close">x</button>';
    expect(locateElement(source, 'Card.tsx', '<button aria-label="Close" role="button" data-testid="close">', 0)).not.toBeNull();
    expect(locateElement(source, 'Card.tsx', '<button aria-label="Open" role="button" data-testid="close">', 0)).toBeNull();
    expect(locateElement(source, 'Card.tsx', '<button aria-label="Close" role="link" data-testid="close">', 0)).toBeNull();
    expect(locateElement(source, 'Card.tsx', '<button aria-label="Close" role="button" data-testid="other">', 0)).toBeNull();
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
  });

  it('rejects a replacement that replaces the text with different text', () => {
    // The new text has to keep the old text. "Read more" became "R" and the
    // fix was reported as verified and applied.
    expect(preservesVisibleContent('<a href="/about">click here</a>', '<a href="/about">About us</a>')).toBe(false);
    expect(preservesVisibleContent('<button>Read more</button>', '<button>R</button>')).toBe(false);
  });

  it('accepts a replacement that keeps the text next to more text', () => {
    expect(preservesVisibleContent('<button>Read more</button>', '<button>Read more about pricing</button>')).toBe(true);
  });

  it('accepts a replacement of an element that had no text', () => {
    expect(preservesVisibleContent('<img src="a.jpg">', '<img src="a.jpg" alt="A">')).toBe(true);
  });

  it('treats aria-hidden text as visible', () => {
    // `aria-hidden` only removes the content from the accessibility tree: the
    // user still reads it, so a fix may not delete it.
    expect(
      preservesVisibleContent(
        '<button><span aria-hidden="true">Read more</span></button>',
        '<button aria-label="Action"></button>'
      )
    ).toBe(false);
  });

  it('rejects a replacement that moves the text into a hidden element', () => {
    expect(
      preservesVisibleContent(
        '<a href="/about">Read more</a>',
        '<a href="/about" aria-label="Read more"><span hidden>Read more</span></a>'
      )
    ).toBe(false);
  });

  it('rejects a replacement that hides the text with display:none', () => {
    expect(
      preservesVisibleContent(
        '<a href="/about">Read more</a>',
        '<a href="/about"><span style="display:none">Read more</span></a>'
      )
    ).toBe(false);
  });

  it('rejects a replacement that hides the text with visibility:hidden', () => {
    expect(
      preservesVisibleContent(
        '<a href="/about">Read more</a>',
        '<a href="/about"><span style="visibility: hidden">Read more</span></a>'
      )
    ).toBe(false);
  });

  it('accepts a replacement that keeps the text in an aria-hidden element', () => {
    // `aria-hidden` removes the content from the accessibility tree only: the
    // user still reads it, so the text is not deleted.
    expect(
      preservesVisibleContent(
        '<a href="/about">Read more</a>',
        '<a href="/about"><span aria-hidden="true">Read more</span></a>'
      )
    ).toBe(true);
  });

  it('counts text that is visible next to hidden text', () => {
    // The hidden text is not visible, so the visible text of the replacement is
    // "Open" — and the original text is not kept, so the fix is rejected.
    expect(
      visibleTextContent('<a href="/about"><span hidden>Read more</span>Open</a>')
    ).toBe('Open');
    expect(
      preservesVisibleContent(
        '<a href="/about">Read more</a>',
        '<a href="/about"><span hidden>Read more</span>Open</a>'
      )
    ).toBe(false);
  });

  it('rejects a replacement that hides the text with opacity:0', () => {
    // `opacity:0` keeps the text in the DOM, so the rendered-text check does
    // not catch it; the static guard has to.
    expect(
      preservesVisibleContent(
        '<button><span>Read more</span></button>',
        '<button><span style="opacity:0">Read more</span></button>'
      )
    ).toBe(false);
    expect(
      preservesVisibleContent(
        '<button><span>Read more</span></button>',
        '<button><span style={{ opacity: \'0\' }}>Read more</span></button>'
      )
    ).toBe(false);
  });

  it('rejects a replacement whose own element hides its content', () => {
    expect(
      preservesVisibleContent(
        '<button>Read more</button>',
        '<button style="opacity:0">Read more</button>'
      )
    ).toBe(false);
  });

  it('rejects a replacement that hides the text with opacity:0!important', () => {
    // The priority suffix is not part of the value: `opacity:0!important`
    // hides the element just like `opacity:0`.
    expect(
      preservesVisibleContent(
        '<button>Read more</button>',
        '<button style="opacity:0!important">Read more</button>'
      )
    ).toBe(false);
    expect(
      preservesVisibleContent(
        '<button><span>Read more</span></button>',
        '<button><span style="opacity:0 ! important">Read more</span></button>'
      )
    ).toBe(false);
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

  it('does not match an element that only exists inside a comment', () => {
    const commented = '<html><body><!-- <img src="a.jpg"> --></body></html>';
    expect(locateElement(commented, 'index.html', '<img src="a.jpg">', 0)).toBeNull();
    expect(countElementOccurrences(commented, 'index.html', '<img src="a.jpg">')).toBe(0);
  });

  it('does not match an element that only exists inside a script block', () => {
    const scripted = '<html><body><script>const s = "<img src=\\"a.jpg\\">";</script></body></html>';
    expect(locateElement(scripted, 'index.html', '<img src="a.jpg">', 0)).toBeNull();
  });

  it('does not match an element that only exists inside an attribute value', () => {
    const nested = '<html><body><div data-markup="<img src=\'a.jpg\'>"></div></body></html>';
    expect(locateElement(nested, 'index.html', '<img src="a.jpg">', 0)).toBeNull();
  });

  it('matches the live element next to a commented one', () => {
    const mixed = '<html><body><!-- <img src="a.jpg"> --><img src="a.jpg"></body></html>';
    const location = locateElement(mixed, 'index.html', '<img src="a.jpg">', 0);
    expect(location).not.toBeNull();
    expect(countElementOccurrences(mixed, 'index.html', '<img src="a.jpg">')).toBe(1);
  });

  it('treats the tags of a raw-text element as not live', () => {
    const content = '<script>var a = "<b>";</script><b>x</b>';
    const starts = liveTagStarts(content);
    expect(starts.has(0)).toBe(false);
    expect(starts.has(content.indexOf('<b>x</b>'))).toBe(true);
  });

  it('does not match an element inside a template', () => {
    // The browser creates no element for the content of a template, so a fix
    // written there is not applied to anything the user sees.
    const content = '<html><body><template><img src="a.jpg"></template></body></html>';
    expect(locateElement(content, 'index.html', '<img src="a.jpg">', 0)).toBeNull();
    expect(countElementOccurrences(content, 'index.html', '<img src="a.jpg">')).toBe(0);
  });

  it('does not match an element inside an iframe', () => {
    // The content of an iframe is raw text for the parser: it never becomes an
    // element of the document.
    const content = '<html><body><iframe><img src="a.jpg"></iframe></body></html>';
    expect(locateElement(content, 'index.html', '<img src="a.jpg">', 0)).toBeNull();
    expect(countElementOccurrences(content, 'index.html', '<img src="a.jpg">')).toBe(0);
  });

  it('does not match an element behind a raw text end tag prefix', () => {
    // `</scripture>` is not the end of a script: the script continues and the
    // markup behind it stays raw text.
    const content = '<html><body><script></scripture><img src="a.jpg"></script></body></html>';
    expect(locateElement(content, 'index.html', '<img src="a.jpg">', 0)).toBeNull();
    expect(countElementOccurrences(content, 'index.html', '<img src="a.jpg">')).toBe(0);
  });

  it('does not match an element behind an element that is never closed', () => {
    // An unclosed script or template keeps the rest of the document as its
    // text: the browser creates no element for it.
    for (const content of [
      '<html><body><script><img src="a.jpg">',
      '<html><body><template><img src="a.jpg">',
      '<html><body><iframe><img src="a.jpg">',
    ]) {
      expect(countElementOccurrences(content, 'index.html', '<img src="a.jpg">')).toBe(0);
    }
  });
});

describe('isPatchableFile', () => {
  it('patches only the files whose context can be proven', () => {
    expect(isPatchableFile('index.html')).toBe(true);
    expect(isPatchableFile('Card.tsx')).toBe(true);
    expect(isPatchableFile('Card.jsx')).toBe(true);
    expect(isPatchableFile('app.js')).toBe(true);
    // No proven context: the element text can sit inside a string or an
    // expression there.
    expect(isPatchableFile('app.ts')).toBe(false);
    expect(isPatchableFile('app.mts')).toBe(false);
    expect(isPatchableFile('Card.vue')).toBe(false);
    expect(isPatchableFile('Card.svelte')).toBe(false);
    expect(isPatchableFile('Page.astro')).toBe(false);
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
