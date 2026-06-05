import React from 'react';
import { Text, Box } from 'ink';

interface HeaderProps {
  title?: string;
  model?: string;
  agent?: string;
}

export const Header: React.FC<HeaderProps> = ({ title = 'OpenIO', model, agent }) => {
  return (
    <Box borderStyle="single" borderColor="cyan" paddingX={1}>
      <Box flexGrow={1}>
        <Text bold color="cyan">{title}</Text>
      </Box>
      <Box>
        {model && <Text color="yellow"> {model} </Text>}
        {agent && <Text color="green">{agent}</Text>}
      </Box>
    </Box>
  );
};
