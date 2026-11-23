# AccessGuard — Eleventh Independent Security Review

Date: 2026-11-23

## 1. Verdict

**NOT READY — Critical 0, High 3, Medium 3, Low 0.**

The release gate requires **Critical 0 and High 0**. Three independently
reproduced High findings pass validation and isolated axe verification, are
reported as verified with confidence `1`, and reach the real repository writer
with one applied fix and one mocked repository write. Local Chromium confirms
a viewport-wide customer UI takeover for each High case. The real
create-PR route also opens a pull request for the inline-handler and zoom
variants.

Three Medium findings also violate the required fail-closed direction: a
`max-height`/clipping rule removes the patched control from the customer paint,
a resource hidden behind an activated custom property causes a customer-side
request, and animation timing/fill semantics can hold the patched control at
zero opacity.

This tree is not releasable until every High reproduction is blocked in the
unsafe direction, permanent regressions cover the root causes, and a fresh
independent review returns READY.

This is the eleventh-review security artifact. The existing
`.ai/SECURITY-STATUS.md` and every other existing `.ai/` file were intentionally
not changed.

## 2. Reviewed trees and boundary

| Item | Value |
|---|---|
| Requested baseline | `08ab9ef8c2a0efe6c8abd6a7f07cbfe22975876c` (`vol: releases — V23: volume log entry for the seventh-review closure cycle`) |
| Reviewed closure tree | `7ec51eed0dfa61c3af8d4cfb3d42c61d6f9a7c5e` (`vol: security — V23: close the tenth review's runtime, geometry, focus, plan and audit findings`) |
| Current checkout at report time | `0df2299265581a76c09f9d89029e39c980ee5447` (`vol: state — V23: record the tenth-review pipeline evidence`) |
| Current `origin/main` | `0df2299265581a76c09f9d89029e39c980ee5447` |
| Closure-tree-to-checkout identity | `git diff --quiet 7ec51ee..HEAD -- src` returned **exit 0**. The later checkout changed no scoped or other `src` file. |
| Baseline-to-closure source diff | 11 files, 2,818 insertions and 178 deletions: the destination/runtime, writer, route/audit and regression files changed by the tenth-review closure |
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
2. re-run every literal fourth- through tenth-review payload in its unsafe
   direction and re-check the legitimate behaviours;
3. exercise equivalent CSS selector, painted-surface geometry, runtime-carrier,
   runtime-state-read, animation-timing, URI-resource, writer, and route/audit
   paths;
4. require an observable Chromium geometry/paint result or a local
   `127.0.0.1` request before counting a candidate as a finding; and
5. run the source-only typecheck, lint, full unit suite, coverage gate,
   standalone build, Chromium E2E suite, dependency audit, and non-secret-
   printing tracked-file secret scan.

No Critical finding was reproduced. The six findings below are independent
root causes; equivalent variants are grouped under the affected root cause.

## 4. Reproduced findings

### 4.1 New equivalent-path matrix

