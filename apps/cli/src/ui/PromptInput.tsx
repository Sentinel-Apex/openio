import React, { useState, useCallback } from 'react';
import { Text, Box, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { THEME_CYAN, THEME_DIM } from '../utils/theme.js';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  suggestions?: string[];
  isDisabled?: boolean;
  isFocused?: boolean;
}

export const PromptInput: React.FC<PromptInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Type a message...',
  suggestions = [],
  isDisabled = false,
  isFocused = true,
}) => {
  const [suggestionIndex, setSuggestionIndex] = useState(-1);

  const filtered = suggestions.filter((s) =>
    s.toLowerCase().startsWith(value.toLowerCase()),
  );

  const handleSubmit = useCallback(
    (input: string) => {
      const trimmed = input.trim();
      if (trimmed) {
        onSubmit(trimmed);
        setSuggestionIndex(-1);
      }
    },
    [onSubmit],
  );

  useInput(
    (input, key) => {
      if (!isFocused || isDisabled) return;
      if (key.tab && filtered.length > 0) {
        const next = (suggestionIndex + 1) % filtered.length;
        setSuggestionIndex(next);
        onChange(filtered[next]);
      }
    },
    { isActive: isFocused && !isDisabled },
  );

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor="cyan" paddingX={1}>
        <Text color="cyan">{'\u276F'} </Text>
        <Box flexGrow={1}>
          <TextInput
            value={value}
            onChange={onChange}
            onSubmit={handleSubmit}
            placeholder={placeholder}
          />
        </Box>
      </Box>
      {filtered.length > 0 && (
        <Box marginLeft={2} flexDirection="column">
          {filtered.slice(0, 5).map((s, i) => (
            <Text key={s} color={i === suggestionIndex ? 'cyan' : 'gray'}>
              {i === suggestionIndex ? '\u25B8 ' : '  '}{s}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default PromptInput;
