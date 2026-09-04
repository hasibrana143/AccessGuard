# Volume 5 & 22 — Zero-Budget Resilient Model Routing Mesh

## 1. Architecture

`src/ai/model-router.ts` — OpenAI-compatible resilient multi-provider AI mesh with dynamic circuit breaking and auto-failover.

- **Zero-Budget Design ($0.00 Inference Cost):**
  - **OpenRouter Free Tier:** Curated pool of top free models (`meta-llama/llama-3.3-70b-instruct:free`, `qwen/qwen-2.5-coder-32b-instruct:free`, `google/gemini-2.0-flash-exp:free`, `deepseek/deepseek-r1:free`, `mistralai/mistral-small-24b-instruct-2501:free`, `openrouter/free`).
  - **NVIDIA NIM Developer Tier (`https://integrate.api.nvidia.com/v1`):** 1,000 free inference credits on enterprise models (`meta/llama-3.3-70b-instruct`, `qwen/qwen2.5-coder-32b-instruct`, `deepseek-ai/deepseek-r1`, `nvidia/nemotron-4-340b-instruct`).
- **Dynamic 429 / 402 Auto-Failover:**
  - If a provider/model returns HTTP `429` (Rate Limited), the system instantly throttles that specific model in memory for 60 seconds and immediately rotates to the next available free model in the mesh without failing the user's request.
  - If a model returns HTTP `402` (Payment/Quota Exceeded), it throttles for 300 seconds and fails over to the alternative provider.
- **Fail-Safe Offline Guarantee:** If all external providers fail or network connectivity drops, the router returns `null`, seamlessly degrading to `renderTemplateFix` (deterministic AST templates). The end-user never sees an error.

## 2. Configuration (Environment Variables)

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | — | OpenRouter API key for `:free` models |
| `NVIDIA_API_KEY` | — | NVIDIA NIM developer API key |
| `AI_PROVIDER_PRIORITY` | `openrouter,nvidia` | Provider rotation order (`openrouter,nvidia` or `nvidia,openrouter`) |
| `AI_FREE_TIER` | `true` | Locks all token accounting to $0.00 USD in audit logs |
| `AI_API_KEY` | — | Primary fallback key (or NVIDIA key) |
| `AI_MODEL` | `meta/llama-3.3-70b-instruct` | Explicit primary model override |
| `AI_BASE_URL` | `https://integrate.api.nvidia.com/v1` | Primary endpoint override |
| `AI_TIMEOUT_MS` | `30000` | Per-request timeout (ms) |

## 3. Circuit Breaker & Safety Guarantees

- **In-Memory Circuit Breaker:** `isModelThrottled()`, `throttleModel()`, and `resetCircuitBreaker()` prevent hammering rate-limited endpoints.
- **Attribution Headers:** Automatically includes `HTTP-Referer: https://accessguard.io` and `X-Title` on OpenRouter requests for optimal priority.
- **Accurate Token Metrics:** Ingests `promptTokens`, `completionTokens`, and `totalTokens` for observability while ensuring `costUsd: 0.00` in `src/ai/cost.ts`.

## 4. Tests
`src/ai/__tests__/model-router.test.ts` (11 tests):
- Primary 200 OK + usage parsing
- 429 rate limit auto-rotation to secondary model
- 402 payment/quota failover
- 5xx retry and failover
- OpenRouter free pool generation
- NVIDIA NIM free pool generation
- Circuit breaker throttle verification