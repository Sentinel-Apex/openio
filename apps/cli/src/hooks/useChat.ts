import { useState, useCallback } from 'react';
import type { Message } from '@openio/shared';
import { providerManager } from '@openio/ai';
import { MemoryManager } from '@openio/memory';
import { join } from 'node:path';
import { homedir } from 'node:os';

interface UseChatOptions {
  model?: string;
  sessionId?: string;
  memory?: MemoryManager;
}

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  error: string | null;
}

export function useChat(opts: UseChatOptions = {}): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mem] = useState(() => opts.memory ?? new MemoryManager({ dbPath: join(homedir(), '.openio', 'memory.db') }));
  const [sessionId, setSessionId] = useState(opts.sessionId ?? '');

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      setIsLoading(true);
      setError(null);

      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        await mem.init();
        let sid = sessionId;
        if (!sid) {
          const session = mem.sessions.create('Chat', opts.model);
          sid = session.id;
          setSessionId(sid);
        }

        await mem.addMessage(sid, 'user', content);
        const { messages: context } = await mem.getContext(sid, content);

        const msgs = context.map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        }));

        const result = await providerManager.generate({
          model: opts.model ?? 'gpt-4o',
          messages: msgs,
        });

        await mem.addMessage(sid, 'assistant', result.content);

        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.content,
          timestamp: Date.now(),
          metadata: { model: result.model },
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch (err) {
        const errMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'system',
          content: `Error: ${(err as Error).message}`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, opts.model, mem],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, sendMessage, clearMessages, error };
}
