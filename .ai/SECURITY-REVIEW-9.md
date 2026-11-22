# AccessGuard — Ninth Independent Security Review

Date: 2026-11-22

## 1. Verdict

**NOT READY — Critical 0, High 3, Medium 3, Low 0.**

The release gate requires **Critical 0 and High 0**. Three independently
reproduced High findings reach the repository writer and create a
browser-confirmed customer-page UI takeover. Three Medium findings make the
verified fix activate a customer-side request or remove customer-visible
content. This tree is not releasable until every High reproduction is blocked
in the unsafe direction, permanent regressions cover the root causes, and a
fresh independent review returns READY.

This is the ninth-review security artifact. The existing
`.ai/SECURITY-STATUS.md` and every other existing `.ai/` file were intentionally
not changed.

## 2. Reviewed trees and boundary

| Item | Value |
|---|---|
| Requested baseline | `08ab9ef8c2a0efe6c8abd6a7f07cbfe22975876c` (`vol: releases — V23: volume log entry for the seventh-review closure cycle`) |
| Requested reviewed tree | `2a652bf2c92e88dbe1163802b67e207636b6b3d5` (`vol: releases — V23: volume log entry for the eighth-review closure cycle`) |
| Current checkout at report time | `85a1031dc219e68ca67be49a16c01f56abf6abc8` (`vol: state — V23: record the eighth-review closure pipeline evidence on the pushed head`) |
| Requested baseline-to-tree identity | `git diff --quiet 08ab9ef8c2a0efe6c8abd6a7f07cbfe22975876c 2a652bf2c92e88dbe1163802b67e207636b6b3d5 -- src` returned **exit 1**. The two trees differ in `src`; they are not source-identical. |
| Reviewed-tree-to-checkout identity | `git diff --quiet 2a652bf2c92e88dbe1163802b67e207636b6b3d5..HEAD -- src` returned **exit 0**. The later checkout changed no scoped or other `src` file. |
| Baseline-to-tree source diff | 8 files, 695 insertions and 59 deletions: `src/lib/css-context.ts`, `src/lib/fix-verification.ts`, `src/lib/github-pr.ts`, `src/lib/github.ts`, and their four permanent regression files |
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
behavior, and rendering after repository CSS and customer runtime code are
combined with the generated fix.

The unsafe direction for every prior case below is strict:

- the unsafe remediation must fail validation (`validation: false`) or produce
  a non-null destination-harm reason;
- it must not be reported as verified/applied;
- it must apply **0 fixes**; and
- it must perform **0 repository writes**.

The method was:

1. establish the requested baseline, reviewed tree, and current source
   identity;
2. re-run every literal fourth-, fifth-, sixth-, seventh-, and eighth-review
   payload in its unsafe direction;
3. re-check the legitimate behaviours, including the additional relative
   destination, existing-class, benign-inline-style, and ordinary-script cases;
4. exercise equivalent CSS geometry, combinator, runtime DOM/style-delivery,
   URI-attribute, CSS-network, paint, and animation paths;
5. require an observable Chromium geometry/paint result or a local
   `127.0.0.1` request before counting a candidate as a finding; and
6. run the build, source-only typecheck, lint, unit/integration suite,
   coverage gate, Chromium E2E suite, dependency audit, and non-secret-printing
   tracked-file secret scan.

Sixteen equivalent-variant probes reached the real writer. Each returned
`validation.valid=true`, destination `harm=null`, verification
`status:"verified"` with confidence `1`, one applied fix, and one mocked
repository write. Browser or local-request evidence separated the six findings
from the dismissed candidates. No Critical finding was reproduced.

## 4. Reproduced findings

