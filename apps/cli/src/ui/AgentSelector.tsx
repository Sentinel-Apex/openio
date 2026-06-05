import React, { useState } from 'react';
import { Text, Box } from 'ink';
import { agentRegistry, ManagerAgent, BackendAgent, FrontendAgent, DatabaseAgent, DevOpsAgent, SecurityAgent, TestingAgent, ResearchAgent, CodeReviewAgent } from '@openio/agents';

interface AgentSelectorProps {
  onSelect: (role: string) => void;
}

const ALL_AGENTS = [
  new ManagerAgent(), new BackendAgent(), new FrontendAgent(),
  new DatabaseAgent(), new DevOpsAgent(), new SecurityAgent(),
  new TestingAgent(), new ResearchAgent(), new CodeReviewAgent(),
];

export const AgentSelector: React.FC<AgentSelectorProps> = ({ onSelect }) => {
  const [selectedIdx, setSelectedIdx] = useState(0);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Select Agent:</Text>
      {ALL_AGENTS.map((a, i) => (
        <Box key={a.role}>
          <Text color={i === selectedIdx ? 'green' : 'gray'}>
            {i === selectedIdx ? '▸ ' : '  '}
          </Text>
          <Text color={i === selectedIdx ? 'green' : undefined}>
            {a.role}
          </Text>
          <Text dim> — {a.description}</Text>
        </Box>
      ))}
    </Box>
  );
};
