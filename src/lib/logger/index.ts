/**
 * Simple Logger with request ID tracking
 *
 * Production-ready logging with structured output.
 * Can be swapped for winston/pino later.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  service?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLevel(): LogLevel {
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env && env in LOG_LEVEL_PRIORITY) {
    return env as LogLevel;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[getMinLevel()];
}

function formatLog(entry: LogEntry): string {
  if (process.env.LOG_FORMAT === "json") {
    return JSON.stringify(entry);
  }

  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
  const service = entry.context?.service ? `[${entry.context.service}]` : "";
  const reqId = entry.context?.requestId ? `(${entry.context.requestId})` : "";

  let line = `${prefix}${service}${reqId} ${entry.message}`;

  if (entry.error) {
    line += ` | Error: ${entry.error.message}`;
  }

  // Add extra context
  if (entry.context) {
    const extras = Object.entries(entry.context)
      .filter(([k]) => k !== "requestId" && k !== "service")
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(" ");
    if (extras) {
      line += ` | ${extras}`;
    }
  }

  return line;
}

function log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    error: error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined,
  };

  const formatted = formatLog(entry);

  switch (level) {
    case "error":
      console.error(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "debug":
      console.debug(formatted);
      break;
    default:
      console.log(formatted);
  }
}

/**
 * Create a logger instance with bound context
 */
export function createLogger(baseContext: LogContext = {}) {
  return {
    debug: (message: string, context?: LogContext) =>
      log("debug", message, { ...baseContext, ...context }),

    info: (message: string, context?: LogContext) =>
      log("info", message, { ...baseContext, ...context }),

    warn: (message: string, context?: LogContext, error?: Error) =>
      log("warn", message, { ...baseContext, ...context }, error),

    error: (message: string, context?: LogContext, error?: Error) =>
      log("error", message, { ...baseContext, ...context }, error),

    child: (childContext: LogContext) =>
      createLogger({ ...baseContext, ...childContext }),
  };
}

export type Logger = ReturnType<typeof createLogger>;

/**
 * Default logger instance
 */
export const logger = createLogger();

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
