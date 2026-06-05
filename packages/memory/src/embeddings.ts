import { MemoryError } from '@openio/shared';

export type EmbeddingProvider = 'openai' | 'openai-small' | 'openai-large' | 'nomic' | 'bge';

export interface EmbeddingOptions {
  provider?: EmbeddingProvider;
  apiKey?: string;
  batchSize?: number;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export { cosineSimilarity };

async function openAiEmbed(texts: string[], model: string, apiKey?: string): Promise<number[][]> {
  const key = apiKey ?? process.env.OPENAI_API_KEY;
  if (!key) throw new MemoryError('OPENAI_API_KEY not set for embeddings');

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: texts, model }),
  });
  if (!res.ok) throw new MemoryError(`OpenAI embedding API error: ${res.status}`);
  const data = (await res.json()) as Record<string, unknown>;
  return ((data as any).data as any[]).sort((a: any, b: any) => a.index - b.index).map((d: any) => d.embedding);
}

async function nomicEmbed(texts: string[], apiKey?: string): Promise<number[][]> {
  const key = apiKey ?? process.env.NOMIC_API_KEY;
  if (!key) throw new MemoryError('NOMIC_API_KEY not set for embeddings');

  const res = await fetch('https://api-atlas.nomic.ai/v1/embedding/text', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts, model: 'nomic-embed-text-v1.5' }),
  });
  if (!res.ok) throw new MemoryError(`Nomic embedding API error: ${res.status}`);
  const data = (await res.json()) as Record<string, unknown>;
  return (data as any).embeddings ?? [];
}

async function bgeEmbed(texts: string[]): Promise<number[][]> {
  const baseUrl = process.env.BGE_API_URL ?? 'http://localhost:8080';
  const res = await fetch(`${baseUrl}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: texts }),
  });
  if (!res.ok) throw new MemoryError(`BGE embedding API error: ${res.status}`);
  const data = (await res.json()) as Record<string, unknown>;
  return (data as any).embeddings ?? (data as any).data?.map((d: any) => d.embedding) ?? [];
}

export class EmbeddingService {
  private provider: EmbeddingProvider;
  private apiKey?: string;

  constructor(opts?: EmbeddingOptions) {
    this.provider = opts?.provider ?? 'openai-small';
    this.apiKey = opts?.apiKey;
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    switch (this.provider) {
      case 'openai':
        return openAiEmbed(texts, 'text-embedding-3-large', this.apiKey);
      case 'openai-small':
        return openAiEmbed(texts, 'text-embedding-3-small', this.apiKey);
      case 'openai-large':
        return openAiEmbed(texts, 'text-embedding-3-large', this.apiKey);
      case 'nomic':
        return nomicEmbed(texts, this.apiKey);
      case 'bge':
        return bgeEmbed(texts);
      default:
        return openAiEmbed(texts, 'text-embedding-3-small', this.apiKey);
    }
  }

  get dimensions(): number {
    switch (this.provider) {
      case 'openai-large': return 3072;
      case 'nomic': return 768;
      case 'bge': return 384;
      default: return 1536;
    }
  }
}