| ID | Severity | Surface | Working reproduction and observed result | Root cause / impact |
|---|---|---|---|---|
| 9-H1 | **High** | Destination CSS geometry semantics | Repository CSS `[aria-label]{position:fixed;inset-block-start:0;inset-block-end:0;inset-inline-start:0;inset-inline-end:0;z-index:2147483647}` with remediation `<button id="target" aria-label="Label">Text</button>` produced `{"validation":{"valid":true},"harm":null,"verification":{"status":"verified","confidence":1},"fixesAppliedTotal":1,"writeCount":1,"browser":{"before":{"position":"static","width":40.453125,"height":21},"after":{"position":"fixed","width":1280,"height":720,"zIndex":"2147483647","center":"target"}}}`. The fixed-pixel twin `[alt]{position:fixed;left:0;top:0;width:9999px;height:9999px;z-index:2147483647}` produced the same valid/harm-null/verified/write result and Chromium measured a fixed `9999×9999` overlay. The viewport twin `width:200vw;height:200vh` measured `2560×1440`. | The closure added the `inset-block` and `inset-inline` shorthands and logical sizing properties, but the four logical inset **longhands** are absent from the relevant-property set. Coverage recognizes only exact `100%` and `100` viewport units; a larger recognized length can still cover the viewport. The accessibility attribute therefore activates a full-page fixed overlay that the destination analyser reports as harmless. |
| 9-H2 | **High** | Destination CSS sibling-combinator semantics | Repository HTML contained `<img id="target" src="x"><div id="overlay" class="overlay">owned</div>`; repository CSS was `[alt] ~ .overlay{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647}`. Adding `alt="Photo"` produced `{"validation":{"valid":true},"harm":null,"verification":{"status":"verified","confidence":1},"fixesAppliedTotal":1,"writeCount":1,"browser":{"before":{"position":"static","width":1264,"height":18},"after":{"position":"fixed","width":1280,"height":720,"zIndex":"2147483647","center":"overlay"}}}`. | `matchSelector` splits a selector and judges only its subject compound. It does not model the sibling relationship: the rule's subject is `.overlay`, not the patched image, so the analyser sees no applicable rule. Chromium starts matching the sibling as soon as the fix adds `alt`, and the customer page becomes a fixed `1280×720` UI takeover. The seventh-review closure covered `:has()` but not general sibling combinators. |
| 9-H3 | **High** | Repository runtime DOM and style delivery | A repository script `const img=document.querySelector('#target');if(img&&img.hasAttribute('alt'))img.classList.add('overlay');`, with repository CSS `.overlay{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647}`, produced `{"validation":{"valid":true},"harm":null,"verification":{"status":"verified","confidence":1},"fixesAppliedTotal":1,"writeCount":1}`. Chromium changed the target from a static `16×16` image to a fixed `1280×720` overlay with the viewport center on the target. The inline-style twin (`img.style.position='fixed'`, `inset`, `width`, `height`, and `zIndex` under the same `hasAttribute('alt')` condition) produced the same browser result. A service-worker twin registered `/sw.js`, intercepted `/styles.css`, and returned `[alt]{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647}`; the mocked writer still applied and wrote one fix, while Chromium measured `controlled:true`, a static `16×16` target before the attribute and a fixed `1280×720` target afterward. | The runtime-style detector recognizes style-element creation, `insertRule`, adopted stylesheets, and style-text assignment. It does not recognize a script that conditionally mutates the patched element's class/style, nor a service worker that supplies stylesheet bytes at runtime. The isolated axe browser cannot observe repository JavaScript. The fix activates latent customer runtime behavior that takes over the page. |
| 9-M1 | **Medium** | URI attribute preservation | Remediation `<img id="target" src="x" alt="Photo" attributionsrc="http://127.0.0.1:<port>/attribution-pixel">` with original `<img id="target" src="x">` produced `{"validation":{"valid":true},"harm":null,"verification":{"status":"verified","confidence":1},"fixesAppliedTotal":1,"writeCount":1}`. On a local page, the request list was `[]` before the fix and `["GET /attribution-pixel"]` afterward; Chromium retained the exact `attributionsrc` URL. | `URI_ATTRIBUTES` in `src/lib/github-pr.ts` omits `attributionsrc`. The scheme allowlist, original/new comparison, duplicate handling, and list grammar therefore never inspect it. The verified fix introduces a customer-browser request after merge. This is the active-URI equivalent of the closed 8-M1 `ping` and duplicate-attribute cases. |
| 9-M2 | **Medium** | Customer-side CSS resource activation | Repository CSS `[alt]{background-image:url(http://127.0.0.1:<port>/background-pixel)}` with the ordinary `alt="Photo"` fix produced `{"validation":{"valid":true},"harm":null,"verification":{"status":"verified","confidence":1},"fixesAppliedTotal":1,"writeCount":1}`. The local request list was `[]` before the attribute and `["GET /background-pixel"]` afterward; Chromium computed `background-image:url("http://127.0.0.1:<port>/background-pixel")`. | URI preservation compares attributes on the patched element; it does not evaluate network-bearing declarations in repository CSS that become active only because the fix changes a selector match. The destination analyser judges geometry and hiding but not CSS resource loads. The accessibility fix activates a customer-side tracking/internal request. |
| 9-M3 | **Medium** | Repository paint and hiding preservation | Six repository-CSS variants each returned `{"validation":{"valid":true},"harm":null,"verification":{"status":"verified","confidence":1},"fixesAppliedTotal":1,"writeCount":1}` while Chromium measured customer-visible harm: `[aria-label]{color:transparent}` changed the link colour from `rgb(0, 0, 238)` to `rgba(0, 0, 0, 0)`; `[alt]{margin-inline-start:-10000px}` moved the image from left `8` to `-9992`; `[alt]{position:absolute;left:-9999px;top:0}` moved it to `-9999`; `[alt]{width:0}` changed a valid `1×1` PNG's rect to `0×0`; `[alt]{display:contents}` changed it to a `0×0`, computed-`display:none` target; and `[alt]{animation:hide 100ms reverse forwards}@keyframes hide{from{opacity:0}to{opacity:1}}` ended at computed opacity `0`. | The destination state model still omits logical margins, negative positional offsets, a zero single dimension, `display:contents`, the repository transparent-colour path, and animation direction when choosing the visible endpoint. The browser verifier renders only the remediation snippet and therefore cannot see these repository rules. The fix is reported verified and written while the customer content disappears. |

