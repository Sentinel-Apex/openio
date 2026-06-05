import { Command } from 'commander';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { logger } from '../utils/logger.js';
import { askInput, askConfirm } from '../utils/prompt.js';

export function registerInit(program: Command): void {
  program
    .command('init')
    .description('Initialize OpenIO configuration')
    .option('-f, --force', 'Overwrite existing config')
    .action(async (opts) => {
      const configDir = join(homedir(), '.openio');
      const configPath = join(configDir, 'config.json');

      if (existsSync(configPath) && !opts.force) {
        const overwrite = await askConfirm('Config already exists. Overwrite?', false);
        if (!overwrite) { logger.info('Init cancelled'); return; }
      }

      if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true });

      const defaultModel = await askInput('Default model', { default: 'gpt-4o' });
      const defaultAgent = await askInput('Default agent', { default: 'manager' });

      const config = {
        defaultModel,
        defaultAgent,
        theme: 'dark' as const,
        showTimestamps: false,
        apiKeys: {},
        mcpServers: [],
        recentSessions: [],
      };

      writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      logger.success(`Config created at ${configPath}`);
    });
}
