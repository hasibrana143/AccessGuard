# AccessGuard — Current State

| Field | Value |
|---|---|
| Current phase | **SECURITY FIX LOOP — V23 eighteenth-review closure shipped, nineteenth review pending** 🟡 |
| Current task | Run the nineteenth independent security review of the eighteenth-review closure tree; the release gate opens only on READY (Critical 0, High 0) |
| Owner | CTO agent |
| Status | AMBER — the eighteenth independent review returned **NOT READY (High 1, Medium 1, Low 1)**: the writer still decided by a closed list of mutation spellings, the activated custom property was not followed into the rule that consumes it, and an unrelated computed call refused every fix. **All three are now closed at their root cause** with 20 permanent regressions, and every gate is green. The release gate stays closed until a **nineteenth** independent review returns READY |
| Blocked | The release gate stays closed until the **nineteenth** independent review returns READY; Strix autonomous pentest remains unavailable — every provider refuses the run (quota / EOL model / no credits), so no Strix evidence exists for this cycle |
| Next action | Run the nineteenth independent review of the eighteenth-review closure tree (`b16dafd`); if READY, close the V23 release gate and request production-deploy approval. If NOT READY, close each reproduced root cause with a permanent regression and repeat the independent review |
| Last verification | 2026-11-26 — seventeenth-review closure: source-only typecheck 0, lint 0, vitest 53 files/987 tests, coverage 70.4/63.12/73.41/72.53, build 0 (116 static pages), Playwright 79/79 passed (0 flaky), npm audit Critical 0 / High 0 (15 moderate), the fails-before proof 10 of the 15 new regressions failing without the fix |

**Product verdict:** `.ai/PRODUCT-CRITIQUE.md` — original issues fixed: crawler implemented, GitHub Action repaired, trial added, pricing math resolved. Deep critique: `.ai/PRODUCT-CRITIQUE-DEEP.md` — P0 truth gaps closed in V23. Execution plan: `.ai/TASKS.md`.

## Evidence (2026-11-24, sixteenth-review closure)

| Check | Result |
|---|---|
| Sixteenth-review closure | PASS — all eleven findings (16-H1…16-H7, 16-M1…16-M4) closed at their root cause in `src/lib/github.ts`, `src/lib/css-context.ts` and `src/lib/github-pr.ts`; the dispositions are in `.ai/SECURITY-STATUS.md` and the reviewer's own artifact is `.ai/SECURITY-REVIEW-16.md` |
| Permanent regressions | PASS — 32 new tests (21 in `github.test.ts`, 10 in `css-context.test.ts`, 1 in `github-pr.test.ts`); the pre-closure tree fails 14 harmful Scope A cases and 7 harmful Scope B cases, and every benign twin passes before and after |
| Sixteenth-review closure matrix (temporary) | PASS — 42/42: every finding is blocked in the unsafe direction (0 fixes, 0 writes) and every benign twin stays writable. The file was deleted after the run |
| Gap found by the closure matrix | FIXED — the optional **computed** member `img['dataset']?.['state']` was still open; the shared member pattern now covers the optional computed access, and the permanent regressions `16-H1d` and `16-H1e` lock it down |
| Prior payload matrices (recovered) | PASS — the prior / legitimate matrix 118/118 (run with `tsx`), the combined writer closure run 192/192 across seven files and the route run 24 passed with the 2 intentional pre-closure failures |
| Pre-closure eleventh-review harnesses (recovered) | FAIL **as expected** — 12 failed + 5 passed and 2 failed + 7 passed: the failures assert that the eleventh-review vulnerabilities still exist, so they confirm the closure rather than report a regression |
| `npx vitest run --coverage` | PASS — 53 files, 972/972 tests (was 53/939) |
| Coverage | PASS — statements 70.3% (threshold 55) · branches 63.09% (50) · functions 73.36% (58) · lines 72.38% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 tests, 78 passed, 1 flaky, 0 failed |
| `npm audit --audit-level=high` | PASS — exit 0, Critical 0 / High 0 (15 moderate toolchain advisories); `npm audit --omit=dev --audit-level=high` exits 0 with 5 moderate advisories |
| Environment note | The local dev database had lost its `default-org` seed (the API suites then answered `401`); `npm run db:seed` restored it and the suites are green. The seed is a dev fixture — no schema, migration or production data changed |
| Strix autonomous pentest | **NOT RUN** — every configured provider refuses the run (quota / EOL model / no credits); no Strix result is claimed for this cycle |
| Release gate | CLOSED — opens only when the **nineteenth** independent review returns READY (Critical 0, High 0) |

## Evidence (2026-11-24, fifteenth-review closure)

| Check | Result |
|---|---|
| Fifteenth-review closure | PASS — all nine findings (15-H1…15-H4, 15-M1…15-M5) closed at their root cause in `src/lib/github.ts`, `src/lib/css-context.ts`, `src/lib/fix-validation.ts` and `src/lib/github-pr.ts`; the dispositions are in `.ai/SECURITY-STATUS.md` and the reviewer's own artifact is `.ai/SECURITY-REVIEW-15.md` |
| Permanent regressions | PASS — 37 new tests (17 in `github.test.ts`, 12 in `css-context.test.ts`, 7 in `fix-validation.test.ts`, 3 in `github-pr.test.ts`); every reproduction fails on the pre-closure tree (8 + 6 + 5 failures proved by reverting each scope) |
| Fifteenth-review closure matrix (temporary) | PASS — 24/24 with the closure (16 failures and 8 passed on the pre-closure tree): every finding is blocked in the unsafe direction (0 fixes, 0 writes) and every benign twin stays writable. The file was deleted after the run |
| Prior payload matrices (recovered) | PASS — the prior / legitimate matrix 118/118 (run with `tsx`) and the combined closure run 209/209 across nine files (the ninth 42, the tenth 19, the eleventh 37 + 9, the twelfth 26 + 8, the thirteenth 21, the fourteenth 23 and the fifteenth 24) |
| Pre-closure eleventh-review harnesses (recovered) | FAIL **as expected** — 12 failed + 5 passed and 2 failed + 7 passed: the failures assert that the eleventh-review vulnerabilities still exist, so they confirm the closure rather than report a regression |
| `npx vitest run --coverage` | PASS — 53 files, 939/939 tests (was 53/902) |
| Coverage | PASS — statements 69.89% (threshold 55) · branches 62.75% (50) · functions 72.93% (58) · lines 71.78% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 tests, 0 failed |
| `npm audit --audit-level=high` | PASS — exit 0, Critical 0 / High 0 (15 moderate toolchain advisories) |
| Tracked-file secret scan | PASS — 787 tracked files; one AWS-key-shaped **documentation placeholder** in `.openclaw/skills/document-generate/SKILL.md` (path and category only, value never printed) and no live credential |
| Strix autonomous pentest | **NOT RUN** — every configured provider refuses the run (quota / EOL model / no credits); no Strix result is claimed for this cycle |
| Release gate | CLOSED — opens only when a **sixteenth** independent review returns READY (Critical 0, High 0) |

