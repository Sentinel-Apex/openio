import React, { useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { Header } from './Header.js';
import { MessageList } from './MessageList.js';
import { PromptInput } from './PromptInput.js';
import { StatusBar } from './StatusBar.js';
import { Sidebar } from './Sidebar.js';
import { CommandPalette } from './CommandPalette.js';
import { ProcessingIndicator } from './ProcessingIndicator.js';
import { TokenCounter } from './TokenCounter.js';
import { useTerminalUI } from '../hooks/useTerminalUI.js';
import { useStreamingResponse } from '../hooks/useStreamingResponse.js';
import { detectTheme } from '../utils/theme.js';
import type { Message } from '@openio/shared';
import type { TerminalUIState, TerminalUIActions } from '../hooks/useTerminalUI.js';

interface AppProps {
  initialModel?: string;
  initialProvider?: string;
  initialAgent?: string;
  onSendMessage?: (content: string) => Promise<string | void>;
  onStreamGenerate?: (signal: AbortSignal) => AsyncGenerator<{ content?: string }>;
  sessions?: Array<{ id: string; label: string }>;
  currentSessionId?: string;
  onSessionSelect?: (id: string) => void;
  suggestions?: string[];
}

export const App: React.FC<AppProps> = ({
  initialModel,
  initialProvider,
  initialAgent,
  onSendMessage,
  onStreamGenerate,
  sessions = [],
  currentSessionId,
  onSessionSelect,
  suggestions = [],
}) => {
  const { state, actions } = useTerminalUI(initialModel, initialProvider, initialAgent);
  const { exit } = useApp();
  const theme = detectTheme();

  const { startStream, stopGeneration, regenerateLast } = useStreamingResponse({
    state: state as TerminalUIState,
    actions: actions as TerminalUIActions,
    onComplete: (full: string) => {
      actions.setStatus('idle');
    },
  });

  const handleSubmit = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      actions.submitMessage(content);

      if (onSendMessage) {
        try {
          const response = await onSendMessage(content);
          if (response) {
            const aiMsg: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: response,
              timestamp: Date.now(),
              metadata: { model: state.selectedModel, provider: state.selectedProvider },
            };
            actions.setMessages(prev => [...prev, aiMsg]);
            actions.setStatus('idle');
            actions.setIsLoading(false);
          }
        } catch (err) {
          const errMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'system',
            content: `Error: ${(err as Error).message}`,
            timestamp: Date.now(),
          };
          actions.setMessages(prev => [...prev, errMsg]);
          actions.setError((err as Error).message);
          actions.setStatus('error');
          actions.setIsLoading(false);
        }
      }
    },
    [onSendMessage, state.selectedModel, state.selectedProvider, actions],
  );

  const handleCommand = useCallback(
    (command: string) => {
      switch (command) {
        case 'clear':
          actions.clearScreen();
          break;
        case 'sidebar':
          actions.toggleSidebar();
          break;
        case 'provider':
          actions.toggleProviderSwitcher();
          break;
        case 'model':
          actions.toggleModelSwitcher();
          break;
        case 'agent':
          actions.toggleAgentSwitcher();
          break;
        case 'stop':
          stopGeneration();
          break;
        case 'regenerate':
          if (onStreamGenerate) {
            regenerateLast(onStreamGenerate);
          }
          break;
        case 'reset':
          actions.resetState();
          break;
        case 'exit':
          exit();
          break;
      }
    },
    [actions, stopGeneration, regenerateLast, onStreamGenerate, exit],
  );

  useInput(
    (input, key) => {
      if (state.showCommandPalette) return;

      if (key.ctrl && input === 'c') {
        if (state.isStreaming) {
          stopGeneration();
        } else {
          exit();
        }
        return;
      }

      if (key.ctrl && input === 'l') {
        actions.clearScreen();
        return;
      }

      if (key.ctrl && input === 'k') {
        actions.toggleCommandPalette();
        return;
      }

      if (key.ctrl && input === 'u') {
        actions.clearInput();
        return;
      }

      if (key.ctrl && input === 'w') {
        actions.deleteWordBackward();
        return;
      }

      if (key.ctrl && input === 's') {
        stopGeneration();
        return;
      }

      if (key.ctrl && input === 'r') {
        if (onStreamGenerate) {
          regenerateLast(onStreamGenerate);
        }
        return;
      }

      if (key.ctrl && input === 'e') {
        actions.toggleSidebar();
        return;
      }

      if (key.ctrl && input === 'p') {
        actions.toggleProviderSwitcher();
        return;
      }

      if (key.ctrl && input === 'm') {
        actions.toggleModelSwitcher();
        return;
      }

      if (key.ctrl && input === 'a') {
        actions.toggleAgentSwitcher();
        return;
      }

      if (key.shift && key.upArrow) {
        actions.navigateHistory('up');
        return;
      }

      if (key.shift && key.downArrow) {
        actions.navigateHistory('down');
        return;
      }
    },
    { isActive: true },
  );

  const handleStreamingSubmit = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      actions.submitMessage(content);
      if (onStreamGenerate) {
        await startStream(onStreamGenerate);
      } else if (onSendMessage) {
        await handleSubmit(content);
      }
    },
    [actions, onStreamGenerate, onSendMessage, startStream, handleSubmit],
  );

  const hasMessages = state.messages.length > 0;
  const hasSidebar = sessions.length > 0 || state.showSidebar;

  return (
    <Box flexDirection="column" height="100%" width="100%">
      <Header
        title="OPENIO"
        model={state.selectedModel}
        provider={state.selectedProvider}
        agent={state.selectedAgent}
        inputTokens={state.inputTokens}
        outputTokens={state.outputTokens}
        isStreaming={state.isStreaming}
        theme={theme}
      />

      <Box flexGrow={1} flexDirection="row">
        {hasSidebar && (
          <Sidebar
            sessions={sessions}
            onSelect={onSessionSelect}
            currentSessionId={currentSessionId}
            isCollapsed={!state.showSidebar}
            onToggle={actions.toggleSidebar}
            width={state.sidebarWidth}
          />
        )}

        <Box flexGrow={1} flexDirection="column">
          {hasMessages ? (
            <MessageList
              messages={state.messages}
              isStreaming={state.isStreaming}
            />
          ) : (
            <Box flexGrow={1} alignItems="center" justifyContent="center" flexDirection="column">
              <Text bold color="cyan">OpenIO v1.0.0</Text>
              <Text dimColor>AI-Powered CLI Coding Assistant</Text>
              <Box marginTop={1} flexDirection="column" alignItems="center">
                <Text dimColor>Type a message to start chatting</Text>
                <Text dimColor>Ctrl+K for commands  Ctrl+E for sidebar</Text>
              </Box>
            </Box>
          )}

          {(state.isLoading || state.isStreaming) && (
            <ProcessingIndicator
              isLoading={state.isLoading}
              isStreaming={state.isStreaming}
              startTime={state.generationStart}
              message={state.isStreaming ? 'AI is thinking...' : 'Processing...'}
            />
          )}

          {(state.inputTokens > 0 || state.outputTokens > 0) && (
            <Box paddingX={1}>
              <TokenCounter
                inputTokens={state.inputTokens}
                outputTokens={state.outputTokens}
              />
            </Box>
          )}

          {state.error && (
            <Box paddingX={1}>
              <Text color="red">⚠ {state.error}</Text>
            </Box>
          )}
        </Box>
      </Box>

      <PromptInput
        value={state.inputValue}
        onChange={actions.setInputValue}
        onSubmit={handleStreamingSubmit}
        placeholder="Type a message..."
        suggestions={suggestions}
        isDisabled={state.isLoading}
        isFocused={!state.showCommandPalette}
      />

      <StatusBar
        status={state.status}
        generationStart={state.generationStart}
        inputTokens={state.inputTokens}
        outputTokens={state.outputTokens}
        isStreaming={state.isStreaming}
        model={state.selectedModel}
        provider={state.selectedProvider}
        agent={state.selectedAgent}
      />

      <CommandPalette
        isOpen={state.showCommandPalette}
        onClose={actions.toggleCommandPalette}
        onCommand={handleCommand}
      />
    </Box>
  );
};

export default App;
