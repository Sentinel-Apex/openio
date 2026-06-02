@echo off
echo ========================================
echo   OpenIO Project Builder
echo ========================================
echo.

REM Root directory files
echo Creating root configuration files...
echo {} > package.json
echo packages: > pnpm-workspace.yaml
echo   - "apps/*" >> pnpm-workspace.yaml
echo   - "packages/*" >> pnpm-workspace.yaml
echo {} > turbo.json
echo { > tsconfig.json
echo   "compilerOptions": { >> tsconfig.json
echo     "target": "ES2020", >> tsconfig.json
echo     "module": "commonjs", >> tsconfig.json
echo     "strict": true, >> tsconfig.json
echo     "esModuleInterop": true, >> tsconfig.json
echo     "skipLibCheck": true, >> tsconfig.json
echo     "forceConsistentCasingInFileNames": true >> tsconfig.json
echo   } >> tsconfig.json
echo } >> tsconfig.json
echo import { defineConfig } from 'tsup'; > tsup.config.ts
echo export default defineConfig({ >> tsup.config.ts
echo   entry: ['src/index.ts'], >> tsup.config.ts
echo   format: ['cjs', 'esm'], >> tsup.config.ts
echo   dts: true, >> tsup.config.ts
echo   clean: true, >> tsup.config.ts
echo }); >> tsup.config.ts
echo module.exports = { > eslint.config.js
echo   extends: ['@typescript-eslint/recommended'], >> eslint.config.js
echo   rules: {}, >> eslint.config.js
echo }; >> eslint.config.js
echo module.exports = { > prettier.config.js
echo   semi: true, >> prettier.config.js
echo   singleQuote: true, >> prettier.config.js
echo   trailingComma: 'es5', >> prettier.config.js
echo   tabWidth: 2, >> prettier.config.js
echo }; >> prettier.config.js
echo OPENAI_API_KEY= > .env.example
echo ANTHROPIC_API_KEY= >> .env.example
echo GROQ_API_KEY= >> .env.example
echo OPENROUTER_API_KEY= >> .env.example
echo DEEPSEEK_API_KEY= >> .env.example
echo KIMI_API_KEY= >> .env.example
echo > .gitignore
echo node_modules >> .gitignore
echo dist >> .gitignore
echo .env >> .gitignore
echo *.log >> .gitignore
echo MIT > LICENSE
echo # OpenIO > README.md
echo. >> README.md
echo AI-powered CLI chat with multi-provider support, specialized agents, and MCP integration. >> README.md

REM Apps CLI folder
echo Creating apps/cli structure...
mkdir apps\cli\src\commands 2>nul
mkdir apps\cli\src\ui 2>nul
mkdir apps\cli\src\hooks 2>nul
mkdir apps\cli\src\utils 2>nul

echo { > apps\cli\package.json
echo   "name": "@openio/cli", >> apps\cli\package.json
echo   "version": "1.0.0", >> apps\cli\package.json
echo   "bin": { >> apps\cli\package.json
echo     "openio": "./dist/index.js" >> apps\cli\package.json
echo   }, >> apps\cli\package.json
echo   "scripts": { >> apps\cli\package.json
echo     "dev": "tsx src/index.ts", >> apps\cli\package.json
echo     "build": "tsup", >> apps\cli\package.json
echo     "start": "node dist/index.js" >> apps\cli\package.json
echo   } >> apps\cli\package.json
echo } >> apps\cli\package.json

echo { > apps\cli\tsconfig.json
echo   "extends": "../../tsconfig.json", >> apps\cli\tsconfig.json
echo   "compilerOptions": { >> apps\cli\tsconfig.json
echo     "outDir": "./dist" >> apps\cli\tsconfig.json
echo   } >> apps\cli\tsconfig.json
echo } >> apps\cli\tsconfig.json

REM CLI source files
echo // Main entry point > apps\cli\src\index.ts
echo #!/usr/bin/env node >> apps\cli\src\index.ts
echo import './cli.js'; >> apps\cli\src\index.ts

echo // CLI entry > apps\cli\src\cli.ts
echo import { Command } from 'commander'; >> apps\cli\src\cli.ts
echo const program = new Command(); >> apps\cli\src\cli.ts
echo program.version('1.0.0').description('OpenIO - AI-powered CLI chat'); >> apps\cli\src\cli.ts
echo program.parse(); >> apps\cli\src\cli.ts

