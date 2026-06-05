import type { ModelConfig } from '@openio/shared';

export class ModelRegistry {
  private models = new Map<string, ModelConfig>();

  register(model: ModelConfig): void {
    this.models.set(model.id, model);
  }

  registerMany(models: ModelConfig[]): void {
    for (const m of models) this.register(m);
  }

  get(modelId: string): ModelConfig | undefined {
    return this.models.get(modelId);
  }

  getAll(): ModelConfig[] {
    return [...this.models.values()];
  }

  getByProvider(provider: string): ModelConfig[] {
    return this.getAll().filter((m) => m.provider === provider);
  }

  getByCapability(capability: 'vision' | 'streaming'): ModelConfig[] {
    if (capability === 'vision') return this.getAll().filter((m) => m.supportsVision);
    if (capability === 'streaming') return this.getAll().filter((m) => m.supportsStreaming);
    return [];
  }

  find(search: string): ModelConfig[] {
    const q = search.toLowerCase();
    return this.getAll().filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q),
    );
  }

  clear(): void {
    this.models.clear();
  }

  get size(): number {
    return this.models.size;
  }
}

export const modelRegistry = new ModelRegistry();
