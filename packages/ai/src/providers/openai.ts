import OpenAI from 'openai';
import { AIProvider } from './provider-manager';
import { ModelConfig } from '@openio/shared';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateText(prompt: string, options?: any): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: options.model || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options.maxTokens,
      temperature: options.temperature || 0.7,
    });
    return completion.choices[0].message.content || '';
  }

  async *streamText(prompt: string, options?: any): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: options.model || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) yield content;
    }
  }

  async getModels(): Promise<ModelConfig[]> {
    // In a real app, fetch from API or use a static list
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        contextWindow: 128000,
        maxOutputTokens: 4096,
        supportsStreaming: true,
        supportsVision: true,
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        contextWindow: 16385,
        maxOutputTokens: 4096,
        supportsStreaming: true,
      },
    ];
  }
}