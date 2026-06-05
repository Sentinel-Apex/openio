import { describe, it, expect } from 'vitest';
import { execa } from 'execa';
import { join } from 'node:path';
import { existsSync, unlinkSync, rmdirSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

const CLI_PATH = join(process.cwd(), 'apps', 'cli', 'src', 'index.ts');

describe('OpenIO Workflows', () => {
  const testDir = join(tmpdir(), 'openio-e2e-workflow');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try { rmdirSync(testDir, { recursive: true }); } catch {}
  });

  it('scaffolds a project from template', async () => {
    const result = await execa('npx', ['tsx', CLI_PATH, 'project', 'scaffold',
      '--dir', testDir,
      '--template', 'express',
      '--name', 'my-api',
    ], { reject: false, timeout: 30000 });

    expect(result.exitCode).toBe(0);
    expect(existsSync(join(testDir, 'package.json'))).toBe(true);
    const pkg = JSON.parse(readFileSync(join(testDir, 'package.json'), 'utf-8'));
    expect(pkg.name).toBe('my-api');
    expect(pkg.dependencies?.express).toBeDefined();
  });

  it('analyzes a project', async () => {
    writeFileSync(join(testDir, 'package.json'), JSON.stringify({
      name: 'test-app',
      dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
      devDependencies: { vitest: '^1.0.0' },
    }));
    writeFileSync(join(testDir, 'tsconfig.json'), '{}');

    const result = await execa('npx', ['tsx', CLI_PATH, 'project', 'analyze',
      '--dir', testDir,
    ], { reject: false, timeout: 15000 });

    expect(result.exitCode).toBe(0);
  });

  it('detects MCP servers via config', async () => {
    const configDir = join(require('node:os').homedir(), '.openio');
    mkdirSync(configDir, { recursive: true });
    const configPath = join(configDir, 'config.json');

    writeFileSync(configPath, JSON.stringify({
      mcpServers: [
        { id: 'test-server', transport: 'stdio', target: 'echo' },
      ],
    }));

    const result = await execa('npx', ['tsx', CLI_PATH, 'mcp', '--list'], {
      reject: false, timeout: 15000,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('test-server');
  });
});