| Candidate | Validation | Destination harm | Isolated verification | Fixes | Mocked source writes | Browser / local-request proof |
|---|---:|---:|---:|---:|---:|---|
| 11-H1a — inline `onload` event-handler carrier | true | null | verified, confidence `1` | 1 | 1 (`index.html`) | The target changed from a static `16×16` image to a fixed `1280×720`, maximum-z-index element; the viewport center became the target. |
| 11-H1b — `getAttributeNames()` state read | true | null | verified, confidence `1` | 1 | 1 (`index.html`) | The target changed from static `16×16` to fixed `1280×720`; the viewport center became the target. |
| 11-H1c — `getAttributeNode()` state read | true | null | verified, confidence `1` | 1 | 1 (`index.html`) | The target changed from static `16×16` to fixed `1280×720`; the viewport center became the target. |
| 11-H1d — `attributes.getNamedItem()` state read | true | null | verified, confidence `1` | 1 | 1 (`index.html`) | The target changed from static `16×16` to fixed `1280×720`; the viewport center became the target. |
| 11-H2a — logical padding longhands | true | null | verified, confidence `1` | 1 | 1 (`index.html`) | Painted bounds were at least `1280×720`; the viewport center became the target. |
| 11-H2b — `zoom:3` | true | null | verified, confidence `1` | 1 | 1 (`index.html`) | Painted bounds were at least `1280×720`; the viewport center became the target. |
| 11-H2c — unconstrained `scale:100` | true | null | verified, confidence `1` | 1 | 1 (`index.html`) | Painted bounds were at least `1280×720`; the viewport center became the target. |
| 11-H2d — `aspect-ratio:1` | true | null | verified, confidence `1` | 1 | 1 (`index.html`) | Painted bounds were at least `1280×720`; the viewport center became the target. |
| 11-H2e — viewport-wide `box-shadow` | true | null | verified, confidence `1` | 1 | 1 (`index.html`) | 921,357 of 921,600 Chromium pixels were the opaque shadow color; the viewport center was magenta. |
| 11-M1 — `max-height:0` + `overflow:hidden` | true | null | verified, confidence `1` | 1 | 1 (`index.html`) | The patched control's paint disappeared; the sampled button pixels changed and its painted height collapsed. |
| 11-M2 — activated custom-property `url(...)` | true | null | verified, confidence `1` | 1 | 1 (`index.html`) | The local listener received no request before the fix and `GET /pixel` after it. |
| 11-M3a — paused negative-delay animation | true | null | verified, confidence `1` | 1 | 1 (`index.html`) | Computed opacity changed from `1` to `0` while the animation stayed paused. |
| 11-M3b — positive delay with `animation-fill-mode:backwards` | true | null | verified, confidence `1` | 1 | 1 (`index.html`) | The browser held computed opacity `0` during the delay with fill mode `backwards`. |

The `clip-path:inset(100%)` control was **blocked** with 0 fixes and 0 writes;
it was not counted as a finding.

### 4.2 Findings

