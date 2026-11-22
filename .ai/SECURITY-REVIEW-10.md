# AccessGuard — Tenth Independent Security Review

Date: 2026-11-23

## 1. Verdict

**NOT READY — Critical 0, High 4, Medium 4, Low 0.**

The release gate requires **Critical 0 and High 0**. Four independently
reproduced High findings pass validation and isolated axe verification, are
reported as verified with confidence `1`, and each reaches the real repository
writer with one applied fix and one mocked repository write. Chromium confirms
a full-page customer UI takeover in each High case.

Four Medium findings also violate the required fail-closed direction: a paused
animation hides the patched content, a focus-activated stylesheet causes a
customer-side request, the create-PR route creates a branch, two documents and
a pull request after the destination writer refuses the source patch, and a
persistent audit failure leaves the already-created pull request without an
audit entry.

This tree is not releasable until every High reproduction is blocked in the
unsafe direction, permanent regressions cover the root causes, and a fresh
independent review returns READY.

This is the tenth-review security artifact. The existing
`.ai/SECURITY-STATUS.md` and every other existing `.ai/` file were intentionally
not changed.

## 2. Reviewed trees and boundary

| Item | Value |
|---|---|
| Requested baseline | `08ab9ef8c2a0efe6c8abd6a7f07cbfe22975876c` (`vol: releases — V23: volume log entry for the seventh-review closure cycle`) |
| Reviewed closure tree | `d1cabd68fb84e5a5a1bea96f1214811631636f70` (`vol: security — V23: close the ninth review's geometry, activated-rule, runtime, URI and paint findings`) |
| Current checkout at report time | `78ec7511ba4f3485bc28f15e1273d84e4190b266` (`vol: releases — V23: volume log entry for the ninth-review closure cycle`) |
| Current `origin/main` | `78ec7511ba4f3485bc28f15e1273d84e4190b266` |
| Baseline-to-tree identity | `git diff --quiet 08ab9ef8c2a0efe6c8abd6a7f07cbfe22975876c d1cabd68fb84e5a5a1bea96f1214811631636f70 -- src` returned **exit 1**. The two trees differ in `src`. |
| Tree-to-checkout identity | `git diff --quiet d1cabd68fb84e5a5a1bea96f1214811631636f70..HEAD -- src` returned **exit 0**. The later checkout changed no scoped or other `src` file. |
| Baseline-to-tree source diff | 8 files, 1,486 insertions and 72 deletions: `src/lib/css-context.ts`, `src/lib/fix-verification.ts`, `src/lib/github-pr.ts`, `src/lib/github.ts`, and their four permanent regression files |
| Review scope | `src/lib/css-context.ts`, `src/lib/github-pr.ts`, `src/lib/ast-patch.ts`, `src/lib/fix-validation.ts`, `src/lib/fix-verification.ts`, `src/lib/github.ts`, `src/lib/html-attributes.ts`, and `src/app/api/github/create-pr/route.ts`, including the directly related validation, verification, write, authorization, rate-limit, and audit call path |
| Reviewer changes | Report only. No shipped source, permanent test, dependency, lockfile, CI, environment, schema, or existing `.ai/` file was changed. No commit, push, deployment, database migration, or secret change was performed. |

Every reproduction used a local synthetic repository, a mocked GitHub/Octokit
transport, local Playwright Chromium, and listeners bound only to `127.0.0.1`.
No production, public, customer, or third-party target was scanned. No live
repository was mutated. No external GitHub Markdown service was called. The npm
advisory registry was used only for `npm audit`; it was not a test target. No
`.env` value was inspected or printed.

**Strix/self-scan status:** skipped as required by the review request. **No
Strix result, finding, confidence, or pass is claimed.** The local working
reproductions and the shipped regression evidence in this report are the only
security-test evidence claimed.

## 3. Scope, threat model, and method

The review tests the V23 verified-fix/GitHub-writer chain: an accessibility
remediation is generated for customer-owned source, validated, verified with
axe-core in an isolated Chromium document, and then written to a connected
customer repository. The security boundary is not only “does axe stop firing?”
A remediation must also preserve the customer's content, navigation, network
behavior, focus behavior, and rendering after repository CSS and customer
runtime code are combined with the generated fix.

The unsafe direction for every prior and equivalent case below is strict:

- the unsafe remediation must fail validation (`validation: false`) or produce
  a non-null destination-harm reason;
