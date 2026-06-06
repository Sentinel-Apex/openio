import React, { useEffect, useState } from 'react';
import { Text, Box } from 'ink';
import { THEME_CYAN, THEME_GREEN, THEME_YELLOW, THEME_DIM } from '../utils/theme.js';

interface CodeBlockProps {
  code: string;
  language: string;
}

type ActionType = 'copy' | 'apply' | 'save' | 'explain';

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => setActionMessage(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  const lineCount = code.split('\n').length;
  const lines = code.split('\n');
  const isTruncated = lines.length > 20;

  return (
    <Box flexDirection="column" marginY={1}>
      <Box
        borderStyle="single"
        borderColor="gray"
        flexDirection="column"
      >
        <Box>
          <Box>
            <Text bold color="white" backgroundColor="gray">
              {' '}{language || 'code'}{' '}
            </Text>
            <Text dimColor> {lineCount} lines</Text>
          </Box>
        </Box>
        <Box paddingX={1} paddingY={0} flexDirection="column">
          {lines.slice(0, 20).map((line, i) => (
            <Text key={i} color="green">
              {String(i + 1).padStart(3, ' ')} | {line}
            </Text>
          ))}
          {isTruncated && (
            <Text dimColor>
              ... {lineCount - 20} more lines
            </Text>
          )}
        </Box>
        <Box>
          <Text dimColor>  {'\u{1F4CB}'} Copy  {'\u{1F4DD}'} Apply  {'\u{1F4BE}'} Save as  {'\u{1F50D}'} Explain</Text>
        </Box>
      </Box>
      {actionMessage && (
        <Box marginLeft={2}>
          <Text color="green">{'\u2713'} {actionMessage}</Text>
        </Box>
      )}
    </Box>
  );
};

export default CodeBlock;
