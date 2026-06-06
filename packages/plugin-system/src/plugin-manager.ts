import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, copyFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { homedir } from 'node:os';

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  enabled: boolean;
  entry: string;
  commands: string[];
  tools: string[];
  hooks: HookType[];
  installedAt: number;
  updatedAt: number;
}

export interface PluginCommand {
  name: string;
  description: string;
  run: (args: string[]) => Promise<void> | void;
}

export interface PluginToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<{ success: boolean; output?: string; error?: string }>;
}

export type HookType =
  | 'beforeChat'
  | 'afterChat'
  | 'beforeResponse'
  | 'afterResponse'
  | 'beforeTool'
  | 'afterTool'
  | 'beforeCommand'
  | 'afterCommand'
  | 'onStartup'
  | 'onShutdown';

export type HookHandler = (context: Record<string, unknown>) => Promise<Record<string, unknown> | void>;

export interface PluginContext {
  name: string;
  manifest: PluginManifest;
  logger: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  };
  registerCommand: (cmd: PluginCommand) => void;
  registerTool: (tool: PluginToolDefinition) => void;
  registerHook: (hook: HookType, handler: HookHandler) => void;
}

export interface PluginAPI {
  manifest: PluginManifest;
  context: PluginContext;
  commands: Map<string, PluginCommand>;
  tools: Map<string, PluginToolDefinition>;
  hooks: Map<HookType, HookHandler[]>;
  enabled: boolean;
}

const PLUGINS_DIR = join(homedir(), '.openio', 'plugins');

