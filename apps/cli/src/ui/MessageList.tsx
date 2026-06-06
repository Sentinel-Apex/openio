import React from 'react';
import { Box } from 'ink';
import type { Message } from '@openio/shared';
import { MessageBubble } from './MessageBubble.js';

interface MessageListProps {
  messages: Message[];
  isStreaming?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isStreaming = false,
}) => {
  if (messages.length === 0) return null;

  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      {messages.map((msg, idx) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isLast={idx === messages.length - 1}
          isStreaming={isStreaming && idx === messages.length - 1 && msg.role === 'assistant'}
        />
      ))}
    </Box>
  );
};

export default MessageList;