| ID | Severity | Surface | Working reproduction and observed result | Root cause / impact |
|---|---|---|---|---|
| 11-H1 | **High** | Repository runtime carriers and state reads | Repository HTML contained the inline handler `<body onload="...if(t.hasAttribute('alt'))t.classList.add('overlay')">` and CSS `.overlay{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647}`. The ordinary `alt="Photo"` fix produced validation true, destination harm null, verification confidence `1`, one applied fix and one source write; Chromium changed the target from static `16×16` to fixed `1280×720` and the viewport center became the target. The inline-script twins `getAttributeNames()`, `getAttributeNode()` and `attributes.getNamedItem()` produced the same result. The real create-PR route returned HTTP `200 success:true`, created a branch and pull request, and reported one applied fix for the inline-handler case. | The runtime scanner inspects `<script>` blocks and script files, but not event-handler attributes in repository HTML. `RUNTIME_STATE_READ_PATTERN` does not recognize `getAttributeNames()`, `getAttributeNode()` or `attributes.getNamedItem()` as state reads. The fix therefore activates latent customer runtime behavior that takes over the page. |
| 11-H2 | **High** | Effective painted surface and geometry | `[alt]{position:fixed;left:0;top:0;padding-inline-start:10000px;padding-block-start:10000px}`, `zoom:3`, `scale:100`, `width:100%;aspect-ratio:1`, and a fixed `1×1` element with `box-shadow:0 0 0 10000px #f0f` each produced validation true, destination harm null, verification confidence `1`, one applied fix and one source write. Chromium painted a viewport-wide target for the four layout variants and an opaque viewport-wide shadow for the fifth (921,357/921,600 pixels). The real route returned HTTP `200 success:true` and opened a pull request for the zoom variant. | `sideInputsOf()` reads physical padding and the `padding-block`/`padding-inline` shorthands but not the four logical padding longhands. `zoom` is listed but never composed into the painted box; `scale` is multiplied only into a declared size, so an intrinsic-size replaced element is missed; `aspect-ratio` is not composed; and paint extensions such as `box-shadow` are outside the model. A fix-activated rule can therefore cover the customer viewport. |
| 11-M1 | **Medium** | Repository clipping preservation | `[aria-label]{max-height:0;overflow:hidden}` with the ordinary button-name remediation produced validation true, destination harm null, verification confidence `1`, one applied fix and one source write. Chromium showed the patched control's blue paint before the attribute and no blue paint after it; computed `max-height` became `0px` and overflow `hidden`. | The destination model treats `max-height` as a cap but does not compose it with `overflow:hidden` or the content box. The isolated axe snippet does not contain the repository clipping rule. The accessibility fix removes the customer-visible control. |
| 11-M2 | **Medium** | Customer-side CSS resource activation through a custom property | `:root{--pixel:url(http://127.0.0.1:<port>/pixel)}[aria-label]{background-image:var(--pixel)}` with the ordinary button-name remediation produced validation true, destination harm null, verification confidence `1`, one applied fix and one source write. The local listener received no request before the fix and `GET /pixel` after it. | The activated-rule resource check examines the raw declaration value, so `var(--pixel)` hides the `url(...)`. Custom-property definitions are also collected only from rules that provably match the patched element, excluding an inherited `:root` definition. The request occurs in the customer browser after merge, not in the isolated service browser. |
| 11-M3 | **Medium** | Repository animation timing and fill semantics | `[aria-label]{animation-name:hide;animation-duration:1s;animation-delay:-0.4s;animation-play-state:paused}@keyframes hide{0%{opacity:1}40%{opacity:0}60%{opacity:1}100%{opacity:1}}` produced validation true, destination harm null, verification confidence `1`, one applied fix and one source write; Chromium held computed opacity `0`. The positive-delay `animation-fill-mode:backwards` twin also produced one fix/write and held opacity `0` during the delay. | A paused animation is modeled as its first frame, but a negative delay moves the paused timeline to a later frame. The model also ignores delay and fill mode, so the first frame can remain visible to the model while the browser displays a different or hidden frame. The fix removes customer-visible content while passing isolated axe verification. |

### 4.3 Finding-to-code map

| Finding | Primary code path |
|---|---|
| 11-H1 | `src/lib/github.ts` — `extractInlineScripts()`, `RUNTIME_STATE_READ_PATTERN`, `inspectRuntimeScript()`, and the conditional-mutation gate |
| 11-H2 | `src/lib/css-context.ts` — `sideInputsOf()`, `axisSizeOf()`, `scaleFactorsOf()`, `paintedBoxOf()`, and `destinationCssHarm()` |
| 11-M1 | `src/lib/css-context.ts` — `stateOf()`, `paintedBoxOf()`, and the clipping/paint semantics of `destinationCssHarm()` |
| 11-M2 | `src/lib/css-context.ts` — `customPropertyDefinitions()`, `resolveCustomProperties()`, the activated-rule resource check, and `carriesResource()` |
| 11-M3 | `src/lib/css-context.ts` — `animationPlayStateOf()`, animation endpoint selection in `stateOf()`, and delay/fill semantics |

## 5. Exact prior-payload re-run

All literal prior-review payloads were re-run against the reviewed source. The
unsafe direction means that the payload must not validate/remain eligible, must
not be verified/applied, and must not reach a repository write.

### Tenth-review closure matrix — 19/19 passed

The recovered closure matrix contained the nine tenth-review unsafe
reproductions and ten legitimate behaviour groups. Observed result: **1 test
file, 19/19 tests passed**. Every unsafe writer payload produced 0 fixes and 0
writes; every legitimate behaviour remained allowed.

### Ninth-review closure matrix — 42/42 passed

The recovered closure matrix contained 26 writer-level unsafe payloads from the
fourth through ninth reviews, four validator-level unsafe groups, and twelve
legitimate behaviour groups. Observed result: **2 files with the tenth-review
matrix, 61/61 tests passed** (42/42 for this matrix). Every unsafe writer
payload produced 0 fixes and 0 writes; every validator payload was refused; and
every legitimate behaviour remained allowed.