const DEFAULT_MANIFEST: Omit<PluginManifest, 'name' | 'installedAt' | 'updatedAt'> = {
  version: '1.0.0',
  description: '',
  enabled: true,
  entry: 'index.js',
  commands: [],
  tools: [],
  hooks: [],
};

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export class PluginManager {
  private plugins: Map<string, PluginAPI> = new Map();

  constructor() {
    ensureDir(PLUGINS_DIR);
    this.loadAll();
  }

  private pluginDir(name: string): string {
    return join(PLUGINS_DIR, name);
  }

  private manifestPath(name: string): string {
    return join(this.pluginDir(name), 'plugin.json');
  }

  private loadAll(): void {
    ensureDir(PLUGINS_DIR);
    const entries = readdirSync(PLUGINS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        try {
          this.load(entry.name);
        } catch {
          // skip corrupt plugins
        }
      }
    }
  }

  load(name: string): PluginAPI | null {
    const mp = this.manifestPath(name);
    if (!existsSync(mp)) return null;

    const raw = readFileSync(mp, 'utf-8');
    const manifest = JSON.parse(raw) as PluginManifest;
    const api = this.buildPluginAPI(manifest);
    this.plugins.set(name, api);
    return api;
  }

  private buildPluginAPI(manifest: PluginManifest): PluginAPI {
    const commands = new Map<string, PluginCommand>();
    const tools = new Map<string, PluginToolDefinition>();
    const hooks = new Map<HookType, HookHandler[]>();

    const context: PluginContext = {
      name: manifest.name,
      manifest,
      logger: {
        info: (msg: string) => console.log(`[plugin:${manifest.name}] info: ${msg}`),
        warn: (msg: string) => console.warn(`[plugin:${manifest.name}] warn: ${msg}`),
        error: (msg: string) => console.error(`[plugin:${manifest.name}] error: ${msg}`),
      },
      registerCommand: (cmd: PluginCommand) => {
        commands.set(cmd.name, cmd);
        if (!manifest.commands.includes(cmd.name)) {
          manifest.commands.push(cmd.name);
        }
      },
      registerTool: (tool: PluginToolDefinition) => {
        tools.set(tool.name, tool);
        if (!manifest.tools.includes(tool.name)) {
          manifest.tools.push(tool.name);
        }
      },
      registerHook: (hook: HookType, handler: HookHandler) => {
        const existing = hooks.get(hook) ?? [];
        existing.push(handler);
        hooks.set(hook, existing);
        if (!manifest.hooks.includes(hook)) {
          manifest.hooks.push(hook);
        }
      },
    };

    const api: PluginAPI = {
      manifest,
      context,
      commands,
      tools,
      hooks,
      enabled: manifest.enabled,
    };

    return api;
  }

  private saveManifest(manifest: PluginManifest): void {
    const dir = this.pluginDir(manifest.name);
    ensureDir(dir);
    writeFileSync(this.manifestPath(manifest.name), JSON.stringify(manifest, null, 2), 'utf-8');
  }

  list(): PluginManifest[] {
    const result: PluginManifest[] = [];
    for (const api of this.plugins.values()) {
      result.push(api.manifest);
    }
    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }

  get(name: string): PluginAPI | undefined {
    return this.plugins.get(name);
  }

  getManifest(name: string): PluginManifest | undefined {
    return this.plugins.get(name)?.manifest;
  }

  isEnabled(name: string): boolean {
    return this.plugins.get(name)?.enabled ?? false;
  }

  enable(name: string): boolean {
    const api = this.plugins.get(name);
    if (!api) return false;
    api.enabled = true;
    api.manifest.enabled = true;
    this.saveManifest(api.manifest);
    return true;
  }

  disable(name: string): boolean {
    const api = this.plugins.get(name);
    if (!api) return false;
    api.enabled = false;
    api.manifest.enabled = false;
    this.saveManifest(api.manifest);
    return true;
  }

  create(name: string, description?: string): PluginManifest {
    if (this.plugins.has(name)) {
      throw new Error(`Plugin already exists: ${name}`);
    }
    if (!/^[a-z0-9_-]+$/.test(name)) {
      throw new Error('Plugin name must contain only lowercase letters, numbers, hyphens, and underscores');
    }

    const manifest: PluginManifest = {
      name,
      ...DEFAULT_MANIFEST,
      description: description ?? `${name} plugin`,
      installedAt: Date.now(),
      updatedAt: Date.now(),
    };

    const dir = this.pluginDir(name);
    ensureDir(dir);

    const entryContent = `export function activate(context) {
  context.logger.info('${name} activated');

  context.registerCommand({
    name: '${name}',
    description: '${description ?? name} command',
    run: async (args) => {
      console.log('Hello from ${name}! Args:', args.join(' '));
    },
  });

  context.registerHook('onStartup', async (ctx) => {
    context.logger.info('Startup hook fired for ${name}');
    return ctx;
  });
}

export function deactivate() {
  console.log('${name} deactivated');
}
`;

    writeFileSync(join(dir, 'index.js'), entryContent, 'utf-8');
    this.saveManifest(manifest);

    const api = this.buildPluginAPI(manifest);
    this.plugins.set(name, api);

    return manifest;
  }

  remove(name: string): boolean {
    const dir = this.pluginDir(name);
    if (!existsSync(dir)) return false;
    rmSync(dir, { recursive: true, force: true });
    this.plugins.delete(name);
    return true;
  }

  async activatePlugin(name: string): Promise<boolean> {
    const api = this.plugins.get(name);
    if (!api) return false;
    if (!api.enabled) return false;

    const entryPath = join(this.pluginDir(name), api.manifest.entry);
    if (!existsSync(entryPath)) {
      console.warn(`Plugin ${name}: entry not found at ${entryPath}`);
      return false;
    }

    try {
      const mod = await import(/* @vite-ignore */ entryPath);
      if (typeof mod.activate === 'function') {
        await mod.activate(api.context);
      }
      return true;
    } catch (err) {
      console.error(`Plugin ${name}: activation failed - ${(err as Error).message}`);
      return false;
    }
  }

  async activateAll(): Promise<void> {
    for (const [name, api] of this.plugins) {
      if (api.enabled) {
        try {
          await this.activatePlugin(name);
        } catch {
          // skip failed plugin activation
        }
      }
    }
  }

  async deactivatePlugin(name: string): Promise<boolean> {
    const api = this.plugins.get(name);
    if (!api) return false;

    const entryPath = join(this.pluginDir(name), api.manifest.entry);
    if (!existsSync(entryPath)) return true;

    try {
      const mod = await import(/* @vite-ignore */ entryPath);
      if (typeof mod.deactivate === 'function') {
        await mod.deactivate();
      }
      return true;
    } catch {
      return false;
    }
  }

  getCommands(name: string): PluginCommand[] {
    const api = this.plugins.get(name);
    if (!api || !api.enabled) return [];
    return Array.from(api.commands.values());
  }

  getAllCommands(): Array<{ plugin: string; command: PluginCommand }> {
    const result: Array<{ plugin: string; command: PluginCommand }> = [];
    for (const [name, api] of this.plugins) {
      if (api.enabled) {
        for (const cmd of api.commands.values()) {
          result.push({ plugin: name, command: cmd });
        }
      }
    }
    return result;
  }

  getTools(name: string): PluginToolDefinition[] {
    const api = this.plugins.get(name);
    if (!api || !api.enabled) return [];
    return Array.from(api.tools.values());
  }

  getAllTools(): Array<{ plugin: string; tool: PluginToolDefinition }> {
    const result: Array<{ plugin: string; tool: PluginToolDefinition }> = [];
    for (const [name, api] of this.plugins) {
      if (api.enabled) {
        for (const tool of api.tools.values()) {
          result.push({ plugin: name, tool });
        }
      }
    }
    return result;
  }

  async runHooks(hook: HookType, context: Record<string, unknown>): Promise<Record<string, unknown>> {
    let ctx = { ...context };
    for (const [, api] of this.plugins) {
      if (!api.enabled) continue;
      const handlers = api.hooks.get(hook);
      if (!handlers) continue;
      for (const handler of handlers) {
        try {
          const result = await handler(ctx);
          if (result) ctx = { ...ctx, ...result };
        } catch (err) {
          console.error(`Plugin hook ${hook} failed: ${(err as Error).message}`);
        }
      }
    }
    return ctx;
  }
}
