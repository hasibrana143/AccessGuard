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
