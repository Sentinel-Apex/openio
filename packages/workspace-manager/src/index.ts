import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, resolve, relative, basename, sep } from 'node:path';
import { homedir } from 'node:os';
import { execa, execaSync } from 'execa';

export interface WorkspaceMeta {
  name: string;
  path: string;
  created: number;
  lastActive: number;
}

const WORKSPACES_DIR = join(homedir(), '.openio', 'workspaces');

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function metaPath(name: string): string {
  return join(WORKSPACES_DIR, `${name}.json`);
}

export class WorkspaceManager {
  private activeWorkspace: string | null = null;

  constructor() {
    ensureDir(WORKSPACES_DIR);
  }

  list(): WorkspaceMeta[] {
    ensureDir(WORKSPACES_DIR);
    const files = readdirSync(WORKSPACES_DIR).filter((f) => f.endsWith('.json'));
    const workspaces: WorkspaceMeta[] = [];
    for (const f of files) {
      try {
        const raw = readFileSync(join(WORKSPACES_DIR, f), 'utf-8');
        workspaces.push(JSON.parse(raw) as WorkspaceMeta);
      } catch {
        // skip corrupt entries
      }
    }
    workspaces.sort((a, b) => b.lastActive - a.lastActive);
    return workspaces;
  }

  create(name: string): WorkspaceMeta {
    const wsPath = resolve(process.cwd(), name);
    if (existsSync(wsPath) && readdirSync(wsPath).length > 0) {
      throw new Error(`Directory already exists and is not empty: ${wsPath}`);
    }
    ensureDir(wsPath);

    const meta: WorkspaceMeta = {
      name,
      path: wsPath,
      created: Date.now(),
      lastActive: Date.now(),
    };
    writeFileSync(metaPath(name), JSON.stringify(meta, null, 2), 'utf-8');
    this.activeWorkspace = name;
    return meta;
  }

  remove(name: string): void {
    const meta = this.get(name);
    const mp = metaPath(name);
    if (existsSync(mp)) rmSync(mp);
    if (existsSync(meta.path)) {
      rmSync(meta.path, { recursive: true, force: true });
    }
    if (this.activeWorkspace === name) {
      this.activeWorkspace = null;
    }
  }

  get(name: string): WorkspaceMeta {
    const mp = metaPath(name);
    if (!existsSync(mp)) {
      throw new Error(`Workspace not found: ${name}`);
    }
    const raw = readFileSync(mp, 'utf-8');
    return JSON.parse(raw) as WorkspaceMeta;
  }

  switch(name: string): WorkspaceMeta {
    const meta = this.get(name);
    meta.lastActive = Date.now();
    writeFileSync(metaPath(name), JSON.stringify(meta, null, 2), 'utf-8');
    this.activeWorkspace = name;
    return meta;
  }

  active(): WorkspaceMeta | null {
    if (!this.activeWorkspace) {
      const ws = this.list();
      if (ws.length === 0) return null;
      this.activeWorkspace = ws[0].name;
    }
    return this.get(this.activeWorkspace);
  }

  resolvePath(file: string): string {
    const ws = this.active();
    if (!ws) throw new Error('No active workspace. Create or switch to a workspace first.');
    return resolve(ws.path, file);
  }

  exists(file: string): boolean {
    return existsSync(this.resolvePath(file));
  }

  read(file: string): string {
    const fullPath = this.resolvePath(file);
    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${file} (resolved: ${fullPath})`);
    }
    return readFileSync(fullPath, 'utf-8');
  }

  write(file: string, content: string): void {
    const fullPath = this.resolvePath(file);
    ensureDir(join(fullPath, '..'));
    writeFileSync(fullPath, content, 'utf-8');
  }

  async exec(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const ws = this.active();
    if (!ws) throw new Error('No active workspace.');
    const result = await execa(command, { shell: true, cwd: ws.path, reject: false });
    return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode ?? 0 };
  }

  execSync(command: string): { stdout: string; stderr: string; exitCode: number } {
    const ws = this.active();
    if (!ws) throw new Error('No active workspace.');
    const result = execaSync(command, { shell: true, cwd: ws.path, reject: false });
    return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode ?? 0 };
  }

  tree(dir: string = ''): string {
    const ws = this.active();
    if (!ws) throw new Error('No active workspace.');
    const root = resolve(ws.path, dir);
    if (!existsSync(root)) {
      throw new Error(`Directory not found: ${dir}`);
    }
    return this.buildTree(root, '');
  }

  private buildTree(dir: string, prefix: string): string {
    let result = '';
    let entries: string[];
    try {
      entries = readdirSync(dir).sort();
    } catch {
      return '';
    }
    const filtered = entries.filter((e) => !e.startsWith('.') && e !== 'node_modules');
    for (let i = 0; i < filtered.length; i++) {
      const entry = filtered[i];
      const fullPath = join(dir, entry);
      const isLast = i === filtered.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      result += prefix + connector + entry + '\n';
      if (statSync(fullPath).isDirectory()) {
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        result += this.buildTree(fullPath, newPrefix);
      }
    }
    return result;
  }
}
