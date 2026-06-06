import React, { useMemo } from 'react';
import { Text, Box } from 'ink';
import type { Message } from '@openio/shared';
import { ROLE_ICONS, THEME_DIM } from '../utils/theme.js';
import { timestamp, extractCodeBlocks } from '../utils/formatting.js';
import { CodeBlock } from './CodeBlock.js';

interface MessageBubbleProps {
  message: Message;
  isLast?: boolean;
  isStreaming?: boolean;
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

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isLast = false,
  isStreaming = false,
}) => {
  const color = ROLE_COLORS[message.role] ?? 'white';
  const label = ROLE_LABELS[message.role] ?? message.role;
  const icon = ROLE_ICONS[message.role] ?? '\u{1F4AC}';
  const time = timestamp(message.timestamp);
  const modelName = message.metadata?.model as string | undefined;

  const codeBlocks = useMemo(() => extractCodeBlocks(message.content), [message.content]);
  const borderStyle = message.role === 'assistant' && isLast && isStreaming ? 'round' : 'round';

  return (
    <Box flexDirection="column" marginY={message.role === 'user' ? 1 : 1}>
      <Box
        flexDirection="column"
        borderStyle={borderStyle}
        borderColor={color}
        paddingX={1}
        paddingY={0}
      >
        <Box>
          <Text color={color} bold>
            {icon} {label}
          </Text>
          {modelName && (
            <Text dimColor> ({modelName})</Text>
          )}
          <Box flexGrow={1} />
          <Text dimColor>{time}</Text>
        </Box>
        <Box marginLeft={1} flexDirection="column">
          {codeBlocks.length > 0 ? (
            codeBlocks.map((block, i) => (
              <CodeBlock key={i} language={block.language} code={block.code} />
            ))
          ) : (
            <Text>{message.content}</Text>
          )}
        </Box>
      </Box>
      {message.role === 'assistant' && isLast && isStreaming && (
        <Box>
          <Text color="cyan" dimColor>
            {'\u25CF \u25CF \u25CF'}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default MessageBubble;
