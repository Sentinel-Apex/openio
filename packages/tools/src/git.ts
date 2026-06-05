import { z } from 'zod';
import { execa } from 'execa';
import { BaseTool, type ToolContext } from './tool-registry.js';
import type { ToolResult } from '@openio/shared';

const repoPath = (ctx?: ToolContext) => ctx?.workingDir ?? process.cwd();

const statusSchema = z.object({
  cwd: z.string().optional(),
});

const logSchema = z.object({
  maxCount: z.number().optional().default(10),
  cwd: z.string().optional(),
});

const diffSchema = z.object({
  target: z.string().optional(),
  cwd: z.string().optional(),
  staged: z.boolean().optional().default(false),
});

const commitSchema = z.object({
  message: z.string(),
  cwd: z.string().optional(),
  all: z.boolean().optional().default(false),
});

const branchSchema = z.object({
  cwd: z.string().optional(),
});

const pushSchema = z.object({
  remote: z.string().optional().default('origin'),
  branch: z.string().optional(),
  cwd: z.string().optional(),
});

const pullSchema = z.object({
  remote: z.string().optional().default('origin'),
  branch: z.string().optional(),
  cwd: z.string().optional(),
});

const cloneSchema = z.object({
  url: z.string(),
  directory: z.string().optional(),
  cwd: z.string().optional(),
});

const addSchema = z.object({
  files: z.array(z.string()).optional().default(['.']),
  cwd: z.string().optional(),
});

const checkoutSchema = z.object({
  branch: z.string(),
  create: z.boolean().optional().default(false),
  cwd: z.string().optional(),
});

async function git(args: string[], cwd?: string): Promise<ToolResult> {
  try {
    const result = await execa('git', args, { cwd, reject: false, all: true });
    return {
      success: result.exitCode === 0,
      output: result.all ?? result.stdout,
      metadata: { exitCode: result.exitCode, args: args.join(' ') },
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export class GitStatusTool extends BaseTool {
  name = 'git_status';
  description = 'Show the working tree status';
  inputSchema = statusSchema;
  async execute(args: unknown, ctx?: ToolContext): Promise<ToolResult> {
    const { cwd } = this.validate<z.infer<typeof statusSchema>>(args);
    return git(['status', '--short'], cwd ?? repoPath(ctx));
  }
}

export class GitLogTool extends BaseTool {
  name = 'git_log';
  description = 'Show commit logs';
  inputSchema = logSchema;
  async execute(args: unknown, ctx?: ToolContext): Promise<ToolResult> {
    const { maxCount, cwd } = this.validate<z.infer<typeof logSchema>>(args);
    return git(['log', `--max-count=${maxCount}`, '--oneline', '--graph'], cwd ?? repoPath(ctx));
  }
}

export class GitDiffTool extends BaseTool {
  name = 'git_diff';
  description = 'Show changes between commits, working tree, or staged';
  inputSchema = diffSchema;
  async execute(args: unknown, ctx?: ToolContext): Promise<ToolResult> {
    const { target, cwd, staged } = this.validate<z.infer<typeof diffSchema>>(args);
    const cmd = ['diff'];
    if (staged) cmd.push('--staged');
    if (target) cmd.push(target);
    return git(cmd, cwd ?? repoPath(ctx));
  }
}

export class GitCommitTool extends BaseTool {
  name = 'git_commit';
  description = 'Record changes to the repository';
  inputSchema = commitSchema;
  async execute(args: unknown, ctx?: ToolContext): Promise<ToolResult> {
    const { message, cwd, all } = this.validate<z.infer<typeof commitSchema>>(args);
    const cmd = ['commit', '-m', message];
    if (all) cmd.unshift('add', '.');
    return git(cmd, cwd ?? repoPath(ctx));
  }
}

export class GitBranchTool extends BaseTool {
  name = 'git_branch';
  description = 'List branches';
  inputSchema = branchSchema;
  async execute(args: unknown, ctx?: ToolContext): Promise<ToolResult> {
    const { cwd } = this.validate<z.infer<typeof branchSchema>>(args);
    return git(['branch', '-a'], cwd ?? repoPath(ctx));
  }
}

export class GitPushTool extends BaseTool {
  name = 'git_push';
  description = 'Push to remote repository';
  inputSchema = pushSchema;
  async execute(args: unknown, ctx?: ToolContext): Promise<ToolResult> {
    const { remote, branch, cwd } = this.validate<z.infer<typeof pushSchema>>(args);
    const cmd = ['push', remote];
    if (branch) cmd.push(branch);
    return git(cmd, cwd ?? repoPath(ctx));
  }
}

export class GitPullTool extends BaseTool {
  name = 'git_pull';
  description = 'Pull from remote repository';
  inputSchema = pullSchema;
  async execute(args: unknown, ctx?: ToolContext): Promise<ToolResult> {
    const { remote, branch, cwd } = this.validate<z.infer<typeof pullSchema>>(args);
    const cmd = ['pull', remote];
    if (branch) cmd.push(branch);
    return git(cmd, cwd ?? repoPath(ctx));
  }
}

export class GitCloneTool extends BaseTool {
  name = 'git_clone';
  description = 'Clone a repository into a new directory';
  inputSchema = cloneSchema;
  async execute(args: unknown, ctx?: ToolContext): Promise<ToolResult> {
    const { url, directory, cwd } = this.validate<z.infer<typeof cloneSchema>>(args);
    const cmd = ['clone', url];
    if (directory) cmd.push(directory);
    return git(cmd, cwd ?? repoPath(ctx));
  }
}

export class GitAddTool extends BaseTool {
  name = 'git_add';
  description = 'Add file contents to the index';
  inputSchema = addSchema;
  async execute(args: unknown, ctx?: ToolContext): Promise<ToolResult> {
    const { files, cwd } = this.validate<z.infer<typeof addSchema>>(args);
    return git(['add', ...files], cwd ?? repoPath(ctx));
  }
}

export class GitCheckoutTool extends BaseTool {
  name = 'git_checkout';
  description = 'Switch branches or restore working tree files';
  inputSchema = checkoutSchema;
  async execute(args: unknown, ctx?: ToolContext): Promise<ToolResult> {
    const { branch, create, cwd } = this.validate<z.infer<typeof checkoutSchema>>(args);
    const cmd = ['checkout'];
    if (create) cmd.push('-b');
    cmd.push(branch);
    return git(cmd, cwd ?? repoPath(ctx));
  }
}
