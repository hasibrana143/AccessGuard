# AccessGuard — Test Status

Last run: 2026-11-26 (eighteenth-review closure)

## Eighteenth-review closure evidence (2026-11-26)

The closure of the eighteenth review's three findings ships in `b16dafd` (source and
tests) with 20 permanent regressions — 16 in `src/lib/__tests__/github.test.ts` and 14
in `src/lib/__tests__/css-context.test.ts`, 10 harmful and 10 benign-boundary cases.

The fails-before proof, run by the CTO on the shipped tree:

| Reverted source | Suite | Result |
|---|---|---|
| `src/lib/github.ts` | `github.test.ts -t "18-"` | **12 failed**, 4 passed — the four that pass are the benign twins |
| `src/lib/css-context.ts` | `css-context.test.ts -t "eighteenth"` | **6 failed**, 4 passed — the four that pass are the benign twins |
| `src/lib/css-context.ts` | `github.test.ts -t "18-M1"` | **2 failed**, 2 passed — the two that pass are the benign twins |

The gate suite that backed the push, run by the CTO on the shipped tree:

| Gate | Command | Exit code | Evidence |
|---|---:|---:|---|
| Source-only typecheck | `npx tsc -p tsconfig.check.json --noEmit` | **0** | no diagnostics |
| Lint | `npm run lint` | **0** | eslint reported no error and no warning |
| Unit suite + coverage gate | `npx vitest run --coverage` | **0** | 53 test files, **1017 tests passed**, 0 failed; coverage 70.84 % statements / 63.37 % branches / 74.1 % functions / 73.08 % lines against the 55 / 50 / 58 / 57 thresholds |
| Standalone build | `npm run build` | **0** | Next.js 16.4.6, compiled in 7.9 s, TypeScript in 9.8 s, **116 static pages** generated, the `public` and `.next/static` copy step completed |
| Chromium E2E | `npx playwright test --project=chromium` | **0** | **79 passed** (3.9 min), 0 failed, 0 skipped |
| Dependency audit | `npm audit --audit-level=high` | **0** | **0 high / 0 critical**; 15 moderate advisories remain, all in the development tooling chain (`vitest` / `@vitest/mocker`, `fast-copy`, `glob` / `minimatch` through `@sentry/nextjs` and the ESLint parser) — none in the shipped runtime path |

No Strix result is claimed for this cycle: every configured provider refuses the run
(quota / EOL model / no credits).

## Eighteenth independent security review evidence (2026-11-26)

The reviewer's own gate suite on the reviewed tree (`53e2af0`, identical source to `24db2a1`): source-only typecheck 0 · lint 0 errors · vitest 53 files / **987 passed** · coverage 70.4 / 63.13 / 73.41 / 72.53 against 55 / 50 / 58 / 57 · build 0 (116 static pages) · Playwright chromium **79 passed** · `npm audit` 0 high / 0 critical (15 moderate, dev-tooling only).

The reviewer's own matrices: the recovered prior matrices **209/209**, the recovered 118-assertion matrix **118/118**, the eighteenth-review matrix **39 cases (12 failed, 27 passed)** and an **11-case Chromium proof harness** (all passed). The seventeenth closure's six spellings and the 17-M1 / 16-M2 / 16-M3 font cases were verified closed. No Strix result is claimed — the run was skipped.

## Current verification (2026-11-26 — seventeenth-review closure)

| Check | Result |
|---|---|
| Git state | Base `a02ba63` equals `origin/main`; the closure is committed on top of it — the fix `5e30641`, the docs `4f0a69f` |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0, no diagnostics |
| `npm run lint` | PASS — exit 0, no ESLint errors |
| `npx vitest run --coverage` | PASS — 53 files, 987/987 tests (15 new seventeenth-review regressions) |
| Coverage | PASS — statements 70.4% (threshold 55) · branches 63.12% (50) · functions 73.41% (58) · lines 72.53% (57) |
| `npm run build` | PASS — exit 0 (Next standalone build, 116 static pages) |
| `npx playwright test --project=chromium` | PASS — 79 tests, 79 passed, 0 failed, 0 flaky (4.1m) |
| `npm audit --audit-level=high --json` | PASS — exit 0, Critical 0 / High 0 (15 moderate advisories) |
| Fails-before proof | PASS — with only the two source fixes reverted and the new regressions kept, **10 of the 15 new tests fail** (the six harmful mutation spellings, the dynamic mutation form, the computed method name, the unreadable method name and the duplicate font family) and the five benign-boundary tests pass; with the fixes restored all 15 pass |
| Seventeenth-review closure | `src/lib/github.ts` (the runtime mutation reader), `src/lib/css-context.ts` (the `@font-face` reader), `src/lib/__tests__/github.test.ts` (11 regressions), `src/lib/__tests__/css-context.test.ts` (4 regressions) |
| CI on `53e2af0` | PASS — CI (45810724743) and Docker (45810724518, multi-arch build + Trivy HIGH/CRITICAL filter + SBOM attest) succeeded; the Deploy workflow (45810724689) and the AccessGuard Scan workflow (45810724600) completed with their documented secret-gated skips, so no deployment and no self-scan are claimed |

## Current HEAD verification

| Check | Result |
|---|---|
| Git state | PASS — `main` is at `a02ba63` and matches `origin/main`; the only working-tree item is the pre-existing untracked `.playwright-mcp/` directory |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0, no diagnostics |
| `npm run lint` | PASS — exit 0, no ESLint errors |
| `npx vitest run --coverage` | PASS — 53 files, 972/972 tests |
| Coverage | PASS — statements 70.3% (threshold 55) · branches 63.09% (50) · functions 73.36% (58) · lines 72.38% (57) |
| `npm run build` | PASS — exit 0 (Next standalone build, 116 static pages) |
| `npx playwright test --project=chromium` | PASS with one retry — 79 tests, 78 passed, 1 flaky, 0 failed (the authenticated landing CTA passed on the retry) |
| `npm audit --audit-level=high --json` | PASS — exit 0, Critical 0 / High 0 (15 moderate advisories) |
| CI on `a02ba63` | PASS — CI, Docker, AccessGuard Scan and Deploy workflows completed successfully |
| Production deployment | NOT CLAIMED — the Deploy workflow completed, but every Vercel build/deploy step was skipped because the Vercel credentials are absent |
| Environment recovery | The first unit run failed only because Docker Desktop was stopped (`localhost:5432` unavailable). Starting the local Postgres/Redis containers and rerunning `npm run db:seed` restored the documented dev fixture; the rerun passed 972/972 |
| `gbrain context_pack` | PASS — the connection answered; it holds no cards, facts or open threads for AccessGuard, so there was no stored project context to load |

## Sixteenth independent security review evidence

## Sixteenth independent security review evidence

| Check | Result |
|---|---|
| Sixteenth independent security review | **NOT READY — Critical 0, High 7, Medium 4, Low 0** against the closure tree `b4bd811` (checkout `9ae2a3a`, baseline `08ab9ef`); the reviewer's own artifact is `.ai/SECURITY-REVIEW-16.md` |
| Recovered fourth- through fifteenth-review payloads | PASS — the prior / legitimate matrix 118/118, the writer closure matrices 192/192 across seven files, the route matrices 24 passed with the 2 intentional pre-closure failures, plus the two pre-closure harnesses failing exactly as expected (12 failed + 5 passed, 2 failed + 7 passed) |
| New equivalent-path writer / Chromium harness | PASS — every harmful variant of the eleven findings was writable, with a Chromium geometry / computed-style / accessibility-tree / `127.0.0.1` observable |
| New equivalent-path real-route harness | PASS — the representative cases returned `200 success:true`, applied one source fix, wrote three files, opened the pull request and recorded both audit events |
| Legitimate-behaviour harness | PASS — the 35 listed behaviours stayed writable or harmless |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0, no diagnostics |
| `npm run lint` | PASS — exit 0, no ESLint errors |
| `npx vitest run --coverage` | PASS — 53 files, 939/939 tests |
| Coverage | PASS — statements 69.89% (threshold 55) · branches 62.75% (50) · functions 72.93% (58) · lines 71.78% (57) |
| `npm run build` | PASS — exit 0 (Next standalone build, 116 static pages) |
| `npx playwright test --project=chromium` | PASS with one retry — 79 tests, 78 passed, 1 flaky, 0 failed (the authenticated landing CTA passed on the retry) |
| `npm audit --audit-level=high` | PASS — exit 0, Critical 0 / High 0 (15 moderate toolchain advisories) |
| `npm audit --omit=dev --audit-level=high` | PASS — exit 0, 5 moderate transitive advisories, 0 high / 0 critical |
| Tracked-file secret scan | PASS — 786 tracked files; one AWS-key-shaped **documentation placeholder** in `.openclaw/skills/document-generate/SKILL.md` (path and category only, value never printed) and no live credential |
| Strix autonomous pentest | **NOT RUN** — every configured provider refuses the run (quota / EOL model / no credits); no Strix result is claimed for this cycle |

## Sixteenth-review closure evidence

