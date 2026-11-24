import { describe, it, expect } from 'vitest';
import { validateFixForRule, contrastRatio } from '@/lib/fix-validation';

describe('validateFixForRule: image-alt', () => {
  it('accepts a fix that adds a non-empty alt', () => {
    const r = validateFixForRule('image-alt', '<img src="a.jpg" alt="Team photo">');
    expect(r.valid).toBe(true);
    expect(r.verified).toBe(true);
  });

  it('rejects a fix that still lacks alt', () => {
    const r = validateFixForRule('image-alt', '<img src="a.jpg">');
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('alt');
  });

  it('accepts empty alt only for decorative images', () => {
    expect(validateFixForRule('image-alt', '<img src="d.jpg" alt="" role="presentation">').valid).toBe(true);
    expect(validateFixForRule('image-alt', '<img src="d.jpg" alt="" aria-hidden="true">').valid).toBe(true);
  });

  it('rejects empty alt without decorative marker', () => {
    expect(validateFixForRule('image-alt', '<img src="d.jpg" alt="">').valid).toBe(false);
  });

  it('rejects a fix whose image is not live markup', () => {
    // The browser reads the markup inside these contexts as text, so no image
    // element exists and the fix changes nothing on the page.
    for (const code of [
      '<textarea><img id="target" src="/photo.png" alt="Photo"></textarea>',
      '<title><img id="target" src="/photo.png" alt="Photo"></title>',
      '<!bogus <img id="target" src="/photo.png" alt="Photo">>',
    ]) {
      const r = validateFixForRule('image-alt', code);
      expect(r.valid).toBe(false);
    }
  });

  it('rejects a fix that drops the image source', () => {
    const r = validateFixForRule(
      'image-alt',
      '<img id="target" alt="Photo">',
      '<img id="target" src="/photo.png">'
    );
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('source');
  });
});

describe('validateFixForRule: image-alt and the accessibility tree (14-M6)', () => {
  it('14-M6a rejects a fix that hides the repaired image from the accessibility tree', () => {
    // The image stays painted, but it leaves the accessibility tree: axe stops
    // reporting `image-alt` because the rule no longer sees the image.
    const r = validateFixForRule(
      'image-alt',
      '<img id="target" src="x" alt="Photo" aria-hidden="true">',
      '<img id="target" src="x">'
    );
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('accessibility tree');
  });

  it('14-M6b rejects a fix that marks a content image as decorative', () => {
    const r = validateFixForRule(
      'image-alt',
      '<img id="target" src="x" alt="" role="presentation">',
      '<img id="target" src="x">'
    );
    expect(r.valid).toBe(false);
  });

  it('14-M6c accepts a fix that keeps a decorative image decorative', () => {
    const r = validateFixForRule(
      'image-alt',
      '<img id="target" src="x" alt="" aria-hidden="true">',
      '<img id="target" src="x" alt="">'
    );
    expect(r.valid).toBe(true);
  });

  it('14-M6d accepts a fix that names a content image', () => {
    const r = validateFixForRule(
      'image-alt',
      '<img id="target" src="x" alt="Photo">',
      '<img id="target" src="x">'
    );
    expect(r.valid).toBe(true);
  });
});

