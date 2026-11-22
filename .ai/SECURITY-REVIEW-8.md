# AccessGuard — Eighth Independent Security Review

Date: 2026-11-22

## 1. Verdict

**NOT READY — Critical 0, High 4, Medium 2, Low 0.**

The release gate requires **Critical 0 and High 0**. Four independently
reproduced High findings reach the repository writer and create a
browser-confirmed customer-page UI takeover. This tree is not releasable until
every High reproduction is blocked in the unsafe direction, permanent regressions
cover the root causes, and a fresh independent review returns READY.

This is the eighth-review security artifact. The existing
`.ai/SECURITY-STATUS.md` and every other existing `.ai/` file were intentionally
not changed.

## 2. Reviewed trees and boundary

| Item | Value |
|---|---|
| Requested baseline | `cdb246a4b91aba09ae647dbbed1df63be3df39e9` (`vol: releases — V23: volume log entry for the sixth-review closure cycle`) |
| Requested reviewed tree | `08ab9ef8c2a0efe6c8abd6a7f07cbfe22975876c` (`vol: releases — V23: volume log entry for the seventh-review closure cycle`) |
| Current checkout at review time | `46bd701fab478159f93380120a369dc47c55f2ef` |
| Source identity check | `git diff --quiet 08ab9ef..HEAD -- src` returned success (`SOURCE_IDENTICAL=YES`); later commits `8516dc8` and `46bd701` changed no scoped or other `src` file |
| Baseline-to-tree source diff | 14 files, 1,050 insertions and 58 deletions: seven scoped modules and seven permanent regression files |
| Review scope | `src/lib/css-context.ts`, `src/lib/github-pr.ts`, `src/lib/ast-patch.ts`, `src/lib/fix-validation.ts`, `src/lib/fix-verification.ts`, `src/lib/github.ts`, `src/lib/html-attributes.ts`, and `src/app/api/github/create-pr/route.ts`, including the directly related validation, verification, write, authorization, rate-limit, and audit call path |
| Reviewer changes | Report only. No shipped source, permanent test, dependency, lockfile, CI, environment, schema, or existing `.ai/` file was changed. No commit, push, deployment, database migration, or secret change was performed. |

Every reproduction used a local synthetic repository, a mocked GitHub/Octokit
transport, local Playwright Chromium, and listeners bound only to `127.0.0.1`.
No production, public, customer, or third-party target was scanned. No live
repository was mutated. No external GitHub Markdown service was called. No
`.env` value was read or printed.

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

The unsafe direction for every case below is strict:

- the unsafe remediation must fail validation (`validation: false`);
- it must not be reported as verified/applied;
- it must apply **0 fixes**; and
- it must perform **0 repository writes**.

The method was:

1. establish the reviewed source identity and baseline diff;
2. re-run the exact fourth-, fifth-, sixth-, and seventh-review payloads;
3. re-check the nine legitimate behaviours;
4. exercise equivalent CSS, JSX, runtime-style, URI-list, duplicate-attribute,
   colour, geometry, clipping, off-screen, and animation paths;
5. require an observable browser or local-request result before counting a
   candidate as a finding; and
6. run the build, source-only typecheck, lint, coverage, Chromium E2E,
   dependency audit, and non-secret-printing tracked-file secret scan.

Variants that share one demonstrated root cause are grouped under one finding.
No Critical finding was reproduced.

## 4. Reproduced findings

