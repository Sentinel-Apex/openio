import { ProviderError } from '@openio/shared';
import type { EmbeddingResult } from './openai.js';

interface BGEOptions {
  baseUrl?: string;
  model?: string;
}

export class BGEEmbedding {
  private baseUrl: string;
  private model: string;

  constructor(opts: BGEOptions = {}) {
    this.baseUrl = opts.baseUrl ?? process.env.BGE_API_URL ?? 'http://localhost:8080';
    this.model = opts.model ?? 'BAAI/bge-small-en-v1.5';
  }

  async embed(text: string): Promise<EmbeddingResult> {
    try {
      const res = await fetch(`${this.baseUrl}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text, model: this.model }),
      });
      if (!res.ok) throw new Error(`BGE API error: ${res.status}`);
      const data = (await res.json()) as Record<string, unknown>;
      const emb = (data as any).embedding ?? (data as any).data?.[0]?.embedding;
      return { embedding: emb as number[], model: this.model };
    } catch (err) {
      throw new ProviderError(`BGE embedding failed: ${(err as Error).message}`, 'bge');
    }
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    try {
      const res = await fetch(`${this.baseUrl}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: texts, model: this.model }),
      });
      if (!res.ok) throw new Error(`BGE API error: ${res.status}`);
      const data = (await res.json()) as Record<string, unknown>;
      const embeddings: number[][] = (data as any).embeddings ?? (data as any).data?.map((d: any) => d.embedding) ?? [];
      return embeddings.map((e) => ({ embedding: e, model: this.model }));
    } catch (err) {
      throw new ProviderError(`BGE batch embedding failed: ${(err as Error).message}`, 'bge');
    }
  }
}
