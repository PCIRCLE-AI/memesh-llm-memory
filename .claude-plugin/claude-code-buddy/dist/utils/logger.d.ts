import winston from 'winston';
export declare enum LogLevel {
    ERROR = "error",
    WARN = "warn",
    INFO = "info",
    DEBUG = "debug"
}
export declare const logger: winston.Logger;
export declare function setLogLevel(level: LogLevel): void;
export declare const log: {
    info: (message: string, meta?: Record<string, unknown>) => winston.Logger;
    error: (message: string, meta?: Record<string, unknown>) => winston.Logger;
    warn: (message: string, meta?: Record<string, unknown>) => winston.Logger;
    debug: (message: string, meta?: Record<string, unknown>) => winston.Logger;
};
//# sourceMappingURL=logger.d.ts.map