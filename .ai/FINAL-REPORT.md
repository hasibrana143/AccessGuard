# AccessGuard — Final Report

Cycle: **V23 — verified-fix engine + security hardening + fifth-review closure** · Date: 2026-11-22 · Owner: CTO agent

## What shipped

The four P0 "make the product true" gaps from `.ai/PRODUCT-CRITIQUE-DEEP.md` are closed.
The first V23 cut was reviewed five times: the first review found seven more defects
(3 reproduced P0 defects, 3 High, 4 Medium, 1 Low), the **re-review of that hardening
found 2 High, 7 Medium, 1 Low**, the **third review found 2 High, 5 Medium**, the
**fourth review found 3 High, 9 Medium**, and the **fifth review of that closure found
2 High, 4 Medium**. Every earlier round closed the literal reproductions while an
equivalent path stayed open. The fifth review re-ran all twelve fourth-review payloads
(12/12 blocked) and independently reproduced six equivalent paths. **All six are now
fixed at their root cause, with a permanent regression each** (the exact payload suite:
8/8 blocked, the legitimate fix still lands). **The release verdict is still NOT READY**
— the gate requires Critical 0 and High 0 from an independent pass, and the **sixth
review is the next check**.

| Gap (before) | Now | Evidence |
|---|---|---|
| Confidence gate treated `null` (unknown, every template fix) as "good enough" | The gate reads **verification** confidence; `null` never passes. Template fixes carry `null` instead of a fabricated `0.5` | `src/lib/fix-verification.ts`, `src/lib/__tests__/fix-verification.test.ts` |
| Fixes were exact-string replacements of axe DOM HTML into source files | JSX/JS is located through a real AST (TypeScript compiler API) and patched at AST-derived offsets; occurrence-aware per rule **and** per element; placeholder and no-op rejection; the patched file is re-parsed and the patch discarded if it breaks | `src/lib/ast-patch.ts`, `src/lib/__tests__/ast-patch.test.ts`, `src/lib/__tests__/github-pr.test.ts` |
| Nothing re-ran axe on a patched page | axe is re-run on the remediation snippet for the rule it targets; only verified fixes open a PR; no browser means no PR (fail closed) | `src/lib/fix-verification.ts`, `src/app/api/github/create-pr/route.ts` |
| The VPAT PDF declared untested criteria out of scope | The PDF reuses `generateVPATData`: `not-evaluated`, per-criterion remarks, draft label on cover and footer | `src/app/api/reports/vpat/route.tsx`, `src/lib/__tests__/vpat-generator.test.ts` |

### Fifth independent security review (2026-11-22)

> **Historical — the six findings below are fixed.** The verdict was NOT READY —
> Critical 0, High 2, Medium 4, Low 0 — against tree `c62dc08`. The closure and
> its evidence are in `.ai/SECURITY-STATUS.md`; the release gate opens only when a
> sixth independent review returns READY.

**Verdict: NOT READY — Critical 0, High 2, Medium 4, Low 0.** The source under
review was `c62dc08`, whose `src` tree is identical to the requested baseline
endpoint `ea21622`. All attacks were local, used synthetic data and mocked GitHub
writes, and changed no shipped source.

| Finding | Severity | Reproduced unsafe result | Status |
|---|---|---|---|
| 5-H1 — an existing CSS class activates a full-viewport overlay after write | High | `class="overlay"` verified at confidence 1, written once, then Chromium measured `position:fixed`, `z-index:999999`, `1280×720` | **Closed** — the repository's own CSS is judged before a write; a remediation may not add a class |
| 5-H2 — an EJS-style server expression is written into `.html` | High | `<%= globalThis.__fifthTemplateInjection = true %>` verified, written and executed from the exact written expression | **Closed** — template grammar is rejected in the remediation, and a template destination is refused entirely |
| 5-M1 — entity-encoded `input type=image` loads in the customer browser | Medium | `type="im&#97;ge"` verified, written, and the local server received `/pixel` | **Closed** — the type is entity-decoded before it is classified |
| 5-M2 — `opacity:0!important` hides the visible label | Medium | Validation and visible-text checks passed; Chromium computed opacity `0` while `innerText` remained `Read more` | **Closed** — the priority suffix is stripped, and visibility is computed |
| 5-M3 — inert template/iframe/script-prefix content is counted as live | Medium | Each occurrence counted 1 and was written, while Chromium created 0 document images | **Closed** — the live-context scanner follows the browser |
| 5-M4 — omitted template extensions and submodules do not block a wrong-file patch | Medium | Only `index.html` was read and written even though `page.hbs` or a `type:"commit"` subtree could contain the duplicate | **Closed** — every text blob is scanned, a submodule makes the scan incomplete |

