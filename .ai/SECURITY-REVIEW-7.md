# AccessGuard — Seventh Independent Security Review

Date: 2026-11-22

## Verdict

**NOT READY — Critical 0, High 3, Medium 4, Low 0.**

The release gate requires **Critical 0 and High 0**. The three High findings below
reach the repository writer and create a browser-confirmed customer-page UI
takeover. This tree is not releasable until every High reproduction is blocked in
the unsafe direction and an independent review returns READY.

This is the seventh-review security-status artifact. The existing
`.ai/SECURITY-STATUS.md` was intentionally not changed, as required by the review
request.

## Reviewed trees and boundary

| Item | Value |
|---|---|
| Requested baseline | `06501881d22849a2ff83ed50db9e04e4525c6781` (`vol: releases — V23: volume log entry for the fifth-review closure cycle`) |
| Requested reviewed tree | `cdb246a4b91aba09ae647dbbed1df63be3df39e9` (`vol: releases — V23: volume log entry for the sixth-review closure cycle`) |
| Current checkout at review time | `5a1b83e57d7a45b3c67a09bc7feb3e47431afabb` |
| Source identity check | `git diff --quiet cdb246a..HEAD -- src` returned success (`SOURCE_IDENTICAL=YES`); later commits changed no scoped or other `src` file |
| Baseline-to-tree source diff | 11 files, 1,799 insertions and 215 deletions: `src/lib/ast-patch.ts`, `src/lib/css-context.ts`, `src/lib/fix-verification.ts`, `src/lib/github-pr.ts`, `src/lib/github.ts`, `src/lib/html-attributes.ts`, and their five permanent regression files |
| Review scope | `src/lib/css-context.ts`, `src/lib/github-pr.ts`, `src/lib/ast-patch.ts`, `src/lib/fix-verification.ts`, `src/lib/github.ts`, `src/lib/html-attributes.ts`, `src/app/api/github/create-pr/route.ts`, plus the directly related route/auth/validation call path |
| Reviewer changes | Report only. No shipped source, docs, Prisma schema, CI, E2E, dependency, environment, or existing `.ai/` file was changed. No commit, push, deployment, database migration, or secret change was performed. |

Every reproduction used local synthetic repositories, a mocked GitHub/Octokit
transport, local Playwright Chromium, and `127.0.0.1` listeners. No production,
public, customer, or third-party target was scanned. No live repository was
mutated. No `.env` value was read or printed.

**Strix/self-scan status:** skipped. The configured providers, quota, or credits
were unavailable. No Strix result, finding, confidence, or pass is claimed. The
local reproductions and shipped regression evidence in this report are the only
security-test evidence claimed.

## Reproduced findings

Variants that share one demonstrated root cause are grouped under one finding.
No Critical finding was reproduced.

