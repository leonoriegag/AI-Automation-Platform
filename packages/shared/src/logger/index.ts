const SENSITIVE_KEYS = new Set([
  'password',
  'secret',
  'authorization',
  'cookie',
  'apikey',
  'api_key',
  'token',
  'jwt',
  'masterkey',
  'encryption_master_key'
]);

function redact(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => redact(item));
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redact(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, error?: Error | unknown, context?: Record<string, any>): void;
}

export class StructuredLogger implements Logger {
  private level: LogLevel;

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  private shouldLog(targetLevel: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(targetLevel) >= levels.indexOf(this.level);
  }

  private format(level: LogLevel, message: string, extra?: Record<string, any>): string {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(extra ? redact(extra) : {})
    };
    return JSON.stringify(payload);
  }

  debug(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('debug')) {
      console.debug(this.format('debug', message, context));
    }
  }

  info(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('info')) {
      console.info(this.format('info', message, context));
    }
  }

  warn(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('warn')) {
      console.warn(this.format('warn', message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: Record<string, any>): void {
    if (this.shouldLog('error')) {
      const errContext = {
        ...context,
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error
      };
      console.error(this.format('error', message, errContext));
    }
  }
}

export const logger = new StructuredLogger(
  (process.env.LOG_LEVEL as LogLevel) || 'info'
);
