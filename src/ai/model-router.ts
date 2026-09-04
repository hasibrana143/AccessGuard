// Volume 5 — Model Router
// OpenAI-compatible chat completions with primary → fallback routing and timeouts.
// Returns null when every configured provider fails so callers can degrade to templates.

export interface ModelConfig {
  model: string;
  baseUrl: string;
  apiKey?: string;
  timeoutMs: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ModelUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ModelResult {
  content: string;
  model: string;
  baseUrl: string;
  usage: ModelUsage | null;
}

const DEFAULT_TIMEOUT_MS = 30_000;

// Curated high-performance free models for code remediation and WCAG compliance
export const OPENROUTER_FREE_MODELS: readonly string[] = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen-2.5-coder-32b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'deepseek/deepseek-r1:free',
  'mistralai/mistral-small-24b-instruct-2501:free',
  'openrouter/free',
];

export const NVIDIA_FREE_MODELS: readonly string[] = [
  'meta/llama-3.3-70b-instruct',
  'qwen/qwen2.5-coder-32b-instruct',
  'deepseek-ai/deepseek-r1',
  'nvidia/nemotron-4-340b-instruct',
  'mistralai/mistral-large-2-instruct',
];

// In-memory circuit breaker to temporarily skip throttled models
const throttledUntil = new Map<string, number>();

export function isModelThrottled(modelKey: string): boolean {
  const expiresAt = throttledUntil.get(modelKey);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    throttledUntil.delete(modelKey);
    return false;
  }
  return true;
}

export function throttleModel(modelKey: string, durationMs = 60_000): void {
  throttledUntil.set(modelKey, Date.now() + durationMs);
}

export function resetCircuitBreaker(): void {
  throttledUntil.clear();
}

/**
 * Builds the prioritized list of model configurations.
 * Supports explicit AI_MODEL / AI_MODEL_FALLBACK configurations, as well as
 * auto-populating OpenRouter and NVIDIA NIM free-tier models for zero-budget failover.
 */
export function getModelConfigs(): ModelConfig[] {
  const configs: ModelConfig[] = [];
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

  const customPrimary = process.env.AI_MODEL;
  const customFallback = process.env.AI_MODEL_FALLBACK;
  const customFallbackBase = process.env.AI_BASE_URL_FALLBACK;

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const nvidiaKey = process.env.NVIDIA_API_KEY || (process.env.AI_BASE_URL?.includes('nvidia') ? process.env.AI_API_KEY : undefined);

  // If explicit single/fallback models are configured (legacy mode & test suites)
  if (customPrimary) {
    const primaryConfig: ModelConfig = {
      model: customPrimary,
      baseUrl: process.env.AI_BASE_URL || 'https://integrate.api.nvidia.com/v1',
      apiKey: process.env.AI_API_KEY || nvidiaKey || openRouterKey,
      timeoutMs,
    };
    configs.push(primaryConfig);

    if (customFallback && customFallbackBase) {
      configs.push({
        model: customFallback,
        baseUrl: customFallbackBase,
        apiKey: process.env.AI_API_KEY_FALLBACK || primaryConfig.apiKey,
        timeoutMs: Number(process.env.AI_TIMEOUT_MS_FALLBACK) || timeoutMs,
      });
      return configs;
    }

    if (customFallback === '') {
      return configs;
    }
  }

  // Priority ordering: default is OpenRouter free pool first, followed by NVIDIA NIM free pool
  const priority = (process.env.AI_PROVIDER_PRIORITY || 'openrouter,nvidia')
    .toLowerCase()
    .split(',')
    .map((p) => p.trim());

  const addOpenRouterPool = () => {
    if (openRouterKey) {
      for (const model of OPENROUTER_FREE_MODELS) {
        if (!configs.some((c) => c.model === model && c.baseUrl.includes('openrouter'))) {
          configs.push({
            model,
            baseUrl: 'https://openrouter.ai/api/v1',
            apiKey: openRouterKey,
            timeoutMs,
          });
        }
      }
    }
  };

  const addNvidiaPool = () => {
    const key = nvidiaKey || process.env.AI_API_KEY;
    if (key) {
      for (const model of NVIDIA_FREE_MODELS) {
        if (!configs.some((c) => c.model === model && c.baseUrl.includes('nvidia'))) {
          configs.push({
            model,
            baseUrl: 'https://integrate.api.nvidia.com/v1',
            apiKey: key,
            timeoutMs,
          });
        }
      }
    }
  };

  for (const provider of priority) {
    if (provider === 'openrouter') {
      addOpenRouterPool();
    } else if (provider === 'nvidia') {
      addNvidiaPool();
    }
  }

  if (!priority.includes('openrouter')) addOpenRouterPool();
  if (!priority.includes('nvidia')) addNvidiaPool();

  if (configs.length === 0) {
    configs.push({
      model: 'meta/llama-3.3-70b-instruct',
      baseUrl: 'https://integrate.api.nvidia.com/v1',
      apiKey: process.env.AI_API_KEY,
      timeoutMs,
    });
  }

  return configs;
}

function parseUsage(data: { usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } }): ModelUsage | null {
  const promptTokens = Number(data.usage?.prompt_tokens) || 0;
  const completionTokens = Number(data.usage?.completion_tokens) || 0;
  if (!promptTokens && !completionTokens) return null;
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function callChatCompletions(
  messages: ChatMessage[],
  configs: ModelConfig[] = getModelConfigs(),
  fetchImpl: typeof fetch = fetch
): Promise<ModelResult | null> {
  if (configs.length === 0) return null;

  const lastError: unknown[] = [];

  for (const config of configs) {
    if (!config.apiKey) {
      lastError.push(new Error(`No API key configured for ${config.model}`));
      continue;
    }

    const configKey = `${config.baseUrl}/${config.model}`;
    if (isModelThrottled(configKey)) {
      continue;
    }

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeoutMs);

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        };

        if (config.baseUrl.includes('openrouter.ai')) {
          headers['HTTP-Referer'] = 'https://accessguard.io';
          headers['X-Title'] = 'AccessGuard Accessibility Compliance';
        }

        const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: config.model,
            messages,
            temperature: 0.2,
            max_tokens: 1000,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          lastError.push(new Error(`Provider ${config.model} rejected: ${response.status} ${errorBody.slice(0, 200)}`));

          // 429 (Rate Limit): Throttle model and rotate immediately to the next free model in the mesh
          if (response.status === 429) {
            throttleModel(configKey, 60_000);
            break;
          }

          // 402 (Payment/Quota): Throttle model and failover to next model
          if (response.status === 402) {
            throttleModel(configKey, 300_000);
            break;
          }

          // 4xx other client errors (e.g. 400 bad request, 401 unauthorized): don't retry, try next provider
          if (response.status >= 400 && response.status < 500) break;
          if (attempt < MAX_RETRIES) { await sleep(RETRY_DELAY_MS * (attempt + 1)); continue; }
          break;
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content || '';

        if (!content) {
          lastError.push(new Error(`Provider ${config.model} returned empty content`));
          continue;
        }

        return {
          content,
          model: config.model,
          baseUrl: config.baseUrl,
          usage: parseUsage(data),
        };
      } catch (error) {
        lastError.push(error);
        if (attempt < MAX_RETRIES) { await sleep(RETRY_DELAY_MS * (attempt + 1)); }
      } finally {
        clearTimeout(timer);
      }
    }
  }

  return null;
}