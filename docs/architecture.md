# Architecture

## Overview

OpenIO is a monorepo built with pnpm workspaces and Turborepo. It provides an AI-powered CLI coding assistant with a modular package architecture.

```
openio/
├── apps/
│   └── cli/              # CLI application (Commander.js)
├── packages/
│   ├── shared/           # Types, constants, errors, logger, config
│   ├── ai/               # AI providers, models, embeddings, rerankers
│   ├── tools/            # Filesystem, terminal, git, docker, database tools
│   ├── memory/           # SQLite storage, vector store, sessions, RAG
│   ├── agents/           # Multi-agent system with routing
│   ├── mcp/              # Model Context Protocol client/server
│   └── project-engine/   # Project analysis, scaffolding, migration
├── tests/                # Unit, integration, e2e tests
├── docs/                 # Documentation
└── templates/            # Project scaffolding templates
```

## Package Dependencies

```
shared → (no internal deps)
ai → shared
tools → shared
memory → shared
agents → shared, ai, memory, tools
mcp → shared, tools
project-engine → shared, ai, tools
cli → shared, ai, agents, memory, tools, mcp, project-engine
```

## Data Flow

```
User Input
    │
    ▼
CLI (Commander)
    │
    ├── chat ──→ ProviderManager → AI Provider → LLM
    │               │
    │               └── MemoryManager → SQLite (sessions)
    │                                  └── Vector Store (RAG)
    │
    ├── agent ──→ AgentRouter
    │                ├── ManagerAgent
    │                ├── BackendAgent
    │                ├── FrontendAgent
    │                └── ...
    │
    ├── code ──→ ProjectGenerator → Templates
    │
    ├── mcp ──→ MCPRegistry → MCPClient → Remote Servers
    │
    └── project ──→ ProjectAnalyzer
                    ProjectPlanner
                    ProjectMigrator
                    DependencyAnalyzer
```

## Key Design Decisions

### 1. Monorepo with Lightweight Packages
Each package has a single responsibility. Shared types live in `@openio/shared`. No circular dependencies.

### 2. Provider Abstraction
All AI providers implement the same `AIProvider` interface. Adding a new provider requires only implementing `generate()`, `streamGenerate()`, and `getModels()`.

### 3. Tool Permission System
Tools have a configurable permission system with allow/deny rules. Each agent can have different tool access levels.

### 4. Pure JS SQLite
Uses `sql.js` (SQLite compiled to WASM) instead of `better-sqlite3` for zero native compilation dependencies.

### 5. MCP for Extensibility
The Model Context Protocol allows connecting external tool servers without modifying OpenIO itself.

## State Management

- **Config**: JSON file at `~/.openio/config.json`
- **Sessions**: SQLite database at `~/.openio/memory.db`
- **Vectors**: Stored as JSON blobs in SQLite, searched via cosine similarity
- **API Keys**: Config file or environment variables
