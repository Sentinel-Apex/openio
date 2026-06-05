import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execa } from 'execa';
import { getLogger } from '@openio/shared';

export type TestFramework = 'vitest' | 'jest' | 'mocha' | 'pytest' | 'unknown';

export interface TestResult {
  framework: TestFramework;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration: number;
  output: string;
  error?: string;
}

export interface TestFile {
  path: string;
  framework: TestFramework;
}

export class ProjectTester {
  private root: string;

  constructor(root?: string) {
    this.root = resolve(root ?? process.cwd());
  }

  detectFramework(): TestFramework {
    const pkgPath = join(this.root, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (allDeps.vitest) return 'vitest';
        if (allDeps.jest) return 'jest';
        if (allDeps.mocha) return 'mocha';
      } catch { /* ignore */ }
    }

    if (existsSync(join(this.root, 'pyproject.toml')) || existsSync(join(this.root, 'pytest.ini'))) {
      return 'pytest';
    }

    if (existsSync(join(this.root, 'vitest.config.ts')) || existsSync(join(this.root, 'vitest.config.js'))) {
      return 'vitest';
    }
    if (existsSync(join(this.root, 'jest.config.ts')) || existsSync(join(this.root, 'jest.config.js'))) {
      return 'jest';
    }

    return 'unknown';
  }

  findTestFiles(): TestFile[] {
    const framework = this.detectFramework();
    const files: TestFile[] = [];
    const walk = (dir: string) => {
      try {
        const fs = require('node:fs');
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
          const full = join(dir, entry.name);
          if (entry.isDirectory()) walk(full);
          else if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.js') || entry.name.endsWith('.spec.ts') || entry.name.endsWith('.spec.js') || entry.name.endsWith('_test.py')) {
            files.push({ path: full, framework });
          }
        }
      } catch { /* skip */ }
    };
    walk(this.root);
    return files;
  }

  async runTests(options?: { file?: string; watch?: boolean; coverage?: boolean }): Promise<TestResult> {
    const framework = this.detectFramework();
    const startTime = Date.now();

    getLogger().info({ framework }, 'Running tests');

    try {
      let cmd: string;
      let args: string[];

      switch (framework) {
        case 'vitest':
          cmd = 'npx';
          args = ['vitest', 'run'];
          if (options?.file) args.push(options.file);
          if (options?.coverage) args.push('--coverage');
          break;
        case 'jest':
          cmd = 'npx';
          args = ['jest'];
          if (options?.file) args.push(options.file);
          if (options?.coverage) args.push('--coverage');
          break;
        case 'pytest':
          cmd = 'python';
          args = ['-m', 'pytest'];
          if (options?.file) args.push(options.file);
          if (options?.coverage) args.push('--cov');
          break;
        default:
          return {
            framework: 'unknown',
            passed: 0, failed: 0, skipped: 0, total: 0,
            duration: 0, output: '', error: 'No test framework detected',
          };
      }

      const result = await execa(cmd, args, {
        cwd: this.root,
        reject: false,
        all: true,
        timeout: 120000,
      });

      const duration = Date.now() - startTime;
      const output = typeof result.all === 'string' ? result.all : (result.stdout ?? '');

      return {
        framework,
        passed: this.countTests(output, 'pass'),
        failed: this.countTests(output, 'fail'),
        skipped: this.countTests(output, 'skip'),
        total: this.countTests(output, 'total') || output.split('\n').filter((l) => l.includes('Tests')).length,
        duration,
        output,
      };
    } catch (err) {
      return {
        framework,
        passed: 0, failed: 0, skipped: 0, total: 0,
        duration: Date.now() - startTime,
        output: '',
        error: (err as Error).message,
      };
    }
  }

  private countTests(output: string, type: 'pass' | 'fail' | 'skip' | 'total'): number {
    const patterns: Record<string, RegExp> = {
      pass: /(?:✓|√|PASS|passed|√)\s+(\d+)/,
      fail: /(?:✗|×|FAIL|failed|×)\s+(\d+)/,
      skip: /(?:skip|SKIP|-)\s+(\d+)/,
      total: /Tests:\s+(\d+)/,
    };
    const match = output.match(patterns[type]);
    return match ? parseInt(match[1], 10) : 0;
  }
}
