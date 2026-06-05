import { z } from 'zod';
import { execa } from 'execa';
import { BaseTool, type ToolContext } from './tool-registry.js';
import type { ToolResult } from '@openio/shared';

const executeSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional().default([]),
  cwd: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
  timeout: z.number().optional(),
});

export class ExecuteCommandTool extends BaseTool {
  name = 'execute_command';
  description = 'Execute a shell command and return its output';
  inputSchema = executeSchema;

  async execute(args: unknown, ctx?: ToolContext): Promise<ToolResult> {
    const { command, args: cmdArgs, cwd, env, timeout } = this.validate<z.infer<typeof executeSchema>>(args);

    try {
      const result = await execa(command, cmdArgs, {
        cwd: cwd ?? ctx?.workingDir,
        env: env as Record<string, string> | undefined,
        timeout: timeout ?? ctx?.timeout,
        reject: false,
        all: true,
      });

      const output = typeof result.all === 'string' ? result.all : result.stdout;

      return {
        success: result.exitCode === 0,
        output,
        metadata: {
          exitCode: result.exitCode,
          command: `${command} ${cmdArgs.join(' ')}`,
        },
      };
    } catch (err) {
      const e = err as Error & { exitCode?: number; all?: unknown };
      return {
        success: false,
        error: typeof e.all === 'string' ? e.all : e.message,
        metadata: { exitCode: e.exitCode, command: `${command} ${cmdArgs.join(' ')}` },
      };
    }
  }
}

export class SpawnTool extends BaseTool {
  name = 'spawn';
  description = 'Spawn a long-running process and get live output';
  inputSchema = executeSchema;

  async execute(args: unknown, ctx?: ToolContext): Promise<ToolResult> {
    const { command, args: cmdArgs, cwd, env, timeout } = this.validate<z.infer<typeof executeSchema>>(args);

    try {
      const subprocess = execa(command, cmdArgs, {
        cwd: cwd ?? ctx?.workingDir,
        env: env as Record<string, string> | undefined,
        timeout: timeout ?? ctx?.timeout,
        all: true,
      });

      const result = await subprocess;
      const output = typeof result.all === 'string' ? result.all : result.stdout;

      return {
        success: result.exitCode === 0,
        output,
        metadata: { exitCode: result.exitCode, command: `${command} ${cmdArgs.join(' ')}` },
      };
    } catch (err) {
      const e = err as Error & { exitCode?: number; all?: unknown };
      return {
        success: false,
        error: typeof e.all === 'string' ? e.all : e.message,
        metadata: { exitCode: e.exitCode },
      };
    }
  }
}
