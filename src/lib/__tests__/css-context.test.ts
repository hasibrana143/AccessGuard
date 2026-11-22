import { describe, it, expect } from 'vitest';
import { buildCssContext, destinationCssHarm, extractStyleBlocks } from '@/lib/css-context';

describe('destination CSS context', () => {
  it('extracts the style blocks of an HTML document', () => {
    expect(extractStyleBlocks('<style>.a{color:red}</style><p>x</p>')).toEqual(['.a{color:red}']);
    expect(extractStyleBlocks('<p>x</p>')).toEqual([]);
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