### Prior/legitimate assertion matrix — 118/118 passed after a harness-only correction

The recovered fourth-to-eighth-review matrix contains 94 unsafe assertions
across 40 payload groups and 24 legitimate assertions across 13 behaviour
groups. The recovered original harness first produced **117/118** because one
assertion expected confidence `0` for a candidate rejected before verification,
while the current API correctly returns confidence `null`. This was a harness
expectation error, not a product result. The temporary harness was corrected to
assert the required unsafe direction directly: validation false or non-null
harm, no eligible/verified fix, 0 fixes, and 0 writes. The corrected rerun
produced **118/118**.

### New equivalent-path and route evidence

| Harness | Result |
|---|---|
| Writer/verifier/Chromium equivalent-path harness | **17/17 passed** — the two distinct remediation shapes validate and verify with confidence `1`; every reproduced unsafe candidate reaches one fix/write; and local Chromium reproduces each takeover, clipping, request, and animation result. |
| Remaining-equivalent probe | **1/1 passed** — `clip-path:inset(100%)` was blocked with 0 fixes/0 writes; `box-shadow`, positive-delay/backwards animation and negative-delay/paused animation each reached 1 fix/1 write with the browser result recorded above. |
| Real-route/audit harness | **9/9 passed** — destination refusal, intent-audit failure, closing-audit failure, branch failure, planning failure, pull-request failure and refused-source-write behavior reached the expected paths; the inline-handler and zoom cases returned HTTP `200`, created a branch/pull request and reported one applied fix. |
| Shipped create-PR route regressions | **16/16 passed**. |

The literal fourth- through tenth-review results are therefore unchanged from
the closure evidence; the six findings above are newly found equivalent paths,
not re-openings of the literal prior payloads.

## 6. Legitimate behavior checked

The legitimate groups in the recovered matrices and the distinct remediation
shapes in the new harness passed. They cover:

| Behavior | Result |
|---|---|
| Ordinary `image-alt` fix in HTML | PASS — one fix applied; `alt="Photo"` written. |
| Ordinary `image-alt` fix in TSX / JS containing JSX | PASS — one fix applied. |
| Legitimate `https:` and `mailto:` hrefs | PASS — validate. |
| Preserved relative destination | PASS — `/account` remains and validates. |
| Existing class and benign inline style preserved | PASS — validate and remain allowed. |
| Three identical copies selected together | PASS — all three patched in one write. |
| Two of three identical copies selected | PASS — neither patched; match not provable. |
| Twelve additional server-template spellings | PASS — all twelve rejected. |
| Ordinary repository script and unreadable mocked symlink | PASS — ordinary fix remains allowed; incomplete scan yields 0 fixes/writes. |
| Distinct image-alt and button-name remediations | PASS — both validate and verify with confidence `1`. |

## 7. Verification commands and evidence

All commands were run from `C:\PROJECTS\AccessGuard` with `cmd /c`, using
`npm`/`node`/`npx` rather than `bun`.

### Tree and source-identity commands

```text
cmd /c "git status --short && git rev-parse HEAD && git rev-parse origin/main && git diff --quiet 7ec51ee..HEAD -- src && echo SOURCE_UNCHANGED=1 || echo SOURCE_UNCHANGED=0"
cmd /c git diff --stat 08ab9ef..7ec51ee -- src
cmd /c git diff --numstat 08ab9ef..7ec51ee -- src
```

Observed: current HEAD and `origin/main` were
`0df2299265581a76c09f9d89029e39c980ee5447`; the closure-tree-to-checkout source
identity check returned **exit 0**. The working tree was clean before this
report was created.

### Build, typecheck, lint, tests, browser suite, and dependencies

