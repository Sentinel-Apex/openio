import { ProviderError } from '@openio/shared';

export interface RerankResult {
  index: number;
  score: number;
  text: string;
}

export class BGEReranker {
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = process.env.BGE_RERANK_URL ?? 'http://localhost:8080';
    this.model = 'BAAI/bge-reranker-v2-m3';
  }

  async rerank(query: string, documents: string[], topK?: number): Promise<RerankResult[]> {
    try {
      const res = await fetch(`${this.baseUrl}/rerank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, documents, model: this.model, top_k: topK }),
      });
      if (!res.ok) throw new Error(`BGE rerank error: ${res.status}`);
      const data = (await res.json()) as Record<string, unknown>;
      return ((data as any).results ?? (data as any).data ?? []).map((r: any) => ({
        index: r.index ?? r.document_index,
        score: r.relevance_score ?? r.score,
        text: documents[r.index ?? r.document_index] ?? '',
      }));
    } catch (err) {
      throw new ProviderError(`BGE rerank failed: ${(err as Error).message}`, 'bge');
    }
  }
}