- it must not be reported as verified/applied;
- it must apply **0 fixes**; and
- it must perform **0 repository writes**.

The method was:

1. establish the requested baseline, reviewed closure tree, and current source
   identity;
2. re-run every literal fourth-, fifth-, sixth-, seventh-, eighth-, and
   ninth-review payload in its unsafe direction;
3. re-check the legitimate behaviours;
4. exercise equivalent CSS selector, painted-box geometry, focus-state,
   runtime-carrier, runtime-state-read, animation-play-state, URI, writer, and
   route/audit paths;
5. require an observable Chromium geometry/paint/focus result or a local
   `127.0.0.1` request before counting a candidate as a finding; and
6. run the build, source-only typecheck, lint, targeted and full unit suites,
   coverage gate, Chromium E2E suite, dependency audit, and non-secret-printing
   tracked-file secret scan.

Nine new writer-level equivalent payloads reproduced the unsafe result. Each
returned `validation.valid=true`, destination `harm=null`, verification
`status:"verified"` with confidence `1`, one applied fix, and one mocked
repository write. Browser or local-request evidence separated the six
content/UI/request findings from the route and audit findings. No Critical
finding was reproduced.

## 4. Reproduced findings

### 4.1 New equivalent-path matrix

| Candidate | Validation | Destination harm | Isolated verification | Fixes | Mocked source writes | Browser / local-request proof |
|---|---:|---:|---:|---:|---:|---|
| 10-H1a — inline HTML runtime mutation | true | null | verified, confidence `1` | 1 | 1 (`index.html`) | Target changed from a static `16×16` image to a fixed `1280×720`, `z-index:2147483647` element; viewport center became the target. |
| 10-H1b — external script property getter | true | null | verified, confidence `1` | 1 | 1 (`index.html`) | The linked `app.js` changed the same target from static `16×16` to fixed `1280×720`; viewport center became the target. |
| 10-H2 — escaped CSS attribute name | true | null | verified, confidence `1` | 1 | 1 (`index.html`) | `[a\\6ct]` matched the patched `alt` attribute; target changed from static `16×16` to fixed `1280×720`; viewport center became the target. |
| 10-H3a — scaled painted box | true | null | verified, confidence `1` | 1 | 1 (`index.html`) | `scale:3` produced a `1920×1080` painted target at the viewport center. |
| 10-H3b — border-box growth | true | null | verified, confidence `1` | 1 | 1 (`index.html`) | `border:10000px` produced a `20640×20360` painted target at the viewport center. |
| 10-H3c — padding-box growth | true | null | verified, confidence `1` | 1 | 1 (`index.html`) | `padding:10000px` produced a `20037.34375×20034` painted target at the viewport center. |
| 10-H4 — focus-activated sibling overlay | true | null | verified, confidence `1` | 1 | 1 (`index.html`) | The patched input became `document.activeElement`; its sibling changed from static `1264×18` to fixed `1280×720`, `z-index:2147483647`; viewport center became the overlay. |
| 10-M1 — paused animation | true | null | verified, confidence `1` | 1 | 1 (`index.html`) | Target computed opacity changed from `1` to `0` while the animation remained paused. |
| 10-M2 — focus-activated CSS resource | true | null | verified, confidence `1` | 1 | 1 (`index.html`) | Before the fix: no focus request. After the fix: the input was focused, computed `background-image` pointed to the local URL, and the listener received `GET /focus-pixel`. |

### 4.2 Findings

