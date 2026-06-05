import type { Database } from 'sql.js';
import type { Message, ChatSession } from '@openio/shared';
import { run, queryAll, queryOne } from './sqlite.js';
import { v4 as uuid } from 'uuid';

export const MAX_CONTEXT_MESSAGES = 50;
export const MAX_CONTEXT_TOKENS_ESTIMATE = 16000;

export function initConversationTable(db: Database): void {
  run(db, `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'New Chat',
    model_id TEXT NOT NULL DEFAULT '',
    agent_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`);

  run(db, `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata TEXT,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  )`);

  run(db, `CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, timestamp)`);
  run(db, `CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at DESC)`);
}

export function createSession(db: Database, title?: string, modelId?: string, agentId?: string): ChatSession {
  const id = uuid();
  const now = Date.now();
  const session: ChatSession = {
    id,
    title: title ?? 'New Chat',
    messages: [],
    createdAt: now,
    updatedAt: now,
    modelId: modelId ?? '',
    agentId,
  };

  run(db, `INSERT INTO sessions (id, title, model_id, agent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, session.title, session.modelId, session.agentId ?? null, now, now]);

  return session;
}

export function loadSession(db: Database, sessionId: string): ChatSession | null {
  const row = queryOne<{
    id: string; title: string; model_id: string; agent_id: string | null;
    created_at: number; updated_at: number;
  }>(db, `SELECT * FROM sessions WHERE id = ?`, [sessionId]);

  if (!row) return null;

  const messages = queryAll<{
    id: string; session_id: string; role: string; content: string;
    metadata: string | null; timestamp: number;
  }>(db, `SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC`, [sessionId])
    .map((m) => ({
      id: m.id,
      role: m.role as Message['role'],
      content: m.content,
      timestamp: m.timestamp,
      metadata: m.metadata ? JSON.parse(m.metadata) as Record<string, unknown> : undefined,
    }));

  return {
    id: row.id,
    title: row.title,
    messages,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    modelId: row.model_id,
    agentId: row.agent_id ?? undefined,
  };
}

export function listSessions(db: Database, limit = 20, offset = 0): ChatSession[] {
  const rows = queryAll<{
    id: string; title: string; model_id: string; agent_id: string | null;
    created_at: number; updated_at: number;
  }>(db, `SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ? OFFSET ?`, [limit, offset]);

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    messages: [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    modelId: r.model_id,
    agentId: r.agent_id ?? undefined,
  }));
}

export function addMessage(db: Database, sessionId: string, message: Omit<Message, 'id' | 'timestamp'>): Message {
  const msg: Message = {
    id: uuid(),
    ...message,
    timestamp: Date.now(),
  };

  run(db, `INSERT INTO messages (id, session_id, role, content, metadata, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
    [msg.id, sessionId, msg.role, msg.content,
     msg.metadata ? JSON.stringify(msg.metadata) : null, msg.timestamp]);

  run(db, `UPDATE sessions SET updated_at = ? WHERE id = ?`, [msg.timestamp, sessionId]);

  return msg;
}

export function deleteSession(db: Database, sessionId: string): void {
  run(db, `DELETE FROM messages WHERE session_id = ?`, [sessionId]);
  run(db, `DELETE FROM sessions WHERE id = ?`, [sessionId]);
}

export function renameSession(db: Database, sessionId: string, title: string): void {
  run(db, `UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?`, [title, Date.now(), sessionId]);
}

export function getMessageCount(db: Database, sessionId: string): number {
  const row = queryOne<{ count: number }>(db, `SELECT COUNT(*) as count FROM messages WHERE session_id = ?`, [sessionId]);
  return row?.count ?? 0;
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export function trimContext(messages: Message[], maxTokens: number = MAX_CONTEXT_TOKENS_ESTIMATE): Message[] {
  let total = 0;
  const result: Message[] = [];

  for (const m of messages) {
    total += estimateTokenCount(m.content);
    if (total > maxTokens) break;
    result.push(m);
  }

  return result;
}
