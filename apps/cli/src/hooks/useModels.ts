import { useState, useEffect } from 'react';
import type { ModelConfig } from '@openio/shared';
import { providerManager, OpenAIProvider, AnthropicProvider, GroqProvider, DeepSeekProvider, OllamaProvider, modelRegistry, loadModels } from '@openio/ai';

interface UseModelsReturn {
  models: ModelConfig[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useModels(provider?: string): UseModelsReturn {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      providerManager.registerProvider('openai', new OpenAIProvider());
      providerManager.registerProvider('anthropic', new AnthropicProvider());
      providerManager.registerProvider('groq', new GroqProvider());
      providerManager.registerProvider('deepseek', new DeepSeekProvider());
      providerManager.registerProvider('ollama', new OllamaProvider());
      await loadModels({ refresh: true });
      setModels(provider ? modelRegistry.getByProvider(provider) : modelRegistry.getAll());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [provider]);

  return { models, isLoading, error, refresh };
}
