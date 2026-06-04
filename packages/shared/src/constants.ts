export const DEFAULT_MODEL = 'gpt-4o';
export const DEFAULT_AGENT = 'manager';
export const CONFIG_DIR_NAME = '.openio';
export const DB_FILE_NAME = 'openio.db';
export const VECTOR_STORE_FILE_NAME = 'vector_store.index';

export const SUPPORTED_PROVIDERS = [
  'openai',
  'anthropic',
  'groq',
  'openrouter',
  'deepseek',
  'kimi',
  'ollama'
];

export const AGENT_ROLES = [
  'manager',
  'backend',
  'frontend',
  'database',
  'devops',
  'security',
  'testing',
  'research',
  'code-review'
] as const;