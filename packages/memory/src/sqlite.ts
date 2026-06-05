import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { SqlJsStatic, Database } from 'sql.js';
import { MemoryError } from '@openio/shared';

let SQL: SqlJsStatic | null = null;

async function getSqlJs(): Promise<SqlJsStatic> {
  if (!SQL) {
    const initSqlJs = await import('sql.js').then((m) => m.default);
    SQL = await initSqlJs();
  }
  return SQL;
}

export async function createDatabase(dbPath: string): Promise<Database> {
  const sql = await getSqlJs();

  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath);
    return new sql.Database(buffer);
  }

  const dir = dirname(resolve(dbPath));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  return new sql.Database();
}

export function saveDatabase(db: Database, dbPath: string): void {
  const data = db.export();
  const dir = dirname(resolve(dbPath));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(dbPath, Buffer.from(data));
}

export async function withDb<T>(dbPath: string, fn: (db: Database) => T): Promise<T> {
  const db = await createDatabase(dbPath);
  try {
    return fn(db);
  } finally {
    saveDatabase(db, dbPath);
    db.close();
  }
}

export function run(db: Database, sql: string, params?: (string | number | null)[]): void {
  try {
    db.run(sql, params);
  } catch (err) {
    throw new MemoryError(`SQLite error: ${(err as Error).message}`, err);
  }
}

export function queryAll<T = Record<string, unknown>>(db: Database, sql: string, params?: (string | number | null)[]): T[] {
  try {
    const stmt = db.prepare(sql);
    if (params) stmt.bind(params as any);
    const rows: T[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as T);
    stmt.free();
    return rows;
  } catch (err) {
    throw new MemoryError(`SQLite query error: ${(err as Error).message}`, err);
  }
}

export function queryOne<T = Record<string, unknown>>(db: Database, sql: string, params?: (string | number | null)[]): T | undefined {
  const rows = queryAll<T>(db, sql, params);
  return rows[0];
}
