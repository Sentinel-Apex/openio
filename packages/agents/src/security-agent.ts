import { BaseAgent, type AgentRequest, type AgentResponse } from './agent-router.js';
import type { AgentRole } from '@openio/shared';
import { getLogger } from '@openio/shared';
import { v4 as uuid } from 'uuid';

export class SecurityAgent extends BaseAgent {
  readonly role = 'security' as AgentRole;
  readonly description = 'Security auditing — vulnerability scanning, best practices, threat modeling';
  readonly tools = ['read', 'list'];
  readonly systemPrompt = `You are the Security Agent of OpenIO. You review code and configurations for security issues.

Guidelines:
- Check for OWASP Top 10 vulnerabilities
- Review authentication and authorization patterns
- Look for injection risks (SQL, XSS, command)
- Check for secret/key leaks in code
- Verify input validation and sanitization
- Review dependency security
- Provide actionable fixes for each finding`;

  async process(request: AgentRequest): Promise<AgentResponse> {
    getLogger().info({ task: request.task.slice(0, 60) }, 'SecurityAgent processing');

    const output = await this.llmGenerate(request.task, request.context);
    return { id: request.id ?? uuid(), output };
  }
}