REM Commands
echo // Chat command > apps\cli\src\commands\chat.ts
echo export const chat = () => {}; >> apps\cli\src\commands\chat.ts
echo // Code command > apps\cli\src\commands\code.ts
echo export const code = () => {}; >> apps\cli\src\commands\code.ts
echo // Agent command > apps\cli\src\commands\agent.ts
echo export const agent = () => {}; >> apps\cli\src\commands\agent.ts
echo // Model command > apps\cli\src\commands\model.ts
echo export const model = () => {}; >> apps\cli\src\commands\model.ts
echo // Config command > apps\cli\src\commands\config.ts
echo export const config = () => {}; >> apps\cli\src\commands\config.ts
echo // Doctor command > apps\cli\src\commands\doctor.ts
echo export const doctor = () => {}; >> apps\cli\src\commands\doctor.ts
echo // Memory command > apps\cli\src\commands\memory.ts
echo export const memory = () => {}; >> apps\cli\src\commands\memory.ts
echo // MCP command > apps\cli\src\commands\mcp.ts
echo export const mcp = () => {}; >> apps\cli\src\commands\mcp.ts
echo // Project command > apps\cli\src\commands\project.ts
echo export const project = () => {}; >> apps\cli\src\commands\project.ts
echo // Init command > apps\cli\src\commands\init.ts
echo export const init = () => {}; >> apps\cli\src\commands\init.ts

REM UI Components
echo // ChatScreen > apps\cli\src\ui\ChatScreen.tsx
echo export const ChatScreen = () => null; >> apps\cli\src\ui\ChatScreen.tsx
echo // Welcome > apps\cli\src\ui\Welcome.tsx
echo export const Welcome = () => null; >> apps\cli\src\ui\Welcome.tsx
echo // Sidebar > apps\cli\src\ui\Sidebar.tsx
echo export const Sidebar = () => null; >> apps\cli\src\ui\Sidebar.tsx
echo // Header > apps\cli\src\ui\Header.tsx
echo export const Header = () => null; >> apps\cli\src\ui\Header.tsx
echo // Footer > apps\cli\src\ui\Footer.tsx
echo export const Footer = () => null; >> apps\cli\src\ui\Footer.tsx
echo // PromptInput > apps\cli\src\ui\PromptInput.tsx
echo export const PromptInput = () => null; >> apps\cli\src\ui\PromptInput.tsx
echo // MessageBubble > apps\cli\src\ui\MessageBubble.tsx
echo export const MessageBubble = () => null; >> apps\cli\src\ui\MessageBubble.tsx
echo // ModelSelector > apps\cli\src\ui\ModelSelector.tsx
echo export const ModelSelector = () => null; >> apps\cli\src\ui\ModelSelector.tsx
echo // AgentSelector > apps\cli\src\ui\AgentSelector.tsx
echo export const AgentSelector = () => null; >> apps\cli\src\ui\AgentSelector.tsx
echo // LoadingSpinner > apps\cli\src\ui\LoadingSpinner.tsx
echo export const LoadingSpinner = () => null; >> apps\cli\src\ui\LoadingSpinner.tsx
echo // Dashboard > apps\cli\src\ui\Dashboard.tsx
echo export const Dashboard = () => null; >> apps\cli\src\ui\Dashboard.tsx

REM Hooks
echo // useChat > apps\cli\src\hooks\useChat.ts
echo export const useChat = () => {}; >> apps\cli\src\hooks\useChat.ts
echo // useModels > apps\cli\src\hooks\useModels.ts
echo export const useModels = () => {}; >> apps\cli\src\hooks\useModels.ts
echo // useAgents > apps\cli\src\hooks\useAgents.ts
echo export const useAgents = () => {}; >> apps\cli\src\hooks\useAgents.ts

REM Utils
echo // logger > apps\cli\src\utils\logger.ts
echo export const logger = () => {}; >> apps\cli\src\utils\logger.ts
echo // config > apps\cli\src\utils\config.ts
echo export const config = () => {}; >> apps\cli\src\utils\config.ts
echo // paths > apps\cli\src\utils\paths.ts
echo export const paths = () => {}; >> apps\cli\src\utils\paths.ts
echo // prompt > apps\cli\src\utils\prompt.ts
echo export const prompt = () => {}; >> apps\cli\src\utils\prompt.ts
echo // banner > apps\cli\src\utils\banner.ts
echo export const banner = () => {}; >> apps\cli\src\utils\banner.ts

REM Packages
mkdir packages\ai\src\providers 2>nul
mkdir packages\ai\src\models 2>nul
mkdir packages\ai\src\embeddings 2>nul
mkdir packages\ai\src\rerank 2>nul

mkdir packages\agents\src 2>nul
mkdir packages\memory\src 2>nul
mkdir packages\tools\src 2>nul
mkdir packages\mcp\src 2>nul
mkdir packages\project-engine\src 2>nul
mkdir packages\shared\src 2>nul

