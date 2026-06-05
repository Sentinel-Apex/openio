import { BaseAgent, agentRouter, agentRegistry, type AgentRequest, type AgentResponse } from './agent-router.js';
import type { AgentRole } from '@openio/shared';
import { AgentError, getLogger } from '@openio/shared';
import { v4 as uuid } from 'uuid';

export class ManagerAgent extends BaseAgent {
  readonly role = 'manager' as AgentRole;
  readonly description = 'Orchestrates specialized agents to complete complex tasks';
  readonly tools = ['all'];
  readonly systemPrompt = `You are the Lead Manager Agent of OpenIO. Your role is to:
1. Analyze user requests and break them into clear, executable steps
2. Delegate tasks to specialized agents (backend, frontend, database, devops, security, testing, research, code-review)
3. Synthesize results from multiple agents into a coherent response
4. Handle errors and retry with fallback agents when needed
Be concise and structured. Output analysis, plan, and delegation steps clearly.`;

  async process(request: AgentRequest): Promise<AgentResponse> {
    const agentRoles: AgentRole[] = ['backend', 'frontend', 'database', 'devops', 'security', 'testing', 'research', 'code-review'];

    const plan = await this.llmGenerate(
      `Analyze this task and provide a step-by-step execution plan with agent assignments:\n\n${request.task}`,
      request.context,
    );

    const relevantAgents = this.inferAgents(plan);

    getLogger().info({ task: request.task.slice(0, 60), agents: relevantAgents }, 'Manager delegating');

    const subResults: AgentResponse[] = [];
    for (const role of relevantAgents) {
      const agent = agentRegistry.get(role);
      if (!agent || agent === this) continue;

      try {
        const subRequest: AgentRequest = {
          id: uuid(),
          task: `Based on this plan, execute your part:\n\n${plan}\n\nOriginal task: ${request.task}`,
          context: request.context,
          files: request.files,
          model: this.model,
          signals: request.signals,
        };
        const result = await agent.process(subRequest);
        subResults.push(result);
      } catch (err) {
        subResults.push({
          id: uuid(), output: '',
          error: `Agent '${role}' failed: ${(err as Error).message}`,
        });
      }
    }

    const outputs = subResults
      .filter((r) => r.output)
      .map((r) => r.output)
      .join('\n\n---\n\n');

    const errors = subResults
      .filter((r) => r.error)
      .map((r) => r.error);

    const summary = await this.llmGenerate(
      `Synthesize the following results from specialized agents into a final response:\n\n${outputs || 'No outputs generated.'}`,
      request.context,
    );

    return {
      id: request.id ?? uuid(),
      output: summary,
      subResults,
      metadata: { plan, errors: errors.length > 0 ? errors : undefined },
    };
  }

  private inferAgents(plan: string): AgentRole[] {
    const keywords: Record<AgentRole, string[]> = {
      manager: [],
      backend: ['api', 'server', 'endpoint', 'route', 'controller', 'service', 'middleware', 'backend'],
      frontend: ['ui', 'component', 'react', 'vue', 'angular', 'frontend', 'page', 'style', 'css', 'html'],
      database: ['schema', 'table', 'query', 'migration', 'sql', 'database', 'index', 'model', 'orm'],
      devops: ['deploy', 'docker', 'ci', 'cd', 'pipeline', 'infrastructure', 'cloud', 'kubernetes', 'devops'],
      security: ['security', 'vulnerability', 'auth', 'oauth', 'jwt', 'xss', 'csrf', 'encrypt', 'audit'],
      testing: ['test', 'spec', 'e2e', 'integration', 'unit test', 'coverage', 'mock', 'assertion'],
      research: ['research', 'documentation', 'doc', 'readme', 'api doc', 'investigate', 'learn'],
      'code-review': ['review', 'refactor', 'quality', 'lint', 'cleanup', 'improve', 'optimize'],
    };

    const planLower = plan.toLowerCase();
    const matched: AgentRole[] = [];

    for (const [role, words] of Object.entries(keywords)) {
      if (words.some((w) => planLower.includes(w))) {
        matched.push(role as AgentRole);
      }
    }

    return matched.length > 0 ? matched : ['research'];
  }
}