The twelve literal fourth-review payloads were all blocked. The candidate
`<!-->` comment variant and `java&NewLine;script:` URI were also blocked and are
not counted. Full outputs and required closure criteria are in
`.ai/SECURITY-STATUS.md`.

### Fifth-review closure (2026-11-22)

| Fix | Root cause | Regression |
|---|---|---|
| Destination stylesheet judgement (`src/lib/css-context.ts`) | The isolated verification does not contain the repository's CSS, so a class that activates an overlay verifies cleanly | `css-context.test.ts` (11 cases) + four writer cases |
| Server-template refusal | A `.html` extension does not prove static HTML; a template engine evaluates the patch **and** the review comment | three cases across two suites |
| Entity-decoded resource-loader classification | The raw `type` attribute was compared with `image`, so `im&#97;ge` slipped through | one case |
| CSS priority suffix and computed visibility | `!important` defeated the static guard, and `innerText` is a text extraction, not a visibility decision | three cases across three suites |
| Browser-equivalent live contexts | The hand-written scanner disagreed with Chromium on raw-text, inert and end-tag states | four cases |
| Complete tree scan | The extension allowlist and the `blob`-only filter made an incomplete scan look unique | two cases |

**Gate evidence:** tsc 0 · lint 0 · vitest 53 files / 634 tests · coverage
63.83 / 55.16 / 66.04 / 65.29 (thresholds 55 / 50 / 58 / 57) · build 0 ·
Playwright 79/79 · `npm audit --audit-level=high` 0 (15 moderate) · the exact
payload suite 8/8 blocked, temporary file deleted.

### Fourth-review closure (2026-11-22)

All twelve findings of the fourth review are fixed. Each fix is a root-cause fix in
the shared code with a permanent regression test:

| Finding | Severity | Fix |
|---|---|---|
| 4-H1 — a named-entity CSS overlay bypassed the style check (the entity table was partial) | High | A style value that carries an **entity, a CSS escape or a CSS comment** is rejected outright — a partial table cannot mirror what the browser resolves |
| 4-H2 — HTML's alternate `--!>` comment terminator | High | Both terminators (`-->`, `--!>`) are neutralized in the untrusted text |
| 4-H3 — a remediation validated as HTML was inserted into a JSX file or a TypeScript string | High | A brace is rejected; a fix is only written into a file whose destination context can be **proven** (HTML or JSX) — a TypeScript module or a mixed component file receives a review suggestion |
| 4-M1 — GFM autolinks a bare URL without Markdown syntax | Medium | The URL scheme is neutralized (`https&#58;//`, `www&#46;`); verified against GitHub's own Markdown API |
| 4-M2 — `plaintext` rewrote the rest of the customer document | Medium | `plaintext`, `xmp`, `listing`, `noscript`, `noembed` are rejected |
| 4-M3 — customer-side resource loading | Medium | `video`, `audio`, `source`, `track`, `input[type=image]` are rejected |
| 4-M4 — `encoding:'none'` was cached as a scanned (empty) file | Medium | It counts as unreadable → the scan is incomplete → nothing is patched |
| 4-M5 — `.mjs`/`.cjs`/`.mts`/`.cts` were outside the scan | Medium | The scan covers every source extension; the scanned-but-never-patched files still count |
| 4-M6 — `opacity:0` kept the text in the DOM, so both gates passed | Medium | `opacity:0` counts as hidden in the static guard (CSS and JSX-object form) |
| 4-M7 — "Read more" could be reduced to "R" | Medium | The replacement has to **keep** the original visible text |
| 4-M8 — two selected identical elements got their remediations swapped by request order | Medium | Such fixes cannot be mapped at all, so they stay review suggestions |
| 4-M9 — an element inside an HTML comment was patched and counted as applied | Medium | A live-tag scanner excludes markup in a comment, in a raw-text element and in an attribute value |

