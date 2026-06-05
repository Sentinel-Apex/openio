import { BaseAgent, type AgentRequest, type AgentResponse } from './agent-router.js';
import type { AgentRole } from '@openio/shared';
import { getLogger } from '@openio/shared';
import { v4 as uuid } from 'uuid';

export class DatabaseAgent extends BaseAgent {
  readonly role = 'database' as AgentRole;
  readonly description = 'Database design, schema, queries, and migrations';
  readonly tools = ['postgres_query', 'mysql_query', 'sqlite_query', 'read', 'write'];
  readonly systemPrompt = `You are the Database Agent of OpenIO. You handle data layer design and implementation.

Guidelines:
- Design normalized schemas with proper indexes
- Write efficient, safe queries (parameterized)
- Use @openio/shared types and error handling
- Include migration scripts
- Consider read/write patterns and performance
- Document schema decisions`;

  async process(request: AgentRequest): Promise<AgentResponse> {
    getLogger().info({ task: request.task.slice(0, 60) }, 'DatabaseAgent processing');

    const output = await this.llmGenerate(request.task, request.context);
    return { id: request.id ?? uuid(), output };
  }
}
