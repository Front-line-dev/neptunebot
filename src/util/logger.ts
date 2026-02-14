export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type Logger = {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

const levelRank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function nowIso(): string {
  return new Date().toISOString();
}

export function createLogger(level: LogLevel): Logger {
  const minRank = levelRank[level] ?? levelRank.info;

  function logAt(lvl: LogLevel, ...args: unknown[]): void {
    if (levelRank[lvl] < minRank) return;
    // eslint-disable-next-line no-console
    console.log(`[${nowIso()}] [${lvl.toUpperCase()}]`, ...args);
  }

  return {
    debug: (...args) => logAt('debug', ...args),
    info: (...args) => logAt('info', ...args),
    warn: (...args) => logAt('warn', ...args),
    error: (...args) => logAt('error', ...args),
  };
}

