import { Ollama } from 'ollama';
import type { ModelConfig } from '@openio/shared';
import { ProviderError } from '@openio/shared';
import type {
  AIProvider,
  GenerateOptions,
  GenerateResult,
  ChatMessage,
} from './provider-manager.js';

function toOllamaMessages(msgs: ChatMessage[]): { role: string; content: string }[] {
  return msgs.map((m) => ({ role: m.role, content: m.content }));
}

export class OllamaProvider implements AIProvider {
  readonly name = 'ollama';
  private client: Ollama;

  constructor(host?: string) {
    this.client = new Ollama({ host: host ?? process.env.OLLAMA_HOST ?? 'http://localhost:11434' });
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    try {
      const response = await this.client.chat({
        model: options.model,
        messages: toOllamaMessages(options.messages),
        options: {
          temperature: options.temperature,
          top_p: options.topP,
          stop: options.stop,
          num_predict: options.maxTokens,
        },
      });

      return {
        content: response.message?.content ?? '',
        finishReason: 'stop',
        model: response.model ?? options.model,
      };
    } catch (err) {
      throw new ProviderError(`Ollama generate failed: ${(err as Error).message}`, 'ollama');
    }
  }

  async *streamGenerate(options: GenerateOptions): AsyncIterable<GenerateResult> {
    try {
      const stream = await this.client.chat({
        model: options.model,
        messages: toOllamaMessages(options.messages),
        options: {
          temperature: options.temperature,
          top_p: options.topP,
          stop: options.stop,
          num_predict: options.maxTokens,
        },
        stream: true,
      });

      for await (const chunk of stream) {
        if (chunk.message?.content) {
          yield { content: chunk.message.content, finishReason: 'stop' as const, model: chunk.model ?? options.model };
        }
        if (chunk.done) {
          yield {
            content: '',
            finishReason: 'stop',
            usage: chunk.eval_count
              ? {
                  promptTokens: chunk.prompt_eval_count ?? 0,
                  completionTokens: chunk.eval_count,
                  totalTokens: (chunk.prompt_eval_count ?? 0) + chunk.eval_count,
                }
              : undefined,
            model: chunk.model ?? options.model,
          };
        }
      }
    } catch (err) {
      throw new ProviderError(`Ollama stream failed: ${(err as Error).message}`, 'ollama');
    }
  }

  async getModels(): Promise<ModelConfig[]> {
    try {
      const list = await this.client.list();
      return list.models.map((m) => ({
        id: m.name,
        name: m.name,
        provider: 'ollama',
        contextWindow: m.details?.parameter_size ? 32768 : 4096,
        maxOutputTokens: 4096,
        supportsStreaming: true,
      }));
    } catch {
      return [
        { id: 'llama3.2', name: 'Llama 3.2', provider: 'ollama', contextWindow: 8192, maxOutputTokens: 4096, supportsStreaming: true },
        { id: 'mistral', name: 'Mistral', provider: 'ollama', contextWindow: 8192, maxOutputTokens: 4096, supportsStreaming: true },
        { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'ollama', contextWindow: 8192, maxOutputTokens: 4096, supportsStreaming: true },
      ];
    }
  }
}
