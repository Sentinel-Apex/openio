import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { select, input, password } from '@inquirer/prompts';
import { configManager } from '../utils/config-manager.js';
import {
  providerManager,
  OpenAIProvider,
  AnthropicProvider,
  GroqProvider,
  DeepSeekProvider,
  OllamaProvider,
  modelRegistry,
  loadModels,
  getDefaultModel,
} from '@openio/ai';

const PROVIDERS = [
  { name: 'Ollama (local, free)', value: 'ollama' },
  { name: 'OpenAI', value: 'openai' },
  { name: 'Anthropic', value: 'anthropic' },
  { name: 'Groq', value: 'groq' },
  { name: 'DeepSeek', value: 'deepseek' },
] as const;

function providerLabel(value: string): string {
  return PROVIDERS.find((p) => p.value === value)?.name ?? value;
}

function registerProviders(): void {
  providerManager.registerProvider('openai', new OpenAIProvider());
  providerManager.registerProvider('anthropic', new AnthropicProvider());
  providerManager.registerProvider('groq', new GroqProvider());
  providerManager.registerProvider('deepseek', new DeepSeekProvider());
  providerManager.registerProvider('ollama', new OllamaProvider());
}

async function fetchModels(provider: string, apiKey?: string): Promise<string[]> {
  if (apiKey) {
    providerManager.registerApiKeys(provider, [apiKey]);
  }
  registerProviders();

  const spinner = ora({ text: `Fetching models from ${providerLabel(provider)}...`, color: 'cyan' }).start();
  try {
    await loadModels({ providers: [provider], refresh: true });
    const models = modelRegistry.getByProvider(provider).map((m) => m.id);
    spinner.succeed(`Found ${models.length} models from ${providerLabel(provider)}`);
    return models;
  } catch (err) {
    spinner.warn(`Could not fetch models: ${(err as Error).message}`);
    return [];
  }
}

async function testConnection(provider: string): Promise<boolean> {
  const p = providerManager.getProvider(provider);
  if (!p) return false;

  const spinner = ora({ text: `Testing connection to ${providerLabel(provider)}...`, color: 'cyan' }).start();
  try {
    const models = await p.getModels();
    const ok = models.length > 0;
    if (ok) spinner.succeed(`Connected to ${providerLabel(provider)}`);
    else spinner.warn('Connected but no models returned');
    return ok;
  } catch (err) {
    spinner.fail(`Connection failed: ${(err as Error).message}`);
    return false;
  }
}

async function runSetup(): Promise<void> {
  console.log();
  console.log(chalk.cyan('  ╔══════════════════════════════════════╗'));
  console.log(chalk.cyan('  ║       OpenIO Setup Wizard           ║'));
  console.log(chalk.cyan('  ╚══════════════════════════════════════╝'));
  console.log(chalk.dim('  Let\'s get you configured.\n'));

  const provider = await select({
    message: 'Choose your AI provider:',
    choices: [...PROVIDERS],
  });

  let apiKey = '';

  if (provider !== 'ollama') {
    apiKey = await password({
      message: `Enter your ${providerLabel(provider)} API key:`,
      validate: (v: string) => v.length > 0 || 'API key is required',
    });
  }

  if (apiKey) {
    configManager.setApiKey(provider, apiKey);
  }

  let models = await fetchModels(provider, apiKey || undefined);

  let defaultModel: string;
  if (models.length > 0) {
    defaultModel = await select({
      message: 'Select your default model:',
      choices: models.map((m) => ({ name: m, value: m })),
    });
  } else {
    defaultModel = await input({
      message: 'Enter default model name:',
      default: getDefaultModel(provider),
    });
  }

  configManager.setActiveProvider(provider);
  configManager.setModel(defaultModel);
  configManager.markFirstRunDone();

  const connected = await testConnection(provider);

  console.log();
  console.log(chalk.green('  ✓ Setup complete!'));
  console.log(chalk.dim(`  Provider:     ${providerLabel(provider)}`));
  console.log(chalk.dim(`  Model:        ${defaultModel}`));
  if (apiKey) {
    const masked = apiKey.length > 8
      ? apiKey.slice(0, 4) + '****' + apiKey.slice(-4)
      : apiKey.slice(0, 4) + '****';
    console.log(chalk.dim(`  API Key:      ${masked}`));
  }
  console.log(chalk.dim(`  Config:       ~/.openio/config.json`));
  console.log();
  console.log(chalk.cyan('  Run ') + chalk.bold('openio chat') + chalk.cyan(' to start a conversation.\n'));
}

export function registerSetup(program: Command): void {
  program
    .command('setup')
    .description('Run the interactive setup wizard')
    .action(async () => {
      try {
        await runSetup();
      } catch (err) {
        process.exit(1);
      }
    });
}

export { runSetup };
