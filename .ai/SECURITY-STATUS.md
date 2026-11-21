# AccessGuard — Security Status

Last verification: 2026-11-22

## Fourth independent security review (2026-11-22)

**Verdict: NOT READY — Critical 0, High 3, Medium 9, Low 0.** The READY gate
requires Critical 0 and High 0. This tree is **not releasable** until the three
High findings below are fixed and their working reproductions are blocked.

The requested baseline was `456d375`, but a concurrent process committed the
review fixes while this review was running. The final results below were
re-run against the actual tree at `8afc55a` (`456d375..8afc55a` changes the
five reviewed source modules, their tests and CI/docs). No shipped source was
changed by this reviewer. All attacks were local, used synthetic data and
mocked GitHub writes, and touched no production or third-party target.

### Reproduced findings

| ID | Severity | Surface | Working reproduction and observed result | Root cause / impact |
|---|---|---|---|---|
| 4-H1 | **High** | Overlay-style safety | `<img id="overlay" src="x" alt="A" style="position&sol;&ast;x*&sol;:fixed;width:100%;height:100%">` → validation `valid:true`, axe confidence `1`, `fixesApplied:1`, repository write `index.html / 1`; Chromium computed `position:fixed`, `width:1280px`, `height:720px`. | The browser decodes the complete HTML entity set before CSS parsing, but the checker's named-entity table omits `ast`. The checker therefore sees `position/&ast;x*/` while Chromium sees `position/*x*/` and resolves `position:fixed`. A full-viewport overlay can be written into customer source. |
| 4-H2 | **High** | Untrusted source comment | A violation description containing `evil --!> <script>globalThis.__repositoryCommentBreakout = true</script>` → the review comment written into `index.html` contained both `--!>` and `<script>`; Chromium executed the script (`__repositoryCommentBreakout === true`). | `neutralizeCommentTerminator()` removes only the literal `-->`. HTML parsers also accept `--!>` as a comment end, so untrusted text closes the generated comment and turns the remainder into active markup in the customer repository. |
| 4-H3 | **High** | Source-language context | TSX: `<div role="button">Hello{globalThis.__jsxInjection = true}</div>` → validation `valid:true`, axe confidence `1`, `fixesApplied:1`, repository write `Card.tsx / 1`; rendering the component set `__jsxInjection === true`. TS: `<div role="button">Hello';globalThis.__tsInjection = true;//</div>` → `valid:true`, `fixesApplied:1`; executing the written module set `__tsInjection === true`. | Remediation is validated as HTML, then inserted into JSX or a TypeScript string without validating the destination lexical context. Braces and quote/line-comment escapes become executable customer code. |
| 4-M1 | Medium | Markdown injection | `escapeMarkdownText('https://evil.test/phishing')` → GitHub's Markdown API returned `href="https://evil.test/phishing"`. The same escaped prose is used for attacker-controlled descriptions in the PR body and fix document. | The Markdown escaper does not neutralize GFM bare-URL autolinks. The exact code-span selector injection is closed, but untrusted prose can still create a live attacker-controlled link. |
| 4-M2 | Medium | Active/raw-text element safety | `<img src="x" alt="A"><plaintext></plaintext>` → validation `valid:true`, axe confidence `1`, `fixesApplied:1`; Chromium reported `buttonCount:0` and rendered the later `<button>Continue</button>` as plain text. | `plaintext` is absent from the active-tag list. Its browser parsing semantics consume the rest of the customer document, so one accepted remediation can remove the remaining UI. |
| 4-M3 | Medium | Customer-side remote resource loading | Accepted `video`, `audio` and `input[type=image]` elements reached a local HTTP server; `source` and `track` are accepted as well. The verification browser blocks the request, but the accepted markup issues the request when the customer repository is served. | The active-tag list does not reject resource-loader elements and the HTTP(S) URI allowlist does not distinguish an unchanged customer resource from a newly introduced attacker/internal URL. The result is a client-side tracking and internal-network request primitive after merge. |
| 4-M4 | Medium | Complete source scan | `getContent` for `a.html` returned `{content:'', encoding:'none'}` while `b.html` contained the target → `filesModified:[{path:'b.html',fixesApplied:1}]` and one GitHub write. | The reader treats the presence of `content` as readable content. GitHub uses `encoding:'none'` when the Contents API cannot inline a large file; the empty value was cached as a successfully scanned file, so uniqueness was not proven. |
| 4-M5 | Medium | Complete source scan / file set | A tree containing `app.mjs` and `index.html`, both with the same target → only `index.html` was fetched and patched. `app.mjs` was silently outside the scan. | The source extension allowlist omits common source extensions (`.mjs`; the same family includes `.cjs`, `.mts` and `.cts`). A duplicate in an omitted file can make the remaining match look unique. |
| 4-M6 | Medium | Visible-content preservation | `<button><span>Read more</span></button>` → `<button><span style="opacity:0">Read more</span></button>` → `preservesVisibleContent:true`, `fixesApplied:1`; Chromium computed `opacity:0` and the accessible button name remained `Read more`. | The static guard only recognizes `hidden`, `display:none` and `visibility:hidden`; the verification gate checks `innerText`, which still contains opacity-zero text. The label can be made visually invisible while passing both gates. |
| 4-M7 | Medium | Visible-content preservation | `<button>Read more</button>` → `<button>R</button>` → axe confidence `1`, `fixesApplied:1`; the page body became `R`. | The guard only asks whether any replacement text exists. It does not preserve the original label, so almost all user-visible meaning can be removed while the fix is reported as verified and applied. |
| 4-M8 | Medium | Wrong occurrence | Two selected identical `<img src="same.jpg">` elements with remediations `Second` then `First` → `fixesApplied:2`; the first occurrence received `Second` and the second received `First`. | When every duplicate is selected, occurrence identity is still assigned from request order. The writer does not consume `elementSelector`, and the route's database query has no deterministic occurrence order, so the remediation can land on the wrong copy. |
| 4-M9 | Medium | Wrong target / applied counter | `<!-- <img src="a.jpg"> -->` → `fixesApplied:1` and the comment contained the patched image, but Chromium found `img` count `0`. | The plain-HTML locator is substring-based and does not exclude comments. A non-live target is patched and reported as applied, overstating the fix and leaving the real violation unchanged. |

