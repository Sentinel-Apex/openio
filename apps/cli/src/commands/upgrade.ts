import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const GITHUB_REPO = process.env.OPENIO_REPO ?? 'openio/cli';
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const CURRENT_VERSION = '1.0.0';

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
  assets: Array<{ name: string; browser_download_url: string }>;
}

function parseSemver(v: string): number[] {
  return v.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
}

function compareVersions(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

function checkResult(current: string, latest: string): { needsUpgrade: boolean; message: string } {
  const cmp = compareVersions(latest, current);
  if (cmp > 0) return { needsUpgrade: true, message: `${current} → ${latest}` };
  if (cmp === 0) return { needsUpgrade: false, message: `${current} (latest)` };
  return { needsUpgrade: false, message: `${current} (ahead of ${latest})` };
}

async function fetchLatestRelease(): Promise<GitHubRelease | null> {
  try {
    const res = await fetch(GITHUB_API, {
      headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'openio-cli' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return (await res.json()) as GitHubRelease;
  } catch {
    return null;
  }
}

async function downloadAsset(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buffer);
}

async function checkCLIUpgrade(spinner: ReturnType<typeof ora>): Promise<GitHubRelease | null> {
  spinner.text = 'Checking CLI version...';
  const release = await fetchLatestRelease();
  if (!release) {
    spinner.fail('Could not reach GitHub releases');
    return null;
  }

  const latest = release.tag_name;
  const result = checkResult(CURRENT_VERSION, latest);
  if (result.needsUpgrade) {
    spinner.succeed(`Update available: ${chalk.green(result.message)}`);
  } else {
    spinner.succeed(`Up to date: ${chalk.dim(result.message)}`);
  }

  if (release.body) {
    const lines = release.body.split('\n').filter(Boolean).slice(0, 8);
    console.log(chalk.dim('  Changes:'));
    for (const line of lines) console.log(chalk.dim(`    ${line}`));
    if (lines.length < release.body.split('\n').filter(Boolean).length) console.log(chalk.dim('    ...'));
  }
  console.log(chalk.dim(`  ${release.html_url}\n`));

  return release;
}

async function applyCLIUpgrade(release: GitHubRelease): Promise<void> {
  const result = checkResult(CURRENT_VERSION, release.tag_name);
  if (!result.needsUpgrade) return;

  const asset = release.assets.find(
    (a) => a.name.includes('node') || a.name.includes('js') || a.name.endsWith('.js') || a.name.endsWith('.zip') || a.name.endsWith('.tar.gz'),
  );

  if (!asset) {
    console.log(chalk.yellow('  No downloadable asset found in this release.\n'));
    console.log(chalk.dim(`  Open ${release.html_url} to download manually.\n`));
    return;
  }

  const spinner = ora({ text: `Downloading ${release.tag_name}...`, color: 'cyan' }).start();
  try {
    const dest = join(homedir(), '.openio', `openio-${release.tag_name}.js`);
    await downloadAsset(asset.browser_download_url, dest);
    spinner.succeed(`Saved: ${chalk.bold(dest)}`);
    console.log(chalk.dim('  To apply: copy this file to your installation directory.\n'));
  } catch (err) {
    spinner.fail(`Download failed: ${(err as Error).message}`);
  }
}

async function checkPluginUpgrades(spinner: ReturnType<typeof ora>): Promise<void> {
  const pluginsDir = join(homedir(), '.openio', 'plugins');
  if (!existsSync(pluginsDir)) {
    spinner.info('No plugins installed');
    return;
  }

  const entries = readdirSync(pluginsDir, { withFileTypes: true });
  const pluginDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  if (pluginDirs.length === 0) {
    spinner.info('No plugins installed');
    return;
  }

  spinner.succeed(`Checking ${pluginDirs.length} plugin(s)`);

  for (const name of pluginDirs) {
    const manifestPath = join(pluginsDir, name, 'plugin.json');
    let currentVersion = '0.0.0';
    try {
      const raw = readFileSync(manifestPath, 'utf-8');
      currentVersion = JSON.parse(raw).version ?? '0.0.0';
    } catch {
      // skip
    }

    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
        headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'openio-cli' },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = (await res.json()) as GitHubRelease;
        const latestVersion = data.tag_name;
        const cmp = compareVersions(latestVersion, currentVersion);
        if (cmp > 0) {
          console.log(`    ${chalk.bold(name)}  ${chalk.dim(currentVersion)} ${chalk.green('→')} ${chalk.green(latestVersion)}`);
        } else {
          console.log(`    ${chalk.bold(name)}  ${chalk.dim(currentVersion)}`);
        }
      } else {
        console.log(`    ${chalk.bold(name)}  ${chalk.dim(currentVersion)} (unreachable)`);
      }
    } catch {
      console.log(`    ${chalk.bold(name)}  ${chalk.dim(currentVersion)} (check failed)`);
    }
  }
}

export function registerUpgrade(program: Command): void {
  const upgrade = program
    .command('upgrade')
    .description('Check for and apply updates')
    .option('--plugins', 'Check plugin updates')
    .option('--all', 'Upgrade CLI and all plugins')
    .alias('up')
    .action(async (opts: { plugins?: boolean; all?: boolean }) => {
      if (opts.all) {
        console.log(chalk.bold.cyan('\n  Upgrading OpenIO\n'));

        const spinner = ora({ text: 'Checking CLI version...', color: 'cyan' }).start();
        const release = await checkCLIUpgrade(spinner);
        if (!release) return;
        await applyCLIUpgrade(release);

        const pSpinner = ora({ text: 'Checking plugin updates...', color: 'cyan' }).start();
        await checkPluginUpgrades(pSpinner);

        console.log(chalk.green('\n  ✓ Upgrade check complete.\n'));
        return;
      }

      if (opts.plugins) {
        const spinner = ora({ text: 'Checking plugin versions...', color: 'cyan' }).start();
        await checkPluginUpgrades(spinner);
        console.log();
        return;
      }

      const spinner = ora({ text: 'Checking for updates...', color: 'cyan' }).start();
      const release = await checkCLIUpgrade(spinner);
      if (!release) {
        console.log(chalk.dim(`  Current: ${CURRENT_VERSION}`));
        console.log(chalk.dim(`  Repo:    ${GITHUB_REPO}`));
        console.log(chalk.dim(`  Set OPENIO_REPO env to configure\n`));
        return;
      }
      await applyCLIUpgrade(release);
    });

  upgrade
    .command('check')
    .description('Check if a new CLI version is available (no download)')
    .action(async () => {
      const spinner = ora({ text: 'Checking for updates...', color: 'cyan' }).start();
      const release = await checkCLIUpgrade(spinner);
      if (!release) {
        console.log(chalk.dim(`  Current: ${CURRENT_VERSION}`));
        console.log(chalk.dim(`  Repo:    ${GITHUB_REPO}\n`));
      }
    });
}
