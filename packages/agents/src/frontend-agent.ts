import { BaseAgent, type AgentRequest, type AgentResponse } from './agent-router.js';
import type { AgentRole } from '@openio/shared';
import { getLogger } from '@openio/shared';
import { v4 as uuid } from 'uuid';

export class FrontendAgent extends BaseAgent {
  readonly role = 'frontend' as AgentRole;
  readonly description = 'Frontend development — UI components, pages, styling';
  readonly tools = ['read', 'write', 'list', 'execute_command'];
  readonly systemPrompt = `You are the Expert Frontend Agent of OpenIO. You build UI components and user interfaces.

Guidelines:
- Use modern TypeScript and React/Next.js
- Follow existing component conventions in the project
- Use Tailwind CSS or project's styling approach
- Ensure responsive design and accessibility
- Write clean, composable components
- Use proper TypeScript types for props`;

  async process(request: AgentRequest): Promise<AgentResponse> {
    getLogger().info({ task: request.task.slice(0, 60) }, 'FrontendAgent processing');

    const output = await this.llmGenerate(request.task, request.context);
    return { id: request.id ?? uuid(), output };
  }
}
