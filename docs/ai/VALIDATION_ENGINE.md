# Volume 5 — Validation Engine

## 1. Layers

A fix passes five layers before it can touch a repository. Each layer can stop it.

1. **Safety validation** — `validateRemediation` (`src/lib/github-pr.ts`): the
   attributes are parsed the way a browser parses them
   (`src/lib/html-attributes.ts`). It blocks `<script>` in any spelling,
   active/embedding elements (`iframe`, `object`, `embed`, `svg`, `style`, `link`,
   `meta`, …), **every** event handler attribute (also when the scanned element
   already carried one), URI attributes whose scheme is not on the allow list
   (`javascript:`, `vbscript:`, `data:text/html`, … — checked after entity decoding
   and normalisation, so `&#106;avascript:` and `java\tscript:` are caught), and
   overlay capable styles (`position`, `z-index`, viewport units, `url()`); it rejects
   unclosed tags; size cap 20k chars.
2. **Rule validation** — `validateFixForRule` (`src/lib/fix-validation.ts`): the fix
   must contain what the rule needs (an `alt=`, a `<label>`, an accessible name).
3. **Placeholder rejection** — `containsPlaceholder` (`src/lib/ast-patch.ts`): a fix
   that still says `TODO`, `FIXME`, `{{alt_text}}`, `YOUR_ALT_TEXT` is discarded. It
   is not a fix, it is a note about a fix.
4. **Structural patching** — `locateElement` / `buildReplacement` (`src/lib/ast-patch.ts`):
   the target element is located in the source and the patch is written there, then the
   result is re-parsed. A patch that would not parse is discarded, and so is a patch
   that would empty the visible text of the element (text hidden with `hidden`,
   `aria-hidden`, `display:none` or `visibility:hidden` does not count as visible).
5. **Verification** — `verifyFixes` (`src/lib/fix-verification.ts`): axe is re-run on
   the remediation snippet, in a browser that cannot make network requests or open a
   WebSocket, under a restrictive CSP. Only a verified fix may open a PR (see
   `FIX_VERIFICATION.md`).

Layers 1–3 run **before** layer 5, so unsafe markup is never rendered in the
verification browser.

Output is embedded in an `accessguard/fix-accessibility-fixes-{date}-{ts}` branch PR
with a summary file — a human reviews before merge; nothing auto-merges. Every opened
PR writes a `github_pr_created` audit log entry.

## 2. Purpose

- Prevent AI-generated code from introducing XSS/second-order injection into customer codebases.
- Keep PRs small, focused, reviewable — enterprise-friendly.
- Never claim a fix was made when it was not.

## 3. Tests

- `src/lib/__tests__/fix-validation.test.ts` — injection and per-rule checks.
- `src/lib/__tests__/html-attributes.test.ts` — browser-like attribute parsing, entity
  decoding, URI normalisation, handler stripping.
- `src/lib/__tests__/github-pr.test.ts` — occurrence-aware patching, placeholder,
  no-op, content-loss and syntax-guard rejection, validation bypasses, Markdown escaping.
- `src/lib/__tests__/ast-patch.test.ts` — AST location (every identity attribute the
  report carries), JSX conversion, parse guard, visible-text guard including hidden text.
- `src/lib/__tests__/fix-verification.test.ts` — gate semantics, the
  check-before-render order, the browser isolation (no HTTP, no WebSocket), the
  visible-text verdict and real axe runs.
- `src/lib/__tests__/github.test.ts` — the repository writer: one fetch and one write
  per file, the complete tree scan, ambiguous matches left alone, failed writes not
  reported as applied.
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
