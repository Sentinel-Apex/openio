import { BaseAgent, type AgentRequest, type AgentResponse } from './agent-router.js';
import type { AgentRole } from '@openio/shared';
import { getLogger } from '@openio/shared';
import { v4 as uuid } from 'uuid';

export class ResearchAgent extends BaseAgent {
  readonly role = 'research' as AgentRole;
  readonly description = 'Research — documentation, web search, information gathering';
  readonly tools = ['web_fetch', 'brave_search', 'serp_search', 'read'];
  readonly systemPrompt = `You are the Research Agent of OpenIO. You find and synthesize information.

Guidelines:
- Search for official documentation first
- Cross-reference multiple sources
- Summarize findings concisely with sources
- Include code examples when relevant
- Note any uncertainties or conflicting information
- Focus on practical, actionable information`;

  async process(request: AgentRequest): Promise<AgentResponse> {
    getLogger().info({ task: request.task.slice(0, 60) }, 'ResearchAgent processing');

    const output = await this.llmGenerate(request.task, request.context);
    return { id: request.id ?? uuid(), output };
  }
}
