import OpenAI from 'openai';
import type { ModelConfig } from '@openio/shared';
import { ProviderError } from '@openio/shared';
import type {
  AIProvider,
  GenerateOptions,
  GenerateResult,
  ChatMessage,
} from './provider-manager.js';

function mapMessages(msgs: ChatMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
  return msgs.map((m) => {
    if (m.role === 'system') return { role: 'system', content: m.content } as const;
    if (m.role === 'tool') return { role: 'tool', content: m.content, tool_call_id: m.tool_call_id! } as const;
    if (m.tool_calls) {
      return {
        role: 'assistant',
        content: m.content || null,
        tool_calls: m.tool_calls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.function.name, arguments: tc.function.arguments },
        })),
      } as const;
    }
    return { role: m.role, content: m.content } as const;
  });
}

export class KimiProvider implements AIProvider {
  readonly name = 'kimi';
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey ?? process.env.KIMI_API_KEY,
      baseURL: 'https://api.moonshot.cn/v1',
    });
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    try {
      const completion = await this.client.chat.completions.create({
        model: options.model,
        messages: mapMessages(options.messages),
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        top_p: options.topP,
      });

      return {
        content: completion.choices[0]?.message?.content ?? '',
        finishReason: completion.choices[0]?.finish_reason === 'stop' ? 'stop' : 'length',
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
        model: completion.model ?? options.model,
      };
    } catch (err) {
      throw new ProviderError(`Kimi generate failed: ${(err as Error).message}`, 'kimi');
    }
  }

  async *streamGenerate(options: GenerateOptions): AsyncIterable<GenerateResult> {
    try {
      const stream = await this.client.chat.completions.create({
        model: options.model,
        messages: mapMessages(options.messages),
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        top_p: options.topP,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content ?? '';
        if (content) {
          yield { content, finishReason: 'stop' as const, model: chunk.model ?? options.model };
        }
        if (chunk.choices[0]?.finish_reason) {
          yield {
            content: '',
            finishReason: chunk.choices[0].finish_reason === 'stop' ? 'stop' : 'length',
            model: chunk.model ?? options.model,
          };
        }
      }
    } catch (err) {
      throw new ProviderError(`Kimi stream failed: ${(err as Error).message}`, 'kimi');
    }
  }

  async getModels(): Promise<ModelConfig[]> {
    return [
      { id: 'moonshot-v1-8k', name: 'Moonshot v1 8K', provider: 'kimi', contextWindow: 8192, maxOutputTokens: 2048, supportsStreaming: true },
      { id: 'moonshot-v1-32k', name: 'Moonshot v1 32K', provider: 'kimi', contextWindow: 32768, maxOutputTokens: 4096, supportsStreaming: true },
      { id: 'moonshot-v1-128k', name: 'Moonshot v1 128K', provider: 'kimi', contextWindow: 128000, maxOutputTokens: 4096, supportsStreaming: true },
    ];
  }
}
