import { z } from 'zod';
import { BaseTool } from './tool-registry.js';
import type { ToolResult } from '@openio/shared';

const getSchema = z.object({
  url: z.string().optional().default(process.env.REDIS_URL ?? 'redis://localhost:6379'),
  key: z.string(),
});

const setSchema = z.object({
  url: z.string().optional().default(process.env.REDIS_URL ?? 'redis://localhost:6379'),
  key: z.string(),
  value: z.string(),
  ttl: z.number().optional(),
});

const delSchema = z.object({
  url: z.string().optional().default(process.env.REDIS_URL ?? 'redis://localhost:6379'),
  key: z.string(),
});

const keysSchema = z.object({
  url: z.string().optional().default(process.env.REDIS_URL ?? 'redis://localhost:6379'),
  pattern: z.string().optional().default('*'),
});

const infoSchema = z.object({
  url: z.string().optional().default(process.env.REDIS_URL ?? 'redis://localhost:6379'),
});

async function connect(url: string) {
  const { default: Redis } = await import('ioredis');
  return new Redis(url);
}

async function withRedis<T>(url: string, fn: (redis: import('ioredis').Redis) => Promise<T>): Promise<T> {
  const redis = await connect(url);
  try {
    return await fn(redis);
  } finally {
    await redis.quit();
  }
}

export class RedisGetTool extends BaseTool {
  name = 'redis_get';
  description = 'Get a value from Redis by key';
  inputSchema = getSchema;

  async execute(args: unknown): Promise<ToolResult> {
    const { url, key } = this.validate<z.infer<typeof getSchema>>(args);
    try {
      const value = await withRedis(url, (r) => r.get(key));
      return this.success(value ?? '(nil)', { key });
    } catch (err) {
      return this.failure(`Redis GET failed: ${(err as Error).message}`);
    }
  }
}

export class RedisSetTool extends BaseTool {
  name = 'redis_set';
  description = 'Set a value in Redis';
  inputSchema = setSchema;

  async execute(args: unknown): Promise<ToolResult> {
    const { url, key, value, ttl } = this.validate<z.infer<typeof setSchema>>(args);
    try {
      await withRedis(url, async (r) => {
        if (ttl) await r.set(key, value, 'EX', ttl);
        else await r.set(key, value);
      });
      return this.success('OK', { key });
    } catch (err) {
      return this.failure(`Redis SET failed: ${(err as Error).message}`);
    }
  }
}

export class RedisDelTool extends BaseTool {
  name = 'redis_del';
  description = 'Delete a key from Redis';
  inputSchema = delSchema;

  async execute(args: unknown): Promise<ToolResult> {
    const { url, key } = this.validate<z.infer<typeof delSchema>>(args);
    try {
      const count = await withRedis(url, (r) => r.del(key));
      return this.success(`Deleted ${count} key(s)`, { key });
    } catch (err) {
      return this.failure(`Redis DEL failed: ${(err as Error).message}`);
    }
  }
}

export class RedisKeysTool extends BaseTool {
  name = 'redis_keys';
  description = 'List keys matching a pattern in Redis';
  inputSchema = keysSchema;

  async execute(args: unknown): Promise<ToolResult> {
    const { url, pattern } = this.validate<z.infer<typeof keysSchema>>(args);
    try {
      const keys = await withRedis(url, (r) => r.keys(pattern));
      return this.success(keys.join('\n'), { count: keys.length, pattern });
    } catch (err) {
      return this.failure(`Redis KEYS failed: ${(err as Error).message}`);
    }
  }
}

export class RedisInfoTool extends BaseTool {
  name = 'redis_info';
  description = 'Get Redis server info and stats';
  inputSchema = infoSchema;

  async execute(args: unknown): Promise<ToolResult> {
    const { url } = this.validate<z.infer<typeof infoSchema>>(args);
    try {
      const info = await withRedis(url, (r) => r.info());
      return this.success(info);
    } catch (err) {
      return this.failure(`Redis INFO failed: ${(err as Error).message}`);
    }
  }
}
