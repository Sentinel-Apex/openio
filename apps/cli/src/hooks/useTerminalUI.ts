import { useState, useCallback, useRef } from 'react';
import type { Message } from '@openio/shared';

export type View = 'chat' | 'dashboard' | 'welcome';
export type StatusType = 'idle' | 'loading' | 'streaming' | 'error';

export interface TerminalUIState {
  view: View;
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  status: StatusType;
  inputValue: string;
  history: string[];
  historyIndex: number;
  showSidebar: boolean;
  showCommandPalette: boolean;
  showProviderSwitcher: boolean;
  showModelSwitcher: boolean;
  showAgentSwitcher: boolean;
  sidebarWidth: number;
  selectedModel: string;
  selectedProvider: string;
  selectedAgent: string;
  error: string | null;
  generationStart: number | null;
  inputTokens: number;
  outputTokens: number;
}

export interface TerminalUIActions {
  setView: (view: View) => void;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  setInputValue: (value: string) => void;
  setStatus: (status: StatusType) => void;
  setIsLoading: (loading: boolean) => void;
  setIsStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedModel: (model: string) => void;
  setSelectedProvider: (provider: string) => void;
  setSelectedAgent: (agent: string) => void;
  setGenerationStart: (time: number | null) => void;
  setInputTokens: (tokens: number) => void;
  setOutputTokens: (tokens: number) => void;
  toggleSidebar: () => void;
  toggleCommandPalette: () => void;
  toggleProviderSwitcher: () => void;
  toggleModelSwitcher: () => void;
  toggleAgentSwitcher: () => void;
  clearScreen: () => void;
  submitMessage: (content: string) => void;
  navigateHistory: (direction: 'up' | 'down') => void;
  clearInput: () => void;
  deleteWordBackward: () => void;
  resetState: () => void;
}

export function useTerminalUI(initialModel?: string, initialProvider?: string, initialAgent?: string) {
  const [view, setView] = useState<View>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState<StatusType>('idle');
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState<string[]>(['']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showProviderSwitcher, setShowProviderSwitcher] = useState(false);
  const [showModelSwitcher, setShowModelSwitcher] = useState(false);
  const [showAgentSwitcher, setShowAgentSwitcher] = useState(false);
  const [sidebarWidth] = useState(30);
  const [selectedModel, setSelectedModel] = useState(initialModel ?? 'gpt-4o');
  const [selectedProvider, setSelectedProvider] = useState(initialProvider ?? 'openai');
  const [selectedAgent, setSelectedAgent] = useState(initialAgent ?? 'manager');
  const [error, setError] = useState<string | null>(null);
  const [generationStart, setGenerationStart] = useState<number | null>(null);
  const [inputTokens, setInputTokens] = useState(0);
  const [outputTokens, setOutputTokens] = useState(0);

  const historyRef = useRef<string[]>(history);
  historyRef.current = history;

  const toggleSidebar = useCallback(() => setShowSidebar(v => !v), []);
  const toggleCommandPalette = useCallback(() => setShowCommandPalette(v => !v), []);
  const toggleProviderSwitcher = useCallback(() => setShowProviderSwitcher(v => !v), []);
  const toggleModelSwitcher = useCallback(() => setShowModelSwitcher(v => !v), []);
  const toggleAgentSwitcher = useCallback(() => setShowAgentSwitcher(v => !v), []);

  const clearScreen = useCallback(() => {
    console.clear();
  }, []);

  const submitMessage = useCallback((content: string) => {
    if (!content.trim()) return;
    setHistory(prev => [...prev.slice(0, -1), content, '']);
    setHistoryIndex(0);
    setInputValue('');
    setStatus('loading');
    setIsLoading(true);
    setGenerationStart(Date.now());
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
  }, []);

  const navigateHistory = useCallback((direction: 'up' | 'down') => {
    const hist = historyRef.current;
    if (direction === 'up') {
      const newIdx = Math.min(historyIndex + 1, hist.length - 1);
      setHistoryIndex(newIdx);
      setInputValue(hist[hist.length - 1 - newIdx] ?? '');
    } else {
      const newIdx = Math.max(historyIndex - 1, 0);
      setHistoryIndex(newIdx);
      if (newIdx === 0) {
        setInputValue('');
      } else {
        setInputValue(hist[hist.length - 1 - newIdx] ?? '');
      }
    }
  }, [historyIndex]);

  const clearInput = useCallback(() => {
    setInputValue('');
    setHistoryIndex(0);
  }, []);

  const deleteWordBackward = useCallback(() => {
    setInputValue(prev => prev.replace(/\s*\S+\s*$/, ''));
  }, []);

  const resetState = useCallback(() => {
    setMessages([]);
    setInputValue('');
    setError(null);
    setIsLoading(false);
    setIsStreaming(false);
    setStatus('idle');
    setGenerationStart(null);
    setInputTokens(0);
    setOutputTokens(0);
    setHistory(['']);
    setHistoryIndex(0);
  }, []);

  return {
    state: {
      view,
      messages,
      isLoading,
      isStreaming,
      status,
      inputValue,
      history,
      historyIndex,
      showSidebar,
      showCommandPalette,
      showProviderSwitcher,
      showModelSwitcher,
      showAgentSwitcher,
      sidebarWidth,
      selectedModel,
      selectedProvider,
      selectedAgent,
      error,
      generationStart,
      inputTokens,
      outputTokens,
    } as TerminalUIState,
    actions: {
      setView,
      setMessages,
      setInputValue,
      setStatus,
      setIsLoading,
      setIsStreaming,
      setError,
      setSelectedModel,
      setSelectedProvider,
      setSelectedAgent,
      setGenerationStart,
      setInputTokens,
      setOutputTokens,
      toggleSidebar,
      toggleCommandPalette,
      toggleProviderSwitcher,
      toggleModelSwitcher,
      toggleAgentSwitcher,
      clearScreen,
      submitMessage,
      navigateHistory,
      clearInput,
      deleteWordBackward,
      resetState,
    } as TerminalUIActions,
  };
}