### Finding-to-code map

| Finding | Primary code path |
|---|---|
| 9-H1 | `src/lib/css-context.ts` — `RELEVANT_PROPERTIES`, `COVERS_X`/`COVERS_Y`, `stateOf`, `destinationCssHarm` |
| 9-H2 | `src/lib/css-context.ts` — `splitCompounds`, `matchSelector` |
| 9-H3 | `src/lib/github.ts` — `RUNTIME_STYLE_PATTERN` and repository style-source collection; `src/lib/css-context.ts` — `matchSelector`/`stateOf` |
| 9-M1 | `src/lib/github-pr.ts` — `URI_ATTRIBUTES`, `checkUriAttribute`, `canonicalUriMap` |
| 9-M2 | `src/lib/css-context.ts` — `destinationCssHarm`; `src/lib/github-pr.ts` — URI preservation |
| 9-M3 | `src/lib/css-context.ts` — `RELEVANT_PROPERTIES`, `stateOf`, animation-frame selection; `src/lib/fix-verification.ts` — isolated verification context |

### Dismissed candidates

These candidates were reproduced but were **not** counted as findings because
the unsafe result was not observed:

- uppercase `document.createElement('STYLE')` was classified as a dynamic
  runtime style source and produced 0 fixes and 0 writes;
- `:is(.overlay)` and `:where(.overlay)` were conservatively judged as
  potentially harmful, so they were not a bypass; and
- `contain:size` reduced the button's box, but its text range overflowed and
  remained readable, so no invisible-content result was proved.

## 5. Exact prior-payload re-run

All literal prior-review payloads were re-run against the reviewed source. The
unsafe direction means that the payload must not validate/remain eligible, must
not be verified/applied, and must not reach a repository write.

### Fourth review — 12 payloads, 17/17 assertions blocked

