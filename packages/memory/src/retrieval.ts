import type BetterSqlite3 from 'better-sqlite3';
import { getLogger } from '@openio/shared';
import { initVectorTable, insertVector, searchVectors, deleteVector, countVectors } from './vector-store.js';
import { EmbeddingService } from './embeddings.js';
import type { SearchResult } from './vector-store.js';
import { v4 as uuid } from 'uuid';

export interface IndexOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  minScore?: number;
  topK?: number;
}

export class RetrievalService {
  private db: BetterSqlite3.Database;
  private embedder: EmbeddingService;
  private options: Required<IndexOptions>;

  constructor(
    db: BetterSqlite3.Database,
    embedder: EmbeddingService,
    options: IndexOptions = {},
  ) {
    this.db = db;
    this.embedder = embedder;
    this.options = {
      chunkSize: options.chunkSize ?? 512,
      chunkOverlap: options.chunkOverlap ?? 64,
      minScore: options.minScore ?? 0.0,
      topK: options.topK ?? 5,
    };
    initVectorTable(db);
  }

  async index(text: string, metadata?: Record<string, unknown>): Promise<string> {
    const chunks = this.chunk(text);
    const vectors = await this.embedder.embedBatch(chunks);
    const id = uuid();

    for (let i = 0; i < chunks.length; i++) {
      insertVector(this.db, `${id}_${i}`, vectors[i], chunks[i], {
        ...metadata,
        chunkIndex: i,
        parentId: id,
      });
    }

    getLogger().info({ chunks: chunks.length, parentId: id }, 'Text indexed');
    return id;
  }

  async indexBatch(texts: string[], metadatas?: Record<string, unknown>[]): Promise<string[]> {
    const ids: string[] = [];
    for (let i = 0; i < texts.length; i++) {
      const id = await this.index(texts[i], metadatas?.[i]);
      ids.push(id);
    }
    return ids;
  }

  async search(query: string, topK?: number): Promise<SearchResult[]> {
    const queryVec = await this.embedder.embed(query);
    return searchVectors(this.db, queryVec, topK ?? this.options.topK, this.options.minScore);
  }

  async searchWithThreshold(query: string, minScore: number, topK?: number): Promise<SearchResult[]> {
    const queryVec = await this.embedder.embed(query);
    return searchVectors(this.db, queryVec, topK ?? this.options.topK, minScore);
  }

  remove(id: string): void {
    deleteVector(this.db, id);
  }

  async generateContext(query: string, maxTokens = 4000): Promise<string> {
    const results = await this.search(query);
    if (results.length === 0) return '';

    let context = '';
    let totalTokens = 0;

    for (const r of results) {
      const chunk = `[Relevance: ${(r.score * 100).toFixed(0)}%]\n${r.text}\n`;
      const tokens = Math.ceil(chunk.length / 4);
      if (totalTokens + tokens > maxTokens) break;
      context += chunk + '\n';
      totalTokens += tokens;
    }

    return context.trim();
  }

  stats(): { count: number } {
    return { count: countVectors(this.db) };
  }

  private chunk(text: string): string[] {
    const { chunkSize, chunkOverlap } = this.options;
    if (text.length <= chunkSize) return [text];

    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));
      start += chunkSize - chunkOverlap;
    }
    return chunks;
  }
}
