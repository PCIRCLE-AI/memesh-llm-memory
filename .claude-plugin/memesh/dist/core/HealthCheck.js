import { existsSync } from 'fs';
import { access, constants } from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';
import { SimpleConfig } from '../config/simple-config.js';
import { resolveUserPath } from '../utils/paths.js';
function normalizePath(rawPath) {
    if (rawPath === ':memory:' || rawPath.startsWith('file:')) {
        return rawPath;
    }
    return resolveUserPath(rawPath);
}
function getDatabasePath() {
    return normalizePath(SimpleConfig.DATABASE_PATH);
}
function getDatabaseDir() {
    const dbPath = getDatabasePath();
    if (dbPath === ':memory:' || dbPath.startsWith('file:')) {
        return null;
    }
    return path.dirname(dbPath);
}
export class HealthChecker {
    timeout;
    constructor(options = {}) {
        this.timeout = options.timeout || 5000;
    }
    async checkAll(options = {}) {
        const startTime = Date.now();
        try {
            const timeout = options.timeout || this.timeout;
            const skip = new Set(options.skip || []);
            const checks = [];
            if (!skip.has('database'))
                checks.push(() => this.checkDatabase(timeout));
            if (!skip.has('filesystem'))
                checks.push(() => this.checkFilesystem(timeout));
            if (!skip.has('memory'))
                checks.push(() => this.checkMemory(timeout));
            const components = await Promise.all(checks.map(check => check()));
            const unhealthyCount = components.filter(c => c.status === 'unhealthy').length;
            const degradedCount = components.filter(c => c.status === 'degraded').length;
            let status;
            let isHealthy;
            if (unhealthyCount > 0) {
                status = 'unhealthy';
                isHealthy = false;
            }
            else if (degradedCount > 0) {
                status = 'degraded';
                isHealthy = true;
            }
            else {
                status = 'healthy';
                isHealthy = true;
            }
            const summary = this.generateSummary(components);
            const totalDurationMs = Date.now() - startTime;
            const result = {
                status,
                isHealthy,
                components,
                summary,
                totalDurationMs,
                timestamp: new Date(),
            };
            logger.debug('Health check completed', {
                status,
                isHealthy,
                totalDurationMs,
                componentCount: components.length,
            });
            return result;
        }
        catch (error) {
            logger.error('Health check failed', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });
            return {
                status: 'unhealthy',
                isHealthy: false,
                components: [],
                summary: 'Health check failed with error',
                totalDurationMs: Date.now() - startTime,
                timestamp: new Date(),
            };
        }
    }
    async checkDatabase(timeout) {
        const startTime = Date.now();
        const name = 'database';
        try {
            const dbPath = getDatabasePath();
            if (dbPath === ':memory:' || dbPath.startsWith('file:')) {
                return this.createHealth(name, 'healthy', 'Database running in memory', startTime, { path: dbPath });
            }
            if (!existsSync(dbPath)) {
                return this.createHealth(name, 'degraded', 'Database file not found (will be created on first use)', startTime, { path: dbPath });
            }
            await Promise.race([
                access(dbPath, constants.R_OK | constants.W_OK),
                this.timeoutPromise(timeout, 'Database access timeout'),
            ]);
            return this.createHealth(name, 'healthy', 'Database accessible', startTime, { path: dbPath });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return this.createHealth(name, 'unhealthy', `Database check failed: ${message}`, startTime);
        }
    }
    async checkFilesystem(timeout) {
        const startTime = Date.now();
        const name = 'filesystem';
        try {
            const dataDir = getDatabaseDir();
            if (!dataDir) {
                return this.createHealth(name, 'healthy', 'Filesystem check skipped (in-memory database)', startTime);
            }
            if (!existsSync(dataDir)) {
                return this.createHealth(name, 'degraded', 'Data directory not found (will be created)', startTime, { path: dataDir });
            }
            await Promise.race([
                access(dataDir, constants.R_OK | constants.W_OK),
                this.timeoutPromise(timeout, 'Filesystem access timeout'),
            ]);
            return this.createHealth(name, 'healthy', 'Filesystem accessible', startTime, { path: dataDir });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return this.createHealth(name, 'unhealthy', `Filesystem check failed: ${message}`, startTime);
        }
    }
    async checkMemory(_timeout) {
        const startTime = Date.now();
        const name = 'memory';
        try {
            const memUsage = process.memoryUsage();
            const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
            const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
            const usagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
            let status = 'healthy';
            let message = `Memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent}%)`;
            if (usagePercent > 90) {
                status = 'unhealthy';
                message = `Critical memory usage: ${usagePercent}%`;
            }
            else if (usagePercent > 75) {
                status = 'degraded';
                message = `High memory usage: ${usagePercent}%`;
            }
            return this.createHealth(name, status, message, startTime, {
                heapUsedMB,
                heapTotalMB,
                usagePercent,
                rssMB: Math.round(memUsage.rss / 1024 / 1024),
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return this.createHealth(name, 'unknown', `Memory check failed: ${message}`, startTime);
        }
    }
    createHealth(name, status, message, startTime, details) {
        return {
            name,
            status,
            message,
            durationMs: Date.now() - startTime,
            details,
            timestamp: new Date(),
        };
    }
    timeoutPromise(ms, message) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error(message)), ms);
        });
    }
    generateSummary(components) {
        const healthy = components.filter(c => c.status === 'healthy').length;
        const degraded = components.filter(c => c.status === 'degraded').length;
        const unhealthy = components.filter(c => c.status === 'unhealthy').length;
        const total = components.length;
        if (unhealthy > 0) {
            return `${unhealthy}/${total} components unhealthy`;
        }
        if (degraded > 0) {
            return `${healthy}/${total} healthy, ${degraded} degraded`;
        }
        return `All ${total} components healthy`;
    }
}
export async function isSystemHealthy(options) {
    try {
        const checker = new HealthChecker();
        const health = await checker.checkAll(options);
        return health.isHealthy;
    }
    catch (error) {
        logger.error('System health check failed', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        return false;
    }
}
export function formatHealthStatus(health) {
    const lines = [];
    lines.push('');
    lines.push('╭─────────────────────────────────────────────────────╮');
    lines.push('│              SYSTEM HEALTH STATUS                   │');
    lines.push('╰─────────────────────────────────────────────────────╯');
    lines.push('');
    const statusIcon = {
        healthy: '✓',
        degraded: '⚠',
        unhealthy: '✗',
        unknown: '?',
    };
    const statusColor = {
        healthy: '\x1b[32m',
        degraded: '\x1b[33m',
        unhealthy: '\x1b[31m',
        unknown: '\x1b[90m',
    };
    const reset = '\x1b[0m';
    for (const component of health.components) {
        const icon = statusIcon[component.status];
        const color = statusColor[component.status];
        lines.push(`  ${color}${icon}${reset} ${component.name.padEnd(15)} ${component.message}`);
    }
    lines.push('');
    lines.push(`  Summary: ${health.summary}`);
    lines.push(`  Duration: ${health.totalDurationMs}ms`);
    lines.push('');
    return lines.join('\n');
}
export async function getHealthStatus(options) {
    try {
        const checker = new HealthChecker();
        const health = await checker.checkAll(options);
        return formatHealthStatus(health);
    }
    catch (error) {
        logger.error('Failed to get health status', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        return 'Error: Unable to retrieve health status';
    }
}
export default HealthChecker;
//# sourceMappingURL=HealthCheck.js.map