## Evidence (2026-11-24, fifteenth independent security review)

| Check | Result |
|---|---|
| Fifteenth independent security review | **NOT READY — Critical 0, High 4, Medium 5, Low 0** against the fourteenth-review closure tree `d16797c` (checkout `2da3e00`, baseline `08ab9ef`); the reviewer's own artifact is `.ai/SECURITY-REVIEW-15.md` and the findings are in `.ai/SECURITY-STATUS.md` |
| Reviewer's gate suite | PASS — source-only typecheck 0, lint 0, vitest 53 files / 902/902, coverage 68.88/61.78/72.06/70.74, build 0, Playwright 79 (77 passed, 2 flaky, 0 failed), `npm audit` Critical 0 / High 0 (15 moderate) |
| Recovered fourth- through fourteenth-review payloads | PASS — 185/185 recovered assertions across eight matrices and route harnesses, plus the two pre-closure harnesses failing exactly as expected (12 failed + 5 passed, 2 failed + 7 passed) |
| New equivalent-path harnesses | 19 candidates (16 harmful, 2 controls correctly refused, 1 benign) and 11/11 route assertions — the nine findings below are newly found equivalent paths, not re-openings of the literal prior payloads |
| Release gate | CLOSED — opens only when a **sixteenth** independent review returns READY (Critical 0, High 0) |

## Evidence (2026-11-24, fourteenth-review closure)

| Check | Result |
|---|---|
| Fourteenth-review closure | PASS — all ten findings (14-H1…14-H4, 14-M1…14-M6) closed at their root cause in `d16797c` (the closure documentation is `1803d50`); the dispositions are in `.ai/SECURITY-STATUS.md` and the reviewer's own artifact is `.ai/SECURITY-REVIEW-14.md` |
| Permanent regressions | PASS — 49 new tests across the five shipped suites; every reproduction fails on the pre-closure tree (21 + 7 + 2 failures proved by reverting each scope) |
| Fourteenth-review closure matrix (temporary) | PASS — 23/23: the ten findings are blocked in the unsafe direction (0 fixes, 0 writes, non-null destination harm or `validation:false`) and the benign twins stay allowed. The file was deleted after the run |
| False positive found while reviewing the closure | FIXED — the element pairing refused ordinary fixes that keep a child element with changed attributes and every remediation with nested children when the original had no id; the identity of an element is its tag and its id now, locked by `14-H4c` and `14-H4d` |
| Prior payload matrices (recovered) | PASS — the prior / legitimate matrix 118/118, the twelfth / thirteenth / tenth / eleventh / ninth closure matrices 145/145 and the route matrices 17/17 |
| Pre-closure eleventh-review harnesses (recovered) | FAIL **as expected** — 12 failed + 5 passed and 2 failed + 7 passed: the failures assert that the eleventh-review vulnerabilities still exist, so they confirm the closure rather than report a regression |
| `npx vitest run --coverage` | PASS — 53 shipped files, 902/902 tests (was 53/853) |
| Coverage | PASS — statements 68.88% (threshold 55) · branches 61.78% (50) · functions 72.06% (58) · lines 70.74% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build, 116 static pages) |
| `npx playwright test --project=chromium` | PASS — 78 passed, 1 flaky (the accessibility spec failed its first attempt and passed on the retry; no assertion failed on the re-run), exit 0 |
| `npm audit --audit-level=high` | PASS — exit 0, Critical 0 / High 0 (15 moderate toolchain advisories) |
| Tracked-file secret scan | PASS — the diff carries no credential pattern and no `.env`, `.log`, `secret`, `credential`, `.pem` or `.key` file |
| Strix autonomous pentest | **NOT RUN** — every configured provider refuses the run (quota / EOL model / no credits); no Strix result is claimed for this cycle |
| Release gate | CLOSED — opens only when a **fifteenth** independent review returns READY (Critical 0, High 0) |

## Evidence (2026-11-24, fourteenth independent security review)

| Check | Result |
|---|---|
| Fourteenth independent security review | **NOT READY — Critical 0, High 4, Medium 6, Low 0** against the thirteenth-review closure tree `be81d02` (checkout `f6db8f7`, baseline `08ab9ef`); the reviewer's own artifact is `.ai/SECURITY-REVIEW-14.md` and the findings are in `.ai/SECURITY-STATUS.md` |
| Reviewer's gate suite | PASS — source-only typecheck 0, lint 0, vitest 53 files / 853/853, build 0, Playwright 79/79, `npm audit` Critical 0 / High 0 (15 moderate) |
| Recovered fourth- through thirteenth-review payloads | PASS — 280/280 recovered assertions (the prior/legitimate matrix 118/118, the ninth 42/42, the tenth 19/19, the eleventh 37/37 + 9/9, the twelfth 26/26 + 8/8, the thirteenth 21/21) plus the two pre-closure harnesses failing exactly as expected (12 failed + 5 passed, 2 failed + 7 passed) |
| New equivalent-path harnesses | 13/13 route assertions and 18/18 legitimate-behaviour assertions — the ten findings below are newly found equivalent paths, not re-openings of the literal prior payloads |
| Release gate | CLOSED — opens only when a **fifteenth** independent review returns READY (Critical 0, High 0) |

