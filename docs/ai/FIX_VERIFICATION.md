# Volume 5 — Fix Verification and AST Patching

How a proposed fix becomes a pull request, and what the product does **not** claim.

## 1. The chain

```
scan -> violation (axe DOM HTML) -> proposed fix (AI or template)
     -> safety + rule + placeholder checks
     -> locate the element in the repository source
     -> write the patch, re-parse the file
     -> re-run axe on the patched element
     -> only then: branch + PR
```

Every arrow can stop the chain. A stopped chain never produces a PR.

## 2. AST patching (`src/lib/ast-patch.ts`)

The scanner reports DOM HTML; a repository holds source code. For JSX/JS files the
element is located through a real AST (TypeScript compiler API) and the patch is
spliced at AST-derived offsets, so the rest of the file is untouched.

| Property | Behaviour |
| --- | --- |
| Location | JSX/JS: AST match on tag + distinguishing attribute (`src`, `href`, `id`, `name`, `type`, `alt`), then class list. HTML: exact element text. |
| Occurrence aware | Occurrences are counted per rule **and** per element. Three copies of the same image are patched one by one; two different images are patched independently. |
| Conversion | HTML attributes are renamed to JSX (`class` → `className`, `for` → `htmlFor`), void elements are self-closed, `style="…"` becomes a style object. |
| No-op | A patch identical to the original element is not a fix and is not counted. |
| Placeholder | `TODO`, `FIXME`, `{{…}}`, `YOUR_ALT_TEXT` are rejected before patching. |
| Syntax guard | The patched file is re-parsed; a patch that breaks the file is discarded and reported. |

File types without a parser (`.vue`, `.svelte`, `.astro`) keep the conservative exact
text match. They can miss; they never guess.

## 3. Verification (`src/lib/fix-verification.ts`)

The patched element is rendered in a headless Chromium page and axe is run against the
single rule the fix claims to fix.

| Outcome | Meaning | Effective confidence |
| --- | --- | --- |
| `verified` | axe reports no violation for that rule on the patched element | `1.0` |
| `failed` | axe still reports the rule | `0` |
| `unverified` | the rule could not be evaluated (no browser, unknown rule, incomplete result) | `null` |

`null` never passes the confidence gate (`MIN_FIX_CONFIDENCE = 0.7`). When verification
cannot run, the route refuses to open a PR and says so — an unverified PR is exactly the
trust failure this pipeline exists to remove.

Browser resolution order: `PUPPETEER_EXECUTABLE_PATH` → `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`
→ common system Chromium paths → Playwright's bundled browser. This keeps the Docker
image (system Chromium) and CI (Playwright browser) working without extra setup.

## 4. What verification does NOT prove

- It is **rule-level on the patched element**, not a full page re-scan. The customer's
  build is not available to the service.
- It does not prove the surrounding page still works.
- A rule that needs page context (for example `color-contrast` without a background)
  is reported as `unverified` and excluded, rather than being assumed to pass.
- It does not prove the fix matches the intent of the product owner. The PR is still
  reviewed by a human before merge.

## 5. What the user sees

The PR summary states that every fix in the PR was re-scanned with axe-core before the
PR was opened, and that unverified fixes were excluded. The API response reports
`verifiedFixes`, `skippedLowConfidence` and `skippedUnverified`.

## 6. Operations

- A missing browser shows up as `skippedUnverified` on every fix and as the error
  "Fix verification could not run …". Fix: install Chromium (the Docker image ships
  `/usr/bin/chromium-browser`; CI runs `npx playwright install --with-deps chromium`).
- Verification adds one browser launch per PR request and one axe run per fix. Fixes
  per request are bounded by the selected violations.
