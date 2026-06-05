import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { ConfigError } from './errors.js';

const CONFIG_DIR = join(homedir(), '.openio');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

export interface ConfigManagerOptions {
  configPath?: string;
}

export interface ConfigSchema {
  defaultModel: string;
  defaultAgent: string;
  theme: 'dark' | 'light';
  showTimestamps: boolean;
  apiKeys: Record<string, string>;
  mcpServers: { id: string; transport: string; target: string; args?: string[] }[];
  recentSessions: string[];
  firstRunDone: boolean;
}

function defaults(): ConfigSchema {
  return {
    defaultModel: 'gpt-4o',
    defaultAgent: 'manager',
    theme: 'dark',
    showTimestamps: false,
    apiKeys: {},
    mcpServers: [],
    recentSessions: [],
    firstRunDone: false,
  };
}

export class ConfigManager {
  private configPath: string;
  private cache: ConfigSchema | null = null;

  constructor(opts?: ConfigManagerOptions) {
    this.configPath = opts?.configPath ?? CONFIG_PATH;
  }

  isFirstRun(): boolean {
    if (!existsSync(this.configPath)) return true;
    try {
      const raw = readFileSync(this.configPath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<ConfigSchema>;
      return parsed.firstRunDone !== true;
    } catch {
      return true;
    }
  }

  markFirstRunDone(): void {
    const config = this.load();
    config.firstRunDone = true;
    this.save(config);
  }

  load(): ConfigSchema {
    if (this.cache) return this.cache;
    try {
      if (existsSync(this.configPath)) {
        const raw = readFileSync(this.configPath, 'utf-8');
        this.cache = { ...defaults(), ...JSON.parse(raw) };
        return this.cache!;
      }
    } catch (cause) {
      throw new ConfigError('Failed to load config', cause);
    }
    this.cache = defaults();
    return this.cache!;
  }

  save(config: ConfigSchema): void {
    if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
    this.cache = config;
  }

  getProvider(): string {
    return this.load().defaultAgent;
  }

  setProvider(agent: string): void {
    const config = this.load();
    config.defaultAgent = agent;
    this.save(config);
  }

  getModel(): string {
    return this.load().defaultModel;
  }

  setModel(model: string): void {
    const config = this.load();
    config.defaultModel = model;
    this.save(config);
  }

  getApiKey(provider: string): string | undefined {
    const config = this.load();
    const key = config.apiKeys[provider];
    if (key) return key;
    const envKey = process.env[`${provider.toUpperCase()}_API_KEY`];
    return envKey;
  }

  setApiKey(provider: string, key: string): void {
    const config = this.load();
    config.apiKeys[provider] = key;
    this.save(config);
  }

  getMcpServers(): ConfigSchema['mcpServers'] {
    return this.load().mcpServers;
  }

  addMcpServer(server: ConfigSchema['mcpServers'][number]): void {
    const config = this.load();
    config.mcpServers.push(server);
    this.save(config);
  }

  removeMcpServer(serverId: string): void {
    const config = this.load();
    config.mcpServers = config.mcpServers.filter((s) => s.id !== serverId);
    this.save(config);
  }

  addRecentSession(sessionId: string): void {
    const config = this.load();
    config.recentSessions = [
      sessionId,
      ...config.recentSessions.filter((id) => id !== sessionId),
    ].slice(0, 20);
    this.save(config);
  }

  getRecentSessions(): string[] {
    return this.load().recentSessions;
  }

  reset(): void {
    const dir = CONFIG_DIR;
    if (existsSync(dir)) {
      const files = [this.configPath];
      for (const f of files) {
        try { writeFileSync(f, ''); } catch { /* skip */ }
      }
    }
    this.cache = null;
  }
}

export const configManager = new ConfigManager();
