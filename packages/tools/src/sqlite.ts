import { z } from 'zod';
import { readFileSync, existsSync } from 'node:fs';
import { BaseTool } from './tool-registry.js';
import type { ToolResult } from '@openio/shared';
import type { SqlValue } from 'sql.js';

const querySchema = z.object({
  path: z.string(),
  query: z.string(),
  params: z.array(z.union([z.string(), z.number(), z.null()])).optional().default([]),
});

const listTablesSchema = z.object({
  path: z.string(),
});

async function openDb(path: string) {
  const initSqlJs = await import('sql.js').then((m) => m.default);
  const SQL = await initSqlJs();
  if (!existsSync(path)) throw new Error(`Database file not found: ${path}`);
  const buffer = readFileSync(path);
  return new SQL.Database(buffer);
}

export class SQLiteQueryTool extends BaseTool {
  name = 'sqlite_query';
  description = 'Execute a SQL query against a SQLite database';
  inputSchema = querySchema;

  async execute(args: unknown): Promise<ToolResult> {
    const { path, query, params } = this.validate<z.infer<typeof querySchema>>(args);
    try {
      const db = await openDb(path);
      const stmt = db.prepare(query);
      stmt.bind(params);
      const rows: Record<string, unknown>[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      db.close();
      return this.success(JSON.stringify(rows, null, 2), { rowCount: rows.length });
    } catch (err) {
      return this.failure(`SQLite query failed: ${(err as Error).message}`);
    }
  }
}

export class SQLiteListTablesTool extends BaseTool {
  name = 'sqlite_list_tables';
  description = 'List tables in a SQLite database';
  inputSchema = listTablesSchema;

  async execute(args: unknown): Promise<ToolResult> {
    const { path } = this.validate<z.infer<typeof listTablesSchema>>(args);
    try {
      const db = await openDb(path);
      const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
      const tables: { name: string }[] = [];
      while (stmt.step()) {
        tables.push(stmt.getAsObject() as { name: string });
      }
      stmt.free();
      db.close();
      return this.success(tables.map((r) => r.name).join('\n'), { count: tables.length });
    } catch (err) {
      return this.failure(`SQLite list tables failed: ${(err as Error).message}`);
    }
  }
}
