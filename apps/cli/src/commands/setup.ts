import { Command } from 'commander';
import chalk from 'chalk';
import { configManager, ConfigError } from '@openio/shared';
import { providerManager, OpenAIProvider, AnthropicProvider, GroqProvider, DeepSeekProvider, OllamaProvider, modelRegistry, loadModels, getDefaultModel } from '@openio/ai';
import { logger } from '../utils/logger.js';
import { askSelect, askInput, askPassword } from '../utils/prompt.js';

const PROVIDERS = [
  { name: 'OpenAI', value: 'openai' },
  { name: 'Anthropic', value: 'anthropic' },
  { name: 'Groq', value: 'groq' },
  { name: 'DeepSeek', value: 'deepseek' },
  { name: 'Ollama (local)', value: 'ollama' },
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

async function fetchModels(provider: string, apiKey?: string, ollamaUrl?: string): Promise<string[]> {
  if (provider === 'ollama' && ollamaUrl) {
    process.env.OLLAMA_HOST = ollamaUrl;
  }

  if (apiKey) {
    providerManager.registerApiKeys(provider, [apiKey]);
  }

  registerProviders();
  await loadModels({ providers: [provider], refresh: true });

  return modelRegistry.getByProvider(provider).map((m) => m.id);
}

function setProviderApiKey(provider: string, key: string): void {
  if (key) {
    process.env[`${provider.toUpperCase()}_API_KEY`] = key;
    configManager.setApiKey(provider, key);
  }
}

async function testConnection(provider: string): Promise<boolean> {
  const p = providerManager.getProvider(provider);
  if (!p) return false;

  try {
    const models = await p.getModels();
    return models.length > 0;
  } catch {
    return false;
  }
}

async function runSetup(): Promise<void> {
  console.log(chalk.cyan('\n  ╔══════════════════════════════════════╗'));
  console.log(chalk.cyan('  ║     OpenIO Setup Wizard             ║'));
  console.log(chalk.cyan('  ╚══════════════════════════════════════╝'));
  console.log(chalk.dim('  Let\'s get you configured in a few steps.\n'));

  const provider = await askSelect('Choose your AI provider', [...PROVIDERS]);

  let apiKey = '';
  let ollamaUrl = '';

  if (provider === 'ollama') {
    ollamaUrl = await askInput('Ollama server URL', { default: 'http://localhost:11434' });
  } else {
    apiKey = await askPassword(`Enter your ${providerLabel(provider)} API key`);
    if (!apiKey) {
      logger.error('API key is required for this provider');
      return;
    }
  }

  setProviderApiKey(provider, apiKey);

  logger.step(`Fetching available models from ${providerLabel(provider)}...`);

  let models: string[] = [];
  try {
    models = await fetchModels(provider, apiKey || undefined, ollamaUrl || undefined);
  } catch (err) {
    logger.warn(`Could not fetch models: ${(err as Error).message}`);
  }

  let defaultModel: string;
  if (models.length > 0) {
    defaultModel = await askSelect('Select default model', models.map((m) => ({ name: m, value: m })));
  } else {
    defaultModel = await askInput('Enter default model name', { default: getDefaultModel(provider) });
  }

  const defaultAgent = await askSelect('Select default agent', [
    { name: 'Manager (auto-delegates to specialists)', value: 'manager' },
    { name: 'Backend (APIs, services, business logic)', value: 'backend' },
    { name: 'Frontend (UI, components, pages)', value: 'frontend' },
    { name: 'Database (schema, queries, migrations)', value: 'database' },
    { name: 'DevOps (Docker, CI/CD, deployment)', value: 'devops' },
  ]);

  logger.step('Testing connection...');
  let connected = false;
  try {
    connected = await testConnection(provider);
  } catch {
    connected = false;
  }

  if (connected) {
    logger.success('Connection successful!');
  } else {
    logger.warn('Could not verify connection. You can run openio doctor to debug.');
  }

  configManager.setModel(defaultModel);
  configManager.setProvider(defaultAgent);
  configManager.markFirstRunDone();

  console.log(chalk.green('\n  ✓ Setup complete!'));
  console.log(chalk.dim(`  Provider:     ${providerLabel(provider)}`));
  console.log(chalk.dim(`  Model:        ${defaultModel}`));
  console.log(chalk.dim(`  Agent:        ${defaultAgent}`));
  console.log(chalk.dim(`  Config:       ~/.openio/config.json\n`));
  console.log(chalk.cyan('  Run') + chalk.bold(' openio chat ') + chalk.cyan('to start a conversation.\n'));
}

export function registerSetup(program: Command): void {
  program
    .command('setup')
    .description('Run the interactive setup wizard')
    .action(async () => {
      try {
        await runSetup();
      } catch (err) {
        logger.error('Setup failed:', (err as Error).message);
        process.exit(1);
      }
    });
}

export { runSetup };
