import { ConfigError } from '@openio/shared';
import { modelRegistry } from './registry.js';
import { providerManager } from '../providers/provider-manager.js';
import type { GenerateOptions, GenerateResult } from '../providers/provider-manager.js';

export interface RoutingOptions {
  fallback?: boolean;
  preferProvider?: string;
}

export class ModelRouter {
  private fallbackChain: string[] = [];

  setFallbackChain(models: string[]): void {
    this.fallbackChain = models;
  }

  resolveModel(modelId: string): string {
    const candidate = modelRegistry.get(modelId);
    if (candidate) return candidate.id;

    const fuzzy = modelRegistry.find(modelId);
    if (fuzzy.length > 0) return fuzzy[0].id;

    return modelId;
  }

  async route(options: GenerateOptions, routing?: RoutingOptions): Promise<GenerateResult> {
    const modelId = this.resolveModel(options.model);
    const providerId = this.extractProvider(modelId) ?? modelId;

    if (!providerManager.hasProvider(providerId)) {
      if (!routing?.fallback || this.fallbackChain.length === 0) {
        throw new ConfigError(`No provider available for model: ${modelId}`);
      }
      return this.tryFallback(options);
    }

    try {
      return await providerManager.generate({ ...options, model: modelId });
    } catch (err) {
      if (routing?.fallback) return this.tryFallback(options);
      throw err;
    }
  }

  async *streamRoute(options: GenerateOptions, routing?: RoutingOptions): AsyncIterable<GenerateResult> {
    const modelId = this.resolveModel(options.model);
    const providerId = this.extractProvider(modelId) ?? modelId;

    if (!providerManager.hasProvider(providerId)) {
      if (routing?.fallback && this.fallbackChain.length > 0) {
        for await (const chunk of this.tryFallbackStream(options)) yield chunk;
        return;
      }
      throw new ConfigError(`No provider available for model: ${modelId}`);
    }

    try {
      for await (const chunk of providerManager.streamGenerate({ ...options, model: modelId })) {
        yield chunk;
      }
    } catch (err) {
      if (routing?.fallback) {
        for await (const chunk of this.tryFallbackStream(options)) yield chunk;
        return;
      }
      throw err;
    }
  }

  private extractProvider(modelId: string): string | undefined {
    if (modelId.includes('/')) return modelId.split('/')[0];
    const model = modelRegistry.get(modelId);
    return model?.provider;
  }

  private async tryFallback(options: GenerateOptions): Promise<GenerateResult> {
    for (const fallbackModel of this.fallbackChain) {
      const providerId = this.extractProvider(fallbackModel) ?? fallbackModel;
      if (providerManager.hasProvider(providerId)) {
        try {
          return await providerManager.generate({ ...options, model: fallbackModel });
        } catch {
          continue;
        }
      }
    }
    throw new ConfigError('All fallback models exhausted');
  }

  private async *tryFallbackStream(options: GenerateOptions): AsyncIterable<GenerateResult> {
    for (const fallbackModel of this.fallbackChain) {
      const providerId = this.extractProvider(fallbackModel) ?? fallbackModel;
      if (providerManager.hasProvider(providerId)) {
        try {
          for await (const chunk of providerManager.streamGenerate({ ...options, model: fallbackModel })) {
            yield chunk;
          }
          return;
        } catch {
          continue;
        }
      }
    }
    throw new ConfigError('All fallback models exhausted');
  }
}

export const modelRouter = new ModelRouter();
