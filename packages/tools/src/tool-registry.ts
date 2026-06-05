import { z } from 'zod';
import type { ToolResult } from '@openio/shared';
import { ToolError, getLogger } from '@openio/shared';

export interface ToolMetadata {
  name: string;
  description: string;
  inputSchema: z.ZodType<unknown>;
}

export abstract class BaseTool implements ToolMetadata {
  abstract name: string;
  abstract description: string;
  abstract inputSchema: z.ZodType<unknown>;

  abstract execute(args: unknown, ctx?: ToolContext): Promise<ToolResult>;

  protected success(output?: string, metadata?: Record<string, unknown>): ToolResult {
    return { success: true, output, metadata };
  }

  protected failure(error: string): ToolResult {
    return { success: false, error };
  }

  protected validate<T>(args: unknown): T {
    return this.inputSchema.parse(args) as T;
  }
}

export interface ToolContext {
  timeout?: number;
  signal?: AbortSignal;
  workingDir?: string;
}

export interface PermissionRule {
  action: 'allow' | 'deny';
  pattern: string;
}

export class PermissionChecker {
  private rules: PermissionRule[] = [];

  constructor(rules?: PermissionRule[]) {
    if (rules) this.rules = rules;
  }

  addRule(rule: PermissionRule): void {
    this.rules.push(rule);
  }

  isAllowed(toolName: string, resource: string): boolean {
    let allowed = false;
    for (const rule of this.rules) {
      if (rule.pattern === '*' || rule.pattern === resource) {
        allowed = rule.action === 'allow';
      }
    }
    return allowed;
  }

  checkOrThrow(toolName: string, resource: string): void {
    if (!this.isAllowed(toolName, resource)) {
      throw new ToolError(`Permission denied: ${toolName} on '${resource}'`, toolName);
    }
  }
}

export class ToolRegistry {
  private tools = new Map<string, BaseTool>();
  public permissions: PermissionChecker;
  private defaultTimeout: number;

  constructor(opts?: { permissions?: PermissionRule[]; timeout?: number }) {
    this.permissions = new PermissionChecker(opts?.permissions);
    this.defaultTimeout = opts?.timeout ?? 30000;
  }

  register(tool: BaseTool): void {
    this.tools.set(tool.name, tool);
    getLogger().info({ tool: tool.name }, 'Tool registered');
  }

  get(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  list(): BaseTool[] {
    return [...this.tools.values()];
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  async execute(
    name: string,
    args: unknown,
    ctx?: ToolContext,
  ): Promise<ToolResult> {
    const tool = this.get(name);
    if (!tool) {
      return { success: false, error: `Unknown tool: ${name}` };
    }

    const timeout = ctx?.timeout ?? this.defaultTimeout;

    getLogger().info({ tool: name, args }, 'Tool execute');

    try {
      const result = await withTimeout(tool.execute(args, ctx), timeout);
      getLogger().info({ tool: name, success: result.success }, 'Tool complete');
      return result;
    } catch (err) {
      const message = err instanceof ToolError ? err.message : `Tool '${name}' failed: ${(err as Error).message}`;
      getLogger().error({ tool: name, error: message }, 'Tool failed');
      return { success: false, error: message };
    }
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  if (ms <= 0) return promise;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  try {
    const result = await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error(`Timed out after ${ms}ms`));
        });
      }),
    ]);
    return result;
  } finally {
    clearTimeout(timer);
  }
}

export const toolRegistry = new ToolRegistry();