REM AI Package
echo { > packages\ai\package.json
echo   "name": "@openio/ai", >> packages\ai\package.json
echo   "version": "1.0.0", >> packages\ai\package.json
echo   "main": "./dist/index.js" >> packages\ai\package.json
echo } >> packages\ai\package.json

echo // AI index > packages\ai\src\index.ts
echo export * from './providers/index.js'; >> packages\ai\src\index.ts

REM AI Providers
echo // OpenAI > packages\ai\src\providers\openai.ts
echo export const openai = () => {}; >> packages\ai\src\providers\openai.ts
echo // Anthropic > packages\ai\src\providers\anthropic.ts
echo export const anthropic = () => {}; >> packages\ai\src\providers\anthropic.ts
echo // Groq > packages\ai\src\providers\groq.ts
echo export const groq = () => {}; >> packages\ai\src\providers\groq.ts
echo // OpenRouter > packages\ai\src\providers\openrouter.ts
echo export const openrouter = () => {}; >> packages\ai\src\providers\openrouter.ts
echo // Deepseek > packages\ai\src\providers\deepseek.ts
echo export const deepseek = () => {}; >> packages\ai\src\providers\deepseek.ts
echo // Kimi > packages\ai\src\providers\kimi.ts
echo export const kimi = () => {}; >> packages\ai\src\providers\kimi.ts
echo // Ollama > packages\ai\src\providers\ollama.ts
echo export const ollama = () => {}; >> packages\ai\src\providers\ollama.ts
echo // Provider Manager > packages\ai\src\providers\provider-manager.ts
echo export const providerManager = () => {}; >> packages\ai\src\providers\provider-manager.ts

REM AI Models
echo // Registry > packages\ai\src\models\registry.ts
echo export const registry = () => {}; >> packages\ai\src\models\registry.ts
echo // Model Loader > packages\ai\src\models\model-loader.ts
echo export const modelLoader = () => {}; >> packages\ai\src\models\model-loader.ts
echo // Model Router > packages\ai\src\models\model-router.ts
echo export const modelRouter = () => {}; >> packages\ai\src\models\model-router.ts

REM Embeddings
echo // OpenAI Embeddings > packages\ai\src\embeddings\openai.ts
echo export const openaiEmbedding = () => {}; >> packages\ai\src\embeddings\openai.ts
echo // BGE > packages\ai\src\embeddings\bge.ts
echo export const bge = () => {}; >> packages\ai\src\embeddings\bge.ts
echo // Nomic > packages\ai\src\embeddings\nomic.ts
echo export const nomic = () => {}; >> packages\ai\src\embeddings\nomic.ts

REM Rerank
echo // BGE Reranker > packages\ai\src\rerank\bge-reranker.ts
echo export const bgeReranker = () => {}; >> packages\ai\src\rerank\bge-reranker.ts
echo // Jina Reranker > packages\ai\src\rerank\jina-reranker.ts
echo export const jinaReranker = () => {}; >> packages\ai\src\rerank\jina-reranker.ts

REM Agents Package
echo { > packages\agents\package.json
echo   "name": "@openio/agents", >> packages\agents\package.json
echo   "version": "1.0.0", >> packages\agents\package.json
echo   "main": "./dist/index.js" >> packages\agents\package.json
echo } >> packages\agents\package.json

echo // Manager Agent > packages\agents\src\manager-agent.ts
echo export const managerAgent = () => {}; >> packages\agents\src\manager-agent.ts
echo // Backend Agent > packages\agents\src\backend-agent.ts
echo export const backendAgent = () => {}; >> packages\agents\src\backend-agent.ts
echo // Frontend Agent > packages\agents\src\frontend-agent.ts
echo export const frontendAgent = () => {}; >> packages\agents\src\frontend-agent.ts
echo // Database Agent > packages\agents\src\database-agent.ts
echo export const databaseAgent = () => {}; >> packages\agents\src\database-agent.ts
echo // DevOps Agent > packages\agents\src\devops-agent.ts
echo export const devopsAgent = () => {}; >> packages\agents\src\devops-agent.ts
echo // Security Agent > packages\agents\src\security-agent.ts
echo export const securityAgent = () => {}; >> packages\agents\src\security-agent.ts
echo // Testing Agent > packages\agents\src\testing-agent.ts
echo export const testingAgent = () => {}; >> packages\agents\src\testing-agent.ts
echo // Research Agent > packages\agents\src\research-agent.ts
echo export const researchAgent = () => {}; >> packages\agents\src\research-agent.ts
echo // Code Review Agent > packages\agents\src\code-review-agent.ts
echo export const codeReviewAgent = () => {}; >> packages\agents\src\code-review-agent.ts
echo // Agent Router > packages\agents\src\agent-router.ts
echo export const agentRouter = () => {}; >> packages\agents\src\agent-router.ts

