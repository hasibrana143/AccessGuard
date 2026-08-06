# Volume 5 — Model Routing

## 1. Module

`src/ai/model-router.ts` — OpenAI-compatible `/chat/completions` client.

- Tries **primary** provider, then optional **fallback**, then returns `null` (caller degrades to template).
- Per-provider **timeout via AbortController** (default 30s).
- Parses `usage` (`prompt_tokens`, `completion_tokens`, `total_tokens`) when the provider returns it.
- Skips providers without an API key (no blind requests).

## 2. Configuration (env)

| Env | Default | Purpose |
| --- | --- | --- |
| `AI_API_KEY` | — | primary key |
| `AI_MODEL` | `meta/llama-3.3-70b-instruct` | primary model |
| `AI_BASE_URL` | `https://integrate.api.nvidia.com/v1` | primary endpoint |
| `AI_TIMEOUT_MS` | `30000` | primary timeout |
| `AI_API_KEY_FALLBACK` | primary key | fallback key |
| `AI_MODEL_FALLBACK` | — | fallback model (if unset → single-provider) |
| `AI_BASE_URL_FALLBACK` | — | fallback endpoint (required with AI_MODEL_FALLBACK) |
| `AI_TIMEOUT_MS_FALLBACK` | `30000` | fallback timeout |

Use case: NVIDIA NIM primary + OpenAI/Anthropic-compatible secondary, or cheap model →
capable model on failure.

## 3. Behavior guarantees

- **Send both** (already in `remediation.ts`): system + user message (temp 0.2, max_tokens 1000).
- If fallback succeeds it is used; the response records `model` + `baseUrl` for cost attribution.
- On all-fail: `null` → template path (confidence 0.5), never an exception to the user.

## 4. Recovery & observability
- `logger.warn` records which provider was used/failed per `violationId`.
- Route/batch write a `remediation.ai_cost` audit event with the winning `model`.

## 5. Tests
`src/ai/__tests__/model-router.test.ts` — primary ok / 5xx fallback / all-fail null /
no-key skip / usage parse / single-provider env.