import { AgentError, getLogger } from '@openio/shared';
import type { AgentRole, ToolResult } from '@openio/shared';
import type { GenerateOptions, GenerateResult, AIProvider } from '@openio/ai';
import { v4 as uuid } from 'uuid';

export interface AgentRequest {
  id?: string;
  task: string;
  context?: string;
  files?: string[];
  model?: string;
  signals?: AbortSignal;
}

export interface AgentResponse {
  id: string;
  output: string;
  toolCalls?: ToolResult[];
  subResults?: AgentResponse[];
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentCapability {
  role: AgentRole;
  description: string;
  tools: string[];
}

export abstract class BaseAgent {
  abstract readonly role: AgentRole;
  abstract readonly description: string;
  abstract readonly systemPrompt: string;
  abstract readonly tools: string[];

  protected provider?: AIProvider;
  protected model: string;

  constructor(model?: string) {
    this.model = model ?? 'gpt-4o';
  }

  setProvider(provider: AIProvider): void {
    this.provider = provider;
  }

  setModel(model: string): void {
    this.model = model;
  }

  get capability(): AgentCapability {
    return { role: this.role, description: this.description, tools: this.tools };
  }

  abstract process(request: AgentRequest): Promise<AgentResponse>;

  protected buildMessages(task: string, context?: string): GenerateOptions['messages'] {
    const msgs: GenerateOptions['messages'] = [
      { role: 'system', content: this.systemPrompt },
    ];
    if (context) msgs.push({ role: 'system', content: `Context:\n${context}` });
    msgs.push({ role: 'user', content: task });
    return msgs;
  }

  protected async llmGenerate(task: string, context?: string): Promise<string> {
    if (!this.provider) throw new AgentError('No AI provider set', this.role);

    const result: GenerateResult = await this.provider.generate({
      model: this.model,
      messages: this.buildMessages(task, context),
      temperature: 0.3,
    });

    return result.content;
  }
}

export class AgentRegistry {
  private agents = new Map<string, BaseAgent>();

  register(agent: BaseAgent): void {
    this.agents.set(agent.role, agent);
    getLogger().info({ role: agent.role, tools: agent.tools.length }, 'Agent registered');
  }

  get(role: AgentRole): BaseAgent | undefined {
    return this.agents.get(role);
  }

  list(): BaseAgent[] {
    return [...this.agents.values()];
  }

  listCapabilities(): AgentCapability[] {
    return this.list().map((a) => a.capability);
  }
}

export const agentRegistry = new AgentRegistry();

export class AgentRouter {
  private registry: AgentRegistry;

  constructor(registry?: AgentRegistry) {
    this.registry = registry ?? agentRegistry;
  }

  async route(request: AgentRequest, target: AgentRole): Promise<AgentResponse> {
    const agent = this.registry.get(target);
    if (!agent) {
      return { id: uuid(), output: '', error: `Agent '${target}' not found` };
    }

    getLogger().info({ role: target, task: request.task.slice(0, 80) }, 'Routing to agent');

    try {
      return await agent.process(request);
    } catch (err) {
      return {
        id: uuid(),
        output: '',
        error: `Agent '${target}' failed: ${(err as Error).message}`,
      };
    }
  }

  async routeParallel(requests: { request: AgentRequest; target: AgentRole }[]): Promise<AgentResponse[]> {
    return Promise.all(requests.map((r) => this.route(r.request, r.target)));
  }

  async routeWithFallback(request: AgentRequest, targets: AgentRole[]): Promise<AgentResponse> {
    for (const target of targets) {
      const agent = this.registry.get(target);
      if (!agent) continue;
      try {
        return await agent.process(request);
      } catch (err) {
        getLogger().warn({ role: target, error: (err as Error).message }, 'Agent fallback');
        continue;
      }
    }
    return { id: uuid(), output: '', error: 'All fallback agents exhausted' };
  }
}

export const agentRouter = new AgentRouter();