REM Memory Package
echo { > packages\memory\package.json
echo   "name": "@openio/memory", >> packages\memory\package.json
echo   "version": "1.0.0", >> packages\memory\package.json
echo   "main": "./dist/index.js" >> packages\memory\package.json
echo } >> packages\memory\package.json

echo // Memory > packages\memory\src\memory.ts
echo export const memory = () => {}; >> packages\memory\src\memory.ts
echo // Conversation > packages\memory\src\conversation.ts
echo export const conversation = () => {}; >> packages\memory\src\conversation.ts
echo // Session > packages\memory\src\session.ts
echo export const session = () => {}; >> packages\memory\src\session.ts
echo // Vector Store > packages\memory\src\vector-store.ts
echo export const vectorStore = () => {}; >> packages\memory\src\vector-store.ts
echo // SQLite > packages\memory\src\sqlite.ts
echo export const sqlite = () => {}; >> packages\memory\src\sqlite.ts
echo // Embeddings > packages\memory\src\embeddings.ts
echo export const embeddings = () => {}; >> packages\memory\src\embeddings.ts
echo // Retrieval > packages\memory\src\retrieval.ts
echo export const retrieval = () => {}; >> packages\memory\src\retrieval.ts

REM Tools Package
echo { > packages\tools\package.json
echo   "name": "@openio/tools", >> packages\tools\package.json
echo   "version": "1.0.0", >> packages\tools\package.json
echo   "main": "./dist/index.js" >> packages\tools\package.json
echo } >> packages\tools\package.json

echo // Filesystem > packages\tools\src\filesystem.ts
echo export const filesystem = () => {}; >> packages\tools\src\filesystem.ts
echo // Terminal > packages\tools\src\terminal.ts
echo export const terminal = () => {}; >> packages\tools\src\terminal.ts
echo // Git > packages\tools\src\git.ts
echo export const git = () => {}; >> packages\tools\src\git.ts
echo // Docker > packages\tools\src\docker.ts
echo export const docker = () => {}; >> packages\tools\src\docker.ts
echo // Browser > packages\tools\src\browser.ts
echo export const browser = () => {}; >> packages\tools\src\browser.ts
echo // Search > packages\tools\src\search.ts
echo export const search = () => {}; >> packages\tools\src\search.ts
echo // Postgres > packages\tools\src\postgres.ts
echo export const postgres = () => {}; >> packages\tools\src\postgres.ts
echo // MySQL > packages\tools\src\mysql.ts
echo export const mysql = () => {}; >> packages\tools\src\mysql.ts
echo // SQLite > packages\tools\src\sqlite.ts
echo export const sqliteTool = () => {}; >> packages\tools\src\sqlite.ts
echo // Redis > packages\tools\src\redis.ts
echo export const redis = () => {}; >> packages\tools\src\redis.ts
echo // Tool Registry > packages\tools\src\tool-registry.ts
echo export const toolRegistry = () => {}; >> packages\tools\src\tool-registry.ts

REM MCP Package
echo { > packages\mcp\package.json
echo   "name": "@openio/mcp", >> packages\mcp\package.json
echo   "version": "1.0.0", >> packages\mcp\package.json
echo   "main": "./dist/index.js" >> packages\mcp\package.json
echo } >> packages\mcp\package.json

echo // Client > packages\mcp\src\client.ts
echo export const client = () => {}; >> packages\mcp\src\client.ts
echo // Server > packages\mcp\src\server.ts
echo export const server = () => {}; >> packages\mcp\src\server.ts
echo // Transport > packages\mcp\src\transport.ts
echo export const transport = () => {}; >> packages\mcp\src\transport.ts
echo // Registry > packages\mcp\src\registry.ts
echo export const mcpRegistry = () => {}; >> packages\mcp\src\registry.ts
echo // Tools > packages\mcp\src\tools.ts
echo export const mcpTools = () => {}; >> packages\mcp\src\tools.ts

REM Project Engine Package
echo { > packages\project-engine\package.json
echo   "name": "@openio/project-engine", >> packages\project-engine\package.json
echo   "version": "1.0.0", >> packages\project-engine\package.json
echo   "main": "./dist/index.js" >> packages\project-engine\package.json
echo } >> packages\project-engine\package.json

