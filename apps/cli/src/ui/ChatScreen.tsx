import React, { useState, useCallback } from 'react';
import { Box } from 'ink';
import { Header } from './Header.js';
import { Footer } from './Footer.js';
import { MessageBubble } from './MessageBubble.js';
import { LoadingSpinner } from './LoadingSpinner.js';
import type { Message } from '@openio/shared';

interface ChatScreenProps {
  initialMessages?: Message[];
  model?: string;
  agent?: string;
  onSendMessage?: (message: string) => Promise<string | void>;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  initialMessages = [],
  model,
  agent,
  onSendMessage,
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(
    async (input: string) => {
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: input,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        if (onSendMessage) {
          const response = await onSendMessage(input);
          if (response) {
            const aiMsg: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: response,
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, aiMsg]);
          }
        }
      } catch (err) {
        const errMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'system',
          content: `Error: ${(err as Error).message}`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [onSendMessage],
  );

  return (
    <Box flexDirection="column" height="100%">
      <Header title="OpenIO Chat" model={model} agent={agent} />
      <Box flexGrow={1} flexDirection="column" paddingX={1}>
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && <LoadingSpinner text="Thinking..." />}
      </Box>
    </Box>
  );
};

export default ChatScreen;
