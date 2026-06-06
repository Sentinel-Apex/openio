import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { configManager } from '../utils/config-manager.js';
import { providerManager, OpenAIProvider, AnthropicProvider, GroqProvider, DeepSeekProvider, KimiProvider, OpenRouterProvider, OllamaProvider } from '@openio/ai';

const PROVIDER_MAP: Record<string, { label: string; envVar: string }> = {
  openai: { label: 'OpenAI', envVar: 'OPENAI_API_KEY' },
  anthropic: { label: 'Anthropic', envVar: 'ANTHROPIC_API_KEY' },
  groq: { label: 'Groq', envVar: 'GROQ_API_KEY' },
  deepseek: { label: 'DeepSeek', envVar: 'DEEPSEEK_API_KEY' },
  kimi: { label: 'Kimi', envVar: 'KIMI_API_KEY' },
  openrouter: { label: 'OpenRouter', envVar: 'OPENROUTER_API_KEY' },
  ollama: { label: 'Ollama', envVar: '' },
};

const PROVIDER_CLASSES: Record<string, new () => any> = {
  openai: OpenAIProvider,
  anthropic: AnthropicProvider,
  groq: GroqProvider,
  deepseek: DeepSeekProvider,
  kimi: KimiProvider,
  openrouter: OpenRouterProvider,
  ollama: OllamaProvider,
};

function maskKey(key: string): string {
  if (!key) return chalk.dim('not set');
  if (key.length <= 8) return key.slice(0, 4) + '****';
  return key.slice(0, 4) + '****' + key.slice(-4);
}

function getActiveProviderFromConfig(): string | null {
  const model = configManager.getModel().toLowerCase();
  for (const key of Object.keys(PROVIDER_MAP)) {
    if (model.startsWith(key) || model.startsWith(PROVIDER_MAP[key].label.toLowerCase())) return key;
  }
  return null;
}

function registerAll(): void {
  for (const [name, Cls] of Object.entries(PROVIDER_CLASSES)) {
    providerManager.registerProvider(name, new Cls());
  }
}

