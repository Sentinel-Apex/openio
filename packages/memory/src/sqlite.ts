import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { MemoryError } from '@openio/shared';

export function createDatabase(dbPath: string): Database.Database {
  const dir = dirname(resolve(dbPath));
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function withDb<T>(dbPath: string, fn: (db: Database.Database) => T): T {
  const db = createDatabase(dbPath);
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

export function run(db: Database.Database, sql: string, params?: unknown[]): void {
  try {
    db.prepare(sql).run(...(params ?? []));
  } catch (err) {
    throw new MemoryError(`SQLite error: ${(err as Error).message}`, err);
  }
}

export function queryAll<T = Record<string, unknown>>(
  db: Database.Database,
  sql: string,
  params?: unknown[],
): T[] {
  try {
    return db.prepare(sql).all(...(params ?? [])) as T[];
  } catch (err) {
    throw new MemoryError(`SQLite query error: ${(err as Error).message}`, err);
  }
}

export function queryOne<T = Record<string, unknown>>(
  db: Database.Database,
  sql: string,
  params?: unknown[],
): T | undefined {
  try {
    return db.prepare(sql).get(...(params ?? [])) as T | undefined;
  } catch (err) {
    throw new MemoryError(`SQLite query error: ${(err as Error).message}`, err);
  }
}
