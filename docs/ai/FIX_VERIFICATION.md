# Volume 5 — Fix Verification and AST Patching

How a proposed fix becomes a pull request, and what the product does **not** claim.

## 1. The chain (as implemented)

```
scan -> violation (axe DOM HTML) -> proposed fix (AI or template)
     -> safety checks (injection, active tags, URIs, event handlers)
     -> rule check + placeholder check
     -> axe verification of the remediation snippet (only what passed the checks is rendered)
     -> branch
     -> locate the element in the repository source, patch it, re-parse the file
     -> PR + audit log
```

Every arrow can stop the chain. A stopped chain never produces a PR.

Order matters: the safety, rule and placeholder checks run **before** anything is
rendered in the verification browser, so unsafe markup is never executed and cannot
fake an axe pass.

## 2. Safety checks (`src/lib/github-pr.ts`)

A remediation is rejected before it can reach a browser or a repository when it:

- contains a `<script>` tag in any spelling (`<script>`, `<script/x>`, `< script >`),
- contains an active or embedding element (`iframe`, `object`, `embed`, `applet`,
  `base`, `svg`, `style`, `link`, `meta`),
- contains an active URI scheme (`javascript:`, `vbscript:`, `data:text/html`) —
  quoted or unquoted,
- injects an event handler the original element did not have (`onerror = "…"` with
  spaces around the `=` is caught too),
- still contains a placeholder (`TODO`, `FIXME`, `{{…}}`, `YOUR_ALT_TEXT`),
- does not address the rule it claims to fix (per-rule check),
- is empty or longer than 20k characters.

## 3. AST patching (`src/lib/ast-patch.ts`)

The scanner reports DOM HTML; a repository holds source code. For JSX/JS files the
element is located through a real AST (TypeScript compiler API) and the patch is
spliced at AST-derived offsets, so the rest of the file is untouched.

| Property | Behaviour |
| --- | --- |
| Location | JSX/JS: AST match on the tag and **every** distinguishing attribute the report carries (`src`, `href`, `id`, `name`, `type`, `alt`); a candidate that lacks a supplied identity attribute (`src`, `href`, `id`, `name`) does not match. If no distinguishing attribute is present, the class list is compared. HTML: exact element text. |
| Occurrence aware | Occurrences are counted per rule **and** per element. Three copies of the same image are patched one by one; two different images are patched independently. |
| Ambiguity | If the element exists in more than one file of the repository, the fix is **not** written to any file — it ships in the PR as a review suggestion. A wrong file is worse than no patch. |
| Conversion | HTML attributes are renamed to JSX (`class` → `className`, `for` → `htmlFor`), void elements are self-closed, `style="…"` becomes a style object. Style values are allow-listed: braces, quotes, backslashes, `url()` and `expression()` are dropped so a style attribute cannot break out of the JS expression it is written into. |
| No-op | A patch identical to the original element is not a fix and is not counted. |
| Content loss | A patch that empties an element that had visible text (a link or a button) is rejected — an axe-verified fix must not delete what the user reads. |
| Placeholder | `TODO`, `FIXME`, `{{…}}`, `YOUR_ALT_TEXT` are rejected before patching. |
| Syntax guard | The patched file is re-parsed; a patch that breaks the file is discarded and reported. |

File types without a parser (`.vue`, `.svelte`, `.astro`) keep the conservative exact
text match. They can miss; they never guess.

## 4. Verification (`src/lib/fix-verification.ts`)

The remediation snippet is rendered in a headless Chromium page and axe is run against
the single rule the fix claims to fix.

| Outcome | Meaning | Effective confidence |
| --- | --- | --- |
| `verified` | axe reports no violation for that rule on the remediation snippet | `1.0` |
| `failed` | axe still reports the rule | `0` |
| `unverified` | the fix was rejected by the safety/rule checks, the browser is unavailable, the rule is unknown, or the result was incomplete | `null` |

`null` never passes the confidence gate (`MIN_FIX_CONFIDENCE = 0.7`). When verification
cannot run, the route refuses to open a PR and says so — an unverified PR is exactly the
trust failure this pipeline exists to remove.

Browser isolation:

- the verification context aborts **every** network request — untrusted markup cannot
  make the AccessGuard host fetch anything (no SSRF through a verification run),
- each render and axe run has a 15 s deadline; a stuck render is abandoned,
- the Chromium sandbox stays on except where it cannot be used (the Docker image runs
  Chromium as root), and
- the browser is resolved in this order: `PUPPETEER_EXECUTABLE_PATH` →
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` → common system Chromium paths → Playwright's
  bundled browser.

## 5. What verification does NOT prove

- It is **rule-level on the remediation snippet**, not a full page re-scan and not a
  re-scan of the patched file. The customer's build is not available to the service.
- It does not prove that the patch landed in the right file — an ambiguous match is
  left to a human.
- It does not prove the surrounding page still works.
- A rule that needs page context (for example `color-contrast` without a background)
  is reported as `unverified` and excluded, rather than being assumed to pass.
- It does not prove the fix matches the intent of the product owner. The PR is still
  reviewed by a human before merge.

## 6. What the user sees

The PR summary states that each fix passed the safety, placeholder and rule checks and
that its remediation snippet was re-scanned with axe-core for the rule it targets. The
API response reports what happened to every selected fix:

| Field | Meaning |
|---|---|
| `verifiedFixes` | fixes included in the PR (and, where the element was found unambiguously, written into the source file) |
| `skippedInvalid` | rejected by the safety, rule or placeholder checks |
| `skippedOverLimit` | fixes beyond the per-request limit (`MAX_FIXES_PER_PR = 25`) |
| `skippedLowConfidence` | verification failed — axe still reports the rule |
| `skippedUnverified` | verification could not run (rejected earlier, no browser, rule not evaluable) |

At most 10 fixes are written into source files per PR; the remaining verified fixes
still ship in the PR as review files. Every opened PR writes an audit log entry
(`github_pr_created`) with the verified and skipped counts.

## 7. Limits and operations

- A request may carry at most `MAX_FIXES_PER_PR = 25` violations; the cap is applied
  **before** the browser work, and the route is rate limited per user.
- Verification adds one browser launch per PR request and one axe run per fix.
- A missing browser shows up as `skippedUnverified` on every fix and as the error
  "Fix verification could not run …". Fix: install Chromium (the Docker image ships
  `/usr/bin/chromium-browser`; CI runs `npx playwright install --with-deps chromium`).
- Repository writes are bounded to 10 source files per PR (the rest remain review files)
  and a file whose write GitHub refused is not reported as modified.
