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

function mapTools(tools?: GenerateOptions['tools']): OpenAI.Chat.ChatCompletionTool[] | undefined {
  if (!tools?.length) return undefined;
  return tools.map((t) => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }));
}

export class OpenRouterProvider implements AIProvider {
  readonly name = 'openrouter';
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey ?? process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
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
        tools: mapTools(options.tools),
        tool_choice: options.toolChoice as any,
      });

      const choice = completion.choices[0];
      return {
        content: choice.message.content ?? '',
        toolCalls: choice.message.tool_calls?.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.function.name, arguments: tc.function.arguments },
        })),
        finishReason: choice.finish_reason === 'stop' ? 'stop' : 'length',
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
      throw new ProviderError(`OpenRouter generate failed: ${(err as Error).message}`, 'openrouter');
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
        tools: mapTools(options.tools),
        tool_choice: options.toolChoice as any,
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
      throw new ProviderError(`OpenRouter stream failed: ${(err as Error).message}`, 'openrouter');
    }
  }

  async getModels(): Promise<ModelConfig[]> {
    return [
      { id: 'anthropic/claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'openrouter', contextWindow: 200000, maxOutputTokens: 8192, supportsStreaming: true, supportsVision: true },
      { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'openrouter', contextWindow: 128000, maxOutputTokens: 4096, supportsStreaming: true, supportsVision: true },
      { id: 'google/gemini-2.5-pro-exp-03-25', name: 'Gemini 2.5 Pro', provider: 'openrouter', contextWindow: 1048576, maxOutputTokens: 8192, supportsStreaming: true },
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'openrouter', contextWindow: 128000, maxOutputTokens: 8192, supportsStreaming: true },
    ];
  }
}
