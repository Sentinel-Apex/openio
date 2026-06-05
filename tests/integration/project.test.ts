import { describe, it, expect } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ProjectAnalyzer, ProjectGenerator, DependencyAnalyzer } from '@openio/project-engine';
import { registerTemplate } from '@openio/project-engine';

const TEST_DIR = join(tmpdir(), 'openio-test-project');

describe('ProjectAnalyzer', () => {
  beforeAll(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({
      name: 'test-project',
      dependencies: { express: '^4.18.0' },
      devDependencies: { vitest: '^1.0.0' },
    }));
    writeFileSync(join(TEST_DIR, 'tsconfig.json'), '{}');
    writeFileSync(join(TEST_DIR, 'src', 'index.ts'), 'console.log("hello");', { flag: 'w' });
    mkdirSync(join(TEST_DIR, 'src'), { recursive: true });
  });

  afterAll(() => {
    try { unlinkSync(join(TEST_DIR, 'package.json')); } catch {}
    try { unlinkSync(join(TEST_DIR, 'tsconfig.json')); } catch {}
    try { unlinkSync(join(TEST_DIR, 'src', 'index.ts')); } catch {}
    try { rmdirSync(join(TEST_DIR, 'src')); } catch {}
    try { rmdirSync(TEST_DIR); } catch {}
  });

  it('detects project language and frameworks', async () => {
    const analyzer = new ProjectAnalyzer(TEST_DIR);
    const info = await analyzer.analyze();
    expect(info.name).toBe('openio-test-project');
    expect(info.language).toBe('typescript');
    expect(info.frameworks).toContain('express');
    expect(info.packageManager).not.toBe('unknown');
    expect(info.dependencies.express).toBe('^4.18.0');
  });

  it('finds source files', () => {
    const analyzer = new ProjectAnalyzer(TEST_DIR);
    const files = analyzer.scanFiles();
    expect(files.length).toBeGreaterThan(0);
  });

  it('reads file content', () => {
    const analyzer = new ProjectAnalyzer(TEST_DIR);
    const content = analyzer.readFile('package.json');
    expect(content).toContain('test-project');
  });
});

describe('ProjectGenerator', () => {
  beforeAll(() => {
    registerTemplate('test-template', {
      name: 'test-template',
      description: 'test',
      variables: [{ key: 'name', description: 'Project name' }],
      files: { '{{name}}/README.md': '# {{name}}\n\nHello {{name}}!' },
    });
  });

  it('generates from in-memory template', async () => {
    const gen = new ProjectGenerator(TEST_DIR);
    const files = await gen.generate('test-template', { name: 'myapp' });
    expect(files.length).toBe(1);
    expect(files[0]).toContain('myapp');
    expect(existsSync(join(TEST_DIR, 'myapp', 'README.md'))).toBe(true);
  });
});

describe('DependencyAnalyzer', () => {
  it('builds dependency graph', async () => {
    const analyzer = new DependencyAnalyzer(TEST_DIR);
    const graph = await analyzer.buildGraph();
    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(Array.isArray(graph.edges)).toBe(true);
    expect(Array.isArray(graph.cycles)).toBe(true);
  });
});
