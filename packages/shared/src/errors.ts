export class OpenIOError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'OpenIOError';
  }
}

export class ProviderError extends OpenIOError {
  constructor(message: string, public provider: string) {
    super(message, `PROVIDER_${provider.toUpperCase()}_ERROR`);
    this.name = 'ProviderError';
  }
}

export class ConfigError extends OpenIOError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
    this.name = 'ConfigError';
  }
}

export class MemoryError extends OpenIOError {
  constructor(message: string) {
    super(message, 'MEMORY_ERROR');
    this.name = 'MemoryError';
  }
}