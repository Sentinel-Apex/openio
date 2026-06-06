import type BetterSqlite3 from 'better-sqlite3';
import { MemoryError } from '@openio/shared';
import { run, queryAll, queryOne } from './sqlite.js';
import type { ChatSession, Message } from '@openio/shared';
import { v4 as uuid } from 'uuid';

type Db = BetterSqlite3.Database;

export interface SessionState {
  currentSessionId: string | null;
  sessions: ChatSession[];
}

export function initSessionTable(db: Db): void {
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

  run(db, `CREATE INDEX IF NOT EXISTS idx_msgs_session ON messages(session_id, timestamp)`);
}

export class SessionManager {
  private db: Db;
  private currentId: string | null = null;

  constructor(db: Db) {
    this.db = db;
    initSessionTable(db);
  }

  get currentSessionId(): string | null {
    return this.currentId;
  }

  create(title?: string, modelId?: string, agentId?: string): ChatSession {
    const id = uuid();
    const now = Date.now();
    const session: ChatSession = {
      id, title: title ?? 'New Chat', messages: [],
      createdAt: now, updatedAt: now,
      modelId: modelId ?? '', agentId,
    };

    run(this.db, `INSERT INTO sessions (id, title, model_id, agent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, session.title, session.modelId, session.agentId ?? null, now, now]);

    this.currentId = id;
    return session;
  }

  load(sessionId: string): ChatSession | null {
    const row = queryOne<{
      id: string; title: string; model_id: string; agent_id: string | null;
      created_at: number; updated_at: number;
    }>(this.db, `SELECT * FROM sessions WHERE id = ?`, [sessionId]);

    if (!row) return null;

    const messages = queryAll<{
      id: string; role: string; content: string; metadata: string | null; timestamp: number;
    }>(this.db, `SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC`, [sessionId])
      .map((m) => ({
        id: m.id, role: m.role as Message['role'], content: m.content,
        metadata: m.metadata ? JSON.parse(m.metadata) as Record<string, unknown> : undefined,
        timestamp: m.timestamp,
      }));

    this.currentId = sessionId;
    return {
      id: row.id, title: row.title, messages,
      createdAt: row.created_at, updatedAt: row.updated_at,
      modelId: row.model_id, agentId: row.agent_id ?? undefined,
    };
  }

  list(limit = 50, offset = 0): ChatSession[] {
    const rows = queryAll<{
      id: string; title: string; model_id: string; agent_id: string | null;
      created_at: number; updated_at: number;
    }>(this.db, `SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ? OFFSET ?`, [limit, offset]);

    return rows.map((r) => ({
      id: r.id, title: r.title, messages: [],
      createdAt: r.created_at, updatedAt: r.updated_at,
      modelId: r.model_id, agentId: r.agent_id ?? undefined,
    }));
  }

  delete(sessionId: string): void {
    run(this.db, `DELETE FROM messages WHERE session_id = ?`, [sessionId]);
    run(this.db, `DELETE FROM sessions WHERE id = ?`, [sessionId]);
    if (this.currentId === sessionId) this.currentId = null;
  }

  rename(sessionId: string, title: string): void {
    run(this.db, `UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?`, [title, Date.now(), sessionId]);
  }

  addMessage(sessionId: string, role: Message['role'], content: string, metadata?: Record<string, unknown>): Message {
    if (!sessionId) throw new MemoryError('No active session');

    const msg: Message = { id: uuid(), role, content, timestamp: Date.now(), metadata };
    run(this.db, `INSERT INTO messages (id, session_id, role, content, metadata, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
      [msg.id, sessionId, msg.role, msg.content, msg.metadata ? JSON.stringify(msg.metadata) : null, msg.timestamp]);
    run(this.db, `UPDATE sessions SET updated_at = ? WHERE id = ?`, [msg.timestamp, sessionId]);
    return msg;
  }

  getMessages(sessionId: string, limit = 100): Message[] {
    return queryAll<{
      id: string; role: string; content: string; metadata: string | null; timestamp: number;
    }>(this.db, `SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC LIMIT ?`,
      [sessionId, limit]).map((m) => ({
        id: m.id, role: m.role as Message['role'], content: m.content,
        metadata: m.metadata ? JSON.parse(m.metadata) as Record<string, unknown> : undefined,
        timestamp: m.timestamp,
      }));
  }

  getOrCreateCurrent(modelId?: string): ChatSession {
    if (this.currentId) {
      const existing = this.load(this.currentId);
      if (existing) return existing;
    }
    return this.create(undefined, modelId);
  }
}
