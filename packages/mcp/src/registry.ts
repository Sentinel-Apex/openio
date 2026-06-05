import { getLogger, MCPError } from '@openio/shared';
import { MCPClient } from './client.js';
import { createTransport, type Transport } from './transport.js';
import type { MCPToolSpec } from './client.js';

export interface MCPServerConfig {
  id: string;
  name: string;
  transport: 'stdio' | 'sse' | 'ws';
  target: string;
  args?: string[];
  enabled?: boolean;
}

export interface RegisteredServer {
  config: MCPServerConfig;
  client: MCPClient;
  tools: MCPToolSpec[];
  connected: boolean;
}

export class MCPRegistry {
  private servers = new Map<string, RegisteredServer>();

  async register(config: MCPServerConfig): Promise<RegisteredServer> {
    const transport = createTransport(config.transport, config.target, config.args);
    const client = new MCPClient(transport, { clientName: 'openio' });

    const entry: RegisteredServer = {
      config,
      client,
      tools: [],
      connected: false,
    };

    this.servers.set(config.id, entry);
    getLogger().info({ id: config.id, transport: config.transport }, 'MCP server registered');
    return entry;
  }

  async connect(serverId: string): Promise<void> {
    const entry = this.servers.get(serverId);
    if (!entry) throw new MCPError(`Server not found: ${serverId}`);
    if (entry.connected) return;

    try {
      await entry.client.connect();
      entry.tools = await entry.client.listTools();
      entry.connected = true;
      getLogger().info({ id: serverId, tools: entry.tools.length }, 'MCP server connected');
    } catch (err) {
      entry.connected = false;
      throw new MCPError(`Failed to connect to '${serverId}': ${(err as Error).message}`);
    }
  }

  async disconnect(serverId: string): Promise<void> {
    const entry = this.servers.get(serverId);
    if (entry?.connected) {
      await entry.client.disconnect();
      entry.connected = false;
    }
  }

  async connectAll(): Promise<void> {
    for (const [id] of this.servers) {
      if (this.servers.get(id)?.config.enabled ?? true) {
        try {
          await this.connect(id);
        } catch (err) {
          getLogger().warn({ id, error: (err as Error).message }, 'MCP connect failed');
        }
      }
    }
  }

  async disconnectAll(): Promise<void> {
    for (const [id] of this.servers) {
      await this.disconnect(id);
    }
  }

  async callTool(serverId: string, toolName: string, args?: Record<string, unknown>): Promise<unknown> {
    const entry = this.servers.get(serverId);
    if (!entry) throw new MCPError(`Server not found: ${serverId}`);
    if (!entry.connected) throw new MCPError(`Server '${serverId}' not connected`);
    return entry.client.callTool(toolName, args);
  }

  async callToolFirst(toolName: string, args?: Record<string, unknown>): Promise<unknown> {
    for (const [, entry] of this.servers) {
      if (entry.connected && entry.tools.some((t) => t.name === toolName)) {
        return entry.client.callTool(toolName, args);
      }
    }
    throw new MCPError(`Tool '${toolName}' not found on any connected server`);
  }

  listServers(): (MCPServerConfig & { connected: boolean; toolCount: number })[] {
    return [...this.servers.values()].map((s) => ({
      ...s.config,
      connected: s.connected,
      toolCount: s.tools.length,
    }));
  }

  listAllTools(): { serverId: string; tool: MCPToolSpec }[] {
    const result: { serverId: string; tool: MCPToolSpec }[] = [];
    for (const [id, entry] of this.servers) {
      if (entry.connected) {
        for (const tool of entry.tools) {
          result.push({ serverId: id, tool });
        }
      }
    }
    return result;
  }

  get(serverId: string): RegisteredServer | undefined {
    return this.servers.get(serverId);
  }
}

export const mcpRegistry = new MCPRegistry();
