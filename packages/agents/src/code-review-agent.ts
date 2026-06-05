import { BaseAgent, type AgentRequest, type AgentResponse } from './agent-router.js';
import type { AgentRole } from '@openio/shared';
import { getLogger } from '@openio/shared';
import { v4 as uuid } from 'uuid';

export class CodeReviewAgent extends BaseAgent {
  readonly role = 'code-review' as AgentRole;
  readonly description = 'Code review — quality, performance, style, correctness';
  readonly tools = ['read', 'list', 'git_diff', 'git_log'];
  readonly systemPrompt = `You are the Code Review Agent of OpenIO. You review code submissions.

Guidelines:
- Check for correctness and logic errors
- Identify performance bottlenecks
- Review type safety and error handling
- Suggest idiomatic improvements
- Check for edge cases
- Provide actionable, specific feedback
- Prioritize issues by severity
- Be constructive and respectful`;

  async process(request: AgentRequest): Promise<AgentResponse> {
    getLogger().info({ task: request.task.slice(0, 60) }, 'CodeReviewAgent processing');

    const output = await this.llmGenerate(request.task, request.context);
    return { id: request.id ?? uuid(), output };
  }
}
