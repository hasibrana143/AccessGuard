import { describe, it, expect } from 'vitest';
import {
  analyzeStylesheetLinks,
  buildCssContext,
  collectStyleSources,
  destinationCssHarm,
  extractStyleBlocks,
  extractStylesheetLinks,
} from '@/lib/css-context';

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

  it('keeps a dynamic pseudo-class harmless', () => {
    // `:hover` is not a functional pseudo-class: what it matches does not
    // depend on what the fix changes, so the rule is not a transition.
    expect(harm('a:hover{color:red}')).toBeNull();
    expect(harm('div:focus-within{color:red}')).toBeNull();
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

describe('destination CSS: the tenth review regressions', () => {
  const ORIGINAL = '<img id="target" src="x">';
  const PATCHED = '<img id="target" src="x" alt="Photo">';
  const INPUT = '<input id="target" type="text">';
  const FOCUSED = '<input id="target" type="text" aria-label="Name" autofocus>';

  function harm(css: string, original = ORIGINAL, patched = PATCHED): string | null {
    return destinationCssHarm(buildCssContext(css), original, patched);
  }

  it('decodes an escaped attribute name the way the browser decodes it', () => {
    // `[a\6ct]` is `[alt]`, so the rule starts matching when the fix lands.
    expect(
      harm('[a\\6ct]{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647;background:#f0f}')
    ).toContain('overlay');
  });

  it('composes a scale above one into the painted box', () => {
    expect(
      harm('[alt]{position:fixed;width:50vw;height:50vh;scale:3;background:#f0f}')
    ).toContain('overlay');
  });

  it('composes a border into the painted box', () => {
    expect(
      harm('[alt]{position:fixed;width:50vw;height:50vh;border:10000px solid #f0f}')
    ).not.toBeNull();
  });

  it('composes a padding into the painted box', () => {
    expect(
      harm('[alt]{position:fixed;padding:10000px;background:#f0f}')
    ).not.toBeNull();
  });

  it('does not flag a box that grows a little', () => {
    expect(
      harm('[alt]{padding:4px;border:1px solid #ccc;scale:1}')
    ).toBeNull();
  });

  it('judges a rule the added autofocus activates on another element', () => {
    expect(
      harm(
        'input:focus ~ .overlay{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647;background:#f0f}',
        INPUT,
        FOCUSED
      )
    ).toContain('another element');
  });

  it('does not flag a focus rule that only draws an outline', () => {
    expect(
      harm('input:focus{outline:2px solid #06c}', INPUT, FOCUSED)
    ).toBeNull();
  });

  it('judges a paused animation on the frame the customer sees', () => {
    // A paused animation stays on its first frame, so the element is invisible.
    expect(
      harm('[alt]{animation:hide 1s paused}@keyframes hide{from{opacity:0}to{opacity:1}}')
    ).toContain('hide');
  });

  it('does not flag a running animation that ends visible', () => {
    expect(
      harm('[alt]{animation:hide 1s running}@keyframes hide{from{opacity:0}to{opacity:1}}')
    ).toBeNull();
  });

  it('refuses a focus rule that loads a resource in the customer browser', () => {
    expect(
      harm('input:focus{background-image:url(http://127.0.0.1:9/focus-pixel)}', INPUT, FOCUSED)
    ).toContain('customer-side request');
  });
});

describe('destination CSS: the eleventh review regressions', () => {
  const ORIGINAL = '<img id="target" src="x">';
  const PATCHED = '<img id="target" src="x" alt="Photo">';

  function harm(css: string, original = ORIGINAL, patched = PATCHED): string | null {
    return destinationCssHarm(buildCssContext(css), original, patched);
  }

  function labelHarm(css: string): string | null {
    return harm(
      css,
      '<button id="target">Text</button>',
      '<button id="target" aria-label="Label">Text</button>'
    );
  }

  it('reads the frame of a paused animation with a negative delay', () => {
    const keyframes =
      '@keyframes hide{0%{opacity:1}40%{opacity:0}60%{opacity:1}100%{opacity:1}}';
    expect(
      labelHarm(
        `[aria-label]{animation-name:hide;animation-duration:1s;animation-delay:-0.4s;animation-play-state:paused}${keyframes}`
      )
    ).toContain('hide');
    expect(
      labelHarm(`[aria-label]{animation:hide 1s -0.4s paused}${keyframes}`)
    ).toContain('hide');
  });

  it('reads the backwards fill of a running animation with a positive delay', () => {
    const keyframes = '@keyframes hide{0%{opacity:0}100%{opacity:1}}';
    expect(
      labelHarm(
        `[aria-label]{animation-name:hide;animation-duration:1s;animation-delay:1s;animation-fill-mode:backwards}${keyframes}`
      )
    ).toContain('hide');
    expect(
      labelHarm(`[aria-label]{animation:hide 1s 1s backwards}${keyframes}`)
    ).toContain('hide');
  });

  it('does not flag a positive delay without the backwards fill', () => {
    expect(
      labelHarm(
        '[aria-label]{animation-name:hide;animation-duration:1s;animation-delay:1s;animation-fill-mode:none}@keyframes hide{0%{opacity:0}100%{opacity:1}}'
      )
    ).toBeNull();
  });

  it('does not flag a running animation that ends visible', () => {
    expect(
      labelHarm(
        '[aria-label]{animation:hide 1s running}@keyframes hide{from{opacity:0}to{opacity:1}}'
      )
    ).toBeNull();
  });

  it('refuses an animation whose timing it cannot read', () => {
    expect(
      labelHarm(
        '[aria-label]{animation-name:hide;animation-duration:unknown;animation-delay:-0.4s;animation-play-state:paused}@keyframes hide{0%{opacity:1}40%{opacity:0}}'
      )
    ).toContain('cannot be judged');
    expect(
      labelHarm(
        '[aria-label]{animation-name:hide;animation-duration:1s;animation-delay:unknown;animation-play-state:paused}@keyframes hide{0%{opacity:1}40%{opacity:0}}'
      )
    ).toContain('cannot be judged');
  });

  it('resolves an inherited custom property before the resource check', () => {
    const result = labelHarm(
      ':root{--pixel:url(http://127.0.0.1:9/pixel)}[aria-label]{background-image:var(--pixel)}'
    );
    expect(result).toContain('customer-side request');
  });

  it('does not flag an inherited custom property without a resource', () => {
    expect(
      harm(
        ':root{--brand:#06c}[alt]{color:var(--brand)}',
        '<img id="target" src="x" alt="">',
        '<img id="target" src="x" alt="Photo">'
      )
    ).toBeNull();
  });

  it('refuses an activated resource with an unresolved custom property', () => {
    expect(
      labelHarm('[aria-label]{background-image:var(--missing)}')
    ).toContain('cannot be judged');
  });

  it('treats a zero maximum size with clipping as hidden', () => {
    expect(labelHarm('[aria-label]{max-height:0;overflow:hidden}')).toContain('hide');
    expect(labelHarm('[aria-label]{max-width:0;overflow:clip}')).toContain('hide');
    expect(labelHarm('[aria-label]{max-height:0;overflow-y:hidden}')).toContain('hide');
    expect(labelHarm('[aria-label]{max-width:0;overflow-x:clip}')).toContain('hide');
  });

  it('does not flag a maximum size that does not remove the control', () => {
    expect(labelHarm('[aria-label]{max-height:100px;overflow:hidden}')).toBeNull();
    expect(labelHarm('[aria-label]{max-height:0;overflow:visible}')).toBeNull();
    expect(labelHarm('[aria-label]{max-height:none;overflow:hidden}')).toBeNull();
  });

  it('composes box-shadow into the painted surface', () => {
    expect(
      harm('[alt]{position:fixed;width:1px;height:1px;box-shadow:0 0 0 10000px #f0f}')
    ).not.toBeNull();
    expect(
      harm('[alt]{width:1px;height:1px;box-shadow:0 0 0 10000px #f0f}')
    ).not.toBeNull();
  });

  it('does not flag a small box shadow', () => {
    expect(
      harm('[alt]{width:50px;height:20px;box-shadow:0 1px 2px rgba(0,0,0,.2)}')
    ).toBeNull();
  });

  it('does not flag a box shadow of none', () => {
    expect(
      harm('[alt]{position:fixed;width:1px;height:1px;box-shadow:none}')
    ).toBeNull();
  });

  it('does not count an inset box shadow as outside growth', () => {
    expect(
      harm('[alt]{position:fixed;width:1px;height:1px;box-shadow:inset 0 0 0 10000px #f0f}')
    ).toBeNull();
  });

  it('refuses an aspect ratio that fills an undeclared axis', () => {
    expect(harm('[alt]{position:fixed;width:100%;aspect-ratio:1}')).not.toBeNull();
  });

  it('does not flag an aspect ratio with both axes declared', () => {
    expect(
      harm('[alt]{position:fixed;width:100px;height:50px;aspect-ratio:16/9}')
    ).toBeNull();
    expect(harm('[alt]{position:fixed;width:100px;height:50px;aspect-ratio:auto}')).toBeNull();
  });

  it('refuses an unconstrained scale', () => {
    expect(harm('[alt]{position:fixed;scale:100}')).not.toBeNull();
  });

  it('does not flag a scale of one', () => {
    expect(harm('[alt]{position:fixed;width:50vw;height:50vh;scale:1}')).toBeNull();
    expect(harm('[alt]{padding:4px;border:1px solid #ccc;scale:1}')).toBeNull();
  });

  it('composes zoom into the painted box', () => {
    expect(harm('[alt]{position:fixed;zoom:3}')).not.toBeNull();
    expect(
      harm('[alt]{position:fixed;left:0;top:0;width:50vw;height:50vh;zoom:3}')
    ).not.toBeNull();
    expect(harm('[alt]{position:fixed;zoom:normal}')).not.toBeNull();
  });

  it('does not flag a zoom of one', () => {
    expect(harm('[alt]{position:fixed;zoom:1}')).toBeNull();
  });

  it('reads the logical padding and border longhands', () => {
    expect(
      harm(
        '[alt]{position:fixed;left:0;top:0;padding-inline-start:10000px;padding-block-start:10000px}'
      )
    ).not.toBeNull();
    expect(
      harm('[alt]{position:fixed;border-inline-start-width:10000px}')
    ).not.toBeNull();
    expect(harm('[alt]{position:fixed;border-inline:10000px solid #f0f}')).not.toBeNull();
  });

  it('does not flag a logical box that grows a little', () => {
    expect(
      harm(
        '[alt]{position:fixed;padding-inline-start:4px;padding-block-start:4px;border-inline-start-width:1px}'
      )
    ).toBeNull();
  });
});

describe('destination CSS: the twelfth review regressions', () => {
  function harm(css: string, original: string, patched: string): string | null {
    return destinationCssHarm(buildCssContext(css), original, patched);
  }

  it('judges a sibling rule activated through an :is() argument', () => {
    const result = harm(
      'input:is([aria-label]) ~ .overlay{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647;background:#f0f}',
      '<input id="target" type="text">',
      '<input id="target" type="text" aria-label="Name">'
    );
    expect(result).toContain('another element');
  });

  it('judges a sibling rule activated by removing a class from a :not() argument', () => {
    const result = harm(
      '#target:not(.card) ~ .overlay{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647;background:#f0f}',
      '<img id="target" class="card" src="x">',
      '<img id="target" src="x" alt="Photo">'
    );
    expect(result).toContain('another element');
  });

  it('judges a sibling rule activated by removing an attribute from a :not() argument', () => {
    const result = harm(
      '#target:not([data-state]) ~ .overlay{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647;background:#f0f}',
      '<img id="target" data-state="ready" src="x">',
      '<img id="target" src="x" alt="Photo">'
    );
    expect(result).toContain('another element');
  });

  it('does not activate a :not() argument while its attribute remains', () => {
    const result = harm(
      '#target:not([data-state]) ~ .overlay{position:fixed;inset:0;width:100%;height:100%}',
      '<img id="target" data-state="ready" src="x">',
      '<img id="target" data-state="ready" src="x" alt="Photo">'
    );
    expect(result).toBeNull();
  });

  it('judges a sibling rule activated through a :where() argument', () => {
    const result = harm(
      'input:where([aria-label]) ~ .overlay{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647;background:#f0f}',
      '<input id="target" type="text">',
      '<input id="target" type="text" aria-label="Name">'
    );
    expect(result).toContain('another element');
  });

  it('does not activate an :is() argument for a different attribute value', () => {
    const result = harm(
      'input:is([aria-label="Other"]) ~ .overlay{position:fixed;inset:0;width:100%;height:100%}',
      '<input id="target" type="text">',
      '<input id="target" type="text" aria-label="Name">'
    );
    expect(result).toBeNull();
  });

  it('does not activate a :not() argument while its class remains', () => {
    const result = harm(
      '#target:not(.card) ~ .overlay{position:fixed;inset:0;width:100%;height:100%}',
      '<img id="target" class="card" src="x">',
      '<img id="target" class="card" src="x" alt="Photo">'
    );
    expect(result).toBeNull();
  });

  it('judges a sibling rule activated when the fix adds tabindex', () => {
    const result = harm(
      'div[role="button"]:focus ~ .overlay{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647;background:#f0f}',
      '<div id="target" role="button"><span aria-hidden="true">x</span></div>',
      '<div id="target" role="button" aria-label="Name" tabindex="0"><span aria-hidden="true">x</span></div>'
    );
    expect(result).toContain('another element');
  });

  it('does not flag a focus rule that only draws an outline after tabindex is added', () => {
    const result = harm(
      'div[role="button"]:focus{outline:2px solid #06c}',
      '<div id="target" role="button"><span aria-hidden="true">x</span></div>',
      '<div id="target" role="button" aria-label="Name" tabindex="0"><span aria-hidden="true">x</span></div>'
    );
    expect(result).toBeNull();
  });

  it('refuses a non-positioned element whose scale may cover the viewport', () => {
    const result = harm(
      '[alt]{scale:100;background:#f0f}',
      '<img id="target" src="x" width="64" height="64">',
      '<img id="target" src="x" width="64" height="64" alt="Photo">'
    );
    expect(result).toContain('cannot be judged');
  });

  it('refuses a non-positioned element whose painted box covers the viewport', () => {
    const result = harm(
      '[alt]{width:100%;height:100%;background:#f0f}',
      '<img id="target" src="x" width="64" height="64">',
      '<img id="target" src="x" width="64" height="64" alt="Photo">'
    );
    expect(result).toContain('overlay');
  });

  it('does not flag benign non-positioned paint changes', () => {
    const original = '<img id="target" src="x" width="64" height="64">';
    const patched = '<img id="target" src="x" width="64" height="64" alt="Photo">';

    for (const css of [
      '[alt]{scale:1}',
      '[alt]{padding:4px}',
      '[alt]{border:1px solid #ccc}',
      '[alt]{width:50px;height:20px;box-shadow:0 1px 2px rgba(0,0,0,.2)}',
      '[alt]{width:50px;height:20px;box-shadow:none}',
      '[alt]{width:50px;height:20px;box-shadow:inset 0 0 0 10000px #f0f}',
      '[alt]{zoom:1}',
    ]) {
      expect(harm(css, original, patched)).toBeNull();
    }
  });

  it('treats a large positive relative offset as off-screen', () => {
    const result = harm(
      '[alt]{position:relative;left:9999px;background:#f0f}',
      '<img id="target" src="x" width="64" height="64">',
      '<img id="target" src="x" width="64" height="64" alt="Photo">'
    );
    expect(result).toContain('hide');
  });

  it('treats a large positive margin as off-screen', () => {
    const result = harm(
      '[alt]{margin-left:9999px;background:#f0f}',
      '<img id="target" src="x" width="64" height="64">',
      '<img id="target" src="x" width="64" height="64" alt="Photo">'
    );
    expect(result).toContain('hide');
  });

  it('does not flag a small margin', () => {
    const result = harm(
      '[alt]{margin:4px;background:#f0f}',
      '<img id="target" src="x" width="64" height="64">',
      '<img id="target" src="x" width="64" height="64" alt="Photo">'
    );
    expect(result).toBeNull();
  });
});

describe('destination CSS: the thirteenth review regressions', () => {
  function harm(css: string, original: string, patched: string): string | null {
    return destinationCssHarm(buildCssContext(css), original, patched);
  }

  it('judges a sibling rule activated by a negated attribute value change', () => {
    const css =
      '#target:not([data-state="active"]) ~ .overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}';
    const original = '<img id="target" data-state="active" src="x">';
    const patched = '<img id="target" data-state="safe" src="x" alt="Photo">';

    expect(harm(css, original, patched)).not.toBeNull();
    expect(
      harm(css, original, '<img id="target" data-state="active" src="x" alt="Photo">')
    ).toBeNull();
  });

  it('judges a sibling rule activated by an nth-child selector list', () => {
    const css =
      'img:nth-child(1 of [alt]) ~ .overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}';
    const original = '<img id="target" src="x">';
    const patched = '<img id="target" src="x" alt="Photo">';

    expect(harm(css, original, patched)).not.toBeNull();
    expect(
      harm(
        'img:nth-last-child(1 of [alt]) ~ .overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}',
        original,
        patched
      )
    ).not.toBeNull();
    expect(
      harm(
        'img:nth-child(1 of [src]) ~ .overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}',
        original,
        patched
      )
    ).toBeNull();
  });

  it('judges a sibling rule activated by a nested negation', () => {
    const css =
      '#target:not(:not([alt])) ~ .overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}';
    const original = '<img id="target" src="x">';
    const patched = '<img id="target" src="x" alt="Photo">';

    expect(harm(css, original, patched)).not.toBeNull();
    expect(
      harm(
        '#target:not(:not([data-state="active"])) ~ .overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}',
        '<img id="target" data-state="active" src="x">',
        '<img id="target" data-state="active" src="x" alt="Photo">'
      )
    ).toBeNull();
  });

  it('refuses a functional pseudo-class whose transition it cannot read', () => {
    const result = harm(
      'img:lang(en) ~ .overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}',
      '<img id="target" src="x" lang="fr">',
      '<img id="target" src="x" lang="en" alt="Photo">'
    );
    expect(result).toContain('cannot be judged');
  });

  it('judges a sibling rule activated by an added anchor href', () => {
    const css =
      'a:focus ~ .overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}';
    const original = '<a id="target">Text</a>';
    const patched = '<a id="target" href="#main" aria-label="Text">Text</a>';

    expect(harm(css, original, patched)).not.toBeNull();
    expect(
      harm(
        css,
        '<a id="target" href="#main">Text</a>',
        '<a id="target" href="#main" aria-label="Text">Text</a>'
      )
    ).toBeNull();
  });

  it('judges a sibling rule activated by added contenteditable', () => {
    const css =
      'div:focus ~ .overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}';

    expect(
      harm(
        css,
        '<div id="target">Text</div>',
        '<div id="target" contenteditable aria-label="Label">Text</div>'
      )
    ).not.toBeNull();
    expect(
      harm(
        css,
        '<div id="target" contenteditable="false">Text</div>',
        '<div id="target" contenteditable="false" aria-label="Label">Text</div>'
      )
    ).toBeNull();
  });

  it('judges a sibling rule activated by a focusable tabindex value change', () => {
    const css =
      'div:focus ~ .overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}';

    expect(
      harm(
        css,
        '<div id="target" tabindex="-1">Text</div>',
        '<div id="target" tabindex="0" aria-label="Label">Text</div>'
      )
    ).not.toBeNull();
    expect(
      harm(
        css,
        '<div id="target" tabindex="-1">Text</div>',
        '<div id="target" tabindex="-1" aria-label="Label">Text</div>'
      )
    ).toBeNull();
  });

  it('composes a large outline into the painted surface', () => {
    const original = '<img id="target" src="x" width="64" height="64">';
    const patched = '<img id="target" src="x" width="64" height="64" alt="Photo">';

    expect(harm('[alt]{outline:100000px solid #f0f}', original, patched)).not.toBeNull();
    expect(harm('[alt]{outline:2px solid #06c}', original, patched)).toBeNull();
    expect(
      harm('[alt]{outline:calc(100000px + 1px) solid #f0f}', original, patched)
    ).toContain('cannot be judged');
    expect(
      harm('[alt]{outline:2px solid #f0f;outline-offset:calc(1px + 1px)}', original, patched)
    ).toContain('cannot be judged');
  });

  it('treats large inset shorthands as off-screen', () => {
    const original = '<img id="target" src="x" width="64" height="64">';
    const patched = '<img id="target" src="x" width="64" height="64" alt="Photo">';

    expect(harm('[alt]{position:relative;inset:-9999px;background:#f0f}', original, patched)).toContain(
      'hide'
    );
    expect(
      harm('[alt]{position:relative;inset-block:-9999px;background:#f0f}', original, patched)
    ).toContain('hide');
    expect(
      harm('[alt]{position:relative;inset-inline:-9999px;background:#f0f}', original, patched)
    ).toContain('hide');
    expect(
      harm('[alt]{position:relative;inset:9999px;background:#f0f}', original, patched)
    ).toContain('hide');
    expect(harm('[alt]{position:relative;inset:4px;background:#f0f}', original, patched)).toBeNull();
  });
});

describe('destination CSS: the fourteenth review regressions', () => {
  function harm(css: string, original: string, patched: string): string | null {
    return destinationCssHarm(buildCssContext(css), original, patched);
  }

  it('14-H2a decodes an entity-encoded stylesheet rel attribute', () => {
    const html =
      '<html><head><link rel="styles&#x68;eet" href="theme.bin"></head><body><img id="target" src="x"></body></html>';
    const result = analyzeStylesheetLinks(html);

    expect(result.links).toEqual(['theme.bin']);
    expect(result.unprovable).toEqual([]);
    expect(extractStylesheetLinks(html)).toEqual(['theme.bin']);
  });

  it('14-H2b reads a stylesheet link after a quoted greater-than sign', () => {
    const result = analyzeStylesheetLinks(
      '<html><head><link title=">" rel="stylesheet" href="theme.bin"></head><body><img id="target" src="x"></body></html>'
    );

    expect(result.links).toEqual(['theme.bin']);
    expect(result.unprovable).toEqual([]);
  });

  it('14-H2c refuses a stylesheet link whose attributes cannot be read', () => {
    const result = analyzeStylesheetLinks(
      '<html><head><link rel="stylesheet" href="theme.bin</head><body></body></html>'
    );

    expect(result.links).toEqual([]);
    expect(result.unprovable).not.toEqual([]);
  });

  it('14-H2d decodes an entity-encoded stylesheet href attribute', () => {
    const result = analyzeStylesheetLinks(
      '<link rel="stylesheet" href="theme.bin?x=1&#38;y=2">'
    );

    expect(result.links).toEqual(['theme.bin?x=1&y=2']);
    expect(result.unprovable).toEqual([]);
  });

  it('14-H4a refuses an introduced element when repository CSS is structural', () => {
    const css =
      'img:nth-child(2) ~ #overlay{position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;background:#f0f}';
    const original = '<img id="target" src="x">';
    const introduced = '<span aria-hidden="true">x</span><img id="target" src="x" alt="Photo">';

    expect(harm(css, original, introduced)).toContain('cannot be judged');
    expect(harm(css, original, '<img id="target" src="x" alt="Photo">')).toBeNull();
    expect(harm('[data-label="a ~ b"]{color:red}', original, introduced)).toBeNull();
  });

  it('14-H4b refuses a remediation that removes an original element', () => {
    const original = '<div id="target"><span id="child">Text</span></div>';

    expect(
      harm('.hero{color:red}', original, '<div id="target" aria-label="Label"></div>')
    ).toContain('cannot be judged');
    expect(
      harm(
        '.hero{color:red}',
        original,
        '<div id="target" aria-label="Label"><span id="child">Text</span></div>'
      )
    ).toBeNull();
  });

  it('14-H4c keeps a remediation that changes the attributes of a child it keeps', () => {
    // The child is the same element with a new attribute: it was neither
    // removed nor introduced, so the fix stays writable.
    const original = '<div id="target"><span id="child">Text</span></div>';

    expect(
      harm(
        '.hero{color:red}',
        original,
        '<div id="target" aria-label="Label"><span id="child" aria-hidden="true">Text</span></div>'
      )
    ).toBeNull();
  });

  it('14-H4d keeps a remediation of an element without an id that has children', () => {
    const original = '<a href="/about"><span aria-hidden="true">Read more</span></a>';

    expect(
      harm(
        '.hero{color:red}',
        original,
        '<a href="/about" aria-label="Read more"><span aria-hidden="true">Read more</span></a>'
      )
    ).toBeNull();
  });

  it('14-M2a refuses an inline style that resolves to a resource', () => {
    const result = harm(
      ':root{--pixel:url(/pixel)}',
      '<img id="target" src="x">',
      '<img id="target" src="x" alt="Photo" style="background-image:var(--pixel)">'
    );

    expect(result).toContain('customer-side request');
  });

  it('14-M2b refuses an inline image-set resource', () => {
    const result = harm(
      '.hero{color:red}',
      '<img id="target" src="x">',
      '<img id="target" src="x" alt="Photo" style="background-image:image-set(\'/pixel\')">'
    );

    expect(result).toContain('customer-side request');
  });

  it('14-M2c refuses an inline resource with an unresolved custom property', () => {
    const result = harm(
      '.hero{color:red}',
      '<img id="target" src="x">',
      '<img id="target" src="x" alt="Photo" style="background-image:var(--missing)">'
    );

    expect(result).toContain('cannot be judged');
    expect(
      harm(
        ':root{--brand:#06c}',
        '<img id="target" src="x">',
        '<img id="target" src="x" alt="Photo" style="color:var(--brand)">'
      )
    ).toBeNull();
    expect(
      harm(
        '.hero{color:red}',
        '<img id="target" src="x">',
        '<img id="target" src="x" alt="Photo" style="--brand:#06c">'
      )
    ).toBeNull();
  });

  it('14-M3a reads an escaped bracket inside an attribute selector', () => {
    const result = harm(
      'img[alt="\\]"] ~ #overlay{background-image:url(/pixel)}',
      '<img id="target" src="x">',
      '<img id="target" src="x" alt="]">'
    );

    expect(result).not.toBeNull();
  });

  it('14-M3b keeps the ordinary attribute selector forms readable', () => {
    const original = '<img id="target" src="x">';

    for (const selector of ['[alt]', '[alt="x"]', '[alt=\'x\']', '[alt^="x"]']) {
      expect(harm(`${selector}{color:red}`, original, '<img id="target" src="x" alt="x">')).toBeNull();
    }
    expect(
      harm(
        '[data-x="a]b"]{background-image:url(/pixel)}',
        original,
        '<img id="target" src="x" data-x="a]b">'
      )
    ).toContain('customer-side request');
  });

  it('14-M4a judges a link rule activated by an added href', () => {
    const css = 'a:link{background-image:url(/pixel)}';
    const original = '<a id="target"><span aria-hidden="true">x</span></a>';
    const patched =
      '<a id="target" href="#main" aria-label="Text"><span aria-hidden="true">x</span></a>';

    expect(harm(css, original, patched)).toContain('customer-side request');
    expect(
      harm(
        css,
        '<a id="target" href="#main"><span aria-hidden="true">x</span></a>',
        '<a id="target" href="#main" aria-label="Text"><span aria-hidden="true">x</span></a>'
      )
    ).toBeNull();
    expect(
      harm(
        'a:hover,a:focus-within{color:red}',
        original,
        patched
      )
    ).toBeNull();
  });

  it('14-M5a composes a viewport offset with the declared element size', () => {
    const original = '<img id="target" src="x" width="64" height="64">';
    const patched = '<img id="target" src="x" width="64" height="64" alt="Photo">';

    expect(
      harm('[alt]{position:relative;left:-99vw;background:#f0f}', original, patched)
    ).toContain('hide');
    expect(
      harm(
        '[alt]{position:relative;left:-99vw;width:64px;height:64px;background:#f0f}',
        '<img id="target" src="x">',
        '<img id="target" src="x" alt="Photo">'
      )
    ).toContain('hide');
    expect(
      harm('[alt]{position:relative;left:-2vw;background:#f0f}', original, patched)
    ).toBeNull();
  });
});

describe('destination CSS: the fifteenth review regressions', () => {
  const ORIGINAL = '<button id="target">Save</button>';
  const PATCHED = '<button id="target" aria-label="Save">Save</button>';

  function harm(css: string, original = ORIGINAL, patched = PATCHED): string | null {
    return destinationCssHarm(buildCssContext(css), original, patched);
  }

  it('15-M1a treats every zero-alpha colour grammar as transparent', () => {
    expect(harm('[aria-label]{color:rgba(0 0 0 / 0)}')).toContain('hide');

    for (const color of [
      'rgb(0 0 0 / 0)',
      'rgba(0,0,0,0)',
      'hsl(0 0% 0% / 0)',
      'hsla(0,0%,0%,0)',
      'oklch(0.5 0.1 200 / 0)',
      'oklab(0.5 0.1 0.1 / 0)',
      'lab(50% 0 0 / 0)',
      'lch(50% 30 200 / 0)',
      'color(srgb 0 0 0 / 0)',
    ]) {
      expect(harm(`[aria-label]{color:${color}}`)).toContain('hide');
    }
  });

  it('15-M1b keeps opaque colour grammars harmless', () => {
    for (const color of [
      'rgb(0 0 0 / 1)',
      'rgba(0,0,0,1)',
      'hsl(0 0% 0% / 1)',
      'hsla(0,0%,0%,1)',
      'oklch(0.5 0.1 200 / 1)',
      'oklab(0.5 0.1 0.1 / 1)',
      'lab(50% 0 0 / 1)',
      'lch(50% 30 200 / 1)',
      'color(srgb 0 0 0 / 1)',
    ]) {
      expect(harm(`[aria-label]{color:${color}}`)).toBeNull();
    }
  });

  it('15-M1c keeps a non-zero alpha harmless', () => {
    expect(harm('[aria-label]{color:rgba(0 0 0 / 0.5)}')).toBeNull();
    expect(harm('[aria-label]{color:rgba(0,0,0,0.5)}')).toBeNull();
  });

  it('15-M1d keeps a transparent colour the fix does not activate harmless', () => {
    expect(harm('.other{color:rgba(0 0 0 / 0)}')).toBeNull();
  });

  it('15-M2a judges a class removal through a nested negation', () => {
    const result = harm(
      'button:is(:not(.armed)){background-image:url(/pixel)}',
      '<button id="target" class="armed">Save</button>',
      PATCHED
    );

    expect(result).toContain('customer-side request');
  });

  it('15-M2b keeps an unrelated class removal harmless', () => {
    const result = harm(
      'button:is(:not(.armed)){background-image:url(/pixel)}',
      '<button id="target" class="armed other">Save</button>',
      '<button id="target" class="armed" aria-label="Save">Save</button>'
    );

    expect(result).toBeNull();
  });

  it('15-M2c judges a changed attribute value through a nested negation', () => {
    const result = harm(
      'button:is(:not([data-state="active"])){background-image:url(/pixel)}',
      '<button id="target" data-state="active">Save</button>',
      '<button id="target" data-state="safe" aria-label="Save">Save</button>'
    );

    expect(result).toContain('customer-side request');
  });

  it('15-M2d propagates a removal through where and nested alternatives', () => {
    expect(
      harm(
        'button:where(:not(.armed)){background-image:url(/pixel)}',
        '<button id="target" class="armed">Save</button>',
        PATCHED
      )
    ).toContain('customer-side request');
    expect(
      harm(
        'button:not(:is(.armed)){background-image:url(/pixel)}',
        '<button id="target" class="armed">Save</button>',
        PATCHED
      )
    ).toContain('customer-side request');
  });

  it('15-M3a judges the resource of an activated font face', () => {
    const result = harm(
      '@font-face{font-family:Evil;src:url(/font)} button[aria-label]{font-family:Evil}'
    );

    expect(result).toContain('customer-side request');
  });

  it('15-M3b keeps a font family without a resource harmless', () => {
    expect(
      harm(
        '@font-face{font-family:Evil;src:local(Evil)} button[aria-label]{font-family:Evil}'
      )
    ).toBeNull();
    expect(
      harm('@font-face{font-family:Evil} button[aria-label]{font-family:Evil}')
    ).toBeNull();
  });

  it('15-M3c keeps a custom property without a font resource harmless', () => {
    expect(
      harm(':root{--brand:Arial} button[aria-label]{font-family:var(--brand)}')
    ).toBeNull();
  });

  it('15-M3d refuses an unreadable or unresolved font family or resource', () => {
    expect(
      harm('@font-face{src:url(/font)} button[aria-label]{font-family:Evil}')
    ).toContain('cannot be judged');
    expect(
      harm(
        '@font-face{font-family:Evil;src:var(--missing)} button[aria-label]{font-family:Evil}'
      )
    ).toContain('cannot be judged');
  });
});
