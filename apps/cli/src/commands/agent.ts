import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import { agentRegistry, AgentRouter, ManagerAgent, BackendAgent, FrontendAgent, DatabaseAgent, DevOpsAgent, SecurityAgent, TestingAgent, ResearchAgent, CodeReviewAgent } from '@openio/agents';
import { providerManager, OpenAIProvider } from '@openio/ai';

function registerAllAgents(): void {
  agentRegistry.register(new ManagerAgent());
  agentRegistry.register(new BackendAgent());
  agentRegistry.register(new FrontendAgent());
  agentRegistry.register(new DatabaseAgent());
  agentRegistry.register(new DevOpsAgent());
  agentRegistry.register(new SecurityAgent());
  agentRegistry.register(new TestingAgent());
  agentRegistry.register(new ResearchAgent());
  agentRegistry.register(new CodeReviewAgent());
}

export function registerAgent(program: Command): void {
  program
    .command('agent')
    .description('Agent management and execution')
    .argument('[task]', 'Task to delegate to an agent')
    .option('-r, --role <role>', 'Agent role to use')
    .option('-l, --list', 'List available agents')
    .action(async (task, opts) => {
      registerAllAgents();

      if (opts.list) {
        const caps = agentRegistry.listCapabilities();
        logger.info('Available agents:');
        for (const c of caps) {
          console.log(`  ${c.role.padEnd(15)} ${c.description}`);
        }
        return;
      }

      providerManager.registerProvider('openai', new OpenAIProvider());

      if (opts.role) {
        const router = new AgentRouter(agentRegistry);
        const result = await router.route({ task }, opts.role);
        console.log(result.output);
        if (result.error) logger.error(result.error);
      } else {
        logger.info('Use --role to specify an agent or --list to see available agents');
      }
    });
}
