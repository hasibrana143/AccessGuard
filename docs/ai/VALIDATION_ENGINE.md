# Volume 5 — Validation Engine

## 1. Layers (verified)

Fixes are validated **before** they touch a repo:

1. `validateRemediation` (`src/lib/github-pr.ts`) — generic safety:
   - blocks `<script>` injection and `javascript:` URI schemes;
   - blocks event-handler attribute injection (`onclick` etc.);
   - rejects unclosed tags;
   - size cap 20k chars.
2. `validateFixForRule` (`src/lib/fix-validation.ts`) — per-rule sanity
   (e.g., image-alt fix must contain an `alt=`, label fix must contain a `label`).
3. Confidence gate (`>= 0.7`) at `create-pr` (see CONFIDENCE_SCORING).
4. Output is embedded in a `accessguard/fix-{rule}-{date}-{ts}` branch PR with a summary file —
   a human reviews before merge; nothing auto-merges.

## 2. Purpose

- Prevent AI-generated code from introducing XSS/second-order injection into customer codebases.
- Keep PRs small, focused, reviewable — enterprise-friendly.

## 3. Tests
- `src/lib/__tests__/fix-validation.ts` + `github-pr.ts` suites cover the injection cases.

## 4. Roadmap
- AST-based patch application (replace string-match patching) — robustness.
- Per-fix diff preview endpoint before branch creation.