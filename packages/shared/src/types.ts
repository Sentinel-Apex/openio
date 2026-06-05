import type { z } from 'zod';

export type Role = 'user' | 'assistant' | 'system' | 'tool';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  modelId: string;
  agentId?: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  maxOutputTokens: number;
  supportsStreaming: boolean;
  supportsVision?: boolean;
}

export interface ProviderConfig {
  id: string;
  name: string;
  apiKeyEnvVar: string;
  baseUrl?: string;
}

export type AgentRole =
  | 'manager'
  | 'backend'
  | 'frontend'
  | 'database'
  | 'devops'
  | 'security'
  | 'testing'
  | 'research'
  | 'code-review';

export interface AgentDefinition {
  id: string;
  name: string;
  role: AgentRole;
  description: string;
  systemPrompt: string;
  tools?: string[];
}

export interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: z.ZodType<unknown>;
  execute: (args: unknown) => Promise<ToolResult>;
}

export type Theme = 'dark' | 'light';
export type VectorStore = 'sqlite' | 'chroma' | 'pinecone';

export interface OpenIOConfig {
  defaultModel: string;
  defaultAgent: string;
  providers: Record<string, { apiKey?: string; baseUrl?: string }>;
  memory: {
    enabled: boolean;
    vectorStore: VectorStore;
  };
  ui: {
    theme: Theme;
    showTimestamps: boolean;
  };
}
