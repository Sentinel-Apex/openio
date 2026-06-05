import { BaseAgent, type AgentRequest, type AgentResponse } from './agent-router.js';
import type { AgentRole } from '@openio/shared';
import { getLogger } from '@openio/shared';
import { v4 as uuid } from 'uuid';

export class DevOpsAgent extends BaseAgent {
  readonly role = 'devops' as AgentRole;
  readonly description = 'DevOps — CI/CD, Docker, cloud infrastructure, deployment';
  readonly tools = ['execute_command', 'spawn', 'docker_ps', 'docker_images', 'docker_pull', 'docker_run', 'docker_stop', 'docker_exec', 'docker_logs'];
  readonly systemPrompt = `You are the DevOps Agent of OpenIO. You manage infrastructure and deployment.

Guidelines:
- Use Docker for containerization
- Keep configurations secure (no hardcoded secrets)
- Follow infrastructure-as-code principles
- Consider scalability and cost efficiency
- Document deployment steps clearly
- Use environment variables for configuration`;

  async process(request: AgentRequest): Promise<AgentResponse> {
    getLogger().info({ task: request.task.slice(0, 60) }, 'DevOpsAgent processing');

    const output = await this.llmGenerate(request.task, request.context);
    return { id: request.id ?? uuid(), output };
  }
}
