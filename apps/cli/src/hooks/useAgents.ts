import { useState, useEffect, useCallback } from 'react';
import type { AgentCapability } from '@openio/agents';
import { agentRegistry, ManagerAgent, BackendAgent, FrontendAgent, DatabaseAgent, DevOpsAgent, SecurityAgent, TestingAgent, ResearchAgent, CodeReviewAgent } from '@openio/agents';

interface UseAgentsReturn {
  agents: AgentCapability[];
  selectedAgent: string | null;
  selectAgent: (role: string) => void;
  isLoading: boolean;
}

const ALL_AGENTS = [
  new ManagerAgent(), new BackendAgent(), new FrontendAgent(),
  new DatabaseAgent(), new DevOpsAgent(), new SecurityAgent(),
  new TestingAgent(), new ResearchAgent(), new CodeReviewAgent(),
];

export function useAgents(): UseAgentsReturn {
  const [agents, setAgents] = useState<AgentCapability[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isLoading] = useState(false);

  useEffect(() => {
    for (const a of ALL_AGENTS) agentRegistry.register(a);
    setAgents(agentRegistry.listCapabilities());
    if (agentRegistry.list().length > 0) {
      setSelectedAgent(agentRegistry.list()[0].role);
    }
  }, []);

  const selectAgent = useCallback((role: string) => {
    setSelectedAgent(role);
  }, []);

  return { agents, selectedAgent, selectAgent, isLoading };
}
