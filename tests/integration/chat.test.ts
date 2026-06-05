import { describe, it, expect, vi, beforeAll } from 'vitest';
import { providerManager, OpenAIProvider } from '@openio/ai';

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn()
          .mockResolvedValueOnce({
            choices: [{ message: { content: 'Hello! How can I help?' }, finish_reason: 'stop' }],
            model: 'gpt-4o',
            usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
          })
          .mockResolvedValueOnce({
            choices: [{ message: { content: 'Here is how you do that...' }, finish_reason: 'stop' }],
            model: 'gpt-4o',
            usage: { prompt_tokens: 50, completion_tokens: 30, total_tokens: 80 },
          }),
      },
    },
    models: { list: vi.fn().mockResolvedValue({ data: [] }) },
  })),
}));

describe('Chat Integration', () => {
  beforeAll(() => {
    providerManager.registerProvider('openai', new OpenAIProvider());
  });

  it('generates chat response', async () => {
    const result = await providerManager.generate({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' },
      ],
    });

    expect(result.content).toBeTruthy();
    expect(result.finishReason).toBe('stop');
    expect(result.usage).toBeDefined();
    expect(result.usage?.totalTokens).toBe(30);
  });

  it('maintains conversation context across messages', async () => {
    const first = await providerManager.generate({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hi' }],
    });

    const second = await providerManager.generate({
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: first.content },
        { role: 'user', content: 'Can you explain more?' },
      ],
    });

    expect(second.content).toBeTruthy();
  });

  it('handles streaming responses', async () => {
    let fullContent = '';
    for await (const chunk of providerManager.streamGenerate({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Count to 3' }],
    })) {
      fullContent += chunk.content;
    }
    expect(fullContent).toBeTruthy();
  });

  it('throws error for unknown models', async () => {
    await expect(
      providerManager.generate({
        model: 'nonexistent-model',
        messages: [{ role: 'user', content: 'test' }],
      }),
    ).rejects.toThrow();
  });
});
