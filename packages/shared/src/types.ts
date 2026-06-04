import { z } from 'zod';

// --- Core Message Types ---
export type Role = 'user' | 'assistant' | 'system' | 'tool';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
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

// --- Model & Provider Types ---
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

// --- Agent Types ---
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

// --- Tool Types ---
export interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: z.ZodType<any>;
  execute: (args: any) => Promise<ToolResult>;
}

// --- Config Types ---
export interface OpenIOConfig {
  defaultModel: string;
  defaultAgent: string;
  providers: Record<string, { apiKey?: string; baseUrl?: string }>;
  memory: {
    enabled: boolean;
    vectorStore: 'sqlite' | 'chroma' | 'pinecone';
  };
  ui: {
    theme: 'dark' | 'light';
    showTimestamps: boolean;
  };
}