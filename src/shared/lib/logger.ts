type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  namespace: string;
  message: string;
  data?: unknown;
  timestamp: string;
}

// Check environment
const isDev = import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development';
const isDebugEnabled = isDev || import.meta.env.VITE_DEBUG === 'true';

// Log levels priority
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Minimum log level (can be configured via env)
const MIN_LOG_LEVEL: LogLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) || (isDev ? 'debug' : 'warn');

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

function formatLog(entry: LogEntry): string {
  const { level, namespace, message, data } = entry;
  const prefix = `[${namespace}] [${level.toUpperCase()}]`;
  if (data !== undefined) {
    // In production, don't log sensitive data
    if (!isDev && typeof data === 'object') {
      return `${prefix} ${message} [data hidden in production]`;
    }
    return `${prefix} ${message}`;
  }
  return `${prefix} ${message}`;
}

function createLogEntry(level: LogLevel, namespace: string, message: string, data?: unknown): LogEntry {
  return {
    level,
    namespace,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a namespaced logger for a specific module/service
 */
export function createLogger(namespace: string) {
  return {
    debug(message: string, data?: unknown) {
      if (isDebugEnabled && shouldLog('debug')) {
        const entry = createLogEntry('debug', namespace, message, data);
        console.debug(formatLog(entry), data !== undefined ? data : '');
      }
    },

    info(message: string, data?: unknown) {
      if (shouldLog('info')) {
        const entry = createLogEntry('info', namespace, message, data);
        console.info(formatLog(entry), data !== undefined ? data : '');
      }
    },

    warn(message: string, data?: unknown) {
      if (shouldLog('warn')) {
        const entry = createLogEntry('warn', namespace, message, data);
        console.warn(formatLog(entry), data !== undefined ? data : '');
      }
    },

    error(message: string, error?: unknown) {
      if (shouldLog('error')) {
        const entry = createLogEntry('error', namespace, message, error);
        console.error(formatLog(entry), error !== undefined ? error : '');
      }
    },
  };
}

// Default logger for general use
export const logger = createLogger('App');