| ID | Severity | Surface | Working reproduction and observed result | Root cause / impact |
|---|---|---|---|---|
| 7-H1 | **High** | Destination CSS declaration semantics | Repository `index.html` contained `<img id="target" src="x">`; repository `styles.css` contained `[alt]{position:fixed!important;inset:0;width:100%;height:100%;z-index:999999}`; remediation was `<img id="target" src="x" alt="Photo">`. Observed: `{"harm":null,"fixesAppliedTotal":1,"writeCount":1,"computed":{"position":"fixed","width":1280,"height":720,"zIndex":"999999","inset":"0px"}}`. The browser-valid logical-viewport equivalent `[alt]{position:fixed;top:0;left:0;width:100vi;height:100vb;z-index:999999}` also observed `{"harm":null,"fixesAppliedTotal":1,"writeCount":1,"computed":{"position":"fixed","width":1280,"height":720,"zIndex":"999999","top":0,"left":0}}`. | `src/lib/css-context.ts` retains the CSS priority suffix in declaration values, so `fixed!important` is not the browser value `fixed`. Its viewport-size recognizer also omits browser-valid logical viewport units. Unsupported values are not made unprovable. Adding the accessibility attribute can therefore turn the customer element into a full-viewport fixed overlay. |
| 7-H2 | **High** | Destination CSS relational selectors | Repository `styles.css` contained `body:has(#target[alt]){position:fixed;inset:0;width:100%;height:100%;z-index:999999}`. The same source and remediation as 7-H1 produced `{"harm":null,"fixesAppliedTotal":1,"writeCount":1,"selectorMatches":1,"ancestorBody":{"position":"fixed","width":1280,"height":720,"zIndex":"999999,"inset":"0px"}}`. | `matchSelector` judges only the subject compound of a selector and ignores the ancestor relationship that `:has()` creates. The analyser therefore sees no rule, while Chromium starts matching the ancestor after the fix adds `alt`. The accessibility fix activates customer-owned CSS that takes over the page. |
| 7-H3 | **High** | Dynamic repository style carrier | `App.jsx` contained `const css="[alt]{position:fixed;inset:0;width:100%;height:100%;z-index:999999}"; export const Card=()=> (<div className="parent"><style>{css}</style><img id="target" src="x" /></div>);`. Observed: `{"styleBlocks":["{css}"],"cssRules":0,"cssUnprovable":[],"harm":null,"fixesAppliedTotal":1,"writeCount":1,"computed":{"position":"fixed","width":1280,"height":720,"zIndex":"999999","inset":"0px"}}`. | `extractStyleBlocks` captures the raw body of a `<style>` element. For a JSX expression it obtains the text `{css}`, produces no rule, and—critically—does not mark the destination unprovable. React resolves the constant and Chromium applies the overlay. A repository-owned style source is silently omitted rather than judged or rejected. |
| 7-M1 | Medium | URI/resource and navigation preservation | Protocol-relative remediation `<img id="target" src="//127.0.0.1:<port>/pixel?token=local" alt="Photo">` produced `{"validation":{"valid":true},"fixesAppliedTotal":1,"writeCount":1,"customerHits":["/pixel?token=local"]}`. The one-slash form `http:/127.0.0.1:<port>/pixel?token=local` produced `{"valid":true,"fixesAppliedTotal":1,"writeCount":1,"customerHits":["/127.0.0.1:<port>/pixel?token=local"]}`. The backslash form `http:\\127.0.0.1:<port>\pixel` produced `{"valid":true,"fixesAppliedTotal":1,"writeCount":1,"customerHits":["/pixel"]}`. Separately, changing an existing `href="/account"` to `href="mailto:attacker@example.com"` produced `{"validation":{"valid":true},"candidate":{"valid":true},"verification":{"status":"verified","confidence":1},"fixesAppliedTotal":1,"writeCount":1,"observedHref":"mailto:attacker@example.com"}`. | `remoteUrlsOf` recognises only strings matching `^https?://` after a limited normalisation. It does not resolve a URL as a browser does and excludes `mailto:`, `tel:`, and other allowed schemes. `checkUriAttribute` accepts those schemes independently. The original/new comparison therefore misses protocol-relative, malformed HTTP, backslash, and non-HTTP destination changes. A fix can introduce a customer-side request or redirect the user to a different destination. |
| 7-M2 | Medium | Visible-content preservation | A `link-name` remediation that added `aria-label` and `style="font-size:0;line-height:0;overflow:hidden"` produced `{"verification":{"status":"verified","confidence":1},"fontSize":"0px","lineHeight":"0px","width":0,"height":0,"textRect":{"width":0,"height":0}}`. A repository stylesheet `[aria-label]{font-size:0;line-height:0;overflow:hidden}` produced `{"harm":null,"fixesAppliedTotal":1,"writeCount":1,"computed":{"fontSize":"0px","lineHeight":"0px","width":0,"height":0,"textRect":{"width":0,"height":0}}}`. Additional browser-computed variants `content-visibility:hidden`, `translate:-9999px`, `filter:opacity(0)`, and `scale:0` were also verified with confidence `1`. | The static style guard and the browser verifier reject `display:none`, `visibility:hidden`, element opacity `0`, and transparent text, but do not detect zero-size text, paint suppression, content-visibility suppression, or off-screen/zero-scale rendering. The repository CSS analyser likewise does not treat these values as hidden. The fix is reported verified and written while the user cannot read or see the original content. |
| 7-M3 | Medium | Rule-target/media preservation | Four `image-alt` replacements were accepted, verified with confidence `1`, and each caused one repository write: `<textarea><img id="target" src="/photo.png" alt="Photo"></textarea>` produced browser `images:0,loadedImages:0`; `<title><img id="target" src="/photo.png" alt="Photo"></title>` produced `images:0,loadedImages:0`; `<!bogus <img id="target" src="/photo.png" alt="Photo">>` produced `images:0,loadedImages:0`; and `<img id="target" alt="Photo">` produced `images:1,loadedImages:0`. In every case the original live image was removed or made unloadable and the later button remained (`buttons:1`). | `validateFixForRule('image-alt', ...)` uses a lexical regex to find an `<img alt>` token. It does not prove that Chromium created a live `HTMLImageElement`, and it does not require the original media source to remain. Raw-text and bogus-comment carriers therefore pass the rule check, axe sees no image-alt violation, and the writer reports the fix as applied even though customer content is deleted. |
| 7-M4 | Medium | Live HTML source mapping | Source `<html><frameset><img id="target" src="x"></frameset></html>` produced `{"scannerCount":1,"fixesAppliedTotal":1,"writeCount":1,"written":"<html><frameset><img id=\"target\" src=\"x\" alt=\"Photo\"></frameset></html>","chromium":{"images":0,"framesets":1}}`. | `liveTagStarts` excludes raw-text and inert elements but does not implement the frameset parsing state. It counts an image inside `frameset` as live and reports a source fix as applied although Chromium creates no image for it. This is a false-applied/wrong-target path distinct from the sixth-review source-context payloads. |