### Third review findings (2026-11-22), fixed

| Finding | Severity | Fix |
|---|---|---|
| A CSS escaped overlay (`p\6fsition:fixed`) passed the overlay denylist and was written into customer source | High | CSS escapes are decoded before the declaration is read; the check also removes CSS comments and decodes the HTML entities of the attribute value, the three steps the browser applies in that order |
| `frame` / `frameset` passed the active-element denylist and were written into customer source | High | `frame`, `frameset`, `noframes`, `portal` and `fencedframe` are rejected like every other embedding element |
| An attacker controlled axe selector injected a live Markdown link into the PR | Medium | The inline code span uses a fence longer than the longest backtick run in the value (and pads a value that starts or ends with a backtick); the fix document writes the selector as an inline code span. Verified against GitHub's own Markdown renderer |
| An incomplete GitHub scan (a file that could not be read, a truncated tree) patched the wrong file | Medium | A truncated tree returns immediately, an unreadable file marks the scan incomplete, and an incomplete scan never patches a file |
| A fix deleted the visible label that was only marked `aria-hidden` | Medium | `aria-hidden` removes content from the accessibility tree, not from the screen — its text counts as visible text |
| An opened PR could have no audit entry | Medium | The audit write is retried (`createAuditLogWithRetry`, 3 attempts) before the route reports a missing trail |
| A selected duplicate occurrence was patched at the wrong occurrence | Medium | A fix is only written when every occurrence of its element in the file is covered by a selected fix; otherwise it stays a review suggestion |

Two further defects of the same class were found while fixing the above: the review
comment written into a customer file could be closed by untrusted text (`*/`, `-->`),
and the summary file wrote the rule id and the file name unescaped.

### Re-review findings (2026-11-22), fixed

| Finding | Severity | Fix |
|---|---|---|
| A handler the **scanned page already carried** executed in the verification browser and was written into customer repositories; `/onerror=` and an entity encoded `javascript:` URI bypassed the old checks | High | Event handlers are rejected unconditionally and the attributes are parsed the way a browser parses them; URI attributes are checked against a scheme allowlist after entity decoding and normalisation; overlay styles are rejected; the template fallback strips the scanned page's handlers |
| WebSocket traffic escaped the HTTP route interception and reached an internal endpoint | High | `context.routeWebSocket` closes every socket, the document carries a restrictive CSP (`connect-src 'none'`), service workers are blocked |
| The request limit did not bound concurrent browser work | Medium | A global semaphore runs at most two verification batches, a batch has a 60 s budget, a request waits at most 30 s for a slot |
| A violation was linked to a PR without an accepted artifact | Medium | A violation is linked only when GitHub accepted an artifact for it; `fixesWithoutArtifact` reports the rest |
| The locator could still pick the wrong element (class) or the wrong file (truncated tree) | Medium | Every identity attribute the report carries is compared; the whole tree is scanned under a byte budget; an incomplete scan never patches a file |
| An opened PR was not guaranteed to have an audit entry | Medium | The audit entry is written before the violations are linked, `createAuditLog` returns whether it was stored, the response reports `auditRecorded` |
| Markdown injection survived in untrusted prose | Medium | Untrusted prose is escaped for Markdown as well as HTML; selectors are inline code spans that cannot be broken out of |
| Hidden text satisfied the visible-content check | Medium | The visible-text check ignores hidden content and the browser compares the **rendered** text, so a fix that hides the label fails |
| The VPAT `scanId` was not tenant isolated | Medium | The scan must belong to the authorized project (`404` otherwise) and violations are queried by project **and** scan |
| The documented manual-check override was not wired | Low | The stored catalog id is resolved to the WCAG criterion it assesses; a real manual pass clears minor/moderate findings, a manual fail marks the criterion not supported |

### First review findings (2026-11-21), fixed

