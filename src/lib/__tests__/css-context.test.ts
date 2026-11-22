import { describe, it, expect } from 'vitest';
import { buildCssContext, collectStyleSources, destinationCssHarm, extractStyleBlocks } from '@/lib/css-context';

describe('destination CSS context', () => {
  it('extracts the style blocks of an HTML document', () => {
    expect(extractStyleBlocks('<style>.a{color:red}</style><p>x</p>')).toEqual(['.a{color:red}']);
    expect(extractStyleBlocks('<p>x</p>')).toEqual([]);
  });

  it('marks dynamic style sources instead of treating them as empty CSS', () => {
    expect(
      collectStyleSources(
        '<style>{css}</style><style dangerouslySetInnerHTML={{ __html: css }}></style>'
      )
    ).toEqual([
      { css: '{css}', dynamic: true },
      { css: '', dynamic: true },
    ]);
    expect(collectStyleSources('<style>.a{color:red}</style>')).toEqual([
      { css: '.a{color:red}', dynamic: false },
    ]);
  });

  it('finds the class rule that turns the element into an overlay', () => {
    const context = buildCssContext(
      '.overlay{position:fixed;inset:0;width:100%;height:100%;z-index:999999}'
    );
    const harm = destinationCssHarm(
      context,
      '<img id="target" src="x">',
      '<img id="target" src="x" alt="Photo" class="overlay">'
    );
    expect(harm).toContain('overlay');
  });

  it('finds the rule that hides the element', () => {
    const context = buildCssContext('.hidden{display:none}');
    const harm = destinationCssHarm(
      context,
      '<img id="target" class="hidden" src="x">',
      '<img id="target" class="hidden" src="x" alt="Photo">'
    );
    expect(harm).toContain('hide');
  });

  it('combines the rules of a utility stylesheet', () => {
    // No single rule covers the viewport: the combination does.
    const context = buildCssContext(
      '.fixed{position:fixed}.inset-0{inset:0}.w-screen{width:100vw}.h-screen{height:100vh}'
    );
    const harm = destinationCssHarm(
      context,
      '<img id="target" src="x">',
      '<img id="target" src="x" alt="Photo" class="fixed inset-0 w-screen h-screen">'
    );
    expect(harm).toContain('overlay');
  });

  it('finds a rule that reaches the element through its tag', () => {
    const context = buildCssContext('.card img{position:fixed;inset:0;width:100%;height:100%}');
    const harm = destinationCssHarm(
      context,
      '<img src="x">',
      '<img src="x" alt="Photo">'
    );
    expect(harm).toContain('overlay');
  });

  it('finds a rule that selects on an attribute the fix adds', () => {
    const context = buildCssContext('[alt]{position:fixed;inset:0;width:100%;height:100%}');
    const harm = destinationCssHarm(context, '<img src="x">', '<img src="x" alt="Photo">');
    expect(harm).toContain('overlay');
  });

  it('reads the rules inside a conditional group', () => {
    const context = buildCssContext(
      '@media (min-width: 600px){.overlay{position:fixed;inset:0;width:100%;height:100%}}'
    );
    const harm = destinationCssHarm(
      context,
      '<img id="target" src="x">',
      '<img id="target" src="x" alt="Photo" class="overlay">'
    );
    expect(harm).toContain('overlay');
  });

  it('sees through a comment that hides a declaration', () => {
    const context = buildCssContext('.overlay{position:fixed;/*inset:0*/width:100%;height:100%}');
    const harm = destinationCssHarm(
      context,
      '<img id="target" src="x">',
      '<img id="target" src="x" alt="Photo" class="overlay">'
    );
    expect(harm).toContain('overlay');
  });

  it('does not flag a rule that does not reach the element', () => {
    const context = buildCssContext(
      '.other{position:fixed;inset:0;width:100%;height:100%}.hero{border-radius:8px}'
    );
    const harm = destinationCssHarm(
      context,
      '<img id="target" class="hero" src="x">',
      '<img id="target" class="hero" src="x" alt="Photo">'
    );
    expect(harm).toBeNull();
  });

  it('does not flag a tag rule that only hides another variant of the tag', () => {
    // `input[type=hidden]` does not reach a text input.
    const context = buildCssContext('input[type=hidden]{display:none}');
    const harm = destinationCssHarm(
      context,
      '<input id="email" type="text">',
      '<input id="email" type="text" aria-label="Email">'
    );
    expect(harm).toBeNull();
  });

  it('does not flag a rule that only sets harmless properties', () => {
    const context = buildCssContext('.hero{color:#333;font-size:14px;border-radius:8px}');
    const harm = destinationCssHarm(
      context,
      '<img id="target" class="hero" src="x">',
      '<img id="target" class="hero" src="x" alt="Photo">'
    );
    expect(harm).toBeNull();
  });
});

