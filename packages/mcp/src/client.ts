import { v4 as uuid } from 'uuid';
import { MCPError, getLogger } from '@openio/shared';
import { Transport, type JSONRPCRequest, type JSONRPCResponse } from './transport.js';

export interface MCPToolSpec {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface MCPResourceSpec {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPromptSpec {
  name: string;
  description?: string;
  arguments?: { name: string; description?: string; required?: boolean }[];
}

export interface MCPServerCapabilities {
  tools?: boolean;
  resources?: boolean;
  prompts?: boolean;
  logging?: boolean;
}

export interface MCPClientOptions {
  clientName?: string;
  clientVersion?: string;
  requestTimeout?: number;
}

export class MCPClient {
  private transport: Transport;
  private clientName: string;
  private clientVersion: string;
  private requestTimeout: number;
  private pending = new Map<string | number, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: NodeJS.Timeout }>();
  private msgId = 0;
  private initialized = false;
  private serverCapabilities: MCPServerCapabilities = {};
  private serverInfo: { name?: string; version?: string } = {};

  constructor(transport: Transport, options?: MCPClientOptions) {
    this.transport = transport;
    this.clientName = options?.clientName ?? 'openio';
    this.clientVersion = options?.clientVersion ?? '1.0.0';
    this.requestTimeout = options?.requestTimeout ?? 30000;

    this.transport.on('message', (msg: JSONRPCResponse) => {
      const pending = this.pending.get(msg.id);
      if (pending) {
        clearTimeout(pending.timer);
        this.pending.delete(msg.id);
        if ('error' in msg && msg.error) {
          pending.reject(new MCPError(`[${msg.error.code}] ${msg.error.message}`));
        } else {
          pending.resolve(msg.result);
        }
      }
    });
  }

  get isConnected(): boolean {
    return this.initialized;
  }

  get capabilities(): MCPServerCapabilities {
    return { ...this.serverCapabilities };
  }

  get server(): { name?: string; version?: string } {
    return { ...this.serverInfo };
  }

  async connect(): Promise<void> {
    await this.transport.start();
    const result = await this.request('initialize', {
      protocolVersion: '0.1.0',
      capabilities: {},
      clientInfo: { name: this.clientName, version: this.clientVersion },
    }) as Record<string, unknown>;

    const caps = result?.capabilities as Record<string, unknown> | undefined;
    if (caps) {
      this.serverCapabilities = {
        tools: !!caps.tools,
        resources: !!caps.resources,
        prompts: !!caps.prompts,
        logging: !!caps.logging,
      };
    }

    const info = result?.serverInfo as Record<string, unknown> | undefined;
    if (info) {
      this.serverInfo = { name: info.name as string, version: info.version as string };
    }

    await this.request('notifications/initialized', {});
    this.initialized = true;
    getLogger().info({ server: this.serverInfo, caps: this.serverCapabilities }, 'MCP client connected');
  }

  async disconnect(): Promise<void> {
    this.initialized = false;
    await this.transport.close();
  }

  async listTools(): Promise<MCPToolSpec[]> {
    const result = await this.request('tools/list', {}) as { tools: MCPToolSpec[] };
    return result.tools ?? [];
  }

  async callTool(name: string, args?: Record<string, unknown>): Promise<unknown> {
    return this.request('tools/call', { name, arguments: args });
  }

  async listResources(): Promise<MCPResourceSpec[]> {
    const result = await this.request('resources/list', {}) as { resources: MCPResourceSpec[] };
    return result.resources ?? [];
  }

  async readResource(uri: string): Promise<unknown> {
    return this.request('resources/read', { uri });
  }

  async listPrompts(): Promise<MCPPromptSpec[]> {
    const result = await this.request('prompts/list', {}) as { prompts: MCPPromptSpec[] };
    return result.prompts ?? [];
  }

  async getPrompt(name: string, args?: Record<string, string>): Promise<unknown> {
    return this.request('prompts/get', { name, arguments: args });
  }

  async ping(): Promise<boolean> {
    try {
      await this.request('ping', {});
      return true;
    } catch {
      return false;
    }
  }

  private async request(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.initialized && method !== 'initialize') {
      throw new MCPError('Client not initialized');
    }

    const id = ++this.msgId;
    const request: JSONRPCRequest = { jsonrpc: '2.0', id, method, params };

    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new MCPError(`Request '${method}' timed out after ${this.requestTimeout}ms`));
      }, this.requestTimeout);

      this.pending.set(id, { resolve, reject, timer });
      this.transport.send(request).catch((err) => {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err);
      });
    });
  }
}
