import React from 'react';
import { Text, Box } from 'ink';
import { formatTokens } from '../utils/formatting.js';

interface TokenCounterProps {
  inputTokens: number;
  outputTokens: number;
  maxTokens?: number;
}

export const TokenCounter: React.FC<TokenCounterProps> = ({
  inputTokens,
  outputTokens,
  maxTokens = 128000,
}) => {
  const total = inputTokens + outputTokens;
  const percentage = total / maxTokens;
  const barWidth = 10;
  const filled = Math.round(barWidth * percentage);
  const empty = barWidth - filled;

  const barColor: string = percentage > 0.8 ? 'red' : percentage > 0.5 ? 'yellow' : 'green';

  return (
    <Box>
      <Text dimColor>Tokens: </Text>
      <Text color={barColor}>
        {'\u2588'.repeat(filled)}{'\u2591'.repeat(empty)}
      </Text>
      <Text dimColor>
        {' '}{formatTokens(inputTokens)} in / {formatTokens(outputTokens)} out
      </Text>
    </Box>
  );
};

export default TokenCounter;
