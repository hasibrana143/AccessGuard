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

export function getModelConfigs(): ModelConfig[] {
  const primary: ModelConfig = {
    model: process.env.AI_MODEL || 'meta/llama-3.3-70b-instruct',
    baseUrl: process.env.AI_BASE_URL || 'https://integrate.api.nvidia.com/v1',
    apiKey: process.env.AI_API_KEY,
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
  };

  const fallbackModel = process.env.AI_MODEL_FALLBACK;
  const fallbackBaseUrl = process.env.AI_BASE_URL_FALLBACK;
  const fallbackKey = process.env.AI_API_KEY_FALLBACK;

  if (!fallbackModel || !fallbackBaseUrl) {
    return [primary];
  }

  return [
    primary,
    {
      model: fallbackModel,
      baseUrl: fallbackBaseUrl,
      apiKey: fallbackKey || primary.apiKey,
      timeoutMs: Number(process.env.AI_TIMEOUT_MS_FALLBACK) || DEFAULT_TIMEOUT_MS,
    },
  ];
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

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: 0.2,
          max_tokens: 1000,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        lastError.push(new Error(`Provider ${config.model} rejected: ${response.status}`));
        continue;
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || '';

      return {
        content,
        model: config.model,
        baseUrl: config.baseUrl,
        usage: parseUsage(data),
      };
    } catch (error) {
      lastError.push(error);
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}