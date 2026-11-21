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

The attributes of a remediation are **parsed the way a browser parses them**
(`src/lib/html-attributes.ts`), not matched with a regular expression: a slash
before an attribute (`<img src=x /onerror=…>`) is a separator for the browser,
and an entity encoded value (`&#106;avascript:`) is decoded before the browser
looks at the scheme.

A remediation is rejected before it can reach a browser or a repository when it:

- contains a `<script>` tag in any spelling (`<script>`, `<script/x>`, `< script >`),
- contains an active or embedding element (`iframe`, `object`, `embed`, `applet`,
  `base`, `svg`, `style`, `link`, `meta`, `frame`, `frameset`, `noframes`, `portal`,
  `fencedframe`, `math`),
- contains **any** event handler attribute (`onerror`, `onclick`, …) — a handler is
  rejected even when the scanned element already carried one, because the handler
  code belongs to the scanned page, not to AccessGuard,
- carries a URI attribute (`href`, `src`, `action`, `srcset`, …) whose scheme is not
  on the allow list (`http`, `https`, `mailto`, `tel`, `ftp`, inert image data URIs).
  The value is entity decoded and stripped of the whitespace and control characters
  a browser ignores before the scheme is read, so `&#106;avascript:` and
  `java\tscript:` are caught,
- sets a style property that can take over the screen (`position`, `inset`,
  `z-index`, `transform`, `clip-path`, `mask`, viewport units, `url()`). The value
  is read the way the browser reads it: the HTML entities of the attribute value
  are decoded, a CSS comment is treated as whitespace (`position/**/:fixed` is
  `position: fixed`) and the CSS escapes are resolved (`p\6fsition:fixed` is
  `position: fixed`),
- still contains a placeholder (`TODO`, `FIXME`, `{{…}}`, `YOUR_ALT_TEXT`),
- does not address the rule it claims to fix (per-rule check),
- is empty or longer than 20k characters.

The deterministic template fallback (`src/ai/prompts.ts`) strips the event
handlers of the scanned element, so a fix generated without an AI never carries
the target page's script into a customer repository.

## 3. AST patching (`src/lib/ast-patch.ts`)

The scanner reports DOM HTML; a repository holds source code. For JSX/JS files the
element is located through a real AST (TypeScript compiler API) and the patch is
spliced at AST-derived offsets, so the rest of the file is untouched.

| Property | Behaviour |
| --- | --- |
| Location | JSX/JS: AST match on the tag and **every** identity attribute the report carries (`src`, `href`, `id`, `name`, `class`, `aria-label`, `role`, `data-testid`, and softly `type`/`alt`); a candidate that lacks a supplied identity attribute does not match. The class list is compared as a set, so two copies of the same image with different classes are never confused. HTML: exact element text. |
| Occurrence aware | Occurrences are counted per rule **and** per element. Three copies of the same image are patched one by one; two different images are patched independently. A fix is only written when **every** occurrence of its element in the file is covered by a selected fix — the fixes are matched to the occurrences in order, so selecting one of two identical elements would otherwise patch the wrong one. Such a fix ships as a review suggestion. |
| Ambiguity | If the element exists in more than one file of the repository, the fix is **not** written to any file — it ships in the PR as a review suggestion. A wrong file is worse than no patch. |
| Complete scan | The **whole** source tree is scanned, bounded by a byte budget (5 MB) instead of a file count. A tree that does not fit, a tree the API reports as `truncated`, or a source file that could not be read, never patches a file: an incomplete scan cannot prove uniqueness. |
| Conversion | HTML attributes are renamed to JSX (`class` → `className`, `for` → `htmlFor`), void elements are self-closed, `style="…"` becomes a style object. Style values are allow-listed: braces, quotes, backslashes, `url()` and `expression()` are dropped so a style attribute cannot break out of the JS expression it is written into. |
| No-op | A patch identical to the original element is not a fix and is not counted. |
| Content loss | A patch that empties an element that had visible text (a link or a button) is rejected — an axe-verified fix must not delete what the user reads. Text inside a hidden element (`hidden`, `display:none`, `visibility:hidden`) is not visible text, so moving the label into a hidden element is a content loss too. `aria-hidden` removes content from the accessibility tree, **not** from the screen: its text counts as visible text, so a fix may not delete it. |
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
| `failed` | axe still reports the rule, or the patch hides the visible text of the element | `0` |
| `unverified` | the fix was rejected by the safety/rule checks, the browser is unavailable, the rule is unknown, the result was incomplete, or the batch ran out of budget | `null` |

