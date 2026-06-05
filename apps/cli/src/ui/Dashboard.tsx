import React, { useEffect, useState } from 'react';
import { Text, Box } from 'ink';
import { Header } from './Header.js';
import { LoadingSpinner } from './LoadingSpinner.js';
import { providerManager, OpenAIProvider, AnthropicProvider, OllamaProvider, modelRegistry, loadModels } from '@openio/ai';

interface DashboardStats {
  models: number;
  providers: number;
  sessions: number;
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    providerManager.registerProvider('openai', new OpenAIProvider());
    providerManager.registerProvider('anthropic', new AnthropicProvider());
    providerManager.registerProvider('ollama', new OllamaProvider());
    loadModels().then(() => {
      setStats({
        models: modelRegistry.size,
        providers: providerManager.listProviders().length,
        sessions: 0,
      });
    });
  }, []);

  if (!stats) return <LoadingSpinner text="Loading dashboard..." />;

  return (
    <Box flexDirection="column">
      <Header title="Dashboard" />
      <Box flexDirection="column" padding={2}>
        <Text bold>OpenIO Dashboard</Text>
        <Box marginTop={1}>
          <Text>Models:    </Text>
          <Text color="cyan">{stats.models}</Text>
        </Box>
        <Box>
          <Text>Providers: </Text>
          <Text color="green">{stats.providers}</Text>
        </Box>
        <Box>
          <Text>Providers: </Text>
          <Text color="yellow">{providerManager.listProviders().join(', ')}</Text>
        </Box>
        <Box marginTop={1}>
          <Text dim>Use /chat to start a conversation</Text>
        </Box>
      </Box>
    </Box>
  );
};
