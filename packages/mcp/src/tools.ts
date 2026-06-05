import { z } from 'zod';
import { MCPError } from '@openio/shared';
import { mcpRegistry } from './registry.js';
import { BaseTool, type ToolContext } from '@openio/tools';
import type { ToolResult } from '@openio/shared';
import type { MCPToolSpec } from './client.js';

function mcpSchemaToZod(schema?: Record<string, unknown>): z.ZodType<unknown> {
  if (!schema || !schema.properties) return z.any();
  const props = schema.properties as Record<string, { type?: string; description?: string }>;
  const shape: Record<string, z.ZodType<unknown>> = {};

  for (const [key, prop] of Object.entries(props)) {
    let field: z.ZodType<unknown>;
    switch (prop.type) {
      case 'string': field = z.string(); break;
      case 'number': field = z.number(); break;
      case 'integer': field = z.number().int(); break;
      case 'boolean': field = z.boolean(); break;
      case 'array': field = z.array(z.any()); break;
      case 'object': field = z.record(z.unknown()); break;
      default: field = z.any(); break;
    }
    if (prop.description) field = field.describe(prop.description);
    shape[key] = field;
  }

  const required = (schema.required as string[]) ?? [];
  return z.object(shape).partial().required(required.reduce((acc, k) => ({ ...acc, [k]: true }), {}));
}

export class MCPToolWrapper extends BaseTool {
  name: string;
  description: string;
  inputSchema: z.ZodType<unknown>;
  private serverId: string;
  private mcpName: string;

  constructor(serverId: string, spec: MCPToolSpec) {
    super();
    this.serverId = serverId;
    this.mcpName = spec.name;
    this.name = `mcp_${serverId}_${spec.name}`;
    this.description = spec.description ?? `MCP tool: ${spec.name} (server: ${serverId})`;
    this.inputSchema = mcpSchemaToZod(spec.inputSchema);
  }

  async execute(args: unknown, _ctx?: ToolContext): Promise<ToolResult> {
    try {
      const parsed = this.inputSchema.parse(args) as Record<string, unknown>;
      const result = await mcpRegistry.callTool(this.serverId, this.mcpName, parsed);
      return this.success(
        typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        { serverId: this.serverId, tool: this.mcpName },
      );
    } catch (err) {
      return this.failure(`MCP tool '${this.mcpName}' failed: ${(err as Error).message}`);
    }
  }
}

export async function registerMCPTools(toolRegistry: { register: (tool: any) => void }): Promise<number> {
  const allTools = mcpRegistry.listAllTools();
  let count = 0;

  for (const { serverId, tool } of allTools) {
    const wrapper = new MCPToolWrapper(serverId, tool);
    toolRegistry.register(wrapper);
    count++;
  }

  return count;
}
