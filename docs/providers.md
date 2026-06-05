# Providers

OpenIO supports multiple AI providers through a unified interface.

## Supported Providers

| Provider | Models | SDK | API Key Env Var |
|----------|--------|-----|-----------------|
| **OpenAI** | GPT-4o, GPT-4o-mini, GPT-3.5 Turbo | `openai` | `OPENAI_API_KEY` |
| **Anthropic** | Claude Sonnet 4, Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude Opus 4 | `@anthropic-ai/sdk` | `ANTHROPIC_API_KEY` |
| **Groq** | Llama 3.3 70B, Llama 3.1 8B, Mixtral 8x7B | `groq-sdk` | `GROQ_API_KEY` |
| **OpenRouter** | Multi-model gateway | `openai` (compatible) | `OPENROUTER_API_KEY` |
| **DeepSeek** | DeepSeek V3, DeepSeek R1 | `openai` (compatible) | `DEEPSEEK_API_KEY` |
| **Kimi (Moonshot)** | Moonshot v1 8K/32K/128K | `openai` (compatible) | `KIMI_API_KEY` |
| **Ollama** | Local models (Llama, Mistral, etc.) | `ollama` | N/A |

## Configuration

### Environment Variables

```bash
# .env file
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-...
DEEPSEEK_API_KEY=sk-...
KIMI_API_KEY=...
```

### CLI Config

```bash
openio config --api-key openai=sk-...
openio config --api-key anthropic=sk-ant-...
```

### Custom Base URLs

Set `OPENAI_BASE_URL` or provider-specific env vars to use custom endpoints.

## Provider Architecture

All providers implement the `AIProvider` interface:

```ts
interface AIProvider {
  readonly name: string;
  generate(options: GenerateOptions): Promise<GenerateResult>;
  streamGenerate(options: GenerateOptions): AsyncIterable<GenerateResult>;
  getModels(): Promise<ModelConfig[]>;
}
```

### Common Features

- **Streaming**: All providers support token-by-token streaming
- **Tool/Function Calling**: OpenAI, OpenRouter support native tool calling
- **Vision**: GPT-4o, Claude models support image inputs
- **API Key Rotation**: Multiple keys per provider with round-robin rotation
- **Retry Logic**: Automatic retry with exponential backoff

## Usage

```ts
import { providerManager, OpenAIProvider } from '@openio/ai';

// Register provider
providerManager.registerProvider('openai', new OpenAIProvider());

// Generate text
const result = await providerManager.generate({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello' }],
});

// Stream
for await (const chunk of providerManager.streamGenerate({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Count to 5' }],
})) {
  process.stdout.write(chunk.content);
}
```
