import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { MemoryError, getLogger } from '@openio/shared';
import { createDatabase, saveDatabase, withDb, run, queryAll } from './sqlite.js';
import { initConversationTable, createSession, addMessage, listSessions, loadSession, deleteSession, renameSession, trimContext, MAX_CONTEXT_MESSAGES } from './conversation.js';
import { SessionManager } from './session.js';
import { EmbeddingService } from './embeddings.js';
import { RetrievalService } from './retrieval.js';
import type { Database } from 'sql.js';
import type { Message, ChatSession } from '@openio/shared';

export interface MemoryConfig {
  dbPath?: string;
  embeddingProvider?: 'openai' | 'openai-small' | 'openai-large' | 'nomic' | 'bge';
  chunkSize?: number;
  chunkOverlap?: number;
  minScore?: number;
  topK?: number;
  autoSummarize?: boolean;
  summaryModel?: string;
}

export class MemoryManager {
  private db!: Database;
  private dbPath: string;
  public sessions!: SessionManager;
  public retrieval!: RetrievalService;
  public embedder: EmbeddingService;
  private config: MemoryConfig;

  constructor(config: MemoryConfig = {}) {
    this.config = config;
    this.dbPath = config.dbPath ?? join(homedir(), '.openio', 'memory.db');
    this.embedder = new EmbeddingService({
      provider: config.embeddingProvider ?? 'openai-small',
    });
  }

  async init(): Promise<void> {
    this.db = await createDatabase(this.dbPath);
    initConversationTable(this.db);
    this.sessions = new SessionManager(this.db);
    this.retrieval = new RetrievalService(this.db, this.embedder, {
      chunkSize: this.config.chunkSize,
      chunkOverlap: this.config.chunkOverlap,
      minScore: this.config.minScore,
      topK: this.config.topK,
    });
    getLogger().info({ dbPath: this.dbPath }, 'Memory manager initialized');
  }

  save(): void {
    if (this.db) {
      saveDatabase(this.db, this.dbPath);
    }
  }

  close(): void {
    this.save();
    if (this.db) {
      this.db.close();
    }
  }

  async addMessage(
    sessionId: string,
    role: Message['role'],
    content: string,
    metadata?: Record<string, unknown>,
  ): Promise<Message> {
    const msg = this.sessions.addMessage(sessionId, role, content, metadata);
    this.save();

    if (content.length > 50 && (role === 'user' || role === 'assistant')) {
      try {
        await this.retrieval.index(content, {
          sessionId,
          role,
          messageId: msg.id,
        });
      } catch (err) {
        getLogger().warn({ error: (err as Error).message }, 'Failed to index message');
      }
    }

    return msg;
  }

  async search(query: string, topK?: number) {
    return this.retrieval.search(query, topK);
  }

  async getContext(sessionId: string, query?: string, maxTokens = 16000): Promise<{
    messages: Message[];
    context: string;
  }> {
    const session = this.sessions.load(sessionId);
    const messages = session ? trimContext(session.messages, maxTokens) : [];

    let context = '';
    if (query) {
      try {
        context = await this.retrieval.generateContext(query, 2000);
      } catch (err) {
        getLogger().warn({ error: (err as Error).message }, 'Context generation failed');
      }
    }

    return { messages: messages.slice(-MAX_CONTEXT_MESSAGES), context };
  }

  async summarizeSession(sessionId: string): Promise<string> {
    const session = this.sessions.load(sessionId);
    if (!session || session.messages.length < 4) return session?.title ?? '';

    const text = session.messages
      .map((m) => `[${m.role}] ${m.content}`)
      .join('\n')
      .slice(0, 8000);

    return `Session: ${session.title}\nMessages: ${session.messages.length}\nLast message: ${session.messages[session.messages.length - 1]?.content.slice(0, 100)}...\n\nSummary not yet generated (requires LLM call)`;
  }

  stats(): {
    sessions: number;
    messages: number;
    vectors: number;
  } {
    const sessionCount = queryAll<{ count: number }>(this.db, `SELECT COUNT(*) as count FROM sessions`)[0]?.count ?? 0;
    const messageCount = queryAll<{ count: number }>(this.db, `SELECT COUNT(*) as count FROM messages`)[0]?.count ?? 0;
    const vectorCount = this.retrieval.stats().count;
    return { sessions: sessionCount, messages: messageCount, vectors: vectorCount };
  }
}
