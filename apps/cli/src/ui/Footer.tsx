import React from 'react';
import { Text, Box } from 'ink';

interface FooterProps {
  status?: string;
  showHelp?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ status, showHelp = true }) => {
  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1} marginTop={1}>
      <Box flexGrow={1}>
        {status && <Text color="gray">{status}</Text>}
      </Box>
      {showHelp && (
        <Text color="gray" dim>
          Ctrl+C exit · Ctrl+L clear · Tab autocomplete
        </Text>
      )}
    </Box>
  );
};