`null` never passes the confidence gate (`MIN_FIX_CONFIDENCE = 0.7`). When verification
cannot run, the route refuses to open a PR and says so — an unverified PR is exactly the
trust failure this pipeline exists to remove.

Browser isolation:

- the verification document carries a restrictive CSP (`default-src 'none'`,
  `connect-src 'none'`, `script-src 'unsafe-inline'` for the axe bundle only), so the
  rendered markup cannot open a connection, a worker or a frame,
- the verification context aborts **every** HTTP request and closes **every**
  WebSocket (`context.routeWebSocket`), and blocks service workers — untrusted markup
  cannot make the AccessGuard host fetch anything (no SSRF through a verification run),
- each render and axe run has a 15 s deadline; a stuck render is abandoned, and a whole
  batch has a 60 s budget,
- at most **two** verification batches (Chromium instances) run at the same time; a
  request that waits more than 30 s for a slot is reported as unverified instead of
  piling up,
- the Chromium sandbox stays on except where it cannot be used (the Docker image runs
  Chromium as root), and
- the browser is resolved in this order: `PUPPETEER_EXECUTABLE_PATH` →
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` → common system Chromium paths → Playwright's
  bundled browser.

The rendered text is part of the verdict: when the original element showed text, the
patched element has to show text too. A fix that moves the label into a hidden element
passes axe and still deletes what the user reads, so it fails the verification.

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
| `skippedLowConfidence` | verification failed — axe still reports the rule, or the patch hid the visible text |
| `skippedUnverified` | verification could not run (rejected earlier, no browser, rule not evaluable, batch out of budget) |
| `filesCreated` | files GitHub actually accepted (fix documents + summary) |
| `violationsUpdated` | violations whose artifact was accepted **and** linked to the PR |
| `fixesWithoutArtifact` | verified fixes that no accepted artifact represents (GitHub refused the write) |
| `auditRecorded` | `false` when the audit entry could not be written — the PR exists, the trail does not |

At most 10 fixes are written into source files per PR; the remaining verified fixes
still ship in the PR as review files. A violation is linked to the PR only when an
artifact for it was accepted by GitHub — a source file it was patched into, or its own
fix document. Every opened PR writes an audit log entry (`github_pr_created`) with the
verified and skipped counts; the entry is written **before** the violations are linked,
so a later database failure cannot leave an opened PR without a trail. The write is
retried (`createAuditLogWithRetry`, 3 attempts with a growing delay) before the route
reports `auditRecorded: false`, so a transient database error does not leave a
repository mutation without a trail.

## 7. Limits and operations

- A request may carry at most `MAX_FIXES_PER_PR = 25` violations; the cap is applied
  **before** the browser work, and the route is rate limited per user.
- Verification adds one browser launch per PR request and one axe run per fix. At most
  two batches run at the same time; a request waits at most 30 s for a slot.
- The repository writer reads at most 5 MB of source content per PR and patches at most
  10 source files; the rest remain review files.
- A missing browser shows up as `skippedUnverified` on every fix and as the error
  "Fix verification could not run …". Fix: install Chromium (the Docker image ships
  `/usr/bin/chromium-browser`; CI runs `npx playwright install --with-deps chromium`).
- Repository writes are bounded to 10 source files per PR (the rest remain review files)
  and a file whose write GitHub refused is not reported as modified.

## 8. Untrusted text in the pull request

Descriptions, URLs and explanations come from a scanned page. They are escaped for
Markdown as well as for HTML (`escapeMarkdownText`): a link, an image, a mention or a
heading in a violation description would otherwise become part of the PR body. Code
samples are wrapped in a code fence that is sized to the content it holds, and an
element selector is written as an inline code span that the value cannot break out of
(the fence is longer than the longest backtick run in the value, and a value that
starts or ends with a backtick is padded). The review comment that is written into a
customer file neutralizes the comment terminator (`*/`, `-->`), so untrusted text
cannot close the comment and become code.
