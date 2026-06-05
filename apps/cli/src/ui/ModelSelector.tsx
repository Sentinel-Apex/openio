import React, { useState, useEffect } from 'react';
import { Text, Box } from 'ink';
import { modelRegistry, loadModels, providerManager, OpenAIProvider, AnthropicProvider, OllamaProvider } from '@openio/ai';

interface ModelSelectorProps {
  onSelect: (modelId: string) => void;
  provider?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ onSelect, provider }) => {
  const [models, setModels] = useState(() =>
    provider ? modelRegistry.getByProvider(provider) : modelRegistry.getAll(),
  );
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    providerManager.registerProvider('openai', new OpenAIProvider());
    providerManager.registerProvider('anthropic', new AnthropicProvider());
    providerManager.registerProvider('ollama', new OllamaProvider());
    loadModels().then(() => {
      setModels(provider ? modelRegistry.getByProvider(provider) : modelRegistry.getAll());
    });
  }, [provider]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Select Model:</Text>
      {models.slice(0, 20).map((m, i) => (
        <Box key={m.id}>
          <Text color={i === selectedIdx ? 'cyan' : 'gray'}>
            {i === selectedIdx ? '▸ ' : '  '}{m.id}
          </Text>
          <Text dim> ({m.provider})</Text>
        </Box>
      ))}
    </Box>
  );
};
