import React, { useState, useCallback } from 'react';
import { Text, Box, useInput } from 'ink';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onCommand: (command: string) => void;
}

interface CommandItem {
  label: string;
  value: string;
  description: string;
}

const COMMANDS: CommandItem[] = [
  { label: 'Clear Screen', value: 'clear', description: 'Clear the terminal screen (Ctrl+L)' },
  { label: 'Toggle Sidebar', value: 'sidebar', description: 'Show/hide the sessions sidebar (Ctrl+E)' },
  { label: 'Switch Provider', value: 'provider', description: 'Change AI provider (Ctrl+P)' },
  { label: 'Switch Model', value: 'model', description: 'Change AI model (Ctrl+M)' },
  { label: 'Switch Agent', value: 'agent', description: 'Change active agent (Ctrl+A)' },
  { label: 'Stop Generation', value: 'stop', description: 'Stop the current AI response (Ctrl+S)' },
  { label: 'Regenerate Response', value: 'regenerate', description: 'Regenerate the last response (Ctrl+R)' },
  { label: 'Exit', value: 'exit', description: 'Exit the application (Ctrl+C)' },
  { label: 'Reset Session', value: 'reset', description: 'Clear all messages and start fresh' },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onCommand,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = search
    ? COMMANDS.filter(c =>
        c.label.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase()),
      )
    : COMMANDS;

  const handleSelect = useCallback(() => {
    if (filtered.length > 0 && selectedIndex < filtered.length) {
      onCommand(filtered[selectedIndex].value);
      onClose();
      setSearch('');
      setSelectedIndex(0);
    }
  }, [filtered, selectedIndex, onCommand, onClose]);

  useInput(
    (input, key) => {
      if (!isOpen) return;
      if (key.escape) {
        onClose();
        setSearch('');
        setSelectedIndex(0);
        return;
      }
      if (key.return) {
        handleSelect();
        return;
      }
      if (key.upArrow) {
        setSelectedIndex(prev => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedIndex(prev => Math.min(filtered.length - 1, prev + 1));
        return;
      }
      if (key.backspace || key.delete) {
        setSearch(prev => prev.slice(0, -1));
        return;
      }
      if (key.ctrl || key.meta || key.shift) return;
      if (input && input.length === 1) {
        setSearch(prev => prev + input);
        setSelectedIndex(0);
      }
    },
    { isActive: isOpen },
  );

  if (!isOpen) return null;

  return (
    <Box flexDirection="column" width="100%" paddingX={2} paddingY={1}>
      <Box
        borderStyle="single"
        borderColor="cyan"
        flexDirection="column"
      >
        <Box paddingX={1}>
          <Text bold color="cyan">Command Palette</Text>
          <Box flexGrow={1} />
          <Text dimColor>type to filter...</Text>
        </Box>
        <Box paddingX={1}>
          <Text color="cyan">{'\u276F'} {search}</Text>
        </Box>
        <Box flexDirection="column" paddingX={1}>
          {filtered.map((cmd, i) => (
            <Box key={cmd.value}>
              <Text color={i === selectedIndex ? 'cyan' : 'gray'}>
                {i === selectedIndex ? '\u25B8 ' : '  '}
              </Text>
              <Text color={i === selectedIndex ? 'cyan' : undefined}>
                {cmd.label}
              </Text>
              <Text dimColor> {'\u2014'} {cmd.description}</Text>
            </Box>
          ))}
          {filtered.length === 0 && (
            <Text dimColor>No matching commands</Text>
          )}
        </Box>
        <Box borderStyle="single" borderColor="gray" paddingX={1}>
          <Text dimColor>{'\u2191\u2193'} Navigate  Enter Select  Esc Close</Text>
        </Box>
      </Box>
    </Box>
  );
};

export default CommandPalette;