describe('validateFixForRule: image-alt and the browser hiding semantics (15-M4)', () => {
  it('15-M4a rejects a fix that hides the image with an encoded aria-hidden', () => {
    // The browser decodes the value before it reads it: the image leaves the
    // accessibility tree exactly like `aria-hidden="true"` does.
    const r = validateFixForRule(
      'image-alt',
      '<img id="target" src="x" alt="Photo" aria-hidden="&#116;rue">',
      '<img id="target" src="x">'
    );
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('accessibility tree');
  });

  it('15-M4b rejects a fix that hides the image with an encoded presentation role', () => {
    const r = validateFixForRule(
      'image-alt',
      '<img id="target" src="x" alt="Photo" role="&#112;resentation">',
      '<img id="target" src="x">'
    );
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('accessibility tree');
  });

  it('15-M4c rejects a fix that hides the image in an aria-hidden ancestor', () => {
    // The browser applies the semantics of the ancestor to the child.
    const r = validateFixForRule(
      'image-alt',
      '<div aria-hidden="true"><img id="target" src="x" alt="Photo"></div>',
      '<img id="target" src="x">'
    );
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('accessibility tree');
  });

  it('15-M4d rejects a fix that makes the image inert', () => {
    const r = validateFixForRule(
      'image-alt',
      '<img id="target" src="x" alt="Photo" inert>',
      '<img id="target" src="x">'
    );
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('accessibility tree');
  });

  it('15-M4e accepts a fix whose presentation ancestor keeps the image in the tree', () => {
    // Chromium keeps the image with the role `image` inside a presentational
    // ancestor, so the ancestor is not a hiding form.
    const r = validateFixForRule(
      'image-alt',
      '<div role="presentation"><img id="target" src="x" alt="Photo"></div>',
      '<img id="target" src="x">'
    );
    expect(r.valid).toBe(true);
  });

  it('15-M4f accepts a fix that keeps a decorative image decorative', () => {
    const r = validateFixForRule(
      'image-alt',
      '<img id="target" src="x" alt="" aria-hidden="true">',
      '<img id="target" src="x" alt="">'
    );
    expect(r.valid).toBe(true);
  });

  it('15-M4g accepts a fix whose sibling is hidden but the image is not', () => {
    // The hidden element is not an ancestor of the image.
    const r = validateFixForRule(
      'image-alt',
      '<span aria-hidden="true">x</span><img id="target" src="x" alt="Photo">',
      '<img id="target" src="x">'
    );
    expect(r.valid).toBe(true);
  });
});

describe('validateFixForRule: button-name (14-M1)', () => {
  it('14-M1a accepts a native button that keeps its tag', () => {
    const r = validateFixForRule(
      'button-name',
      '<button id="target" aria-label="Save">x</button>',
      '<button id="target">x</button>'
    );
    expect(r.valid).toBe(true);
  });

  it('14-M1b rejects a fix that replaces a native button with a div', () => {
    const r = validateFixForRule(
      'button-name',
      '<div id="target" aria-label="Save"><span aria-hidden="true">x</span></div>',
      '<button id="target"><span aria-hidden="true">x</span></button>'
    );
    expect(r.valid).toBe(false);
  });

  it('14-M1c rejects a native button without an accessible name', () => {
    const r = validateFixForRule(
      'button-name',
      '<button id="target"><span aria-hidden="true">x</span></button>',
      '<button id="target"><span aria-hidden="true">x</span></button>'
    );
    expect(r.valid).toBe(false);
  });

  it('14-M1i accepts a fix that keeps the ARIA button semantics', () => {
    const r = validateFixForRule(
      'button-name',
      '<div id="target" role="button" aria-label="Save">x</div>',
      '<div id="target" role="button">x</div>'
    );
    expect(r.valid).toBe(true);
  });

  it('14-M1j accepts a button that is named by the alt of its icon', () => {
    const r = validateFixForRule(
      'button-name',
      '<button id="target"><img src="icon.png" alt="Save"></button>',
      '<button id="target"><img src="icon.png"></button>'
    );
    expect(r.valid).toBe(true);
  });

  it('14-M1k rejects a link whose text belongs to another element', () => {
    const r = validateFixForRule(
      'button-name',
      '<article>Photo</article><a id="target" href="#x"></a>',
      '<a id="target" href="#x"></a>'
    );
    expect(r.valid).toBe(false);
  });
});

describe('validateFixForRule: label', () => {
  it('accepts for/id label association', () => {
    const r = validateFixForRule('label', '<label for="email">Email</label><input id="email" type="email">');
    expect(r.valid).toBe(true);
  });

  it('accepts wrapping label', () => {
    const r = validateFixForRule('label', '<label>Email <input type="email"></label>');
    expect(r.valid).toBe(true);
  });

  it('rejects input without label', () => {
    const r = validateFixForRule('label', '<input type="email" placeholder="Email">');
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('label');
  });
});