| ID | Severity | Surface | Working reproduction and observed result | Root cause / impact |
|---|---|---|---|---|
| 10-H1 | **High** | Repository runtime carriers and state reads | Repository HTML contained the inline script `document.querySelectorAll("img").forEach(function(img){if(img.hasAttribute("alt"))img.classList.add("overlay")});` and CSS `.overlay{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647}`. The ordinary `alt="Photo"` fix produced `{"validation":{"valid":true},"harm":null,"verification":{"status":"verified","confidence":1},"fixesAppliedTotal":1,"writeCount":1}` and Chromium changed the target from static `16×16` to fixed `1280×720`. The external-file twin `document.querySelectorAll("img").forEach(function(img){if(img.alt)img.classList.add("overlay")});` produced the same writer result and browser takeover. | `SCRIPT_FILE_PATTERN` covers script file extensions only, so an inline `<script>` in `.html` never enters runtime analysis. For a linked script, `RUNTIME_MUTATION_PATTERN` sees `classList.add`, but `RUNTIME_STATE_READ_PATTERN` recognizes method reads only and not DOM property getters such as `img.alt`; the script therefore misses the conditional-mutation gate and does not name the target by id. The fix activates latent customer runtime behavior that takes over the page. |
| 10-H2 | **High** | CSS identifier escape semantics | Repository CSS `[a\\6ct]{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647;background:#f0f}` with `<img id="target" src="x">` → `<img id="target" src="x" alt="Photo">` produced `{"validation":{"valid":true},"harm":null,"verification":{"status":"verified","confidence":1},"fixesAppliedTotal":1,"writeCount":1}`. Chromium decoded the identifier as `alt`, changed the target to fixed `1280×720`, and put the target at the viewport center. | `parseSubject()` decodes CSS escapes in an attribute **value** but keeps the attribute **name** as raw `a\\6ct`. The browser resolves the name to `alt`; `matchSubject()` therefore returns `no`, omits the rule, and reports no destination harm. This is a browser-valid equivalent of the blocked sixth-review CSS-escape payload. |
| 10-H3 | **High** | Destination painted-box geometry | Three repository-CSS variants each returned `{"validation":{"valid":true},"harm":null,"verification":{"status":"verified","confidence":1},"fixesAppliedTotal":1,"writeCount":1}` while Chromium measured customer-visible takeover: `[alt]{position:fixed;width:50vw;height:50vh;scale:3;background:#f0f}` produced a `1920×1080` target; `[alt]{position:fixed;width:50vw;height:50vh;border:10000px solid #f0f}` produced `20640×20360`; and `[alt]{position:fixed;padding:10000px;background:#f0f}` produced `20037.34375×20034`. The viewport center was the patched target in every case. | The destination model judges the content-box width/height and only treats `scale:0` as harmful. A non-zero scale above `1` is not bounded, `padding` is listed but never composed into the painted box, and `border` is ignored. A rule activated by `alt` can therefore paint an opaque customer-page takeover even though the analyser reports no harm. |
| 10-H4 | **High** | Focus-state activation of sibling rules | Repository CSS `input:focus ~ .overlay{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647;background:#f0f}` with remediation `<input id="target" type="text" aria-label="Name" autofocus>` produced `{"validation":{"valid":true},"harm":null,"verification":{"status":"verified","confidence":1},"fixesAppliedTotal":1,"writeCount":1}`. Before the fix the input was not focused and the sibling was static `1264×18`; after the fix `document.activeElement.id` was `target` and the sibling was fixed `1280×720` with the maximum z-index at the viewport center. | `changesBetween()` records added attributes and classes only. `compoundActivatedByFix()` does not model a pseudo-class state transition, and no rule connects the newly added `autofocus` to `:focus`. The rule's subject is another element, so it is also invisible to the subject-only state decision. The accessibility fix activates a customer UI takeover. |
| 10-M1 | **Medium** | Repository animation play state | Repository CSS `[alt]{animation:hide 1s paused}@keyframes hide{from{opacity:0}to{opacity:1}}` with the ordinary `alt` fix produced `{"validation":{"valid":true},"harm":null,"verification":{"status":"verified","confidence":1},"fixesAppliedTotal":1,"writeCount":1}`. Chromium measured computed opacity `1` before the attribute and `0` after it. | The animation model chooses an endpoint from `animation-direction` but ignores `animation-play-state:paused`. A paused animation remains at its first frame, so the normal-direction `to` frame is not the state the customer sees. The fix removes customer-visible content while passing isolated axe verification. |
| 10-M2 | **Medium** | Customer-side CSS resource activation through focus | Repository CSS `input:focus{background-image:url(http://127.0.0.1:<port>/focus-pixel)}` with the same `autofocus` remediation produced `{"validation":{"valid":true},"harm":null,"verification":{"status":"verified","confidence":1},"fixesAppliedTotal":1,"writeCount":1}`. The local listener received no request before the fix and `GET /focus-pixel` after it; Chromium computed the exact local `background-image` URL. | The activated-rule check only recognizes an added/changed attribute or class as the activation hook. It does not recognize a focus-state transition, so the network-bearing declaration is not refused. The request occurs in the customer browser after merge, not in the isolated service browser. |
| 10-M3 | **Medium** | Create-PR route writes after destination refusal | The exact ninth-review `9-H1` logical-inset candidate (`[aria-label]{position:fixed;inset-block-start:0;inset-block-end:0;inset-inline-start:0;inset-inline-end:0;z-index:2147483647}`) was run through the real route, real isolated verifier, and real repository writer with a mocked GitHub transport. The writer correctly returned a non-null destination harm, applied **0 fixes**, and wrote **0 source files**. The route nevertheless performed four repository mutations: branch creation, `accessguard-fixes/button-name-v1.md`, `accessguard-fixes/summary.md`, and pull-request creation. The response was HTTP `200`, `success:true`, `fixesAppliedTotal:0`, `violationsUpdated:1`, and `fixesWithoutArtifact:0`. | The route creates the branch before calling the writer, then creates a fix document and summary for every isolated-verified violation without distinguishing a destination refusal from a successful source patch. It then links the violation to the PR. The strict zero-write direction is therefore violated even though the source file itself remains unchanged. |
| 10-M4 | **Medium** | Audit-trail failure after irreversible mutation | The same route reproduction injected a persistent `createAuditLogWithRetry` failure. The branch, two documents, and pull request had already been created; the response was HTTP `200`, `success:true`, and `auditRecorded:false`. | The audit write occurs after pull-request creation and is best effort. Three retries cannot create a durable trail when the database remains unavailable, and the response still reports overall success. An externally visible repository mutation can therefore exist with no `github_pr_created` audit record. |

