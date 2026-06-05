import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import { mcpRegistry } from '@openio/mcp';
import { loadCLIConfig, saveCLIConfig } from '../utils/config.js';
import { askInput, askConfirm } from '../utils/prompt.js';

export function registerMCP(program: Command): void {
  program
    .command('mcp')
    .description('MCP server management')
    .option('-l, --list', 'List MCP servers')
    .option('--add', 'Add a new MCP server')
    .option('--remove <id>', 'Remove an MCP server')
    .option('--connect <id>', 'Connect to an MCP server')
    .option('--disconnect <id>', 'Disconnect an MCP server')
    .option('--tools', 'List tools from all connected servers')
    .action(async (opts) => {
      const config = loadCLIConfig();

      if (opts.add) {
        const id = await askInput('Server ID');
        const transport = await askInput('Transport (stdio/sse/ws)', { default: 'stdio' });
        const target = await askInput('Target (command or URL)');
        const args = await askInput('Arguments (comma-separated, optional)');

        config.mcpServers.push({
          id,
          transport,
          target,
          args: args ? args.split(',').map((s: string) => s.trim()) : undefined,
        });
        saveCLIConfig(config);
        logger.success(`Added MCP server: ${id}`);
        return;
      }

      if (opts.remove) {
        config.mcpServers = config.mcpServers.filter((s) => s.id !== opts.remove);
        saveCLIConfig(config);
        logger.success(`Removed MCP server: ${opts.remove}`);
        return;
      }

      for (const s of config.mcpServers) {
        await mcpRegistry.register({ id: s.id, name: s.id, transport: s.transport as any, target: s.target, args: s.args, enabled: true });
      }

      if (opts.connect) {
        await mcpRegistry.connect(opts.connect);
        logger.success(`Connected to ${opts.connect}`);
        return;
      }

      if (opts.disconnect) {
        await mcpRegistry.disconnect(opts.disconnect);
        logger.success(`Disconnected from ${opts.disconnect}`);
        return;
      }

      if (opts.tools) {
        await mcpRegistry.connectAll();
        const tools = mcpRegistry.listAllTools();
        if (tools.length === 0) { logger.info('No tools found'); return; }
        logger.info('Available MCP tools:');
        for (const { serverId, tool } of tools) {
          console.log(`  ${serverId}:${tool.name} — ${tool.description ?? 'no description'}`);
        }
        return;
      }

      const servers = mcpRegistry.listServers();
      if (servers.length === 0) {
        logger.info('No MCP servers configured. Use --add to add one.');
        return;
      }
      logger.info('MCP servers:');
      for (const s of servers) {
        console.log(`  ${s.id.padEnd(15)} ${s.transport.padEnd(6)} ${s.target} ${s.connected ? '[connected]' : '[disconnected]'} (${s.toolCount} tools)`);
      }
    });
}
