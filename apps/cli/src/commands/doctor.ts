import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { execa } from 'execa';
import { configManager, ConfigError } from '@openio/shared';
import { providerManager, OpenAIProvider, AnthropicProvider, GroqProvider, DeepSeekProvider, KimiProvider, OpenRouterProvider, OllamaProvider } from '@openio/ai';

const PROVIDER_MAP: Record<string, { label: string; envVar: string }> = {
  openai: { label: 'OpenAI', envVar: 'OPENAI_API_KEY' },
  anthropic: { label: 'Anthropic', envVar: 'ANTHROPIC_API_KEY' },
  groq: { label: 'Groq', envVar: 'GROQ_API_KEY' },
  deepseek: { label: 'DeepSeek', envVar: 'DEEPSEEK_API_KEY' },
  kimi: { label: 'Kimi', envVar: 'KIMI_API_KEY' },
  openrouter: { label: 'OpenRouter', envVar: 'OPENROUTER_API_KEY' },
  ollama: { label: 'Ollama (local)', envVar: '' },
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

function box(content: string, title?: string): string {
  const lines = content.split('\n');
  const width = Math.max(...lines.map((l) => l.length), title?.length ?? 0) + 4;
  const top = title
    ? `┌─ ${chalk.bold(title)} ${'─'.repeat(Math.max(0, width - title.length - 4))}┐`
    : `┌${'─'.repeat(width)}┐`;
  const bottom = `└${'─'.repeat(width)}┘`;
  const middle = lines.map((l) => `│ ${l}${' '.repeat(width - l.length - 2)}│`).join('\n');
  return `\n${top}\n${middle}\n${bottom}\n`;
}

function statusBadge(ok: boolean, label: string): string {
  return ok ? chalk.green(`  ✓ ${label}`) : chalk.red(`  ✗ ${label}`);
}

function warnBadge(label: string): string {
  return chalk.yellow(`  ⚠ ${label}`);
}

function indent(text: string, spaces = 2): string {
  return text
    .split('\n')
    .map((l) => ' '.repeat(spaces) + l)
    .join('\n');
}

function maskKey(key: string | undefined): string {
  if (!key) return chalk.red('missing');
  if (key.length <= 8) return key.slice(0, 4) + '****';
  return key.slice(0, 4) + '****' + key.slice(-4);
}

function getActiveProvider(): string | null {
  const model = configManager.getModel().toLowerCase();
  for (const key of Object.keys(PROVIDER_MAP)) {
    if (model.startsWith(key) || model.startsWith(PROVIDER_MAP[key].label.toLowerCase().split(' ')[0])) return key;
  }
  return null;
}

export function registerDoctor(program: Command): void {
  program
    .command('doctor')
    .description('Run system diagnostics and health checks')
    .action(async () => {
      const issues: string[] = [];
      const fixes: string[] = [];

      console.log(chalk.bold.cyan('\n  ╔══════════════════════════════════════╗'));
      console.log(chalk.bold.cyan('  ║        OpenIO Diagnostics           ║'));
      console.log(chalk.bold.cyan('  ╚══════════════════════════════════════╝'));

      // 1. Version
      const healthLines: string[] = [];
      healthLines.push(`${chalk.bold('OpenIO CLI:')}   v1.0.0`);
      healthLines.push(`${chalk.bold('Node.js:')}      ${process.version}`);
      const major = parseInt(process.version.slice(1).split('.')[0], 10);
      if (major < 18) {
        healthLines.push(warnBadge(`Node.js ${major} detected, v18+ recommended`));
        issues.push('Node.js version below 18');
        fixes.push('Upgrade Node.js to v18 or later: https://nodejs.org');
      } else {
        healthLines.push(statusBadge(true, 'Node.js version OK'));
      }

      const pkgMgr = existsSync(join(process.cwd(), 'pnpm-lock.yaml')) ? 'pnpm' :
        existsSync(join(process.cwd(), 'yarn.lock')) ? 'yarn' :
        existsSync(join(process.cwd(), 'package-lock.json')) ? 'npm' : 'unknown';
      healthLines.push(`${chalk.bold('Package Mgr:')}  ${pkgMgr}`);
      console.log(box(healthLines.join('\n'), 'System'));

      // 2. Config
      const configLines: string[] = [];
      const configPath = join(homedir(), '.openio', 'config.json');

      if (existsSync(configPath)) {
        configLines.push(statusBadge(true, `Config found at ${chalk.dim(configPath)}`));
      } else {
        configLines.push(warnBadge('No config file found'));
        issues.push('Configuration file missing');
        fixes.push('Run openio setup to create configuration interactively');
        fixes.push('Or run openio init for minimal setup');
      }

      const cfg = configManager.load();
      configLines.push(`${chalk.bold('Model:')}         ${cfg.defaultModel ? chalk.green(cfg.defaultModel) : chalk.red('not set')}`);
      configLines.push(`${chalk.bold('Agent:')}         ${cfg.defaultAgent || chalk.dim('not set')}`);
      console.log(box(configLines.join('\n'), 'Configuration'));

      // 3. Providers
      const providerLines: string[] = [];
      const activeProvider = getActiveProvider();

      for (const [name, meta] of Object.entries(PROVIDER_MAP)) {
        const key = configManager.getApiKey(name);
        const isOllama = name === 'ollama';
        const isActive = name === activeProvider;

        if (isOllama) {
          providerLines.push(`${isActive ? chalk.green('▸') : ' '} ${chalk.bold(meta.label.padEnd(16))} ${chalk.dim('(local)')}`);
        } else if (key) {
          providerLines.push(`${isActive ? chalk.green('▸') : ' '} ${chalk.bold(meta.label.padEnd(16))} ${chalk.green('key present')} ${chalk.dim(maskKey(key))}`);
        } else {
          providerLines.push(`${isActive ? chalk.green('▸') : ' '} ${chalk.bold(meta.label.padEnd(16))} ${chalk.red('key missing')} ${chalk.dim(`(set ${meta.envVar} or use openio config set api-key)`)}`);
          if (isActive) {
            issues.push(`No API key for active provider ${meta.label}`);
            fixes.push(`Set API key: openio config set api-key <your-${meta.envVar}>`);
          }
        }
      }

      console.log(box(providerLines.join('\n'), 'Providers'));

      // 4. Environment tools
      const envLines: string[] = [];

      try {
        const git = await execa('git', ['--version'], { reject: false });
        if (git.exitCode === 0) {
          envLines.push(statusBadge(true, `Git ${chalk.dim(git.stdout?.trim()?.split(' ').pop() ?? '')}`));
        } else {
          envLines.push(warnBadge('Git not found in PATH'));
          fixes.push('Install Git: https://git-scm.com/downloads');
        }
      } catch {
        envLines.push(warnBadge('Git not found'));
        fixes.push('Install Git: https://git-scm.com/downloads');
      }

      try {
        const docker = await execa('docker', ['--version'], { reject: false });
        if (docker.exitCode === 0) {
          envLines.push(statusBadge(true, `Docker ${chalk.dim(docker.stdout?.trim()?.split(' ').pop() ?? '')}`));
        } else {
          envLines.push(chalk.dim('  · Docker: not found (optional)'));
        }
      } catch {
        envLines.push(chalk.dim('  · Docker: not found (optional)'));
      }

      try {
        const ollama = await execa('ollama', ['--version'], { reject: false });
        if (ollama.exitCode === 0) {
          envLines.push(statusBadge(true, `Ollama ${chalk.dim(ollama.stdout?.trim() ?? '')}`));
        }
      } catch {
        if (activeProvider === 'ollama') {
          envLines.push(warnBadge('Ollama not found (active provider)'));
          issues.push('Ollama is set as active provider but not installed');
          fixes.push('Install Ollama: https://ollama.com/download');
        } else {
          envLines.push(chalk.dim('  · Ollama: not found (optional)'));
        }
      }

      console.log(box(envLines.join('\n'), 'Environment'));

      // 5. Connection test
      const connLines: string[] = [];
      const target = activeProvider ?? 'openai';
      const meta = PROVIDER_MAP[target];

      if (meta) {
        const key = configManager.getApiKey(target);

        if (!key && target !== 'ollama') {
          connLines.push(warnBadge(`Skipped — no API key for ${meta.label}`));
        } else {
          for (const [name, Cls] of Object.entries(PROVIDER_CLASSES)) {
            providerManager.registerProvider(name, new Cls());
          }
          if (key) providerManager.registerApiKeys(target, [key]);

          try {
            const provider = providerManager.getProvider(target);
            const models = await provider.getModels();

            if (models.length > 0) {
              connLines.push(statusBadge(true, `${meta.label} — ${chalk.green(String(models.length))} models available`));
              const defaultModel = configManager.getModel();
              const found = models.find((m: any) => m.id === defaultModel || defaultModel.endsWith(m.id));
              if (found) {
                connLines.push(`     ${chalk.bold('Default model:')} ${chalk.green(found.id)} ${chalk.dim(`(${(found as any).contextWindow?.toLocaleString() ?? '?'} token context)`)}`);
              } else {
                connLines.push(`     ${chalk.bold('Default model:')} ${chalk.yellow(defaultModel)} ${chalk.dim('(not in provider model list)')}`);
              }
            } else {
              connLines.push(warnBadge(`${meta.label} connected but returned no models`));
            }
          } catch (err) {
            connLines.push(chalk.red(`  ✗ ${meta.label} — ${(err as Error).message}`));
            issues.push(`Connection to ${meta.label} failed`);
            fixes.push('Check your API key and network connection');
            fixes.push('Run openio provider test openai to debug');
          }
        }
      }

      console.log(box(connLines.join('\n'), 'Connection Test'));

      // 6. Summary
      console.log(chalk.bold.cyan('\n  Summary\n'));

      if (issues.length === 0) {
        console.log(indent(chalk.green('✓ All checks passed — OpenIO is ready to use.'), 2));
      } else {
        console.log(indent(chalk.yellow(`⚠ ${issues.length} issue${issues.length > 1 ? 's' : ''} found`), 2));
        console.log();
        for (const issue of issues) {
          console.log(indent(chalk.red(`✗ ${issue}`), 2));
        }
        console.log();
        console.log(indent(chalk.bold('Suggested fixes:'), 2));
        for (const fix of [...new Set(fixes)]) {
          console.log(indent(chalk.cyan(`→ ${fix}`), 2));
        }
      }

      console.log();
    });
}
