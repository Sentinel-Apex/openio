# Agents

OpenIO uses a multi-agent architecture where specialized agents handle different aspects of development tasks.

## Architecture

The Agent System consists of:

- **AgentRegistry** — Central registry for all agent types
- **AgentRouter** — Routes requests to appropriate agents, supports parallel execution and fallback
- **BaseAgent** — Abstract base class with LLM integration and system prompt management

## Available Agents

| Agent | Role | Tools | Description |
|-------|------|-------|-------------|
| **Manager** | `manager` | All | Orchestrates other agents, breaks down tasks, synthesizes results |
| **Backend** | `backend` | filesystem, terminal, git, postgres | Server-side logic, APIs, services |
| **Frontend** | `frontend` | filesystem, terminal | UI components, React/Next.js |
| **Database** | `database` | postgres, mysql, sqlite, filesystem | Schema design, queries, migrations |
| **DevOps** | `devops` | terminal, docker | CI/CD, Docker, deployment |
| **Security** | `security` | filesystem (read-only) | Vulnerability scanning, auth review |
| **Testing** | `testing` | filesystem, terminal | Unit, integration, e2e tests |
| **Research** | `research` | web fetch, search APIs | Documentation, web research |
| **Code Review** | `code-review` | filesystem, git | Code quality, performance, correctness |

## Usage

```bash
# List all agents
openio agent --list

# Delegate a task to a specific agent
openio agent "Build a REST API with user authentication" --role backend

# Use the manager to auto-delegate
openio agent "Create a full-stack todo app with React and Express"
```

## Adding Custom Agents

Create a new agent by extending `BaseAgent`:

```ts
import { BaseAgent, AgentRequest, AgentResponse } from '@openio/agents';

export class MyCustomAgent extends BaseAgent {
  readonly role = 'custom' as any;
  readonly description = 'My custom agent';
  readonly tools = ['read', 'write'];
  readonly systemPrompt = 'You are a custom agent...';

  async process(request: AgentRequest): Promise<AgentResponse> {
    const output = await this.llmGenerate(request.task, request.context);
    return { id: request.id!, output };
  }
}
```

Then register it:

```ts
import { agentRegistry } from '@openio/agents';
agentRegistry.register(new MyCustomAgent());
```

## Delegation

The ManagerAgent automatically infers which agents are needed based on task keywords:

- `api`, `backend`, `server` → BackendAgent
- `ui`, `component`, `react` → FrontendAgent
- `database`, `schema`, `migration` → DatabaseAgent
- `docker`, `deploy`, `ci` → DevOpsAgent
- `test`, `spec` → TestingAgent
- `security`, `auth` → SecurityAgent
