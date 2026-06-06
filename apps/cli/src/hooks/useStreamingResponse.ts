import { useState, useCallback, useRef } from 'react';
import type { Message } from '@openio/shared';
import type { TerminalUIActions, TerminalUIState } from './useTerminalUI.js';
import { countTokens } from '../utils/formatting.js';

interface UseStreamingResponseOptions {
  state: TerminalUIState;
  actions: TerminalUIActions;
  onStream?: (chunk: string) => void;
  onComplete?: (full: string) => void;
  onError?: (error: string) => void;
}

export function useStreamingResponse({ state, actions, onComplete }: UseStreamingResponseOptions) {
  const abortRef = useRef<AbortController | null>(null);
  const fullRef = useRef('');

  const startStream = useCallback(async (
    streamFn: (signal: AbortSignal) => AsyncGenerator<{ content?: string }>,
  ) => {
    actions.setIsStreaming(true);
    actions.setStatus('streaming');
    actions.setIsLoading(true);
    actions.setGenerationStart(Date.now());
    const controller = new AbortController();
    abortRef.current = controller;
    fullRef.current = '';

    const assistantMsg: Message = {
      id: (Date.now()).toString(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      metadata: { model: state.selectedModel, provider: state.selectedProvider },
    };
    actions.setMessages(prev => [...prev, assistantMsg]);
    let msgId = assistantMsg.id;
    let tokenCount = 0;

    try {
      const gen = streamFn(controller.signal);
      for await (const chunk of gen) {
        if (controller.signal.aborted) break;
        if (chunk.content) {
          fullRef.current += chunk.content;
          tokenCount++;
          actions.setOutputTokens(countTokens(fullRef.current));
          actions.setMessages(prev =>
            prev.map(m => m.id === msgId ? { ...m, content: fullRef.current } : m),
          );
        }
      }

      if (!controller.signal.aborted && fullRef.current) {
        actions.setMessages(prev =>
          prev.map(m =>
            m.id === msgId ? { ...m, content: fullRef.current, timestamp: Date.now() } : m,
          ),
        );
        onComplete?.(fullRef.current);
      }

      if (controller.signal.aborted) {
        actions.setMessages(prev =>
          prev.map(m =>
            m.id === msgId
              ? { ...m, content: fullRef.current + '\n\n_[Generation stopped]_', timestamp: Date.now() }
              : m,
          ),
        );
      }
    } catch (err) {
      const errMsg = (err as Error).message;
      actions.setMessages(prev =>
        prev.map(m =>
          m.id === msgId
            ? { ...m, content: fullRef.current + `\n\n_Error: ${errMsg}_` }
            : m,
        ),
      );
      actions.setError(errMsg);
      actions.setStatus('error');
    } finally {
      actions.setIsStreaming(false);
      actions.setIsLoading(false);
      if (abortRef.current === controller) abortRef.current = null;
      if (!controller.signal.aborted) {
        actions.setStatus('idle');
      }
    }
  }, [state.selectedModel, state.selectedProvider, actions, onComplete]);

  const stopGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const regenerateLast = useCallback(async (
    streamFn: (signal: AbortSignal) => AsyncGenerator<{ content?: string }>,
  ) => {
    actions.setMessages(prev => {
      const lastAssistant = [...prev].reverse().find(m => m.role === 'assistant');
      return lastAssistant ? prev.filter(m => m.id !== lastAssistant.id) : prev;
    });
    await startStream(streamFn);
  }, [actions, startStream]);

  return { startStream, stopGeneration, regenerateLast };
}
