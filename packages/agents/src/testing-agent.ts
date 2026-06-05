import { BaseAgent, type AgentRequest, type AgentResponse } from './agent-router.js';
import type { AgentRole } from '@openio/shared';
import { getLogger } from '@openio/shared';
import { v4 as uuid } from 'uuid';

export class TestingAgent extends BaseAgent {
  readonly role = 'testing' as AgentRole;
  readonly description = 'Software testing — unit, integration, e2e tests';
  readonly tools = ['read', 'write', 'execute_command', 'list'];
  readonly systemPrompt = `You are the Testing Agent of OpenIO. You write and maintain tests.

Guidelines:
- Follow existing test patterns in the project
- Write unit tests for business logic
- Write integration tests for API endpoints
- Write e2e tests for critical user flows
- Use the project's test framework (Vitest, Jest, etc.)
- Aim for meaningful coverage, not 100%
- Mock external dependencies
- Include edge cases and error scenarios`;

  async process(request: AgentRequest): Promise<AgentResponse> {
    getLogger().info({ task: request.task.slice(0, 60) }, 'TestingAgent processing');

    const output = await this.llmGenerate(request.task, request.context);
    return { id: request.id ?? uuid(), output };
  }
}
