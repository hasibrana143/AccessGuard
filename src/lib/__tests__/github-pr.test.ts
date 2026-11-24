import { describe, it, expect } from 'vitest';
import {
  validateRemediation,
  applyFixesToFile,
  createFixBranchName,
  parsePrUrl,
  generatePrTitle,
  generatePrBody,
  escapeMarkdownText,
  codeFence,
  inlineCode,
} from '@/lib/github-pr';

describe('PR text escaping', () => {
  it('neutralizes raw HTML in untrusted text', () => {
    const escaped = escapeMarkdownText('<img src=x onerror=alert(1)>');
    expect(escaped).not.toContain('<');
    expect(escaped).not.toContain('>');
    expect(escaped).toContain('lt;img');
    expect(escaped).toContain('gt;');
  });

  it('sizes the code fence to the content it wraps', () => {
    expect(codeFence('plain')).toBe('```');
    expect(codeFence('has ``` fence')).toBe('````');
    expect(codeFence('has ```` fence')).toBe('`````');
  });

  it('keeps untrusted HTML out of the PR body', () => {
    const body = generatePrBody([
      {
        id: 'v1',
        ruleId: 'image-alt',
        severity: 'serious',
        url: 'https://example.com/',
        description: '<img src=x onerror="steal()">',
        wcagCriteria: '1.1.1',
      },
    ]);
    expect(body).not.toContain('<img src=x');
  });

  it('neutralizes Markdown links, images and mentions in untrusted text', () => {
    const escaped = escapeMarkdownText(
      '![tracking pixel](https://attacker.example/pixel?x=1) @victim [click](https://attacker.example)'
    );

    expect(escaped).not.toContain('](');
    expect(escaped).toContain('\\]\\(');
    expect(escaped).toContain('\\@');
  });

  it('neutralizes a bare URL, which GFM turns into a link', () => {
    // GFM autolinks a bare URL even without any Markdown syntax, so the
    // scheme of a URL has to be neutralized as well.
    const escaped = escapeMarkdownText('see https://evil.test/phishing and www.evil.test');

    expect(escaped).not.toContain('https://evil.test');
    expect(escaped).not.toContain('www.evil.test');
    expect(escaped).toContain('&#58;//evil.test/phishing');
  });

  it('keeps a Markdown injected description out of the PR body', () => {
    const body = generatePrBody([
      {
        id: 'v1',
        ruleId: 'image-alt',
        severity: 'serious',
        url: 'https://example.com/',
        description: '![tracking pixel](https://attacker.example/pixel?x=1) @victim',
        wcagCriteria: '1.1.1',
      },
    ]);

    expect(body).not.toContain('![tracking pixel]');
    expect(body).toContain('\\!\\[tracking pixel\\]');
  });

  it('fences an inline code span longer than any backtick run in the value', () => {
    expect(inlineCode('plain')).toBe('`plain`');
    // A value with two backticks needs a three backtick fence, otherwise it
    // closes the span and the rest of the value is rendered as Markdown.
    expect(inlineCode('has `` ticks')).toBe('```has `` ticks```');
    // A value that starts or ends with a backtick is padded so the fence is
    // not read as part of the content.
    expect(inlineCode('`edge`')).toBe('`` `edge` ``');
  });

  it('keeps a Markdown injected selector inside one code span', () => {
    // The selector comes from the scanned page: it can carry a Markdown link.
    const selector = 'img[data-mark="`` [x](https://a.test)"]';
    const body = generatePrBody([
      {
        id: 'v1',
        ruleId: 'image-alt',
        severity: 'serious',
        url: 'https://example.com/',
        description: 'd',
        elementSelector: selector,
      },
    ]);

    const line = body.split('\n').find(l => l.includes('Selector:')) ?? '';
    const fence = line.match(/`+/)![0];
    // The fence is longer than the longest backtick run inside the value, so
    // the value cannot close the span.
    expect(fence.length).toBeGreaterThan(2);
    expect(line).toContain(selector);
  });
});

describe('validateRemediation', () => {
  it('rejects empty remediation code', () => {
    expect(validateRemediation('').valid).toBe(false);
    expect(validateRemediation(null).valid).toBe(false);
    expect(validateRemediation(undefined).valid).toBe(false);
  });

  it('14-M1d rejects a native button that becomes a div', () => {
    // The box has a name, so the axe rule passes, but the control has no
    // activation behaviour and the user cannot reach it with the keyboard.
    const result = validateRemediation(
      '<div id="target" aria-label="Save"><span aria-hidden="true">x</span></div>',
      '<button id="target"><span aria-hidden="true">x</span></button>'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('native <button>');
  });

  it('14-M1e rejects a remediation that takes the element out of the focus order', () => {
    const result = validateRemediation(
      '<button id="target" tabindex="-1" aria-label="Save"><span aria-hidden="true">x</span></button>',
      '<button id="target" tabindex="0"><span aria-hidden="true">x</span></button>'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('focusability');
  });

  it('14-M1f accepts a native button that keeps its semantics', () => {
    const result = validateRemediation(
      '<button id="target" aria-label="Save"><span aria-hidden="true">x</span></button>',
      '<button id="target"><span aria-hidden="true">x</span></button>'
    );
    expect(result.valid).toBe(true);
  });

  it('14-M1g accepts a fix that gives the element the keyboard focus', () => {
    const result = validateRemediation(
      '<div id="target" role="button" tabindex="0" aria-label="Save">x</div>',
      '<div id="target" role="button">x</div>'
    );
    expect(result.valid).toBe(true);
  });

  it('14-M1h accepts a button that becomes an equivalent native control', () => {
    const result = validateRemediation(
      '<input id="target" type="submit" value="Save">',
      '<button id="target">Save</button>'
    );
    expect(result.valid).toBe(true);
  });

  it('14-M1i accepts a remediation that keeps the native control among new elements', () => {
    // The remediation introduces a sibling: the patched element is still the
    // button, so its semantics and its focusability are kept.
    const result = validateRemediation(
      '<button id="target"><span aria-hidden="true">x</span></button>',
      '<span aria-hidden="true">x</span><button id="target" aria-label="Save"><span aria-hidden="true">x</span></button>'
    );
    expect(result.valid).toBe(true);
  });

  it('15-M5a rejects a remediation that removes the autofocus of the patched element', () => {
    // The page put the element in focus; the fix drops `autofocus`, so the
    // focus moves to the body and the user loses the initial focus target.
    const result = validateRemediation(
      '<button id="target" aria-label="Save"><span aria-hidden="true">x</span></button>',
      '<button id="target" autofocus><span aria-hidden="true">x</span></button>'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('autofocus');
  });

  it('15-M5b accepts a remediation that keeps the autofocus', () => {
    const result = validateRemediation(
      '<button id="target" autofocus aria-label="Save"><span aria-hidden="true">x</span></button>',
      '<button id="target" autofocus><span aria-hidden="true">x</span></button>'
    );
    expect(result.valid).toBe(true);
  });

  it('15-M5c accepts a remediation that adds the autofocus', () => {
    const result = validateRemediation(
      '<button id="target" autofocus aria-label="Save"><span aria-hidden="true">x</span></button>',
      '<button id="target"><span aria-hidden="true">x</span></button>'
    );
    expect(result.valid).toBe(true);
  });

  it('rejects script tag injection', () => {
    const result = validateRemediation('<div><script>alert(1)</script></div>');
    expect(result.valid).toBe(false);
  });

  it('rejects javascript: URI injection', () => {
    expect(validateRemediation('<a href="javascript:alert(1)">x</a>').valid).toBe(false);
  });

  it('rejects newly injected event handlers', () => {
    const result = validateRemediation(
      '<img src="x.jpg" onerror="alert(1)">',
      '<img src="x.jpg">'
    );
    expect(result.valid).toBe(false);
  });

  it('rejects an event handler that existed in the original element', () => {
    // The scanned page controls the handler code, so a handler is never carried
    // into a remediation — not even one that was already there.
    const result = validateRemediation(
      '<img src="x.jpg" onerror="fallback()" alt="desc">',
      '<img src="x.jpg" onerror="fallback()">'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('event handler');
  });

  it('rejects a slash separated event handler', () => {
    // `<img src=x /onerror=...>` is two attributes for the browser.
    const result = validateRemediation('<img src="x.jpg" /onerror="globalThis.__pwned=1" alt="A">');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('event handler');
  });

  it('rejects an entity encoded javascript: URI', () => {
    const result = validateRemediation('<a href="&#106;avascript:globalThis.__pwned=1" aria-label="safe">safe</a>');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('active URI scheme');
  });

  it('rejects a full screen overlay style', () => {
    const result = validateRemediation(
      '<img src="x" alt="A" style="position:fixed;inset:0;width:100vw;height:100vh;z-index:999999">'
    );
    expect(result.valid).toBe(false);
  });

  it('rejects an overlay style hidden behind CSS escapes', () => {
    // The browser decodes the escapes before it reads the declaration, so the
    // check has to see the decoded form.
    const result = validateRemediation(
      '<img src="x" alt="A" style="p\\6fsition:fixed;l\\65 ft:0;t\\6fp:0;z-\\69 ndex:2147483647;width:100%;height:100%">'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('overlay-capable');
  });

  it('rejects an overlay style hidden behind a CSS comment', () => {
    // A comment is whitespace to the browser: `position/**/:fixed` is the
    // declaration `position: fixed`.
    const result = validateRemediation(
      '<img src="x" alt="A" style="position/**/:fixed;left:0;top:0;z-index:2147483647;width:100%;height:100%">'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('overlay-capable');
  });

  it('rejects an overlay style hidden behind an HTML entity', () => {
    // The browser decodes the attribute value before the CSS is parsed.
    const result = validateRemediation(
      '<img src="x" alt="A" style="position&#58;fixed;left:0;top:0;z-index:2147483647;width:100%;height:100%">'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('overlay-capable');
  });

  it('rejects an overlay style hidden behind a named HTML entity', () => {
    // The browser decodes the complete entity set before the CSS is parsed:
    // `position&sol;&ast;x*&sol;:fixed` is `position/*x*/:fixed`, which is the
    // declaration `position: fixed`.
    const result = validateRemediation(
      '<img id="overlay" src="x" alt="A" style="position&sol;&ast;x*&sol;:fixed;width:100%;height:100%">'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('overlay-capable');
  });

  it('rejects a style value that carries an entity, an escape or a comment', () => {
    expect(validateRemediation('<img src="x" alt="A" style="color:red&blue">').valid).toBe(false);
    expect(validateRemediation('<img src="x" alt="A" style="color:red\\65">').valid).toBe(false);
    expect(validateRemediation('<img src="x" alt="A" style="color:/*x*/red">').valid).toBe(false);
  });

  it('rejects a remediation that carries a brace', () => {
    // In JSX a brace opens an expression, so the remediation would become
    // executable code in the customer's source.
    const result = validateRemediation(
      '<div role="button">Hello{globalThis.__jsxInjection = true}</div>'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('brace');
  });

  it('does not write a quote escape into a file whose context is not proven', () => {
    // The payload is valid HTML, but in a TypeScript module it would close the
    // string it sits in. A file without a proven context is not patched.
    const result = applyFixesToFile(
      'const s = "<img src=\\"a.jpg\\">";',
      [
        {
          ruleId: 'image-alt',
          elementHtml: '<img src="a.jpg">',
          remediationCode: '<img src="a.jpg" alt="x\';globalThis.__tsInjection = true;//">',
        },
      ],
      'app.ts'
    );

    expect(result.fixesApplied).toBe(0);
    expect(result.content).toContain('AccessGuard Accessibility Fixes');
  });

  it('rejects plaintext, which swallows the rest of the document', () => {
    const result = validateRemediation('<img src="x" alt="A"><plaintext></plaintext>');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('plaintext');
  });

  it('rejects the resource loaders', () => {
    expect(validateRemediation('<video src="http://127.0.0.1:9/x"></video>').valid).toBe(false);
    expect(validateRemediation('<audio src="http://127.0.0.1:9/x"></audio>').valid).toBe(false);
    expect(validateRemediation('<source src="http://127.0.0.1:9/x">').valid).toBe(false);
    expect(validateRemediation('<track src="http://127.0.0.1:9/x">').valid).toBe(false);
    expect(validateRemediation('<input type="image" src="http://127.0.0.1:9/x">').valid).toBe(false);
  });

  it('rejects portal and fencedframe elements', () => {
    expect(validateRemediation('<portal src="http://127.0.0.1:9/x"></portal>').valid).toBe(false);
    expect(validateRemediation('<fencedframe src="http://127.0.0.1:9/x"></fencedframe>').valid).toBe(false);
  });

  it('rejects frame and frameset elements', () => {
    // A frame loads a remote document into the customer's page.
    const result = validateRemediation(
      '<html lang="en"><head></head><frameset><frame src="http://127.0.0.1:9/attacker"></frame></frameset></html>'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('frame');
  });

  it('allows ordinary https and mailto URIs', () => {
    expect(validateRemediation('<a href="https://example.com/about">About</a>').valid).toBe(true);
    expect(validateRemediation('<a href="mailto:team@example.com">Mail</a>').valid).toBe(true);
    expect(validateRemediation('<a href="/about">About</a>').valid).toBe(true);
  });

  it('rejects a script tag in any spelling', () => {
    expect(validateRemediation('<img src="x" alt="A"><script/x>evil()</script>').valid).toBe(false);
    expect(validateRemediation('<img src="x" alt="A">< script >evil()</script>').valid).toBe(false);
    expect(validateRemediation('<SCRIPT>evil()</SCRIPT>').valid).toBe(false);
  });

  it('rejects unquoted javascript: URIs', () => {
    expect(validateRemediation('<a href=javascript:alert(1)>x</a>').valid).toBe(false);
    expect(validateRemediation('<a href="javascript :alert(1)">x</a>').valid).toBe(false);
  });

  it('rejects data:text/html URIs', () => {
    expect(validateRemediation('<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>').valid).toBe(false);
  });

  it('rejects event handlers written with spaces around the equals sign', () => {
    const result = validateRemediation(
      '<img src="x.jpg" onerror = "alert(1)" alt="desc">',
      '<img src="x.jpg">'
    );
    expect(result.valid).toBe(false);
  });

  it('rejects active and embedding elements', () => {
    expect(validateRemediation('<iframe src="http://evil.example"></iframe>').valid).toBe(false);
    expect(validateRemediation('<object data="x"></object>').valid).toBe(false);
    expect(validateRemediation('<svg onload="x()"></svg>').valid).toBe(false);
    expect(validateRemediation('<style>body{}</style>').valid).toBe(false);
    expect(validateRemediation('<link rel="stylesheet" href="http://evil.example/x.css">').valid).toBe(false);
  });

  it('rejects unclosed HTML tags', () => {
    expect(validateRemediation('<div><span>text</div>').valid).toBe(false);
  });

  it('accepts well-formed remediation code', () => {
    const result = validateRemediation('<a href="/about" aria-label="About us">About</a>');
    expect(result.valid).toBe(true);
  });

  it('rejects oversized remediation code', () => {
    expect(validateRemediation('<div>' + 'x'.repeat(20_001) + '</div>').valid).toBe(false);
  });

  it('rejects an <input> whose type is only an image after decoding', () => {
    // The browser decodes the attribute before it reads the type, so the
    // encoded form loads the remote resource as well.
    const result = validateRemediation(
      '<img src="x" alt="A"><input type="im&#97;ge" src="http://127.0.0.1:9/pixel">'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('input');
  });

  it('rejects a remediation that carries server-template syntax', () => {
    // The template engine of the customer's build evaluates `<% … %>`, so the
    // expression would run on the customer's server.
    const result = validateRemediation(
      '<img src="x" alt="Photo"><span data-note="<%= globalThis.__pwned = true %>"></span>'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('template');
  });

  it('rejects a remediation that carries a FreeMarker directive', () => {
    // `<#if …>` is a FreeMarker directive: it is evaluated by the template
    // engine of the customer's build.
    const result = validateRemediation(
      '<img src="x" alt="Photo"><span data-note="<#if x>ok</#if>"></span>'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('template');
  });

  it('rejects a remediation that adds a class the original element does not have', () => {
    // A class is a hook into the repository's stylesheet, whose effect the
    // isolated verification does not see.
    const result = validateRemediation(
      '<img id="target" src="x" alt="Photo" class="overlay">',
      '<img id="target" src="x">'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('class');
  });

  it('keeps a remediation that keeps the class of the original element', () => {
    const result = validateRemediation(
      '<img src="x" class="hero" alt="Photo">',
      '<img src="x" class="hero">'
    );
    expect(result.valid).toBe(true);
  });

  it('rejects a remediation that adds a JSX className the original element does not have', () => {
    // React maps className to the browser's class attribute, so a JSX class is
    // the same repository-CSS hook as an HTML class.
    const result = validateRemediation(
      '<img id="target" src="x" alt="Photo" className="overlay">',
      '<img id="target" src="x">'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('class');
  });

  it('rejects a remediation that hides the element with opacity: 0', () => {
    // The priority suffix is not part of the value: `opacity:0!important`
    // hides the element just like `opacity:0`.
    const result = validateRemediation('<button style="opacity:0!important">Read more</button>');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('opacity');
  });

  it('rejects a remediation that carries HTML comment syntax', () => {
    // A comment ends at the first `-->`, so a comment opener in the fix
    // swallows the markup that follows it in the customer's page.
    const result = validateRemediation('<img id="target" src="x" alt="Photo"><!--');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('comment');
  });

  it('rejects a remediation that hides the element it patches', () => {
    for (const remediation of [
      '<img id="target" src="x" alt="Photo" hidden>',
      '<img id="target" src="x" alt="Photo" style="display:none">',
      '<img id="target" src="x" alt="Photo" style="visibility:hidden">',
    ]) {
      const result = validateRemediation(remediation, '<img id="target" src="x">');
      expect(result.valid).toBe(false);
    }
  });

  it('rejects a remediation that makes the text transparent', () => {
    for (const style of [
      'color:transparent',
      'color:rgba(0,0,0,0)',
      'color:hsla(0,0%,0%,0)',
      '-webkit-text-fill-color:transparent',
    ]) {
      const result = validateRemediation(`<a href="/about" style="${style}">Read more</a>`);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('transparent');
    }
  });

  it('rejects a transparent modern colour with a zero alpha', () => {
    for (const style of [
      'color:rgb(0 0 0 / 0%)',
      'color:oklch(0 0 0 / 0%)',
      'color:oklab(0 0 0 / 0)',
      'color:lab(0% 0 0 / 0%)',
      'color:lch(0% 0 0 / 0)',
      'color:color(srgb 0 0 0 / 0%)',
    ]) {
      const result = validateRemediation(`<a href="/about" style="${style}">Read more</a>`);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('transparent');
    }
  });

  it('rejects a remediation that gives the patched element a zero size', () => {
    const result = validateRemediation(
      '<img id="target" src="x" alt="Photo" style="width:0;height:0">',
      '<img id="target" src="x">'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('zero');
  });

  it('rejects a remediation that clips the patched element to a zero size', () => {
    const result = validateRemediation(
      '<div id="target" style="height:0;overflow:hidden">Read more</div>',
      '<div id="target">Read more</div>'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('zero');
  });

  it('rejects a remediation that moves the patched element off-screen with a negative margin', () => {
    const result = validateRemediation(
      '<img id="target" src="x" alt="Photo" style="margin-left:-10000px">',
      '<img id="target" src="x">'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('off-screen');
  });

  it('rejects a remediation that introduces a remote URL', () => {
    // The verification browser blocks every network request, so the new URL is
    // invisible to it and loads from the customer's browser once it is written.
    const result = validateRemediation(
      '<img id="target" src="http://127.0.0.1:9/pixel?token=local" alt="Photo">',
      '<img id="target" src="x">'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('remote');
  });

  it('keeps a remote URL the original element already had', () => {
    const result = validateRemediation(
      '<img id="target" src="https://cdn.example/photo.png" alt="Photo">',
      '<img id="target" src="https://cdn.example/photo.png">'
    );
    expect(result.valid).toBe(true);
  });

  it('rejects a remote destination hidden behind a duplicate src attribute', () => {
    // The browser uses the first duplicate, so the later safe value cannot
    // mask the remote destination.
    const result = validateRemediation(
      '<img id="target" src="http://127.0.0.1:9/pixel" src="/safe.png" alt="Photo">',
      '<img id="target" src="/safe.png">'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('remote');
  });

  it('rejects a remediation that changes the destination of the original element', () => {
    // The URL is compared the way the browser resolves it: the protocol-relative,
    // the single-slash and the backslash spelling all reach the same host.
    for (const src of [
      '//127.0.0.1:9/pixel?token=local',
      'http:/127.0.0.1:9/pixel?token=local',
      'http:\\127.0.0.1:9\\pixel',
    ]) {
      const result = validateRemediation(
        `<img id="target" src="${src}" alt="Photo">`,
        '<img id="target" src="x">'
      );
      expect(result.valid).toBe(false);
    }
  });

  it('rejects a remediation that navigates to another destination', () => {
    const result = validateRemediation(
      '<a href="mailto:attacker@example.com" aria-label="Account">Account</a>',
      '<a href="/account">Account</a>'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('destination');
  });

  it('keeps a destination the original element already had', () => {
    expect(
      validateRemediation(
        '<a href="https://example.com/x" aria-label="x">x</a>',
        '<a href="https://example.com/x">x</a>'
      ).valid
    ).toBe(true);
    expect(
      validateRemediation(
        '<a href="mailto:a@b.example" aria-label="x">x</a>',
        '<a href="mailto:a@b.example">x</a>'
      ).valid
    ).toBe(true);
  });

  it('rejects a remote destination hidden in a ping URL list', () => {
    // Browsers parse ping as a space-separated URL list and request every item.
    const result = validateRemediation(
      '<a id="target" href="/account" ping="/safe http://127.0.0.1:9/pixel" aria-label="Account">Account</a>',
      '<a id="target" href="/account">Account</a>'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('remote');
  });

  it('rejects a remote destination hidden in an attributionsrc URL list', () => {
    // Browsers parse attributionsrc as a space-separated URL list and request every item.
    const result = validateRemediation(
      '<img id="target" src="x" alt="Photo" attributionsrc="/safe http://127.0.0.1:9/pixel">',
      '<img id="target" src="x">'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('remote');
  });

  it('rejects a remediation that adds an attributionsrc destination', () => {
    const result = validateRemediation(
      '<img id="target" src="x" alt="Photo" attributionsrc="http://127.0.0.1:9/pixel">',
      '<img id="target" src="x">'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('remote');
  });

  it('rejects a remediation that changes an attributionsrc destination', () => {
    const result = validateRemediation(
      '<img id="target" src="x" alt="Photo" attributionsrc="http://127.0.0.1:9/pixel">',
      '<img id="target" src="x" attributionsrc="https://cdn.example/pixel">'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('remote');
  });

  it('rejects a remediation that drops an attributionsrc destination', () => {
    const result = validateRemediation(
      '<img id="target" src="x" alt="Photo">',
      '<img id="target" src="x" attributionsrc="/pixel">'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('removes the attributionsrc destination');
  });

  it('keeps an attributionsrc destination the original element already had', () => {
    const result = validateRemediation(
      '<img id="target" src="x" alt="Photo" attributionsrc="https://cdn.example/pixel">',
      '<img id="target" src="x" attributionsrc="https://cdn.example/pixel">'
    );
    expect(result.valid).toBe(true);
  });

  it('rejects a relative attributionsrc destination the remediation adds', () => {
    // The twelfth review reproduced this: a relative destination is a request
    // from the customer browser, so a destination the original element does
    // not have may not be introduced at all.
    const result = validateRemediation(
      '<img id="target" src="x" alt="Photo" attributionsrc="/pixel">',
      '<img id="target" src="x">'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('new attributionsrc destination');
  });

  it('rejects a remote destination hidden behind a duplicate attributionsrc attribute', () => {
    // The browser uses the first duplicate, so the later safe value cannot
    // mask the remote destination.
    const result = validateRemediation(
      '<img id="target" src="x" alt="Photo" attributionsrc="http://127.0.0.1:9/pixel" attributionsrc="/safe">',
      '<img id="target" src="x">'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('remote');
  });

  it('rejects a navigation hidden behind a duplicate href attribute', () => {
    // The browser uses the first duplicate, so the later safe value cannot
    // mask the mailto destination.
    const result = validateRemediation(
      '<a id="target" href="mailto:attacker@example.com" href="/account" aria-label="Account">Account</a>',
      '<a id="target" href="/account">Account</a>'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('destination');
  });

  it('rejects a remediation that adds a destination the original element did not have', () => {
    for (const href of [
      'https://cdn.example/pixel.png',
      '//cdn.example/pixel.png',
      'mailto:attacker@example.com',
      'tel:+15550100',
    ]) {
      const result = validateRemediation(
        `<a href="${href}" aria-label="x">x</a>`,
        '<a aria-label="x">x</a>'
      );
      expect(result.valid).toBe(false);
    }
  });

  it('keeps a relative destination the remediation adds', () => {
    // A relative link stays on the customer's own site: it is not a new
    // destination that calls home.
    const result = validateRemediation(
      '<a href="#main" aria-label="Skip">Skip</a>',
      '<a aria-label="Skip">Skip</a>'
    );
    expect(result.valid).toBe(true);
  });

  it('rejects a remediation that hides the text or the element', () => {
    // The user reads nothing although the content stays in the document.
    for (const style of [
      'font-size:0',
      'font-size:0px',
      'line-height:0',
      'content-visibility:hidden',
      'scale:0',
      'translate:-9999px',
      'filter:opacity(0)',
      'text-indent:-9999px',
    ]) {
      const result = validateRemediation(
        `<a href="/about" aria-label="About" style="${style}">Read more</a>`
      );
      expect(result.valid).toBe(false);
    }
  });

  it('rejects a same-origin destination the remediation introduces', () => {
    // The twelfth review reproduced this: a relative destination is a request
    // from the customer browser, so the destination of the customer's element
    // is preserved, not created.
    const result = validateRemediation(
      '<a id="target" href="/destination">Text</a>',
      '<a id="target">Text</a>'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('new href destination');
  });

  it('keeps a relative destination the original element already had', () => {
    const result = validateRemediation(
      '<a id="target" href="/account" aria-label="Account">Account</a>',
      '<a id="target" href="/account">Account</a>'
    );
    expect(result.valid).toBe(true);
  });

  it('rejects a remediation that hides a nested element', () => {
    // The patched element may sit inside another element: a hidden element
    // around it removes it from the rendering just the same.
    const result = validateRemediation(
      '<span style="display:block;width:64px;height:64px"><img id="target" src="x" width="64" height="64" alt="Photo" hidden></span>',
      '<img id="target" src="x" width="64" height="64">'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('hidden attribute');
  });

  it('rejects a remediation that hides a nested element with a style', () => {
    for (const style of ['display:none', 'visibility:hidden', 'opacity:0']) {
      const result = validateRemediation(
        `<span><img id="target" src="x" alt="Photo" style="${style}"></span>`,
        '<img id="target" src="x">'
      );
      expect(result.valid).toBe(false);
    }
  });

  it('keeps a remediation that nests the patched element in a visible element', () => {
    const result = validateRemediation(
      '<span style="display:block;width:64px;height:64px"><img id="target" src="x" width="64" height="64" alt="Photo"></span>',
      '<img id="target" src="x" width="64" height="64">'
    );
    expect(result.valid).toBe(true);
  });
});

describe('applyFixesToFile', () => {
  it('applies valid fixes and reports skipped invalid ones', () => {
    const original = '<html><body><img src="a.jpg"></body></html>';
    const result = applyFixesToFile(original, [
      {
        ruleId: 'image-alt',
        elementHtml: '<img src="a.jpg">',
        remediationCode: '<img src="a.jpg" alt="A">',
      },
      {
        ruleId: 'script-inject',
        elementHtml: '<img src="a.jpg">',
        remediationCode: '<img src="a.jpg"><script>evil()</script>',
      },
    ], 'index.html');

    expect(result.fixesApplied).toBe(1);
    expect(result.errors.length).toBe(1);
    expect(result.content).toContain('alt="A"');
    expect(result.content).not.toContain('<script>evil()</script>');
  });

  it('writes nothing when the fix hides the element it patches', () => {
    // The rule check passes while the user loses the element.
    const original = '<html><body><img src="a.jpg"></body></html>';
    const result = applyFixesToFile(original, [
      {
        ruleId: 'image-alt',
        elementHtml: '<img src="a.jpg">',
        remediationCode: '<img src="a.jpg" alt="A" hidden>',
      },
    ], 'index.html');

    expect(result.fixesApplied).toBe(0);
    expect(result.errors.join(' ')).toContain('hides');
  });

  it('adds comment block when fixes cannot be matched', () => {
    const original = '<html><body><img src="a.jpg"></body></html>';
    const result = applyFixesToFile(original, [
      {
        ruleId: 'image-alt',
        elementHtml: '<img src="missing.jpg">',
        remediationCode: '<img src="missing.jpg" alt="A">',
      },
    ], 'index.html');

    expect(result.fixesApplied).toBe(0);
    expect(result.content).toContain('AccessGuard Accessibility Fixes');
  });

  it('writes nothing into a frameset document', () => {
    // In a frameset document the content of the frameset is frame content, not
    // body content: the browser creates no image for it, so a fix written
    // there would be reported as applied although nothing changed.
    const original = '<html><frameset><img id="target" src="x"></frameset></html>';
    const result = applyFixesToFile(original, [
      {
        ruleId: 'image-alt',
        elementHtml: '<img id="target" src="x">',
        remediationCode: '<img id="target" src="x" alt="Photo">',
      },
    ], 'index.html');

    expect(result.fixesApplied).toBe(0);
    // The file itself is untouched: only the review comment is added.
    expect(result.content.endsWith(original)).toBe(true);
    expect(result.content).toContain('AccessGuard Accessibility Fixes');
  });

  it('writes nothing into a server template', () => {
    // The template engine of the customer's build evaluates the markers, so a
    // fix written into the file becomes executable server code — and so does
    // the review comment.
    const original = '<% const pageTitle = "Home"; %><img src="a.jpg">';
    const result = applyFixesToFile(original, [
      {
        ruleId: 'image-alt',
        elementHtml: '<img src="a.jpg">',
        remediationCode: '<img src="a.jpg" alt="A">',
      },
    ], 'template.html');

    expect(result.fixesApplied).toBe(0);
    expect(result.content).toBe(original);
    expect(result.content).not.toContain('AccessGuard Accessibility Fixes');
  });

  it('writes nothing into a FreeMarker template', () => {
    // `<#list …>` is a FreeMarker directive: the engine of the customer's
    // build evaluates it.
    const original = '<#list items as item><img src="a.jpg"></#list>';
    const result = applyFixesToFile(original, [
      {
        ruleId: 'image-alt',
        elementHtml: '<img src="a.jpg">',
        remediationCode: '<img src="a.jpg" alt="A">',
      },
    ], 'template.html');

    expect(result.fixesApplied).toBe(0);
    expect(result.content).toBe(original);
  });

  it('patches the nth occurrence of the same element', () => {
    const original = '<html><body><img src="a.jpg"><img src="a.jpg"></body></html>';
    const result = applyFixesToFile(original, [
      { ruleId: 'image-alt', elementHtml: '<img src="a.jpg">', remediationCode: '<img src="a.jpg" alt="Photo">' },
      { ruleId: 'image-alt', elementHtml: '<img src="a.jpg">', remediationCode: '<img src="a.jpg" alt="Photo">' },
    ], 'index.html');

    expect(result.fixesApplied).toBe(2);
    expect(result.content.match(/alt="Photo"/g)).toHaveLength(2);
  });

  it('does not swap the remediations of two selected copies of the same element', () => {
    // The request order is not the occurrence order: two selected copies of the
    // same element with different remediations cannot be mapped, so neither is
    // written into the source.
    const original = '<html><body><img src="same.jpg"><img src="same.jpg"></body></html>';
    const result = applyFixesToFile(original, [
      { ruleId: 'image-alt', elementHtml: '<img src="same.jpg">', remediationCode: '<img src="same.jpg" alt="Second">' },
      { ruleId: 'image-alt', elementHtml: '<img src="same.jpg">', remediationCode: '<img src="same.jpg" alt="First">' },
    ], 'index.html');

    expect(result.fixesApplied).toBe(0);
    expect(result.content).toContain('<img src="same.jpg"><img src="same.jpg">');
    expect(result.content).toContain('AccessGuard Accessibility Fixes');
  });

  it('does not patch the first of two identical elements when only one was selected', () => {
    // The fixes are matched to the occurrences in order, so the mapping to a
    // specific occurrence is only provable when every occurrence is covered.
    const original = '<html><body><img src="same.jpg"><img src="same.jpg"></body></html>';
    const result = applyFixesToFile(original, [
      { ruleId: 'image-alt', elementHtml: '<img src="same.jpg">', remediationCode: '<img src="same.jpg" alt="A">' },
    ], 'index.html');

    expect(result.fixesApplied).toBe(0);
    expect(result.content).toContain('<img src="same.jpg"><img src="same.jpg">');
  });

  it('neutralizes a comment terminator in untrusted text', () => {
    const result = applyFixesToFile('<html><body></body></html>', [
      {
        ruleId: 'image-alt',
        elementHtml: '<img src="missing.jpg">',
        remediationCode: '<img src="missing.jpg" alt="A">',
        description: 'evil --> <script>alert(1)</script>',
      },
    ], 'index.html');

    expect(result.fixesApplied).toBe(0);
    expect(result.content).not.toContain('--><script>');
  });

  it('neutralizes the alternate HTML comment terminator in untrusted text', () => {
    // An HTML comment also ends at `--!>`; the text behind it would become
    // active markup in the customer's file.
    const result = applyFixesToFile('<html><body></body></html>', [
      {
        ruleId: 'image-alt',
        elementHtml: '<img src="missing.jpg">',
        remediationCode: '<img src="missing.jpg" alt="A">',
        description: 'evil --!> <script>globalThis.__pwned = true</script>',
      },
    ], 'index.html');

    expect(result.fixesApplied).toBe(0);
    expect(result.content).not.toContain('--!>');
    expect(result.content).toContain('AccessGuard Accessibility Fixes');
  });

  it('patches two different elements of the same rule independently', () => {
    const original = '<html><body><img src="a.jpg"><img src="b.jpg"></body></html>';
    const result = applyFixesToFile(original, [
      { ruleId: 'image-alt', elementHtml: '<img src="a.jpg">', remediationCode: '<img src="a.jpg" alt="A">' },
      { ruleId: 'image-alt', elementHtml: '<img src="b.jpg">', remediationCode: '<img src="b.jpg" alt="B">' },
    ], 'index.html');

    expect(result.fixesApplied).toBe(2);
    expect(result.content).toContain('src="a.jpg" alt="A"');
    expect(result.content).toContain('src="b.jpg" alt="B"');
  });

  it('rejects a fix that still contains a placeholder', () => {
    const original = '<html><body><img src="a.jpg"></body></html>';
    const result = applyFixesToFile(original, [
      { ruleId: 'image-alt', elementHtml: '<img src="a.jpg">', remediationCode: '<img src="a.jpg" alt="TODO: describe">' },
    ], 'index.html');

    expect(result.fixesApplied).toBe(0);
    expect(result.errors[0]).toContain('placeholder');
  });

  it('does not count an unchanged file as a fix', () => {
    const original = '<html><body><img src="a.jpg" alt="A"></body></html>';
    const result = applyFixesToFile(original, [
      { ruleId: 'image-alt', elementHtml: '<img src="a.jpg" alt="A">', remediationCode: '<img src="a.jpg" alt="A">' },
    ], 'index.html');

    expect(result.fixesApplied).toBe(0);
    expect(result.errors[0]).toContain('no-op');
  });

  it('patches a JSX element through the AST even when the DOM HTML differs', () => {
    const original = 'export const Card = () => <img src="hero.jpg" />;';
    const result = applyFixesToFile(original, [
      { ruleId: 'image-alt', elementHtml: '<img src="hero.jpg">', remediationCode: '<img src="hero.jpg" alt="Hero">' },
    ], 'Card.tsx');

    expect(result.fixesApplied).toBe(1);
    expect(result.content).toBe('export const Card = () => <img src="hero.jpg" alt="Hero" />;');
  });

  it('discards a patch that would break the file', () => {
    const original = 'export const Card = () => <img src="hero.jpg" />;';
    const result = applyFixesToFile(original, [
      { ruleId: 'image-alt', elementHtml: '<img src="hero.jpg">', remediationCode: '<img src="hero.jpg" alt="x"></img>' },
    ], 'Card.tsx');

    expect(result.fixesApplied).toBe(0);
    expect(result.errors[0]).toContain('no longer parses');
  });

  it('rejects a patch that deletes the visible text of the element', () => {
    const original = '<html><body><a href="/about">Read more</a></body></html>';
    const result = applyFixesToFile(original, [
      {
        ruleId: 'link-name',
        elementHtml: '<a href="/about">Read more</a>',
        remediationCode: '<a href="/about" aria-label="Read more"></a>',
      },
    ], 'index.html');

    expect(result.fixesApplied).toBe(0);
    expect(result.errors[0]).toContain('visible text');
    expect(result.content).toContain('Read more');
  });

  it('rejects a JSX patch that deletes the visible text of the element', () => {
    const original = 'export const Card = () => <a href="/about">Read more</a>;';
    const result = applyFixesToFile(original, [
      {
        ruleId: 'link-name',
        elementHtml: '<a href="/about">Read more</a>',
        remediationCode: '<a href="/about" aria-label="Read more"></a>',
      },
    ], 'Card.tsx');

    expect(result.fixesApplied).toBe(0);
    expect(result.errors[0]).toContain('visible text');
    expect(result.content).toContain('Read more');
  });

  it('rejects a patch that reduces the visible text', () => {
    // The new text has to keep the old text: a fix that reduces the label to
    // one character passes every rule check and still deletes what the user
    // reads.
    const original = '<html><body><a href="/about">click here</a></body></html>';
    const result = applyFixesToFile(original, [
      {
        ruleId: 'link-name',
        elementHtml: '<a href="/about">click here</a>',
        remediationCode: '<a href="/about">About our team</a>',
      },
    ], 'index.html');

    expect(result.fixesApplied).toBe(0);
    expect(result.errors[0]).toContain('visible text');
    expect(result.content).toContain('click here');
  });

  it('rejects a patch that reduces the visible text to one character', () => {
    const original = '<html><body><button>Read more</button></body></html>';
    const result = applyFixesToFile(original, [
      {
        ruleId: 'button-name',
        elementHtml: '<button>Read more</button>',
        remediationCode: '<button>R</button>',
      },
    ], 'index.html');

    expect(result.fixesApplied).toBe(0);
    expect(result.content).toContain('Read more');
  });
});

describe('createFixBranchName', () => {
  it('generates a sanitized branch name', () => {
    const name = createFixBranchName('color-contrast', new Date('2026-08-01'));
    expect(name).toMatch(/^accessguard\/fix-color-contrast-20260801-[a-z0-9]+$/);
  });
});

describe('parsePrUrl', () => {
  it('parses GitHub PR URLs', () => {
    const parsed = parsePrUrl('https://github.com/acme/website/pull/42');
    expect(parsed).toEqual({ owner: 'acme', repo: 'website', pullNumber: 42 });
  });

  it('returns null for non-PR URLs', () => {
    expect(parsePrUrl('https://github.com/acme/website')).toBeNull();
  });
});

describe('generatePrTitle / generatePrBody failure paths', () => {
  it('returns a generic title for an empty violation list', () => {
    expect(generatePrTitle([])).toBe('AccessGuard: Accessibility fixes');
  });

  it('groups multiple rule ids with a critical summary', () => {
    const title = generatePrTitle([
      { id: '1', ruleId: 'image-alt', severity: 'critical', url: 'https://x.dev/', description: 'd' },
      { id: '2', ruleId: 'color-contrast', severity: 'critical', url: 'https://x.dev/', description: 'd' },
    ]);
    expect(title).toContain('2 accessibility issues (2 critical)');
  });

  it('returns a generic body for an empty violation list', () => {
    const body = generatePrBody([]);
    expect(body).toContain('**Total Issues:** 0');
    expect(body).toContain('AccessGuard - Accessibility Fixes');
  });

  it('omits WCAG section when no violations carry criteria', () => {
    const body = generatePrBody([
      { id: '1', ruleId: 'image-alt', severity: 'serious', url: 'https://x.dev/', description: 'd' },
    ]);
    expect(body).not.toContain('WCAG Criteria Addressed');
  });

  it('includes the project block and WCAG criteria when present', () => {
    const body = generatePrBody(
      [{ id: '1', ruleId: 'image-alt', severity: 'minor', url: 'https://x.dev/', description: 'd', wcagCriteria: '1.1.1' }],
      { name: 'Acme', url: 'https://acme.dev' }
    );
    expect(body).toContain('**Project:** Acme');
    expect(body).toContain('WCAG 1.1.1');
  });
});


