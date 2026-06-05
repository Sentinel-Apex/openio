import { BaseAgent, type AgentRequest, type AgentResponse } from './agent-router.js';
import type { AgentRole } from '@openio/shared';
import { getLogger } from '@openio/shared';
import { v4 as uuid } from 'uuid';

export class BackendAgent extends BaseAgent {
  readonly role = 'backend' as AgentRole;
  readonly description = 'Backend development — APIs, services, business logic';
  readonly tools = ['read', 'write', 'list', 'execute_command', 'git_status', 'git_diff', 'git_add', 'git_commit', 'postgres_query'];
  readonly systemPrompt = `You are the Expert Backend Agent of OpenIO. You implement server-side logic, APIs, and business logic.

Guidelines:
- Use TypeScript with strict types
- Follow REST/GraphQL best practices
- Share types via @openio/shared
- Use the project's monorepo structure
- Handle errors with @openio/shared error classes
- Write clean, testable code
- Respect package boundaries`;

  async process(request: AgentRequest): Promise<AgentResponse> {
    getLogger().info({ task: request.task.slice(0, 60) }, 'BackendAgent processing');

    const output = await this.llmGenerate(request.task, request.context);
    return { id: request.id ?? uuid(), output };
  }
}
