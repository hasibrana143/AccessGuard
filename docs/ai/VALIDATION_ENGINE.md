# Volume 5 — Validation Engine

## 1. Layers

A fix passes five layers before it can touch a repository. Each layer can stop it.

1. **Safety validation** — `validateRemediation` (`src/lib/github-pr.ts`): the
   attributes are parsed the way a browser parses them
   (`src/lib/html-attributes.ts`). It blocks `<script>` in any spelling,
   active/embedding elements (`iframe`, `object`, `embed`, `svg`, `style`, `link`,
   `meta`, `frame`, `frameset`, `portal`, `video`, `audio`, `plaintext`, …),
   **every** event handler attribute (also when the scanned element
   already carried one), URI attributes whose scheme is not on the allow list
   (`javascript:`, `vbscript:`, `data:text/html`, … — checked after entity decoding
   and normalisation, so `&#106;avascript:` and `java\tscript:` are caught),
   overlay capable styles (`position`, `z-index`, viewport units, `url()`),
   `opacity:0` (the priority suffix is not part of the value, so
   `opacity:0!important` is the same declaration), any
   **brace** (it becomes an expression in JSX and an interpolation in a template
   file), **server-template syntax** (`<% … %>`, `<? … ?>`, `{{ … }}`, `{% … %}`,
   `{# … #}` — the template engine of the customer's build evaluates it), an
   `<input>` whose type is an image **after the browser decodes it**
   (`type="im&#97;ge"` is `image`) or whose type carries an entity the decoder
   does not know, and a remediation that **adds a class** the original element
   does not have (a class is a hook into the repository's stylesheet, whose effect
   is not part of the isolated verification); it rejects unclosed tags; size cap
   20k chars. The style check rejects a
   value that carries an **entity, a CSS escape or a CSS comment** instead of
   guessing what the browser resolves it to — a partial entity table cannot mirror
   the browser (`position&sol;&ast;x*&sol;:fixed` is `position: fixed`).
2. **Rule validation** — `validateFixForRule` (`src/lib/fix-validation.ts`): the fix
   must contain what the rule needs (an `alt=`, a `<label>`, an accessible name).
3. **Placeholder rejection** — `containsPlaceholder` (`src/lib/ast-patch.ts`): a fix
   that still says `TODO`, `FIXME`, `{{alt_text}}`, `YOUR_ALT_TEXT` is discarded. It
   is not a fix, it is a note about a fix.
4. **Structural patching** — `locateElement` / `buildReplacement` (`src/lib/ast-patch.ts`):
   the target element is located in the source and the patch is written there, then the
   result is re-parsed. A patch that would not parse is discarded, and so is a patch
   that would empty the visible text of the element (text hidden with `hidden`,
   `display:none`, `visibility:hidden` or `opacity:0` does not count as visible —
   the CSS priority suffix is stripped first, so `opacity:0!important` is caught too;
   `aria-hidden` does **not** hide anything visually, so its text counts as visible
   text). The new text has to **keep** the old text: a fix that reduces "Read more"
   to "R" passes every rule check and still deletes what the user reads.
   A fix is only written when **every** occurrence of its element in the file is
   covered by a selected fix: the fixes are matched to the occurrences in order, so
   selecting one of two identical elements would otherwise patch the wrong one.
   Two selected copies of the same element with different remediations cannot be
   mapped at all and stay review suggestions.
   Such a fix stays a review suggestion.
5. **Verification** — `verifyFixes` (`src/lib/fix-verification.ts`): axe is re-run on
   the remediation snippet, in a browser that cannot make network requests or open a
   WebSocket, under a restrictive CSP. Only a verified fix may open a PR (see
   `FIX_VERIFICATION.md`).

Layers 1–3 run **before** layer 5, so unsafe markup is never rendered in the
verification browser.

The repository writer (`src/lib/github.ts`) adds five more conditions before it
writes anything into a customer's repository:

- the GitHub tree must not be `truncated` — a partial list cannot prove uniqueness;
- **every text file** of the tree must be readable, whatever its extension — a
  file the writer does not know (a template, a partial, a content file) can hold
  the same element, and an unreadable file (the API returns it with
  `encoding: 'none'`) counts as unreadable;
- the whole scan must fit the byte budget (5 MB);
- the tree must not hold a **submodule** (a tree entry of type `commit`): it holds
  files the tree does not list, so the scan is incomplete;
- the repository's **own stylesheets** must not be able to harm the patched
  element: every `.css` file and every `<style>` block is read and matched against
  the element (`src/lib/css-context.ts`). A rule that can turn the element into a
  full-viewport overlay (a positioned element that spans the viewport) or hide it
  (`display:none`, `visibility:hidden`, `opacity:0`) keeps the fix out of the
  repository. The rules of a utility stylesheet are read together, so
  `fixed inset-0 w-screen h-screen` is caught even when no single rule covers the
  viewport.

An incomplete scan never patches a file; the fix stays a review suggestion. The
review comment that is written into the file instead neutralizes the comment
terminator (`*/`, `-->`, `--!>`), so untrusted text cannot close the comment and
become code.

A fix is only written into a file whose destination context can be proven: an HTML
file (where only a **live tag** counts — not markup inside a comment, a script
block or another tag's attribute value) or a JSX file (where the element is located
through the AST). A TypeScript module or a component file that mixes markup and
code has no proven context — the element text can sit inside a string or an
expression there — so the fix ships as a review suggestion. Those files are still
scanned, so a duplicate in one of them keeps the remaining match ambiguous.

The **live context** follows the browser: markup inside a raw-text element
(`script`, `style`, `textarea`, `title`, `xmp`, `listing`, `plaintext`, `noscript`,
`iframe`, `noembed`, `noframes`) never becomes an element, the content of a
`template`, `object` or `applet` is parsed but never rendered, and an element that
is never closed keeps the rest of the document as its text. The end tag has to be a
real end tag: `</scripture>` does not close a script.

A **template destination** is refused as well: an HTML file that carries
server-template syntax is a template, not HTML. Nothing is written into it — not
the patch and not the review comment, because the template engine would evaluate
the comment as well.

Output is embedded in an `accessguard/fix-accessibility-fixes-{date}-{ts}` branch PR
with a summary file — a human reviews before merge; nothing auto-merges. Every opened
PR writes a `github_pr_created` audit log entry; the write is retried
(`createAuditLogWithRetry`) before the route reports a missing trail.

## 2. Purpose

- Prevent AI-generated code from introducing XSS/second-order injection into customer codebases.
- Keep PRs small, focused, reviewable — enterprise-friendly.
- Never claim a fix was made when it was not.

## 3. Tests

- `src/lib/__tests__/fix-validation.test.ts` — injection and per-rule checks.
- `src/lib/__tests__/html-attributes.test.ts` — browser-like attribute parsing, entity
  decoding, URI normalisation, handler stripping.
- `src/lib/__tests__/github-pr.test.ts` — occurrence-aware patching, placeholder,
  no-op, content-loss and syntax-guard rejection, validation bypasses (CSS escaped
  overlays, `frame`/`frameset`), Markdown escaping and the inline code span.
- `src/lib/__tests__/ast-patch.test.ts` — AST location (every identity attribute the
  report carries), JSX conversion, parse guard, visible-text guard including hidden
  text, `aria-hidden` text and the CSS priority suffix, and the live-context guard
  (raw-text elements, inert `template`/`object`/`applet` content, raw-text end tag
  prefixes, elements that are never closed).
- `src/lib/__tests__/css-context.test.ts` — the destination stylesheet judgement:
  overlay and hiding rules, utility stylesheets read together, conditional groups,
  comments, attribute selectors and the rules that do not reach the element.
- `src/lib/__tests__/fix-verification.test.ts` — gate semantics, the
  check-before-render order, the browser isolation (no HTTP, no WebSocket), the
  visible-text verdict and real axe runs.
- `src/lib/__tests__/github.test.ts` — the repository writer: one fetch and one write
  per file, the complete tree scan, ambiguous matches left alone, an incomplete scan
  (unreadable file, truncated tree, submodule) never patching, the destination
  stylesheet guard, the template destination, failed writes not reported as
  applied.
- `src/lib/__tests__/audit-retry.test.ts` — the audit write is retried before a
  missing trail is reported.
- `src/app/api/github/create-pr/route.test.ts` — the PR route: no PR without verified
  fixes, only violations with an accepted artifact linked, honest file counters, audit
  trail written before the link update.

## 4. The VPAT report (`src/lib/vpat-generator.ts`)

The same rule applies to the compliance report: it may not claim more than it knows.

- A report generated for a scan verifies that the scan belongs to the authorized
  project; a foreign scan id is answered with `404` and no violation is queried.
- Violations are queried by **project and scan**, so a report can never be built from
  another tenant's scan.
- A manual check is stored under its catalog id (`meaningful-alt`, `keyboard-flow`, …).
  The generator resolves that id through the catalog to the WCAG criterion it assesses,
  so a real manual pass can clear a minor or moderate finding, a manual fail marks the
  criterion as not supported, and a manual pass can never clear a critical or serious
  finding.
- A criterion with an unresolved violation is `partially-supports` — never `supports`.

## 5. Roadmap

- Vue / Svelte / Astro AST support (currently these file types fall back to an exact
  text match, which is conservative and can miss).
- Full page re-scan verification (needs the customer's build; today verification is
  rule-level on the remediation snippet).
- A source map from the scanned URL to the repository path, so a match is never
  ambiguous (today an ambiguous match is left to a human).
- Cache the parsed AST per file instead of re-parsing it per fix (the batch deadline
  bounds the cost today).
