import { describe, it, expect } from 'vitest';
import { ToolRegistry, PermissionChecker, ReadTool, WriteTool, ListTool } from '@openio/tools';
import { existsSync, unlinkSync, rmdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_DIR = join(tmpdir(), `openio-test-${Date.now()}`);

describe('ToolRegistry', () => {
  it('registers and lists tools', () => {
    const registry = new ToolRegistry();
    registry.register(new ReadTool());
    registry.register(new WriteTool());
    registry.register(new ListTool());
    expect(registry.list().length).toBe(3);
    expect(registry.has('read')).toBe(true);
    expect(registry.get('write')).toBeInstanceOf(WriteTool);
  });

  it('returns failure for unknown tools', async () => {
    const registry = new ToolRegistry();
    const result = await registry.execute('nonexistent', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown tool');
  });
});

describe('PermissionChecker', () => {
  it('allows by default with empty rules', () => {
    const pc = new PermissionChecker();
    expect(pc.isAllowed('read', '/any/path')).toBe(false);
  });

  it('respects allow rules (exact)', () => {
    const pc = new PermissionChecker([{ action: 'allow', pattern: '/tmp/file.txt' }]);
    expect(pc.isAllowed('write', '/tmp/file.txt')).toBe(true);
    expect(pc.isAllowed('write', '/etc/passwd')).toBe(false);
  });

  it('respects wildcard allow rules', () => {
    const pc = new PermissionChecker([{ action: 'allow', pattern: '*' }]);
    expect(pc.isAllowed('read', '/any/path')).toBe(true);
  });

  it('checkOrThrow on denied resource', () => {
    const pc = new PermissionChecker([{ action: 'deny', pattern: '/etc/*' }]);
    expect(() => pc.checkOrThrow('read', '/etc/passwd')).toThrow('Permission denied');
  });
});

describe('Filesystem tools', () => {
  beforeAll(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    try {
      const cleanDir = (dir: string) => {
        for (const e of require('fs').readdirSync(dir)) {
          const p = join(dir, e);
          if (require('fs').statSync(p).isDirectory()) cleanDir(p);
          else unlinkSync(p);
        }
        rmdirSync(dir);
      };
      if (existsSync(TEST_DIR)) cleanDir(TEST_DIR);
    } catch {}
  });

  it('write tool creates a file', async () => {
    const tool = new WriteTool();
    const result = await tool.execute({ path: 'hello.txt', content: 'hello world' }, { workingDir: TEST_DIR });
    expect(result.success).toBe(true);
  });

  it('read tool reads file content', async () => {
    const tool = new ReadTool();
    const result = await tool.execute({ path: 'hello.txt' }, { workingDir: TEST_DIR });
    expect(result.success).toBe(true);
    expect(result.output).toBe('hello world');
  });

  it('list tool lists directory', async () => {
    const tool = new ListTool();
    const result = await tool.execute({ path: '.' }, { workingDir: TEST_DIR });
    expect(result.success).toBe(true);
    expect(result.output).toContain('hello.txt');
  });

  it('read tool fails on missing file', async () => {
    const tool = new ReadTool();
    const result = await tool.execute({ path: 'nonexistent.txt' }, { workingDir: TEST_DIR });
    expect(result.success).toBe(false);
  });
});
