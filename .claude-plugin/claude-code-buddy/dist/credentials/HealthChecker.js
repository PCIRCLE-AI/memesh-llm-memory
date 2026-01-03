import { logger } from '../utils/logger.js';
export var HealthStatus;
(function (HealthStatus) {
    HealthStatus["HEALTHY"] = "healthy";
    HealthStatus["DEGRADED"] = "degraded";
    HealthStatus["UNHEALTHY"] = "unhealthy";
    HealthStatus["CRITICAL"] = "critical";
})(HealthStatus || (HealthStatus = {}));
const DEFAULT_CONFIG = {
    checkInterval: 60,
    performanceThresholds: {
        maxQueryTimeMs: 100,
        minCacheHitRate: 0.8,
        maxDatabaseSizeMB: 1024,
    },
    componentTimeouts: {
        database: 5000,
        rotation: 3000,
        expiration: 3000,
        usage: 3000,
    },
};
export class HealthChecker {
    db;
    rotationService;
    expirationMonitor;
    usageTracker;
    config;
    startTime;
    version;
    checkTimer = null;
    lastHealthCheck;
    constructor(db, config = {}, version = '1.0.0') {
        this.db = db;
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.startTime = new Date();
        this.version = version;
    }
    registerServices(services) {
        this.rotationService = services.rotationService;
        this.expirationMonitor = services.expirationMonitor;
        this.usageTracker = services.usageTracker;
        logger.info('Health checker services registered', {
            rotation: !!this.rotationService,
            expiration: !!this.expirationMonitor,
            usage: !!this.usageTracker,
        });
    }
    async checkHealth() {
        const components = [];
        components.push(await this.checkDatabaseHealth());
        if (this.rotationService) {
            components.push(await this.checkRotationServiceHealth());
        }
        if (this.expirationMonitor) {
            components.push(await this.checkExpirationMonitorHealth());
        }
        if (this.usageTracker) {
            components.push(await this.checkUsageTrackerHealth());
        }
        const overallStatus = this.determineOverallStatus(components);
        const health = {
            status: overallStatus,
            components,
            timestamp: new Date(),
            uptime: Date.now() - this.startTime.getTime(),
            version: this.version,
        };
        this.lastHealthCheck = health;
        logger.info('Health check completed', {
            status: overallStatus,
            componentsChecked: components.length,
        });
        return health;
    }
    async checkDatabaseHealth() {
        const startTime = Date.now();
        try {
            const result = this.db.prepare('SELECT 1 as test').get();
            if (result.test !== 1) {
                return {
                    name: 'database',
                    status: HealthStatus.CRITICAL,
                    message: 'Database query returned unexpected result',
                    responseTimeMs: Date.now() - startTime,
                    lastChecked: new Date(),
                };
            }
            const stats = this.getDatabaseStats();
            const responseTime = Date.now() - startTime;
            const status = responseTime > this.config.performanceThresholds.maxQueryTimeMs
                ? HealthStatus.DEGRADED
                : HealthStatus.HEALTHY;
            return {
                name: 'database',
                status,
                message: 'Database is operational',
                details: {
                    responseTimeMs: responseTime,
                    ...stats,
                },
                responseTimeMs: responseTime,
                lastChecked: new Date(),
            };
        }
        catch (error) {
            return {
                name: 'database',
                status: HealthStatus.CRITICAL,
                message: `Database error: ${error.message}`,
                responseTimeMs: Date.now() - startTime,
                lastChecked: new Date(),
            };
        }
    }
    async checkRotationServiceHealth() {
        const startTime = Date.now();
        try {
            if (!this.rotationService) {
                return {
                    name: 'rotation_service',
                    status: HealthStatus.UNHEALTHY,
                    message: 'Rotation service not registered',
                    lastChecked: new Date(),
                };
            }
            const stats = this.rotationService.getStats();
            const failureRate = stats.totalRotations > 0 ? stats.failedRotations / stats.totalRotations : 0;
            let status = HealthStatus.HEALTHY;
            let message = 'Rotation service is operational';
            if (failureRate > 0.5) {
                status = HealthStatus.CRITICAL;
                message = `High rotation failure rate: ${(failureRate * 100).toFixed(1)}%`;
            }
            else if (failureRate > 0.2) {
                status = HealthStatus.DEGRADED;
                message = `Elevated rotation failure rate: ${(failureRate * 100).toFixed(1)}%`;
            }
            const schedulerRunning = this.rotationService.isSchedulerRunning();
            if (!schedulerRunning && stats.credentialsNeedingRotation > 0) {
                status = HealthStatus.DEGRADED;
                message = 'Rotation scheduler not running but credentials need rotation';
            }
            return {
                name: 'rotation_service',
                status,
                message,
                details: {
                    totalRotations: stats.totalRotations,
                    successfulRotations: stats.successfulRotations,
                    failedRotations: stats.failedRotations,
                    failureRate: (failureRate * 100).toFixed(1) + '%',
                    credentialsNeedingRotation: stats.credentialsNeedingRotation,
                    schedulerRunning,
                },
                responseTimeMs: Date.now() - startTime,
                lastChecked: new Date(),
            };
        }
        catch (error) {
            return {
                name: 'rotation_service',
                status: HealthStatus.UNHEALTHY,
                message: `Rotation service error: ${error.message}`,
                responseTimeMs: Date.now() - startTime,
                lastChecked: new Date(),
            };
        }
    }
    async checkExpirationMonitorHealth() {
        const startTime = Date.now();
        try {
            if (!this.expirationMonitor) {
                return {
                    name: 'expiration_monitor',
                    status: HealthStatus.UNHEALTHY,
                    message: 'Expiration monitor not registered',
                    lastChecked: new Date(),
                };
            }
            const stats = this.expirationMonitor.getStats();
            let status = HealthStatus.HEALTHY;
            let message = 'Expiration monitor is operational';
            if (stats.expiringCritical > 0) {
                status = HealthStatus.CRITICAL;
                message = `${stats.expiringCritical} credentials expiring within 24 hours`;
            }
            else if (stats.expiringHigh > 5) {
                status = HealthStatus.DEGRADED;
                message = `${stats.expiringHigh} credentials expiring within 3 days`;
            }
            else if (stats.expiredCredentials > 0) {
                status = HealthStatus.DEGRADED;
                message = `${stats.expiredCredentials} credentials already expired`;
            }
            const monitorRunning = this.expirationMonitor.isMonitoringActive();
            if (!monitorRunning && stats.totalCredentials > 0) {
                status = HealthStatus.DEGRADED;
                message = 'Expiration monitor not running';
            }
            return {
                name: 'expiration_monitor',
                status,
                message,
                details: {
                    totalCredentials: stats.totalCredentials,
                    expiredCredentials: stats.expiredCredentials,
                    expiringCritical: stats.expiringCritical,
                    expiringHigh: stats.expiringHigh,
                    expiringMedium: stats.expiringMedium,
                    healthyCredentials: stats.healthyCredentials,
                    monitorRunning,
                },
                responseTimeMs: Date.now() - startTime,
                lastChecked: new Date(),
            };
        }
        catch (error) {
            return {
                name: 'expiration_monitor',
                status: HealthStatus.UNHEALTHY,
                message: `Expiration monitor error: ${error.message}`,
                responseTimeMs: Date.now() - startTime,
                lastChecked: new Date(),
            };
        }
    }
    async checkUsageTrackerHealth() {
        const startTime = Date.now();
        try {
            if (!this.usageTracker) {
                return {
                    name: 'usage_tracker',
                    status: HealthStatus.UNHEALTHY,
                    message: 'Usage tracker not registered',
                    lastChecked: new Date(),
                };
            }
            const eventCount = this.db
                .prepare('SELECT COUNT(*) as count FROM usage_events')
                .get();
            const status = HealthStatus.HEALTHY;
            const message = 'Usage tracker is operational';
            return {
                name: 'usage_tracker',
                status,
                message,
                details: {
                    totalEvents: eventCount.count,
                },
                responseTimeMs: Date.now() - startTime,
                lastChecked: new Date(),
            };
        }
        catch (error) {
            return {
                name: 'usage_tracker',
                status: HealthStatus.UNHEALTHY,
                message: `Usage tracker error: ${error.message}`,
                responseTimeMs: Date.now() - startTime,
                lastChecked: new Date(),
            };
        }
    }
    getDatabaseStats() {
        try {
            const pageCount = this.db.pragma('page_count', { simple: true });
            const pageSize = this.db.pragma('page_size', { simple: true });
            const databaseSizeMB = (pageCount * pageSize) / (1024 * 1024);
            const credentialCount = this.db
                .prepare('SELECT COUNT(*) as count FROM credentials')
                .get();
            const rotationJobsCount = this.db
                .prepare('SELECT COUNT(*) as count FROM rotation_jobs')
                .get();
            const rotationHistoryCount = this.db
                .prepare('SELECT COUNT(*) as count FROM rotation_history')
                .get();
            const auditLogsCount = this.db
                .prepare('SELECT COUNT(*) as count FROM audit_logs')
                .get();
            return {
                databaseSizeMB: databaseSizeMB.toFixed(2),
                credentialCount: credentialCount.count,
                rotationJobsCount: rotationJobsCount.count,
                rotationHistoryCount: rotationHistoryCount.count,
                auditLogsCount: auditLogsCount.count,
            };
        }
        catch (error) {
            logger.warn('Failed to get database stats', { error: error.message });
            return {};
        }
    }
    determineOverallStatus(components) {
        if (components.some((c) => c.status === HealthStatus.CRITICAL)) {
            return HealthStatus.CRITICAL;
        }
        if (components.some((c) => c.status === HealthStatus.UNHEALTHY)) {
            return HealthStatus.UNHEALTHY;
        }
        if (components.some((c) => c.status === HealthStatus.DEGRADED)) {
            return HealthStatus.DEGRADED;
        }
        return HealthStatus.HEALTHY;
    }
    getPerformanceMetrics() {
        const startTime = Date.now();
        const pageCount = this.db.pragma('page_count', { simple: true });
        const pageSize = this.db.pragma('page_size', { simple: true });
        const databaseSize = pageCount * pageSize;
        const totalCredentials = this.db
            .prepare('SELECT COUNT(*) as count FROM credentials')
            .get();
        const totalRotations = this.db
            .prepare('SELECT COUNT(*) as count FROM rotation_history')
            .get();
        const totalUsageEvents = this.db
            .prepare('SELECT COUNT(*) as count FROM usage_events')
            .get();
        const averageQueryTimeMs = Date.now() - startTime;
        const cacheHitRate = this.calculateCacheHitRate();
        return {
            databaseSize,
            totalCredentials: totalCredentials.count,
            totalRotations: totalRotations.count,
            totalUsageEvents: totalUsageEvents.count,
            averageQueryTimeMs,
            cacheHitRate,
        };
    }
    calculateCacheHitRate() {
        try {
            const cached = this.db
                .prepare('SELECT COUNT(*) as count FROM usage_stats_cache')
                .get();
            const credentials = this.db
                .prepare('SELECT COUNT(DISTINCT service || account) as count FROM usage_events')
                .get();
            if (credentials.count === 0) {
                return 1.0;
            }
            return cached.count / credentials.count;
        }
        catch (error) {
            return 0;
        }
    }
    getResourceUtilization() {
        const pageCount = this.db.pragma('page_count', { simple: true });
        const pageSize = this.db.pragma('page_size', { simple: true });
        const databaseSizeMB = (pageCount * pageSize) / (1024 * 1024);
        const credentialCount = this.db
            .prepare('SELECT COUNT(*) as count FROM credentials')
            .get();
        const rotationJobsCount = this.db
            .prepare('SELECT COUNT(*) as count FROM rotation_jobs')
            .get();
        const expirationWarningsCount = this.db
            .prepare('SELECT COUNT(*) as count FROM expiration_warnings')
            .get();
        const usageEventsCount = this.db
            .prepare('SELECT COUNT(*) as count FROM usage_events')
            .get();
        const auditLogsCount = this.db
            .prepare('SELECT COUNT(*) as count FROM audit_logs')
            .get();
        return {
            databaseSizeMB,
            credentialCount: credentialCount.count,
            rotationJobsCount: rotationJobsCount.count,
            expirationWarningsCount: expirationWarningsCount.count,
            usageEventsCount: usageEventsCount.count,
            auditLogsCount: auditLogsCount.count,
        };
    }
    getLastHealthCheck() {
        return this.lastHealthCheck;
    }
    startMonitoring() {
        if (this.checkTimer) {
            logger.warn('Health checker already running');
            return;
        }
        const intervalMs = this.config.checkInterval * 1000;
        this.checkTimer = setInterval(() => {
            this.checkHealth().catch((error) => {
                logger.error('Health check error', { error: error.message });
            });
        }, intervalMs);
        this.checkHealth().catch((error) => {
            logger.error('Initial health check error', { error: error.message });
        });
        logger.info('Health monitoring started', {
            checkInterval: this.config.checkInterval,
        });
    }
    stopMonitoring() {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = null;
            logger.info('Health monitoring stopped');
        }
    }
    isMonitoring() {
        return this.checkTimer !== null;
    }
}
//# sourceMappingURL=HealthChecker.js.map