### Finding-to-code map

| Finding | Primary code path |
|---|---|
| 7-H1 | `src/lib/css-context.ts` — `parseDeclarations`, `COVERS_X`/`COVERS_Y`, `stateOf`, `destinationCssHarm` |
| 7-H2 | `src/lib/css-context.ts` — `matchSelector`, `parseSubject` |
| 7-H3 | `src/lib/css-context.ts` — `extractStyleBlocks`; `src/lib/github.ts` — destination CSS collection |
| 7-M1 | `src/lib/github-pr.ts` — `remoteUrlsOf`, `checkUriAttribute`, `validateRemediation`; `src/lib/html-attributes.ts` — `normalizeUriValue` |
| 7-M2 | `src/lib/github-pr.ts` — `checkStyleAttribute`; `src/lib/fix-verification.ts` — `checkRenderedElement`, rendered-text check; `src/lib/css-context.ts` — `stateOf` |
| 7-M3 | `src/lib/fix-validation.ts` — `extractTag`, `validateFixForRule('image-alt')`; `src/lib/fix-verification.ts` — `runRuleInBrowser`; `src/lib/github-pr.ts` — `validateRemediation` |
| 7-M4 | `src/lib/ast-patch.ts` — `liveTagStarts`; `src/lib/github.ts` — source occurrence/write decision |

## Exact prior-payload re-run

All literal prior-review payloads were re-run against the reviewed source. The
unsafe direction means that the payload must not validate, must not apply, and
must not reach a repository write.

### Fourth review — 12/12 blocked

| Payload | Result |
|---|---|
| 4-H1 — named-entity CSS overlay | **BLOCKED** — validation false; 0 fixes/writes. |
| 4-H2 — alternate `--!>` comment terminator | **BLOCKED** — 0 fixes; alternate terminator absent. |
| 4-H3 — JSX brace / TypeScript quote injection | **BLOCKED** — JSX validation false; TypeScript destination 0 fixes/writes. |
| 4-M1 — GFM bare URL | **BLOCKED** — escaped output contains `https&#58;//`, not a bare live URL. |
| 4-M2 — `plaintext` content loss | **BLOCKED** — validation false. |
| 4-M3 — `video` / `audio` / `source` / `track` / `input[type=image]` | **BLOCKED** — all five validations false. The ordinary-image URL equivalent is now 7-M1. |
| 4-M4 — `encoding:'none'` | **BLOCKED** — scan incomplete; 0 fixes/writes. |
| 4-M5 — duplicate in `.mjs` | **BLOCKED** — both files read; ambiguous match; 0 fixes/writes. |
| 4-M6 — `opacity:0` | **BLOCKED** — validation false. Equivalent hiding methods are 7-M2. |
| 4-M7 — “Read more” reduced to “R” | **BLOCKED** — 0 fixes; original text remains. |
| 4-M8 — swapped identical remediations | **BLOCKED** — 0 fixes/writes. |
| 4-M9 — element inside an HTML comment | **BLOCKED** — 0 fixes/writes. The replacement-carrier equivalent is 7-M3. |

