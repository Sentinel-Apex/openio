import { z } from 'zod';
import { BaseTool } from './tool-registry.js';
import type { ToolResult } from '@openio/shared';

const querySchema = z.object({
  connection: z.string().optional().default(process.env.MYSQL_CONNECTION_STRING ?? 'mysql://root@localhost:3306/mysql'),
  query: z.string(),
  params: z.array(z.unknown()).optional().default([]),
});

const listTablesSchema = z.object({
  connection: z.string().optional(),
  database: z.string().optional(),
});

export class MySQLQueryTool extends BaseTool {
  name = 'mysql_query';
  description = 'Execute a SQL query against a MySQL database';
  inputSchema = querySchema;

  async execute(args: unknown): Promise<ToolResult> {
    const { connection, query, params } = this.validate<z.infer<typeof querySchema>>(args);
    try {
      const mysql = await import('mysql2/promise');
      const conn = await mysql.createConnection(connection);
      const [rows] = await conn.query(query, params);
      await conn.end();
      return this.success(JSON.stringify(rows, null, 2), { rowCount: Array.isArray(rows) ? rows.length : 0 });
    } catch (err) {
      return this.failure(`MySQL query failed: ${(err as Error).message}`);
    }
  }
}

export class MySQLListTablesTool extends BaseTool {
  name = 'mysql_list_tables';
  description = 'List tables in a MySQL database';
  inputSchema = listTablesSchema;

  async execute(args: unknown): Promise<ToolResult> {
    const { connection, database } = this.validate<z.infer<typeof listTablesSchema>>(args);
    try {
      const mysql = await import('mysql2/promise');
      const connStr = connection || process.env.MYSQL_CONNECTION_STRING || 'mysql://root@localhost:3306/mysql';
      const conn = await mysql.createConnection(connStr);
      const db = database ?? conn.config.database ?? 'information_schema';
      const [rows] = await conn.query(`SELECT TABLE_NAME, TABLE_TYPE FROM information_schema.tables WHERE TABLE_SCHEMA = ?`, [db]);
      await conn.end();
      const tables = rows as any[];
      return this.success(tables.map((r) => `${r.TABLE_NAME} (${r.TABLE_TYPE})`).join('\n'), {
        count: tables.length,
        database: db,
      });
    } catch (err) {
      return this.failure(`MySQL list tables failed: ${(err as Error).message}`);
    }
  }
}
