import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { ModelConfig } from '@openio/shared';
import { ConfigError, ProviderError } from '@openio/shared';
import { getLogger } from '@openio/shared';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface GenerateOptions {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string[];
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'any' | 'none' | { type: 'function'; function: { name: string } };
  stream?: boolean;
  signal?: AbortSignal;
}

export interface GenerateResult {
  content: string;
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'length' | 'tool_calls' | 'error';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

export interface AIProvider {
  readonly name: string;
  generate(options: GenerateOptions): Promise<GenerateResult>;
  streamGenerate(options: GenerateOptions): AsyncIterable<GenerateResult>;
  getModels(): Promise<ModelConfig[]>;
}

export interface ProviderInfo {
  name: string;
  label: string;
  configured: boolean;
  keyPresent: boolean;
  models: number;
}

const CACHE_PATH = join(homedir(), '.openio', 'models-cache.json');
const CACHE_TTL = 3_600_000;

type CacheStore = Record<string, { timestamp: number; models: ModelConfig[] }>;

function loadModelCache(): CacheStore {
  try {
    if (existsSync(CACHE_PATH)) return JSON.parse(readFileSync(CACHE_PATH, 'utf-8'));
  } catch { /* ignore */ }
  return {};
}

function saveModelCache(data: CacheStore): void {
  const dir = join(homedir(), '.openio');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(data), 'utf-8');
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxRetries?: number; baseDelay?: number; maxDelay?: number } = {},
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 30000 } = opts;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries) break;
      const delay = Math.min(baseDelay * 2 ** attempt + Math.random() * 1000, maxDelay);
      getLogger().warn({ attempt, delay }, `Retry after error: ${(err as Error).message}`);
      await sleep(delay);
    }
  }
  throw lastError;
}

export class ProviderManager {
  private providers = new Map<string, AIProvider>();
  private apiKeys = new Map<string, string[]>();
  private keyIndex = new Map<string, number>();

  registerProvider(id: string, provider: AIProvider): void {
    this.providers.set(id, provider);
  }

  registerApiKeys(providerId: string, keys: string[]): void {
    this.apiKeys.set(providerId, keys.filter(Boolean));
    this.keyIndex.set(providerId, 0);
  }

  getApiKey(providerId: string): string | undefined {
    const keys = this.apiKeys.get(providerId);
    if (!keys || keys.length === 0) return undefined;
    const idx = this.keyIndex.get(providerId) ?? 0;
    const key = keys[idx];
    this.keyIndex.set(providerId, (idx + 1) % keys.length);
    return key;
  }

  getProvider(id: string): AIProvider {
    const p = this.providers.get(id);
    if (!p) throw new ConfigError(`Provider '${id}' not registered`);
    return p;
  }

  hasProvider(id: string): boolean {
    return this.providers.has(id);
  }

  listProviders(): string[] {
    return [...this.providers.keys()];
  }

  getProviderInfo(name: string, keyPresent: boolean): ProviderInfo {
    const labels: Record<string, string> = {
      openai: 'OpenAI', anthropic: 'Anthropic', groq: 'Groq',
      deepseek: 'DeepSeek', kimi: 'Kimi', openrouter: 'OpenRouter', ollama: 'Ollama',
    };
    const cached = loadModelCache();
    return {
      name,
      label: labels[name] ?? name,
      configured: this.providers.has(name),
      keyPresent,
      models: cached[name]?.models?.length ?? 0,
    };
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const providerId = options.model.includes('/') ? options.model.split('/')[0] : options.model;
    const provider = this.getProvider(providerId);
    return withRetry(() => provider.generate(options), { maxRetries: 3, baseDelay: 1000 });
  }

  async *streamGenerate(options: GenerateOptions): AsyncIterable<GenerateResult> {
    const providerId = options.model.includes('/') ? options.model.split('/')[0] : options.model;
    const provider = this.getProvider(providerId);
    for await (const chunk of provider.streamGenerate(options)) {
      yield chunk;
    }
  }

  async listModels(providerName: string, forceRefresh = false): Promise<ModelConfig[]> {
    const cache = loadModelCache();
    const cached = cache[providerName];

    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.models;
    }

    const provider = this.getProvider(providerName);
    const models = await provider.getModels();

    cache[providerName] = { timestamp: Date.now(), models };
    saveModelCache(cache);

    return models;
  }

  async testConnection(providerName: string): Promise<{ ok: boolean; error?: string; latencyMs: number }> {
    const start = Date.now();
    try {
      const provider = this.getProvider(providerName);
      await provider.getModels();
      return { ok: true, latencyMs: Date.now() - start };
    } catch (err) {
      return { ok: false, error: (err as Error).message, latencyMs: Date.now() - start };
    }
  }

  getCachedModels(providerName: string): ModelConfig[] {
    const cache = loadModelCache();
    return cache[providerName]?.models ?? [];
  }

  clearCache(): void {
    saveModelCache({});
  }
}

export const providerManager = new ProviderManager();