### Fifth review — 6/6 blocked

| Payload | Result |
|---|---|
| 5-H1 — added class and repository destination CSS | **BLOCKED** — class validation false; destination CSS 0 fixes/writes. |
| 5-H2 — server-template remediation/destination | **BLOCKED** — remediation and template destination both refused. |
| 5-M1 — entity-encoded input type | **BLOCKED** — validation false. |
| 5-M2 — `opacity:0!important` | **BLOCKED** — validation false. The CSS-context priority suffix is 7-H1. |
| 5-M3 — live HTML contexts | **BLOCKED** — template, iframe, script-prefix, and unclosed-script cases each count 0 occurrences. The frameset source state is 7-M4. |
| 5-M4 — complete text-blob scan | **BLOCKED** — unknown-extension duplicate and submodule each 0 fixes/writes. |

### Sixth review — 8/8 blocked

| Payload | Result |
|---|---|
| 6-H1 — SCSS/preprocessor and linked destination CSS | **BLOCKED** — both variants remain fail-closed; 0 fixes/writes. |
| 6-H2 — ten browser-valid CSS variants | **BLOCKED** — all ten exact variants still produce a non-null harm and are refused. The newly found value/selector/dynamic-carrier equivalents are 7-H1, 7-H2, and 7-H3. |
| 6-M1 — HTML comment opener | **BLOCKED** — validation false. |
| 6-M2 — hidden patched target | **BLOCKED** — `hidden` and `display:none` rejected. Equivalent hiding methods are 7-M2. |
| 6-M3 — transparent text | **BLOCKED** — validation false. |
| 6-M4 — new HTTP(S) resource URL | **BLOCKED** in its literal form. Equivalent URL syntaxes and navigation mutation are 7-M1. |
| 6-M5 — bogus/CDATA/quoted-end source contexts | **BLOCKED** in the source scanner. The replacement-carrier equivalent is 7-M3. |
| 6-M6 — ambiguous `.dat` blob | **BLOCKED** — content-based read makes the match ambiguous; 0 fixes/writes. |

The tenth exact 6-H2 CSS variant set was also re-run in real Chromium and all
ten remained blocked in the unsafe direction, including the stylesheet-order
independence check.

## Legitimate behavior checked

**9/9 individual checks passed (8/8 behaviour groups).**

| Behavior | Result |
|---|---|
| Ordinary `image-alt` fix in HTML | PASS — one fix applied; `alt="Hero"` written. |
| Ordinary `image-alt` fix in TSX | PASS — one fix applied. |
| Ordinary `image-alt` fix in JS containing JSX | PASS — one fix applied. |
| Legitimate `https:` href | PASS — validates. |
| Legitimate `mailto:` href | PASS — validates when it is the candidate itself; 7-M1 concerns changing an existing destination to a different one. |
| Three identical copies selected together | PASS — all three patched in one write. |
| Two of three identical copies selected | PASS — neither patched; match not provable. |
| Twelve additional server-template spellings | PASS — all rejected. |
| Mocked symlink with no inline content | PASS — scan incomplete; 0 fixes/writes. |

## Verification commands and evidence

All commands were run from `C:\PROJECTS\AccessGuard` with `cmd /c`, using `npm`
rather than `bun`.

### Tree and source-identity commands

```text
cmd /c git status --short
cmd /c git rev-parse HEAD
cmd /c git diff --quiet cdb246a..HEAD -- src && echo SOURCE_IDENTICAL=YES
cmd /c git diff --name-only 0650188..cdb246a -- src
cmd /c git diff --stat 0650188..cdb246a -- src
cmd /c git diff --name-only cdb246a..HEAD -- src
```

Observed: current HEAD `5a1b83e57d7a45b3c67a09bc7feb3e47431afabb`; source
identical to `cdb246a`; 11 changed source/test files in the requested baseline
diff; no later source diff.

### Build, typecheck, lint, tests, browser suite, and dependencies

