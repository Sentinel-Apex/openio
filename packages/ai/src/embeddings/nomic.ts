import { ProviderError } from '@openio/shared';
import type { EmbeddingResult } from './openai.js';

interface NomicOptions {
  apiKey?: string;
  model?: string;
}

export class NomicEmbedding {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://api-atlas.nomic.ai/v1';

  constructor(opts: NomicOptions = {}) {
    this.apiKey = opts.apiKey ?? process.env.NOMIC_API_KEY ?? '';
    this.model = opts.model ?? 'nomic-embed-text-v1.5';
  }

  async embed(text: string): Promise<EmbeddingResult> {
    try {
      const res = await fetch(`${this.baseUrl}/embedding/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ texts: [text], model: this.model }),
      });
      if (!res.ok) throw new Error(`Nomic API error: ${res.status}`);
      const data = (await res.json()) as Record<string, unknown>;
      const emb = (data as any).embeddings?.[0] ?? (data as any).data?.[0]?.embedding;
      return { embedding: emb as number[], model: this.model };
    } catch (err) {
      throw new ProviderError(`Nomic embedding failed: ${(err as Error).message}`, 'nomic');
    }
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    try {
      const res = await fetch(`${this.baseUrl}/embedding/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ texts, model: this.model }),
      });
      if (!res.ok) throw new Error(`Nomic API error: ${res.status}`);
      const data = (await res.json()) as Record<string, unknown>;
      const embeddings: number[][] = (data as any).embeddings ?? (data as any).data?.map((d: any) => d.embedding) ?? [];
      return embeddings.map((e) => ({ embedding: e, model: this.model }));
    } catch (err) {
      throw new ProviderError(`Nomic batch embedding failed: ${(err as Error).message}`, 'nomic');
    }
  }
}
