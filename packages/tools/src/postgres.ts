import { z } from 'zod';
import { BaseTool } from './tool-registry.js';
import type { ToolResult } from '@openio/shared';

const querySchema = z.object({
  connection: z.string().optional().default(process.env.PG_CONNECTION_STRING ?? 'postgresql://localhost:5432/postgres'),
  query: z.string(),
  params: z.array(z.unknown()).optional().default([]),
});

const listTablesSchema = z.object({
  connection: z.string().optional(),
  schema: z.string().optional().default('public'),
});

export class PostgresQueryTool extends BaseTool {
  name = 'postgres_query';
  description = 'Execute a SQL query against a PostgreSQL database';
  inputSchema = querySchema;

  async execute(args: unknown): Promise<ToolResult> {
    const { connection, query, params } = this.validate<z.infer<typeof querySchema>>(args);
    try {
      const { default: pg } = await import('pg');
      const client = new pg.Client({ connectionString: connection });
      await client.connect();
      const result = await client.query(query, params);
      await client.end();
      return this.success(JSON.stringify(result.rows, null, 2), {
        rowCount: result.rowCount,
        fields: result.fields?.map((f: any) => f.name),
      });
    } catch (err) {
      return this.failure(`Postgres query failed: ${(err as Error).message}`);
    }
  }
}

export class PostgresListTablesTool extends BaseTool {
  name = 'postgres_list_tables';
  description = 'List tables in a PostgreSQL schema';
  inputSchema = listTablesSchema;

  async execute(args: unknown): Promise<ToolResult> {
    const { connection, schema } = this.validate<z.infer<typeof listTablesSchema>>(args);
    try {
      const { default: pg } = await import('pg');
      const connStr = connection || process.env.PG_CONNECTION_STRING || 'postgresql://localhost:5432/postgres';
      const client = new pg.Client({ connectionString: connStr });
      await client.connect();
      const result = await client.query(
        `SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = $1`,
        [schema],
      );
      await client.end();
      return this.success(result.rows.map((r: any) => `${r.table_name} (${r.table_type})`).join('\n'), {
        count: result.rowCount,
        schema,
      });
    } catch (err) {
      return this.failure(`Postgres list tables failed: ${(err as Error).message}`);
    }
  }
}