| ID | Severity | Surface | Working reproduction and observed result | Root cause / impact |
|---|---|---|---|---|
| 8-H1 | **High** | Destination CSS geometry semantics | Repository CSS `[role="button"]{position:fixed;inset:0 0;z-index:2147483647}` with remediation `<div id="target" role="button" aria-label="Label">Text</div>` produced `{"validation":{"valid":true},"harm":null,"verification":{"status":"verified","confidence":1},"fixesAppliedTotal":1,"writeCount":1,"browser":{"position":"fixed","width":"1280px","height":"720px","top":"0px","right":"0px","bottom":"0px","left":"0px","zIndex":"2147483647"}}`. The browser-valid logical-sizing equivalent `[alt]{position:fixed;top:0;left:0;inline-size:100vw;block-size:100vh;z-index:2147483647}` produced the same valid/harm-null/verified/write result and Chromium measured a fixed `1280×720` overlay. | `stateOf` recognizes only the exact value `0` as zero for `inset`, so the valid two-value shorthand `0 0` does not establish all four edges. `inline-size` and `block-size` are absent from the relevant-property and viewport-coverage semantics. The accessibility attribute therefore activates a full-viewport fixed overlay that the destination analyser reports as harmless. |
| 8-H2 | **High** | Remediation/destination style composition | Remediation `<img id="target" src="x" alt="Photo" style="width:100%;height:100%">` with repository CSS `#target{position:fixed;z-index:2147483647}` produced `{"validation":{"valid":true},"harm":null,"verification":{"status":"verified","confidence":1},"fixesAppliedTotal":1,"writeCount":1,"browser":{"position":"fixed","width":"1280px","height":"720px","zIndex":"2147483647"}}`. The custom-property variant used `style="--pos:fixed;--w:100%;--h:100%;--z:2147483647"` and repository CSS `#target{position:var(--pos);width:var(--w);height:var(--h);z-index:var(--z)}`; it produced the same valid/harm-null/verified/write result and the same `1280×720` fixed overlay. | The destination analyser evaluates repository CSS without composing the remediation's inline declarations with it. The static style guard rejects positioning and viewport units but not ordinary percentage sizing or custom-property definitions. A `var()` destination is only treated as unprovable when the fix changes that CSS property; here the fix supplies the custom-property value and changes `alt`, so the analyser reports no harm. The generated fix activates customer CSS that takes over the page. |
| 8-H3 | **High** | JSX class-token handling | `Card.tsx` contained `<img id="target" src="x" />`; remediation was `<img id="target" src="x" alt="Photo" className="overlay" />`; repository CSS was `.overlay{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647}`. Observed: `{"validation":{"valid":true},"harm":null,"verification":{"status":"verified","confidence":1},"fixesAppliedTotal":1,"writeCount":1,"browser":{"position":"fixed","width":"1280px","height":"720px","zIndex":"2147483647"}}`. | The added-class guard in `github-pr.ts` reads only the HTML `class` attribute, and the CSS element descriptor in `css-context.ts` also collects only `class`. In JSX, React maps `className` to the browser's `class` attribute. The new class hook is therefore invisible to validation and destination matching but active in the customer browser. |
| 8-H4 | **High** | Runtime-created repository style | Repository `app.js` contained `const css='[alt]{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647}';const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);`. Adding `alt="Photo"` produced `{"validation":{"valid":true},"verification":{"status":"verified","confidence":1},"fixesAppliedTotal":1,"writeCount":1,"browser":{"position":"fixed","width":"1280px","height":"720px","zIndex":"2147483647"}}`. | The destination style collector reads CSS files, literal `<style>` blocks, linked stylesheets, and imports. It does not inspect repository scripts for a runtime-created style element. The style activates only after the accessibility fix changes the selector match, so the fix writes and the customer page becomes a fixed `1280×720` overlay. |
| 8-M1 | Medium | URI attribute and list semantics | A duplicate `src` case changed the browser-effective first value from `/safe.png` to `http://127.0.0.1:<port>/pixel` while a later `src="/other.png"` remained. Observed: `{"validation":{"valid":true},"verification":{"status":"verified","confidence":1},"fixesAppliedTotal":1,"writeCount":1,"customerHits":["/pixel"]}`. A `ping="/safe http://127.0.0.1:<port>/pixel"` remediation produced `{"validation":{"valid":true},"verification":{"status":"verified","confidence":1},"fixesAppliedTotal":1,"writeCount":1,"customerHits":["/pixel"]}`. A duplicate `href` case put `href="mailto:attacker@example.com"` first and `href="/account"` later; validation was true, confidence was 1, one write occurred, and Chromium used the first `mailto:` destination. | `canonicalUriMap` stores one value per attribute name, so a later duplicate overwrites the browser-effective first duplicate. It also treats `ping` as one URI although browsers parse it as a space-separated URL list. The scheme check has the same single-value assumption. A generated fix can therefore introduce a customer-side request or navigation while the preservation comparison reports the destination unchanged. |
| 8-M2 | Medium | Rendered visibility and paint preservation | Six browser-confirmed hiding variants all validated, verified with confidence `1`, applied one fix, and performed one write: `color:oklch(0 0 0 / 0%)` computed to `oklch(0 0 0 / 0)` with 0 dark pixels; `width:0;height:0` produced an image rect of `0×0`; `height:0;overflow:hidden` produced a target height of `0` while the unpainted text range remained `69.75×17` and 0 dark pixels were visible; `margin-left:-10000px` moved the image fully off-screen (left `-9992`); repository `[alt]{translate:-100vw}` moved it fully off-screen (left `-1272`); and repository `[alt]{animation:hide 100ms forwards}@keyframes hide{from{opacity:1}to{opacity:0}}` ended at computed opacity `0`. | The static colour parser does not understand modern `oklch()` alpha syntax. The browser check does not reject a zero-area target, does not account for ancestor/own clipping when testing a text range, and does not treat large negative margins or viewport-unit translations as off-screen. Destination CSS only treats an animation frame as harmful when it changes geometry, so an opacity-only fade is judged harmless. The customer content disappears while the fix is reported verified and written. |