### Exact findings and required variants re-run

| Original item | Current-tree result |
|---|---|
| H1 — CSS-escaped full-viewport overlay | **BLOCKED before write**: validation is false and `applyFixesToFile` applies 0 fixes. Direct CSS comments, numeric entities and the standard escape variants are also blocked. The named-entity variant above remains open. |
| H2 — `frame`/`frameset` remote document | **BLOCKED before write**: validation is false, 0 fixes, no frame written. `portal`, `fencedframe` and `math` are blocked. The raw-text and remote-loader variants above remain open. |
| M1 — backtick selector injection | **BLOCKED**: the PR body and fix document were rendered through GitHub's Markdown API and contained neither `href="https://a.test"` nor `>x</a>`. Sized inline-code fences and adversarial backtick runs are blocked. GFM bare-URL autolinking remains open as 4-M1. |
| M2 — truncated tree and unreadable file | **BLOCKED before write**: both reproductions produce `filesModified:[]` and no GitHub write. The `encoding:none` and omitted-extension variants remain open as 4-M4/4-M5. |
| M3 — `aria-hidden` label deletion | **BLOCKED**: the exact replacement is rejected, 0 fixes are applied and `Read more` remains. The opacity and label-reduction variants remain open as 4-M6/4-M7. |
| M4 — audit write failure | **PASS against the stated acceptance criterion**: `createAuditLogWithRetry` makes exactly 3 attempts with 250 ms and 500 ms delays. The route honestly reports `auditRecorded:false` after exhaustion. Residual risk: the PR still exists without an audit row when the database remains unavailable; this is not counted as a new finding because retry was the required closure. |
| M5 — one selected occurrence among two duplicates | **BLOCKED before a source patch**: 0 fixes; both elements remain unchanged and the fallback is a review comment. When both duplicates are selected, request-order and comment-target variants remain open as 4-M8/4-M9. |

### Verification evidence

| Command / check | Result |
|---|---|
| `npx vitest run src/lib/__tests__/tmp-security-review.test.ts src/app/api/github/create-pr/__tests__/tmp-security-review.test.ts --reporter=verbose` | exit 0 — 2 files, 32/32 review reproductions passed. A passing reproduction asserts that the unsafe behavior is still present; the exact H1/H2/M1–M5 cases assert that the write is blocked. |
| `npx vitest run --reporter=dot` (with the two temporary review files) | exit 0 — 54 files, 612/612 tests passed. |
| `npx vitest run --reporter=dot` (after temporary-file deletion) | exit 0 — 52 shipped files, 580/580 tests passed. |
| `npx tsc -p tsconfig.check.json --noEmit` | exit 0. |
| `npm run lint` | exit 0. |
| `npm run build` | exit 0 — Next 16.4.6 compiled successfully and generated 116 static pages. |
| `npm audit --audit-level=high --json` | exit 0 — Critical 0, High 0, Moderate 15, Low 0. |
| Tracked-file secret scan | 771 tracked text files scanned without printing values. No live secret was found. One AWS-key-shaped string is a documentation example under `.openclaw/skills/`; no `.env`, key, PEM, credential or service-account JSON file is tracked. |
| GitHub Markdown API | `gh api markdown --method POST --input -` returned HTTP 200 for every adversarial PR/fix rendering. |

### OWASP/security-surface disposition for this scoped pass

| Surface | Result |
|---|---|
| Injection / XSS | **FAIL** — 4-H1 through 4-H3 reproduce in Chromium or by executing the written customer source. |
| SSRF / network isolation | Verification isolation remains blocked for the exact H2 path; **FAIL at the customer-repository boundary** because 4-M3 can introduce customer-side requests. |
| Auth / session / CSRF / OAuth / cookies / CORS / headers | No changed code in these surfaces in this scoped review; not independently re-audited in this pass. The reviewed route continues to use the existing verified-email RBAC guard. |
| SQL injection | The reviewed route uses Prisma parameters and no raw SQL; no SQLi reproduction was found in scope. |
| Command injection / uploads | No shell execution or upload path exists in the reviewed module; no reproduction was attempted outside scope. |
| Rate limits / resource bounds | The existing request cap, per-user rate limit and two-browser semaphore were unchanged; no new concurrency reproduction was found in this pass. |
| RBAC / tenant isolation | The route scopes violations through `project.orgId = auth.user.orgId`; no cross-tenant bypass was reproduced in the reviewed path. |
| Audit trail | Retry semantics pass the stated criterion; the persistent-database-failure residual is recorded above. |
| Dependencies / secrets | `npm audit` has no High/Critical finding; the tracked-file scan found no live secret. |

