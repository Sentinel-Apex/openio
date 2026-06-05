import Groq from 'groq-sdk';
import type { ModelConfig } from '@openio/shared';
import { ProviderError } from '@openio/shared';
import type {
  AIProvider,
  GenerateOptions,
  GenerateResult,
  ChatMessage,
} from './provider-manager.js';

type GroqMessage = {
  role: string;
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id?: string;
    function?: { arguments?: string; name?: string };
    type?: string;
  }>;
};

function mapMessages(msgs: ChatMessage[]): GroqMessage[] {
  return msgs.map((m) => {
    const base: GroqMessage = { role: m.role, content: m.content };
    if (m.name) base.name = m.name;
    if (m.tool_call_id) base.tool_call_id = m.tool_call_id;
    if (m.tool_calls) {
      base.tool_calls = m.tool_calls.map((tc) => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.function.name, arguments: tc.function.arguments },
      }));
    }
    return base;
  });
}

export class GroqProvider implements AIProvider {
  readonly name = 'groq';
  private client: Groq;

  constructor(apiKey?: string) {
    this.client = new Groq({
      apiKey: apiKey ?? process.env.GROQ_API_KEY,
    });
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    try {
      const completion = await this.client.chat.completions.create({
        model: options.model,
        messages: mapMessages(options.messages) as any,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        top_p: options.topP,
        stop: options.stop,
      });

      const usage = completion.usage;
      return {
        content: completion.choices[0]?.message?.content ?? '',
        finishReason: completion.choices[0]?.finish_reason === 'stop' ? 'stop' : 'length',
        usage: usage
          ? {
              promptTokens: usage.prompt_tokens ?? 0,
              completionTokens: usage.completion_tokens ?? 0,
              totalTokens: usage.total_tokens ?? 0,
            }
          : undefined,
        model: completion.model ?? options.model,
      };
    } catch (err) {
      throw new ProviderError(`Groq generate failed: ${(err as Error).message}`, 'groq');
    }
  }

  async *streamGenerate(options: GenerateOptions): AsyncIterable<GenerateResult> {
    try {
      const stream = await this.client.chat.completions.create({
        model: options.model,
        messages: mapMessages(options.messages) as any,
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
      throw new ProviderError(`Groq stream failed: ${(err as Error).message}`, 'groq');
    }
  }

  async getModels(): Promise<ModelConfig[]> {
    return [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', provider: 'groq', contextWindow: 128000, maxOutputTokens: 8192, supportsStreaming: true },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', provider: 'groq', contextWindow: 128000, maxOutputTokens: 8192, supportsStreaming: true },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', provider: 'groq', contextWindow: 32768, maxOutputTokens: 4096, supportsStreaming: true },
      { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 70B', provider: 'groq', contextWindow: 128000, maxOutputTokens: 16384, supportsStreaming: true },
    ];
  }
}
