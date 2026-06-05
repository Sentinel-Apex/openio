import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { configManager } from '@openio/shared';
import { providerManager, OpenAIProvider, AnthropicProvider, GroqProvider, DeepSeekProvider, OllamaProvider } from '@openio/ai';
import { logger } from '../utils/logger.js';
import { runSetup } from './setup.js';

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  groq: 'Groq',
  deepseek: 'DeepSeek',
  ollama: 'Ollama',
};

function maskKey(key: string): string {
  if (key.length <= 8) return key.slice(0, 4) + '****';
  return key.slice(0, 4) + '****' + key.slice(-4);
}

function registerAllProviders(): void {
  providerManager.registerProvider('openai', new OpenAIProvider());
  providerManager.registerProvider('anthropic', new AnthropicProvider());
  providerManager.registerProvider('groq', new GroqProvider());
  providerManager.registerProvider('deepseek', new DeepSeekProvider());
  providerManager.registerProvider('ollama', new OllamaProvider());
}

function getActiveProvider(): string {
  const model = configManager.getModel();
  const known = Object.keys(PROVIDER_LABELS);
  return known.find((p) => model.startsWith(p) || model.startsWith(PROVIDER_LABELS[p].toLowerCase())) ?? 'unknown';
}

export function registerConfig(program: Command): void {
  const config = program
    .command('config')
    .description('View and modify configuration');

  config
    .command('show')
    .description('Show current configuration (API keys masked)')
    .action(() => {
      const cfg = configManager.load();

      console.log(chalk.bold.cyan('\n  OpenIO Configuration'));
      console.log(chalk.dim('  ─────────────────────────────────────'));

      console.log(`  ${chalk.bold('Model:')}       ${chalk.green(cfg.defaultModel)}`);
      console.log(`  ${chalk.bold('Agent:')}       ${chalk.green(cfg.defaultAgent)}`);
      console.log(`  ${chalk.bold('Theme:')}       ${cfg.theme === 'dark' ? chalk.magenta('dark') : chalk.yellow('light')}`);
      console.log(`  ${chalk.bold('Timestamps:')}  ${cfg.showTimestamps ? chalk.green('yes') : chalk.dim('no')}`);

      const providerKeys = Object.entries(cfg.apiKeys);
      if (providerKeys.length > 0) {
        console.log(chalk.dim('\n  ─── API Keys ───'));
        for (const [provider, key] of providerKeys) {
          const label = PROVIDER_LABELS[provider] ?? provider;
          console.log(`  ${chalk.bold(label + ':')}   ${chalk.dim(maskKey(key))}`);
        }
      }

      if (cfg.mcpServers.length > 0) {
        console.log(chalk.dim('\n  ─── MCP Servers ───'));
        for (const s of cfg.mcpServers) {
          console.log(`  ${chalk.bold(s.id)}  ${chalk.dim(`${s.transport} ${s.target}`)}`);
        }
      }

      if (cfg.recentSessions.length > 0) {
        console.log(chalk.dim('\n  ─── Recent Sessions ───'));
        for (const id of cfg.recentSessions.slice(0, 5)) {
          console.log(`  ${chalk.dim(id.slice(0, 12) + '...')}`);
        }
      }

      console.log(chalk.dim('  ─────────────────────────────────────\n'));
    });

  const setCmd = config
    .command('set')
    .description('Set a configuration value');

  setCmd
    .command('provider <name>')
    .description('Set active provider (openai, anthropic, groq, deepseek, ollama)')
    .action((name: string) => {
      const p = name.toLowerCase();
      if (!PROVIDER_LABELS[p]) {
        logger.error(`Unknown provider: ${p}. Options: ${Object.keys(PROVIDER_LABELS).join(', ')}`);
        return;
      }
      const key = configManager.getApiKey(p);
      if (!key && p !== 'ollama') {
        logger.warn(`No API key set for ${PROVIDER_LABELS[p]}. Use 'openio config set api-key' first.`);
      }
      const model = configManager.getModel();
      const newModel = model.includes('/') ? `${p}/${model.split('/').pop()}` : `${p}/default`;
      configManager.setModel(newModel);
      configManager.setProvider(p);
      logger.success(`Provider set to ${chalk.bold(PROVIDER_LABELS[p])}`);
    });

  setCmd
    .command('api-key <key>')
    .description('Set API key for the active provider')
    .action((key: string) => {
      const provider = getActiveProvider();
      if (provider === 'unknown' || provider === 'ollama') {
        configManager.setApiKey('openai', key);
        logger.success(`API key saved for ${chalk.bold('OpenAI')}`);
        return;
      }
      configManager.setApiKey(provider, key);
      process.env[`${provider.toUpperCase()}_API_KEY`] = key;
      logger.success(`API key saved for ${chalk.bold(PROVIDER_LABELS[provider] ?? provider)}`);
    });

  setCmd
    .command('model <model>')
    .description('Set default model ID')
    .action((model: string) => {
      configManager.setModel(model);
      logger.success(`Default model set to ${chalk.bold(model)}`);
    });

  config
    .command('wizard')
    .description('Run the interactive setup wizard again')
    .action(async () => {
      try {
        await runSetup();
      } catch (err) {
        logger.error('Setup failed:', (err as Error).message);
      }
    });

  config
    .command('reset')
    .description('Reset all configuration to defaults')
    .action(() => {
      console.log(chalk.yellow('\n  ⚠  This will erase all configuration including API keys.\n'));
      logger.step('Resetting config...');
      configManager.reset();
      configManager.markFirstRunDone();
      logger.success('Configuration has been reset to defaults.');
      console.log(chalk.dim('  Run ') + chalk.cyan('openio setup') + chalk.dim(' to reconfigure.\n'));
    });

  config
    .command('test')
    .description('Test connection with current settings')
    .action(async () => {
      const model = configManager.getModel();
      const provider = getActiveProvider();

      console.log(chalk.bold.cyan('\n  Testing OpenIO Connection\n'));

      if (provider === 'unknown') {
        logger.error('No provider configured. Run openio setup first.');
        return;
      }

      const apiKey = configManager.getApiKey(provider);
      const label = PROVIDER_LABELS[provider] ?? provider;

      console.log(`  ${chalk.bold('Provider:')}  ${label}`);
      console.log(`  ${chalk.bold('Model:')}     ${model}`);
      console.log(`  ${chalk.bold('API Key:')}   ${apiKey ? chalk.dim(maskKey(apiKey)) : chalk.red('not set')}`);

      if (!apiKey && provider !== 'ollama') {
        logger.error(`No API key for ${label}. Use 'openio config set api-key'.`);
        return;
      }

      registerAllProviders();

      if (apiKey) {
        providerManager.registerApiKeys(provider, [apiKey]);
      }

      const spinner = ora({ text: `Connecting to ${label}...`, color: 'cyan' }).start();

      try {
        const p = providerManager.getProvider(provider);
        const models = await p.getModels();
        spinner.succeed(`Connected to ${label}`);

        if (models.length > 0) {
          const found = models.find((m) => m.id === model);
          if (found) {
            logger.success(`Model '${model}' is available (${found.contextWindow.toLocaleString()} token context)`);
          } else {
            logger.warn(`Model '${model}' not found in provider's model list`);
            console.log(chalk.dim(`  Available models: ${models.slice(0, 5).map((m) => m.id).join(', ')}${models.length > 5 ? '...' : ''}`));
          }
        } else {
          logger.warn('No models returned from provider');
        }

        console.log(chalk.dim('\n  Connection test passed.\n'));
      } catch (err) {
        spinner.fail('Connection failed');
        logger.error(`Could not reach ${label}: ${(err as Error).message}`);
        console.log(chalk.dim('  Check your network connection and API key.\n'));
      }
    });

  config
    .command('help')
    .description('Show config command help')
    .action(() => {
      config.help();
    });
}