### Finding-to-code map

| Finding | Primary code path |
|---|---|
| 8-H1 | `src/lib/css-context.ts` — `stateOf`, `isUnprovableValue`, `COVERS_X`/`COVERS_Y`, relevant-property sets |
| 8-H2 | `src/lib/css-context.ts` — `destinationCssHarm`/`stateOf`; `src/lib/github-pr.ts` — `checkStyleAttribute` |
| 8-H3 | `src/lib/github-pr.ts` — `classTokensOf`; `src/lib/css-context.ts` — `describeElements`/`matchSubject` |
| 8-H4 | `src/lib/github.ts` — repository style-source collection; `src/lib/css-context.ts` — `collectStyleSources` |
| 8-M1 | `src/lib/github-pr.ts` — `canonicalUriMap`, `checkUriAttribute`; `src/lib/html-attributes.ts` — `parseTagAttributes`, `canonicalizeUri` |
| 8-M2 | `src/lib/github-pr.ts` — `checkStyleAttribute`, `isTransparentColor`; `src/lib/fix-verification.ts` — `checkRenderedElement`, rendered-text checks; `src/lib/css-context.ts` — `stateOf` |

### Dismissed candidates

These candidates were reproduced but were **not** counted as findings because
the unsafe result was not observed:

- inline `filter:opacity(0%)` and `scale:0%` were blocked by the real-browser
  verifier (`status:"failed"`, confidence `0`);
- repository `transform:scale(0%)` made the destination unprovable and produced
  0 fixes and 0 writes;
- markup inside a processing instruction produced 0 fixes and 0 writes; and
- quoted-doctype and select-option markup remained live in Chromium, so it was
  not an inert-target/wrong-target case.

## 5. Exact prior-payload re-run

All literal prior-review payloads were re-run against the reviewed source. The
unsafe direction means that the payload must not validate/remain eligible, must
not be verified/applied, and must not reach a repository write.

### Fourth review — 12/12 blocked

| Payload | Result |
|---|---|
| 4-H1 — named-entity CSS overlay | **BLOCKED** — validation false; 0 fixes/writes. |
| 4-H2 — alternate `--!>` comment terminator | **BLOCKED** — 0 fixes; alternate terminator absent. |
| 4-H3 — JSX brace / TypeScript quote injection | **BLOCKED** — JSX validation false; TypeScript destination 0 fixes/writes. |
| 4-M1 — GFM bare URL | **BLOCKED** — escaped output contains `https&#58;//`, not a bare live URL. |
| 4-M2 — `plaintext` content loss | **BLOCKED** — validation false. |
| 4-M3 — `video` / `audio` / `source` / `track` / `input[type=image]` | **BLOCKED** — all five validations false. The ordinary-image URL equivalent is 8-M1. |
| 4-M4 — `encoding:'none'` | **BLOCKED** — scan incomplete; 0 fixes/writes. |
| 4-M5 — duplicate in `.mjs` | **BLOCKED** — both files read; ambiguous match; 0 fixes/writes. |
| 4-M6 — `opacity:0` | **BLOCKED** — validation false. Equivalent hiding methods are 8-M2. |
| 4-M7 — “Read more” reduced to “R” | **BLOCKED** — 0 fixes; original text remains. |
| 4-M8 — swapped identical remediations | **BLOCKED** — 0 fixes/writes. |
| 4-M9 — element inside an HTML comment | **BLOCKED** — 0 fixes/writes. The replacement-carrier equivalent is the prior 7-M3 closure. |

### Fifth review — 6/6 blocked

