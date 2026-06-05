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
    if (m.role === 'tool') {
      return { role: 'tool', content: m.content, tool_call_id: m.tool_call_id! } as const;
    }
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
    if (m.role === 'system') {
      return { role: 'system', content: m.content } as const;
    }
    return { role: m.role, content: m.content } as const;
  });
}

function mapTools(tools?: GenerateOptions['tools']): OpenAI.Chat.ChatCompletionTool[] | undefined {
  if (!tools || tools.length === 0) return undefined;
  return tools.map((t) => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }));
}

function fromOpenAICompletion(
  completion: OpenAI.Chat.ChatCompletion,
  model: string,
): GenerateResult {
  const choice = completion.choices[0];
  return {
    content: choice.message.content ?? '',
    toolCalls: choice.message.tool_calls?.map((tc) => ({
      id: tc.id,
      type: 'function' as const,
      function: { name: tc.function.name, arguments: tc.function.arguments },
    })),
    finishReason: mapFinishReason(choice.finish_reason),
    usage: completion.usage
      ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
        }
      : undefined,
    model: completion.model ?? model,
  };
}

function mapFinishReason(
  reason: string | null | undefined,
): GenerateResult['finishReason'] {
  switch (reason) {
    case 'stop': return 'stop';
    case 'length': return 'length';
    case 'tool_calls': return 'tool_calls';
    default: return 'error';
  }
}

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  private client: OpenAI;

  constructor(apiKey?: string, baseUrl?: string) {
    this.client = new OpenAI({
      apiKey: apiKey ?? process.env.OPENAI_API_KEY,
      baseURL: baseUrl ?? process.env.OPENAI_BASE_URL,
    });
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    try {
      const completion = await this.client.chat.completions.create(
        {
          model: options.model,
          messages: mapMessages(options.messages),
          max_tokens: options.maxTokens,
          temperature: options.temperature,
          top_p: options.topP,
          stop: options.stop,
          tools: mapTools(options.tools),
          tool_choice: options.toolChoice as any,
        },
        { signal: options.signal },
      );
      return fromOpenAICompletion(completion, options.model);
    } catch (err) {
      throw new ProviderError(`OpenAI generate failed: ${(err as Error).message}`, 'openai');
    }
  }

  async *streamGenerate(options: GenerateOptions): AsyncIterable<GenerateResult> {
    try {
      const stream = await this.client.chat.completions.create(
        {
          model: options.model,
          messages: mapMessages(options.messages),
          max_tokens: options.maxTokens,
          temperature: options.temperature,
          top_p: options.topP,
          stop: options.stop,
          tools: mapTools(options.tools),
          tool_choice: options.toolChoice as any,
          stream: true,
          stream_options: { include_usage: true },
        },
        { signal: options.signal },
      );

      let collectedToolCalls: Map<number, { id: string; name: string; args: string }> = new Map();

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta;
        if (delta?.content) {
          yield {
            content: delta.content,
            finishReason: 'stop',
            model: chunk.model ?? options.model,
          };
        }
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index;
            if (!collectedToolCalls.has(idx)) {
              collectedToolCalls.set(idx, { id: tc.id ?? '', name: '', args: '' });
            }
            const entry = collectedToolCalls.get(idx)!;
            if (tc.id) entry.id = tc.id;
            if (tc.function?.name) entry.name += tc.function.name;
            if (tc.function?.arguments) entry.args += tc.function.arguments;
          }
          yield {
            content: '',
            finishReason: 'tool_calls',
            model: chunk.model ?? options.model,
          };
        }

        const finish = chunk.choices?.[0]?.finish_reason;
        if (finish) {
          const toolCalls =
            collectedToolCalls.size > 0
              ? [...collectedToolCalls.values()].map((tc) => ({
                  id: tc.id,
                  type: 'function' as const,
                  function: { name: tc.name, arguments: tc.args },
                }))
              : undefined;

          yield {
            content: '',
            toolCalls,
            finishReason: mapFinishReason(finish),
            usage: (chunk as any).usage
              ? {
                  promptTokens: (chunk as any).usage.prompt_tokens,
                  completionTokens: (chunk as any).usage.completion_tokens,
                  totalTokens: (chunk as any).usage.total_tokens,
                }
              : undefined,
            model: chunk.model ?? options.model,
          };
        }
      }
    } catch (err) {
      throw new ProviderError(`OpenAI stream failed: ${(err as Error).message}`, 'openai');
    }
  }

  async getModels(): Promise<ModelConfig[]> {
    try {
      const list = await this.client.models.list();
      return list.data
        .filter((m) => m.id.startsWith('gpt'))
        .map((m) => ({
          id: m.id,
          name: m.id,
          provider: 'openai',
          contextWindow: 128000,
          maxOutputTokens: 4096,
          supportsStreaming: true,
          supportsVision: m.id.includes('vision') || m.id === 'gpt-4o',
        }));
    } catch {
      return [
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', contextWindow: 128000, maxOutputTokens: 4096, supportsStreaming: true, supportsVision: true },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', contextWindow: 128000, maxOutputTokens: 16384, supportsStreaming: true, supportsVision: true },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', contextWindow: 16385, maxOutputTokens: 4096, supportsStreaming: true },
      ];
    }
  }
}