// The sixth independent review found ten browser-valid rules the analyser read
// as harmless. Every one of them turns the patched element into a full-viewport
// overlay in the customer's page.
describe('destination CSS: the rules the browser applies', () => {
  const ORIGINAL = '<img id="target" src="x">';
  const PATCHED = '<img id="target" src="x" alt="Photo">';

  function harm(css: string, original = ORIGINAL, patched = PATCHED): string | null {
    return destinationCssHarm(buildCssContext(css), original, patched);
  }

  it('sees an escaped selector', () => {
    // `[a\6c t]` is `[alt]`.
    expect(harm('[a\\6c t]{position:fixed;inset:0;width:100%;height:100%}')).toContain('overlay');
  });

  it('sees an escaped property', () => {
    // `p\6fsition` is `position`.
    expect(harm('[alt]{p\\6fsition:fixed;inset:0;width:100%;height:100%}')).toContain('overlay');
  });

  it('sees an escaped value', () => {
    // `fix\65 d` is `fixed`.
    expect(harm('[alt]{position:fix\\65 d;inset:0;width:100%;height:100%}')).toContain('overlay');
  });

  it('sees a negated selector', () => {
    expect(harm(':not(.foo){position:fixed;inset:0;width:100%;height:100%}')).toContain('overlay');
  });

  it('sees the dynamic viewport units', () => {
    expect(harm('[alt]{position:fixed;width:100dvw;height:100dvh}')).toContain('overlay');
  });

  it('sees the minimum viewport sizing', () => {
    expect(harm('[alt]{position:fixed;min-width:100vw;min-height:100vh}')).toContain('overlay');
  });

  it('reads the two-value inset shorthand', () => {
    // `inset:0 0` sets the block edges and the inline edges, so the element
    // covers the viewport on every side.
    expect(harm('[alt]{position:fixed;inset:0 0;z-index:2147483647}')).toContain('overlay');
    expect(harm('[alt]{position:fixed;inset:0 0 0 0;z-index:2147483647}')).toContain('overlay');
    expect(harm('[alt]{position:fixed;inset:0 0 0}')).toContain('overlay');
  });

  it('reads the logical sizing properties', () => {
    // `inline-size` is the width and `block-size` is the height in a
    // horizontal writing mode.
    expect(
      harm('[alt]{position:fixed;top:0;left:0;inline-size:100vw;block-size:100vh;z-index:2147483647}')
    ).toContain('overlay');
  });

  it('composes the inline style of the patched element with the repository CSS', () => {
    // The repository positions the element; the fix sizes it. The effective
    // style is the composition of the two.
    const result = harm(
      '#target{position:fixed;z-index:2147483647}',
      '<img id="target" src="x">',
      '<img id="target" src="x" alt="Photo" style="width:100%;height:100%">'
    );
    expect(result).toContain('overlay');
  });

  it('composes the custom properties the fix defines', () => {
    // The repository reads the custom properties; the fix supplies them.
    const result = harm(
      '#target{position:var(--pos);width:var(--w);height:var(--h);z-index:var(--z)}',
      '<img id="target" src="x">',
      '<img id="target" src="x" alt="Photo" style="--pos:fixed;--w:100%;--h:100%;--z:2147483647">'
    );
    expect(result).toContain('overlay');
  });

  it('refuses a style it cannot read as CSS', () => {
    // The JSX object form is not a CSS declaration list.
    const result = harm(
      '#target{position:fixed;width:100%;height:100%}',
      '<img id="target" src="x">',
      '<img id="target" src="x" alt="Photo" style={{ width: "100%" }}>'
    );
    expect(result).toContain('cannot');
  });

  it('matches a class rule through the JSX class carrier', () => {
    // React maps `className` to the browser's `class` attribute.
    const result = harm(
      '.overlay{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647}',
      '<img id="target" src="x" />',
      '<img id="target" src="x" alt="Photo" className="overlay" />'
    );
    expect(result).toContain('overlay');
  });

  it('treats the end state of an animation as the state of the element', () => {
    // The animation ends with `opacity:0`, so the element ends invisible.
    const result = harm(
      '[alt]{animation:hide 100ms forwards}@keyframes hide{from{opacity:1}to{opacity:0}}'
    );
    expect(result).toContain('hide');
  });

  it('treats a large negative margin as off-screen', () => {
    expect(harm('[alt]{margin-left:-10000px}')).toContain('hide');
  });

  it('treats a viewport-unit translation as off-screen', () => {
    expect(harm('[alt]{translate:-100vw}')).toContain('hide');
  });

  it('refuses a custom property it cannot compute', () => {
    // The analyser cannot resolve `var()`, so the destination is unprovable and
    // no source patch may be written into it.
    const result = harm(
      ':root{--w:100vw;--h:100vh}[alt]{position:fixed;width:var(--w);height:var(--h)}'
    );
    expect(result).toContain('cannot be judged');
  });

  it('sees a nested rule', () => {
    // `&` is the parent selector: `img { &[alt] { … } }` is `img[alt]`.
    expect(harm('img { &[alt]{position:fixed;inset:0;width:100%;height:100%} }')).toContain('overlay');
    // A nested rule without `&` is a descendant of the parent.
    expect(harm('.card { img { position:fixed;inset:0;width:100%;height:100% } }')).toContain('overlay');
  });

  it('sees a rule that selects on a changed attribute value', () => {
    const result = harm(
      '[alt="Photo"]{position:fixed;inset:0;width:100%;height:100%}',
      '<img id="target" src="x" alt="Logo">',
      PATCHED
    );
    expect(result).toContain('overlay');
  });

  it('does not depend on the order the stylesheets were read in', () => {
    const first = '[alt]{width:100%;height:100%}[alt]{position:fixed;inset:0}';
    const second = '[alt]{position:fixed;inset:0}[alt]{width:100%;height:100%}';
    expect(harm(first)).toContain('overlay');
    expect(harm(second)).toContain('overlay');
  });

  it('does not read a comment opener inside a string as a comment', () => {
    // `content:"/*"` is text, not the start of a comment.
    expect(harm('[alt]{content:"/*";position:fixed;inset:0;width:100%;height:100%}')).toContain(
      'overlay'
    );
  });

  it('ignores an unchanged value it cannot compute', () => {
    // The customer's own `width:var(--w)` is not something the fix introduced.
    const result = harm(
      '.hero{width:var(--w)}',
      '<img id="target" class="hero" src="x">',
      '<img id="target" class="hero" src="x" alt="Photo">'
    );
    expect(result).toBeNull();
  });

  it('refuses a stylesheet it cannot judge', () => {
    // A preprocessor at-rule may hide any rule.
    const result = harm('@mixin overlay{position:fixed;inset:0}[alt]{width:100%}');
    expect(result).toContain('cannot be judged');
  });

  it('does not block a fix because of an animation that fades the element', () => {
    const result = harm(
      '@keyframes fade{from{opacity:0}to{opacity:1}}.hero{animation:fade 1s}',
      '<img id="target" class="hero" src="x">',
      '<img id="target" class="hero" src="x" alt="Photo">'
    );
    expect(result).toBeNull();
  });

  it('sees an animation that covers the screen', () => {
    const result = harm(
      '@keyframes full{to{position:fixed;inset:0;width:100%;height:100%}}.hero{animation:full 1s}',
      '<img id="target" class="hero" src="x">',
      '<img id="target" class="hero" src="x" alt="Photo">'
    );
    expect(result).toContain('overlay');
  });
});

