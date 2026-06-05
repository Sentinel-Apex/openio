import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { MemoryManager } from '@openio/memory';

const TEST_DB = join(process.cwd(), 'test_memory.db');

describe('MemoryManager', () => {
  let mem: MemoryManager;

  beforeAll(async () => {
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
    mem = new MemoryManager({ dbPath: TEST_DB });
    await mem.init();
  });

  afterAll(() => {
    mem.close();
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  });

  it('creates sessions', () => {
    const session = mem.sessions.create('Test Session', 'gpt-4o');
    expect(session.id).toBeTruthy();
    expect(session.title).toBe('Test Session');
    expect(session.modelId).toBe('gpt-4o');
  });

  it('stores and retrieves messages', async () => {
    const session = mem.sessions.create('Message Test', 'gpt-4o');
    const msg = await mem.addMessage(session.id, 'user', 'Hello world');
    expect(msg.content).toBe('Hello world');
    expect(msg.role).toBe('user');

    const loaded = mem.sessions.load(session.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.messages.length).toBeGreaterThanOrEqual(1);
  });

  it('lists sessions', () => {
    const sessions = mem.sessions.list();
    expect(sessions.length).toBeGreaterThan(0);
  });

  it('deletes sessions', () => {
    const session = mem.sessions.create('Delete Me', 'gpt-4o');
    mem.sessions.delete(session.id);
    const loaded = mem.sessions.load(session.id);
    expect(loaded).toBeNull();
  });

  it('reports stats', () => {
    const stats = mem.stats();
    expect(stats).toHaveProperty('sessions');
    expect(stats).toHaveProperty('messages');
    expect(stats).toHaveProperty('vectors');
  });
});
