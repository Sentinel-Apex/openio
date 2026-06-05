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

export class DeepSeekProvider implements AIProvider {
  readonly name = 'deepseek';
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey ?? process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1',
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
        stop: options.stop,
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
      throw new ProviderError(`DeepSeek generate failed: ${(err as Error).message}`, 'deepseek');
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
        stop: options.stop,
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
      throw new ProviderError(`DeepSeek stream failed: ${(err as Error).message}`, 'deepseek');
    }
  }

  async getModels(): Promise<ModelConfig[]> {
    return [
      { id: 'deepseek-chat', name: 'DeepSeek V3', provider: 'deepseek', contextWindow: 64000, maxOutputTokens: 8192, supportsStreaming: true },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1', provider: 'deepseek', contextWindow: 64000, maxOutputTokens: 8192, supportsStreaming: true },
    ];
  }
}