```text
cmd /c npx tsc -p tsconfig.check.json --noEmit
cmd /c npm run lint
cmd /c npm test -- --reporter=dot
cmd /c npx vitest run --coverage --reporter=dot
cmd /c npm run build
cmd /c npx playwright test --project=chromium
cmd /c npm audit --audit-level=high
```

| Check | Observed result |
|---|---|
| Source-only typecheck | PASS — exit 0. |
| Lint | PASS — exit 0; 0 errors. |
| Vitest | PASS — 53 files, 770/770 tests passed. |
| Coverage | PASS — statements 65.35% (threshold 55); branches 57.52% (50); functions 67.96% (58); lines 67.05% (57). |
| Build | PASS — exit 0; Next 16.4.6; 116 static pages generated. |
| Playwright Chromium | PASS — 79/79 tests passed in 4.4 minutes. |
| `npm audit --audit-level=high` | PASS for the release gate — Critical 0, High 0, Moderate 15, Low 0. |

### Local reproduction commands

The recovered and new harnesses were copied temporarily into the repository or
piped to `tsx` from the approved temporary directory, run against the real
writer/route with mocked GitHub transport, and deleted after the review. Local
Chromium was used for browser evidence and the only application listeners were
bound to `127.0.0.1`.

```text
cmd /c npx vitest run src/lib/__tests__/tmp-review11-evidence.test.ts --reporter=dot
cmd /c npx vitest run src/lib/__tests__/tmp-review11-equivalents.test.ts --reporter=dot
cmd /c npx vitest run src/app/api/github/create-pr/tmp-review11-route.test.ts --reporter=dot
cmd /c npx vitest run src/lib/__tests__/tmp-review11-review9-matrix.test.ts src/lib/__tests__/tmp-review11-review10-matrix.test.ts --reporter=dot
cmd /c npx tsx -  # recovered 118-assertion prior/legitimate matrix
```

Observed:

- recovered prior/legitimate matrix — **118/118** after the documented
  harness-only correction;
- recovered ninth-review closure matrix — **42/42**;
- recovered tenth-review closure matrix — **19/19**;
- new equivalent writer/verifier/Chromium harness — **17/17**;
- remaining-equivalent probe — **1/1**;
- real-route/audit harness — **9/9**; and
- shipped create-PR route regressions — **16/16**.

### Secret and dependency check

```text
cmd /c git ls-files .env .env.*
cmd /c node C:/Users/<local-user>/AppData/Local/Temp/opencode/recovered/.../secret-scan.cjs
```

Observed: 777 tracked files were enumerated; only `.env.example` is tracked in
the `.env*` name family. The actual `.env` file was neither tracked nor
inspected. Of 776 text candidates scanned, the path-only scan found one
AWS-key-shaped string in a tracked documentation example under
`.openclaw/skills/document-generate/SKILL.md`; its value was not printed and it
was not treated as a live credential. No tracked private key, GitHub-token
shape, OpenAI-style key, Google API key, Stripe live key, or Slack token was
found by the same path-only categories. No secret was modified.

## 8. OWASP and security-surface disposition

