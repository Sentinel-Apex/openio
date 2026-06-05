export class OpenIOError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'OpenIOError';
  }

  toJSON() {
    return { name: this.name, message: this.message, code: this.code };
  }
}

export class ProviderError extends OpenIOError {
  constructor(message: string, public readonly provider: string) {
    super(message, `PROVIDER_${provider.toUpperCase()}_ERROR`);
    this.name = 'ProviderError';
  }
}

export class ConfigError extends OpenIOError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CONFIG_ERROR', cause);
    this.name = 'ConfigError';
  }
}

export class MemoryError extends OpenIOError {
  constructor(message: string, cause?: unknown) {
    super(message, 'MEMORY_ERROR', cause);
    this.name = 'MemoryError';
  }
}

export class ToolError extends OpenIOError {
  constructor(message: string, public readonly toolName: string) {
    super(message, `TOOL_${toolName.toUpperCase()}_ERROR`);
    this.name = 'ToolError';
  }
}

export class AgentError extends OpenIOError {
  constructor(message: string, public readonly agentId: string) {
    super(message, `AGENT_${agentId.toUpperCase()}_ERROR`);
    this.name = 'AgentError';
  }
}

export class MCPError extends OpenIOError {
  constructor(message: string, code?: string) {
    super(message, code ?? 'MCP_ERROR');
    this.name = 'MCPError';
  }
}