| Check | Result |
|---|---|
| Scope A — the repository runtime reader | PASS — 21 permanent regressions in `github.test.ts` (`16-H1a`–`16-H1e`, `16-H2a`–`16-H2d`, `16-H3a`–`16-H3c`, `16-H4a`–`16-H4c`, `16-H5a`–`16-H5b`, `16-H6a`–`16-H6c`, `16-H7a`–`16-H7b`); the fails-before proof shows exactly the 14 harmful cases failing on the pre-closure tree (14 failed + 125 passed) while every benign twin passes before and after |
| Scope B — the destination CSS reader | PASS — 10 permanent regressions in `css-context.test.ts` (`16-M1a`, `16-M1b`, `16-M1c`, `16-M2a`, `16-M2b`, `16-M2c`, `16-M2d`, `16-M3a`, `16-M4a`, `16-M4b`) and 1 in `github-pr.test.ts` (`16-M1c`); the fails-before proof shows exactly the 7 harmful CSS cases failing on the pre-closure tree (7 failed + 258 passed) while every benign twin passes before and after |
| Sixteenth-review closure matrix (temporary) | PASS — 42/42: every finding is blocked in the unsafe direction (0 fixes, 0 writes) and every benign twin stays writable. The file was deleted after the run |
| Gap found by the closure matrix | FIXED — the optional **computed** member `img['dataset']?.['state']` was still open; the shared member pattern now covers the optional computed access, and the permanent regressions `16-H1d` and `16-H1e` lock it down |
| Recovered prior payload matrices | PASS — the prior / legitimate matrix 118/118 (run with `tsx`), the combined writer closure run 192/192 across seven files and the route run 24 passed with the 2 intentional pre-closure failures |
| Pre-closure eleventh-review harnesses (recovered) | FAIL **as expected** — 12 failed + 5 passed and 2 failed + 7 passed: the failures assert that the eleventh-review vulnerabilities still exist, so they confirm the closure rather than report a regression |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0, no diagnostics |
| `npm run lint` | PASS — exit 0, no ESLint errors |
| `npx vitest run --coverage` | PASS — 53 files, 972/972 tests (was 53/939) |
| Coverage | PASS — statements 70.3% (threshold 55) · branches 63.09% (50) · functions 73.36% (58) · lines 72.38% (57) |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS with one retry — 79 tests, 78 passed, 1 flaky, 0 failed |
| `npm audit --audit-level=high` | PASS — exit 0, Critical 0 / High 0 (15 moderate toolchain advisories) |
| `npm audit --omit=dev --audit-level=high` | PASS — exit 0, 5 moderate transitive advisories, 0 high / 0 critical |
| Environment note | The local dev database had lost its `default-org` seed (the API suites then answered `401`); `npm run db:seed` restored it and the suites are green. No schema, migration or production data changed |
| Strix autonomous pentest | **NOT RUN** — every configured provider refuses the run (quota / EOL model / no credits); no Strix result is claimed for this cycle |

## Fifteenth independent security review evidence

| Check | Result |
|---|---|
| Fifteenth independent security review | **NOT READY — Critical 0, High 4, Medium 5, Low 0** against the closure tree `d16797c` (checkout `2da3e00`, baseline `08ab9ef`); the reviewer's own artifact is `.ai/SECURITY-REVIEW-15.md` |
| Recovered fourth- through fourteenth-review payloads | PASS — 185/185 recovered assertions across eight matrices and route harnesses (the prior/legitimate matrix 118/118, the ninth 42/42, the tenth 19/19, the eleventh 37/37 + 9/9, the twelfth 26/26 + 8/8, the thirteenth 21/21, the fourteenth 23/23) |
| Pre-closure eleventh-review harnesses (recovered) | FAIL **as expected** — 12 failed + 5 passed and 2 failed + 7 passed: the failures assert that the eleventh-review vulnerabilities still exist, so they confirm the closure rather than report a regression |
| New equivalent-path writer / Chromium harness | 19 candidates — 17 writable, 2 controls correctly refused with 0 fixes and 0 writes, 16 harmful writable candidates with a Chromium geometry / computed-style / accessibility-tree / `127.0.0.1` observable |
| New equivalent-path real-route harness | 11/11 representative harmful cases passed — every case returned `200 success:true`, applied one source fix, created the branch and the pull request and wrote both audit events |
| New legitimate-behaviour harness | 29/29 passed |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0, no diagnostics |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npx vitest run --coverage` | PASS — 53 files, 902/902 tests |
| Coverage | PASS — statements 68.88% (threshold 55) · branches 61.78% (50) · functions 72.06% (58) · lines 70.74% (57) |
| `npm run build` | PASS — exit 0 (Next standalone build, 116 static pages) |
| `npx playwright test --project=chromium` | PASS with retries — 79 tests, 77 passed, 2 flaky, 0 failed (the dashboard axe check and the authenticated landing CTA passed on the retry) |
| `npm audit --audit-level=high` | PASS — exit 0, Critical 0 / High 0 (15 moderate toolchain advisories) |
| `npm audit --omit=dev --audit-level=high` | PASS — exit 0, 5 moderate transitive advisories, 0 high / 0 critical |
| Tracked-file secret scan | PASS — 781 tracked files; one AWS-key-shaped **documentation placeholder** in `.openclaw/skills/document-generate/SKILL.md` (path and category only, value never printed) and no live credential |
| Strix autonomous pentest | **NOT RUN** — every configured provider refuses the run (quota / EOL model / no credits); no Strix result is claimed for this cycle |

## Fifteenth-review closure evidence

| Check | Result |
|---|---|
| Fifteenth-review closure | PASS — all nine findings (15-H1…15-H4, 15-M1…15-M5) closed at their root cause in `src/lib/github.ts`, `src/lib/css-context.ts`, `src/lib/fix-validation.ts` and `src/lib/github-pr.ts`; the dispositions are in `.ai/SECURITY-STATUS.md` and the reviewer's own artifact is `.ai/SECURITY-REVIEW-15.md` |
| Permanent regressions | PASS — 37 new tests: 17 in `github.test.ts` (the prototype `.call` read, the optional call, the computed method name, the unrelated attribute read, the unresolved method name, the dataset bracket read, the `Reflect.get` dataset read, the unrelated `Reflect.get`, the introduced id on the patched target, the unreferenced introduced id, the unchanged id, the indexed `querySelectorAll` base receiver, the indexed `getElementsByTagName` base receiver, the unrelated indexed receiver and the document without a base), 12 in `css-context.test.ts` (the zero-alpha grammars, the opaque colour, the non-zero alpha, the unactivated transparent colour, the nested negation, the unrelated class removal, the changed attribute value and the `:where()` alternatives, the font-face resource, the family without a resource, the resource-free custom property and the unresolved font), 7 in `fix-validation.test.ts` (the encoded `aria-hidden`, the encoded `presentation` role, the `aria-hidden` ancestor, `inert`, the presentational ancestor, the decorative image and the hidden sibling) and 3 in `github-pr.test.ts` (the removed `autofocus`, the kept `autofocus` and the added `autofocus`) |
| Fails-before proof | PASS — the regressions fail on the pre-closure tree: 8 failures with `src/lib/github.ts` reverted, 6 with `src/lib/css-context.ts` reverted and 5 with `src/lib/fix-validation.ts` and `src/lib/github-pr.ts` reverted (19 failures in total). Every benign twin passes before and after |
| Fifteenth-review closure matrix (temporary) | PASS — 24/24 with the closure (16 failures and 8 passed on the pre-closure tree): every finding is blocked in the unsafe direction (0 fixes, 0 writes) and every benign twin stays writable. The file was deleted after the run |
| Prior payload matrices (recovered) | PASS — the prior / legitimate matrix 118/118 (run with `tsx`) and the combined closure run 209/209 across nine files (the ninth 42, the tenth 19, the eleventh 37 + 9, the twelfth 26 + 8, the thirteenth 21, the fourteenth 23 and the fifteenth 24) |
| Pre-closure eleventh-review harnesses (recovered) | FAIL **as expected** — 12 failed + 5 passed and 2 failed + 7 passed: the failures assert that the eleventh-review vulnerabilities still exist, so they confirm the closure rather than report a regression |
| `npx vitest run --coverage` | PASS — 53 files, 939/939 tests (was 53/902) |
| Coverage | PASS — statements 69.89% (threshold 55) · branches 62.75% (50) · functions 72.93% (58) · lines 71.78% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0, no diagnostics |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 tests, 0 failed |
| `npm audit --audit-level=high` | PASS — exit 0, Critical 0 / High 0 (15 moderate toolchain advisories) |
| Tracked-file secret scan | PASS — 787 tracked files; one AWS-key-shaped **documentation placeholder** in `.openclaw/skills/document-generate/SKILL.md` (path and category only, value never printed) and no live credential |
| Strix autonomous pentest | **NOT RUN** — every configured provider refuses the run (quota / EOL model / no credits); no Strix result is claimed for this cycle |

## Fourteenth-review closure evidence

| Check | Result |
|---|---|
| Fourteenth-review closure | PASS — all ten findings (14-H1…14-H4, 14-M1…14-M6) closed at their root cause in `d16797c` (the closure documentation is `1803d50`); the dispositions are in `.ai/SECURITY-STATUS.md` and the reviewer's own artifact is `.ai/SECURITY-REVIEW-14.md` |
| Permanent regressions | PASS — 49 new tests: 14 in `github.test.ts` (the `Reflect.get` read, the `Reflect.getOwnPropertyDescriptor` read, the unresolved `Reflect` name, the unrelated `Reflect` property, the entity-encoded stylesheet link, the quoted `>` stylesheet link, the ordinary stylesheet link, the unreadable stylesheet link, the runtime base mutation, the base mutation through a variable, the linked-script base mutation, the document without a base, the unchanged base, the unrelated runtime mutation), 15 in `css-context.test.ts` (the stylesheet-link analysis, the structural selector, the removed element, the inline-style resource, the `image-set` resource, the unresolved custom property, the escaped `]`, the ordinary attribute selectors, the `:link` transition, the viewport offset), 10 in `fix-validation.test.ts` (the hidden image, the decorative image, the replaced button, the unnamed button, the ARIA button, the icon button, the link text of another element), 6 in `github-pr.test.ts` (the native semantics, the focus order, the equivalent native control, the kept control among new elements) and 4 in `fix-verification.test.ts` (the patched target, the unidentified target) |
| Fails-before proof | PASS — the regressions fail on the pre-closure tree: 21 failures with `src/lib/css-context.ts` and `src/lib/github.ts` reverted (13 in `css-context.test.ts`, 8 in `github.test.ts`), 7 failures with `src/lib/fix-validation.ts` and `src/lib/github-pr.ts` reverted (5 + 2) and 2 failures with `src/lib/fix-verification.ts` reverted. The closure matrix independently failed on 14-H1a and 14-H3a before the runtime scope landed |
| Fourteenth-review closure matrix (temporary) | PASS — 23/23: the ten findings are blocked in the unsafe direction (0 fixes, 0 writes, non-null destination harm or `validation:false`) and the benign twins stay allowed. The file was deleted after the run |
| False positive found while reviewing the closure | FIXED — the element pairing compared the attributes of the original and the patched element, so an ordinary fix that keeps a child element with changed attributes was refused, and the "exactly one element" rule refused every remediation with nested children when the original had no id. The identity of an element is its tag and its id; the target is the original's id or the unique element of the same kind. The regressions `14-H4c` and `14-H4d` lock the behaviour down |
| Prior payload matrices (recovered) | PASS — the prior / legitimate matrix 118/118 (run with `tsx`), the twelfth / thirteenth / tenth / eleventh / ninth closure matrices 145/145 across five files, and the route matrices 17/17 across two files |
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

## Fourteenth independent security review evidence

| Check | Result |
|---|---|
| Fourteenth independent security review | **NOT READY — Critical 0, High 4, Medium 6, Low 0** against the closure tree `be81d02` (checkout `f6db8f7`, baseline `08ab9ef`); the reviewer's own artifact is `.ai/SECURITY-REVIEW-14.md` |
| Recovered fourth- through thirteenth-review payloads | PASS — 280/280 recovered assertions (the prior/legitimate matrix 118/118, the ninth 42/42, the tenth 19/19, the eleventh 37/37 + 9/9, the twelfth 26/26 + 8/8, the thirteenth 21/21) |
| Pre-closure eleventh-review harnesses (recovered) | FAIL **as expected** — 12 failed + 5 passed and 2 failed + 7 passed: the failures assert that the eleventh-review vulnerabilities still exist, so they confirm the closure rather than report a regression |
| New equivalent-path writer / verifier / Chromium harness | every final unsafe variant was observed with validation true, no destination refusal, verification confidence `1`, one fix and one mocked source write |
| New equivalent-path real-route harness | 13/13 passed across two temporary harnesses — every variant wrote `index.html`, created a branch and a pull request, and wrote both audit events |
| New legitimate-behaviour harness | 18/18 passed |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0, no diagnostics |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npx vitest run --coverage` | PASS — 53 files, 853/853 tests |
| Coverage | PASS — statements 68.02% (threshold 55) · branches 60.67% (50) · functions 71.05% (58) · lines 69.81% (57) |
| `npm run build` | PASS — exit 0 (Next standalone build, 116 static pages) |
| `npx playwright test --project=chromium` | PASS — 79/79 |
| `npm audit --audit-level=high` | PASS — exit 0, Critical 0 / High 0 (15 moderate toolchain advisories) |
| Tracked-file secret scan | PASS — 780 tracked files, 779 scanned; only `.env.example` is tracked in the `.env*` name family; one AWS-key-shaped **documentation example** (path and category only, value never printed) and no live credential |
| Strix autonomous pentest | **NOT RUN** — every configured provider refuses the run (quota / EOL model / no credits); no Strix result is claimed for this cycle |