| Payload | Result |
|---|---|
| 5-H1 — added class and repository destination CSS | **BLOCKED** — class validation false; destination CSS 0 fixes/writes. The JSX `className` equivalent is 8-H3. |
| 5-H2 — template remediation/destination | **BLOCKED** — remediation and template destination both refused. |
| 5-M1 — entity-encoded input type | **BLOCKED** — validation false. |
| 5-M2 — `opacity:0!important` | **BLOCKED** — validation false. The CSS-context priority suffix is the prior 7-H1 closure. |
| 5-M3 — live HTML contexts | **BLOCKED** — template, iframe, script-prefix, and unclosed-script cases each count 0 occurrences. The frameset source state is the prior 7-M4 closure. |
| 5-M4 — omitted blob and submodule | **BLOCKED** — unknown-extension duplicate and submodule each 0 fixes/writes. |

### Sixth review — 8/8 blocked

| Payload | Result |
|---|---|
| 6-H1 — SCSS/preprocessor and linked destination CSS | **BLOCKED** — both variants remain fail-closed; 0 fixes/writes. |
| 6-H2 — ten browser-valid CSS variants | **BLOCKED** — all ten exact variants still produce a non-null harm and are refused. The newly found value/selector/composition equivalents are 8-H1 and 8-H2. |
| 6-M1 — HTML comment opener | **BLOCKED** — validation false. |
| 6-M2 — hidden patched target | **BLOCKED** — `hidden` and `display:none` rejected. Equivalent hiding methods are 8-M2. |
| 6-M3 — transparent text | **BLOCKED** — validation false. The modern colour equivalent is 8-M2. |
| 6-M4 — new HTTP resource URL | **BLOCKED** in its literal form. Equivalent URL, duplicate-attribute, and list semantics are 8-M1. |
| 6-M5 — bogus/CDATA/quoted-end source contexts | **BLOCKED** in the source scanner. The replacement-carrier equivalent is the prior 7-M3 closure. |
| 6-M6 — ambiguous `.dat` blob | **BLOCKED** — content-based read makes the match ambiguous; 0 fixes/writes. |

### Seventh review — 8/8 reproductions blocked

The two 7-H1 reproductions were separate payload cases; the remaining findings
were grouped by their shared root cause in seven test blocks.

| Payload | Result |
|---|---|
| 7-H1a — CSS priority suffix overlay | **BLOCKED** — destination harm non-null; 0 fixes/writes. |
| 7-H1b — logical viewport-unit overlay | **BLOCKED** — destination harm non-null; 0 fixes/writes. |
| 7-H2 — relational `:has()` selector | **BLOCKED** — destination unprovable; 0 fixes/writes. |
| 7-H3 — dynamic JSX `<style>` source | **BLOCKED** — destination unprovable; 0 fixes/writes. The runtime-created style equivalent is 8-H4. |
| 7-M1 — URI spellings and navigation mutation | **BLOCKED** — protocol-relative, one-slash, backslash, and changed `href` cases refused. Duplicate-attribute and `ping` list equivalents are 8-M1. |
| 7-M2 — visual hiding values | **BLOCKED** — the eight literal hiding forms refused. Modern colour, clipping, zero-area, margin, viewport-translation, and animation equivalents are 8-M2. |
| 7-M3 — live element and media preservation | **BLOCKED** — raw-text/bogus carriers and dropped source refused. |
| 7-M4 — frameset target | **BLOCKED** — occurrence count 0; 0 fixes/writes. |

The temporary matrix executed 42 test blocks with 42/42 passing assertions:
12 fourth-review cases, 6 fifth-review cases, 8 sixth-review cases, the 7
grouped blocks containing all 8 seventh-review reproductions, and 9 legitimate
behaviours.

## 6. Legitimate behavior checked

**9/9 individual checks passed (8/8 behaviour groups).**

| Behavior | Result |
|---|---|
| Ordinary `image-alt` fix in HTML | PASS — one fix applied; `alt="Photo"` written. |
| Ordinary `image-alt` fix in TSX | PASS — one fix applied. |
| Ordinary `image-alt` fix in JS containing JSX | PASS — one fix applied. |
| Legitimate `https:` href | PASS — validates. |
| Legitimate `mailto:` href | PASS — validates when it is the candidate itself; 8-M1 concerns changing or masking a destination. |
| Three identical copies selected together | PASS — all three patched in one write. |
| Two of three identical copies selected | PASS — neither patched; match not provable. |
| Twelve additional server-template spellings | PASS — all rejected. |
| Mocked symlink with no inline content | PASS — scan incomplete; 0 fixes/writes. |

## 7. Verification commands and evidence

