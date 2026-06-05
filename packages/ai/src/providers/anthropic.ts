import Anthropic from '@anthropic-ai/sdk';
import type { ModelConfig } from '@openio/shared';
import { ProviderError } from '@openio/shared';
import type {
  AIProvider,
  GenerateOptions,
  GenerateResult,
  ChatMessage,
} from './provider-manager.js';

function mapMessages(msgs: ChatMessage[]): Anthropic.MessageParam[] {
  return msgs
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'tool' ? 'user' : (m.role as 'user' | 'assistant'),
      content: m.content,
    }));
}

function extractSystemPrompt(msgs: ChatMessage[]): string | undefined {
  return msgs.find((m) => m.role === 'system')?.content;
}

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
    });
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    try {
      const msg = await this.client.messages.create({
        model: options.model,
        messages: mapMessages(options.messages),
        system: extractSystemPrompt(options.messages),
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature,
        top_p: options.topP,
        stop_sequences: options.stop,
      });

      const textContent = msg.content.find((c) => c.type === 'text');
      return {
        content: textContent?.type === 'text' ? textContent.text : '',
        finishReason: msg.stop_reason === 'end_turn' ? 'stop' : 'length',
        usage: {
          promptTokens: msg.usage.input_tokens,
          completionTokens: msg.usage.output_tokens,
          totalTokens: msg.usage.input_tokens + msg.usage.output_tokens,
        },
        model: msg.model,
      };
    } catch (err) {
      throw new ProviderError(`Anthropic generate failed: ${(err as Error).message}`, 'anthropic');
    }
  }

  async *streamGenerate(options: GenerateOptions): AsyncIterable<GenerateResult> {
    try {
      const stream = await this.client.messages.create({
        model: options.model,
        messages: mapMessages(options.messages),
        system: extractSystemPrompt(options.messages),
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature,
        top_p: options.topP,
        stop_sequences: options.stop,
        stream: true,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield {
            content: event.delta.text,
            finishReason: 'stop',
            model: options.model,
          };
        }
        if (event.type === 'message_delta') {
          yield {
            content: '',
            finishReason: event.delta.stop_reason === 'end_turn' ? 'stop' : 'length',
            usage: event.usage
              ? {
                  promptTokens: 0,
                  completionTokens: event.usage.output_tokens,
                  totalTokens: event.usage.output_tokens,
                }
              : undefined,
            model: options.model,
          };
        }
      }
    } catch (err) {
      throw new ProviderError(`Anthropic stream failed: ${(err as Error).message}`, 'anthropic');
    }
  }

  async getModels(): Promise<ModelConfig[]> {
    return [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic', contextWindow: 200000, maxOutputTokens: 8192, supportsStreaming: true, supportsVision: true },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic', contextWindow: 200000, maxOutputTokens: 8192, supportsStreaming: true, supportsVision: true },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic', contextWindow: 200000, maxOutputTokens: 8192, supportsStreaming: true, supportsVision: true },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', provider: 'anthropic', contextWindow: 200000, maxOutputTokens: 8192, supportsStreaming: true, supportsVision: true },
    ];
  }
}
