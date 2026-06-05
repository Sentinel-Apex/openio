import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, extname, basename, dirname } from 'node:path';
import { getLogger } from '@openio/shared';

export interface ProjectInfo {
  name: string;
  root: string;
  frameworks: string[];
  language: 'typescript' | 'javascript' | 'python' | 'unknown';
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'unknown';
  entryPoints: string[];
  configFiles: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  fileCount: number;
  dirCount: number;
}

export interface FileNode {
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileNode[];
}

export class ProjectAnalyzer {
  private root: string;

  constructor(root?: string) {
    this.root = resolve(root ?? process.cwd());
  }

  async analyze(): Promise<ProjectInfo> {
    const info: ProjectInfo = {
      name: basename(this.root),
      root: this.root,
      frameworks: [],
      language: 'unknown',
      packageManager: 'unknown',
      entryPoints: [],
      configFiles: [],
      dependencies: {},
      devDependencies: {},
      fileCount: 0,
      dirCount: 0,
    };

    this.detectPackageManager(info);
    this.detectLanguage(info);
    this.detectFrameworks(info);
    this.scanStructure(info);
    this.findEntryPoints(info);

    getLogger().info({ name: info.name, frameworks: info.frameworks, language: info.language }, 'Project analyzed');
    return info;
  }

  scanFiles(dir: string = this.root, maxDepth = 10): FileNode[] {
    if (maxDepth <= 0) return [];
    const results: FileNode[] = [];

    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        if (entry.startsWith('.') || entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          results.push({
            path: relative(this.root, fullPath),
            type: 'directory',
            children: this.scanFiles(fullPath, maxDepth - 1),
          });
        } else {
          results.push({ path: relative(this.root, fullPath), type: 'file', size: stat.size });
        }
      }
    } catch { /* skip unreadable dirs */ }

    return results;
  }

  private detectPackageManager(info: ProjectInfo): void {
    if (existsSync(join(this.root, 'pnpm-lock.yaml'))) info.packageManager = 'pnpm';
    else if (existsSync(join(this.root, 'yarn.lock'))) info.packageManager = 'yarn';
    else if (existsSync(join(this.root, 'package-lock.json'))) info.packageManager = 'npm';

    const pkgPath = join(this.root, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        info.dependencies = pkg.dependencies ?? {};
        info.devDependencies = pkg.devDependencies ?? {};
        info.configFiles.push('package.json');
      } catch { /* ignore */ }
    }

    const reqPath = join(this.root, 'requirements.txt');
    if (existsSync(reqPath)) {
      const lines = readFileSync(reqPath, 'utf-8').split('\n').filter(Boolean);
      for (const line of lines) {
        const [name, version] = line.split('==').map((s) => s.trim());
        if (name && name !== 'fastapi' && name !== 'uvicorn') {
          info.dependencies[name] = version ?? 'latest';
        }
      }
      info.configFiles.push('requirements.txt');
    }

    if (existsSync(join(this.root, 'tsconfig.json'))) info.configFiles.push('tsconfig.json');
    if (existsSync(join(this.root, '.env'))) info.configFiles.push('.env');
    if (existsSync(join(this.root, 'Dockerfile'))) info.configFiles.push('Dockerfile');
  }

  private detectLanguage(info: ProjectInfo): void {
    if (existsSync(join(this.root, 'tsconfig.json')) || Object.keys(info.dependencies).some((d) => d.startsWith('@types/'))) {
      info.language = 'typescript';
    } else if (existsSync(join(this.root, 'package.json'))) {
      info.language = 'javascript';
    } else if (existsSync(join(this.root, 'requirements.txt')) || existsSync(join(this.root, 'pyproject.toml'))) {
      info.language = 'python';
    }
  }

  private detectFrameworks(info: ProjectInfo): void {
    const allDeps = { ...info.dependencies, ...info.devDependencies };

    if (allDeps.next) info.frameworks.push('nextjs');
    if (allDeps.react || allDeps['react-dom']) info.frameworks.push('react');
    if (allDeps.vue || allDeps['vue-router']) info.frameworks.push('vue');
    if (allDeps.express) info.frameworks.push('express');
    if (allDeps.fastify) info.frameworks.push('fastify');
    if (allDeps.nest) info.frameworks.push('nestjs');
    if (allDeps.prisma) info.frameworks.push('prisma');
    if (allDeps['typeorm']) info.frameworks.push('typeorm');
    if (allDeps.drizzle) info.frameworks.push('drizzle');
    if (allDeps.tailwindcss) info.frameworks.push('tailwind');
    if (allDeps.vitest || allDeps.jest) info.frameworks.push(allDeps.vitest ? 'vitest' : 'jest');
    if (allDeps.django) info.frameworks.push('django');
    if (allDeps.fastapi) info.frameworks.push('fastapi');
    if (allDeps.flask) info.frameworks.push('flask');

    if (info.frameworks.length === 0 && info.language !== 'unknown') {
      info.frameworks.push('unknown');
    }
  }

  private findEntryPoints(info: ProjectInfo): void {
    const candidates = ['src/index.ts', 'src/index.js', 'src/app.ts', 'src/app.js', 'index.ts', 'index.js', 'main.ts', 'main.py', 'app.py', 'src/main.ts', 'src/main.py'];
    for (const c of candidates) {
      if (existsSync(join(this.root, c))) info.entryPoints.push(c);
    }

    if (info.frameworks.includes('nextjs') && existsSync(join(this.root, 'pages'))) {
      info.entryPoints.push('pages/');
    }
  }

  private scanStructure(info: ProjectInfo): void {
    try {
      const entries = readdirSync(this.root);
      for (const e of entries) {
        if (e.startsWith('.') || e === 'node_modules' || e === 'dist') continue;
        const fp = join(this.root, e);
        try {
          if (statSync(fp).isDirectory()) info.dirCount++;
          else info.fileCount++;
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }

  readFile(filePath: string): string | null {
    const full = resolve(this.root, filePath);
    if (!existsSync(full)) return null;
    try {
      return readFileSync(full, 'utf-8');
    } catch {
      return null;
    }
  }

  findFiles(pattern: string): string[] {
    const results: string[] = [];
    const walk = (dir: string) => {
      try {
        for (const e of readdirSync(dir)) {
          if (e.startsWith('.') || e === 'node_modules' || e === 'dist') continue;
          const fp = join(dir, e);
          if (statSync(fp).isDirectory()) walk(fp);
          else if (e.includes(pattern.replace('*', ''))) results.push(relative(this.root, fp));
        }
      } catch { /* skip */ }
    };
    walk(this.root);
    return results;
  }
}
