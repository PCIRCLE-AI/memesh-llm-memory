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

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Custom format for file output (JSON)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Winston logger instance
 *
 * Configured with multiple transports:
 * - Console: Colorized output with timestamps
 * - Error file: JSON format, ERROR level only
 * - Combined file: JSON format, all levels
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
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || LogLevel.INFO,
  transports: [
    // Console transport (pretty format)
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: LogLevel.ERROR,
      format: fileFormat,
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: fileFormat,
    }),
  ],
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
