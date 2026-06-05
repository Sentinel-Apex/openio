import { z } from 'zod';
import {
  readFileSync,
  writeFileSync,
  unlinkSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  copyFileSync,
  renameSync,
} from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { BaseTool, type ToolContext } from './tool-registry.js';
import type { ToolResult } from '@openio/shared';

const readSchema = z.object({
  path: z.string(),
  encoding: z.string().optional().default('utf-8'),
});

const writeSchema = z.object({
  path: z.string(),
  content: z.string(),
});

const deleteSchema = z.object({
  path: z.string(),
  recursive: z.boolean().optional().default(false),
});

const listSchema = z.object({
  path: z.string().optional().default('.'),
  recursive: z.boolean().optional().default(false),
});

const mkdirSchema = z.object({
  path: z.string(),
  recursive: z.boolean().optional().default(true),
});

const copySchema = z.object({
  source: z.string(),
  destination: z.string(),
});

const moveSchema = z.object({
  source: z.string(),
  destination: z.string(),
});

const existsSchema = z.object({
  path: z.string(),
});

function resolvePath(p: string, ctx?: ToolContext): string {
  if (resolve(p) === p) return p;
  return resolve(ctx?.workingDir ?? process.cwd(), p);
}

function makeRelative(p: string): string {
  try {
    return relative(process.cwd(), p);
  } catch {
    return p;
  }
}

export class ReadTool extends BaseTool {
  name = 'read';
  description = 'Read file contents from the filesystem';
  inputSchema = readSchema;

  async execute(args: unknown, ctx?: ToolContext): Promise<ToolResult> {
    const { path: p, encoding } = this.validate<z.infer<typeof readSchema>>(args);
    const fullPath = resolvePath(p, ctx);
    if (!existsSync(fullPath)) return this.failure(`File not found: ${makeRelative(fullPath)}`);
    const content = readFileSync(fullPath, encoding as BufferEncoding);
    return this.success(content, { path: makeRelative(fullPath) });
  }
}

export class WriteTool extends BaseTool {
  name = 'write';
  description = 'Write content to a file (creates directories if needed)';
  inputSchema = writeSchema;

  async execute(args: unknown, ctx?: ToolContext): Promise<ToolResult> {
    const { path: p, content } = this.validate<z.infer<typeof writeSchema>>(args);
    const fullPath = resolvePath(p, ctx);
    mkdirSync(resolve(fullPath, '..'), { recursive: true });
    writeFileSync(fullPath, content, 'utf-8');
    return this.success(`Written ${Buffer.byteLength(content)} bytes`, { path: makeRelative(fullPath) });
  }
}

export class DeleteTool extends BaseTool {
  name = 'delete';
  description = 'Delete a file or directory';
  inputSchema = deleteSchema;

  async execute(args: unknown, ctx?: ToolContext): Promise<ToolResult> {
    const { path: p, recursive } = this.validate<z.infer<typeof deleteSchema>>(args);
    const fullPath = resolvePath(p, ctx);
    if (!existsSync(fullPath)) return this.failure(`Not found: ${makeRelative(fullPath)}`);
    const isDir = statSync(fullPath).isDirectory();
    if (isDir && !recursive) return this.failure('Use recursive=true to delete directories');
    unlinkSync(fullPath);
    return this.success(`Deleted ${makeRelative(fullPath)}`);
  }
}

export class ListTool extends BaseTool {
  name = 'list';
  description = 'List files and directories';
  inputSchema = listSchema;

  async execute(args: unknown, ctx?: ToolContext): Promise<ToolResult> {
    const { path: p, recursive } = this.validate<z.infer<typeof listSchema>>(args);
    const fullPath = resolvePath(p, ctx);
    if (!existsSync(fullPath)) return this.failure(`Not found: ${makeRelative(fullPath)}`);

    const entries: string[] = [];
    if (recursive) {
      readdirSync(fullPath, { recursive: true }).forEach((e) => entries.push(makeRelative(resolve(fullPath, e as string))));
    } else {
      readdirSync(fullPath).forEach((e) => entries.push(makeRelative(resolve(fullPath, e))));
    }
    return this.success(entries.join('\n'), { count: entries.length, path: makeRelative(fullPath) });
  }
}

export class MkdirTool extends BaseTool {
  name = 'mkdir';
  description = 'Create a directory';
  inputSchema = mkdirSchema;

  async execute(args: unknown, ctx?: ToolContext): Promise<ToolResult> {
    const { path: p, recursive } = this.validate<z.infer<typeof mkdirSchema>>(args);
    const fullPath = resolvePath(p, ctx);
    mkdirSync(fullPath, { recursive });
    return this.success(`Created ${makeRelative(fullPath)}`);
  }
}

export class CopyTool extends BaseTool {
  name = 'copy';
  description = 'Copy a file';
  inputSchema = copySchema;

  async execute(args: unknown, ctx?: ToolContext): Promise<ToolResult> {
    const { source, destination } = this.validate<z.infer<typeof copySchema>>(args);
    const srcPath = resolvePath(source, ctx);
    const destPath = resolvePath(destination, ctx);
    if (!existsSync(srcPath)) return this.failure(`Source not found: ${makeRelative(srcPath)}`);
    mkdirSync(resolve(destPath, '..'), { recursive: true });
    copyFileSync(srcPath, destPath);
    return this.success(`Copied ${makeRelative(srcPath)} → ${makeRelative(destPath)}`);
  }
}

export class MoveTool extends BaseTool {
  name = 'move';
  description = 'Move or rename a file';
  inputSchema = moveSchema;

  async execute(args: unknown, ctx?: ToolContext): Promise<ToolResult> {
    const { source, destination } = this.validate<z.infer<typeof moveSchema>>(args);
    const srcPath = resolvePath(source, ctx);
    const destPath = resolvePath(destination, ctx);
    if (!existsSync(srcPath)) return this.failure(`Source not found: ${makeRelative(srcPath)}`);
    mkdirSync(resolve(destPath, '..'), { recursive: true });
    renameSync(srcPath, destPath);
    return this.success(`Moved ${makeRelative(srcPath)} → ${makeRelative(destPath)}`);
  }
}

export class ExistsTool extends BaseTool {
  name = 'exists';
  description = 'Check if a file or directory exists';
  inputSchema = existsSchema;

  async execute(args: unknown, ctx?: ToolContext): Promise<ToolResult> {
    const { path: p } = this.validate<z.infer<typeof existsSchema>>(args);
    const fullPath = resolvePath(p, ctx);
    return this.success(existsSync(fullPath).toString(), { path: makeRelative(fullPath), exists: existsSync(fullPath) });
  }
}