## Evidence (2026-11-23, thirteenth-review closure)

| Check | Result |
|---|---|
| Thirteenth-review closure | PASS — all seven findings (13-H1…13-H5, 13-M1, 13-M2) fixed at their root cause in `be81d02`; the dispositions are in `.ai/SECURITY-STATUS.md` and the reviewer's own artifact is `.ai/SECURITY-REVIEW-13.md` |
| Permanent regressions | PASS — 26 new tests (the base-relative stylesheet, the base-relative script, the base outside the repository, the base inside the repository, a script file that is not a document, the computed property read, the computed selector read, the unresolved property name, the unresolved selector, the unsafe candidate after the budget, four route refusals, the negated attribute value change, the `:nth-child(… of …)` selector list, the nested negation, the unreadable functional pseudo-class, the added anchor `href`, the added `contenteditable`, the `tabindex` value change, the large outline, the large `inset` shorthand, the harmless dynamic pseudo-class); the shipped suites are 117 (`css-context.test.ts`) and 79 (`github.test.ts`) tests |
| Thirteenth-review closure matrix (temporary) | PASS — 21/21: the seven findings are blocked in the unsafe direction (0 fixes, 0 writes, non-null destination harm or `validation:false`) and the benign twins stay allowed. The file was deleted after the run |
| False positive found while reviewing the closure | FIXED — the document-base reader parsed **every** file of a repository as markup, so an ordinary script file that holds a comparison and an apostrophe made the whole repository unprovable and refused every fix. A script file is runtime code and not a document, and a document without a `<base>` element has its own URL as the base; the regression `13-H1e` locks the behaviour down |
| Prior payload matrices (recovered) | PASS — the twelfth-review closure matrix 26/26, the eleventh-review closure matrix 37/37, the ninth-review closure matrix 42/42, the tenth-review closure matrix 19/19, the eleventh-review route matrix 9/9 and the prior / legitimate matrix 118/118 (run with `tsx` and Playwright Chromium) |
| Pre-closure eleventh-review harnesses (recovered) | FAIL **as expected** — 12 failed + 5 passed and 2 failed + 7 passed: the failures assert that the eleventh-review vulnerabilities still exist, so they confirm the closure rather than report a regression |
| `npx vitest run --coverage` | PASS — 53 shipped files, 853/853 tests (was 53/829) |
| Coverage | PASS — statements 68.02% (threshold 55) · branches 60.67% (50) · functions 71.05% (58) · lines 69.81% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build, 116 static pages) |
| `npx playwright test --project=chromium` | PASS — 79/79 on the clean re-run; the first run reported 78 with one retry (the accessibility spec failed its first attempt and passed on the retry, no assertion failed on the re-run) |
| `npm audit --audit-level=high` | PASS — exit 0, Critical 0 / High 0 (15 moderate toolchain advisories) |
| Tracked-file secret scan | PASS — 780 tracked files, 779 scanned; only `.env.example` is tracked in the `.env*` name family; one AWS-key-shaped **documentation example** (path and category only, value never printed) and no live credential |
| Release gate | CLOSED — opens only when a **fourteenth** independent review returns READY (Critical 0, High 0) |

## Evidence (2026-11-23, thirteenth independent security review)

| Check | Result |
|---|---|
| Thirteenth independent security review | **NOT READY — Critical 0, High 5, Medium 2, Low 0** against the closure tree `11065e4` (checkout `d2a7cda`, baseline `08ab9ef`); the reviewer's own artifact is `.ai/SECURITY-REVIEW-13.md` and the findings are in `.ai/SECURITY-STATUS.md` |
| Reviewer's own re-runs | PASS — the recovered fourth- through twelfth-review assertions 259/259, the pre-closure eleventh-review harnesses failing exactly as expected (12 failed + 5 passed, 2 failed + 7 passed), the new equivalent-path writer / verifier / Chromium harness 17/17 and the new equivalent-path route harness 7/7 — the five High root causes each reached the writer and opened a pull request |
| Reviewer's gate suite | PASS — source-only typecheck 0, lint 0, vitest 53 files / 829/829, coverage 67.15/59.74/69.83/68.81, build 0 (116 static pages), Playwright 79/79, `npm audit` Critical 0 / High 0 (15 moderate) |
| The seven findings | **13-H1** (High) — a `<base href>` changes the document base URL, so the writer analysed the wrong stylesheet; **13-H2** (High) — a computed property read (`img["al"+"t"]`) and a computed selector read (`img.matches("["+"al"+"t"+"]")`) bypass the mutation gate; **13-H3** (High) — a negated attribute value change, `:nth-child(... of ...)` and a nested negation are not modelled transitions; **13-H4** (High) — an added `href` makes an anchor focusable and the `:focus` rule takes the page over; **13-H5** (High) — `outline` is absent from the painted surface; **13-M1** — the `inset` shorthand moves the target off-screen; **13-M2** — a candidate beyond the ten-source-write budget skips the safety analysis and receives review artifacts |
| Closure scopes | CLOSED — (1) destination CSS (`be81d02`): the transition semantics, the focusability comparison, the outline paint geometry and the inset shorthands; (2) repository runtime (`be81d02`): the document base URL, the computed state reads and the safety order against the source budget |
| Release gate | CLOSED — opens only when a **fourteenth** independent review returns READY (Critical 0, High 0) |

## Evidence (2026-11-23, twelfth-review closure)

