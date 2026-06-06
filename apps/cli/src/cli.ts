import { Command } from 'commander';
import chalk from 'chalk';
import { showShortBanner } from './utils/banner.js';
import { configManager } from './utils/config-manager.js';
import { logger } from './utils/logger.js';
import { registerChat } from './commands/chat.js';
import { registerCode } from './commands/code.js';
import { registerAgent } from './commands/agent.js';
import { registerModel } from './commands/model.js';
import { registerConfig } from './commands/config.js';
import { registerDoctor } from './commands/doctor.js';
import { registerMemory } from './commands/memory.js';
import { registerMCP } from './commands/mcp.js';
import { registerProject } from './commands/project.js';
import { registerInit } from './commands/init.js';
import { registerSetup, runSetup } from './commands/setup.js';
import { registerProvider } from './commands/provider.js';
import { registerWorkspace } from './commands/workspace.js';
import { registerPlugin } from './commands/plugin.js';
import { registerUpgrade } from './commands/upgrade.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('openio')
    .version('1.0.0')
    .description('OpenIO — AI-powered CLI coding assistant')
    .option('--verbose', 'Enable verbose debug output')
    .showHelpAfterError(true);

  registerChat(program);
  registerCode(program);
  registerAgent(program);
  registerModel(program);
  registerConfig(program);
  registerDoctor(program);
  registerMemory(program);
  registerMCP(program);
  registerProject(program);
  registerInit(program);
  registerSetup(program);
  registerProvider(program);
  registerWorkspace(program);
  registerPlugin(program);
  registerUpgrade(program);

  return program;
}

export async function run(argv: string[] = process.argv): Promise<void> {
  const program = createProgram();

  process.on('uncaughtException', (err) => {
    console.error(chalk.red('\n  Unhandled error:'), err.message);
    if (argv.includes('--verbose')) console.error(err.stack);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    const msg = reason instanceof Error ? reason.message : String(reason);
    console.error(chalk.red('\n  Unhandled rejection:'), msg);
    if (argv.includes('--verbose') && reason instanceof Error) console.error(reason.stack);
    process.exit(1);
  });

  const skipFirstRunCheck = ['--help', '-h', '--version', '-V', 'help', 'setup', 'init'].some(
    (a) => argv.includes(a),
  );

  if (configManager.isFirstRun() && !skipFirstRunCheck) {
    console.log();
    logger.info('Welcome to OpenIO! Let\'s get you set up.\n');
    try {
      await runSetup();
    } catch (err) {
      logger.error('Setup failed:', (err as Error).message);
      logger.info('Run openio setup to try again.');
      process.exit(1);
    }
  }

  if (argv.length > 2) {
    showShortBanner();
    program.parse(argv);
  }
}
