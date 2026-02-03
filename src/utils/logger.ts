/**
 * Winston Logger Configuration
 *
 * Provides structured logging with multiple transports (console, files) and
 * configurable log levels. Uses Winston logging framework for production-ready
 * logging with proper formatting, filtering, and file rotation support.
 *
 * Features:
 * - Multiple log levels (ERROR, WARN, INFO, DEBUG)
 * - Console output with colorized formatting
 * - File output with JSON formatting
 * - Separate error log file
 * - Dynamic log level configuration
 * - Metadata support for structured logging
 *
 * Log Files:
 * - logs/error.log: Error level logs only
 * - logs/combined.log: All logs (all levels)
 *
 * @example
 * ```typescript
 * import { logger, setLogLevel, LogLevel } from './logger.js';
 *
 * // Basic logging
 * logger.info('Server started', { port: 3000 });
 * logger.error('Database connection failed', { error: 'ECONNREFUSED' });
 *
 * // Change log level dynamically
 * setLogLevel(LogLevel.DEBUG);
 *
 * // Using convenience methods
 * import { log } from './logger.js';
 * log.info('User logged in', { userId: 123 });
 * log.warn('Rate limit approaching', { current: 90, limit: 100 });
 * ```
 */

import winston from 'winston';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { getTraceContext } from './tracing/index.js';
import { looksLikeSensitive, hashValue } from '../telemetry/sanitization.js';

/**
 * Log severity levels
 *
 * Ordered from most to least severe:
 * - ERROR: Application errors, failures
 * - WARN: Warning conditions, potential issues
 * - INFO: Informational messages, normal operations
 * - DEBUG: Detailed debugging information
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

/**
 * Sanitize a single string value, redacting sensitive patterns.
 *
 * Uses the same detection logic as the telemetry sanitization module
 * (Bearer tokens, API keys, JWTs, connection strings, PII, etc.)
 * to prevent accidental leakage of secrets into log output.
 *
 * @param value - String to sanitize
 * @returns Sanitized string with sensitive data replaced by [REDACTED:hash]
 *
 * @private
 * @internal
 */
function sanitizeString(value: string): string {
  if (!value || value.length < 8) return value; // Short strings cannot match sensitive patterns
  if (looksLikeSensitive(value)) {
    return `[REDACTED:${hashValue(value)}]`;
  }
  return value;
}

/**
 * Recursively sanitize all string values in a log info object.
 *
 * Handles nested objects and arrays. Uses a visited set to prevent
 * infinite loops on circular references. Skips well-known Winston
 * metadata fields (level, timestamp) to avoid interfering with formatting.
 *
 * @param obj - Object to sanitize
 * @param visited - Set of already-visited objects (circular reference guard)
 * @returns New object with sensitive string values redacted
 *
 * @private
 * @internal
 */
function sanitizeLogData(obj: unknown, visited = new WeakSet<object>()): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return sanitizeString(obj);
  if (typeof obj !== 'object') return obj;

  if (visited.has(obj as object)) return '[Circular]';
  visited.add(obj as object);

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeLogData(item, visited));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    // Skip Winston internal metadata fields to avoid breaking formatting
    if (key === 'level' || key === 'timestamp') {
      sanitized[key] = value;
      continue;
    }
    sanitized[key] = sanitizeLogData(value, visited);
  }
  return sanitized;
}

/**
 * Winston format that redacts sensitive data from all log entries.
 *
 * Applied at the logger level so it protects all transports (console, files).
 * Reuses the pattern detection from src/telemetry/sanitization.ts which covers:
 * - Bearer tokens, API keys (sk-*, ghp_*, AKIA*, AIza*, etc.)
 * - JWT tokens
 * - Database connection strings
 * - PII (emails, SSN, credit card numbers, phone numbers)
 * - Private keys and certificates
 * - File paths containing usernames
 */
const sensitiveDataFilter = winston.format((info) => {
  // Sanitize the message field
  if (typeof info.message === 'string') {
    info.message = sanitizeString(info.message);
  }

  // Sanitize all other metadata fields
  for (const key of Object.keys(info)) {
    if (key === 'level' || key === 'message' || key === 'timestamp') continue;
    info[key] = sanitizeLogData(info[key]);
  }

  return info;
});

