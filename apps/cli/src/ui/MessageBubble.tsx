import React from 'react';
import { Text, Box } from 'ink';
import type { Message } from '@openio/shared';

interface MessageBubbleProps {
  message: Message;
}

const ROLE_COLORS: Record<string, string> = {
  user: 'green',
  assistant: 'cyan',
  system: 'yellow',
  tool: 'magenta',
};

const ROLE_LABELS: Record<string, string> = {
  user: 'You',
  assistant: 'OpenIO',
  system: 'System',
  tool: 'Tool',
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const color = ROLE_COLORS[message.role] ?? 'white';
  const label = ROLE_LABELS[message.role] ?? message.role;

  return (
    <Box flexDirection="column" marginY={1}>
      <Box>
        <Text color={color} bold>
          {label}
        </Text>
        {message.metadata?.model && (
          <Text dim> ({message.metadata.model as string})</Text>
        )}
      </Box>
      <Box marginLeft={2}>
        <Text>{message.content}</Text>
      </Box>
    </Box>
  );
};