All commands were run from `C:\PROJECTS\AccessGuard` with `cmd /c`, using
`npm`/`node`/`npx` rather than `bun`.

### Tree and source-identity commands

```text
cmd /c git status --short
cmd /c git rev-parse HEAD
cmd /c git diff --quiet 08ab9ef..HEAD -- src && echo SOURCE_IDENTICAL=YES
cmd /c git diff --name-only cdb246a..08ab9ef -- src
cmd /c git diff --stat cdb246a..08ab9ef -- src
cmd /c git diff --numstat cdb246a..08ab9ef -- src
```

Observed: current HEAD `46bd701fab478159f93380120a369dc47c55f2ef`; source
identical to `08ab9ef`; 14 changed source/test files in the requested baseline
diff, with 1,050 insertions and 58 deletions; no later source diff.

### Build, typecheck, lint, tests, browser suite, and dependencies

```text
cmd /c npm run build
cmd /c npx tsc -p tsconfig.check.json --noEmit
cmd /c npm run lint
cmd /c npx vitest run --coverage
cmd /c npx playwright test --project=chromium
cmd /c "set https_proxy=http://127.0.0.1:8899&& set HTTPS_PROXY=http://127.0.0.1:8899&& npm audit --audit-level=high --json"
```

| Check | Observed result |
|---|---|
| Build | PASS — exit 0; Next 16.4.6; 116 static pages generated. |
| Source-only typecheck | PASS — exit 0. |
| Lint | PASS — exit 0; 0 errors. |
| Vitest | PASS — 53 files, 703/703 tests passed. |
| Coverage | PASS — statements 64.94% (threshold 55); branches 56.85% (50); functions 66.88% (58); lines 66.50% (57). |
| Playwright Chromium | PASS — exit 0; 79/79 tests passed. |
| `npm audit --audit-level=high` | PASS — exit 0; Critical 0, High 0, Moderate 15, Low 0. |

### Local reproduction commands

Two temporary, untracked scratch suites were used and deleted before this
report was completed:

```text
cmd /c npx vitest run src/lib/__tests__/review8-matrix.scratch.test.ts --reporter=dot
cmd /c npx vitest run src/lib/__tests__/review8-probe.scratch.test.ts --reporter=dot
```

Observed:

- prior/legitimate matrix — 1 file, **42/42 tests passed**;
- focused probe — 1 file, **21/21 tests passed**, comprising 15 reproduced
  unsafe cases and 6 dismissed candidates.

The mocked Octokit transport intercepted repository reads/writes, Playwright
launched local Chromium, and the only listeners bound to `127.0.0.1`.

### Secret and dependency check

```text
cmd /c git ls-files .env .env.*
cmd /c git grep -Il -E "<credential-shape patterns>" -- . ":(exclude).env" ":(exclude).env.*" ":(exclude)*.log"
```

Observed: only `.env.example` is tracked in the `.env*` name family; the actual
`.env` file was neither tracked nor read. The path-only scan found one
AWS-key-shaped string in a tracked documentation example under
`.openclaw/skills/document-generate/SKILL.md`; its value was not printed and it
was not treated as a live credential. No tracked private key, GitHub-token
shape, or OpenAI-style key was found by the same path-only categories. No
secret was modified.

## 8. OWASP and security-surface disposition

