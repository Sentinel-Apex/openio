process.env.OPENAI_API_KEY = 'sk-test-fake-key-for-mock';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProviderManager } from '@openio/ai';

describe('ProviderManager', () => {
  let pm: ProviderManager;

  beforeEach(() => {
    pm = new ProviderManager();
  });

  it('registers and retrieves providers', () => {
    const mockProvider = {
      name: 'test',
      generate: vi.fn(),
      streamGenerate: vi.fn(),
      getModels: vi.fn().mockResolvedValue([]),
    };
    pm.registerProvider('test', mockProvider as any);
    expect(pm.hasProvider('test')).toBe(true);
    expect(pm.listProviders()).toContain('test');
  });

  it('throws for unknown providers', () => {
    expect(() => pm.getProvider('nonexistent')).toThrow();
  });

  it('supports API key rotation', () => {
    pm.registerApiKeys('test', ['key1', 'key2']);
    expect(pm.getApiKey('test')).toBe('key1');
    expect(pm.getApiKey('test')).toBe('key2');
    expect(pm.getApiKey('test')).toBe('key1');
  });

  it('returns undefined for missing API keys', () => {
    expect(pm.getApiKey('unknown')).toBeUndefined();
  });

  it('generates text via registered provider', async () => {
    const mockProvider = {
      name: 'test-provider',
      generate: vi.fn().mockResolvedValue({
        content: 'mock response',
        finishReason: 'stop',
        model: 'test-model',
      }),
      streamGenerate: vi.fn(),
      getModels: vi.fn().mockResolvedValue([]),
    };
    pm.registerProvider('test-provider', mockProvider as any);
    const result = await pm.generate({
      model: 'test-provider/test-model',
      messages: [{ role: 'user', content: 'Hello' }],
    });
    expect(result.content).toBe('mock response');
    expect(result.finishReason).toBe('stop');
  });
});
