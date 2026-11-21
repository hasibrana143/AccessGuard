# Volume 5 — Validation Engine

## 1. Layers (verified)

A fix passes four layers before it can touch a repository. Each layer can stop it.

1. **Safety validation** — `validateRemediation` (`src/lib/github-pr.ts`):
   blocks `<script>` injection and `javascript:` URI schemes; blocks event-handler
   attribute injection (`onclick` etc.); rejects unclosed tags; size cap 20k chars.
2. **Rule validation** — `validateFixForRule` (`src/lib/fix-validation.ts`): the fix
   must contain what the rule needs (an `alt=`, a `<label>`, an accessible name).
3. **Placeholder rejection** — `containsPlaceholder` (`src/lib/ast-patch.ts`): a fix
   that still says `TODO`, `FIXME`, `{{alt_text}}`, `YOUR_ALT_TEXT` is discarded. It
   is not a fix, it is a note about a fix.
4. **Structural patching** — `locateElement` / `buildReplacement` (`src/lib/ast-patch.ts`):
   the target element is located in the source and the patch is written there, then the
   result is re-parsed. A patch that would not parse is discarded.
5. **Verification** — `verifyFixes` (`src/lib/fix-verification.ts`): axe is re-run on
   the patched element. Only a verified fix may open a PR (see `FIX_VERIFICATION.md`).

Output is embedded in an `accessguard/fix-{rule}-{date}-{ts}` branch PR with a summary
file — a human reviews before merge; nothing auto-merges.

## 2. Purpose

- Prevent AI-generated code from introducing XSS/second-order injection into customer codebases.
- Keep PRs small, focused, reviewable — enterprise-friendly.
- Never claim a fix was made when it was not.

## 3. Tests

- `src/lib/__tests__/fix-validation.test.ts` — injection and per-rule checks.
- `src/lib/__tests__/github-pr.test.ts` — occurrence-aware patching, placeholder and
  no-op rejection, syntax guard.
- `src/lib/__tests__/ast-patch.test.ts` — AST location, JSX conversion, parse guard.
- `src/lib/__tests__/fix-verification.test.ts` — gate semantics + real axe runs.

## 4. Roadmap

- Vue / Svelte / Astro AST support (currently these file types fall back to an exact
  text match, which is conservative and can miss).
- Full page re-scan verification (needs the customer's build; today verification is
  rule-level on the patched element).