### 4.3 Finding-to-code map

| Finding | Primary code path |
|---|---|
| 10-H1 | `src/lib/github.ts` — `SCRIPT_FILE_PATTERN`, `RUNTIME_STATE_READ_PATTERN`, `RUNTIME_MUTATION_PATTERN`, and the conditional-mutation gate |
| 10-H2 | `src/lib/css-context.ts` — `parseSubject()`, `matchSubject()`, `matchSelector()` |
| 10-H3 | `src/lib/css-context.ts` — `RELEVANT_PROPERTIES`, `JUDGEMENT_PROPERTIES`, `stateOf()`, and `destinationCssHarm()` |
| 10-H4 / 10-M2 | `src/lib/css-context.ts` — `changesBetween()`, `compoundActivatedByFix()`, `matchSelector()` |
| 10-M1 | `src/lib/css-context.ts` — `animationNamesOf()`, `animationDirectionOf()`, and the animation endpoint selection in `stateOf()` |
| 10-M3 | `src/app/api/github/create-pr/route.ts` — branch creation, `applyFixesToRepository()`, fix-document/summary creation, and `acceptedViolationIds` |
| 10-M4 | `src/app/api/github/create-pr/route.ts` and `src/lib/audit.ts` — `createAuditLogWithRetry()` and the post-PR audit ordering |

## 5. Exact prior-payload re-run

All literal prior-review payloads were re-run against the reviewed source. The
unsafe direction means that the payload must not validate/remain eligible, must
not be verified/applied, and must not reach a repository write.

### Ninth-review closure matrix — 42/42 passed

The recovered closure matrix was copied temporarily into the repository, run,
and deleted. It contained:

- **26 writer-level unsafe payloads** from the fourth through ninth reviews;
- **4 validator-level unsafe groups**; and
- **12 legitimate behaviour groups**.

Observed result: **1 test file, 42/42 tests passed**. Every unsafe writer
payload produced 0 fixes and 0 writes; every validator payload was refused;
and every legitimate behaviour remained allowed.

### Prior/legitimate assertion matrix — 118/118 passed after a harness-only correction

The recovered fourth-to-eighth-review matrix contains 94 unsafe assertions
across 40 payload groups and 24 legitimate assertions across 13 behaviour
groups.

The recovered original harness first produced **117/118** because one assertion
expected confidence `0` for a candidate rejected before verification, while the
current API correctly returns confidence `null`. This was a harness expectation
error, not a product result. The temporary harness was corrected to assert the
required unsafe direction directly: validation false or non-null harm, no
eligible/verified fix, 0 fixes, and 0 writes. The corrected rerun produced
**118/118**.

### Ninth-review closure candidate probe — 15/15 expected outcomes

The recovered 15-candidate Chromium/Octokit probe produced the expected
closure result for all 15 candidates: **14 unsafe closure cases were blocked
with 0 fixes and 0 writes**, while the previously dismissed `contain:size`
candidate remained allowed and still showed no invisible-content result.

The literal fourth-, fifth-, sixth-, seventh-, and eighth-review payload
results are therefore unchanged from the ninth-review closure evidence.