```text
cmd /c npm run build
cmd /c npx tsc -p tsconfig.check.json --noEmit
cmd /c npm run lint
cmd /c npx vitest run --coverage --reporter=dot
cmd /c npx playwright test --project=chromium
cmd /c "set https_proxy=http://127.0.0.1:8899&& set HTTPS_PROXY=http://127.0.0.1:8899&& npm audit --audit-level=high --json"
```

| Check | Observed result |
|---|---|
| Build | PASS — exit 0; Next 16.4.6; 116 static pages generated. |
| Source-only typecheck | PASS — exit 0. |
| Lint | PASS — exit 0; 0 errors. |
| Vitest | PASS — 53 files, 667/667 tests passed. |
| Coverage | PASS — statements 64.80% (threshold 55); branches 56.21% (50); functions 66.80% (58); lines 66.34% (57). |
| Playwright Chromium | PASS — 79 total: 78 passed on the first run; one dashboard axe-contrast test was flaky and passed on retry; 0 failed. |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0, Moderate 15, Low 0. |

### Local reproduction commands

No temporary source/test file was created. Every reproduction was passed inline
to `tsx`; the mocked Octokit transport intercepted repository reads/writes,
Playwright launched local Chromium, and the only listener bound to
`127.0.0.1`.

```text
cmd /c npx tsx -e "<inline prior-payload matrix: 4th/5th/6th review cases from the tables above>"
cmd /c npx tsx -e "<inline legitimate-behaviour matrix: HTML/TSX/JS, https/mailto, 3-of-3, 2-of-3, 12 templates, symlink>"
cmd /c npx tsx -e "<inline CSS overlay harness: !important, 100vi/100vb, body:has(), JSX <style>{css}</style>>"
cmd /c npx tsx -e "<inline URL harness: protocol-relative, http:/, http backslash, mailto destination mutation>"
cmd /c npx tsx -e "<inline visual-hiding harness: font/line-height zero, content-visibility, translate, filter opacity, scale>"
cmd /c npx tsx -e "<inline image-alt carrier harness: textarea, title, bogus comment, src removal>"
cmd /c npx tsx -e "<inline frameset harness: scanner count versus Chromium DOM count>"
```

The exact payload literals and the observed values are the finding rows above;
the harness bodies were passed directly on the command line and were not written
to disk.

### Secret and dependency check

```text
cmd /c node -e "<tracked-file pattern scan; excludes .env and *.log; prints only path and pattern category>"
```

Observed: 773 tracked files enumerated and 772 text candidates scanned without
printing any matched value. One AWS-key-shaped string was detected only in a
tracked documentation example under `.openclaw/skills/`; its value was not
printed and it was not treated as a live credential. No `.env` file was read.
No secret was modified.

## OWASP and security-surface disposition

| Surface | Scoped result |
|---|---|
| Injection / XSS / source integrity | **FAIL** — 7-H1, 7-H2, and 7-H3 write destination-controlled CSS behavior into customer source; 7-M3 and 7-M4 also report content-destroying or false-applied fixes. |
| SSRF / customer-side network isolation | The service-side browser continues to block network requests in isolation. The **customer-repository boundary fails** through 7-M1. |
| Authentication / sessions / OAuth | The scoped route still requires a NextAuth session or bearer token, verified email, and `CREATE_PR` permission. OAuth token exchange/connect flows were unchanged and were not re-audited end to end. No new auth/session bypass was found in the scoped diff. |
| RBAC / tenant isolation | PASS in the scoped route: `requireVerifiedEmail(..., CREATE_PR)`, `project.orgId = auth.user.orgId`, exact violation-count check, connected-repository allow-list, and GitHub write-access validation remain. This is not a fresh full-product authorization audit. |
| CSRF / cookies / CORS / headers | The route has no route-local CSRF-token comparison and relies on the existing NextAuth/session behavior, JSON request shape, and non-simple optional `x-github-token` header. No permissive route CORS policy or changed cookie/header policy was found. A fresh browser CSRF test was not performed in this focused diff; no CSRF finding is claimed. |
| SQL injection | PASS in scope — the route uses Prisma parameterised queries; the scoped modules contain no raw SQL. No SQLi reproduction was found. |
| Command injection / uploads / deserialization | No shell execution, upload path, or unsafe deserialization was changed in the scoped diff. No fresh full-product command-injection/upload audit is claimed. |
| Rate limits / resource bounds | PASS in scope — request cap, per-user remediation rate limit, browser semaphore, repository scan budgets, and fail-closed truncated/oversized scans remain. No new concurrency exhaustion was reproduced. |
| Audit trail | PASS in scope — the route records `github_pr_created` after PR creation and retries a transient audit write. No new persistent-audit failure was injected. |
| Secrets | PASS — no live tracked secret found; no `.env` value read; no secret changed. |
| Dependencies | PASS for the release gate — `npm audit` reports High 0 and Critical 0. The 15 Moderate findings remain in the dependency/toolchain risk queue. |

