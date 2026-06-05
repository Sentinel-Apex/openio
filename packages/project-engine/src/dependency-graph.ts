import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { getLogger } from '@openio/shared';

export interface DependencyNode {
  id: string;
  label: string;
  type: 'file' | 'package' | 'external';
  path?: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'import' | 'require' | 'dynamic';
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  cycles: string[][];
}

const IMPORT_RE = /(?:import\s+(?:(?:\{[^}]*\}|[^;{]+)\s+from\s+)?['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g;
const RELATIVE_IMPORT_RE = /^[./]/;

export class DependencyAnalyzer {
  private root: string;

  constructor(root?: string) {
    this.root = resolve(root ?? process.cwd());
  }

  async buildGraph(): Promise<DependencyGraph> {
    const nodes: Map<string, DependencyNode> = new Map();
    const edges: DependencyEdge[] = [];
    const cycles: string[][] = [];

    const sourceFiles = this.findSourceFiles();
    const nodeId = (p: string) => relative(this.root, p).replace(/\\/g, '/');

    for (const file of sourceFiles) {
      const id = nodeId(file);
      if (!nodes.has(id)) {
        nodes.set(id, { id, label: relative(this.root, file), type: 'file', path: file });
      }

      const content = readFileSync(file, 'utf-8');
      let match: RegExpExecArray | null;
      IMPORT_RE.lastIndex = 0;

      while ((match = IMPORT_RE.exec(content)) !== null) {
        const importPath = match[1] ?? match[2];
        if (!importPath) continue;

        if (RELATIVE_IMPORT_RE.test(importPath)) {
          const resolved = this.resolveImport(file, importPath);
          if (resolved) {
            const targetId = nodeId(resolved);
            if (!nodes.has(targetId)) {
              nodes.set(targetId, { id: targetId, label: relative(this.root, resolved), type: 'file', path: resolved });
            }
            edges.push({ from: id, to: targetId, type: importPath.startsWith('import') ? 'import' : 'require' });
          }
        } else {
          const pkgName = importPath.split('/')[0].startsWith('@') ? importPath.split('/').slice(0, 2).join('/') : importPath.split('/')[0];
          const pkgId = `pkg:${pkgName}`;
          if (!nodes.has(pkgId)) {
            nodes.set(pkgId, { id: pkgId, label: pkgName, type: 'package' });
          }
          edges.push({ from: id, to: pkgId, type: match[2] ? 'require' : 'import' });
        }
      }
    }

    const detectedCycles = this.detectCycles([...nodes.keys()], edges);
    cycles.push(...detectedCycles);

    getLogger().info({ nodes: nodes.size, edges: edges.length, cycles: cycles.length }, 'Dependency graph built');
    return { nodes: [...nodes.values()], edges, cycles };
  }

  private findSourceFiles(dir: string = this.root): string[] {
    const files: string[] = [];
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        if (entry.startsWith('.') || entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) files.push(...this.findSourceFiles(full));
        else if (/\.(ts|js|tsx|jsx|mjs)$/.test(entry)) files.push(full);
      }
    } catch { /* skip */ }
    return files;
  }

  private resolveImport(file: string, importPath: string): string | null {
    const dir = require('path').dirname(file);
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '/index.ts', '/index.js'];

    for (const ext of extensions) {
      const candidate = resolve(dir, importPath + ext);
      if (existsSync(candidate)) return candidate;
    }

    const base = resolve(dir, importPath);
    if (existsSync(base) && statSync(base).isDirectory()) {
      for (const ext of ['/index.ts', '/index.js']) {
        const c = base + ext;
        if (existsSync(c)) return c;
      }
    }

    return null;
  }

  private detectCycles(nodeIds: string[], edges: DependencyEdge[]): string[][] {
    const adj = new Map<string, string[]>();
    for (const n of nodeIds) adj.set(n, []);
    for (const e of edges) {
      if (adj.has(e.from) && adj.has(e.to)) adj.get(e.from)!.push(e.to);
    }

    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string) => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      for (const neighbor of adj.get(node) ?? []) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recStack.has(neighbor)) {
          const cycle = path.slice(path.indexOf(neighbor));
          cycles.push([...cycle, neighbor]);
        }
      }

      path.pop();
      recStack.delete(node);
    };

    for (const n of nodeIds) {
      if (!visited.has(n)) dfs(n);
    }

    return cycles;
  }
}