| Payload | Result |
|---|---|
| 4-H1 — named-entity CSS overlay | **BLOCKED** — validation false; 0 fixes/writes. |
| 4-H2 — alternate `--!>` comment terminator | **BLOCKED** — 0 fixes; alternate terminator absent. |
| 4-H3 — JSX brace / TypeScript quote injection | **BLOCKED** — JSX validation false; TypeScript destination 0 fixes/writes. |
| 4-M1 — GFM bare URL | **BLOCKED** — escaped output contains no bare live URL. |
| 4-M2 — `plaintext` content loss | **BLOCKED** — validation false. |
| 4-M3 — `video` / `audio` / `source` / `track` / `input[type=image]` | **BLOCKED** — all five validations false. The ordinary-image URL equivalent is 9-M1. |
| 4-M4 — `encoding:'none'` | **BLOCKED** — scan incomplete; 0 fixes/writes. |
| 4-M5 — duplicate in `.mjs` | **BLOCKED** — both files read; ambiguous match; 0 fixes/writes. |
| 4-M6 — `opacity:0` | **BLOCKED** — validation false. Equivalent hiding methods are 9-M3. |
| 4-M7 — “Read more” reduced to “R” | **BLOCKED** — 0 fixes; original text remains. |
| 4-M8 — swapped identical remediations | **BLOCKED** — 0 fixes/writes. |
| 4-M9 — element inside an HTML comment | **BLOCKED** — 0 fixes/writes. |

### Fifth review — 6 payloads, 12/12 assertions blocked

| Payload | Result |
|---|---|
| 5-H1 — added class and repository destination CSS | **BLOCKED** — class validation false; destination CSS 0 fixes/writes. The runtime-class equivalent is 9-H3. |
| 5-H2 — template remediation/destination | **BLOCKED** — remediation and template destination both refused. |
| 5-M1 — entity-encoded input type | **BLOCKED** — validation false. |
| 5-M2 — `opacity:0!important` | **BLOCKED** — validation false. The CSS-context priority suffix is the prior 7-H1 closure. |
| 5-M3 — live HTML contexts | **BLOCKED** — template, iframe, script-prefix, and unclosed-script cases each count 0 occurrences. The frameset source state is the prior 7-M4 closure. |
| 5-M4 — omitted blob and submodule | **BLOCKED** — unknown-extension duplicate and submodule each 0 fixes/writes. |

### Sixth review — 8 payloads, 21/21 assertions blocked

| Payload | Result |
|---|---|
| 6-H1 — SCSS/preprocessor and linked destination CSS | **BLOCKED** — both variants remain fail-closed; 0 fixes/writes. |
| 6-H2 — ten browser-valid CSS variants | **BLOCKED** — all ten exact variants still produce a non-null harm and are refused. The newly found value/selector/composition equivalents are 9-H1, 9-H2, and 9-H3. |
| 6-M1 — HTML comment opener | **BLOCKED** — validation false. |
| 6-M2 — hidden patched target | **BLOCKED** — `hidden` and `display:none` rejected. Equivalent hiding methods are 9-M3. |
| 6-M3 — transparent text | **BLOCKED** — validation false. The repository-colour equivalent is 9-M3. |
| 6-M4 — new HTTP resource URL | **BLOCKED** in its literal form. Equivalent URL, duplicate-attribute, and list semantics are 9-M1. |
| 6-M5 — bogus/CDATA/quoted-end source contexts | **BLOCKED** in the source scanner. The replacement-carrier equivalent is the prior 7-M3 closure. |
| 6-M6 — ambiguous `.dat` blob | **BLOCKED** — content-based read makes the match ambiguous; 0 fixes/writes. |

### Seventh review — 8 payloads, 29/29 assertions blocked

| Payload | Result |
|---|---|
| 7-H1a — CSS priority suffix overlay | **BLOCKED** — destination harm non-null; 0 fixes/writes. |
| 7-H1b — logical viewport-unit overlay | **BLOCKED** — destination harm non-null; 0 fixes/writes. |
| 7-H2 — relational `:has()` selector | **BLOCKED** — destination unprovable; 0 fixes/writes. The sibling-combinator equivalent is 9-H2. |
| 7-H3 — dynamic JSX `<style>` source | **BLOCKED** — destination unprovable; 0 fixes/writes. Runtime DOM and service-worker equivalents are 9-H3. |
| 7-M1 — URI spellings and navigation mutation | **BLOCKED** — protocol-relative, one-slash, backslash, and changed `href` cases refused. Duplicate-attribute, `ping`, and `attributionsrc` equivalents are 9-M1. |
| 7-M2 — visual hiding values | **BLOCKED** — the eight literal hiding forms refused. Repository transparent colour, logical margin, negative offset, zero dimension, `display:contents`, and reverse-animation equivalents are 9-M3. |
| 7-M3 — live element and media preservation | **BLOCKED** — raw-text/bogus carriers and dropped source refused. |
| 7-M4 — frameset target | **BLOCKED** — occurrence count 0; 0 fixes/writes. |