## Thirteenth-review closure evidence

| Check | Result |
|---|---|
| Thirteenth-review closure | PASS — all seven findings (13-H1…13-H5, 13-M1, 13-M2) closed at their root cause in `be81d02`; the dispositions are in `.ai/SECURITY-STATUS.md` and the reviewer's own artifact is `.ai/SECURITY-REVIEW-13.md` |
| Permanent regressions | PASS — 26 new tests: 10 in `github.test.ts` (the base-relative stylesheet, the base-relative script, the base outside the repository, the base inside the repository, a script file that is not a document, the computed property read, the computed selector read, the unresolved property name, the unresolved selector, the unsafe candidate after the budget), 4 in `route.test.ts` (the document base, the computed property read, the computed selector read, the unsafe candidate after the budget) and 12 in `css-context.test.ts` (the negated attribute value change, the `:nth-child(… of …)` selector list, the nested negation, the unreadable functional pseudo-class, the added anchor `href`, the added `contenteditable`, the `tabindex` value change, the large outline, the small outline, the large `inset` shorthand, the small `inset` shorthand, the harmless dynamic pseudo-class) |
| Thirteenth-review closure matrix (temporary) | PASS — 21/21: every finding is blocked in the unsafe direction (0 fixes, 0 writes, non-null destination harm or `validation:false`) and every benign twin stays allowed. The file was deleted after the run |
| False-positive probe (temporary) | FOUND AND FIXED — the document-base reader parsed every file of a repository as markup, so an ordinary script file that holds a comparison and an apostrophe made the whole repository unprovable and refused every fix (1 of 3 probes failed). A script file is runtime code and not a document, and a document without a `<base>` element has its own URL as the base; the permanent regression `13-H1e` locks the behaviour down. The probe file was deleted after the run |
| Prior payload matrices (recovered) | PASS — the twelfth-review closure matrix 26/26, the eleventh-review closure matrix 37/37, the ninth-review closure matrix 42/42, the tenth-review closure matrix 19/19, the eleventh-review route matrix 9/9 and the prior / legitimate matrix 118/118 (run with `tsx` and Playwright Chromium) |
| Pre-closure eleventh-review harnesses (recovered) | FAIL **as expected** — 12 failed + 5 passed and 2 failed + 7 passed: the failures assert that the eleventh-review vulnerabilities still exist, so they confirm the closure rather than report a regression |
| `npx vitest run --coverage` | PASS — 53 shipped files, 853/853 tests (was 53/829) |
| Coverage | PASS — statements 68.02% (threshold 55) · branches 60.67% (50) · functions 71.05% (58) · lines 69.81% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0, no diagnostics |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build, 116 static pages) |
| `npx playwright test --project=chromium` | PASS — 79/79 on the clean re-run; the first run reported 78 with one retry (the accessibility spec failed its first attempt and passed on the retry, no assertion failed on the re-run) |
| `npm audit --audit-level=high` | PASS — exit 0, Critical 0 / High 0 (15 moderate toolchain advisories) |
| Tracked-file secret scan | PASS — 780 tracked files, 779 scanned; only `.env.example` is tracked in the `.env*` name family; one AWS-key-shaped **documentation example** (path and category only, value never printed) and no live credential |
| Strix autonomous pentest | **NOT RUN** — every configured provider refuses the run (quota / EOL model / no credits); no Strix result is claimed for this cycle |

## Thirteenth independent review evidence

