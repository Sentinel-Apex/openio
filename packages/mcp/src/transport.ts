import { EventEmitter } from 'node:events';
import { spawn, type ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';
import { MCPError } from '@openio/shared';

export type JSONRPCRequest = {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
};

export type JSONRPCResponse = {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

export type JSONRPCMessage = JSONRPCRequest | JSONRPCResponse;

export abstract class Transport extends EventEmitter {
  abstract send(message: JSONRPCMessage): Promise<void>;
  abstract start(): Promise<void>;
  abstract close(): Promise<void>;

  protected emitMessage(msg: JSONRPCMessage): void {
    this.emit('message', msg);
  }

  protected emitError(err: Error): void {
    this.emit('error', err);
  }

  protected emitClose(): void {
    this.emit('close');
  }
}

export class StdioTransport extends Transport {
  private process: ChildProcess;
  private rl: ReturnType<typeof createInterface> | null = null;

  constructor(cmd: string, args: string[] = []) {
    super();
    this.process = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
  }

  async start(): Promise<void> {
    this.rl = createInterface({ input: this.process.stdout! });

    this.rl.on('line', (line: string) => {
      try {
        const msg = JSON.parse(line) as JSONRPCMessage;
        this.emitMessage(msg);
      } catch (err) {
        this.emitError(new Error(`Invalid JSON: ${(err as Error).message}`));
      }
    });

    this.process.on('error', (err) => this.emitError(err));
    this.process.on('exit', () => this.emitClose());
  }

  async send(message: JSONRPCMessage): Promise<void> {
    this.process.stdin!.write(JSON.stringify(message) + '\n');
  }

  async close(): Promise<void> {
    this.rl?.close();
    this.process.kill();
  }
}

export class SSETransport extends Transport {
  private url: string;
  private abortController: AbortController | null = null;

  constructor(url: string) {
    super();
    this.url = url;
  }

  async start(): Promise<void> {
    this.abortController = new AbortController();

    try {
      const res = await fetch(this.url, {
        headers: { Accept: 'text/event-stream' },
        signal: this.abortController.signal,
      });

      if (!res.ok) throw new Error(`SSE connection failed: ${res.status}`);
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const msg = JSON.parse(line.slice(6)) as JSONRPCMessage;
              this.emitMessage(msg);
            } catch { /* skip parse errors */ }
          }
        }
      }
    } catch (err) {
      if (!this.abortController?.signal.aborted) {
        this.emitError(err as Error);
      }
    } finally {
      this.emitClose();
    }
  }

  async send(message: JSONRPCMessage): Promise<void> {
    await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
      signal: this.abortController?.signal,
    });
  }

  async close(): Promise<void> {
    this.abortController?.abort();
  }
}

export class WebSocketTransport extends Transport {
  private url: string;
  private ws: any = null;

  constructor(url: string) {
    super();
    this.url = url;
  }

  async start(): Promise<void> {
    const WebSocket = await this.loadWebSocket();

    this.ws = new WebSocket(this.url);

    this.ws.on('open', () => {
      this.emit('connected');
    });

    this.ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString()) as JSONRPCMessage;
        this.emitMessage(msg);
      } catch (err) {
        this.emitError(new Error(`Invalid JSON: ${(err as Error).message}`));
      }
    });

    this.ws.on('error', (err: Error) => this.emitError(err));
    this.ws.on('close', () => this.emitClose());
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (this.ws?.readyState === 1) {
      this.ws.send(JSON.stringify(message));
    }
  }

  async close(): Promise<void> {
    this.ws?.close();
  }

  private async loadWebSocket(): Promise<any> {
    try {
      const mod = await Function('return import("ws")')() as any;
      return mod.default ?? mod;
    } catch {
      throw new MCPError('ws package not installed. Run: npm install ws');
    }
  }
}

export function createTransport(type: 'stdio' | 'sse' | 'ws', target: string, args?: string[]): Transport {
  switch (type) {
    case 'stdio':
      return new StdioTransport(target, args ?? []);
    case 'sse':
      return new SSETransport(target);
    case 'ws':
      return new WebSocketTransport(target);
    default:
      throw new MCPError(`Unknown transport type: ${type}`);
  }
}