| Surface | Scoped result |
|---|---|
| Injection / XSS / source integrity | **FAIL** — 11-H1 and 11-H2 write fixes whose composed customer-page effect is a viewport-wide UI takeover; 11-M1 and 11-M3 write fixes that remove customer-visible content. No new or attacker-controlled script injection was reproduced; 11-H1 activates repository-owned runtime code. |
| SSRF / customer-side network isolation | The service-side verification browser continues to block network requests in isolation. The **customer-repository boundary fails** through 11-M2: the customer browser can be made to issue a remote request after merge. |
| Authentication / sessions / OAuth | The scoped route still requires a NextAuth session or bearer token, verified email, and `CREATE_PR` permission. OAuth token exchange/connect flows were unchanged and were not re-audited end to end. No new auth/session bypass was found in the scoped diff. |
| RBAC / tenant isolation | PASS in the scoped route: `requireVerifiedEmail(..., CREATE_PR)`, `project.orgId = auth.user.orgId`, exact violation-count check, connected-repository allow-list, and GitHub write-access validation remain. This is not a fresh full-product authorization audit. |
| CSRF / cookies / CORS / headers | The route has no route-local CSRF-token comparison and relies on the existing NextAuth/session behavior, JSON request shape, and non-simple optional `x-github-token` header. The middleware requires authentication for non-public API paths, and the scoped route adds no permissive CORS policy. Global headers include CSP, HSTS, frame denial, nosniff, referrer and permissions policies; API responses are `no-store`. No fresh browser CSRF test was performed in this focused diff; no CSRF finding is claimed. |
| SQL injection | PASS in scope — the route uses Prisma parameterised queries; the scoped modules contain no raw SQL. No SQLi reproduction was found. |
| Command injection / uploads / deserialization | No shell execution, upload path, or unsafe deserialization was changed in the scoped diff. No fresh full-product command-injection/upload audit is claimed. |
| Rate limits / resource bounds | PASS in scope — the request cap, per-user remediation rate limit, browser semaphore, repository scan budgets, and fail-closed truncated/oversized scans remain. No new concurrency exhaustion was reproduced. |
| Audit trail | PASS in scope — the route writes a durable `github_pr_intent` before the branch; an intent failure stops mutation, and a closing-record failure leaves the recoverable intent and reports degraded state. The temporary route/audit harness passed 9/9. |
| Secrets | PASS — no live tracked secret found; no `.env` value inspected; no secret changed. |
| Dependencies | PASS for the release gate — `npm audit` reports High 0 and Critical 0. The 15 Moderate findings remain in the dependency/toolchain risk queue. |

## 9. Required closure criteria

1. **Inline event-handler runtime carriers (11-H1):** inspect repository
   `on*` handler attributes as runtime carriers, or fail closed whenever a
   handler can react to an attribute the fix adds. An event handler that
   conditionally mutates the patched element must produce 0 fixes, 0 writes,
   and no verified/applied state.
2. **Complete DOM state-read recognition (11-H1):** recognize
   `getAttributeNames()`, `getAttributeNode()` and `attributes.getNamedItem()`
   (and equivalent browser APIs) as state reads that can gate a runtime
   mutation. A fix-activated conditional mutation must be unprovable.
3. **Effective painted surface (11-H2):** compose the logical padding
   longhands, `zoom`, intrinsic/replaced-element scale, `aspect-ratio`, and
   paint extensions such as `box-shadow` into the effective surface. A rule
   the fix activates whose painted surface may cover the viewport must be
   unprovable, never harmless.
4. **Clipping preservation (11-M1):** compose maximum sizes with overflow and
   clipping. A target whose repository rule removes its painted control must
   not pass as visible.
5. **Custom-property resource resolution (11-M2):** resolve inherited and
   activated custom properties before the resource check. A customer-side
   request activated by the remediation must be refused or make the
   destination unprovable.
6. **Animation delay and fill semantics (11-M3):** read animation delay,
   negative delay and fill mode when choosing the frame the customer sees.
   The selected frame must match Chromium, including paused timelines.
7. For **every reproduction above**, the unsafe remediation must end with
   `validation:false` or a non-null destination-harm reason, 0 fixes, 0
   repository writes, and no verified/applied state.
8. Add permanent regressions for every reproduction. Before the next independent
   review, re-run all fourth- through tenth-review payloads in their unsafe
   direction, plus the legitimate behaviour groups.

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
  handler, inline-script, DOM state-read, focus, CSS-resource, and prior
  class/style/service-worker cases. Other language and framework carriers
  remain residual risk.
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

Every temporary harness was deleted after its passing run. No shipped source
file, permanent test, generated fix, dependency file, lockfile, database record,
schema, environment file, or existing `.ai/` file was changed. No commit, push,
deployment, database migration, destructive Git command, Strix run, production
change, or secret modification was performed.

Only `.ai/SECURITY-REVIEW-11.md` was created. The final working tree shows
that one untracked report file and no other reviewer change.