| Check | Result |
|---|---|
| Twelfth-review closure | PASS — all nine findings (12-H1…12-H6, 12-M1…12-M3) fixed at their root cause in `11065e4`; the dispositions are in `.ai/SECURITY-STATUS.md` and the reviewer's own artifact is `.ai/SECURITY-REVIEW-12.md` |
| Permanent regressions | PASS — 30 new tests (the built attribute name, the unresolvable attribute name, `hasAttributes()`, the script `src` carrier, the script target outside the repository, the remediation-introduced element, the `:is()` / `:where()` / `:not()` arguments, the removed class, the added `tabindex`, the painted surface of a non-positioned element, the positive offsets and margins, the introduced URI attribute, the nested `hidden` element); the shipped suites are 107 (`css-context.test.ts`) and 78 (`github.test.ts`) tests |
| Twelfth-review closure matrix (temporary) | PASS — 26/26: the nine findings are blocked in the unsafe direction (0 fixes, 0 writes, non-null destination harm or `validation:false`) and the benign twins stay allowed. The file was deleted after the run |
| Twelfth-review real-route closure harness (temporary) | PASS — 8/8: seven route refusals (`400`, no branch, no write, no pull request) and the benign image-alt fix still opens a pull request. The file was deleted after the run |
| Prior payload matrices (recovered) | PASS — the eleventh-review closure matrix 37/37, the ninth-review closure matrix 42/42, the tenth-review closure matrix 19/19, the eleventh-review route matrix 9/9 and the prior / legitimate matrix 118/118 |
| `npx vitest run --coverage` | PASS — 53 shipped files, 829/829 tests (was 53/799) |
| Coverage | PASS — statements 67.15% (threshold 55) · branches 59.74% (50) · functions 69.83% (58) · lines 68.81% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed |
| `npm audit --audit-level=high` | PASS — Critical 0 / High 0 (15 moderate, dev toolchain) |
| Strix autonomous pentest | **NOT RUN** — every configured provider refuses the run (quota / EOL model / no credits); no Strix result is claimed for this cycle |
| Thirteenth independent security review | PENDING — the release gate opens only on READY (Critical 0, High 0) |

## Evidence (2026-11-23, twelfth independent security review)

| Check | Result |
|---|---|
| Twelfth independent security review | **NOT READY — Critical 0, High 6, Medium 3, Low 0** against the closure tree `d429c6b` (checkout `2dce09d`, baseline `08ab9ef`); the reviewer's own artifact is `.ai/SECURITY-REVIEW-12.md` and the findings are in `.ai/SECURITY-STATUS.md` |
| Reviewer's own re-runs | PASS — the eleventh-review closure matrix 37/37, the eleventh-review route matrix 9/9, the tenth-review and ninth-review closure matrices 61/61, the prior / legitimate matrix 118/118, the new equivalent-path writer / verifier / Chromium harness 4/4 (twelve candidate rows) and the route / audit harness 12/12 — the dynamic state read, the functional pseudo-class and the nonstandard script extension each returned `200 success:true` and opened a pull request |
| Reviewer's gate suite | PASS — source-only typecheck 0, lint 0, vitest 53 files / 799/799, coverage 66.59/59.2/69.02/68.3, build 0 (116 pages), Playwright 79/79, `npm audit` Critical 0 / High 0 (15 moderate) |
| The nine findings | **12-H1** (High) — a runtime attribute read whose name the script builds (`'a'+'lt'`) or cannot resolve, and the standard `hasAttributes()`, are not state reads; **12-H2** (High) — the arguments of `:is()` / `:where()` / `:not()` are opaque and a **removed** class does not activate a rule; **12-H3** (High) — an added `tabindex` is not a focusability transition; **12-H4** (High) — the painted surface is composed for positioned elements only, so a scaled non-positioned element may cover the viewport; **12-H5** (High) — a `<script src>` target is never followed into the tree, so a `.php` carrier is invisible; **12-H6** (High) — the runtime gate correlates only with the original target's id and the first element's attributes; **12-M1** — a large **positive** offset or margin is not off-screen; **12-M2** — a remediation may introduce a same-origin destination the original element does not have; **12-M3** — only the first tag of a replacement is judged, so a nested `hidden` element passes |
| Closure scopes | CLOSED — (1) destination CSS: the functional pseudo-classes, the removal semantics, the focusability transition and the painted surface; (2) repository runtime: the attribute-name resolution, the script-carrier discovery and the remediation-introduced elements; (3) validator: the URI preservation and the nested hiding |
| Release gate | CLOSED — opens only when a **thirteenth** independent review returns READY (Critical 0, High 0) |

## Evidence (2026-11-23, eleventh-review closure)

| Check | Result |
|---|---|
| Eleventh-review closure | PASS — all six findings (11-H1, 11-H2, 11-M1, 11-M2, 11-M3) fixed at their root cause in `d429c6b`; the dispositions are in `.ai/SECURITY-STATUS.md` and the reviewer's own artifact is `.ai/SECURITY-REVIEW-11.md` |
| Permanent regressions | PASS — 29 new tests (the event-handler carrier, the three generic attribute reads, the attribute iteration, the unreadable handler, the logical padding and border longhands, `zoom`, the unconstrained scale, the aspect ratio, the box shadow, the zero cap with clipping, the inherited custom property and the animation timing); the shipped suites are 92 (`css-context.test.ts`) and 70 (`github.test.ts`) tests |
| Eleventh-review closure matrix | PASS — 1 file, 46/46 assertions: the 13 new reproductions are blocked in the unsafe direction (0 fixes, 0 writes, non-null destination harm), the benign twins stay allowed, and the route refuses the inline-handler and the zoom case with `400` and no branch, no write and no pull request. The file was deleted after the run |
| Prior payload matrices | PASS — the tenth-review closure matrix 19/19, the ninth-review closure matrix 42/42 and the prior / legitimate matrix 118/118 (recovered from the reviewer's own harnesses). The files were deleted after the run |
| Harness correction (not a product change) | The first run failed on one benign twin that made the rule **activated** by the fix; the twin was corrected to the shape that tests the resource check. No shipped source changed for it |
| `npx vitest run --coverage` | PASS — 53 shipped files, 799/799 tests (was 53/770) |
| Coverage | PASS — statements 66.59% (threshold 55) · branches 59.2% (50) · functions 69.02% (58) · lines 68.3% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed (4.4 min) |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev toolchain) |
| Twelfth independent security review | PENDING — the release gate opens only on READY (Critical 0, High 0) |

## Evidence (2026-11-23, eleventh independent security review)

