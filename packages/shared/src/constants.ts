export const DEFAULT_MODEL = 'gpt-4o';
export const DEFAULT_AGENT = 'manager';
export const CONFIG_DIR_NAME = '.openio';
export const DB_FILE_NAME = 'openio.db';
export const VECTOR_STORE_FILE_NAME = 'vector_store.index';
export const CONFIG_FILE_NAMES = ['openio.json', 'openio.yaml', 'openio.yml', 'openio.toml'] as const;

export const SUPPORTED_PROVIDERS = [
  'openai',
  'anthropic',
  'groq',
  'openrouter',
  'deepseek',
  'kimi',
  'ollama',
] as const;

export const AGENT_ROLES = [
  'manager',
  'backend',
  'frontend',
  'database',
  'devops',
  'security',
  'testing',
  'research',
  'code-review',
] as const;

export const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  CONFIG_ERROR: 2,
  PROVIDER_ERROR: 3,
  MEMORY_ERROR: 4,
} as const;
