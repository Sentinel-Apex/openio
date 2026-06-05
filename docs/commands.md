# Commands

## Overview

OpenIO provides a CLI with the following command structure:

```bash
openio [command] [options] [arguments]
```

## Global Options

| Option | Description |
|--------|-------------|
| `--help` | Show help |
| `--version` | Show version |

## Commands

### `openio chat`

Start an interactive chat session with an AI model.

```bash
openio chat [options]
```

| Option | Description |
|--------|-------------|
| `-m, --model <model>` | Model to use (default: gpt-4o) |
| `-s, --session <id>` | Resume a previous session |
| `--no-stream` | Disable streaming output |

**Chat commands:**
- `/exit` or `/quit` — Exit chat
- `/clear` — Clear screen
- `/help` — Show chat help

### `openio code`

Generate boilerplate code from a prompt.

```bash
openio code [prompt] [options]
```

| Option | Description |
|--------|-------------|
| `-o, --output <path>` | Output file path |
| `-l, --language <lang>` | Language (typescript, python, rust) |

### `openio agent`

Manage and run AI agents.

```bash
openio agent [task] [options]
```

| Option | Description |
|--------|-------------|
| `-r, --role <role>` | Agent role (manager, backend, frontend, etc.) |
| `-l, --list` | List available agents |

### `openio model`

Manage AI models.

```bash
openio model [options]
```

| Option | Description |
|--------|-------------|
| `-l, --list` | List all available models |
| `-s, --search <query>` | Search models by name |
| `-p, --provider <provider>` | Filter by provider |
| `--refresh` | Reload model list from providers |

### `openio config`

View and modify configuration.

```bash
openio config [options]
```

| Option | Description |
|--------|-------------|
| `-l, --list` | Show all config values |
| `-s, --set <key=value>` | Set a config value |
| `-g, --get <key>` | Get a config value |
| `--api-key <provider=key>` | Set an API key |

### `openio doctor`

Run system health checks.

```bash
openio doctor
```

Checks: Node.js version, config file, API keys, provider availability, git, Docker.

### `openio memory`

Manage sessions and memory.

```bash
openio memory [options]
```

| Option | Description |
|--------|-------------|
| `-l, --list` | List recent sessions |
| `-s, --session <id>` | View a specific session |
| `-d, --delete <id>` | Delete a session |
| `--search <query>` | Semantic search across memory |
| `--stats` | Show memory statistics |

### `openio mcp`

Manage MCP (Model Context Protocol) servers.

```bash
openio mcp [options]
```

| Option | Description |
|--------|-------------|
| `-l, --list` | List configured servers |
| `--add` | Add a new server interactively |
| `--remove <id>` | Remove a server |
| `--connect <id>` | Connect to a server |
| `--disconnect <id>` | Disconnect a server |
| `--tools` | List tools from all connected servers |

### `openio project`

Project analysis and scaffolding.

```bash
openio project <action> [options]
```

**Actions:**
- `analyze` — Analyze project structure
- `scaffold` — Generate project from template
- `migrate` — Plan framework migration
- `deps` — Build dependency graph

| Option | Description |
|--------|-------------|
| `-d, --dir <path>` | Project directory |
| `-t, --template <name>` | Template name |
| `-n, --name <name>` | Project name |

### `openio init`

Initialize OpenIO configuration.

```bash
openio init [options]
```

| Option | Description |
|--------|-------------|
| `-f, --force` | Overwrite existing config |
