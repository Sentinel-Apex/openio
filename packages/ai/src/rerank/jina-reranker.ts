import { ProviderError } from '@openio/shared';
import type { RerankResult } from './bge-reranker.js';

export class JinaReranker {
  private apiKey: string;
  private baseUrl = 'https://api.jina.ai/v1/rerank';

  constructor() {
    this.apiKey = process.env.JINA_API_KEY ?? '';
  }

  async rerank(query: string, documents: string[], topK?: number): Promise<RerankResult[]> {
    try {
      const res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ query, documents, model: 'jina-reranker-v2-base-multilingual', top_n: topK }),
      });
      if (!res.ok) throw new Error(`Jina rerank error: ${res.status}`);
      const data = (await res.json()) as Record<string, unknown>;
      return ((data as any).results ?? []).map((r: any) => ({
        index: r.index,
        score: r.relevance_score,
        text: documents[r.index] ?? '',
      }));
    } catch (err) {
      throw new ProviderError(`Jina rerank failed: ${(err as Error).message}`, 'jina');
    }
  }
}
