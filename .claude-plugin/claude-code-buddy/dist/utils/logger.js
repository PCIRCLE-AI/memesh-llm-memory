import winston from 'winston';
export var LogLevel;
(function (LogLevel) {
    LogLevel["ERROR"] = "error";
    LogLevel["WARN"] = "warn";
    LogLevel["INFO"] = "info";
    LogLevel["DEBUG"] = "debug";
})(LogLevel || (LogLevel = {}));
const consoleFormat = winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston.format.colorize(), winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
}));
const fileFormat = winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json());
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || LogLevel.INFO,
    transports: [
        new winston.transports.Console({
            format: consoleFormat,
        }),
        new winston.transports.File({
            filename: 'logs/error.log',
            level: LogLevel.ERROR,
            format: fileFormat,
        }),
        new winston.transports.File({
            filename: 'logs/combined.log',
            format: fileFormat,
        }),
    ],
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