| Check | Result |
|---|---|
| Thirteenth independent security review | **NOT READY — Critical 0, High 5, Medium 2, Low 0** against the closure tree `11065e4` (checkout `d2a7cda`, baseline `08ab9ef`); the reviewer's own artifact is `.ai/SECURITY-REVIEW-13.md` |
| Recovered fourth- through twelfth-review assertions re-run | PASS — 259/259 (118 prior / legitimate + 124 writer closure + 17 route closure) |
| Pre-closure eleventh-review evidence and route harnesses | PASS as expected-direction failures — 12 failed + 5 passed and 2 failed + 7 passed; the failures assert that the eleventh-review vulnerabilities still exist, so they confirm the closure |
| New equivalent-path writer / verifier / Chromium harness | PASS — 17/17 tests: all nine unsafe candidates reached one fix and one write, with every Chromium geometry, paint and local-request result observed |
| New equivalent-path route harness | PASS — 7/7: five representative High cases opened a pull request; the unsafe eleventh candidate produced no source fix but did produce review artifacts (13-M2) |
| Legitimate behaviours re-checked | PASS — 26/26 (the ordinary image-alt and button-name fixes, the `https:` / `mailto:` hrefs, the preserved relative destination, the preserved class and inline style, 3-of-3 and 2-of-3 identical copies, the twelve server-template spellings, the ordinary repository script, the linked script that does not react, the unrelated runtime mutation, the event handler that does not react, the small box growth, the harmless focus rule, the custom property without a resource, the scale of one, the small box shadow, the non-zero maximum size, the zero maximum size without clipping, the aspect ratio with both axes, the running animation, the positive delay, the pure in-page fragment `#main`) |
| Reviewer's gate suite | PASS — source-only typecheck 0, lint 0, vitest 53 files / 829/829, coverage 67.15/59.74/69.83/68.81, build 0 (116 static pages), Playwright 79/79, `npm audit` Critical 0 / High 0 (15 moderate) |
| Tracked-file secret scan | PASS — 779 tracked files; only `.env.example` is tracked in the `.env*` name family; one AWS-key-shaped **documentation example** (path and category only, value never printed) and no live credential |
| Strix autonomous pentest | **NOT RUN** — every configured provider refuses the run (quota / EOL model / no credits); no Strix result is claimed for this cycle |

### Findings to close

| Finding | Severity | Surface | Closure scope |
|---|---|---|---|
| 13-H1 | **High** | the document base URL (`<base href>`) for the repository stylesheet and script references | `src/lib/github.ts` |
| 13-H2 | **High** | the computed property and computed selector runtime state reads | `src/lib/github.ts` |
| 13-H3 | **High** | the attribute value change under a negated requirement, `:nth-child(... of ...)` and the nested negation | `src/lib/css-context.ts` |
| 13-H4 | **High** | the actual focusability before and after the fix | `src/lib/css-context.ts` |
| 13-H5 | **High** | the outline paint geometry | `src/lib/css-context.ts` |
| 13-M1 | Medium | the `inset` shorthand offsets | `src/lib/css-context.ts` |
| 13-M2 | Medium | the safety analysis against the ten-source-write budget | `src/lib/github.ts`, `src/app/api/github/create-pr/route.ts` |

## Twelfth-review closure evidence

| Check | Result |
|---|---|
| Twelfth-review closure matrix (temporary) | PASS — 26/26: the nine findings are blocked in the unsafe direction (0 fixes, 0 writes, non-null destination harm or `validation:false`) and the benign twins stay allowed. The file was deleted after the run |
| Twelfth-review real-route closure harness (temporary) | PASS — 8/8: seven route refusals (`400`, no branch, no write, no pull request) and the benign image-alt fix still opens a pull request. The file was deleted after the run |
| Eleventh-review closure matrix re-run | PASS — 37/37 |
| Ninth-review closure matrix re-run | PASS — 42/42 |
| Tenth-review closure matrix re-run | PASS — 19/19 |
| Eleventh-review route matrix re-run | PASS — 9/9 |
| Prior / legitimate assertion matrix re-run | PASS — 118/118 |
| Permanent regressions added | 30 (15 in `css-context.test.ts`, 8 in `github.test.ts`, 7 across `github-pr.test.ts` and `ast-patch.test.ts`) |
| `npx vitest run --coverage` | PASS — 53 shipped files, 829/829 tests (was 53/799) |
| Coverage | PASS — statements 67.15% (threshold 55) · branches 59.74% (50) · functions 69.83% (58) · lines 68.81% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed |
| `npm audit --audit-level=high` | PASS — Critical 0 / High 0 (15 moderate, dev toolchain) |
| Strix autonomous pentest | **NOT RUN** — every configured provider refuses the run (quota / EOL model / no credits); no Strix result is claimed for this cycle |

Two existing expectations changed with the 12-M3 design: a remediation that
hides a nested element is now refused **before** the verification browser
(`unverified`, `rejected before verification`) instead of failing the browser
check afterwards. The browser-level checks stay covered by their own
regressions.

## Twelfth independent review evidence

| Check | Result |
|---|---|
| Twelfth independent security review | **NOT READY — Critical 0, High 6, Medium 3, Low 0** against the closure tree `d429c6b` (checkout `2dce09d`, baseline `08ab9ef`); the reviewer's own artifact is `.ai/SECURITY-REVIEW-12.md` |
| Eleventh-review closure matrix re-run | PASS — 37/37 |
| Eleventh-review route matrix re-run | PASS — 9/9 |
| Tenth-review and ninth-review closure matrices re-run | PASS — 61/61 |
| Prior / legitimate assertion matrix re-run | PASS — 118/118 |
| New equivalent-path writer / verifier / Chromium harness | PASS — 4/4 tests, twelve candidate rows: every candidate reached one fix and one write, and local Chromium reproduced the takeover |
| Route / audit harness with the literal closure plus the new route probes | PASS — 12/12 (the dynamic state read, the functional pseudo-class and the nonstandard script extension each returned `200 success:true` and opened a pull request) |
| Reviewer's gate suite | PASS — source-only typecheck 0, lint 0, vitest 53 files / 799/799, coverage 66.59/59.2/69.02/68.3, build 0 (116 static pages), Playwright 79/79, `npm audit` Critical 0 / High 0 (15 moderate) |

### Findings to close — all closed in `11065e4`

| Finding | Severity | Surface | Closure scope | Status |
|---|---|---|---|---|
| 12-H1 | **High** | the runtime attribute reads whose name the script builds or cannot resolve, and the standard `hasAttributes()` | `src/lib/github.ts` | CLOSED |
| 12-H2 | **High** | the arguments of `:is()` / `:where()` / `:not()` and the **removed** classes and attributes | `src/lib/css-context.ts` | CLOSED |
| 12-H3 | **High** | an added `tabindex` as a focusability transition | `src/lib/css-context.ts` | CLOSED |
| 12-H4 | **High** | the painted surface of a **non-positioned** element | `src/lib/css-context.ts` | CLOSED |
| 12-H5 | **High** | the discovery of a runtime carrier through a `<script src>` target | `src/lib/github.ts` | CLOSED |
| 12-H6 | **High** | a runtime mutation of an element the **remediation introduces** | `src/lib/github.ts` | CLOSED |
| 12-M1 | Medium | a large **positive** positional offset or margin | `src/lib/css-context.ts` | CLOSED |
| 12-M2 | Medium | a remediation that introduces a URI attribute | `src/lib/github-pr.ts` | CLOSED |
| 12-M3 | Medium | a replacement that hides a **nested** live element | `src/lib/github-pr.ts`, `src/lib/ast-patch.ts` | CLOSED |

## Eleventh independent review evidence

| Check | Result |
|---|---|
| Eleventh independent security review | **NOT READY — Critical 0, High 3, Medium 3, Low 0** against the closure tree `7ec51ee` (checkout `0df2299`, baseline `08ab9ef`); the reviewer's own artifact is `.ai/SECURITY-REVIEW-11.md` |
| Tenth-review closure matrix re-run | PASS — 19/19 (the nine unsafe reproductions blocked, the ten legitimate groups allowed) |
| Ninth-review closure matrix re-run | PASS — 42/42 (26 writer-level unsafe payloads, four validator-level groups, twelve legitimate groups) |
| Prior / legitimate assertion matrix re-run | PASS — 118/118 after a **harness-only** correction: one assertion expected confidence `0` for a candidate rejected before verification, while the API correctly returns confidence `null`. The harness was corrected to assert the required unsafe direction directly (validation false or non-null harm, no eligible / verified fix, 0 fixes, 0 writes). Not a product change |
| New equivalent-path writer / verifier / Chromium harness | PASS — 17/17 (each reproduced unsafe candidate reaches one fix / one write and local Chromium reproduces the takeover, the clipping, the request and the animation result) |
| Remaining-equivalent probe | PASS — 1/1 (`clip-path:inset(100%)` blocked with 0 fixes / 0 writes; the `box-shadow`, the positive-delay and the negative-delay animations reproduced) |
| Real-route / audit harness | PASS — 9/9 (the destination refusal, the intent-audit failure, the closing-audit failure, the branch failure, the planning failure, the pull-request failure and the refused-source-write paths; the inline-handler and zoom cases returned HTTP `200` and opened a pull request) |
| Shipped create-PR route regressions | PASS — 16/16 |
| Reviewer's gate suite | PASS — source-only typecheck 0, lint 0, vitest 53 files / 770/770, coverage 65.35/57.52/67.96/67.05, build 0, Playwright 79/79, `npm audit` Critical 0 / High 0 (15 moderate) |
| Secret scan | PASS — only `.env.example` is tracked in the `.env*` name family; the actual `.env` was neither tracked nor inspected; no tracked private key, GitHub-token shape, OpenAI-style key, Google API key, Stripe live key or Slack token was found (path-only categories) |