| Check | Result |
|---|---|
| Eleventh independent security review | **NOT READY — Critical 0, High 3, Medium 3, Low 0** against the closure tree `7ec51ee` (checkout `0df2299`, baseline `08ab9ef`); the reviewer's own artifact is `.ai/SECURITY-REVIEW-11.md` and the findings are in `.ai/SECURITY-STATUS.md` |
| Reviewer's own re-runs | PASS — the tenth-review closure matrix 19/19, the ninth-review closure matrix 42/42, the prior / legitimate matrix 118/118 (one harness-only confidence expectation corrected — not a product change), the new equivalent-path writer / verifier / Chromium harness 17/17, the remaining-equivalent probe 1/1, the real-route / audit harness 9/9 and the shipped create-PR route regressions 16/16 |
| Reviewer's gate suite | PASS — source-only typecheck 0, lint 0, vitest 53 files / 770/770, coverage 65.35/57.52/67.96/67.05, build 0, Playwright 79/79, `npm audit` Critical 0 / High 0 (15 moderate) |
| The six findings | **11-H1** (High) — the event-handler attributes of repository HTML are runtime carriers the scanner never read, and `getAttributeNames()` / `getAttributeNode()` / `attributes.getNamedItem()` are not state reads; **11-H2** (High) — the logical padding longhands, `zoom`, an unconstrained `scale`, `aspect-ratio` and `box-shadow` bypass the painted-surface model; **11-M1** — a zero `max-height` / `max-width` with a clipping overflow removes the painted control; **11-M2** — a `var(--pixel)` reference hides the `url(...)` from the resource check and the inherited `:root` definition is missing; **11-M3** — the animation delay, the negative delay of a paused timeline and the fill mode decide the frame the customer sees |
| Closure scopes | CLOSED — (1) destination CSS: the painted surface, the clipping, the custom-property resource resolution and the animation timing; (2) repository runtime: the inline event handlers and the generic attribute state reads |
| Release gate | CLOSED — opens only when a **twelfth** independent review returns READY (Critical 0, High 0) |

## Evidence (2026-11-23, tenth-review closure)

| Check | Result |
|---|---|
| Tenth-review closure | PASS — all eight findings (10-H1, 10-H2, 10-H3, 10-H4, 10-M1, 10-M2, 10-M3, 10-M4) fixed at their root cause; the dispositions are in `.ai/SECURITY-STATUS.md` and the reviewer's own artifact is `.ai/SECURITY-REVIEW-10.md` |
| Permanent regressions | PASS — every reproduction of the tenth review has a shipped regression: the inline `<script>` carrier, the DOM property getter, the escaped attribute name, the painted box (scale, border, padding), the focus activation of a sibling rule, the focus-activated customer-side request, the paused animation, the plan/apply split (refused / review / applied), the intent record before the branch, the no-branch-no-PR refusal and the degraded closing record |
| Temporary reviewer-payload matrix | PASS — 1 file, 19/19 assertions: the nine unsafe reproductions are blocked in the unsafe direction (0 fixes, 0 writes), and the ten legitimate behaviour groups still pass. The file was deleted after the run |
| `npx vitest run --coverage` | PASS — 53 shipped files, 770/770 tests (was 53/750) |
| Coverage | PASS — statements 65.35% (threshold 55) · branches 57.52% (50) · functions 67.96% (58) · lines 67.05% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed (4.4 min) |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev toolchain) |
| Eleventh independent security review | PENDING — the release gate opens only on READY (Critical 0, High 0) |

## Evidence (2026-11-23, tenth review)

| Check | Result |
|---|---|
| Tenth independent security review | **NOT READY — Critical 0, High 4, Medium 4, Low 0** against the closure tree `d1cabd6` (checkout `78ec751`, baseline `08ab9ef`); the reviewer's own artifact is `.ai/SECURITY-REVIEW-10.md` and the findings are in `.ai/SECURITY-STATUS.md` |
| Reviewer's own re-runs | PASS — the ninth-review closure matrix 42/42, the prior / legitimate matrix 118/118, the ninth-review candidate probe 15/15, the new equivalent-path probe 9/9 unsafe results reproduced |
| Reviewer's gate suite | PASS — build 0, source-only typecheck 0, lint 0, vitest 750/750, Playwright 79/79, `npm audit` Critical 0 / High 0 (15 moderate) |
| Closure scopes | CLOSED — (1) destination CSS: the selector escape, the painted-box geometry, the focus activation and the animation play state; (2) repository runtime: the inline `<script>` carrier and the DOM property getter; (3) route + audit: the decision before the first repository mutation and the durable audit intent |
| Release gate | CLOSED — opens only when a fresh independent review returns READY (Critical 0, High 0) |

## Evidence (2026-11-23, ninth-review closure)

| Check | Result |
|---|---|
| Ninth-review closure | PASS — all six findings (9-H1, 9-H2, 9-H3, 9-M1, 9-M2, 9-M3) fixed at their root cause; the dispositions are in `.ai/SECURITY-STATUS.md` and the reviewer's own artifact is `.ai/SECURITY-REVIEW-9.md` |
| Permanent regressions | PASS — every reproduction of the ninth review has a shipped regression: the logical inset longhands, the fixed-pixel / viewport / font-relative size above the viewport, the sibling combinator the fix activates, the repository resource the fix activates, the transparent repository colour, the logical margin, the negative positional offset, the single zero dimension, `display:contents`, the reversed animation, the conditional class and inline-style mutation, the mutation through a tag selector, the sibling activated by the added attribute, the service worker, the CSS-in-JS library, the mutation by id, and the remote / list / changed / dropped / duplicate `attributionsrc` |
| Temporary reviewer-payload re-run | PASS — 1 file, 42/42 assertions: 26 writer-level unsafe payloads of the fourth to the ninth reviews and the validator-level payloads are blocked in the unsafe direction (0 fixes, 0 writes), and the 12 legitimate behaviour groups still pass. The file was deleted after the run |
| `npx vitest run --coverage` | PASS — 53 shipped files, 750/750 tests (was 53/724) |
| Coverage | PASS — statements 65.22% (threshold 55) · branches 57.50% (50) · functions 67.04% (58) · lines 66.70% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed (4.6 min) |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev toolchain) |
| Tenth independent security review | PENDING — the release gate opens only on READY (Critical 0, High 0) |

