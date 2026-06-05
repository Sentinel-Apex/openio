import chalk from 'chalk';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_COLORS: Record<LogLevel, (s: string) => string> = {
  debug: chalk.gray,
  info: chalk.blue,
  warn: chalk.yellow,
  error: chalk.red,
};

function log(level: LogLevel, ...args: unknown[]): void {
  const color = LEVEL_COLORS[level];
  const prefix = color(`[${level.toUpperCase()}]`);
  const message = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  if (level === 'error') {
    console.error(`${prefix} ${message}`);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

export const logger = {
  debug: (...args: unknown[]) => log('debug', ...args),
  info: (...args: unknown[]) => log('info', ...args),
  warn: (...args: unknown[]) => log('warn', ...args),
  error: (...args: unknown[]) => log('error', ...args),
  success: (...args: unknown[]) => console.log(chalk.green('✓'), ...args),
  step: (msg: string) => console.log(chalk.cyan('→'), msg),
};
