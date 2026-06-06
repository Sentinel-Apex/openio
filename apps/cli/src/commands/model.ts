import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { configManager } from '../utils/config-manager.js';
import { providerManager, OpenAIProvider, AnthropicProvider, GroqProvider, DeepSeekProvider, KimiProvider, OpenRouterProvider, OllamaProvider, modelRegistry, loadModels } from '@openio/ai';
import type { ModelConfig } from '@openio/shared';

const CACHE_PATH = join(homedir(), '.openio', 'models-cache.json');
const CACHE_TTL = 3_600_000;

const PROVIDER_CLASSES: Record<string, new () => any> = {
  openai: OpenAIProvider,
  anthropic: AnthropicProvider,
  groq: GroqProvider,
  deepseek: DeepSeekProvider,
  kimi: KimiProvider,
  openrouter: OpenRouterProvider,
  ollama: OllamaProvider,
};

type CacheEntry = { timestamp: number; models: ModelConfig[] };

function loadCache(): Record<string, CacheEntry> {
  try {
    if (existsSync(CACHE_PATH)) {
      return JSON.parse(readFileSync(CACHE_PATH, 'utf-8'));
    }
  } catch { /* ignore */ }
  return {};
}

function saveCache(data: Record<string, CacheEntry>): void {
  const dir = join(homedir(), '.openio');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(data), 'utf-8');
}

function isCacheValid(entry?: CacheEntry): boolean {
  return !!entry && (Date.now() - entry.timestamp) < CACHE_TTL;
}

function getCachedOrFetch(provider: string): CacheEntry | null {
  const cache = loadCache();
  const entry = cache[provider];
  if (isCacheValid(entry)) return entry;
  return null;
}

function setCache(provider: string, models: ModelConfig[]): void {
  const cache = loadCache();
  cache[provider] = { timestamp: Date.now(), models };
  saveCache(cache);
}

function registerAll(): void {
  for (const [name, Cls] of Object.entries(PROVIDER_CLASSES)) {
    providerManager.registerProvider(name, new Cls());
  }
}

function ensureModelsLoaded(): void {
  if (modelRegistry.size > 0) return;
  const cache = loadCache();
  for (const [provider, entry] of Object.entries(cache)) {
    if (isCacheValid(entry) && entry.models.length > 0) {
      modelRegistry.registerMany(entry.models);
    }
  }
}

function resolveProvider(modelId: string): string {
  if (modelId.includes('/')) return modelId.split('/')[0];
  const m = modelRegistry.get(modelId);
  return m?.provider ?? 'openai';
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI', anthropic: 'Anthropic', groq: 'Groq',
  deepseek: 'DeepSeek', kimi: 'Kimi', openrouter: 'OpenRouter', ollama: 'Ollama',
};

