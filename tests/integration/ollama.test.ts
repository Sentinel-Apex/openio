import { describe, it, expect, vi } from 'vitest';
import { OllamaProvider } from '@openio/ai';

vi.mock('ollama', () => ({
  Ollama: vi.fn().mockImplementation(() => ({
    chat: vi.fn().mockResolvedValue({
      message: { content: 'Ollama response' },
      model: 'llama3.2',
      done: true,
      eval_count: 50,
      prompt_eval_count: 10,
    }),
    list: vi.fn().mockResolvedValue({
      models: [
        { name: 'llama3.2:latest', details: { parameter_size: '7B' } },
        { name: 'mistral:latest', details: { parameter_size: '7B' } },
      ],
    }),
  })),
}));

describe('Ollama Integration', () => {
  it('generates text from local model', async () => {
    const provider = new OllamaProvider();
    const result = await provider.generate({
      model: 'llama3.2',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result.content).toBe('Ollama response');
    expect(result.finishReason).toBe('stop');
    expect(result.model).toBe('llama3.2');
  });

  it('lists available models', async () => {
    const provider = new OllamaProvider();
    const models = await provider.getModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models[0].provider).toBe('ollama');
  });

  it('handles streaming responses', async () => {
    const provider = new OllamaProvider();
    const chunks: string[] = [];
    for await (const chunk of provider.streamGenerate({
      model: 'llama3.2',
      messages: [{ role: 'user', content: 'Hi' }],
    })) {
      chunks.push(chunk.content);
    }
    expect(chunks.length).toBeGreaterThan(0);
  });
});