### Findings to close

| Finding | Severity | Surface | Closure scope |
|---|---|---|---|
| 11-H1 | **High** | the event-handler attributes of repository HTML and the generic attribute state reads (`getAttributeNames()`, `getAttributeNode()`, `attributes.getNamedItem()`) | `src/lib/github.ts` |
| 11-H2 | **High** | the effective painted surface — the logical padding / border longhands, `zoom`, an unconstrained `scale`, `aspect-ratio`, `box-shadow` | `src/lib/css-context.ts` |
| 11-M1 | Medium | a zero `max-height` / `max-width` with a clipping overflow | `src/lib/css-context.ts` |
| 11-M2 | Medium | the customer-side request hidden behind a `var(--pixel)` reference and the missing inherited `:root` definition | `src/lib/css-context.ts` |
| 11-M3 | Medium | the animation delay, the negative delay of a paused timeline and the fill mode | `src/lib/css-context.ts` |

### Closure evidence (the eleventh-review closure run, 2026-11-23)

| Check | Result |
|---|---|
| Eleventh-review closure matrix (temporary) | PASS — 1 file, 46/46 assertions: the 13 new reproductions are blocked in the unsafe direction (0 fixes, 0 writes, non-null destination harm), the benign twins stay allowed, and the **route** refuses the inline-handler and the zoom case with `400` and no branch, no write and no pull request. The file `src/lib/__tests__/tmp-review11-closure.test.ts` was deleted after the run |
| Prior payload matrices (temporary, recovered from the reviewer's own harnesses) | PASS — the tenth-review closure matrix 19/19, the ninth-review closure matrix 42/42 (61 assertions across the two files) and the prior / legitimate matrix 118/118 (`tmp-prior-118-matrix.mts`). The files were deleted after the run |
| Harness correction (not a product change) | The first run failed on **one** benign twin: `:root{--brand:#06c}[alt]{color:var(--brand)}` was written with an original element that carried no `alt`, which makes the rule **activated** by the fix — and the effective style must stay unprovable for a `var()` it cannot resolve. The twin was corrected to the shape that tests the resource check (an element that already carries the attribute) and the matrix then passed 46/46. No shipped source changed for it |
| `npx vitest run --coverage` | PASS — 53 shipped files, 799/799 tests, 0 failed (was 53/770) |
| Coverage | PASS — statements 66.59% (threshold 55) · branches 59.2% (50) · functions 69.02% (58) · lines 68.3% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed (4.4 min) |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev toolchain) |

### Permanent regressions added for the eleventh review

| Finding | Regression | File |
|---|---|---|
| 11-H1 — the runtime carriers and the generic state reads | the inline event handler, `getAttributeNames()`, `getAttributeNode()`, `attributes.getNamedItem()`, an iteration of `element.attributes` and an unreadable handler keep the fix out of the repository; a handler that does not react to the fix does not | `github.test.ts` |
| 11-H2 — the effective painted surface | the logical padding and border longhands, `zoom`, an unconstrained scale, an `aspect-ratio` that fills an undeclared axis and a viewport-wide `box-shadow` are refused; the small growth twins stay harmless | `css-context.test.ts` |
| 11-M1 — the clipping preservation | a zero `max-height` / `max-width` with a clipping overflow removes the painted control; a zero cap without clipping and a cap that is not zero do not | `css-context.test.ts` |
| 11-M2 — the inherited custom property | the inherited `url(…)` behind a `var(…)` is caught, an inherited custom property without a resource is not, and an unresolved reference is unprovable | `css-context.test.ts` |
| 11-M3 — the animation timing | the paused negative delay and the running backwards fill select the frame the customer sees, a positive delay without the fill does not, and an unreadable timing is unprovable | `css-context.test.ts` |

## Tenth-review closure evidence

| Check | Result |
|---|---|
| Temporary reviewer-payload matrix | PASS — 1 file, 19/19 assertions: the nine unsafe reproductions of the tenth review (the inline `<script>` carrier, the DOM property getter, the escaped attribute name `[a\6ct]`, `scale:3`, `border:10000px`, `padding:10000px`, the focus sibling `input:focus ~ .overlay`, the paused animation and the focus-activated customer-side request) are all blocked in the unsafe direction (0 fixes, 0 writes), and the ten legitimate behaviour groups (the ordinary image-alt fix, the TSX fix, the preserved class, the benign inline style, 3-of-3 copies, 2-of-3 copies, an unrelated runtime mutation, a small box growth, a harmless focus rule and an unreadable file) still pass. The file `src/lib/__tests__/tmp-review10-matrix.test.ts` was deleted after the run |
| `npx vitest run --coverage` | PASS — 53 shipped files, 770/770 tests, 0 failed (was 53/750) |
| Coverage | PASS — statements 65.35% (threshold 55) · branches 57.52% (50) · functions 67.96% (58) · lines 67.05% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed (4.4 min) |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev toolchain) |

### Permanent regressions added for the tenth review

| Finding | Regression | File |
|---|---|---|
| 10-H1 — the repository runtime carriers and state reads | an inline `<script>` that reacts to the added attribute and a linked script that reads the attribute as a DOM property keep the fix out of the repository | `github.test.ts` |
| 10-H2 — the CSS identifier escape | an escaped attribute **name** (`[a\6ct]`) is decoded the way the browser decodes it | `css-context.test.ts` |
| 10-H3 — the painted-box geometry | a scale above one, a `10000px` border and a `10000px` padding are composed into the painted box; a box that grows a little stays harmless | `css-context.test.ts` |
| 10-H4 / 10-M2 — the focus activation a fix causes | `input:focus ~ .overlay` is judged as a takeover of another element, `input:focus{background-image:url(…)}` as a customer-side request, and a focus rule that only draws an outline stays harmless | `css-context.test.ts` |
| 10-M1 — the animation play state | a paused animation is judged on the first frame the customer sees, a running one on the frame it ends at | `css-context.test.ts` |
| 10-M3 — the decision before the first repository mutation | a refused candidate is reported as refused and writes nothing, a candidate with no provable source file is reported for review, and the plan writes only the planned files | `github.test.ts` |
| 10-M3 / 10-M4 — the route | no branch, no document and no pull request when every candidate is refused; no pull request when the plan fails; the audit intent is written before the branch; no pull request when the intent cannot be written; no fix document for a refused candidate; the degraded closing record is reported with the intent as the trail | `route.test.ts` |

## Ninth-review closure evidence

| Check | Result |
|---|---|
| Temporary reviewer-payload re-run | PASS — 1 file, 42/42 assertions: 26 writer-level unsafe payloads of the fourth to the ninth reviews (the ninth-review geometry, sibling combinator, repository runtime, repository resource and paint reproductions plus the fifth, seventh and eighth review payloads that touch the changed paths) and the validator-level payloads (`attributionsrc`, the duplicate URI attributes, the `ping` list, the 12 template spellings) are all blocked in the unsafe direction (validation false, 0 fixes, 0 writes), and the 12 legitimate behaviour groups (HTML / TSX / JS fix, `https:` / `mailto:` href, the preserved relative destination, the preserved class, the benign inline style, 3-of-3 copies, 2-of-3 copies, the ordinary repository script, the mocked symlink) still pass. The file `src/lib/__tests__/tmp-review9-matrix.test.ts` was deleted after the run |
| `npx vitest run --coverage` | PASS — 53 shipped files, 750/750 tests, 0 failed (was 53/724) |
| Coverage | PASS — statements 65.22% (threshold 55) · branches 57.50% (50) · functions 67.04% (58) · lines 66.70% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed (4.6 min) |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev toolchain) |

### Permanent regressions added for the ninth review

| Finding | Regression | File |
|---|---|---|
| 9-H1 — the destination CSS geometry | the four logical inset longhands set the edges the browser assigns, and a fixed-pixel, viewport or font-relative size above the viewport is unprovable | `css-context.test.ts` |
| 9-H2 — the sibling combinator | a rule the fix activates whose subject is another element makes the destination unprovable | `css-context.test.ts` |
| 9-H3 — the repository runtime | the conditional class mutation, the conditional inline-style mutation, the mutation through a tag selector, the sibling activated by the added attribute, the service worker, the CSS-in-JS library and the mutation by id keep the fix out of the repository, while an ordinary script that mutates an unrelated element still gets the fix | `github.test.ts` |
| 9-M1 — the `attributionsrc` attribute | the remote `attributionsrc`, the list with a remote destination, the changed, dropped, preserved, relative and duplicate `attributionsrc` are judged | `github-pr.test.ts` |
| 9-M2 — the customer-side CSS resource | a network-bearing declaration of a rule the fix activates makes the destination unprovable | `css-context.test.ts` |
| 9-M3 — the repository paint and geometry | the transparent repository colour, the logical margin, the negative positional offset, the single zero dimension, `display:contents` and the reversed animation hide the patched element | `css-context.test.ts` |

## Eighth-review closure evidence

