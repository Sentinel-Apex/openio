import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Text, Box } from 'ink';
import TextInput from 'ink-text-input';

interface PromptInputProps {
  onSubmit: (value: string) => void;
  placeholder?: string;
  suggestions?: string[];
}

export const PromptInput: React.FC<PromptInputProps> = ({
  onSubmit,
  placeholder = 'Type a message...',
  suggestions = [],
}) => {
  const [value, setValue] = useState('');
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const inputRef = useRef<any>(null);

  const filtered = suggestions.filter((s) =>
    s.toLowerCase().startsWith(value.toLowerCase()),
  );

  const handleSubmit = useCallback(
    (input: string) => {
      const trimmed = input.trim();
      if (trimmed) {
        onSubmit(trimmed);
        setValue('');
        setSuggestionIndex(-1);
      }
    },
    [onSubmit],
  );

  const handleKeyDown = useCallback(
    (e: any) => {
      if (e.ctrlKey && e.key === 'l') {
        console.clear();
      }
      if (e.key === 'Tab' && filtered.length > 0) {
        e.preventDefault();
        const next = (suggestionIndex + 1) % filtered.length;
        setSuggestionIndex(next);
        setValue(filtered[next]);
      }
    },
    [filtered, suggestionIndex],
  );

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor="cyan" paddingX={1}>
        <Text color="cyan">❯ </Text>
        <TextInput
          ref={inputRef}
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          placeholder={placeholder}
        />
      </Box>
      {filtered.length > 0 && (
        <Box marginLeft={2} flexDirection="column">
          {filtered.slice(0, 5).map((s, i) => (
            <Text key={s} color={i === suggestionIndex ? 'cyan' : 'gray'}>
              {i === suggestionIndex ? '▸ ' : '  '}{s}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
};