## Evidence (2026-11-22, eighth-review closure)

| Check | Result |
|---|---|
| Eighth-review closure | PASS — all six findings (8-H1, 8-H2, 8-H3, 8-H4, 8-M1, 8-M2) fixed at their root cause; the dispositions are in `.ai/SECURITY-STATUS.md` and the reviewer's own artifact is `.ai/SECURITY-REVIEW-8.md` |
| Permanent regressions | PASS — every reproduction of the eighth review has a shipped regression: the `inset` shorthand and the logical sizing properties, the composition with the remediation's own inline style and the custom properties it defines, the JSX `className` hook (both the validation guard and the CSS descriptor), the runtime-created repository style, the duplicate URI attributes and the `ping` list, the modern colour alpha, the zero-size target, the clipped text, the negative margin, the viewport translation and the opacity animation endpoint |
| Temporary reviewer-payload re-run | PASS — 1 file, 78/78 assertions: the 12 fourth-review payloads, the 6 fifth-review payloads, the 8 sixth-review payloads, the 8 seventh-review reproductions and the eighth-review reproductions are blocked in the unsafe direction, and the 9 legitimate behaviours still pass. The file was deleted after the run |
| `npx vitest run --coverage` | PASS — 53 shipped files, 724/724 tests (was 53/703) |
| Coverage | PASS — statements 64.83% (threshold 55) · branches 56.97% (50) · functions 66.58% (58) · lines 66.32% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev toolchain) |
| `gbrain context_pack` | PASS — the connection answered; it holds no cards, facts or open threads for AccessGuard, so there was no stored project context to load |
| Ninth independent security review | PENDING — the release gate opens only on READY (Critical 0, High 0) |

## Evidence (2026-11-22, seventh-review closure)

| Check | Result |
|---|---|
| Seventh-review closure | PASS — all seven findings (7-H1, 7-H2, 7-H3, 7-M1…7-M4) fixed at their root cause; the dispositions are in `.ai/SECURITY-STATUS.md` and the reviewer's own artifact is `.ai/SECURITY-REVIEW-7.md` |
| Permanent regressions | PASS — every reproduction of the seventh review has a shipped regression: the CSS priority suffix, the logical viewport units, the uncomputable value, the relational selector, the dynamic style carrier, the three remote-URL spellings, the navigation mutation, the eight hiding styles, the live-element carriers, the dropped media source and the frameset |
| Temporary reviewer-payload re-run | PASS — 1 file, 39/39 assertions: the 12 fourth-review payloads, the 6 fifth-review payloads, the 8 sixth-review payloads and the 8 seventh-review reproductions are blocked in the unsafe direction, and the 9 legitimate behaviours still pass. The file was deleted after the run |
| `npx vitest run --coverage` | PASS — 53 shipped files, 703/703 tests (was 53/667) |
| Coverage | PASS — statements 64.94% (threshold 55) · branches 56.85% (50) · functions 66.88% (58) · lines 66.50% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev toolchain) |
| Eighth independent security review | PENDING — the release gate opens only on READY (Critical 0, High 0) |

## Evidence (2026-11-22, sixth-review closure)

| Check | Result |
|---|---|
| Sixth-review closure | PASS — all eight findings (6-H1, 6-H2, 6-M1…6-M6) fixed at their root cause; the dispositions are in `.ai/SECURITY-STATUS.md` |
| Permanent regressions | PASS — every reproduction of the sixth review has a shipped regression: destination CSS (a preprocessor stylesheet, a linked stylesheet, ten browser-valid rule variants), the comment opener, the self-hiding element, transparent text, the new remote URL, the three non-live contexts and the ambiguous blob |
| `npx vitest run --coverage` | PASS — 53 shipped files, 667/667 tests (was 53/634) |
| Coverage | PASS — statements 64.80% (threshold 55) · branches 56.21% (50) · functions 66.80% (58) · lines 66.34% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev toolchain) |
| Seventh independent security review | PENDING — the release gate opens only on READY (Critical 0, High 0) |

## Evidence (2026-11-22, fifth-review closure)

| Check | Result |
|---|---|
| Fifth-review closure | PASS — all six findings (5-H1, 5-H2, 5-M1, 5-M2, 5-M3, 5-M4) fixed at the root cause; the dispositions are in `.ai/SECURITY-STATUS.md` |
| Exact-payload reproduction suite (temporary) | PASS — 1 file, 8/8 tests: the six fifth-review payloads and the twelve fourth-review payloads are blocked, and the legitimate fix still lands. The file was deleted after the run |
| `npx vitest run --coverage` | PASS — 53 shipped files, 634/634 tests |
| Coverage | PASS — statements 63.83% (threshold 55) · branches 55.16% (50) · functions 66.04% (58) · lines 65.29% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev toolchain) |
| Sixth independent security review | PENDING — the release gate opens only on READY (Critical 0, High 0) |

## Evidence (2026-11-22, fifth independent security review)

| Check | Result |
|---|---|
| Fifth independent V23 security review | **NOT READY — Critical 0, High 2, Medium 4, Low 0**; six working reproductions are in `.ai/SECURITY-STATUS.md` |
| Fourth-review payload re-run | PASS — 12/12 literal payloads blocked; `<!-->` and `java&NewLine;script:` variants are also blocked |
| Fifth-review temporary suites | PASS as evidence harnesses — 36/36 broad assertions and 7/7 focused reproductions; every temporary test was deleted |
| `npx vitest run` (with review file) | PASS — 53 files, 641/641 tests |
| `npx vitest run` (after review-file deletion) | PASS — 52 shipped files, 605/605 tests |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0 |
| `npm run build` | PASS — exit 0 (Next standalone build, 116 static pages) |
| `npm audit --audit-level=high --json` | PASS — Critical 0, High 0, Moderate 15, Low 0 |
| Tracked-file secret scan | PASS — 771 tracked text files; no live secret; one key-shaped documentation example was redacted during classification |
| Shipped-source cleanup | PASS — `git diff --name-only -- src` and the untracked-file list were empty after temporary-test deletion |