export function registerModel(program: Command): void {
  const model = program
    .command('model')
    .description('Manage AI models');

  model
    .command('list')
    .description('List available models')
    .option('-p, --provider <provider>', 'Filter by provider')
    .option('--refresh', 'Force refresh from API')
    .action(async (opts: { provider?: string; refresh?: boolean }) => {
      const targetProvider = opts.provider;

      if (opts.refresh || !getCachedOrFetch(targetProvider ?? 'openai')) {
        registerAll();
        const providers = targetProvider ? [targetProvider] : Object.keys(PROVIDER_CLASSES);
        const spinner = ora({ text: 'Fetching models...', color: 'cyan' }).start();

        for (const p of providers) {
          if (!PROVIDER_CLASSES[p]) continue;
          try {
            const prov = providerManager.getProvider(p);
            const models = await prov.getModels();
            if (models.length > 0) {
              modelRegistry.registerMany(models);
              setCache(p, models);
            }
          } catch { /* skip unresponsive providers */ }
        }

        spinner.succeed('Models loaded');
      } else {
        ensureModelsLoaded();
      }

      const all = targetProvider
        ? modelRegistry.getByProvider(targetProvider)
        : modelRegistry.getAll();

      const activeModel = configManager.getModel();

      if (all.length === 0) {
        console.log(chalk.yellow('\n  No models found.\n'));
        return;
      }

      console.log(chalk.bold.cyan(`\n  ${targetProvider ? PROVIDER_LABELS[targetProvider] ?? targetProvider : 'All'} Models (${all.length})\n`));

      for (const m of all) {
        const isActive = m.id === activeModel || activeModel.endsWith(m.id);
        const prefix = isActive ? chalk.green('✓') : ' ';
        const name = isActive ? chalk.bold(m.id) : m.id;
        const ctx = `${(m.contextWindow / 1000).toFixed(0)}k`.padStart(6);
        const tags = [
          m.supportsVision ? chalk.magenta('vision') : '',
          m.supportsStreaming ? chalk.cyan('stream') : '',
        ].filter(Boolean).join(' ');

        console.log(`  ${prefix} ${String(name).padEnd(48)} ${chalk.dim(ctx)}  ${tags}`);
      }

      console.log(chalk.dim(`\n  ✓ = active model\n`));
    });

  model
    .command('use <model>')
    .description('Set the default model')
    .action((modelId: string) => {
      ensureModelsLoaded();
      const existing = modelRegistry.get(modelId) ?? modelRegistry.find(modelId)?.[0];

      if (existing) {
        configManager.setModel(existing.id);
        const provider = PROVIDER_LABELS[existing.provider] ?? existing.provider;
        console.log(chalk.green(`\n  ✓ Default model set to ${chalk.bold(existing.id)}`));
        console.log(chalk.dim(`    Provider: ${provider}  |  Context: ${(existing.contextWindow / 1000).toFixed(0)}k tokens\n`));
      } else {
        configManager.setModel(modelId);
        console.log(chalk.green(`\n  ✓ Default model set to ${chalk.bold(modelId)}`));
        console.log(chalk.dim(`    (not in registry — run 'openio model list --refresh' to populate)\n`));
      }
    });

  model
    .command('search <term>')
    .description('Search models by name, provider, or capability')
    .option('-p, --provider <provider>', 'Limit search to a specific provider')
    .action((term: string, opts: { provider?: string }) => {
      ensureModelsLoaded();

      let results = opts.provider
        ? modelRegistry.getByProvider(opts.provider)
        : modelRegistry.getAll();

      const q = term.toLowerCase();
      results = results.filter(
        (m) =>
          m.id.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q) ||
          m.provider.toLowerCase().includes(q),
      );

      if (results.length === 0) {
        console.log(chalk.yellow(`\n  No models matching '${term}'.\n`));
        return;
      }

      console.log(chalk.bold.cyan(`\n  Search results for '${term}' (${results.length})\n`));

      for (const m of results.slice(0, 25)) {
        const label = PROVIDER_LABELS[m.provider] ?? m.provider;
        const matchTag = m.id.toLowerCase().includes(q) ? chalk.cyan('name') :
          m.name.toLowerCase().includes(q) ? chalk.cyan('name') :
          m.provider.toLowerCase().includes(q) ? chalk.cyan('provider') : '';
        console.log(`  ${chalk.cyan('▸')} ${m.id.padEnd(48)} ${chalk.dim(label.padEnd(12))} ${matchTag}`);
      }

      if (results.length > 25) console.log(chalk.dim(`  ... and ${results.length - 25} more`));
      console.log();
    });

  model
    .command('info <model>')
    .description('Show detailed information about a model')
    .action((modelId: string) => {
      ensureModelsLoaded();
      const m = modelRegistry.get(modelId) ?? modelRegistry.find(modelId)?.[0];

      if (!m) {
        console.log(chalk.yellow(`\n  Model '${modelId}' not found in registry.\n`));
        return;
      }

      console.log(chalk.bold.cyan('\n  Model Details\n'));
      console.log(`  ${chalk.bold('ID:')}             ${m.id}`);
      console.log(`  ${chalk.bold('Name:')}           ${m.name}`);
      console.log(`  ${chalk.bold('Provider:')}       ${PROVIDER_LABELS[m.provider] ?? m.provider}`);
      console.log(`  ${chalk.bold('Context Window:')}  ${m.contextWindow.toLocaleString()} tokens`);
      console.log(`  ${chalk.bold('Max Output:')}      ${m.maxOutputTokens.toLocaleString()} tokens`);
      console.log(`  ${chalk.bold('Streaming:')}       ${m.supportsStreaming ? chalk.green('✓ yes') : chalk.red('✗ no')}`);
      console.log(`  ${chalk.bold('Vision:')}          ${m.supportsVision ? chalk.green('✓ yes') : chalk.dim('—')}`);

      const activeModel = configManager.getModel();
      const isActive = m.id === activeModel || activeModel.endsWith(m.id);
      console.log(`  ${chalk.bold('Active:')}          ${isActive ? chalk.green('✓ current default') : chalk.dim('no')}`);

      const capTags = [
        m.supportsVision ? 'image input' : '',
        m.supportsStreaming ? 'streaming output' : '',
        m.contextWindow >= 100000 ? 'long context' : '',
        m.maxOutputTokens >= 8192 ? 'extended output' : '',
      ].filter(Boolean);
      if (capTags.length > 0) {
        console.log(`  ${chalk.bold('Capabilities:')}    ${chalk.dim(capTags.join(', '))}`);
      }
      console.log();
    });

  model
    .command('compare')
    .description('Compare model outputs for the same prompt')
    .argument('<prompt>', 'The prompt to test across models')
    .option('-m, --models <models>', 'Comma-separated model IDs to compare', 'gpt-4o,claude-sonnet-4-20250514')
    .action(async (prompt: string, opts: { models: string }) => {
      const modelIds = opts.models.split(',').map((s: string) => s.trim()).filter(Boolean);

      if (modelIds.length < 2) {
        console.error(chalk.red('Provide at least 2 models with --models.'));
        return;
      }

      registerAll();

      console.log(chalk.bold.cyan('\n  Model Comparison\n'));
      console.log(`  ${chalk.bold('Prompt:')} ${chalk.dim(prompt.slice(0, 120) + (prompt.length > 120 ? '...' : ''))}\n`);

      const results: { model: string; output: string; duration: number; tokens: number }[] = [];

      for (const id of modelIds) {
        const spinner = ora({ text: `${id.padEnd(35)} generating...`, color: 'cyan' }).start();
        const start = Date.now();

        try {
          const provider = resolveProvider(id);
          const key = configManager.getApiKey(provider);
          if (key) providerManager.registerApiKeys(provider, [key]);

          const result = await providerManager.generate({
            model: id,
            messages: [
              { role: 'system', content: 'Respond concisely. No extra text, just the answer.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            maxTokens: 500,
          });

          const duration = Date.now() - start;
          const tokens = result.usage?.totalTokens ?? 0;
          spinner.succeed(id);
          results.push({ model: id, output: result.content, duration, tokens });
        } catch (err) {
          spinner.fail(`${id} failed`);
          results.push({ model: id, output: '', duration: Date.now() - start, tokens: 0 });
        }
      }

      console.log(chalk.bold.cyan('\n  Results\n'));
      for (const r of results) {
        const header = r.output ? chalk.green(`▸ ${r.model}`) : chalk.red(`▸ ${r.model} (failed)`);
        console.log(`  ${header}`);
        if (r.output) {
          console.log(`  ${chalk.dim(r.output.slice(0, 300))}`);
        }
        console.log(`  ${chalk.dim(`   ${r.duration}ms · ${r.tokens} tokens`)}\n`);
      }
    });
}