| Check | Result |
|---|---|
| Temporary reviewer-payload re-run | PASS — 1 file, 78/78 assertions: the 12 fourth-review payloads, the 6 fifth-review payloads, the 8 sixth-review payloads, the 8 seventh-review reproductions and the eighth-review reproductions are all blocked in the unsafe direction (validation false, 0 fixes, 0 writes), and the 9 legitimate behaviours (HTML / TSX / JS fix, `https:` / `mailto:` href, 3-of-3 copies, 2-of-3 copies, the 12 template spellings, the mocked symlink) still pass. The file `src/lib/__tests__/tmp-reviewer-payload-rerun.test.ts` was deleted after the run |
| `npx vitest run --coverage` | PASS — 53 shipped files, 724/724 tests, 0 failed (was 53/703) |
| Coverage | PASS — statements 64.83% (threshold 55) · branches 56.97% (50) · functions 66.58% (58) · lines 66.32% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed (4.4 min) |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev toolchain) |

### Permanent regressions added for the eighth review

| Finding | Regression | File |
|---|---|---|
| 8-H1 — the destination CSS geometry | the two-value, three-value and four-value `inset` shorthand set the edges the browser assigns, and `inline-size` / `block-size` cover the viewport | `css-context.test.ts` |
| 8-H2 — the remediation / destination composition | the inline style of the patched element is composed with the repository's rules, the custom properties the fix defines resolve the `var()` references, and a style that is not a CSS declaration list is unprovable | `css-context.test.ts` |
| 8-H3 — the JSX `className` hook | a class rule reaches the element through `className` in the CSS descriptor, and a new JSX class token is refused by the validation guard | `css-context.test.ts`, `github-pr.test.ts` |
| 8-H4 — the runtime-created repository style | `createElement('style')` and `insertRule(…)` keep the fix out of the repository, while a repository with an ordinary script is still patched | `github.test.ts` |
| 8-M1 — the URI attribute and list semantics | a remote destination behind a duplicate `src`, a remote URL inside a `ping` list and a navigation behind a duplicate `href` are refused | `github-pr.test.ts` |
| 8-M2 — the paint preservation | the modern zero-alpha colour, the zero-size target, the zero size with clipping and the negative margin are refused statically; the browser verdict refuses the transparent colour, the zero-area target, the clipped text, the negative margin, the viewport translation and the opacity animation endpoint | `github-pr.test.ts`, `fix-verification.test.ts`, `css-context.test.ts` |

## Seventh-review closure evidence

| Check | Result |
|---|---|
| Temporary reviewer-payload re-run | PASS — 1 file, 39/39 assertions: the 12 fourth-review payloads, the 6 fifth-review payloads, the 8 sixth-review payloads and the 8 seventh-review reproductions are all blocked in the unsafe direction, and the 9 legitimate behaviours (HTML / TSX / JS fix, `https:` / `mailto:` href, 3-of-3 copies, 2-of-3 copies, the 12 template spellings, the mocked symlink) still pass. The file was deleted after the run |
| `npx vitest run --coverage` | PASS — 53 shipped files, 703/703 tests, 0 failed (was 53/667) |
| Coverage | PASS — statements 64.94% (threshold 55) · branches 56.85% (50) · functions 66.88% (58) · lines 66.50% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev toolchain) |

### Permanent regressions added for the seventh review

| Finding | Regression | File |
|---|---|---|
| 7-H1 — the CSS priority suffix, the logical viewport units and an uncomputable value | the priority suffix is read as the browser does, the logical viewport units are recognised, an unknown unit / keyword makes the destination unprovable | `css-context.test.ts`, `github.test.ts` |
| 7-H2 — a relational selector (`:has()`) | the destination is unprovable and the writer performs no write | `css-context.test.ts` |
| 7-H3 — a dynamic style carrier (`<style>{css}</style>`) | a dynamic source is never an empty, proven stylesheet; the writer performs no write | `css-context.test.ts`, `github.test.ts` |
| 7-M1 — the remote-URL spellings and the navigation mutation | protocol-relative, one-slash and backslash destinations are refused, a changed `href` is refused, a preserved and an added relative destination stay allowed | `html-attributes.test.ts`, `github-pr.test.ts` |
| 7-M2 — the visual-hiding forms | the static guard and the browser verdict refuse a zero size, a paint suppression, a zero scale, an off-screen placement and a zero-area text range | `github-pr.test.ts`, `fix-verification.test.ts`, `css-context.test.ts` |
| 7-M3 — the live element and the media source | a raw-text / bogus-comment carrier is not a fix, and a dropped media source is refused | `fix-validation.test.ts` |
| 7-M4 — the frameset parsing state | the occurrence count is 0 and nothing is written into a frameset document | `ast-patch.test.ts`, `github-pr.test.ts` |

## Sixth-review closure evidence

| Check | Result |
|---|---|
| Temporary reviewer-payload re-run | PASS — 1 file, 36/36 assertions: 6 fifth-review payloads, 12 fourth-review payloads, 8 sixth-review reproductions (all blocked in the unsafe direction) and 8 legitimate behaviours (all still pass). The file was deleted after the run |
| `npx vitest run --coverage` | PASS — 53 shipped files, 667/667 tests, 0 failed (was 53/634) |
| Coverage | PASS — statements 64.80% (threshold 55) · branches 56.21% (50) · functions 66.80% (58) · lines 66.34% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed (4.1 min) |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev toolchain) |

### Permanent regressions added for the sixth review

| Finding | Regression | File |
|---|---|---|
| 6-H1 — a preprocessor stylesheet and a linked stylesheet are part of the destination | the fix is not written when either turns the patched element into an overlay; a stylesheet whose syntax cannot be resolved does the same | `src/lib/__tests__/github.test.ts` |
| 6-H2 — the analyser missed ten browser-valid rule variants | escaped selector, escaped property, escaped value, negated selector, dynamic viewport units, minimum viewport sizing, custom properties, native nesting, changed attribute value, comment opener inside a string, stylesheet order, a harmless animation and an animation that covers the screen | `src/lib/__tests__/css-context.test.ts` |
| 6-M1 — HTML comment syntax in a remediation | the remediation is invalid | `src/lib/__tests__/github-pr.test.ts` |
| 6-M2 — a fix that hides its own target | the remediation is invalid, the write is skipped and the rendered element is caught in a real browser | `src/lib/__tests__/github-pr.test.ts`, `src/lib/__tests__/ast-patch.test.ts`, `src/lib/__tests__/fix-verification.test.ts` |
| 6-M3 — transparent text | the four spellings are invalid and the computed colour is caught in a real browser | `src/lib/__tests__/github-pr.test.ts`, `src/lib/__tests__/fix-verification.test.ts` |
| 6-M4 — a new remote URL | a new remote URL is invalid, the URL of the original element is valid | `src/lib/__tests__/github-pr.test.ts` |
| 6-M5 — non-live contexts | the bogus comment, the CDATA section and the quoted end tag each count zero occurrences | `src/lib/__tests__/ast-patch.test.ts` |
| 6-M6 — an ambiguous blob | the blob is read in both cases; a text blob makes the match ambiguous, a binary blob does not | `src/lib/__tests__/github.test.ts` |

No temporary test file remains: every reproduction of the sixth review is covered
by a shipped regression.

## Fifth-review closure evidence

| Check | Result |
|---|---|
| Temporary exact-payload reproduction suite | PASS — 1 file, 8/8 tests. The six fifth-review findings and the twelve fourth-review payloads are blocked in the unsafe direction, and the legitimate fix still lands. The file was deleted after the run |
| `npx vitest run --coverage` | PASS — 53 shipped files, 634/634 tests, 0 failed |
| Coverage | PASS — statements 63.83% (threshold 55) · branches 55.16% (50) · functions 66.04% (58) · lines 65.29% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev toolchain) |
| Security gate | **PENDING — the sixth independent review has not run yet; the gate opens only on READY (Critical 0, High 0)** |

### New coverage in this cycle

| File | Covers |
|---|---|
| `src/lib/__tests__/css-context.test.ts` | the destination stylesheet judgement: overlay and hiding rules, a utility stylesheet read together, a rule that reaches the element through its tag, a rule that selects on an attribute the fix adds, a conditional group, a comment that hides a declaration, and the rules that do not reach the element (5-H1) |
| `src/lib/__tests__/github-pr.test.ts` | the entity-encoded `input type=image` (5-M1), the server-template grammar in a remediation (5-H2), a remediation that adds a class the original element does not have and one that keeps it (5-H1), `opacity:0!important` (5-M2), and a template destination that is left untouched (5-H2) |
| `src/lib/__tests__/ast-patch.test.ts` | `opacity:0!important` hides content (5-M2), the inert `template` context, the raw-text `iframe` context, the `</scripture>` end-tag prefix and an element that is never closed (5-M3) |
| `src/lib/__tests__/github.test.ts` | a file with an extension the writer does not know is scanned, a submodule blocks every write (5-M4), the destination stylesheet guard (5-H1), and a template destination (5-H2) |
| `src/lib/__tests__/fix-verification.test.ts` | a fix whose text the user cannot see fails the verification — the verdict is computed from the computed style, not from `innerText` (5-M2) |

