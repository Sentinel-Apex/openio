# MCP (Model Context Protocol)

OpenIO implements the Model Context Protocol (MCP) for connecting AI models to external tools and resources.

## Overview

MCP allows OpenIO to discover and use tools from remote servers via a standardized protocol. This enables:

- **Tool Discovery**: Connect to MCP servers and discover available tools
- **Resource Access**: Read files, APIs, and databases through MCP resources
- **Prompt Templates**: Use server-provided prompt templates

## Architecture

```
OpenIO CLI
    │
    ├── MCPRegistry
    │       ├── Server A (stdio)
    │       ├── Server B (SSE)
    │       └── Server C (WebSocket)
    │
    ├── MCPClient (per server)
    │       ├── Tools
    │       ├── Resources
    │       └── Prompts
    │
    └── MCPToolWrapper → ToolRegistry
```

## Transports

| Transport | Use Case | Example |
|-----------|----------|---------|
| **stdio** | Local processes | `node my-server.js` |
| **SSE** | Remote HTTP servers | `https://api.example.com/mcp` |
| **WebSocket** | Real-time bidirectional | `ws://localhost:8080/mcp` |

## Configuration

```bash
# Add an MCP server
openio mcp --add

# You'll be prompted for:
# Server ID: my-tools
# Transport: stdio
# Target: npx
# Arguments: -y @my/mcp-server
```

Or add to config directly:

```json
{
  "mcpServers": [
    {
      "id": "filesystem",
      "transport": "stdio",
      "target": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/dir"]
    }
  ]
}
```

## Usage

```bash
# List configured servers
openio mcp --list

# Connect to a server
openio mcp --connect my-tools

# List tools from all connected servers
openio mcp --tools

# Tools are automatically available to agents
openio agent "Read the file README.md"
```

## MCP Protocol

OpenIO implements the standard MCP specification with JSON-RPC 2.0:

### Methods

| Method | Description |
|--------|-------------|
| `initialize` | Handshake and capability negotiation |
| `tools/list` | List available tools |
| `tools/call` | Execute a tool |
| `resources/list` | List available resources |
| `resources/read` | Read a resource |
| `prompts/list` | List prompt templates |
| `prompts/get` | Get a prompt template |
| `ping` | Health check |

## Creating MCP Servers

```ts
import { MCPServer, StdioTransport } from '@openio/mcp';

const server = new MCPServer(new StdioTransport('stdio'), {
  name: 'my-server',
  version: '1.0.0',
});

server.registerTool(
  { name: 'hello', description: 'Say hello', inputSchema: { type: 'object', properties: { name: { type: 'string' } } } },
  async (args) => ({ content: `Hello ${args.name}!` }),
);

await server.start();
```
