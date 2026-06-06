import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface ConfigSchema {
  activeProvider: string;
  defaultModel: string;
  defaultAgent: string;
  theme: 'dark' | 'light';
  showTimestamps: boolean;
  apiKeys: Record<string, string>;
  mcpServers: { id: string; transport: string; target: string; args?: string[] }[];
  recentSessions: string[];
  firstRunDone: boolean;
}

const CONFIG_DIR = join(homedir(), '.openio');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

function defaults(): ConfigSchema {
  return {
    activeProvider: 'ollama',
    defaultModel: 'llama3.2',
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

  constructor(configPath?: string) {
    this.configPath = configPath ?? CONFIG_PATH;
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
    } catch {
      // corrupt file, fall through to defaults
    }
    this.cache = defaults();
    return this.cache;
  }

  save(config: ConfigSchema): void {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
    writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
    this.cache = config;
  }

  getActiveProvider(): string {
    return this.load().activeProvider;
  }

  setActiveProvider(provider: string): void {
    const config = this.load();
    config.activeProvider = provider;
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

  getAgent(): string {
    return this.load().defaultAgent;
  }

  setAgent(agent: string): void {
    const config = this.load();
    config.defaultAgent = agent;
    this.save(config);
  }

  getApiKey(provider?: string): string | undefined {
    const config = this.load();
    const p = provider ?? config.activeProvider;
    return config.apiKeys[p];
  }

  setApiKey(provider: string, key: string): void {
    const config = this.load();
    config.apiKeys[provider] = key;
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

  getTheme(): 'dark' | 'light' {
    return this.load().theme;
  }

  reset(): void {
    this.cache = defaults();
    this.save(this.cache);
  }
}

export const configManager = new ConfigManager();