### Eighth review — 6 payloads, 15/15 assertions blocked

| Payload | Result |
|---|---|
| 8-H1 — two-value `inset` and logical sizing | **BLOCKED** — both variants remain refused with 0 fixes/writes. The logical-inset-longhand and oversized-size equivalents are 9-H1. |
| 8-H2 — inline and custom-property composition | **BLOCKED** — both variants remain refused with 0 fixes/writes. |
| 8-H3 — JSX `className` | **BLOCKED** — validation/destination gate refuses the added class; 0 fixes/writes. |
| 8-H4 — runtime-created repository style | **BLOCKED** — the exact runtime-style source remains refused with 0 fixes/writes. The runtime DOM-mutation and service-worker equivalents are 9-H3. |
| 8-M1 — duplicate attributes and `ping` list | **BLOCKED** — all three exact variants refused. The active-URI attribute equivalent is 9-M1. |
| 8-M2 — modern alpha, zero area, clipping, margin, translation, animation | **BLOCKED** — all six exact variants are refused or fail verification; 0 fixes/writes. The repository paint/geometry equivalents are 9-M3. |

The temporary matrix executed **118 literal assertions with 118/118 passing**:
94 unsafe prior-payload assertions (40 payload groups) and 24 legitimate
assertions (13 behaviour groups). Three initial harness-only corrections were
made and re-run with the exact payload source: two quoting/context mistakes and
one assertion that expected confidence `0` where pre-verification rejection
correctly returns `null`. The corrected matrix then produced the expected
blocked result for every unsafe assertion.

## 6. Legitimate behavior checked

**13/13 behaviour groups passed (24/24 literal assertions).**

