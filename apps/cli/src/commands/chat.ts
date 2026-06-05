import { Command } from 'commander';
import { createInterface } from 'node:readline';
import { mkdirSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import chalk from 'chalk';
import { configManager } from '@openio/shared';
import { providerManager, OpenAIProvider, AnthropicProvider, GroqProvider, DeepSeekProvider, KimiProvider, OpenRouterProvider, OllamaProvider } from '@openio/ai';
import { MemoryManager } from '@openio/memory';
import { logger } from '../utils/logger.js';
import { showBanner } from '../utils/banner.js';

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI', anthropic: 'Anthropic', groq: 'Groq',
  deepseek: 'DeepSeek', kimi: 'Kimi', openrouter: 'OpenRouter', ollama: 'Ollama',
};

const PROVIDER_CLASSES: Record<string, new () => any> = {
  openai: OpenAIProvider, anthropic: AnthropicProvider, groq: GroqProvider,
  deepseek: DeepSeekProvider, kimi: KimiProvider, openrouter: OpenRouterProvider, ollama: OllamaProvider,
};

const HISTORY_DIR = join(homedir(), '.openio', 'history');

function resolveProvider(model: string): string {
  const m = model.toLowerCase();
  for (const key of Object.keys(PROVIDER_LABELS)) {
    if (m.startsWith(key) || m.startsWith(PROVIDER_LABELS[key].toLowerCase())) return key;
  }
  return 'openai';
}

function formatPrompt(provider: string, model: string): string {
  const label = PROVIDER_LABELS[provider] ?? provider;
  return chalk.cyan(`[${label}/${model}]\n> `);
}

function appendToHistory(sessionId: string, role: string, content: string): void {
  if (!existsSync(HISTORY_DIR)) mkdirSync(HISTORY_DIR, { recursive: true });
  const path = join(HISTORY_DIR, `${sessionId}.log`);
  const timestamp = new Date().toISOString();
  appendFileSync(path, `[${timestamp}] ${role}: ${content}\n`, 'utf-8');
}

export function registerChat(program: Command): void {
  program
    .command('chat')
    .description('Start an interactive chat session')
    .option('-m, --model <model>', 'Override default model')
    .option('-p, --provider <provider>', 'Override default provider')
    .option('-s, --session <id>', 'Resume a previous session')
    .option('--no-stream', 'Disable streaming output')
    .action(async (opts) => {
      if (configManager.isFirstRun()) {
        logger.info('No configuration found. Run openio setup first.');
        return;
      }

      showBanner();

      for (const [name, Cls] of Object.entries(PROVIDER_CLASSES)) {
        providerManager.registerProvider(name, new Cls());
      }

      let model = opts.model ?? configManager.getModel();
      let provider = opts.provider ?? resolveProvider(model);

      const key = configManager.getApiKey(provider);
      if (key) providerManager.registerApiKeys(provider, [key]);

      const mem = new MemoryManager({ dbPath: join(homedir(), '.openio', 'memory.db') });
      await mem.init();

      let sessionId = opts.session;
      if (!sessionId) {
        const session = mem.sessions.create('Chat Session', model);
        sessionId = session.id;
      }

      configManager.addRecentSession(sessionId);

      console.log(chalk.dim(`Session: ${sessionId.slice(0, 8)}...`));
      console.log(chalk.dim(`Provider: ${PROVIDER_LABELS[provider] ?? provider}  Model: ${model}`));
      console.log(chalk.dim('Type /help for available commands.\n'));

      const rl = createInterface({ input: process.stdin, output: process.stdout });

      const ask = () => {
        rl.question(formatPrompt(provider, model), async (input) => {
          const trimmed = input.trim();
          if (!trimmed) { ask(); return; }

          if (trimmed.startsWith('/')) {
            const [cmd, ...args] = trimmed.slice(1).split(/\s+/);

            switch (cmd) {
              case 'exit':
              case 'quit':
                rl.close();
                mem.close();
                return;

              case 'clear':
                console.clear();
                showBanner();
                console.log(chalk.dim(`Session: ${sessionId.slice(0, 8)}...\n`));
                ask();
                return;

              case 'help':
                console.log(chalk.dim(`
  /provider <name>   Switch AI provider
  /model <name>      Switch model
  /config            Show current configuration
  /clear             Clear screen
  /history           Show session message count
  /exit, /quit       Exit chat
  /help              Show this help
                `));
                ask();
                return;

              case 'provider':
                if (args.length === 0) {
                  logger.info(`Current provider: ${PROVIDER_LABELS[provider] ?? provider}`);
                } else {
                  const p = args[0].toLowerCase();
                  if (!PROVIDER_CLASSES[p]) {
                    logger.warn(`Unknown provider: ${p}. Options: ${Object.keys(PROVIDER_LABELS).join(', ')}`);
                  } else {
                    provider = p;
                    const k = configManager.getApiKey(p);
                    if (k) providerManager.registerApiKeys(p, [k]);
                    logger.success(`Switched to ${PROVIDER_LABELS[p]}`);
                  }
                }
                ask();
                return;

              case 'model':
                if (args.length === 0) {
                  logger.info(`Current model: ${model}`);
                } else {
                  model = args.join(' ');
                  logger.success(`Switched to ${model}`);
                }
                ask();
                return;

              case 'config':
                const cfg = configManager.load();
                console.log(chalk.dim(`  Provider:  ${PROVIDER_LABELS[provider] ?? provider}`));
                console.log(chalk.dim(`  Model:     ${model}`));
                console.log(chalk.dim(`  Session:   ${sessionId.slice(0, 8)}...`));
                console.log(chalk.dim(`  API keys:  ${Object.keys(cfg.apiKeys).length} configured`));
                ask();
                return;

              case 'history':
                console.log(chalk.dim(`  Messages in session: ${mem.sessions.load(sessionId)?.messages.length ?? 0}`));
                ask();
                return;

              default:
                logger.warn(`Unknown command: /${cmd}. Type /help for available commands.`);
                ask();
                return;
            }
          }

          appendToHistory(sessionId, 'user', trimmed);

          try {
            await mem.addMessage(sessionId, 'user', trimmed);

            const { messages, context } = await mem.getContext(sessionId, trimmed);
            const chatMessages = [
              ...(context ? [{ role: 'system' as const, content: `Context:\n${context}` }] : []),
              ...messages.map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
            ];

            process.stdout.write(chalk.green('→ '));

            if (opts.stream === false) {
              const result = await providerManager.generate({
                model,
                messages: chatMessages,
              });
              console.log(result.content);
              appendToHistory(sessionId, 'assistant', result.content);
              await mem.addMessage(sessionId, 'assistant', result.content);
            } else {
              let full = '';
              for await (const chunk of providerManager.streamGenerate({
                model,
                messages: chatMessages,
              })) {
                if (chunk.content) {
                  process.stdout.write(chunk.content);
                  full += chunk.content;
                }
              }
              console.log();
              if (full) {
                appendToHistory(sessionId, 'assistant', full);
                await mem.addMessage(sessionId, 'assistant', full);
              }
            }
          } catch (err) {
            logger.error((err as Error).message);
          }

          ask();
        });
      };

      rl.on('close', () => {
        mem.close();
        logger.info('Goodbye!');
        process.exit(0);
      });

      ask();
    });
}
