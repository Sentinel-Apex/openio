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
  isCollapsed?: boolean;
  onToggle?: () => void;
  width?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  isCollapsed = false,
  width = 30,
}) => {
  if (isCollapsed) {
    return (
      <Box flexDirection="column" width={3} borderStyle="single" borderColor="gray" alignItems="center">
        <Text color="cyan" bold>
          {'\u2630'}
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={width} borderStyle="single" borderColor="gray" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">Sessions</Text>
      </Box>
      {sessions.map((s) => (
        <Box key={s.id}>
          <Text
            color={s.id === currentSessionId ? 'cyan' : 'gray'}
            bold={s.id === currentSessionId}
          >
            {s.id === currentSessionId ? '\u25B8 ' : '  '}{s.label}
          </Text>
        </Box>
      ))}
      {sessions.length === 0 && (
        <Box>
          <Text dimColor>No sessions yet</Text>
        </Box>
      )}
    </Box>
  );
};

export default Sidebar;
