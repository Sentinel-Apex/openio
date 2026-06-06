import { Command } from 'commander';
import chalk from 'chalk';
import { WorkspaceManager } from '@openio/workspace-manager';

const ws = new WorkspaceManager();

export function registerWorkspace(program: Command): void {
  const workspace = program
    .command('workspace')
    .alias('ws')
    .description('Manage AI workspaces');

  workspace
    .command('create <name>')
    .description('Create a new workspace directory')
    .action((name: string) => {
      try {
        const meta = ws.create(name);
        console.log(chalk.green(`\n  ✓ Workspace created: ${chalk.bold(meta.name)}`));
        console.log(chalk.dim(`    Path: ${meta.path}\n`));
      } catch (err) {
        console.error(chalk.red(`\n  ✗ ${(err as Error).message}\n`));
      }
    });

  workspace
    .command('list')
    .description('List all workspaces')
    .action(() => {
      const workspaces = ws.list();
      if (workspaces.length === 0) {
        console.log(chalk.dim('\n  No workspaces found. Create one with: openio workspace create <name>\n'));
        return;
      }

      const active = ws.active();
      console.log(chalk.bold.cyan('\n  Workspaces\n'));
      for (const w of workspaces) {
        const isActive = active && w.name === active.name;
        const marker = isActive ? chalk.green('▸') : ' ';
        const name = isActive ? chalk.bold(w.name) : w.name;
        const date = new Date(w.lastActive).toLocaleDateString();
        console.log(`  ${marker} ${name}${chalk.dim(`  (${w.path})  last: ${date}`)}`);
      }
      console.log();
    });

  workspace
    .command('switch <name>')
    .description('Switch to a different workspace')
    .action((name: string) => {
      try {
        const meta = ws.switch(name);
        console.log(chalk.green(`\n  ✓ Switched to workspace: ${chalk.bold(meta.name)}\n`));
      } catch (err) {
        console.error(chalk.red(`\n  ✗ ${(err as Error).message}\n`));
      }
    });

  program
    .command('exec <command...>')
    .description('Run a shell command in the active workspace')
    .action(async (command: string[]) => {
      try {
        const cmd = command.join(' ');
        const result = await ws.exec(cmd);
        if (result.stdout) console.log(result.stdout);
        if (result.stderr) console.error(chalk.yellow(result.stderr));
        if (result.exitCode !== 0) {
          console.error(chalk.red(`\n  ✗ Command exited with code ${result.exitCode}\n`));
        }
      } catch (err) {
        console.error(chalk.red(`\n  ✗ ${(err as Error).message}\n`));
      }
    });

  program
    .command('read <file>')
    .description('Read a file from the active workspace')
    .action((file: string) => {
      try {
        const content = ws.read(file);
        console.log(content);
      } catch (err) {
        console.error(chalk.red(`\n  ✗ ${(err as Error).message}\n`));
      }
    });

  program
    .command('write <file> [content...]')
    .description('Write content to a file in the active workspace')
    .action((file: string, content: string[]) => {
      try {
        const text = content ? content.join(' ') : '';
        ws.write(file, text);
        console.log(chalk.green(`\n  ✓ Written ${file}\n`));
      } catch (err) {
        console.error(chalk.red(`\n  ✗ ${(err as Error).message}\n`));
      }
    });

  program
    .command('tree')
    .description('Show the file tree of the active workspace')
    .argument('[dir]', 'Subdirectory to tree from')
    .action((dir?: string) => {
      try {
        const tree = ws.tree(dir ?? '');
        console.log();
        console.log(tree);
      } catch (err) {
        console.error(chalk.red(`\n  ✗ ${(err as Error).message}\n`));
      }
    });
}
