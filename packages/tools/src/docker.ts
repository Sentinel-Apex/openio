import { z } from 'zod';
import { execa } from 'execa';
import { BaseTool, type ToolContext } from './tool-registry.js';
import type { ToolResult } from '@openio/shared';

const psSchema = z.object({
  all: z.boolean().optional().default(false),
});

const imagesSchema = z.object({});

const pullSchema = z.object({
  image: z.string(),
});

const runSchema = z.object({
  image: z.string(),
  command: z.array(z.string()).optional().default([]),
  detach: z.boolean().optional().default(false),
  ports: z.array(z.string()).optional().default([]),
  env: z.record(z.string(), z.string()).optional(),
  name: z.string().optional(),
  rm: z.boolean().optional().default(false),
});

const stopSchema = z.object({
  container: z.string(),
});

const execSchema = z.object({
  container: z.string(),
  command: z.array(z.string()),
});

const logsSchema = z.object({
  container: z.string(),
  follow: z.boolean().optional().default(false),
  tail: z.number().optional(),
});

async function docker(args: string[]): Promise<ToolResult> {
  try {
    const result = await execa('docker', args, { reject: false, all: true });
    return {
      success: result.exitCode === 0,
      output: result.all ?? result.stdout,
      metadata: { exitCode: result.exitCode, args: args.join(' ') },
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export class DockerPsTool extends BaseTool {
  name = 'docker_ps';
  description = 'List Docker containers';
  inputSchema = psSchema;
  async execute(args: unknown): Promise<ToolResult> {
    const { all } = this.validate<z.infer<typeof psSchema>>(args);
    const cmd = ['ps'];
    if (all) cmd.push('-a');
    return docker(cmd);
  }
}

export class DockerImagesTool extends BaseTool {
  name = 'docker_images';
  description = 'List Docker images';
  inputSchema = imagesSchema;
  async execute(): Promise<ToolResult> {
    return docker(['images']);
  }
}

export class DockerPullTool extends BaseTool {
  name = 'docker_pull';
  description = 'Pull a Docker image from a registry';
  inputSchema = pullSchema;
  async execute(args: unknown): Promise<ToolResult> {
    const { image } = this.validate<z.infer<typeof pullSchema>>(args);
    return docker(['pull', image]);
  }
}

export class DockerRunTool extends BaseTool {
  name = 'docker_run';
  description = 'Run a command in a new Docker container';
  inputSchema = runSchema;
  async execute(args: unknown): Promise<ToolResult> {
    const { image, command, detach, ports, env, name, rm } = this.validate<z.infer<typeof runSchema>>(args);
    const cmd = ['run'];
    if (detach) cmd.push('-d');
    if (rm) cmd.push('--rm');
    if (name) cmd.push('--name', name);
    for (const p of ports) cmd.push('-p', p);
    if (env) for (const [k, v] of Object.entries(env)) cmd.push('-e', `${k}=${v}`);
    cmd.push(image, ...command);
    return docker(cmd);
  }
}

export class DockerStopTool extends BaseTool {
  name = 'docker_stop';
  description = 'Stop a running Docker container';
  inputSchema = stopSchema;
  async execute(args: unknown): Promise<ToolResult> {
    const { container } = this.validate<z.infer<typeof stopSchema>>(args);
    return docker(['stop', container]);
  }
}

export class DockerExecTool extends BaseTool {
  name = 'docker_exec';
  description = 'Run a command in a running Docker container';
  inputSchema = execSchema;
  async execute(args: unknown): Promise<ToolResult> {
    const { container, command } = this.validate<z.infer<typeof execSchema>>(args);
    return docker(['exec', container, ...command]);
  }
}

export class DockerLogsTool extends BaseTool {
  name = 'docker_logs';
  description = 'Fetch logs from a Docker container';
  inputSchema = logsSchema;
  async execute(args: unknown): Promise<ToolResult> {
    const { container, follow, tail } = this.validate<z.infer<typeof logsSchema>>(args);
    const cmd = ['logs'];
    if (follow) cmd.push('-f');
    if (tail) cmd.push('--tail', String(tail));
    cmd.push(container);
    return docker(cmd);
  }
}
