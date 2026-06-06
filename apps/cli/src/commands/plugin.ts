import { Command } from 'commander';
import chalk from 'chalk';
import { homedir } from 'node:os';
import { copyFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PluginManager } from '@openio/plugin-system';

const pm = new PluginManager();

export function registerPlugin(program: Command): void {
  const plugin = program
    .command('plugin')
    .description('Manage plugins')
    .alias('pl');

  plugin
    .command('list')
    .description('List all installed plugins')
    .action(() => {
      const plugins = pm.list();
      if (plugins.length === 0) {
        console.log(chalk.dim('\n  No plugins installed. Create one with: openio plugin create <name>\n'));
        return;
      }

      console.log(chalk.bold.cyan('\n  Installed Plugins\n'));
      for (const p of plugins) {
        const status = p.enabled ? chalk.green('enabled') : chalk.red('disabled');
        const hasCmd = p.commands.length > 0 ? chalk.dim(` ${p.commands.length} cmd(s)`) : '';
        const hasTool = p.tools.length > 0 ? chalk.dim(` ${p.tools.length} tool(s)`) : '';
        const hasHook = p.hooks.length > 0 ? chalk.dim(` ${p.hooks.length} hook(s)`) : '';
        console.log(`  ${chalk.bold(p.name)} ${chalk.dim(`v${p.version}`)}  [${status}]${hasCmd}${hasTool}${hasHook}`);
        if (p.description) {
          console.log(`    ${chalk.dim(p.description)}`);
        }
        console.log();
      }
    });

  plugin
    .command('install <name>')
    .description('Install a plugin from a local directory or npm-like source')
    .option('-p, --path <path>', 'Local path to plugin directory')
    .action(async (name: string, opts: { path?: string }) => {
      try {
        if (opts.path) {
          const srcPath = opts.path;
          if (!existsSync(srcPath)) {
            console.error(chalk.red(`\n  ✗ Path not found: ${srcPath}\n`));
            return;
          }
          pm.create(name, `Installed from ${srcPath}`);
          const destDir = join(homedir(), '.openio', 'plugins', name);
          const entries = readdirSync(srcPath);
          for (const entry of entries) {
            const src = join(srcPath, entry);
            const dst = join(destDir, entry);
            if (statSync(src).isFile()) {
              copyFileSync(src, dst);
            }
          }
          await pm.activatePlugin(name);
          console.log(chalk.green(`\n  ✓ Plugin installed: ${chalk.bold(name)}\n`));
        } else {
          console.error(chalk.red('\n  ✗ Use --path <path> to specify the plugin directory\n'));
        }
      } catch (err) {
        console.error(chalk.red(`\n  ✗ Install failed: ${(err as Error).message}\n`));
      }
    });

  plugin
    .command('enable <name>')
    .description('Enable a plugin')
    .action(async (name: string) => {
      const ok = pm.enable(name);
      if (ok) {
        await pm.activatePlugin(name);
        console.log(chalk.green(`\n  ✓ Plugin enabled: ${chalk.bold(name)}\n`));
      } else {
        console.error(chalk.red(`\n  ✗ Plugin not found: ${name}\n`));
      }
    });

  plugin
    .command('disable <name>')
    .description('Disable a plugin')
    .action(async (name: string) => {
      await pm.deactivatePlugin(name);
      const ok = pm.disable(name);
      if (ok) {
        console.log(chalk.yellow(`\n  ○ Plugin disabled: ${chalk.bold(name)}\n`));
      } else {
        console.error(chalk.red(`\n  ✗ Plugin not found: ${name}\n`));
      }
    });

  plugin
    .command('create <name>')
    .description('Scaffold a new plugin')
    .option('-d, --description <text>', 'Plugin description')
    .action((name: string, opts: { description?: string }) => {
      try {
        const manifest = pm.create(name, opts.description);
        console.log(chalk.green(`\n  ✓ Plugin created: ${chalk.bold(manifest.name)}`));
        console.log(chalk.dim(`    Path: ~/.openio/plugins/${name}/\n`));
      } catch (err) {
        console.error(chalk.red(`\n  ✗ ${(err as Error).message}\n`));
      }
    });

  plugin
    .command('remove <name>')
    .description('Remove a plugin')
    .action(async (name: string) => {
      await pm.deactivatePlugin(name);
      const ok = pm.remove(name);
      if (ok) {
        console.log(chalk.green(`\n  ✓ Plugin removed: ${chalk.bold(name)}\n`));
      } else {
        console.error(chalk.red(`\n  ✗ Plugin not found: ${name}\n`));
      }
    });
}