## Fifth independent security-review evidence

| Check | Result |
|---|---|
| Broad temporary review suite | PASS as an evidence harness — 1 file, 36/36 assertions. It re-ran all twelve fourth-review payloads, checked equivalent variants and legitimate behavior. |
| Focused final temporary suite | PASS — 1 file, 7/7 tests. Six findings reproduce in the unsafe direction; the `<!-->` and `java&NewLine;script:` closure variants are blocked. |
| `npx vitest run --reporter=dot` (with the broad review file) | PASS — 53 files, 641/641 tests |
| `npx vitest run --reporter=dot` (after temporary-file deletion) | PASS — 52 shipped files, 605/605 tests |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build, 116 static pages) |
| `npm audit --audit-level=high --json` | PASS — Critical 0, High 0, Moderate 15, Low 0 |
| Tracked-file secret scan | PASS — 771 tracked text files; no live secret. One AWS-key-shaped documentation example was classified with its value redacted. |
| Security gate | **FAIL — Critical 0, High 2, Medium 4, Low 0**; see `.ai/SECURITY-STATUS.md` |

Both temporary review files were deleted. The shipped source tree and untracked
file list were clean immediately afterwards; no production or third-party target
was touched.

## Fourth-review closure evidence

| Check | Result |
|---|---|
| `npx vitest run --coverage` | PASS — 52 shipped files, 605/605 tests, 0 failed |
| Coverage | PASS — statements 62.88% (threshold 55) · branches 54.46% (50) · functions 64.91% (58) · lines 64.26% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0 |
| `npm run build` | PASS — exit 0 (Next standalone build, 116 static pages) |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed (4.4 min) |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev toolchain) |
| Reviewer exploit reproductions (re-run on the fixed tree) | PASS — 12/12 blocked; the temporary reproduction file was deleted afterwards |
| GitHub Markdown API (4-M1 bare URL) | PASS — the escaped URL renders as plain text; the control renders as a live link |
| Docker image gate | PASS — run 44955598091 completed ✅ (Trivy step passes) |

### New coverage in this cycle

| File | Covers |
|---|---|
| `src/lib/__tests__/github-pr.test.ts` | the named-entity CSS overlay (4-H1), a style value that carries an entity / escape / comment, a remediation with a brace (4-H3 JSX), the alternate HTML comment terminator `--!>` (4-H2), `plaintext` (4-M2), the resource loaders `video`/`audio`/`source`/`track`/`input[type=image]` (4-M3), the GFM bare-URL autolink (4-M1), the swapped remediations of two selected copies (4-M8), the reduced label (4-M7), the quote escape into a file without a proven context |
| `src/lib/__tests__/ast-patch.test.ts` | the live-tag scanner (an element in a comment, in a script block or in an attribute value is not live — 4-M9), the patchable-file rule (HTML/JSX only), `opacity:0` hides content, the root element's own hidden state, the replacement has to keep the original text (4-M6/4-M7) |
| `src/lib/__tests__/github.test.ts` | a file the API returns with `encoding:'none'` is unreadable and makes the scan incomplete (4-M4), the omitted source extensions are scanned (4-M5), a file without a proven context is not patched (4-H3), an element inside a comment is not patched (4-M9), the swapped remediations are not written (4-M8) |

The reviewer's exact payloads were re-run as a temporary suite before the permanent
regressions were written: all twelve are blocked. The temporary file was deleted
afterwards and the shipped suite runs 52 files.

## Fourth independent security-review evidence

| Check | Result |
|---|---|
| Temporary review reproductions | PASS as an evidence harness — 2 files, 32/32 tests. The exploit cases assert that the unsafe behavior reproduces; the exact third-review cases assert that the unsafe write is blocked |
| `npx vitest run --reporter=dot` (with review files) | PASS — 54 files, 612/612 tests |
| `npx vitest run --reporter=dot` (after review-file deletion) | PASS — 52 shipped files, 580/580 tests |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0 |
| `npm run build` | PASS — exit 0 (Next standalone build, 116 static pages) |
| `npm audit --audit-level=high --json` | PASS — Critical 0, High 0, Moderate 15, Low 0 |
| Security gate | **FAIL — Critical 0, High 3, Medium 9, Low 0**; see `.ai/SECURITY-STATUS.md` |

The two temporary files were deleted after the run. No shipped source was changed.

## Third-review closure evidence

| Check | Result |
|---|---|
| `npx vitest run --coverage` | PASS — 52 files, 580 tests, 0 failed |
| Coverage | PASS — statements 62.29% (threshold 55) · branches 53.55% (50) · functions 64.43% (58) · lines 63.71% (57) |
| `npm run lint` | PASS — exit 0 |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed (4.4 min) |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev toolchain) |
| Reviewer exploit reproductions (re-run on the fixed tree) | PASS — 5/5 blocked: escaped CSS overlay, frame/frameset, Markdown-injected selector, `aria-hidden` text deletion, wrong duplicate occurrence |
| Two further bypasses found while fixing (CSS comment, entity encoded overlay) | PASS — blocked, with regression tests |

### New coverage in this cycle

| File | Tests | Covers |
|---|---|---|
| `src/lib/__tests__/github-pr.test.ts` | 50 | the CSS escaped overlay, the CSS comment overlay, the entity encoded overlay, `frame`/`frameset`/`portal`/`fencedframe`, the inline code span (fence longer than the value, padded edges), the Markdown-injected selector, the wrong duplicate occurrence, the comment terminator in untrusted text |
| `src/lib/__tests__/github.test.ts` | 28 | a truncated tree patches nothing, an unreadable file patches nothing |
| `src/lib/__tests__/ast-patch.test.ts` | 51 | `aria-hidden` text counts as visible text |
| `src/lib/__tests__/audit-retry.test.ts` (new, 2 tests) | 2 | the audit write is retried, and a missing trail is reported honestly |
| `src/app/api/github/create-pr/route.test.ts` | 11 | the route calls the retried audit write |

## Third independent security-review evidence

| Check | Result |
|---|---|
| `npm test -- --reporter=dot` | PASS — 51 files, 566 tests, 0 failed |
| `npm run lint` | PASS — exit 0 |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| Synthetic production build | PASS — exit 0 |
| Docker image build | PASS — exit 0; temporary image removed after inspection |
| `npm audit --json` | Critical 0 · High 0 · Moderate 15 (dev toolchain) |
| Reviewer exploit reproductions | **FAIL as a release gate** — 2 High and 5 Medium findings reproduced; see `.ai/SECURITY-STATUS.md` |

The temporary reviewer suites were local and mocked. They reproduced the escaped
CSS overlay, active frame/frameset, Markdown link injection, incomplete GitHub
scan, visible-content deletion, failed audit write and wrong duplicate occurrence.
Every temporary file was deleted after the run; no shipped source was changed.

## Previous verified-fix closure cycle

Last run: 2026-11-22 (V23 re-review closure cycle)

## Vitest

```
Test Files  51 passed (51)
Tests       566 passed (566)
Duration    ~17.5s
```

### Coverage (CI runs `vitest run --coverage`)

```
Statements  62.07%  (threshold 55)  PASS
Branches    53.25%  (threshold 50)  PASS
Functions   64.19%  (threshold 58)  PASS
Lines       63.47%  (threshold 57)  PASS
```

### New coverage in the re-review closure cycle

Every finding of the independent re-review has a regression test that fails on the
old code:

- `src/lib/__tests__/html-attributes.test.ts` (new, 10 tests) — browser-like attribute
  parsing (quoted, unquoted, boolean, slash separated, `>` inside a quoted value),
  entity decoding, URI normalisation, handler detection and handler stripping.
- `src/lib/__tests__/github-pr.test.ts` (43 tests) — the event handler of the scanned
  page is rejected, `/onerror=` is rejected, an entity encoded `javascript:` URI is
  rejected, an overlay style is rejected, ordinary `https`/`mailto`/relative URIs stay
  valid, and Markdown syntax in untrusted prose is escaped.
- `src/lib/__tests__/ast-patch.test.ts` (50 tests) — the class list, `aria-label`,
  `role` and `data-testid` are identity attributes (the wrong copy is not patched), and
  hidden text (`hidden`, `aria-hidden`, `display:none`, `visibility:hidden`) does not
  count as visible text.
- `src/lib/__tests__/github.test.ts` (26 tests) — the **whole** source tree is scanned
  (a target file beyond the first entries is found, an ambiguous match is still left
  alone), a tree over the byte budget is never patched, and the writer reports the ids
  of the fixes it actually wrote.
- `src/lib/__tests__/fix-verification.test.ts` (30 tests) — a carried handler, an
  entity encoded URI and a hidden text fix are rejected, and two **real browser**
  isolation tests prove that no HTTP request and no WebSocket reaches a local server
  during a verification run.
- `src/app/api/github/create-pr/route.test.ts` (11 tests) — a violation without an
  accepted artifact is not linked, a violation patched into a source file is linked, a
  failed audit write is reported (`auditRecorded: false`), and the audit trail is
  written even when the violation update fails.