## 6. Legitimate behavior checked

The 12 groups in the 42-test closure matrix and the 13 groups in the
118-assertion matrix passed. They cover:

| Behavior | Result |
|---|---|
| Ordinary `image-alt` fix in HTML | PASS — one fix applied; `alt="Photo"` written. |
| Ordinary `image-alt` fix in TSX | PASS — one fix applied. |
| Ordinary `image-alt` fix in JS containing JSX | PASS — one fix applied. |
| Legitimate `https:` href | PASS — validates. |
| Legitimate `mailto:` href | PASS — validates when it is the candidate itself. |
| Preserved relative destination | PASS — `/account` remains `/account` and validates. |
| Existing class preserved | PASS — the original `card` class remains and validates. |
| Benign inline style | PASS — `border:1px solid #ccc` validates. |
| Three identical copies selected together | PASS — all three patched in one write. |
| Two of three identical copies selected | PASS — neither patched; match not provable. |
| Twelve additional server-template spellings | PASS — all twelve rejected. |
| Ordinary repository script | PASS — a script that creates no runtime style does not block the ordinary fix. |
| Mocked symlink with no inline content | PASS — scan incomplete; 0 fixes/writes. |

## 7. Verification commands and evidence

All commands were run from `C:\PROJECTS\AccessGuard` with `cmd /c`, using
`npm`/`node`/`npx` rather than `bun`.

### Tree and source-identity commands

```text
cmd /v:on /c "git diff --quiet 08ab9ef8c2a0efe6c8abd6a7f07cbfe22975876c d1cabd68fb84e5a5a1bea96f1214811631636f70 -- src & echo BASELINE_TO_TREE_EXIT=!errorlevel! & git diff --quiet d1cabd68fb84e5a5a1bea96f1214811631636f70..HEAD -- src & echo TREE_TO_HEAD_EXIT=!errorlevel!"
cmd /c git diff --stat 08ab9ef8c2a0efe6c8abd6a7f07cbfe22975876c d1cabd68fb84e5a5a1bea96f1214811631636f70 -- src
cmd /c git diff --numstat 08ab9ef8c2a0efe6c8abd6a7f07cbfe22975876c d1cabd68fb84e5a5a1bea96f1214811631636f70 -- src
cmd /c git rev-parse HEAD
cmd /c git rev-parse origin/main
```

Observed: baseline-to-tree source diff returned **exit 1**; tree-to-current
source identity returned **exit 0**; current HEAD and `origin/main` were
`78ec7511ba4f3485bc28f15e1273d84e4190b266`. The working tree was clean before
this report was created.

### Build, typecheck, lint, tests, browser suite, and dependencies

```text
cmd /c npm run build
cmd /c npx tsc -p tsconfig.check.json --noEmit
cmd /c npm run lint
cmd /c npx vitest run src/lib/__tests__/css-context.test.ts src/lib/__tests__/fix-verification.test.ts src/lib/__tests__/fix-validation.test.ts src/lib/__tests__/github-pr.test.ts src/lib/__tests__/github.test.ts src/lib/__tests__/ast-patch.test.ts src/lib/__tests__/html-attributes.test.ts src/app/api/github/create-pr/route.test.ts --reporter=dot
cmd /c npm test -- --reporter=dot --silent=passed-only
cmd /c npx vitest run --coverage --reporter=dot --silent=passed-only
cmd /c npx playwright test --project=chromium
cmd /c npm audit --audit-level=high --json
```

| Check | Observed result |
|---|---|
| Build | PASS — exit 0; Next 16.4.6; 116 static pages generated. |
| Source-only typecheck | PASS — exit 0. |
| Lint | PASS — exit 0; 0 errors. |
| Targeted scoped regressions | PASS — 8 files, 368/368 tests passed. |
| Vitest | PASS — 53 files, 750/750 tests passed. |
| Coverage | PASS — statements 65.22% (threshold 55); branches 57.50% (50); functions 67.04% (58); lines 66.70% (57). |
| Playwright Chromium | PASS — 79/79 tests passed in 4.3 minutes. |
| `npm audit --audit-level=high` | PASS for the release gate — Critical 0, High 0, Moderate 15, Low 0. |

### Local reproduction commands

The recovered and new harnesses were outside the repository under the approved
temporary directory, were piped to `tsx` through stdin where module resolution
required the repository working directory, and were removed after the review.
The mocked Octokit transport intercepted repository reads/writes, Playwright
launched local Chromium, and the only application listeners bound to
`127.0.0.1`.

