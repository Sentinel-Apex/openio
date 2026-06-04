openio/
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.json
├── tsup.config.ts
├── eslint.config.js
├── prettier.config.js
├── .env.example
├── .gitignore
├── LICENSE
├── README.md
│
├── apps/
│   └── cli/
│       ├── package.json
│       ├── tsconfig.json
│       │
│       └── src/
│           ├── index.ts
│           ├── cli.ts
│           │
│           ├── commands/
│           │   ├── chat.ts
│           │   ├── code.ts
│           │   ├── agent.ts
│           │   ├── model.ts
│           │   ├── config.ts
│           │   ├── doctor.ts
│           │   ├── memory.ts
│           │   ├── mcp.ts
│           │   ├── project.ts
│           │   └── init.ts
│           │
│           ├── ui/
│           │   ├── ChatScreen.tsx
│           │   ├── Welcome.tsx
│           │   ├── Sidebar.tsx
│           │   ├── Header.tsx
│           │   ├── Footer.tsx
│           │   ├── PromptInput.tsx
│           │   ├── MessageBubble.tsx
│           │   ├── ModelSelector.tsx
│           │   ├── AgentSelector.tsx
│           │   ├── LoadingSpinner.tsx
│           │   └── Dashboard.tsx
│           │
│           ├── hooks/
│           │   ├── useChat.ts
│           │   ├── useModels.ts
│           │   └── useAgents.ts
│           │
│           └── utils/
│               ├── logger.ts
│               ├── config.ts
│               ├── paths.ts
│               ├── prompt.ts
│               └── banner.ts
│
├── packages/
│
│   ├── ai/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       │
│   │       ├── providers/
│   │       │   ├── openai.ts
│   │       │   ├── anthropic.ts
│   │       │   ├── groq.ts
│   │       │   ├── openrouter.ts
│   │       │   ├── deepseek.ts
│   │       │   ├── kimi.ts
│   │       │   ├── ollama.ts
│   │       │   └── provider-manager.ts
│   │       │
│   │       ├── models/
│   │       │   ├── registry.ts
│   │       │   ├── model-loader.ts
│   │       │   └── model-router.ts
│   │       │
│   │       ├── embeddings/
│   │       │   ├── openai.ts
│   │       │   ├── bge.ts
│   │       │   └── nomic.ts
│   │       │
│   │       └── rerank/
│   │           ├── bge-reranker.ts
│   │           └── jina-reranker.ts
│
│   ├── agents/
│   │   └── src/
│   │       ├── manager-agent.ts
│   │       ├── backend-agent.ts
│   │       ├── frontend-agent.ts
│   │       ├── database-agent.ts
│   │       ├── devops-agent.ts
│   │       ├── security-agent.ts
│   │       ├── testing-agent.ts
│   │       ├── research-agent.ts
│   │       ├── code-review-agent.ts
│   │       └── agent-router.ts
│
│   ├── memory/
│   │   └── src/
│   │       ├── memory.ts
│   │       ├── conversation.ts
│   │       ├── session.ts
│   │       ├── vector-store.ts
│   │       ├── sqlite.ts
│   │       ├── embeddings.ts
│   │       └── retrieval.ts
│
│   ├── tools/
│   │   └── src/
│   │       ├── filesystem.ts
│   │       ├── terminal.ts
│   │       ├── git.ts
│   │       ├── docker.ts
│   │       ├── browser.ts
│   │       ├── search.ts
│   │       ├── postgres.ts
│   │       ├── mysql.ts
│   │       ├── sqlite.ts
│   │       ├── redis.ts
│   │       └── tool-registry.ts
│
│   ├── mcp/
│   │   └── src/
│   │       ├── client.ts
│   │       ├── server.ts
│   │       ├── transport.ts
│   │       ├── registry.ts
│   │       └── tools.ts
│
│   ├── project-engine/
│   │   └── src/
│   │       ├── analyzer.ts
│   │       ├── planner.ts
│   │       ├── generator.ts
│   │       ├── refactor.ts
│   │       ├── tester.ts
│   │       ├── migration.ts
│   │       └── dependency-graph.ts
│
│   └── shared/
│       └── src/
│           ├── types.ts
│           ├── constants.ts
│           ├── errors.ts
│           ├── logger.ts
│           ├── config.ts
│           └── prompts.ts
│
├── tests/
│   ├── unit/
│   │   ├── provider.test.ts
│   │   ├── memory.test.ts
│   │   ├── tools.test.ts
│   │   └── agents.test.ts
│   │
│   ├── integration/
│   │   ├── chat.test.ts
│   │   ├── ollama.test.ts
│   │   └── project.test.ts
│   │
│   └── e2e/
│       ├── cli.e2e.ts
│       └── workflow.e2e.ts
│
├── docs/
│   ├── installation.md
│   ├── commands.md
│   ├── agents.md
│   ├── providers.md
│   ├── ollama.md
│   ├── mcp.md
│   └── architecture.md
│
└── templates/
    ├── nextjs/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── README.md
    │
    ├── react/
    │   ├── package.json
    │   └── README.md
    │
    ├── express/
    │   ├── package.json
    │   └── README.md
    │
    └── fastapi/
        ├── requirements.txt
        └── README.md