echo // Analyzer > packages\project-engine\src\analyzer.ts
echo export const analyzer = () => {}; >> packages\project-engine\src\analyzer.ts
echo // Planner > packages\project-engine\src\planner.ts
echo export const planner = () => {}; >> packages\project-engine\src\planner.ts
echo // Generator > packages\project-engine\src\generator.ts
echo export const generator = () => {}; >> packages\project-engine\src\generator.ts
echo // Refactor > packages\project-engine\src\refactor.ts
echo export const refactor = () => {}; >> packages\project-engine\src\refactor.ts
echo // Tester > packages\project-engine\src\tester.ts
echo export const tester = () => {}; >> packages\project-engine\src\tester.ts
echo // Migration > packages\project-engine\src\migration.ts
echo export const migration = () => {}; >> packages\project-engine\src\migration.ts
echo // Dependency Graph > packages\project-engine\src\dependency-graph.ts
echo export const dependencyGraph = () => {}; >> packages\project-engine\src\dependency-graph.ts

REM Shared Package
echo { > packages\shared\package.json
echo   "name": "@openio/shared", >> packages\shared\package.json
echo   "version": "1.0.0", >> packages\shared\package.json
echo   "main": "./dist/index.js" >> packages\shared\package.json
echo } >> packages\shared\package.json

echo // Types > packages\shared\src\types.ts
echo export const types = () => {}; >> packages\shared\src\types.ts
echo // Constants > packages\shared\src\constants.ts
echo export const constants = () => {}; >> packages\shared\src\constants.ts
echo // Errors > packages\shared\src\errors.ts
echo export const errors = () => {}; >> packages\shared\src\errors.ts
echo // Logger > packages\shared\src\logger.ts
echo export const loggerShared = () => {}; >> packages\shared\src\logger.ts
echo // Config > packages\shared\src\config.ts
echo export const configShared = () => {}; >> packages\shared\src\config.ts
echo // Prompts > packages\shared\src\prompts.ts
echo export const prompts = () => {}; >> packages\shared\src\prompts.ts

REM Tests
mkdir tests\unit 2>nul
mkdir tests\integration 2>nul
mkdir tests\e2e 2>nul

echo // Provider test > tests\unit\provider.test.ts
echo describe('Provider', () => { it('should work', () => {}); }); >> tests\unit\provider.test.ts
echo // Memory test > tests\unit\memory.test.ts
echo describe('Memory', () => { it('should work', () => {}); }); >> tests\unit\memory.test.ts
echo // Tools test > tests\unit\tools.test.ts
echo describe('Tools', () => { it('should work', () => {}); }); >> tests\unit\tools.test.ts
echo // Agents test > tests\unit\agents.test.ts
echo describe('Agents', () => { it('should work', () => {}); }); >> tests\unit\agents.test.ts
echo // Chat test > tests\integration\chat.test.ts
echo describe('Chat', () => { it('should work', () => {}); }); >> tests\integration\chat.test.ts
echo // Ollama test > tests\integration\ollama.test.ts
echo describe('Ollama', () => { it('should work', () => {}); }); >> tests\integration\ollama.test.ts
echo // Project test > tests\integration\project.test.ts
echo describe('Project', () => { it('should work', () => {}); }); >> tests\integration\project.test.ts
echo // CLI E2E > tests\e2e\cli.e2e.ts
echo describe('CLI E2E', () => { it('should work', () => {}); }); >> tests\e2e\cli.e2e.ts
echo // Workflow E2E > tests\e2e\workflow.e2e.ts
echo describe('Workflow', () => { it('should work', () => {}); }); >> tests\e2e\workflow.e2e.ts

REM Docs
mkdir docs 2>nul
echo # Installation > docs\installation.md
echo # Commands > docs\commands.md
echo # Agents > docs\agents.md
echo # Providers > docs\providers.md
echo # Ollama Integration > docs\ollama.md
echo # MCP > docs\mcp.md
echo # Architecture > docs\architecture.md

REM Templates
mkdir templates\nextjs 2>nul
mkdir templates\react 2>nul
mkdir templates\express 2>nul
mkdir templates\fastapi 2>nul

echo {} > templates\nextjs\package.json
echo {} > templates\nextjs\tsconfig.json
echo # Next.js Template > templates\nextjs\README.md
echo {} > templates\react\package.json
echo # React Template > templates\react\README.md
echo {} > templates\express\package.json
echo # Express Template > templates\express\README.md
echo fastapi > templates\fastapi\requirements.txt
echo # FastAPI Template > templates\fastapi\README.md

echo.
echo ========================================
echo   OpenIO project structure created!
echo ========================================
echo.
echo Project location: %CD%
echo.
pause