export function registerProvider(program: Command): void {
  const provider = program
    .command('provider')
    .description('Manage AI providers');

  provider
    .command('list')
    .description('List all configured providers')
    .action(() => {
      const cfg = configManager.load();
      const active = getActiveProviderFromConfig();

      console.log(chalk.bold.cyan('\n  Configured Providers\n'));

      const header = `  ${chalk.bold('Active')}  ${chalk.bold('Provider'.padEnd(14))} ${chalk.bold('Key'.padEnd(30))} ${chalk.bold('Models')}`;
      console.log(header);
      console.log(chalk.dim('  ' + '─'.repeat(70)));

      for (const [name, meta] of Object.entries(PROVIDER_MAP)) {
        const isOllama = name === 'ollama';
        const key = cfg.apiKeys[name] || process.env[meta.envVar] || '';
        const isActive = name === active;

        const activeMark = isActive ? chalk.green('✓') : ' ';
        const providerName = chalk.bold(meta.label.padEnd(14));
        const keyDisplay = isOllama ? chalk.dim('local'.padEnd(30)) : maskKey(key).padEnd(30);
        const envHint = key ? '' : chalk.dim(`(set ${meta.envVar} or use config set api-key)`);

        console.log(`  ${activeMark}    ${providerName} ${chalk[key ? 'green' : 'red'](keyDisplay)} ${envHint}`);
      }

      const configuredCount = Object.keys(cfg.apiKeys).length;
      console.log(chalk.dim(`\n  ${configuredCount} API key(s) configured`));
      console.log(chalk.dim(`  Active provider: ${active ? chalk.green(PROVIDER_MAP[active].label) : chalk.red('none')}\n`));
    });

  provider
    .command('add')
    .description('Add a new provider configuration')
    .argument('<name>', 'Provider name (openai, anthropic, groq, deepseek, kimi, openrouter, ollama)')
    .option('--api-key <key>', 'API key for the provider')
    .option('--url <url>', 'Base URL for Ollama')
    .action((name: string, opts: { apiKey?: string; url?: string }) => {
      const p = name.toLowerCase();

      if (!PROVIDER_MAP[p]) {
        console.error(chalk.red(`Unknown provider '${p}'. Options: ${Object.keys(PROVIDER_MAP).join(', ')}`));
        return;
      }

      if (p === 'ollama') {
        const url = opts.url || 'http://localhost:11434';
        process.env.OLLAMA_HOST = url;
        console.log(chalk.green(`  ✓ Ollama configured at ${chalk.bold(url)}`));
        return;
      }

      if (!opts.apiKey) {
        console.error(chalk.red(`  --api-key <key> is required for ${PROVIDER_MAP[p].label}`));
        return;
      }

      configManager.setApiKey(p, opts.apiKey);
      process.env[PROVIDER_MAP[p].envVar] = opts.apiKey;

      console.log(chalk.green(`  ✓ ${chalk.bold(PROVIDER_MAP[p].label)} added`));
      console.log(chalk.dim(`    API key: ${maskKey(opts.apiKey)}`));
    });

  provider
    .command('use <name>')
    .description('Switch the active provider')
    .action((name: string) => {
      const p = name.toLowerCase();

      if (!PROVIDER_MAP[p]) {
        console.error(chalk.red(`Unknown provider '${p}'. Options: ${Object.keys(PROVIDER_MAP).join(', ')}`));
        return;
      }

      const key = configManager.getApiKey(p);
      if (!key && p !== 'ollama') {
        console.warn(chalk.yellow(`  ⚠  No API key set for ${PROVIDER_MAP[p].label}`));
        console.warn(chalk.dim(`     Set it with: openio config set api-key <key>`));
      }

      const currentModel = configManager.getModel();
      const modelPrefix = p;
      const updatedModel = currentModel.includes('/')
        ? currentModel.replace(/^[^/]+/, modelPrefix)
        : `${modelPrefix}/${currentModel}`;

      configManager.setModel(updatedModel);
      configManager.setActiveProvider(p);

      console.log(chalk.green(`\n  ✓ Switched to ${chalk.bold(PROVIDER_MAP[p].label)}`));
      console.log(chalk.dim(`    Model: ${updatedModel}\n`));
    });

  provider
    .command('remove <name>')
    .description('Remove a provider configuration')
    .action((name: string) => {
      const p = name.toLowerCase();

      if (!PROVIDER_MAP[p]) {
        console.error(chalk.red(`Unknown provider '${p}'.`));
        return;
      }

      const cfg = configManager.load();
      if (!cfg.apiKeys[p]) {
        console.warn(chalk.yellow(`  No API key configured for ${PROVIDER_MAP[p].label}. Nothing to remove.`));
        return;
      }

      delete cfg.apiKeys[p];
      configManager.save(cfg);

      console.log(chalk.green(`  ✓ Removed API key for ${chalk.bold(PROVIDER_MAP[p].label)}`));
      console.log(chalk.dim(`    You can re-add it with: openio provider add ${p} --api-key <key>\n`));
    });

  provider
    .command('test <name>')
    .description('Test connection to a provider')
    .action(async (name: string) => {
      const p = name.toLowerCase();

      if (!PROVIDER_MAP[p]) {
        console.error(chalk.red(`Unknown provider '${p}'. Options: ${Object.keys(PROVIDER_MAP).join(', ')}`));
        return;
      }

      const label = PROVIDER_MAP[p].label;
      const apiKey = configManager.getApiKey(p);

      console.log(chalk.bold.cyan(`\n  Testing ${label}\n`));

      if (p !== 'ollama') {
        if (apiKey) {
          console.log(`  ${chalk.bold('API Key:')}  ${chalk.dim(maskKey(apiKey))}`);
        } else {
          console.log(`  ${chalk.bold('API Key:')}  ${chalk.red('not set')}`);
          console.error(chalk.red(`  No API key for ${label}. Set it first.`));
          return;
        }
      }

      registerAll();

      if (apiKey) providerManager.registerApiKeys(p, [apiKey]);

      const spinner = ora({ text: `Connecting to ${label}...`, color: 'cyan' }).start();

      try {
        const prov = providerManager.getProvider(p);
        const models = await prov.getModels();
        spinner.succeed(`Connected to ${label}`);

        console.log(chalk.green(`  ✓ Authentication: passed`));
        console.log(chalk.green(`  ✓ Models found:   ${models.length}`));

        if (models.length > 0) {
          console.log(chalk.dim(`\n  Available models:`));
          for (const m of models.slice(0, 10)) {
            const tags = [
              m.supportsVision ? 'vision' : '',
              m.supportsStreaming ? 'streaming' : '',
              `${(m.contextWindow / 1000).toFixed(0)}k ctx`,
            ].filter(Boolean).join(', ');
            console.log(`    ${chalk.cyan('▸')} ${m.id.padEnd(40)} ${chalk.dim(tags)}`);
          }
          if (models.length > 10) console.log(chalk.dim(`    ... and ${models.length - 10} more`));
        }

        console.log(chalk.dim(`\n  Connection test ${chalk.green('passed')}.\n`));
      } catch (err) {
        spinner.fail(`Connection to ${label} failed`);
        console.error(chalk.red(`  ✗ ${(err as Error).message}`));
        console.log(chalk.dim(`  Check your network and API key.\n`));
      }
    });
}
