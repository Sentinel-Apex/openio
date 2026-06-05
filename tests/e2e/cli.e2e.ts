import { describe, it, expect } from 'vitest';
import { execa } from 'execa';
import { join } from 'node:path';

const CLI_PATH = join(process.cwd(), 'apps', 'cli', 'src', 'index.ts');

describe('CLI E2E', () => {
  it('shows help with --help flag', async () => {
    const result = await execa('npx', ['tsx', CLI_PATH, '--help'], {
      reject: false,
      timeout: 15000,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('openio');
    expect(result.stdout).toContain('--help');
  });

  it('shows version with --version flag', async () => {
    const result = await execa('npx', ['tsx', CLI_PATH, '--version'], {
      reject: false,
      timeout: 15000,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('1.0.0');
  });

  it('lists available commands', async () => {
    const result = await execa('npx', ['tsx', CLI_PATH, '--help'], {
      reject: false,
      timeout: 15000,
    });
    expect(result.stdout).toContain('chat');
    expect(result.stdout).toContain('config');
    expect(result.stdout).toContain('agent');
    expect(result.stdout).toContain('model');
    expect(result.stdout).toContain('doctor');
  });

  it('config --list shows configuration', async () => {
    const result = await execa('npx', ['tsx', CLI_PATH, 'config', '--list'], {
      reject: false,
      timeout: 15000,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Default model');
  });

  it('agent --list shows available agents', async () => {
    const result = await execa('npx', ['tsx', CLI_PATH, 'agent', '--list'], {
      reject: false,
      timeout: 15000,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('manager');
    expect(result.stdout).toContain('backend');
  });

  it('doctor runs health check', async () => {
    const result = await execa('npx', ['tsx', CLI_PATH, 'doctor'], {
      reject: false,
      timeout: 15000,
    });
    expect(result.stdout).toContain('Node');
  });
});