## Required closure criteria

1. **CSS declaration semantics (7-H1):** normalise the CSS priority suffix and
   browser-valid value forms before deciding geometry. Cover `!important`,
   logical viewport units, and the other supported viewport forms. A value the
   analyser cannot compute must make the changed property/destination
   unprovable rather than harmless.
2. **Relational selectors (7-H2):** evaluate selectors in enough DOM context to
   prove the effect of ancestor/relational selectors such as `:has()`, or mark
   the destination unprovable whenever the fix can change such a match.
3. **Dynamic style carriers (7-H3):** collect and resolve repository-owned
   dynamic style sources, including JSX `<style>{expression}</style>` and
   `dangerouslySetInnerHTML`, or fail closed. An expression body must never be
   treated as an empty, proven stylesheet.
4. **URL/navigation preservation (7-M1):** canonicalise URI attributes against
   a fixed base exactly as a browser resolves them, compare the resolved
   origin/resource/navigation semantics with the original, and preserve every
   URI-bearing attribute relevant to the rule. Protocol-relative, one-slash,
   backslash, and non-HTTP scheme changes must not bypass the comparison.
5. **Visible-content preservation (7-M2):** extend both static and real-browser
   checks to zero-size text, `content-visibility:hidden`, off-screen/zero-scale
   placement, paint-suppressing filters, and equivalent methods. A zero-sized
   or unpainted text range must not pass as visible.
6. **Live rule target and media preservation (7-M3):** prove the remediation
   creates a live element of the intended type in a browser-equivalent DOM, and
   require an `image-alt` fix to retain the original image's media semantics.
   A lexical `<img>` token inside raw text or a bogus comment is not a fix.
7. **Browser-equivalent source mapping (7-M4):** implement the frameset parsing
   state (or fail closed for it) and add permanent regressions proving scanner
   count equals the browser DOM count for this context.
8. Add permanent regressions for every reproduction above. Before the next
   independent review, re-run all **12 fourth-review**, **6 fifth-review**, and
   **8 sixth-review** payloads in their unsafe direction, plus the 9 legitimate
   checks.

## Untested / out of scope

- No production, public, customer, or third-party target was scanned. No live
  GitHub repository, GitHub Markdown service, or public URL was called.
- Strix autonomous/self-scan execution was skipped because the configured
  providers, quota, or credits were unavailable. **No Strix result is claimed.**
- Chromium was the only browser engine. Safari, Firefox, WebKit, mobile engines,
  and customer build pipelines were not exercised.
- No Sass/Less/Stylus/PostCSS compiler was run. The CSS proofs use valid
  browser CSS and repository source shapes; they do not claim a particular
  preprocessor's output.
- Runtime JavaScript that writes styles, dynamically inserts stylesheets, or
  mutates the DOM after render was not exhaustively exercised beyond the proven
  JSX constant-style carrier.
- GitHub Markdown rendering was not exercised against an external service; only
  the local escaping behaviour and the exact 4-M1 payload were checked.
- The symlink result uses a mocked no-inline-content GitHub response shape; no
  live GitHub repository was queried.
- This was a focused V23 verified-fix/GitHub-writer audit, not a fresh
  full-product review of authentication, session lifecycle, CSRF, OAuth, CORS,
  uploads, SQL injection, command injection, or container hardening.
- No Docker image/SBOM, multi-instance concurrency, container-Chromium, or
  infrastructure scan was performed in this pass.

## Cleanup and artifact integrity

Only `.ai/SECURITY-REVIEW-7.md` is intended to be created. No temporary review
file, source file, generated fix, dependency file, lockfile, database record,
or environment file was changed. No commit or push was performed.
