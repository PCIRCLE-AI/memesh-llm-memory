import winston from 'winston';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { getTraceContext } from './tracing/index.js';
export var LogLevel;
(function (LogLevel) {
    LogLevel["ERROR"] = "error";
    LogLevel["WARN"] = "warn";
    LogLevel["INFO"] = "info";
    LogLevel["DEBUG"] = "debug";
})(LogLevel || (LogLevel = {}));
const consoleFormat = winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston.format.colorize(), winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const traceContext = getTraceContext();
    const traceInfo = traceContext
        ? `[TraceID: ${traceContext.traceId}] [SpanID: ${traceContext.spanId}] `
        : '';
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} ${traceInfo}[${level}]: ${message} ${metaStr}`;
}));
const fileFormat = winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format((info) => {
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
})(), winston.format.json());
function buildFileTransports() {
    const logDir = path.join(process.cwd(), 'logs');
    try {
        if (!existsSync(logDir)) {
            mkdirSync(logDir, { recursive: true });
        }
    }
    catch (error) {
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
function buildTransports() {
    const transports = [];
    const isMCPServerMode = process.env.MCP_SERVER_MODE === 'true';
    if (!isMCPServerMode) {
        transports.push(new winston.transports.Console({
            format: consoleFormat,
        }));
    }
    transports.push(...buildFileTransports());
    return transports;
}
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || LogLevel.INFO,
    transports: buildTransports(),
});
export function setLogLevel(level) {
    logger.level = level;
}
export const log = {
    info: (message, meta) => logger.info(message, meta),
    error: (message, meta) => logger.error(message, meta),
    warn: (message, meta) => logger.warn(message, meta),
    debug: (message, meta) => logger.debug(message, meta),
};
//# sourceMappingURL=logger.js.map