describe('destination CSS: the seventh review regressions', () => {
  const ORIGINAL = '<img id="target" src="x">';
  const PATCHED = '<img id="target" src="x" alt="Photo">';

  function harm(css: string, original = ORIGINAL, patched = PATCHED): string | null {
    return destinationCssHarm(buildCssContext(css), original, patched);
  }

  function textHarm(css: string): string | null {
    return harm(
      css,
      '<p id="target">Text</p>',
      '<p id="target" aria-label="Label">Text</p>'
    );
  }

  it('reads the CSS priority suffix as the browser does', () => {
    const result = harm(
      '[alt]{position:fixed!important;inset:0;width:100%;height:100%;z-index:999999}'
    );
    expect(result).toContain('overlay');
    expect(
      harm('[alt]{position:fixed ! important;inset:0;width:100%;height:100%}')
    ).toContain('overlay');
  });

  it('recognises logical viewport units', () => {
    const result = harm(
      '[alt]{position:fixed;top:0;left:0;width:100vi;height:100vb;z-index:999999}'
    );
    expect(result).toContain('overlay');

    for (const unit of ['vw', 'vi', 'svw', 'svi', 'lvw', 'lvi']) {
      expect(harm(`[alt]{position:fixed;width:100${unit};height:100vh}`)).toContain(
        'overlay'
      );
    }
    for (const unit of ['vh', 'vb', 'svh', 'svb', 'lvh', 'lvb']) {
      expect(harm(`[alt]{position:fixed;width:100vw;height:100${unit}}`)).toContain(
        'overlay'
      );
    }
    for (const unit of ['vmin', 'vmax', 'svmin', 'svmax', 'lvmin', 'lvmax']) {
      expect(harm(`[alt]{position:fixed;width:100${unit};height:100${unit}}`)).toContain(
        'overlay'
      );
    }
  });

  it('refuses a relational selector', () => {
    const result = harm(
      'body:has(#target[alt]){position:fixed;inset:0;width:100%;height:100%;z-index:999999}'
    );
    expect(result).toContain('cannot be judged');
    expect(result).not.toBeNull();
    expect(harm(':is(body:has(#target[alt])){position:fixed}')).toContain(
      'cannot be judged'
    );
    expect(harm(':where(body:has(#target[alt])){position:fixed}')).toContain(
      'cannot be judged'
    );
  });

  it('refuses an unknown unit that the fix makes applicable', () => {
    expect(harm('[alt]{width:100unknown}')).toContain('cannot be judged');
  });

  it('refuses an unknown keyword that the fix makes applicable', () => {
    expect(harm('[alt]{position:banana}')).toContain('cannot be judged');
  });

  it('treats zero-size text as hidden', () => {
    expect(
      textHarm('[aria-label]{font-size:0;line-height:0;overflow:hidden}')
    ).toContain('hide');
  });

  it('treats content visibility hidden as hidden', () => {
    expect(textHarm('[aria-label]{content-visibility:hidden}')).toContain('hide');
  });

  it('treats a zero scale as hidden', () => {
    expect(textHarm('[aria-label]{transform:scale(0)}')).toContain('hide');
    expect(textHarm('[aria-label]{scale:0}')).toContain('hide');
  });

  it('treats a zero opacity filter as hidden', () => {
    expect(textHarm('[aria-label]{filter:opacity(0)}')).toContain('hide');
  });

  it('treats an off-screen translation as hidden', () => {
    expect(textHarm('[aria-label]{translate:-9999px}')).toContain('hide');
  });

  it('treats a large negative text indent as hidden', () => {
    expect(textHarm('[aria-label]{text-indent:-9999px}')).toContain('hide');
  });

  it('treats a zero-size element as hidden', () => {
    expect(textHarm('[aria-label]{width:0;height:0}')).toContain('hide');
  });

  it('does not apply text-only hiding rules to replaced elements', () => {
    expect(
      harm(
        '[aria-label]{font-size:0;line-height:0;overflow:hidden}',
        '<img id="target" src="x">',
        '<img id="target" src="x" aria-label="Label">'
      )
    ).toBeNull();
  });

  it('does not flag a harmless stylesheet', () => {
    expect(
      harm(
        '.hero{color:red}',
        '<img id="target" class="hero" src="x">',
        '<img id="target" class="hero" src="x" alt="Photo">'
      )
    ).toBeNull();
  });
});

