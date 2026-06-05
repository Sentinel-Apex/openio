import type { Database } from 'sql.js';
import { run, queryAll } from './sqlite.js';
import { cosineSimilarity } from './embeddings.js';

export interface VectorRecord {
  id: string;
  vector: number[];
  text: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface SearchResult {
  id: string;
  text: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export function initVectorTable(db: Database): void {
  run(db, `CREATE TABLE IF NOT EXISTS vectors (
    id TEXT PRIMARY KEY,
    vector TEXT NOT NULL,
    text TEXT NOT NULL,
    metadata TEXT,
    created_at INTEGER NOT NULL
  )`);
  run(db, `CREATE INDEX IF NOT EXISTS idx_vectors_created ON vectors(created_at)`);
}

export function insertVector(
  db: Database,
  id: string,
  vector: number[],
  text: string,
  metadata?: Record<string, unknown>,
): void {
  run(db, `INSERT OR REPLACE INTO vectors (id, vector, text, metadata, created_at) VALUES (?, ?, ?, ?, ?)`, [
    id,
    JSON.stringify(vector),
    text,
    metadata ? JSON.stringify(metadata) : null,
    Date.now(),
  ]);
}

export function deleteVector(db: Database, id: string): void {
  run(db, `DELETE FROM vectors WHERE id = ?`, [id]);
}

export function getAllVectors(db: Database): VectorRecord[] {
  return queryAll<{
    id: string;
    vector: string;
    text: string;
    metadata: string | null;
    created_at: number;
  }>(db, `SELECT id, vector, text, metadata, created_at FROM vectors ORDER BY created_at DESC`).map((r) => ({
    id: r.id,
    vector: JSON.parse(r.vector) as number[],
    text: r.text,
    metadata: r.metadata ? JSON.parse(r.metadata) as Record<string, unknown> : undefined,
    createdAt: r.created_at,
  }));
}

export function searchVectors(
  db: Database,
  queryVector: number[],
  topK: number = 5,
  minScore: number = 0.0,
): SearchResult[] {
  const all = getAllVectors(db);
  const scored: { record: VectorRecord; score: number }[] = [];

  for (const v of all) {
    const score = cosineSimilarity(queryVector, v.vector);
    if (score >= minScore) {
      scored.push({ record: v, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((s) => ({
    id: s.record.id,
    text: s.record.text,
    score: s.score,
    metadata: s.record.metadata,
  }));
}

export function countVectors(db: Database): number {
  const rows = queryAll<{ count: number }>(db, `SELECT COUNT(*) as count FROM vectors`);
  return rows[0]?.count ?? 0;
}
