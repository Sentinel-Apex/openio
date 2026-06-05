import { Command } from 'commander';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { logger } from '../utils/logger.js';
import { MemoryManager } from '@openio/memory';

export function registerMemory(program: Command): void {
  const mem = new MemoryManager({ dbPath: join(homedir(), '.openio', 'memory.db') });

  program
    .command('memory')
    .description('Memory and session management')
    .option('-l, --list', 'List recent sessions')
    .option('-s, --session <id>', 'Load a specific session')
    .option('-d, --delete <id>', 'Delete a session')
    .option('--search <query>', 'Search memory')
    .option('--stats', 'Show memory statistics')
    .action(async (opts) => {
      await mem.init();

      if (opts.stats) {
        const s = mem.stats();
        console.log(`  Sessions:    ${s.sessions}`);
        console.log(`  Messages:    ${s.messages}`);
        console.log(`  Vectors:     ${s.vectors}`);
        return;
      }

      if (opts.list) {
        const sessions = mem.sessions.list(20);
        if (sessions.length === 0) {
          logger.info('No sessions found');
          return;
        }
        logger.info('Recent sessions:');
        for (const s of sessions) {
          console.log(`  ${s.id.slice(0, 8)}...  ${s.title.padEnd(30)} ${new Date(s.updatedAt).toLocaleString()}`);
        }
        return;
      }

      if (opts.session) {
        const session = mem.sessions.load(opts.session);
        if (!session) { logger.error('Session not found'); return; }
        logger.info(`Session: ${session.title}`);
        logger.info(`Messages: ${session.messages.length}`);
        for (const m of session.messages.slice(-10)) {
          console.log(`  [${m.role}] ${m.content.slice(0, 80)}`);
        }
        return;
      }

      if (opts.delete) {
        mem.sessions.delete(opts.delete);
        logger.success(`Deleted session ${opts.delete.slice(0, 8)}...`);
        return;
      }

      if (opts.search) {
        try {
          const results = await mem.search(opts.search);
          if (results.length === 0) { logger.info('No results'); return; }
          logger.info(`Results: ${results.length}`);
          for (const r of results) {
            console.log(`  [${(r.score * 100).toFixed(0)}%] ${r.text.slice(0, 100)}`);
          }
        } catch (err) {
          logger.error('Search failed:', (err as Error).message);
        }
        return;
      }

      logger.info('Use --list, --session, --search, --stats, or --delete');
      mem.close();
    });
}
