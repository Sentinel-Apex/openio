import React from 'react';
import { Text, Box } from 'ink';

interface SidebarItem {
  id: string;
  label: string;
  active?: boolean;
}

interface SidebarProps {
  sessions: SidebarItem[];
  onSelect?: (id: string) => void;
  currentSessionId?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ sessions, onSelect, currentSessionId }) => {
  return (
    <Box flexDirection="column" width={30} borderStyle="single" borderColor="gray" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">Sessions</Text>
      </Box>
      {sessions.map((s) => (
        <Box key={s.id}>
          <Text
            color={s.id === currentSessionId ? 'cyan' : 'gray'}
            bold={s.id === currentSessionId}
          >
            {s.id === currentSessionId ? '▸ ' : '  '}{s.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
};
