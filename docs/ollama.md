# Ollama Integration

OpenIO supports local LLM inference through Ollama.

## Setup

### 1. Install Ollama

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows
# Download from https://ollama.com/download
```

### 2. Pull a Model

```bash
ollama pull llama3.2
ollama pull mistral
ollama pull deepseek-r1
```

### 3. Configure OpenIO

```bash
# Set the Ollama host (default: http://localhost:11434)
export OLLAMA_HOST=http://localhost:11434

# Use with OpenIO
openio chat --model llama3.2
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama server URL |

## Supported Models

Any model available in Ollama can be used:

```bash
# List available models
ollama list

# Use with OpenIO
openio chat --model llama3.2
openio chat --model mistral
openio chat --model deepseek-r1
```

## Features

- **Streaming**: Full streaming support
- **No API key**: Runs entirely locally
- **Auto-discovery**: Automatically detects installed models
- **All capabilities**: Chat, code generation, agents

## Troubleshooting

```bash
# Check if Ollama is running
ollama list

# Test direct API access
curl http://localhost:11434/api/tags

# Check OpenIO connectivity
openio doctor
```
