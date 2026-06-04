import { ProviderConfig, ModelConfig, OpenIOError } from '@openio/shared';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { OllamaProvider } from './ollama';
// Import others as needed

export interface AIProvider {
  generateText(prompt: string, options?: any): Promise<string>;
  streamText(prompt: string, options?: any): AsyncIterable<string>;
  getModels(): Promise<ModelConfig[]>;
}

export class ProviderManager {
  private providers: Map<string, AIProvider> = new Map();

  constructor() {
    // Initialize providers lazily or here
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('anthropic', new AnthropicProvider());
    this.providers.set('ollama', new OllamaProvider());
    // Add others
  }

  getProvider(providerId: string): AIProvider {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new OpenIOError(`Provider ${providerId} not found or not implemented.`);
    }
    return provider;
  }

  async listAllModels(): Promise<ModelConfig[]> {
    const allModels: ModelConfig[] = [];
    for (const [id, provider] of this.providers) {
      try {
        const models = await provider.getModels();
        allModels.push(...models);
      } catch (error) {
        console.warn(`Failed to fetch models for ${id}:`, error);
      }
    }
    return allModels;
  }
}

export const providerManager = new ProviderManager();