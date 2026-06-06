import { Command } from 'commander';
import { createInterface } from 'node:readline';
import chalk from 'chalk';
import { configManager } from '../utils/config-manager.js';
import { logger } from '../utils/logger.js';

const KNOWN_PROVIDERS = ['openai', 'anthropic', 'groq', 'deepseek', 'ollama'] as const;

const PROVIDER_MODELS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
  groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
  deepseek: ['deepseek-chat', 'deepseek-coder'],
  ollama: ['llama3.2', 'llama3.1', 'mistral', 'codellama', 'phi3'],
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI', anthropic: 'Anthropic', groq: 'Groq',
  deepseek: 'DeepSeek', ollama: 'Ollama',
};

function showBanner(): void {
  console.log();
  console.log(chalk.cyan('  ╔══════════════════════════════════════╗'));
  console.log(chalk.cyan('  ║       OpenIO Interactive Chat      ║'));
  console.log(chalk.cyan('  ╚══════════════════════════════════════╝'));
  console.log(chalk.dim('  Type /help for commands, /exit to quit.\n'));
}

function getConfiguredProviders(): string[] {
  const cfg = configManager.load();
  const configured = new Set(Object.keys(cfg.apiKeys));
  if (cfg.activeProvider === 'ollama') configured.add('ollama');
  return KNOWN_PROVIDERS.filter((p) => configured.has(p) || p === 'ollama');
}

export function registerChat(program: Command): void {
  program
    .command('chat')
    .description('Start an interactive chat session')
    .action(() => {
      configManager.markFirstRunDone();

      showBanner();
      const rl = createInterface({ input: process.stdin, output: process.stdout });

      const ask = () => {
        rl.question(chalk.cyan('> '), (input) => {
          const trimmed = input.trim();
          if (!trimmed) { ask(); return; }

          if (trimmed.startsWith('/')) {
            const parts = trimmed.slice(1).split(/\s+/);
            const cmd = parts[0];
            const args = parts.slice(1);

            switch (cmd) {
              case 'exit':
              case 'quit':
                rl.close();
                return;

              case 'clear':
                console.clear();
                showBanner();
                ask();
                return;

              case 'help':
                console.log(chalk.dim(`
  /model                     Show active model
  /models                    List available models
  /model set <name>          Switch model

  /provider                  Show active provider
  /provider list             List configured providers
  /provider set <name>       Switch provider

  /clear                     Clear screen
  /exit, /quit               Exit chat
  /help                      Show this help
                `));
                ask();
                return;

              case 'model':
                if (args[0] === 'set') {
                  const name = args.slice(1).join(' ');
                  if (!name) {
                    logger.warn('Usage: /model set <name>');
                  } else {
                    configManager.setModel(name);
                    logger.success(`Switched to model: ${name}`);
                  }
                } else {
                  const active = configManager.getModel();
                  logger.info(`Current model: ${active}`);
                }
                ask();
                return;

              case 'models': {
                const provider = configManager.getActiveProvider();
                const models = PROVIDER_MODELS[provider] ?? [];
                console.log(chalk.dim(`Available models for ${PROVIDER_LABELS[provider] ?? provider}:`));
                for (const m of models) {
                  const marker = m === configManager.getModel() ? chalk.green('▸') : ' ';
                  console.log(`  ${marker} ${chalk.cyan(m)}`);
                }
                ask();
                return;
              }

              case 'provider':
                if (args[0] === 'list') {
                  const active = configManager.getActiveProvider();
                  const configured = getConfiguredProviders();
                  for (const p of KNOWN_PROVIDERS) {
                    const isActive = p === active;
                    const isConfigured = configured.includes(p);
                    const label = PROVIDER_LABELS[p] ?? p;
                    const status = isActive
                      ? chalk.green(' (active)')
                      : isConfigured
                        ? chalk.dim(' (configured)')
                        : '';
                    console.log(`  ${isActive ? chalk.green('▸') : ' '} ${chalk.cyan(label)}${status}`);
                  }
                } else if (args[0] === 'set') {
                  const name = args[1];
                  if (!name || !KNOWN_PROVIDERS.includes(name as any)) {
                    logger.warn(`Unknown provider: ${name}. Options: ${KNOWN_PROVIDERS.join(', ')}`);
                  } else {
                    configManager.setActiveProvider(name);
                    logger.success(`Switched to provider: ${PROVIDER_LABELS[name] ?? name}`);
                  }
                } else {
                  const active = configManager.getActiveProvider();
                  logger.info(`Current provider: ${PROVIDER_LABELS[active] ?? active}`);
                }
                ask();
                return;

              default:
                logger.warn(`Unknown command: /${cmd}. Type /help for available commands.`);
                ask();
                return;
            }
            return;
          }

          const label = PROVIDER_LABELS[configManager.getActiveProvider()] ?? configManager.getActiveProvider();
          const model = configManager.getModel();

          console.log(chalk.green(`[${label}/${model}] `) + chalk.dim('(echo) ') + trimmed);
          ask();
        });
      };

      rl.on('close', () => {
        logger.info('Goodbye!');
        process.exit(0);
      });

      ask();
    });
}
