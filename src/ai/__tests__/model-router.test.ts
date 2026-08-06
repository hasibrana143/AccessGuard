import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { callChatCompletions, getModelConfigs, type ModelConfig } from '@/ai/model-router';

const mockFetch = vi.fn();

function providerResponse(content: string, usage?: Record<string, number>) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content } }],
      usage,
    }),
  } as Response;
}

describe('ai/model-router', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubEnv('AI_API_KEY', 'test-key');
    vi.stubEnv('AI_MODEL', 'primary-model');
    vi.stubEnv('AI_BASE_URL', 'https://primary.test/v1');
    vi.stubEnv('AI_MODEL_FALLBACK', 'fallback-model');
    vi.stubEnv('AI_BASE_URL_FALLBACK', 'https://fallback.test/v1');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('builds primary + fallback configs from env', () => {
    const configs = getModelConfigs();
    expect(configs).toHaveLength(2);
    expect(configs[0].model).toBe('primary-model');
    expect(configs[1].model).toBe('fallback-model');
  });

  it('returns only the primary config when no fallback is set', () => {
    vi.stubEnv('AI_MODEL_FALLBACK', '');
    const configs = getModelConfigs();
    expect(configs).toHaveLength(1);
  });

  it('calls the primary provider and parses usage', async () => {
    mockFetch.mockResolvedValue(providerResponse('---CODE---\nok\n---EXPLANATION---\ne\n---CONFIDENCE---\n0.9', {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
    }));

    const configs: ModelConfig[] = [
      { model: 'primary-model', baseUrl: 'https://primary.test/v1', apiKey: 'k', timeoutMs: 1000 },
    ];
    const result = await callChatCompletions(
      [{ role: 'system', content: 's' }, { role: 'user', content: 'u' }],
      configs,
      mockFetch as unknown as typeof fetch
    );

    expect(result?.model).toBe('primary-model');
    expect(result?.content).toContain('ok');
    expect(result?.usage).toEqual({ promptTokens: 100, completionTokens: 50, totalTokens: 150 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('falls back to the second provider when the first fails', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
      .mockResolvedValueOnce(providerResponse('fallback content'));

    const configs: ModelConfig[] = [
      { model: 'primary-model', baseUrl: 'https://a.test/v1', apiKey: 'k', timeoutMs: 1000 },
      { model: 'fallback-model', baseUrl: 'https://b.test/v1', apiKey: 'k', timeoutMs: 1000 },
    ];
    const result = await callChatCompletions([{ role: 'user', content: 'u' }], configs, mockFetch as unknown as typeof fetch);

    expect(result?.model).toBe('fallback-model');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('returns null when every provider fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503 } as Response);
    const configs: ModelConfig[] = [
      { model: 'a', baseUrl: 'https://a.test/v1', apiKey: 'k', timeoutMs: 1000 },
      { model: 'b', baseUrl: 'https://b.test/v1', apiKey: 'k', timeoutMs: 1000 },
    ];
    const result = await callChatCompletions([{ role: 'user', content: 'u' }], configs, mockFetch as unknown as typeof fetch);
    expect(result).toBeNull();
  });

  it('skips configs without an API key', async () => {
    mockFetch.mockResolvedValue(providerResponse('ok'));
    const configs: ModelConfig[] = [
      { model: 'no-key', baseUrl: 'https://a.test/v1', apiKey: undefined, timeoutMs: 1000 },
    ];
    const result = await callChatCompletions([{ role: 'user', content: 'u' }], configs, mockFetch as unknown as typeof fetch);
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns null usage when the provider omits usage', async () => {
    mockFetch.mockResolvedValue(providerResponse('content'));
    const configs: ModelConfig[] = [
      { model: 'm', baseUrl: 'https://a.test/v1', apiKey: 'k', timeoutMs: 1000 },
    ];
    const result = await callChatCompletions([{ role: 'user', content: 'u' }], configs, mockFetch as unknown as typeof fetch);
    expect(result?.usage).toBeNull();
  });
});