// The ninth independent review found destination-CSS paths the analyser read
// as harmless: logical inset longhands, sizes larger than the viewport, rules
// the fix activates on another element, repository network resources, and the
// paint rules that make the customer content disappear.
describe('destination CSS: the ninth review regressions', () => {
  const ORIGINAL = '<img id="target" src="x">';
  const PATCHED = '<img id="target" src="x" alt="Photo">';

  function harm(css: string, original = ORIGINAL, patched = PATCHED): string | null {
    return destinationCssHarm(buildCssContext(css), original, patched);
  }

  it('reads the logical inset longhands', () => {
    const result = harm(
      '[aria-label]{position:fixed;inset-block-start:0;inset-block-end:0;inset-inline-start:0;inset-inline-end:0;z-index:2147483647}',
      '<button id="target">Text</button>',
      '<button id="target" aria-label="Label">Text</button>'
    );
    expect(result).toContain('overlay');
  });

  it('refuses a size larger than the viewport', () => {
    // The screen of the customer is unknown, so a size above it cannot be
    // computed: the destination is unprovable, never harmless.
    expect(
      harm('[alt]{position:fixed;left:0;top:0;width:9999px;height:9999px;z-index:2147483647}')
    ).toContain('cannot be judged');
    expect(
      harm('[alt]{position:fixed;left:0;top:0;width:200vw;height:200vh;z-index:2147483647}')
    ).toContain('cannot be judged');
    expect(
      harm('[alt]{position:fixed;left:0;top:0;width:100em;height:100em;z-index:2147483647}')
    ).toContain('cannot be judged');
  });

  it('refuses a rule the fix activates on another element', () => {
    // The sibling combinator starts matching as soon as the fix adds the
    // attribute, so the overlay the customer owns takes over the page.
    const result = harm(
      '[alt] ~ .overlay{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647}'
    );
    expect(result).toContain('another element');
  });

  it('refuses a resource the fix activates', () => {
    const result = harm('[alt]{background-image:url(http://127.0.0.1:9/pixel)}');
    expect(result).toContain('customer-side request');
  });

  it('treats a transparent repository colour as hidden', () => {
    const result = harm(
      '[aria-label]{color:transparent}',
      '<button id="target">Text</button>',
      '<button id="target" aria-label="Label">Text</button>'
    );
    expect(result).toContain('hide');
  });

  it('treats a logical margin that moves the element off-screen as hidden', () => {
    expect(harm('[alt]{margin-inline-start:-10000px}')).toContain('hide');
  });

  it('treats a negative positional offset as hidden', () => {
    expect(harm('[alt]{position:absolute;left:-9999px;top:0}')).toContain('hide');
  });

  it('treats a single zero dimension as hidden', () => {
    expect(harm('[alt]{width:0}')).toContain('hide');
  });

  it('treats display:contents as hidden', () => {
    expect(harm('[alt]{display:contents}')).toContain('hide');
  });

  it('reads the direction of an animation when choosing the visible frame', () => {
    // A reversed animation ends at its first frame, so the element ends
    // invisible even though the last frame is visible.
    expect(
      harm('[alt]{animation:hide 100ms reverse forwards}@keyframes hide{from{opacity:0}to{opacity:1}}')
    ).toContain('hide');
  });
});