### Untested / out of scope

- No production, third-party or public target was scanned; live GitHub writes were mocked. No Strix finding is claimed.
- No full Playwright E2E, coverage, Docker image/SBOM, multi-instance concurrency or container-Chromium run was performed in this pass.
- GitHub Markdown rendering was tested through GitHub's API, but no pull request was opened and no GitHub repository was mutated.
- Vue/Svelte/Angular framework event-directive execution was not run in a framework runtime; the finding count relies on the reproduced JSX and TypeScript source-context executions.
- This was a focused V23 verified-fix/GitHub-writer audit, not a fresh full-product review of authentication, session lifecycle, CSRF, OAuth, CORS, uploads, SQLi or command injection.

### Cleanup

Both temporary review files were deleted. Immediately after deletion,
`git status --short` showed only the pre-existing `.ai/DEPLOYMENT.md` change; no
temporary test or source change remained. This report and the accompanying
state/report updates are documentation-only changes made by the reviewer.

### Fourth-review closure (2026-11-22)

All twelve findings of the fourth review are fixed. Each fix is a **root-cause**
fix in the shared code, not a payload-specific block, and each has a permanent
regression test that fails on the old code.

| ID | Root cause | Fix |
|---|---|---|
| 4-H1 | The overlay check decoded the attribute with a **partial** named-entity table, so an entity the table did not know (`&ast;`) was read as literal text while the browser resolved it as a CSS comment | The style check no longer decodes entities at all: a style value that carries an **entity (`&`), a CSS escape (`\`) or a CSS comment (`/*`)** is **rejected**. A partial table cannot mirror the browser, so the value is not guessed (`src/lib/github-pr.ts`, `checkStyleAttribute`) |
| 4-H2 | `neutralizeCommentTerminator` neutralized only `-->`; an HTML comment also ends at `--!>` | Both terminators are neutralized (`-->`, `--!>`) |
| 4-H3 | The remediation was validated as HTML and then written into a JSX file or a TypeScript string without a destination-lexical check | A remediation may not contain a **brace** (it opens a JSX expression and a template interpolation). A fix is only written into a file whose destination context can be **proven**: an HTML file or a JSX file. A TypeScript module or a mixed component file (`.ts`, `.mts`, `.cts`, `.vue`, `.svelte`, `.astro`) has no proven context — the element text can sit inside a string or an expression — so the fix ships as a **review suggestion**. JSX attribute values additionally escape `&` and `"` so a value cannot break out of the attribute |
| 4-M1 | GFM autolinks a bare URL without any Markdown syntax, so escaping Markdown syntax was not enough | `escapeMarkdownText` neutralizes the scheme of a URL (`https&#58;//`, `www&#46;`). Verified against GitHub's own Markdown API: the escaped text renders as plain text, the control still renders as a live link |
| 4-M2 | `plaintext` was missing from the active-tag list | `plaintext`, `xmp`, `listing`, `noscript` and `noembed` were added to the list |
| 4-M3 | Resource-loader elements were accepted | `video`, `audio`, `source`, `track` and `input[type=image]` are rejected |
| 4-M4 | `encoding:'none'` was cached as a successfully scanned (empty) file | `encoding:'none'` counts as **unreadable** → the scan is incomplete → nothing is patched |
| 4-M5 | The source-extension allowlist omitted `.mjs`/`.cjs`/`.mts`/`.cts` | The scan covers `html, htm, tsx, jsx, ts, js, mjs, cjs, mts, cts, vue, svelte, astro`. Files that are scanned but never patched still count, so a duplicate in one of them keeps the remaining match ambiguous |
| 4-M6 | The static visibility guard knew `hidden`, `display:none` and `visibility:hidden`; `opacity:0` keeps the text in the DOM, so the rendered-text check does not catch it | `opacity:0` counts as hidden in the static guard (CSS and JSX-object form) and the **root element's** own hidden state is checked, not only its children |
| 4-M7 | The guard asked only whether the replacement had *any* text | The replacement has to **keep** the original text (normalized, case-insensitive): "Read more" → "R" is rejected. A replacement that keeps the text next to more text is accepted |
| 4-M8 | The occurrence identity came from the request order, which is not the occurrence order | Two selected copies of the same element with **different** remediations cannot be mapped at all, so they stay review suggestions (`conflictingRemediationKeys`) |
| 4-M9 | The HTML locator was substring-based and matched markup inside a comment | A **live-tag scanner** (`liveTagStarts`) excludes markup inside a comment (both terminators), inside a raw-text element (`script`, `style`, `textarea`, `title`, `xmp`, `plaintext`, `noscript`) and inside another tag's attribute value. Such an element is neither patched nor counted |

The reviewer's exact payloads were re-run as a temporary suite after the fixes:
all twelve are blocked, and the temporary file was deleted afterwards. The
permanent regression tests are in `src/lib/__tests__/github-pr.test.ts`,
`src/lib/__tests__/ast-patch.test.ts` and `src/lib/__tests__/github.test.ts`.

## Third independent security review (2026-11-22)

**Verdict: NOT READY — Critical 0, High 2, Medium 5.** The READY gate requires
Critical 0 and High 0, so this tree is **not releasable** until both High findings
are fixed and the reproductions below pass again.

> **Status: the literal third-review findings below were fixed and their exact
> reproductions were blocked.** The fourth independent review then found
> equivalent paths that remain open; its verdict is recorded in the section
> above and in `.ai/FINAL-REPORT.md`.

Requested baseline: `dbd7927`. The reviewed application source was unchanged in
`dbd7927..456d375`; the only scoped-file difference was the Docker runner's npm
CLI upgrade. All reproductions were local, used synthetic data and mocks, and
changed no shipped source, `.env` file or production secret. Temporary test files
were deleted after the run.

### Findings

| ID | Severity | Surface | Reproduction and observed result | Root cause / impact |
|---|---|---|---|---|
| H1 | **High** | Overlay-style safety | `<img src="x" alt="A" style="p\6fsition:fixed;l\65 ft:0;t\6fp:0;z-\69 ndex:2147483647;width:100%;height:100%">` → `{"validation":{"valid":true},"fixesApplied":1,"writtenOverlay":true,"verification":{"status":"verified","confidence":1},"computed":{"position":"fixed","left":"0px","top":"0px","zIndex":"2147483647","width":"1280px","height":"720px"}}`; the repository writer also accepted and wrote the escaped overlay. | `checkStyleAttribute` compares the literal CSS property/value text. A browser resolves CSS escapes, so `p\6fsition` becomes `position` and bypasses the overlay denylist. The fix verifies the target axe rule but not visual safety, then can write a full-viewport overlay into customer source. |
| H2 | **High** | Active/embedding-content safety | `<html lang="en"><head></head><frameset><frame src="http://127.0.0.1:<port>/attacker"></frame></frameset></html>` → `{"validation":{"valid":true},"verification":{"status":"verified","confidence":1},"filesModified":[{"path":"index.html","fixesApplied":1}],"appliedFixIds":["v1"],"wroteFrame":true,"frameCount":1,"hits":["/attacker"]}`. | The active-tag denylist omits `frame`, `frameset`, `portal` and `fencedframe`. A remote frame therefore passes validation, verifies for `html-has-lang`, and is written into a customer repository. If merged, it can replace or frame the customer UI with attacker content. |
| M1 | Medium | Markdown injection | An attacker-controlled axe selector `img[data-mark="`` [x](https://a.test)"]` was reproduced from scanned HTML. GitHub's Markdown renderer returned status 200 and `<a href="https://a.test" ...>x</a>` for both the PR body inline-code line and the raw selector in the fix document. | `inlineCode` always uses two ticks when the value contains any backtick, so an embedded two-tick run closes the span. `generateFixFile` also writes the raw selector outside a fence. The result is attacker-controlled link injection in PR Markdown. |
| M2 | Medium | Complete source scan | A failed `getContent` for `a.html` still produced `{"filesModified":[{"path":"b.html","fixesApplied":1}],"appliedFixIds":["v1"]}`. A GitHub tree with `truncated: true` also produced `{"filesModified":[{"path":"a.html","fixesApplied":1}],"appliedFixIds":["v1"]}`. | File-fetch failures are swallowed and `git.getTree(...).truncated` is ignored. A partial scan can therefore look unique and patch the wrong remaining file, contradicting the documented “incomplete scan never patches a file” guarantee. |
| M3 | Medium | Visible-content preservation | `<button><span aria-hidden="true">Read more</span></button>` → `<button aria-label="Action"></button>` produced `{"fixesApplied":1,"deletedReadMore":true,"verification":{"status":"verified","confidence":1},"beforeText":"Read more","afterText":""}`. | `aria-hidden` hides content from the accessibility tree, not from sighted users, but the static guard treats it as visually hidden. Because the original visible text is classified as empty, the content-loss guard never runs; axe still verifies the accessible name. |
| M4 | Medium | Audit-trail failure semantics | With `createAuditLog` returning false, the route still returned `{"status":200,"success":true,"prCreated":1,"auditRecorded":false}` after opening the PR. | The PR is created before the audit write and an audit failure does not fail or queue the request. The response is honest, but an opened repository mutation can exist with no audit entry and no retry/alert path. |
| M5 | Medium | Wrong occurrence | Two identical `<img src="same.jpg">` elements with a violation selected for the second occurrence produced `{"filesModified":[{"path":"index.html","fixesApplied":1}],"appliedFixIds":["v2"],"firstHasSelectedFix":true}` and wrote the fix to the first element. | The repository writer does not consume `elementSelector`; it infers occurrence from request order. A selected duplicate can therefore be patched at the wrong occurrence while reporting the selected fix id as applied. |

### Required attack-surface result

| # | Surface | Result |
|---|---|---|
| 1 | Event handlers and active URI schemes | **PASS** — carried/spaced/slash-separated handlers, encoded `javascript:`, script spellings, and percent-encoded pseudo-schemes were rejected; template fixes stripped carried handlers. |
| 2 | Overlay and active/embedding-content safety | **FAIL** — H1 and H2. |
| 3 | Verification-browser network isolation | **PASS** — real Chromium observed `hits: []`, `upgrades: 0`, WebSocket state `3`; HTTP, WS, form, frame, meta-refresh, CSS URL, image and srcset requests did not reach the local server. |
| 4 | Confidence, cap, rate-limit and concurrency gates | **PASS** — unverified/null confidence opened no PR (`400`), a rejected rate limit opened no PR (`429`), 26 ids were rejected before verification (`400`, zero verification calls), and the existing two-batch semaphore tests passed. |
| 5 | Wrong target / wrong file | **FAIL** — M2 and M5. |
| 6 | Audit trail and link-failure semantics | **FAIL** — M4. The violation-row update failure itself is reported as `violationsUpdated: 0` and the audit is attempted first. |
| 7 | Markdown injection | **FAIL** — M1. |
| 8 | Visible-content preservation | **FAIL** — M3. |
| 9 | VPAT tenant isolation and manual-check truth | **PASS** — a foreign scan returned `404` with no violation query; project+scan scoping, catalog-id manual pass/fail, and the critical/serious manual-pass guard passed. |
| 10 | Docker secret handling and dependency audit | **PASS** — a synthetic build sentinel and the placeholder DB URL were absent from `.next`; the built image had no `NEXTAUTH_SECRET`/`DATABASE_URL` environment and no 128-hex value in `.next` or image history; the temporary image was deleted. `npm audit`: Critical 0, High 0, Moderate 15 (dev toolchain). |

### Disposition — every finding fixed (2026-11-22)

| ID | Fix | Evidence |
|---|---|---|
| H1 | `decodeCssEscapes()` decodes CSS escapes before the overlay-property check (`src/lib/github-pr.ts`) | The reproduction payload now fails validation with `remediation code sets an overlay-capable style property: position`; `applyFixesToFile` applies 0 fixes and writes no overlay. Regression test in `src/lib/__tests__/github-pr.test.ts`. |
| H2 | `frame`, `frameset` and `noframes` are rejected like every other embedding element | The reproduction payload now fails validation with `remediation code introduces a <frame> element`; 0 fixes are applied and no frame is written. Regression test in `src/lib/__tests__/github-pr.test.ts`. |
| M1 | `inlineCode()` uses a fence longer than the longest backtick run in the value (and pads a value that starts or ends with a backtick); the fix document writes the selector as an inline code span | Rendered through GitHub's own Markdown API (`POST /api/v1/markdown`, mode `gfm`): the old two-tick span produced `<a href="https://a.test">x</a>`, the new three-tick span produces `<code>…</code>` and no link. Regression test in `src/lib/__tests__/github-pr.test.ts`. |
| M2 | A truncated tree returns immediately; a file that cannot be read marks the scan incomplete; an incomplete scan never patches a file (`src/lib/github.ts`) | The reproductions now produce `filesModified: []` and no write; regression tests in `src/lib/__tests__/github.test.ts`. |
| M3 | `hidesContent()` no longer treats `aria-hidden` as visually hidden (`src/lib/ast-patch.ts`) | The reproduction payload is rejected (`fixesApplied: 0`), the visible text `Read more` is preserved. Regression test in `src/lib/__tests__/ast-patch.test.ts`. |
| M4 | `createAuditLogWithRetry()` retries the audit write (3 attempts, growing delay) before the route reports a missing trail (`src/lib/audit.ts`) | Regression test in `src/lib/__tests__/audit-retry.test.ts`; the route test asserts the retried call. |
| M5 | A fix is only written when every occurrence of its element in the file is covered by a selected fix (`countElementOccurrences` in `src/lib/ast-patch.ts`, the selected-per-key count in `applyFixesToFile`) | The reproduction now applies 0 fixes; the two source elements stay untouched and the fix is offered as a review comment. Regression test in `src/lib/__tests__/github-pr.test.ts`. |

Two further defects of the same class were found while fixing the above. The
summary file now escapes the rule id and encodes the file name. The review
comment originally neutralized the literal `*/` / `-->` terminator; the fourth
review reproduced HTML's alternate `--!>` terminator, so comment neutralization
is **not closed** (4-H2 above).

### Verification evidence

- `npm test -- --reporter=dot` → 51 files, 566 tests passed.
- `npm run lint` → exit 0; `npx tsc -p tsconfig.check.json --noEmit` → exit 0.
- Synthetic production build → exit 0; Docker image build → exit 0.
- `npm audit --json` → `{critical:0, high:0, moderate:15}`.
- No Strix result is claimed: no autonomous scan was run in this review.

### Untested / out of scope

- No production, third-party or public target was scanned; live GitHub writes were mocked.
- No multi-instance rate-limit/semaphore test, no verification browser run inside the runtime container, no full Playwright E2E suite and no independent Trivy/SBOM verification were performed in this pass.
- This was a focused V23 review of the verified-fix/GitHub/VPAT/build surfaces, not a new full-product auth, session, CSRF, OAuth, CORS, upload, SQLi or command-injection audit.

## Independent re-review of the V23 hardening (2026-11-22)

The first hardening pass was reviewed again against the shipped code (`7498d46..HEAD`).
The verdict was **NOT READY (High 2, Medium 7, Low 1)**: the first pass had closed the
*literal* reproductions, but equivalent paths were still open. Every finding of that
re-review is fixed in `8cb32db` and covered by a regression test.

| # | Finding | Reproduction | Fix |
|---|---|---|---|
| H1 | A handler the **scanned page already carried** survived into the fix, executed in the verification browser and was written into customer repositories; `/onerror=` bypassed the old regex; an entity encoded `javascript:` URI was executable in HTML and TSX | `<img src=x onerror=globalThis.__pwned=1>` → `verified / confidence 1`; `<img src=x /onerror=…>` → executed; `<a href=&#106;avascript:…>` → executed on click | Event handlers are rejected **unconditionally** and the attributes are parsed the way a browser parses them (`src/lib/html-attributes.ts`). URI attributes are checked against a scheme allowlist after entity decoding and whitespace normalisation. Overlay capable styles are rejected. The template fallback strips the handlers of the scanned element. The verification document carries a restrictive CSP (`connect-src 'none'`) |
| H2 | WebSocket traffic escaped the HTTP route interception and reached an internal endpoint | A local server saw `WS /internal` during `verifyFixes` | `context.routeWebSocket('**/*')` closes every socket, the document CSP forbids every connection, service workers are blocked, and the HTTP route abort stays in place (`createVerificationContext`) |
| M1 | The request count limit did not bound concurrent browser work | 20 concurrent requests → 20 Chromium instances | A global semaphore runs at most two verification batches, a batch has a 60 s budget, and a request waits at most 30 s for a slot |
| M2 | A violation was linked to a PR without an accepted artifact | `createFile` fails for the fix file → the violation is still linked | A violation is linked only when GitHub accepted an artifact for it (a patched source file or its fix document); `fixesWithoutArtifact` reports the rest |
| M3 | The locator could still select the wrong element or the wrong file | Two `<img src="x">` with different classes → the first was patched; the target file as the 51st tree entry → the first file was patched | Every identity attribute the report carries is compared (class, `aria-label`, `role`, `data-testid` included) and the **whole** source tree is scanned, bounded by a byte budget instead of a file count; an incomplete scan never patches a file |
| M4 | An opened PR was not guaranteed to have an audit entry | `db.violation.updateMany` fails after the PR exists → no audit call | The audit entry is written **before** the violations are linked, `createAuditLog` returns whether the entry was stored, and the response reports `auditRecorded` |
| M5 | Markdown injection survived in untrusted prose | `![tracking pixel](https://attacker.example/pixel)` kept its link in the PR body | Untrusted prose is escaped for Markdown as well as for HTML; code samples keep a sized fence and a selector is an inline code span that cannot be broken out of |
| M6 | Hidden text satisfied the visible-content check | `<span hidden>Read more</span>` → the visible label was gone but the patch was accepted | The visible-text check ignores hidden content (`hidden`, `aria-hidden`, `display:none`, `visibility:hidden`) and the verification browser compares the **rendered** text, so a fix that hides the label fails |
| M7 | The VPAT `scanId` was not tenant isolated | `projectId` of tenant A + `scanId` of tenant B → a report built from B's violations | The scan is verified to belong to the authorized project (`404` otherwise) and the violations are queried by project **and** scan |
| L1 | The documented manual-check override was not wired | The generator looked up WCAG ids (`1.1.1`), the manual checks are stored under catalog ids (`meaningful-alt`) | The stored id is resolved through the catalog to the WCAG criterion it assesses; a real manual pass clears minor/moderate findings, a manual fail marks the criterion not supported, and a pass never clears a critical or serious finding |

### Disposition of the first review's findings

| First review item | Disposition |
|---|---|
| H1 — unsafe remediation execution | **Not closed** by the first pass (equivalent execution through a carried handler) → closed by the re-review fix |
| H2 — verification browser SSRF | **Not closed** by the first pass (HTTP blocked, WebSocket open) → closed by the re-review fix |
| H3 — cap / rate limit | **Partially closed** (concurrency unbounded) → closed by the re-review fix |
| M1 — overstated counters | **Partially closed** (PR linkage overstated) → closed by the re-review fix |
| M2 — wrong element / file | **Not closed** (class and file-list variants) → closed by the re-review fix |
| M3 — audit trail | **Partially closed** (failure paths) → closed by the re-review fix |
| M4 — Markdown injection | **Not closed** (raw HTML escaped, Markdown not) → closed by the re-review fix |
| L1 — VPAT false support | Automated path closed in the first pass; the manual override was incomplete → closed by the re-review fix |
| QA P0-3 — visible content deletion | **Not closed** (hidden text variant) → closed by the re-review fix |

## Independent review of V23 (QA + security review, before the hardening pass)

Two independent reviews of the V23 diff (`21a1d00..HEAD`) were run. Both found
reproducible defects. The security review's verdict was **NOT READY (High 3)**; the QA
review's verdict was **PARTIAL** with three reproduced P0 defects. The table below
states what the first hardening pass fixed; the rows that were not fully closed are
marked and were closed by the re-review fix above.

### High — fixed

| # | Finding | Reproduction | Fix |
|---|---|---|---|
| H1 | Unsafe remediation executed in the verification browser before the safety checks and could fake an axe pass | `<img src="x" alt="A"><script/x>globalThis.__pwned=1</script>` → `verified / confidence 1` | The safety, rule and placeholder checks now run **before** anything is rendered (`verifyFixes` rejects first). The script check covers every spelling (`<script>`, `<script/x>`, `< script >`); active elements (`iframe`, `object`, `embed`, `applet`, `base`, `svg`, `style`, `link`, `meta`) are rejected; URI schemes are checked against an allowlist; **every** event handler is rejected (see the re-review fix for the handler that was carried by the scanned page) |
| H2 | The verification browser was a server-side SSRF and active-content primitive | A local server received `GET /internal` for `<img src="http://127.0.0.1:…/internal">` | The verification context aborts **every** network request and closes every WebSocket; the document carries a restrictive CSP; each render and axe run has a 15 s deadline; the Chromium sandbox stays on except where it cannot be used (Docker runs as root) |
| H3 | The per-request work limit was applied after the expensive work, and the route had no rate limit | Every submitted violation cost a browser launch and an axe run | The cap (`MAX_FIXES_PER_PR = 25`) is applied **before** verification, the request may not carry more than 25 violations, the route is rate limited per user (`rateLimits.remediation`) and a global semaphore bounds the concurrent browsers |

### Medium / low — fixed

| # | Finding | Fix |
|---|---|---|
| M1 | The "verified" / "applied" counters overstated reality | A failed GitHub write is no longer counted as modified or applied; only accepted files are counted; the PR summary now says "the remediation snippet was re-scanned for the rule it targets" and states that verification is rule-level, not a full re-scan |
| M2 | The locator could patch the wrong element or the wrong file | Every identity attribute the report carries must now match; an element found in more than one file is left to a human; the whole tree is scanned under a byte budget |
| M3 | The automated verified-fix path wrote no audit trail | Every opened PR writes a `github_pr_created` audit entry with the verified and skipped counts and the rules involved — written before the violations are linked |
| M4 | Untrusted descriptions, explanations and remediation text could inject misleading Markdown into the PR | Raw HTML **and** Markdown syntax in untrusted fields are escaped, and code fences are sized to the content they wrap |
| L1 | The VPAT could show "Supports" for a criterion that still had a violation | Any unresolved violation now yields "Partially Supports"; only a manual check can clear minor/moderate findings, and never a critical or serious one |

### P0 defects reproduced by QA — fixed

| # | Finding | Fix |
|---|---|---|
| P1 | Unsafe remediation was rendered before validation (see H1) | Validation moved before rendering |
| P2 | The AST matcher returned after the first distinguishing attribute, so two elements with the same `src` but different `id` patched the wrong one | Every identity attribute the report carries must match |
| P3 | An axe-verified replacement could delete the visible content of the element (`Read more` → `aria-label` + empty element) | A patch that empties an element with visible text is rejected — hidden text does not count as visible text |

## Findings fixed in the V23 cycle

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | The confidence gate treated `null` (unknown confidence, every template fix) as "good enough", so unverified fixes were written into customer repositories | High (trust) | FIXED — the gate reads verification confidence; `null` never passes (`src/lib/fix-verification.ts`) |
| 2 | A "fix" identical to the original element counted as applied | Medium (trust) | FIXED — no-op detection in `applyFixesToFile` |
| 3 | Fixes containing `TODO` / `{{…}}` / `YOUR_ALT_TEXT` were written into customer repositories | Medium | FIXED — placeholder rejection before patching |
| 4 | Patches were exact-string replacements of axe DOM HTML into source files, so JSX was patched by accident or not at all | High (correctness) | FIXED — AST-aware location for JSX/JS, re-parse guard discards a patch that breaks the file |
| 5 | `applyFixesToRepository` re-read the original file per violation, so a second fix in the same file overwrote the first | High (data loss in the PR) | FIXED — one fetch and one write per file |
| 6 | The VPAT PDF declared untested criteria out of scope | High (legal) | FIXED — the PDF reuses `generateVPATData` (`not-evaluated` + remarks) and is labelled a draft |

## Residual risk

| Risk | Rating | Why it is accepted |
|---|---|---|
| The Docker image runs Chromium as root, so the OS sandbox is disabled there | 🟡 MEDIUM | The verification document carries a restrictive CSP, the context aborts every HTTP request and closes every WebSocket, only validated markup is rendered, every run has a deadline, and the route is rate limited. Running the container as a non-root user is the follow-up (it also needs the Chromium sandbox packages). |
| Verification is rule-level on the remediation snippet, not on the patched file | 🟠 HIGH | Accepted by design: the customer's build is not available to the service. The patched file is re-parsed (syntax guard), ambiguous matches are left to a human, and the PR states exactly what was verified. |
| The element is located by content, not by a source map from the scanned URL | 🟠 HIGH | **Accepted after the fourth-review closure:** the scan is complete (every source extension, an unreadable file makes it incomplete, a truncated tree makes it incomplete, a byte budget bounds it) and only a **live tag** counts, so uniqueness is proven within what was scanned. A stable source-map identity remains the real fix and is on the roadmap. |
| The AST is re-parsed per fix and per file | 🟢 LOW | Bounded by the 60 s batch budget and the 5 MB scan budget. Caching the parsed AST per file is on the roadmap. |
| A repository larger than the scan budget is never patched in place | 🟢 LOW | A complete scan is required to prove uniqueness; a tree that does not fit stays a review suggestion. Reported as `fixesWithoutArtifact` / a review file, never as a silent patch. |
| Two selected copies of the same element with different remediations cannot be mapped | 🟢 LOW | **Closed after the fourth review:** the request order is not an occurrence identity, so such fixes stay review suggestions and the source is never patched with a swapped remediation (4-M8). |
| A fix is never written into a TypeScript module or a mixed component file | 🟢 LOW | **Accepted:** the element text can sit inside a string or an expression there, so the destination context cannot be proven. The fix ships as a review suggestion and the file is still scanned, so a duplicate in it keeps the remaining match ambiguous (4-H3). |

## Dependency audit

```
npm audit --audit-level=high   → exit 0
Critical: 0 · High: 0 · Moderate: 15 (dev-toolchain only)
```

## External scan coverage

| Scanner | Where it runs | Status |
|---|---|---|
| `npm audit --audit-level=high` | local + CI (`.github/workflows/ci.yml`) | pass — Critical 0, High 0 |
| Independent security-engineer review of the V23 diff | local (CTO loop) | run four times: the first pass returned NOT READY (High 3) and all findings were fixed; the **re-review of that hardening** returned NOT READY (High 2, Medium 7, Low 1) — every finding fixed and covered by regression tests; the **third review** returned NOT READY (High 2, Medium 5) — every finding fixed and the exact reproductions blocked; the **fourth review** returned **NOT READY (High 3, Medium 9)** with 32 working reproductions |
| Independent QA-engineer review of the V23 diff | local (CTO loop) | run once: 3 reproduced P0 defects, all fixed and covered by tests |
| Strix autonomous pentest (OSS CLI 1.6.2) | local (CTO loop) | **BLOCKED — the scan did not run.** The CLI is installed and the target was a sanitized export of the commit (no `.env` in the sandbox), but every configured provider refused the run: the default Gemini free tier is quota-exhausted (429, retry in ~14 h), NVIDIA's `meta/llama-3.3-70b-instruct` returns 410 Gone (model end-of-life 2026-08-26), and the OpenAI key has no credits left. No Strix finding exists for this cycle — do not cite Strix as evidence. Re-run it when a provider has quota. CI wiring has the same gap: the step needs an LLM secret the repository does not have, so it is not added rather than added broken. |

V23 dependency change: `typescript` and `axe-core` were promoted to production
dependencies (they are imported by runtime code; the lockfile diff is 9 lines, no new
packages were downloaded).

Upgrades applied for the published advisories:

| Package | Before | After | Advisory |
|---|---|---|---|
| next | 16.3.4 | 16.4.6 | RCE in `next/og` ImageResponse; `use cache` draft-mode leak |
| @sentry/nextjs | 10.66.0 | 10.78.0 | Middleware bypass with tunnel route |
| zod | 4.4.3 | 4.6.7 | Memory exhaustion on oversized constrained collections |
| prisma / @prisma/client | 6.11.1 | 6.19.3 | ReDoS via `effect` (override `effect ^3.22.1`) |
| sharp (override) | 0.35.4 | 0.35.5 | librsvg CVE-2026-96889 |
| vite (override) | 8.2.0 | 8.3.8 | launch-editor command execution / fs checks |
| source-map-js (override) | 1.2.1 | 1.2.4 | Event-loop denial of service |
| brace-expansion (nested overrides) | 1.1.18 / 5.0.9 | 1.1.22 / 5.0.13 | Quadratic expansion + stack exhaustion |

## Findings fixed in this cycle

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Public onboarding endpoints (`/api/onboarding/scan`, `/api/onboarding/vpat`) claimed rate limiting but had none — each request spawns a real browser scan | High (compute abuse) | FIXED — 5/min per client, shared bucket, covered by `src/app/api/onboarding/onboarding-rate-limit.test.ts` |
| 2 | Scan-auth credentials (login script, login credentials) were stored unencrypted | High | FIXED — AES-256-GCM at rest, `src/lib/scan-auth.ts` |
| 3 | Scan-auth GET returned the login script when no `scriptConfig` was set | High | FIXED — scripts and credentials are never returned; values are masked |
| 4 | Scan-auth used a hand-rolled permission check instead of the RBAC guard | Medium | FIXED — `requireVerifiedEmail(..., { permission: MANAGE_SETTINGS })` |
| 5 | Audit whitelist test matched non-audit `action:` fields | Low (test defect) | FIXED — the test now anchors on audit writes only |
| 6 | `projectId` was read from the unvalidated request body | Low | FIXED — validated by the Zod schema |
| 7 | 9 audit actions had no UI label (`audit-actions-diff` reported MISSING_LABELS=9) | Low | FIXED — labels added to `messages/en.json` + `messages/hi.json` (MISSING_LABELS=0) |
| 8 | Fresh-database deploy was broken (`Organization.pagesQuota` missing; agency/integration schema never migrated) | High (release blocker) | FIXED — two idempotent migrations, fresh DB reaches zero drift |

## Scan-auth credential handling (current design)

- Guard: verified email + `manage_settings` permission on every verb, project scoped to the caller's org.
- At rest: cookie values, sensitive header values, the login script and the login credentials are encrypted (AES-256-GCM).
- In transit: reads mask secrets (`••••••••`); the script and credentials are omitted.
- In the scanner: decrypted only when the browser context is prepared.
- Audit trail: `scan_auth_created` / `scan_auth_updated` / `scan_auth_deleted`.

## Not verified in this cycle

- Strix pentest — the CLI is installed but every configured provider refused the run
  (quota exhausted / model end-of-life / no credits). The independent reviews above
  cover the changed code paths; no Strix finding exists for this cycle.
- The fourth independent review returned **NOT READY (High 3, Medium 9)**. The
  exact third-review cases remain blocked, but equivalent paths are open. The
  fix loop and a new independent review are required before the tree can be
  claimed READY.
