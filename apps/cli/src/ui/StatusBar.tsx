import React from 'react';
import { Text, Box } from 'ink';
import { elapsed, formatTokens } from '../utils/formatting.js';
import type { StatusType } from '../hooks/useTerminalUI.js';

interface StatusBarProps {
  status: StatusType;
  generationStart: number | null;
  inputTokens: number;
  outputTokens: number;
  isStreaming: boolean;
  model: string;
  provider: string;
  agent: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  status,
  generationStart,
  inputTokens,
  outputTokens,
  isStreaming,
  model,
  provider,
  agent,
}) => {
  let statusText = 'Ready';
  let statusColor: string = 'gray';

  switch (status) {
    case 'loading':
      statusText = 'Processing...';
      statusColor = 'cyan';
      break;
    case 'streaming':
      statusText = `Generating... ${generationStart ? elapsed(generationStart) : ''}`;
      statusColor = 'green';
      break;
    case 'error':
      statusText = 'Error occurred';
      statusColor = 'red';
      break;
  }

  const totalTokens = inputTokens + outputTokens;

  return (
    <Box borderStyle="round" borderColor="gray" paddingX={1} marginTop={1}>
      <Box flexGrow={1}>
        <Text color={statusColor}>
          {isStreaming ? '\u25CF' : '\u25CB'} {statusText}
        </Text>
        {isStreaming && (
          <Text color="green">  {'\u2588\u2588\u2588\u2588\u2591\u2591\u2591\u2591'}</Text>
        )}
        <Text dimColor>
          {'  '}[{provider}/{model}]
        </Text>
        {totalTokens > 0 && (
          <Text dimColor>  {formatTokens(totalTokens)}</Text>
        )}
        {agent && (
          <Text dimColor>  {'\u{1F3AF}'} {agent}</Text>
        )}
      </Box>
      <Box>
        <Text dimColor>
          Ctrl+C:Exit  Ctrl+K:Commands  Ctrl+S:Stop  Ctrl+L:Clear
        </Text>
      </Box>
    </Box>
  );
};

export default StatusBar;
