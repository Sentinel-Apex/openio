import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

export const OPENIO_DIR = join(homedir(), '.openio');
export const CONFIG_PATH = join(OPENIO_DIR, 'config.json');
export const MEMORY_DB_PATH = join(OPENIO_DIR, 'memory.db');
export const LOGS_DIR = join(OPENIO_DIR, 'logs');
export const SESSIONS_DIR = join(OPENIO_DIR, 'sessions');

export function resolvePath(p: string): string {
  if (resolve(p) === p) return p;
  return resolve(process.cwd(), p);
}
