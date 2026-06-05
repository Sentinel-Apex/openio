import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

export interface CLIConfig {
  defaultModel: string;
  defaultAgent: string;
  theme: 'dark' | 'light';
  showTimestamps: boolean;
  apiKeys: Record<string, string>;
  mcpServers: { id: string; transport: string; target: string; args?: string[] }[];
  recentSessions: string[];
}

const CONFIG_PATH = join(homedir(), '.openio', 'config.json');

function defaultConfig(): CLIConfig {
  return {
    defaultModel: 'gpt-4o',
    defaultAgent: 'manager',
    theme: 'dark',
    showTimestamps: false,
    apiKeys: {},
    mcpServers: [],
    recentSessions: [],
  };
}

export function loadCLIConfig(): CLIConfig {
  try {
    if (existsSync(CONFIG_PATH)) {
      const raw = readFileSync(CONFIG_PATH, 'utf-8');
      return { ...defaultConfig(), ...JSON.parse(raw) };
    }
  } catch { /* ignore */ }
  return defaultConfig();
}

export function saveCLIConfig(config: CLIConfig): void {
  const dir = join(homedir(), '.openio');
  if (!existsSync(dir)) require('node:fs').mkdirSync(dir, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export function getApiKey(provider: string): string | undefined {
  const config = loadCLIConfig();
  return config.apiKeys[provider] ?? process.env[`${provider.toUpperCase()}_API_KEY`];
}