| Surface | Scoped result |
|---|---|
| Injection / XSS / source integrity | **FAIL** — 8-H1 through 8-H4 write a fix whose composed customer-page effect is a full-viewport UI takeover; 8-M2 writes fixes that remove customer-visible content. No script execution was reproduced. |
| SSRF / customer-side network isolation | The service-side verification browser continues to block network requests in isolation. The **customer-repository boundary fails** through 8-M1: a customer browser can be made to issue a remote request or follow a changed destination after merge. |
| Authentication / sessions / OAuth | The scoped route still requires a NextAuth session or bearer token, verified email, and `CREATE_PR` permission. OAuth token exchange/connect flows were unchanged and were not re-audited end to end. No new auth/session bypass was found in the scoped diff. |
| RBAC / tenant isolation | PASS in the scoped route: `requireVerifiedEmail(..., CREATE_PR)`, `project.orgId = auth.user.orgId`, exact violation-count check, connected-repository allow-list, and GitHub write-access validation remain. This is not a fresh full-product authorization audit. |
| CSRF / cookies / CORS / headers | The route has no route-local CSRF-token comparison and relies on the existing NextAuth/session behavior, JSON request shape, and non-simple optional `x-github-token` header. No permissive route CORS policy or changed cookie/header policy was found. A fresh browser CSRF test was not performed in this focused diff; no CSRF finding is claimed. |
| SQL injection | PASS in scope — the route uses Prisma parameterised queries; the scoped modules contain no raw SQL. No SQLi reproduction was found. |
| Command injection / uploads / deserialization | No shell execution, upload path, or unsafe deserialization was changed in the scoped diff. No fresh full-product command-injection/upload audit is claimed. |
| Rate limits / resource bounds | PASS in scope — request cap, per-user remediation rate limit, browser semaphore, repository scan budgets, and fail-closed truncated/oversized scans remain. No new concurrency exhaustion was reproduced. |
| Audit trail | PASS in scope — the route records `github_pr_created` after PR creation and retries a transient audit write. No new persistent-audit failure was injected. |
| Secrets | PASS — no live tracked secret found; no `.env` value read; no secret changed. |
| Dependencies | PASS for the release gate — `npm audit` reports High 0 and Critical 0. The 15 Moderate findings remain in the dependency/toolchain risk queue. |

## 9. Required closure criteria

1. **Destination CSS geometry (8-H1):** parse one-to-four-value `inset` and
   logical inset shorthands according to browser edge assignment; include
   `inline-size`/`block-size` and their viewport units in the relevant-property
   and coverage semantics. A geometry value the analyser cannot compute must
   make the changed destination unprovable, never harmless.
2. **Remediation/destination composition (8-H2):** compute the effective style
   from repository CSS plus the remediation's inline declarations, including
   custom-property definitions and references. An unprovable composition must
   reject the candidate before verification/write.
3. **JSX class hooks (8-H3):** read `className` as a class-token carrier in
   both the added-class guard and the destination CSS descriptor, preserving
   the HTML/JSX source dialect. A new class token must not bypass either gate.
4. **Runtime style creation (8-H4):** collect repository-owned runtime style
   sources, including `createElement('style')`, `style.textContent`,
   `style.innerHTML`, `style.cssText`, and equivalent injection paths, or make
   the destination unprovable when such a source cannot be judged.
5. **URI attribute/list semantics (8-M1):** preserve every duplicate attribute
   in source order, compare the browser-effective value, and parse each URI
   attribute according to its actual list grammar (including space-separated
   `ping`). A changed, masked, dropped, or newly introduced remote destination
   must be refused.
6. **Paint and hiding semantics (8-M2):** make static and browser-equivalent
   checks understand modern colour alpha syntaxes, zero-area targets,
   clipping/overflow, large negative margins, viewport-unit translation, and
   opacity/visibility animation endpoints. A target or text that produces no
   visible paint must not pass as visible.
7. For **every reproduction above**, the unsafe remediation must end with
   `validation: false`, 0 fixes, 0 writes, and no verified/applied state.
8. Add permanent regressions for every reproduction. Before the next independent
   review, re-run all **12 fourth-review**, **6 fifth-review**, **8
   sixth-review**, and **8 seventh-review** reproductions in their unsafe
   direction, plus the 9 legitimate checks.

## 10. Untested / out of scope

- No production, public, customer, or third-party target was scanned. No live
  GitHub repository, GitHub Markdown service, or public URL was called.
- Strix autonomous/self-scan execution was skipped as required. **No Strix
  result is claimed.**
- Chromium was the only browser engine. Safari, Firefox, WebKit, mobile engines,
  and customer build pipelines were not exercised.
- No Sass/Less/Stylus/PostCSS compiler was run. The CSS proofs use valid
  browser CSS and repository source shapes; they do not claim a particular
  preprocessor's output.
- Runtime JavaScript was not exhaustively exercised beyond the proven
  runtime-created style case. Other DOM mutation, CSS-in-JS libraries,
  bundler-generated selectors, and server-injected styles remain residual
  risk.
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

Two temporary scratch test files were created for the local matrix and focused
probe. Both suites passed, then both files were deleted before completion. They
are disclosed here as required and are not part of the reviewed source.

Only `.ai/SECURITY-REVIEW-8.md` is intended to be created. No temporary review
file, shipped source file, permanent test, generated fix, dependency file,
lockfile, database record, schema, environment file, or existing `.ai/` file
was changed. No commit, push, deployment, database migration, destructive Git
command, Strix run, production change, or secret modification was performed.