## Evidence (2026-11-22, fourth-review closure)

| Check | Result |
|---|---|
| Fourth independent V23 security review | **NOT READY — Critical 0, High 3, Medium 9, Low 0**; every finding is now fixed, see the disposition table in `.ai/SECURITY-STATUS.md` |
| Reviewer exploit reproductions (re-run on the fixed tree) | PASS — 12/12 blocked: named-entity CSS overlay, `--!>` comment breakout, JSX/TS source injection, GFM bare-URL autolink, `plaintext`, the resource loaders, `encoding:none`, the omitted `.mjs` scan, `opacity:0`, the label reduction, the swapped remediations, the commented element |
| `npx vitest run --coverage` | PASS — 52 shipped files, 605/605 tests |
| Coverage | PASS — statements 62.88% (threshold 55) · branches 54.46% (50) · functions 64.91% (58) · lines 64.26% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0 |
| `npm run build` | PASS — exit 0 (Next standalone build, 116 static pages) |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed (4.4 min) |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev-toolchain) |
| GitHub Markdown API (bare-URL evidence) | PASS — the escaped URL renders as plain text; the control renders as a live link |
| Docker image gate | **PASS — run 44955598091 completed ✅** on `8afc55a`; the Trivy step passes with `limit-severities-for-sarif: true` and the pinned scanner `v0.76.2` |
| Temporary-file cleanup | PASS — the temporary reproduction file was deleted; the shipped suite runs 52 files |

## Evidence (2026-11-22, fourth independent security review)

| Check | Result |
|---|---|
| Fourth independent V23 security review | **NOT READY — Critical 0, High 3, Medium 9, Low 0**; working outputs and attempted variants are in `.ai/SECURITY-STATUS.md` |
| Review exploit reproductions | **FAIL** — 4-H1 named-entity CSS overlay, 4-H2 `--!>` comment breakout, 4-H3 JSX/TS source injection and nine Medium equivalent paths reproduce |
| Temporary review suite | PASS as an evidence harness — 2 files, 32/32 tests; the unsafe cases assert the exploit and the exact cases assert the write is blocked |
| `npx vitest run` (with review files) | PASS — 54 files, 612/612 tests |
| `npx vitest run` (after review-file deletion) | PASS — 52 shipped files, 580/580 tests |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0 |
| `npm run build` | PASS — exit 0 (Next standalone build, 116 static pages) |
| `npm audit --audit-level=high --json` | PASS — Critical 0, High 0, Moderate 15, Low 0 |
| Temporary-file cleanup | PASS — both `tmp-security-review.test.ts` files deleted; no source change remained |

## Evidence (2026-11-22, third review closure + CI repair)

| Check | Result |
|---|---|
| Third independent V23 security review | **NOT READY — Critical 0, High 2, Medium 5**; every finding is now fixed, see the disposition table in `.ai/SECURITY-STATUS.md` |
| Reviewer exploit reproductions (re-run on the fixed tree) | PASS — 5/5 blocked: CSS-escaped overlay, frame/frameset, Markdown-injected selector, `aria-hidden` text deletion, wrong duplicate occurrence |
| `npx vitest run` | PASS — 52 files, 580 tests, 0 failed |
| `npx vitest run --coverage` | PASS — statements 62.29% / branches 53.55% / functions 64.43% / lines 63.71% (CI thresholds 55/50/58/57) |
| `npm run lint` | PASS — exit 0 |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev-toolchain) |
| Docker image gate | The image carries no HIGH/CRITICAL finding; the job failed because `trivy-action` drops the severity filter in SARIF mode — fixed with `limit-severities-for-sarif: true` and a pinned scanner (`v0.76.2`). The proof run is in `.ai/DEPLOYMENT.md` |

## Evidence (2026-11-22, third independent security review)

| Check | Result |
|---|---|
| Third independent V23 security review | **NOT READY — Critical 0, High 2, Medium 5**; findings and working outputs are in `.ai/SECURITY-STATUS.md` |
| `npx vitest run` | PASS — 51 files, 566 tests, 0 failed |
| `npm run lint` | PASS — exit 0 |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| Production build + Docker image build | PASS — exit 0; synthetic build sentinel absent from artifacts and image history; temporary image deleted |
| `npm audit --json` | Critical 0 · High 0 · Moderate 15 (dev toolchain) |
| Reviewer exploit reproductions | **FAIL** — escaped CSS overlay and active frame/frameset both verified and reached the repository writer |

## Evidence (2026-11-22, V23 re-review closure)

| Check | Result |
|---|---|
| `npx tsc -p tsconfig.check.json --noEmit` | PASS (exit 0) |
| `npm run lint` | PASS (0 errors) |
| `npx vitest run` | PASS — 51 files, 566 tests, 0 failed (was 50/523) |
| `npx vitest run --coverage` | PASS — statements 62.07% / branches 53.25% / functions 64.19% / lines 63.47% (CI thresholds 55/50/58/57) |
| `npm run build` | PASS (exit 0) — Next standalone build |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev-toolchain) |
| Reviewer exploit reproductions (6) | PASS — every reproduction of the re-review is blocked: handler in the scanned page, `/onerror=`, entity encoded `javascript:`, overlay style, wrong element by class, hidden text |
| Browser isolation (real Chromium) | PASS — no HTTP request and no WebSocket reaches a local server during verification |
| Independent security re-review of the hardening | NOT READY (High 2, Medium 7, Low 1) → **all findings closed** and covered by regression tests |
| Strix autonomous pentest | BLOCKED — every configured provider refused the run (quota / EOL model / no credits). No Strix evidence exists for this cycle |

## Evidence (2026-11-21, V23 verified-fix engine + security hardening)

