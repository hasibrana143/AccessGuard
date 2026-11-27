import { describe, expect, it } from 'vitest';
import { elementAncestors } from '@/lib/element-ancestors';

describe('elementAncestors', () => {
  it('returns the containing element but not the element itself', () => {
    const ancestors = elementAncestors(
      '<div class="card"><img id="target" src="x"></div>',
      'index.html',
      '<img id="target" src="x">'
    );

    expect(ancestors).toContainEqual({ tag: 'div', id: null, classes: ['card'] });
    expect(ancestors?.some((ancestor) => ancestor.tag === 'img')).toBe(false);
  });

  it('excludes sibling containers', () => {
    const ancestors = elementAncestors(
      '<div class="card"><img id="target" src="x"></div><div class="other"><span>x</span></div>',
      'index.html',
      '<img id="target" src="x">'
    );

    expect(ancestors?.some((ancestor) => ancestor.classes.includes('other'))).toBe(false);
  });

  it('does not treat a void element as an ancestor', () => {
    const ancestors = elementAncestors(
      '<img><span>x</span>',
      'index.html',
      '<span>x</span>'
    );

    expect(ancestors?.some((ancestor) => ancestor.tag === 'img')).toBe(false);
  });

  it('ignores markup inside a script block', () => {
    const ancestors = elementAncestors(
      '<div class="card"><script>const fake = "<div class=\'fake\'>";</script><img id="target" src="x"></div>',
      'index.html',
      '<img id="target" src="x">'
    );

    expect(ancestors).toContainEqual({ tag: 'div', id: null, classes: ['card'] });
    expect(ancestors?.some((ancestor) => ancestor.classes.includes('fake'))).toBe(false);
  });

  it('ignores markup inside a comment', () => {
    const ancestors = elementAncestors(
      '<div class="card"><!-- <div class="fake"> --><img id="target" src="x"></div>',
      'index.html',
      '<img id="target" src="x">'
    );

    expect(ancestors).toContainEqual({ tag: 'div', id: null, classes: ['card'] });
    expect(ancestors?.some((ancestor) => ancestor.classes.includes('fake'))).toBe(false);
  });

  it('returns the enclosing JSX element', () => {
    const ancestors = elementAncestors(
      'export const Card = () => <div className="card"><img src="x" /></div>;',
      'Card.tsx',
      '<img src="x">'
    );

    expect(ancestors).toContainEqual({ tag: 'div', id: null, classes: ['card'] });
  });

  it('returns null when the element is absent', () => {
    expect(
      elementAncestors('<div class="card"></div>', 'index.html', '<img id="target" src="x">')
    ).toBeNull();
  });

  it('selects the requested occurrence', () => {
    const ancestors = elementAncestors(
      '<div class="first"><img src="x"></div><div class="second"><img src="x"></div>',
      'index.html',
      '<img src="x">',
      1
    );

    expect(ancestors).toContainEqual({ tag: 'div', id: null, classes: ['second'] });
    expect(ancestors?.some((ancestor) => ancestor.classes.includes('first'))).toBe(false);
  });
});
