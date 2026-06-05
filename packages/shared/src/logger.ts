import pino from 'pino';

let loggerInstance: pino.Logger | null = null;

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface LoggerOptions {
  level?: LogLevel;
  pretty?: boolean;
  name?: string;
}

export function createLogger(opts: LoggerOptions = {}): pino.Logger {
  const { level = 'info', pretty = false, name = 'openio' } = opts;

  const transport = pretty
    ? pino.transport({
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss.l' },
      })
    : undefined;

  return pino({ name, level, transport });
}

export function getLogger(): pino.Logger {
  if (!loggerInstance) {
    loggerInstance = createLogger();
  }
  return loggerInstance;
}

export function setLogger(logger: pino.Logger): void {
  loggerInstance = logger;
}

export { pino };
export type { pino as Logger };