- `src/lib/__tests__/vpat-generator.test.ts` (13 tests) — a scan of another tenant is
  answered with `404` and no violation is queried, the violation query is scoped to
  project **and** scan, and a **real** catalog manual check id
  (`meaningful-alt`, `keyboard-flow`) overrides the automated result.

The reviewer reproductions were re-run as a temporary suite before the permanent
regressions were written: all six reproductions (carried handler, `/onerror=`, entity
encoded `javascript:`, overlay style, wrong element by class, hidden text) are blocked.

## Previous cycle

Last run: 2026-11-21 (V23 verified-fix engine + security hardening cycle)

### Vitest

```
Test Files  50 passed (50)
Tests       523 passed (523)
Duration    ~17.4s
```

### Coverage (CI runs `vitest run --coverage`)

```
Statements  60.54%  (threshold 55)  PASS
Branches    52.05%  (threshold 50)  PASS
Functions   63.43%  (threshold 58)  PASS
Lines       61.84%  (threshold 57)  PASS
```

The V23 code initially pushed global branch coverage to **49.98%** — below the CI
gate, so the hardened commit would have failed CI. Fixed by covering the code V23
added, not by lowering the threshold: `src/lib/github.ts` (the GitHub writer and the
API helpers) and `src/lib/ast-patch.ts` (the AST locator and the HTML→JSX converter)
now sit at 87% and 91% branch coverage. No threshold was changed.

New coverage in this cycle:

- `src/lib/__tests__/ast-patch.test.ts` (38 tests) — AST location in JSX, occurrence
  awareness, HTML exact match, HTML→JSX conversion (`class`→`className`, void
  self-closing, `style` → object), placeholder rejection, parse guard, and the
  visible-text guard. Regression: two elements with the same `src` but a different
  `id` must not match each other. Also the attribute forms (single-quoted, unquoted,
  valueless, JSX expression), the class-list fallback, the style allow-list (a value
  that could escape the JS expression is dropped) and the edge cases of the text
  guard.
- `src/lib/__tests__/fix-verification.test.ts` (22 tests) — gate semantics (`null`
  never passes), verdict mapping (verified / failed / unverified), runner failure
  handling, the **check-before-render order** (an unsafe candidate never reaches the
  runner), mixed batches, and five **real browser** axe runs (verified fix,
  whitespace-only alt, rejected fixes, injected event handler). The browser block is
  skipped (visibly) when no Chromium is reachable; CI installs Chromium before the
  unit suite for this reason.
- `src/lib/__tests__/github-pr.test.ts` (35 tests) — occurrence-aware patching,
  independent elements of the same rule, placeholder rejection, no-op rejection,
  JSX patching through the AST, syntax-guard discard, content-loss rejection, the
  validation bypasses (`<script/x>`, unquoted `javascript:`, `data:text/html`,
  `onerror = "…"`, `iframe`/`object`/`svg`/`style`/`link`), and the Markdown
  escaping of untrusted text in the PR body.
- `src/lib/__tests__/github.test.ts` (20 tests) — the repository writer: one
  fetch and one write per file, two fixes in one file, two files, an ambiguous match
  left alone, a refused write not reported as applied, an unsafe fix never written;
  plus the GitHub API helpers (OAuth URL, code exchange, authenticated user,
  repository list, branch creation, file creation, pull request, write-access
  validation, repository details, token revocation, pull request status).
- `src/app/api/github/create-pr/route.test.ts` (new, 7 tests) — the PR route: no PR
  without remediation, the request cap, no PR when every fix is unverified, no PR when
  the branch fails, only eligible violations linked to the PR, the audit trail, and
  honest file counters.
- `src/lib/__tests__/vpat-generator.test.ts` (extended, 9 tests) — the conformance
  labels, the source guard, and the generator itself: a project without scans reports
  everything as not evaluated, a criterion with a violation never claims full
  support, critical violations are not supported, a manual check overrides the
  automated result.

## Playwright

```
npx playwright test --project=chromium   → 79 passed, 0 failed (4.2m)
```

An earlier run of the same suite showed one retry-only flake
(`e2e/landing.spec.ts`, authenticated CTA); the spec passes 5/5 in isolation and the
full suite is green again.

## Previous cycle

Last run: 2026-11-21 (authenticated scans cycle)

### Vitest

```
Test Files  45 passed (45)
Tests       410 passed (410)
Duration    ~11.0s
```

New coverage in this cycle:

- `src/app/api/scan-auth/route.test.ts` (6 tests) — 401 without session, 403 for members,
  404 across organizations, encryption at rest, masked reads, update, delete.
- `src/app/api/onboarding/onboarding-rate-limit.test.ts` (3 tests) — 5/min limit, per-client
  scope, shared budget between `/onboarding/scan` and `/onboarding/vpat`.

Repaired (stale or broken fixtures, not product regressions):

| Suite | Root cause |
|---|---|
| `rbac.test.ts` | `db.user.findUnique` mock returned only `{ emailVerifiedAt }`; `requireAuth` re-reads id/role/orgId from the database → 401/403. The mock now mirrors the session row. |
| `queue.test.ts` | The database mock missed `scanAuthConfig.findMany`, `scan.findFirst`, `violation.findMany` and `$transaction` after the executor started reading auth configs. |
| `projects` / `violations` route tests | Both suites upserted the same e-mail into different organizations → whichever ran first decided the user's org. Unique e-mails + deterministic upserts now. |
| `tenant-isolation.test.ts` | The session referenced a fabricated user id (`u-a`) that does not exist in the database → 401 instead of 403. A real org-A user is created now. |
| `notification-settings.test.ts` | The test asserted 2 alert keys; the alerts feature ships 4 (`newCritical`, `newSerious` added). |
| `audit-whitelist.test.ts` | The regex matched every `action:` property, including `IntegrationLog.action`. It now anchors on audit writes only. |
| `openapi-parity.test.ts` | 13 route handlers were missing from the spec and the schema count had drifted. The spec now covers all 112 paths / 70 schemas. |
| `manual-checks` route test | The database was missing `ManualCheck.evidence` (db push drift) — fixed by the migration repair. |

## Typecheck

```
npx tsc -p tsconfig.check.json --noEmit   → exit 0 (PASS)
```

## Lint

```
npm run lint   → exit 0 (PASS, 0 errors)
```

## i18n / audit guards

```
node scripts/audit-actions-diff.mjs   → MISSING_LABELS=0 (TOTAL_ACTIONS=65)
en/hi key parity                       → 1500 keys, 0 missing
```

## Build

```
npm run build   → exit 0 (PASS) — Next 16.4.6, 116/116 static pages, standalone build
```

## Database

```
prisma migrate deploy (fresh DB)                → all 13 migrations applied
prisma migrate diff fresh DB → schema.prisma    → "No difference detected"
prisma migrate diff dev DB   → schema.prisma    → "No difference detected"
```

## Playwright E2E

```
npx playwright test --project=chromium   → 79 passed, 0 failed (4.0 min)
```

The V21 cycle closed with 70 passed / 9 failed. All 9 are now fixed at the root cause
(report: `.gstack/qa-reports/qa-report-accessguard-2026-11-21.md`):

| # | Failing spec(s) | Root cause | Fix |
|---|---|---|---|
| 1 | `contrast.spec.ts` (3) + `a11y.spec.ts` (2) — 8 axe `color-contrast` failures | The severity/brand tokens were tuned for fills and icons (3:1) while the same tokens are 12px badge text on `bg-<severity>/10` (4.5:1). Light `--serious` was 3.07, `--moderate` 2.08, `--minor` 3.51, `--emerald` 2.86; dark `--critical` 3.98 | Retuned `--critical/--serious/--moderate/--minor/--emerald` (light) and `--critical` (dark) in `src/app/globals.css`, with the `oklch → sRGB → WCAG` math checked before writing the CSS (`.gstack/qa-reports/contrast-math.mjs`) |
| 2 | `landing.spec.ts` start button | Stale expectation: the landing CTA routes **authenticated** visitors to `/dashboard` (`src/app/page.tsx:25`), and the chromium project always runs with an authenticated storage state | The spec now expects `/dashboard` |
| 3 | `settings.spec.ts` privacy tab | The tab click landed before React hydration attached the Radix handler, so the panel never switched (the body still showed the Profile panel) | The spec waits for `aria-selected="true"` on the trigger before reading the panel copy |

## Not run (blocked)

- k6 load suites — need the full running stack.
- Strix pentest — the CLI is installed but every configured provider refused the run
  (quota exhausted / model end-of-life / no credits). The independent review recorded
  in `.ai/SECURITY-STATUS.md` covers the changed code paths.
- A third-party review of the re-review fix has not run yet; the reviewer
  reproductions are covered by the regression tests listed above.

## How to reproduce green

```powershell
docker compose up -d postgres redis
npx prisma migrate deploy
npx vitest run
npx tsc -p tsconfig.check.json --noEmit
npm run lint
npm run build
```