describe('validateFixForRule: link-name', () => {
  it('accepts descriptive link text', () => {
    const r = validateFixForRule('link-name', '<a href="/pricing">View pricing plans</a>');
    expect(r.valid).toBe(true);
  });

  it('rejects generic link text', () => {
    const r = validateFixForRule('link-name', '<a href="/pricing">click here</a>');
    expect(r.valid).toBe(false);
  });

  it('accepts aria-label as accessible name', () => {
    expect(validateFixForRule('link-name', '<a href="#" aria-label="Contact support">...</a>').valid).toBe(true);
  });
});

describe('validateFixForRule: document-lang & page-title', () => {
  it('accepts html with lang', () => {
    expect(validateFixForRule('document-lang', '<html lang="en">...</html>').valid).toBe(true);
  });

  it('rejects html without lang', () => {
    expect(validateFixForRule('document-lang', '<html>...</html>').valid).toBe(false);
  });

  it('accepts non-empty title', () => {
    expect(validateFixForRule('page-title', '<title>AccessGuard Dashboard</title>').valid).toBe(true);
  });

  it('rejects empty title', () => {
    expect(validateFixForRule('page-title', '<title>   </title>').valid).toBe(false);
  });
});

describe('validateFixForRule: heading-order', () => {
  it('accepts sequential headings', () => {
    expect(validateFixForRule('heading-order', '<h1>Main</h1><h2>Sub</h2><h3>Detail</h3>').valid).toBe(true);
  });

  it('rejects skipped heading levels', () => {
    const r = validateFixForRule('heading-order', '<h1>Main</h1><h3>Jumped</h3>');
    expect(r.valid).toBe(false);
  });
});

describe('validateFixForRule: color-contrast', () => {
  it('accepts sufficient contrast', () => {
    const r = validateFixForRule(
      'color-contrast',
      '<p style="color: #111111; background-color: #ffffff;">Readable text</p>'
    );
    expect(r.valid).toBe(true);
    expect(r.verified).toBe(true);
  });

  it('rejects insufficient contrast', () => {
    const r = validateFixForRule(
      'color-contrast',
      '<p style="color: #cccccc; background-color: #ffffff;">Low contrast</p>'
    );
    expect(r.valid).toBe(false);
  });
});

describe('contrastRatio', () => {
  it('computes the WCAG ratio', () => {
    const white = { r: 255, g: 255, b: 255 };
    const black = { r: 0, g: 0, b: 0 };
    expect(contrastRatio(white, black)).toBeCloseTo(21, 1);
    expect(contrastRatio(black, black)).toBeCloseTo(1, 2);
  });
});

describe('validateFixForRule: misc', () => {
  it('rejects keyboard fix without focusable element', () => {
    expect(validateFixForRule('keyboard-navigation', '<div onclick="x()">Menu</div>').valid).toBe(false);
  });

  it('accepts keyboard fix using native button', () => {
    expect(validateFixForRule('keyboard-navigation', '<button type="button">Menu</button>').valid).toBe(true);
  });

  it('rejects focus-visible fix without focus styles', () => {
    expect(validateFixForRule('focus-visible', '<a href="#" class="link">Go</a>').valid).toBe(false);
  });

  it('accepts focus-visible fix with outline', () => {
    expect(validateFixForRule('focus-visible', '<a href="#" class="link" style="outline: 2px solid blue;">Go</a>').valid).toBe(true);
  });

  it('rejects form-error fix without aria-describedby', () => {
    expect(validateFixForRule('form-error', '<input type="email"><span>Invalid email</span>').valid).toBe(false);
  });

  it('accepts form-error fix with aria-describedby', () => {
    expect(validateFixForRule('form-error', '<input type="email" aria-describedby="err"><span id="err">Invalid email</span>').valid).toBe(true);
  });

  it('unknown rules pass but are unverified', () => {
    const r = validateFixForRule('unknown-rule', '<div>content</div>');
    expect(r.valid).toBe(true);
    expect(r.verified).toBe(false);
  });
});