| Finding | Severity | Fix |
|---|---|---|
| Unsafe remediation executed in the verification browser before the safety checks and could fake an axe pass (`<script/x>`) | High | The safety, rule and placeholder checks now run **before** anything is rendered; every script spelling, active element, active URI scheme and event handler is rejected |
| The verification browser could make the host fetch arbitrary URLs (SSRF) | High | The verification context aborts every network request and closes every WebSocket; each run has a 15 s deadline; the OS sandbox stays on outside Docker |
| The work limit was applied after the browser work and the route had no rate limit | High | The cap is applied before verification, a request may not carry more than 25 violations, and the route is rate limited per user |
| The "verified" / "applied" counters overstated what GitHub accepted | Medium | A refused write is not counted; only accepted files are reported; the PR summary states exactly what was verified |
| The locator could patch the wrong element (same `src`, different `id`) or the wrong file | Medium | Every identity attribute must match; a multi-file match is left to a human |
| The verified-fix path wrote no audit trail | Medium | Every opened PR writes a `github_pr_created` audit entry |
| Untrusted text could inject misleading Markdown into the PR | Medium | Raw HTML and Markdown syntax are escaped and code fences are sized to their content |
| The VPAT could show "Supports" for a criterion that still had a violation | Low | Any unresolved violation is "Partially Supports"; only a manual check can clear minor/moderate findings |
| An axe-verified replacement could delete the visible content of the element | P0 | A patch that empties an element with visible text is rejected (hidden text does not count) |

Two further defects were found and fixed on the way: `applyFixesToRepository` re-read
the original file for every violation (a second fix in the same file overwrote the
first), and the route linked **all** requested violations to the PR, including the ones
it had excluded.

## Verification

| Check | Result |
|---|---|
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — 0 errors |
| `npx vitest run` | PASS — 52 files, 605 tests, 0 failed (was 52/580) |
| `npx vitest run --coverage` | PASS — statements 62.88% / branches 54.46% / functions 64.91% / lines 64.26% (CI thresholds 55/50/58/57) |
| `npm run build` | PASS — exit 0, Next standalone build |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed (4.4 min) |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev-toolchain) |
| Reviewer exploit reproductions (6) | PASS — every reproduction of the re-review is blocked |
| Third-review reproductions (5 + 2) | PASS — the escaped overlay, the frame, the injected selector, the `aria-hidden` text deletion and the wrong duplicate occurrence are blocked; the CSS comment and the entity encoded overlay were found while fixing them and are blocked as well |
| Fourth-review reproductions (12) | PASS — all twelve fourth-review payloads are blocked on the fixed tree (the temporary reproduction file was deleted afterwards) |
| Fifth-review temporary suites | PASS as evidence harnesses — 36/36 broad assertions and 7/7 focused reproductions; every temporary test was deleted |
| Fifth-review equivalent paths | **FAIL — 2 High and 4 Medium findings reproduced**; see `.ai/SECURITY-STATUS.md` |
| Shipped suite after fifth-review cleanup | PASS — 52 files, 605/605 tests |
| Fifth-review source-only typecheck / lint / build | PASS — exit 0 / 0 errors / exit 0 (116 static pages) |
| Fifth-review dependency and secret checks | PASS — npm audit High 0/Critical 0; 771 tracked text files scanned with no live secret |
| GitHub Markdown API (bare URL) | PASS — the escaped URL renders as plain text; the control renders as a live link |
| Browser isolation (real Chromium) | PASS — no HTTP request and no WebSocket reaches a local server during verification |

The V23 code initially pushed global branch coverage to 49.98% (below the CI gate of
50). It was fixed by covering the new code, not by moving the threshold: the GitHub
writer and API helpers now sit at 87% branch coverage and the AST patcher at 91%.

## The CI pipelines

Three pipelines had been red on `main` since September; all eight defects are fixed
and documented in `.ai/DEPLOYMENT.md`: the Postgres health command is quoted, the
Trivy action is pinned, the AccessGuard self-scan runs against the public API, the
image build and the load build get the `NEXTAUTH_SECRET` / `NEXTAUTH_URL` that the
Next.js route collection needs, the image reference is lowercase, the runner ships an
npm without the HIGH CVEs the image gate found, and the image scan keeps its severity
filter in SARIF mode (the action drops it, so MEDIUM findings failed the job).
**Proof: Docker run 44955598091 completed ✅ on `8afc55a`** — the Trivy step passes
with the filter restored and the scanner pinned to `v0.76.2`. CI (44955597980),
Deploy (44955597965) and AccessGuard Scan (44955597959) are green on the same commit.

