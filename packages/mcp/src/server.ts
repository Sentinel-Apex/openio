import { MCPError, getLogger } from '@openio/shared';
import { Transport, type JSONRPCRequest, type JSONRPCResponse } from './transport.js';
import type { MCPToolSpec, MCPResourceSpec, MCPPromptSpec } from './client.js';

export interface ToolHandler {
  (args: Record<string, unknown>): Promise<unknown>;
}

export interface ResourceHandler {
  (uri: string): Promise<{ contents: { uri: string; text?: string; mimeType?: string }[] }>;
}

export interface PromptHandler {
  (args?: Record<string, string>): Promise<{ messages: { role: string; content: string }[] }>;
}

export interface ServerOptions {
  name?: string;
  version?: string;
  capabilities?: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
    logging?: boolean;
  };
}

export class MCPServer {
  private transport: Transport;
  private name: string;
  private version: string;
  private capabilities: { tools: boolean; resources: boolean; prompts: boolean; logging: boolean };
  private tools = new Map<string, { spec: MCPToolSpec; handler: ToolHandler }>();
  private resources = new Map<string, { spec: MCPResourceSpec; handler: ResourceHandler }>();
  private prompts = new Map<string, { spec: MCPPromptSpec; handler: PromptHandler }>();
  private initialized = false;

  constructor(transport: Transport, options?: ServerOptions) {
    this.transport = transport;
    this.name = options?.name ?? 'openio-mcp';
    this.version = options?.version ?? '1.0.0';
    this.capabilities = {
      tools: options?.capabilities?.tools ?? true,
      resources: options?.capabilities?.resources ?? true,
      prompts: options?.capabilities?.prompts ?? true,
      logging: options?.capabilities?.logging ?? false,
    };

    this.transport.on('message', (msg: JSONRPCRequest) => {
      this.handleRequest(msg).catch((err) => {
        getLogger().error({ error: (err as Error).message }, 'MCP request handler error');
      });
    });
  }

  registerTool(spec: MCPToolSpec, handler: ToolHandler): void {
    this.tools.set(spec.name, { spec, handler });
  }

  registerResource(spec: MCPResourceSpec, handler: ResourceHandler): void {
    this.resources.set(spec.uri, { spec, handler });
  }

  registerPrompt(spec: MCPPromptSpec, handler: PromptHandler): void {
    this.prompts.set(spec.name, { spec, handler });
  }

  async start(): Promise<void> {
    await this.transport.start();
    getLogger().info({ name: this.name, version: this.version }, 'MCP server started');
  }

  async stop(): Promise<void> {
    await this.transport.close();
  }

  private async handleRequest(request: JSONRPCRequest): Promise<void> {
    const { id, method, params } = request;

    if (!id) {
      if (method === 'notifications/initialized') {
        this.initialized = true;
      }
      return;
    }

    try {
      let result: unknown;

      switch (method) {
        case 'initialize':
          result = this.handleInitialize(params);
          break;
        case 'tools/list':
          result = this.handleListTools();
          break;
        case 'tools/call':
          result = await this.handleCallTool(params);
          break;
        case 'resources/list':
          result = this.handleListResources();
          break;
        case 'resources/read':
          result = await this.handleReadResource(params);
          break;
        case 'prompts/list':
          result = this.handleListPrompts();
          break;
        case 'prompts/get':
          result = await this.handleGetPrompt(params);
          break;
        case 'ping':
          result = {};
          break;
        default:
          throw new MCPError(`Unknown method: ${method}`, 'METHOD_NOT_FOUND');
      }

      await this.sendResponse({ jsonrpc: '2.0', id, result });
    } catch (err) {
      const mcpErr = err as Error & { code?: string };
      await this.sendResponse({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: mcpErr.message, data: mcpErr.code },
      });
    }
  }

  private handleInitialize(params?: Record<string, unknown>): Record<string, unknown> {
    this.initialized = true;
    const caps: Record<string, unknown> = {};
    if (this.capabilities.tools) caps.tools = {};
    if (this.capabilities.resources) caps.resources = {};
    if (this.capabilities.prompts) caps.prompts = {};
    if (this.capabilities.logging) caps.logging = {};

    return {
      protocolVersion: '0.1.0',
      capabilities: caps,
      serverInfo: { name: this.name, version: this.version },
    };
  }

  private handleListTools(): { tools: MCPToolSpec[] } {
    return { tools: [...this.tools.values()].map((t) => t.spec) };
  }

  private async handleCallTool(params?: Record<string, unknown>): Promise<unknown> {
    const name = params?.name as string;
    const args = params?.arguments as Record<string, unknown> ?? {};

    const tool = this.tools.get(name);
    if (!tool) throw new MCPError(`Tool not found: ${name}`);
    return tool.handler(args);
  }

  private handleListResources(): { resources: MCPResourceSpec[] } {
    return { resources: [...this.resources.values()].map((r) => r.spec) };
  }

  private async handleReadResource(params?: Record<string, unknown>): Promise<unknown> {
    const uri = params?.uri as string;
    const resource = this.resources.get(uri);
    if (!resource) throw new MCPError(`Resource not found: ${uri}`);
    return resource.handler(uri);
  }

  private handleListPrompts(): { prompts: MCPPromptSpec[] } {
    return { prompts: [...this.prompts.values()].map((p) => p.spec) };
  }

  private async handleGetPrompt(params?: Record<string, unknown>): Promise<unknown> {
    const name = params?.name as string;
    const args = params?.arguments as Record<string, string> | undefined;
    const prompt = this.prompts.get(name);
    if (!prompt) throw new MCPError(`Prompt not found: ${name}`);
    return prompt.handler(args);
  }

  private async sendResponse(response: JSONRPCResponse): Promise<void> {
    await this.transport.send(response);
  }
}