```text
cmd /c npx tsx -  # recovered 118-assertion prior/legitimate matrix
cmd /c npx tsx -  # recovered 15-candidate ninth-review closure probe
cmd /c npx tsx -  # new runtime, CSS escape, painted-box, focus, animation and resource probe
cmd /c npx vitest run src/app/api/github/create-pr/review10-route-evidence.test.ts --reporter=verbose  # temporary route/audit evidence
```

The temporary route test used the real route, real isolated verifier, and real
repository writer with a mocked GitHub transport. It was deleted immediately
after the passing run.

Observed:

- recovered prior/legitimate matrix — **118/118 literal assertions passed**
  after the documented harness-only correction;
- recovered ninth-review closure matrix — **42/42 tests passed**;
- recovered closure candidate probe — **15/15 expected outcomes**;
- new equivalent writer probe — **9/9 candidates** returned validation true,
  destination harm null, verification confidence `1`, one fix, and one write;
- local Chromium/local-request evidence reproduced every browser and network
  result in the finding table; and
- temporary route evidence — **1/1 test passed**, confirming four repository
  mutations after the source writer refused and `auditRecorded:false` after a
  persistent audit failure.

The inline `tsx` harness defined `globalThis.__name` inside Chromium solely to
neutralize the `keepNames` helper that the inline TypeScript loader emits into
`page.evaluate` callbacks. It did not change application logic or the result
under test.

### Secret and dependency check

```text
cmd /c git ls-files .env .env.*
cmd /c node -  # tracked-file pattern scan; prints only path and category
```

Observed: 776 tracked files were enumerated; only `.env.example` is tracked in
the `.env*` name family. The actual `.env` file was neither tracked nor
inspected. Of 775 text candidates scanned, the path-only scan found one
AWS-key-shaped string in a tracked documentation example under
`.openclaw/skills/document-generate/SKILL.md`; its value was not printed and it
was not treated as a live credential. No tracked private key, GitHub-token
shape, OpenAI-style key, Google API key, Stripe live key, or Slack token was
found by the same path-only categories. No secret was modified.

## 8. OWASP and security-surface disposition

| Surface | Scoped result |
|---|---|
| Injection / XSS / source integrity | **FAIL** — 10-H1 through 10-H4 write fixes whose composed customer-page effect is a full-viewport UI takeover; 10-M1 writes a fix that removes customer-visible content. No script execution was reproduced. |
| SSRF / customer-side network isolation | The service-side verification browser continues to block network requests in isolation. The **customer-repository boundary fails** through 10-M2: the customer browser can be made to issue a remote request after merge. |
| Authentication / sessions / OAuth | The scoped route still requires a NextAuth session or bearer token, verified email, and `CREATE_PR` permission. OAuth token exchange/connect flows were unchanged and were not re-audited end to end. No new auth/session bypass was found in the scoped diff. |
| RBAC / tenant isolation | PASS in the scoped route: `requireVerifiedEmail(..., CREATE_PR)`, `project.orgId = auth.user.orgId`, exact violation-count check, connected-repository allow-list, and GitHub write-access validation remain. This is not a fresh full-product authorization audit. |
| CSRF / cookies / CORS / headers | The route has no route-local CSRF-token comparison and relies on the existing NextAuth/session behavior, JSON request shape, and non-simple optional `x-github-token` header. The middleware requires authentication for non-public API paths, and the scoped route adds no permissive CORS policy. Global headers include CSP, HSTS, frame denial, nosniff, referrer and permissions policies; API responses are `no-store`. No fresh browser CSRF test was performed in this focused diff; no CSRF finding is claimed. |
| SQL injection | PASS in scope — the route uses Prisma parameterised queries; the scoped modules contain no raw SQL. No SQLi reproduction was found. |
| Command injection / uploads / deserialization | No shell execution, upload path, or unsafe deserialization was changed in the scoped diff. No fresh full-product command-injection/upload audit is claimed. |
| Rate limits / resource bounds | PASS in scope — the request cap, per-user remediation rate limit, browser semaphore, repository scan budgets, and fail-closed truncated/oversized scans remain. No new concurrency exhaustion was reproduced. |
| Audit trail | **FAIL** — 10-M4 reproduces an opened pull request with `auditRecorded:false` after the persistent audit failure. The existing retry does not create a durable trail. |
| Secrets | PASS — no live tracked secret found; no `.env` value inspected; no secret changed. |
| Dependencies | PASS for the release gate — `npm audit` reports High 0 and Critical 0. The 15 Moderate findings remain in the dependency/toolchain risk queue. |