| Behavior | Result |
|---|---|
| Ordinary `image-alt` fix in HTML | PASS — one fix applied; `alt="Photo"` written. |
| Ordinary `image-alt` fix in TSX | PASS — one fix applied. |
| Ordinary `image-alt` fix in JS containing JSX | PASS — one fix applied. |
| Legitimate `https:` href | PASS — validates. |
| Legitimate `mailto:` href | PASS — validates when it is the candidate itself; 9-M1 concerns adding or changing a destination. |
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
cmd /c git status --short
cmd /c git rev-parse HEAD
cmd /c git rev-parse origin/main
cmd /v:on /c "git diff --quiet 08ab9ef8c2a0efe6c8abd6a7f07cbfe22975876c 2a652bf2c92e88dbe1163802b67e207636b6b3d5 -- src & echo SOURCE_DIFF_EXIT=!errorlevel!"
cmd /v:on /c "git diff --quiet 2a652bf2c92e88dbe1163802b67e207636b6b3d5..HEAD -- src & echo REVIEWED_SOURCE_IDENTICAL=!errorlevel!"
cmd /c git diff --stat 08ab9ef8c2a0efe6c8abd6a7f07cbfe22975876c 2a652bf2c92e88dbe1163802b67e207636b6b3d5 -- src
cmd /c git diff --numstat 08ab9ef8c2a0efe6c8abd6a7f07cbfe22975876c 2a652bf2c92e88dbe1163802b67e207636b6b3d5 -- src
```

Observed: current HEAD and `origin/main` were
`85a1031dc219e68ca67be49a16c01f56abf6abc8`; the requested baseline-to-tree
source diff returned exit `1`; the reviewed-tree-to-current source identity
check returned exit `0`. The reviewed source diff contains 8 files, 695
insertions, and 59 deletions. The working tree was clean before the report was
created.

### Build, typecheck, lint, tests, browser suite, and dependencies

```text
cmd /c npx vitest run src/lib/__tests__/css-context.test.ts src/lib/__tests__/fix-verification.test.ts src/lib/__tests__/github-pr.test.ts src/lib/__tests__/github.test.ts --reporter=dot
cmd /c npm run build
cmd /c npx tsc -p tsconfig.check.json --noEmit
cmd /c npm run lint
cmd /c npm test -- --reporter=dot --silent=passed-only
cmd /c npx vitest run --coverage --reporter=dot --silent=passed-only
cmd /c npx playwright test --project=chromium
cmd /c npm audit --audit-level=high
```

| Check | Observed result |
|---|---|
| Targeted scoped regressions | PASS — 4 files, 221/221 tests passed. |
| Build | PASS — exit 0; Next 16.4.6; 116 static pages generated. |
| Source-only typecheck | PASS — exit 0. |
| Lint | PASS — exit 0; 0 errors. |
| Vitest | PASS — 53 files, 724/724 tests passed. |
| Coverage | PASS — statements 64.83% (threshold 55); branches 56.97% (50); functions 66.58% (58); lines 66.32% (57). |
| Playwright Chromium | PASS — 79/79 tests passed in 4.4 minutes. |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0, Moderate 15, Low 0. |

### Local reproduction commands

Every candidate was piped inline to `tsx`; no scratch source or test file was
created inside the repository. The temporary harness lived outside the
repository, was piped to `tsx` through stdin, and was removed after the run.
The mocked Octokit transport intercepted repository reads/writes, Playwright
launched local Chromium, and the only application listeners bound to
`127.0.0.1`.

```text
cmd /c npx tsx -  # inline prior-payload and legitimate-behaviour matrix
cmd /c npx tsx -  # inline equivalent-variant writer/verifier probe
cmd /c npx tsx -  # inline Chromium geometry/paint probe
cmd /c npx tsx -  # inline local network and service-worker probes
```

The inline `tsx` harness defined `globalThis.__name` inside Chromium solely to
neutralize the `keepNames` helper that the inline TypeScript loader emits into
`page.evaluate` callbacks. It did not change application logic or the result
under test.

Observed:

- prior/legitimate matrix — **118/118 literal assertions passed**;
- equivalent-variant writer/verifier probe — 16/16 candidates returned
  validation true, destination harm null, verification confidence 1, one fix,
  and one write; browser/local-request evidence separated the six findings from
  the dismissed candidates; and
- the Chromium probe reproduced the geometry, paint, and request values in the
  finding table.

### Secret and dependency check

```text
cmd /c git ls-files .env .env.*
cmd /c node -  # tracked-file pattern scan; prints only path and category
```

Observed: 775 tracked files were enumerated; only `.env.example` is tracked in
the `.env*` name family. The actual `.env` file was neither tracked nor
inspected. Of 773 text candidates scanned, the path-only scan found one
AWS-key-shaped string in a tracked documentation example under
`.openclaw/skills/document-generate/SKILL.md`; its value was not printed and it
was not treated as a live credential. No tracked private key, GitHub-token
shape, OpenAI-style key, Google API key, Stripe live key, or Slack token was
found by the same path-only categories. No secret was modified.

## 8. OWASP and security-surface disposition

| Surface | Scoped result |
|---|---|
| Injection / XSS / source integrity | **FAIL** — 9-H1 through 9-H3 write a fix whose composed customer-page effect is a full-viewport UI takeover; 9-M3 writes fixes that remove customer-visible content. No script execution was reproduced. |
| SSRF / customer-side network isolation | The service-side verification browser continues to block network requests in isolation. The **customer-repository boundary fails** through 9-M1 and 9-M2: the customer browser can be made to issue a remote request after merge. |
| Authentication / sessions / OAuth | The scoped route still requires a NextAuth session or bearer token, verified email, and `CREATE_PR` permission. OAuth token exchange/connect flows were unchanged and were not re-audited end to end. No new auth/session bypass was found in the scoped diff. |
| RBAC / tenant isolation | PASS in the scoped route: `requireVerifiedEmail(..., CREATE_PR)`, `project.orgId = auth.user.orgId`, exact violation-count check, connected-repository allow-list, and GitHub write-access validation remain. This is not a fresh full-product authorization audit. |
| CSRF / cookies / CORS / headers | The route has no route-local CSRF-token comparison and relies on the existing NextAuth/session behavior, JSON request shape, and non-simple optional `x-github-token` header. The middleware requires authentication for non-public API paths, and the scoped route adds no permissive CORS policy. No fresh browser CSRF test was performed in this focused diff; no CSRF finding is claimed. |
| SQL injection | PASS in scope — the route uses Prisma parameterised queries; the scoped modules contain no raw SQL. No SQLi reproduction was found. |
| Command injection / uploads / deserialization | No shell execution, upload path, or unsafe deserialization was changed in the scoped diff. No fresh full-product command-injection/upload audit is claimed. |
| Rate limits / resource bounds | PASS in scope — request cap, per-user remediation rate limit, browser semaphore, repository scan budgets, and fail-closed truncated/oversized scans remain. No new concurrency exhaustion was reproduced. |
| Audit trail | PASS in scope — the route records `github_pr_created` after PR creation and retries a transient audit write. No new persistent-audit failure was injected. |
| Secrets | PASS — no live tracked secret found; no `.env` value inspected; no secret changed. |
| Dependencies | PASS for the release gate — `npm audit` reports High 0 and Critical 0. The 15 Moderate findings remain in the dependency/toolchain risk queue. |

## 9. Required closure criteria

1. **Destination CSS geometry (9-H1):** include all logical inset longhands
   (`inset-block-start`, `inset-block-end`, `inset-inline-start`,
   `inset-inline-end`) in the relevant-property and edge semantics. A
   positioned element whose computed bounds could cover the viewport — including
   fixed pixel sizes above the viewport and viewport-relative sizes above
   `100%` — must be unprovable, never harmless.
2. **Relational selectors (9-H2):** evaluate sibling combinators and the other
   selector relationships in enough DOM context to prove the effect on the
   patched element and its siblings, or make the destination unprovable
   whenever the changed attribute can activate a rule on another element.
3. **Repository runtime behavior (9-H3):** collect and fail closed on scripts
   that conditionally mutate the patched element's class, style, or attributes,
   and on service workers or equivalent runtime responders that can supply
   stylesheet bytes. An unanalysable runtime source must produce 0 fixes and 0
   writes.
4. **Active URI attributes (9-M1):** include `attributionsrc` in the URI
   attribute set and compare every occurrence against the original element.
   A newly introduced, changed, masked, or dropped remote destination must be
   refused.
5. **CSS resource activation (9-M2):** detect network-bearing repository CSS
   declarations whose selector or attribute match is changed by the fix. A
   customer-side request activated by the remediation must be refused or make
   the destination unprovable.
6. **Paint and hiding semantics (9-M3):** extend the destination model to
   understand repository transparent colours, logical margins, negative
   positional offsets, a zero single dimension, `display:contents`, and
   animation direction when choosing the visible endpoint. A target or text
   that produces no visible paint must not pass as visible.
7. For **every reproduction above**, the unsafe remediation must end with
   `validation: false` or a non-null destination-harm reason, 0 fixes, 0
   writes, and no verified/applied state.
8. Add permanent regressions for every reproduction. Before the next independent
   review, re-run all **12 fourth-review**, **6 fifth-review**, **8
   sixth-review**, **8 seventh-review**, and **6 eighth-review** reproductions
   in their unsafe direction, plus the 13 legitimate behaviour groups.

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
- Runtime JavaScript was not exhaustively exercised beyond the proven
  class-mutation, inline-style-mutation, and service-worker-style cases. A
  CSS-in-JS library's browser output was not executed, so no CSS-in-JS finding
  is claimed; it remains residual risk.
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

Every reproduction was piped inline to `tsx`; the temporary harness was outside
the repository and was removed after the run. No shipped source file, permanent
test, generated fix, dependency file, lockfile, database record, schema,
environment file, or existing `.ai/` file was changed. No commit, push,
deployment, database migration, destructive Git command, Strix run, production
change, or secret modification was performed.

Only `.ai/SECURITY-REVIEW-9.md` was created. The final working tree shows that
one report file and no other reviewer change.