| Check | Result |
|---|---|
| `npx tsc -p tsconfig.check.json --noEmit` | PASS (exit 0) |
| `npm run lint` | PASS (0 errors) |
| `npx vitest run` | PASS — 50 files, 523 tests, 0 failed (was 45/410) |
| `npx vitest run --coverage` | PASS — statements 60.54% / branches 52.05% / functions 63.43% / lines 61.84% (CI thresholds 55/50/58/57) |
| `npm run build` | PASS (exit 0) — Next standalone build |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev-toolchain) |
| axe verification in a real browser (vitest) | PASS — verified / failed / rejected cases behave as specified |
| Independent QA review of the V23 diff | 3 reproduced P0 defects → all fixed and covered by tests |
| Independent security review of the V23 diff | NOT READY (High 3) → all High/Medium/Low findings fixed and covered by tests |
| Strix autonomous pentest | BLOCKED — every configured provider refused the run (quota / EOL model / no credits). No Strix evidence exists for this cycle |

## Evidence (2026-11-21, accessibility gate cycle)

| Check | Result |
|---|---|
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed (was 70/9) |
| axe `color-contrast` on 13 routes × 2 themes | PASS — severity + emerald tokens retuned for AA text |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS (exit 0) |
| `npm run lint` | PASS (0 errors) |
| `npx vitest run` | PASS — 45 files, 410 tests, 0 failed |
| `npm run build` | PASS (exit 0) — Next 16.4.6, standalone build |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev-toolchain) |

## Evidence (2026-11-21, authenticated scans cycle)

| Check | Result |
|---|---|
| `npx tsc -p tsconfig.check.json --noEmit` | PASS (exit 0) |
| `npm run lint` | PASS (0 errors) |
| `npx vitest run` | PASS — 44 files, 407 tests, 0 failed |
| `npm run build` | PASS (exit 0) — Next 16.4.6, 116/116 static pages, standalone build |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev-toolchain) |
| `npx prisma validate` / `generate` | PASS |
| `prisma migrate deploy` on a fresh database | PASS — all 13 migrations, `migrate diff` = "No difference detected" |
| `prisma migrate diff` dev DB → `schema.prisma` | PASS — zero drift |
| `node scripts/audit-actions-diff.mjs` | PASS — MISSING_LABELS=0 (TOTAL_ACTIONS=65) |
| i18n key parity en/hi | PASS — 1500 keys, 0 missing |
| OpenAPI parity | PASS — 112 paths, 70 schemas, every route handler covered |

## P0 Tasks Completed

1. ✅ **Scanner truth** — Local axe-core 4.12.1, WCAG 2.2 tags (`wcag22aa`), mobile+desktop viewports, no asset blocking, networkidle wait, accurate selectors (`elementPath` JSON), `help` not `helpUrl`, removed `--disable-web-security`
2. ✅ **Violation lifecycle** — Fingerprint (SHA256), reconciliation (new/persisting/fixed/regressed), `fixedAt` on rescan, `elementPath`/`helpUrl`/`fingerprint` fields in DB
3. ✅ **Migrations** — SQL files created for `ScimGroup`, `CookieConsent`, `ManualCheck`, `Violation.fingerprint`, `pagesQuota` default; applied via `prisma migrate deploy`
4. ✅ **Crawler v1** — Sitemap discovery + BFS, per-page axe scans, quota per page, mergeViolations dedupe, uses `project.crawlConfig`
5. ✅ **Customer API keys** — `ApiKey` model (hash, prefix, scopes, lastUsedAt, revoke), `/api/v1/apikeys` CRUD, `/api/v1/scans`, `/api/v1/reports/vpat` with Bearer/ApiKey auth
6. ✅ **GitHub Action repair** — Points to `/api/v1/scans` + `/api/v1/reports/vpat`; `api-url`/`url` inputs; `dist/index.js` rebuilt
7. ✅ **Trial** — `trial_period_days: 14` added to Stripe checkout session + subscription creation
8. ✅ **OpenAPI v1 docs** — `/api/v1/*` routes documented with `apiKeyAuth` security scheme

## Open Items (P1+)

| Area | Task |
|---|---|
| Regression detection | new / fixed / persisting vs previous scan |
| Alerts | email + Slack + signed webhook (new critical only) |
| Pricing v2 | pages **monitored** meter; smart scheduling (daily critical, weekly long tail); overage |
| Page inventory UI | coverage, per-page status, top fixes |
| Risk score | transparent severity/trend or documented methodology |
| Manual checks v1 | guided scripts, evidence upload, tester role |
| Agency workspace | client groups, white-label report branding, bulk scan |
| VPAT/ACR v2 | WCAG 2.2 AA + EN 301 549 + Section 508, per-criterion remarks |
| Onboarding | URL → scan → top 3 fixes in <5 min; sample report without signup |
| Authenticated scans | cookie / header / login script — **done** (encrypted at rest, admin-gated) |
| Design partners | 3 partners + 2 case studies |
| Strix security scan | CI integration, PR gate |
| E2E tests | Playwright critical paths |

## Commits (this session)

- `049c765` vol: scanner - P0: local axe-core, WCAG 2.2, mobile viewport, no asset blocking; violation lifecycle fingerprint+reconciliation; migrations
- `0db9428` vol: crawler - P0: sitemap+BFS discovery, per-page axe scans, quota per page, mergeViolations dedupe; scan-executor uses project.crawlConfig
- `07db28b` vol: api-keys - P0: ApiKey model + create/revoke/list endpoints; /api/v1/scans + /api/v1/reports/vpat with API key auth; VPAT generator extracted to lib
- `ab2c04d` vol: github-action - P0: repaired endpoints to /api/v1/scans + /api/v1/reports/vpat; added api-url/url inputs; rebuilt dist/index.js
- `98a379f` vol: trial - P0: added trial_period_days=14 to Stripe checkout session and subscription creation
- `2b577ea` vol: green-baseline - P0 complete: scanner truth, violation lifecycle, migrations, crawler v1, API keys, GitHub Action, trial, OpenAPI v1 docs; build passes, typecheck clean