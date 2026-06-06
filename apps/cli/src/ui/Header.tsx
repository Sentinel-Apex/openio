import React from 'react';
import { Text, Box } from 'ink';
import { THEME_GREEN, THEME_YELLOW, THEME_DIM } from '../utils/theme.js';
import { formatTokens } from '../utils/formatting.js';

interface HeaderProps {
  title?: string;
  model?: string;
  provider?: string;
  agent?: string;
  inputTokens?: number;
  outputTokens?: number;
  isStreaming?: boolean;
  theme?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'OPENIO',
  model,
  provider,
  agent,
  inputTokens = 0,
  outputTokens = 0,
  isStreaming = false,
  theme = 'dark',
}) => {
  const totalTokens = inputTokens + outputTokens;
  return (
    <Box borderStyle="single" borderColor="cyan" paddingX={1}>
      <Box flexGrow={1}>
        <Text bold color="cyan">
          🤖 {title} v1.0.0
        </Text>
      </Box>
      <Box>
        {provider && (
          <Text color="blue">  {'\u25CF'} Provider: {provider}</Text>
        )}
        {model && (
          <Text color="yellow">  {'\u25CF'} Model: {model}</Text>
        )}
        {agent && (
          <Text color="magenta">  {'\u{1F3AF}'} Agent: {agent}</Text>
        )}
        {totalTokens > 0 && (
          <Text dimColor>  {'\u{1F4BE}'} {formatTokens(totalTokens)}</Text>
        )}
        {isStreaming && (
          <Text color="green">  {'\u25CF \u25CF \u25CF'}</Text>
        )}
        <Text dimColor>  [{theme === 'dark' ? '\u{1F319}' : '\u{2600}\uFE0F'}]</Text>
      </Box>
    </Box>
  );
};

export default Header;