// Custom format for console output with trace context
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    // Inject trace context if available
    const traceContext = getTraceContext();
    const traceInfo = traceContext
      ? `[TraceID: ${traceContext.traceId}] [SpanID: ${traceContext.spanId}] `
      : '';

    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} ${traceInfo}[${level}]: ${message} ${metaStr}`;
  })
);

// Custom format for file output (JSON) with trace context
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format((info) => {
    // Inject trace context into log entry
    const traceContext = getTraceContext();
    if (traceContext) {
      return {
        ...info,
        traceId: traceContext.traceId,
        spanId: traceContext.spanId,
        parentSpanId: traceContext.parentSpanId,
      };
    }
    return info;
  })(),
  winston.format.json()
);

function buildFileTransports(): winston.transport[] {
  const logDir = path.join(process.cwd(), 'logs');

  try {
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }
  } catch (error) {
    // Fall back to console-only logging if filesystem is not writable.
    console.warn('Logger: failed to create logs directory, using console-only logging');
    return [];
  }

  return [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: LogLevel.ERROR,
      format: fileFormat,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
    }),
  ];
}

/**
 * Winston logger instance
 *
 * Configured with multiple transports:
 * - Console: Colorized output with timestamps
 * - File: JSON format for error and combined logs (if available)
 *
 * Default log level: INFO (configurable via LOG_LEVEL env var)
 *
 * @example
 * ```typescript
 * import { logger } from './logger.js';
 *
 * logger.info('Server starting...', { port: 3000, env: 'production' });
 * logger.error('Failed to connect to database', {
 *   error: 'ECONNREFUSED',
 *   host: 'localhost',
 *   port: 5432
 * });
 * logger.debug('Processing request', {
 *   method: 'POST',
 *   path: '/api/users',
 *   duration: 45
 * });
 * ```
 */
/**
 * Build logger transports based on MCP server mode
 *
 * In MCP server mode, disable console logging to prevent stdout pollution
 * that interferes with JSON-RPC stdio communication.
 */
function buildTransports(): winston.transport[] {
  const transports: winston.transport[] = [];

  // Only enable console transport when NOT in MCP server mode
  // MCP servers use stdio for JSON-RPC, so console output breaks communication
  const isMCPServerMode = process.env.MCP_SERVER_MODE === 'true';

  if (!isMCPServerMode) {
    transports.push(
      new winston.transports.Console({
        format: consoleFormat,
      })
    );
  }

  // Always include file transports for debugging
  transports.push(...buildFileTransports());

  return transports;
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || LogLevel.INFO,
  // Apply sensitive data sanitization before any transport receives the log entry.
  // This ensures secrets are redacted in both console and file output.
  format: sensitiveDataFilter(),
  transports: buildTransports(),
});

/**
 * Dynamically change the logger's minimum log level
 *
 * Affects all transports. Useful for enabling debug logging at runtime
 * without restarting the application.
 *
 * @param level - New minimum log level
 *
 * @example
 * ```typescript
 * import { setLogLevel, LogLevel } from './logger.js';
 *
 * // Enable debug logging for troubleshooting
 * setLogLevel(LogLevel.DEBUG);
 *
 * // Production: only errors and warnings
 * setLogLevel(LogLevel.WARN);
 * ```
 */
export function setLogLevel(level: LogLevel): void {
  logger.level = level;
}

/**
 * Convenience logging methods with proper TypeScript typing
 *
 * Provides type-safe wrappers around the logger instance.
 * Useful for importing specific log methods instead of the entire logger.
 *
 * @example
 * ```typescript
 * import { log } from './logger.js';
 *
 * log.info('User authenticated', { userId: 123, method: 'oauth' });
 * log.warn('Rate limit exceeded', { ip: '192.168.1.1', limit: 100 });
 * log.error('Payment processing failed', {
 *   orderId: 'ORD-123',
 *   error: 'insufficient_funds'
 * });
 * log.debug('Cache hit', { key: 'user:123', ttl: 3600 });
 * ```
 */
export const log = {
  info: (message: string, meta?: Record<string, unknown>) => logger.info(message, meta),
  error: (message: string, meta?: Record<string, unknown>) => logger.error(message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => logger.warn(message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => logger.debug(message, meta),
};
