import OpenAI from 'openai';
import { ProviderError } from '@openio/shared';

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage?: { promptTokens: number; totalTokens: number };
}

export class OpenAIEmbedding {
  private client: OpenAI;
  private defaultModel = 'text-embedding-3-small';

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async embed(text: string, model?: string): Promise<EmbeddingResult> {
    try {
      const res = await this.client.embeddings.create({
        model: model ?? this.defaultModel,
        input: text,
      });
      return {
        embedding: res.data[0].embedding,
        model: res.model,
        usage: res.usage
          ? { promptTokens: res.usage.prompt_tokens, totalTokens: res.usage.total_tokens }
          : undefined,
      };
    } catch (err) {
      throw new ProviderError(`OpenAI embedding failed: ${(err as Error).message}`, 'openai');
    }
  }

  async embedBatch(texts: string[], model?: string): Promise<EmbeddingResult[]> {
    try {
      const res = await this.client.embeddings.create({
        model: model ?? this.defaultModel,
        input: texts,
      });
      return res.data.map((d, i) => ({
        embedding: d.embedding,
        model: res.model,
        usage: res.usage
          ? { promptTokens: res.usage.prompt_tokens, totalTokens: res.usage.total_tokens }
          : undefined,
      }));
    } catch (err) {
      throw new ProviderError(`OpenAI batch embedding failed: ${(err as Error).message}`, 'openai');
    }
  }
}
