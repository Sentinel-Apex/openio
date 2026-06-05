import { describe, it, expect, vi } from 'vitest';
import { AgentRegistry, AgentRouter, ManagerAgent, BackendAgent, FrontendAgent } from '@openio/agents';

describe('AgentRegistry', () => {
  it('registers and retrieves agents', () => {
    const registry = new AgentRegistry();
    registry.register(new ManagerAgent());
    registry.register(new BackendAgent());
    expect(registry.get('manager')).toBeDefined();
    expect(registry.get('backend')).toBeDefined();
    expect(registry.get('frontend')).toBeUndefined();
  });

  it('lists capabilities', () => {
    const registry = new AgentRegistry();
    registry.register(new ManagerAgent());
    registry.register(new BackendAgent());
    const caps = registry.listCapabilities();
    expect(caps.length).toBe(2);
    expect(caps[0]).toHaveProperty('role');
    expect(caps[0]).toHaveProperty('description');
    expect(caps[0]).toHaveProperty('tools');
  });
});

describe('AgentRouter', () => {
  it('returns error for unknown agent', async () => {
    const router = new AgentRouter();
    const result = await router.route({ task: 'test' }, 'manager' as any);
    expect(result.error).toContain('not found');
  });

  it('routes to registered agents', async () => {
    const registry = new AgentRegistry();
    const backend = new BackendAgent();
    backend.setProvider({
      name: 'test',
      generate: vi.fn().mockResolvedValue({
        content: 'backend result',
        finishReason: 'stop',
        model: 'test',
      }),
      streamGenerate: vi.fn(),
      getModels: vi.fn().mockResolvedValue([]),
    } as any);

    registry.register(backend);
    const router = new AgentRouter(registry);
    const result = await router.route({ task: 'build api' }, 'backend');
    expect(result.output).toBe('backend result');
  });
});

describe('ManagerAgent', () => {
  it('infers relevant agents from task', async () => {
    const manager = new ManagerAgent();
    manager.setProvider({
      name: 'test',
      generate: vi.fn().mockResolvedValue({
        content: 'Analysis complete',
        finishReason: 'stop',
        model: 'test',
      }),
      streamGenerate: vi.fn(),
      getModels: vi.fn().mockResolvedValue([]),
    } as any);

    const result = await manager.process({ task: 'build a react frontend with api backend and postgres database' });
    expect(result.output).toBeTruthy();
  });
});
