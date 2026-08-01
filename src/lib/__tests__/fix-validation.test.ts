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
