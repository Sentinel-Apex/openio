import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { parse as parseToml } from 'smol-toml';
import { CONFIG_DIR_NAME, CONFIG_FILE_NAMES, DEFAULT_MODEL, DEFAULT_AGENT } from './constants.js';
import { ConfigError } from './errors.js';
import type { OpenIOConfig } from './types.js';

const CONFIG_DIR = join(homedir(), CONFIG_DIR_NAME);

export function getConfigDir(): string {
  const envDir = process.env.OPENIO_CONFIG_DIR;
  return envDir ? resolve(envDir) : CONFIG_DIR;
}

export function ensureConfigDir(): string {
  const dir = getConfigDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function resolveConfigPath(cwd?: string): string | null {
  const searchPaths = [
    ...CONFIG_FILE_NAMES.map((f) => join(cwd ?? process.cwd(), f)),
    ...CONFIG_FILE_NAMES.map((f) => join(getConfigDir(), f)),
  ];

  for (const p of searchPaths) {
    if (existsSync(p)) return p;
  }
  return null;
}

export function parseConfigFile(path: string): Record<string, unknown> {
  const ext = path.split('.').pop()?.toLowerCase();

  try {
    const raw = readFileSync(path, 'utf-8');

    if (ext === 'yaml' || ext === 'yml') {
      return parseYaml(raw) as Record<string, unknown>;
    }
    if (ext === 'toml') {
      return parseToml(raw) as Record<string, unknown>;
    }
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (cause) {
    throw new ConfigError(`Failed to parse config file: ${path}`, cause);
  }
}

export function loadConfig(cwd?: string): OpenIOConfig {
  const configPath = resolveConfigPath(cwd);

  const defaults: OpenIOConfig = {
    defaultModel: DEFAULT_MODEL,
    defaultAgent: DEFAULT_AGENT,
    providers: {},
    memory: { enabled: false, vectorStore: 'sqlite' },
    ui: { theme: 'dark', showTimestamps: false },
  };

  if (!configPath) return defaults;

  const parsed = parseConfigFile(configPath);
  return { ...defaults, ...parsed } as OpenIOConfig;
}

export function saveConfig(config: OpenIOConfig, filePath?: string): void {
  const dir = ensureConfigDir();
  const target = filePath ?? join(dir, 'openio.json');
  writeFileSync(target, JSON.stringify(config, null, 2), 'utf-8');
}

export function getEnvConfig(): Record<string, string> {
  const config: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('OPENIO_') && value) {
      config[key] = value;
    }
  }
  return config;
}