## Commits

- `8f44cc1` — `vol: engineering — V23: verified-fix pipeline (AST patching, axe verification, confidence gate, VPAT truth)`
- `b12484a` — `vol: docs — V23: verified-fix pipeline documentation and claim alignment`
- `d02161f` — `vol: state — V23: verified-fix engine evidence`
- `7498d46` — `vol: releases — V23: volume log entry`
- `3cd9ba6` / `a1bf6d7` / `6610d68` / `1cc529c` — first hardening pass (code, docs, state, volume entry)
- `93d880b` — PR-text escaping tests + scan coverage note
- `f40c251` / `999b02d` — coverage gate fix (tests, state)
- `f8f54f1` — `vol: devops — V23: repair the three CI pipelines`
- `4370a1a` — `vol: devops — V23: give the real-browser verification tests room on a cold CI runner`
- `8cb32db` — `vol: security — V23: close the re-review findings in the fix pipeline and the VPAT report`
- `086a6a3` / `bcf1b31` / `870267f` / `66dffba` — OpenAPI parity + docs + state + volume entry after the re-review
- `dbd7927` / `a55a340` / `19ab1ac` / `456d375` — the Docker pipeline repair (build env, lowercase image reference, npm without the HIGH CVEs)
- `e2d38b0` / `1a6b9c2` / `24fdb02` / `7c49b7b` / `8afc55a` — the third-review closure (code, devops, docs, state, volume entry)

## What this does NOT prove (read before making a claim)

- Verification is **rule-level on the remediation snippet**, not a full page re-scan and
  not a re-scan of the patched file. The customer's build is not available to the service.
- It does not prove the patch landed in the right file — an ambiguous match is left to a
  human rather than guessed.
- A verified fix can still break surrounding code. The PR is reviewed by a human before
  merge, and the PR summary states exactly what was verified.
- A fix is **never** written into a TypeScript module or a mixed component file
  (`.ts`, `.mts`, `.cts`, `.vue`, `.svelte`, `.astro`): the element text can sit inside a
  string or an expression there, so the destination context cannot be proven. Those
  fixes ship as a review suggestion. The files are still **scanned**, so a duplicate in
  one of them keeps the remaining match ambiguous.
- Verification results are reported in the PR, the API response and the audit log, not
  stored on the `Violation` row. Persisting them is on the roadmap.
- **No Strix result exists for this cycle.** The CLI is installed and the target was a
  sanitized export of the commit, but every configured provider refused the run (Gemini
  free tier quota exhausted, NVIDIA `meta/llama-3.3-70b-instruct` end-of-life, OpenAI
  credits exhausted). The security evidence for this cycle is the independent
  human-agent reviews (including the re-review) plus `npm audit`; Strix must be re-run
  before it can be cited.
- **The fifth independent security review returned NOT READY (High 2, Medium 4).**
  Six equivalent paths were reproduced in local, mocked conditions. The release gate
  stays closed until those findings are fixed and a new independent pass returns
  READY; see `.ai/SECURITY-STATUS.md`.

## Follow-ups logged, not done here

- Replace the end-of-life NVIDIA model in the free pool
  (`src/ai/model-router.ts`). The router fails over on 4xx, so the chain still completes,
  but every AI remediation wastes one provider call. Picking a live model needs a check
  of the current NVIDIA catalogue (next AI volume).
- Re-run the Strix pentest against the same sanitized export once a provider has quota.
- Run Chromium as a non-root user in the Docker image so the OS sandbox stays enabled
  for the verification browser.
- Cache the parsed AST per file instead of re-parsing it per fix (bounded by the 60 s
  batch budget today).
- A source map from the scanned URL to the repository path, so a match is never
  ambiguous and a repository over the 5 MB scan budget can still be patched.

## User actions required

None. Nothing needs a secret, a plan change, a DNS change or a manual migration.
