export { MemoryManager } from './memory.js';
export type { MemoryConfig } from './memory.js';

export { SessionManager } from './session.js';
export type { SessionState } from './session.js';

export { EmbeddingService, cosineSimilarity } from './embeddings.js';
export type { EmbeddingProvider, EmbeddingOptions } from './embeddings.js';

export { RetrievalService } from './retrieval.js';
export type { IndexOptions } from './retrieval.js';

export type { VectorRecord, SearchResult } from './vector-store.js';

export { createDatabase, withDb, run, queryAll, queryOne } from './sqlite.js';

export {
  createSession, loadSession, addMessage, listSessions,
  deleteSession, renameSession, trimContext, estimateTokenCount,
  MAX_CONTEXT_MESSAGES, MAX_CONTEXT_TOKENS_ESTIMATE,
} from './conversation.js';
