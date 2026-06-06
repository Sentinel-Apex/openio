import React from 'react';
import { Text, Box } from 'ink';

interface WelcomeProps {
  onStart?: () => void;
}

export const Welcome: React.FC<WelcomeProps> = () => {
  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" paddingY={2}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {'\u2554'}{'\u2550'.repeat(38)}{'\u2557'}
        </Text>
      </Box>
      <Box>
        <Text bold color="cyan">
          {'\u2551'}          OpenIO v1.0.0              {'\u2551'}
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {'\u255A'}{'\u2550'.repeat(38)}{'\u255D'}
        </Text>
      </Box>
      <Box marginY={1}>
        <Text dimColor>AI-Powered CLI Coding Assistant</Text>
      </Box>
      <Box flexDirection="column" alignItems="center" marginTop={1}>
        <Text>/chat    Start interactive chat</Text>
        <Text>/code    Generate code</Text>
        <Text>/agent   Delegate to an agent</Text>
        <Text>/help    Show help</Text>
      </Box>
    </Box>
  );
};

export default Welcome;