## 9. Required closure criteria

1. **Runtime carrier and state-read completeness (10-H1):** inspect inline
   `<script>` blocks in repository HTML and equivalent embedded carriers, and
   recognize DOM property getters as state reads. A script that conditionally
   mutates an element in response to an attribute the fix adds must make the
   destination unprovable: 0 fixes, 0 writes, no verified/applied state.
2. **Browser-equivalent CSS identifiers (10-H2):** decode CSS escapes in
   selector identifiers, including attribute names, or use a browser-equivalent
   selector parser. An attribute-name spelling the browser resolves to the
   changed hook must activate the rule.
3. **Effective painted-box geometry (10-H3):** compose scale above `1`,
   padding, border, box-sizing, and the other properties that can expand the
   painted box. A rule the fix activates whose painted bounds may cover the
   viewport must be unprovable, never harmless.
4. **Pseudo-class and focus activation (10-H4 / 10-M2):** model the state
   transitions a fix can cause, including focus from `autofocus` or a new
   focusability hook. A rule the fix can activate on the target or another
   element must be judged, including its network-bearing declarations.
5. **Animation play state and fill (10-M1):** read `animation-play-state` and
   the effective fill/direction so the state the customer sees is selected.
6. **No repository side effects after a destination refusal (10-M3):** perform
   the destination/runtime decision before creating a branch or any fix
   artifact. Under this review's strict direction, a destination-harmful
   candidate must produce 0 source fixes, 0 repository writes, and no PR.
7. **Durable audit before/with irreversible mutation (10-M4):** create a
   durable audit intent/outbox record before the GitHub mutation or otherwise
   guarantee a recoverable trail. A persistent audit failure must not leave a
   successful, unaudited pull request indistinguishable from an audited one.
8. For **every reproduction above**, the unsafe remediation must end with
   `validation:false` or a non-null destination-harm reason, 0 fixes, 0
   repository writes, and no verified/applied state.
9. Add permanent regressions for every reproduction. Before the next independent
   review, re-run all **12 fourth-review**, **6 fifth-review**, **8
   sixth-review**, **8 seventh-review**, **6 eighth-review**, and the
   ninth-review closure reproductions in their unsafe direction, plus the 13
   legitimate behaviour groups.

## 10. Untested / out of scope

- No production, public, customer, or third-party target was scanned. No live
  GitHub repository, GitHub Markdown service, or public URL was called. The npm
  advisory registry was used only for dependency metadata.
- Strix autonomous/self-scan execution was skipped as required. **No Strix
  result is claimed.**
- Chromium was the only browser engine. Safari, Firefox, WebKit, mobile engines,
  and customer build pipelines were not exercised.
- No Sass/Less/Stylus/PostCSS compiler was run. The CSS proofs use valid
  browser CSS and repository source shapes; they do not claim a particular
  preprocessor's output.
- Runtime JavaScript was not exhaustively exercised beyond the proven inline
  script, property-getter, focus, CSS-resource, and prior class/style/service
  worker cases. Other language and framework carriers remain residual risk.
- GitHub Markdown rendering was not exercised against an external service;
  only local escaping behaviour and the exact 4-M1 payload were checked.
- The symlink result uses a mocked no-inline-content GitHub response shape; no
  live GitHub repository was queried.
- This was a focused V23 verified-fix/GitHub-writer audit, not a fresh
  full-product review of authentication, session lifecycle, CSRF, OAuth, CORS,
  uploads, SQL injection, command injection, or container hardening.
- No Docker image/SBOM, multi-instance concurrency, container-Chromium, or
  infrastructure scan was performed in this pass.

## 11. Cleanup and artifact integrity

Every temporary harness lived outside the repository under the approved
temporary directory or was created temporarily inside the repository and
deleted immediately after its run. No shipped source file, permanent test,
generated fix, dependency file, lockfile, database record, schema, environment
file, or existing `.ai/` file was changed. No commit, push, deployment,
database migration, destructive Git command, Strix run, production change, or
secret modification was performed.

Only `.ai/SECURITY-REVIEW-10.md` was created. The final working tree shows
that one untracked report file and no other reviewer change.
