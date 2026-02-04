import { logger } from '../../utils/logger.js';
export var ShutdownReason;
(function (ShutdownReason) {
    ShutdownReason["UPGRADE"] = "upgrade";
    ShutdownReason["USER_REQUESTED"] = "user_requested";
    ShutdownReason["IDLE_TIMEOUT"] = "idle_timeout";
    ShutdownReason["ERROR"] = "error";
})(ShutdownReason || (ShutdownReason = {}));
const DEFAULT_CONFIG = {
    maxWaitTime: 30000,
    checkInterval: 100,
    notifyClients: async () => {
    },
};
export class GracefulShutdownCoordinator {
    config;
    pendingRequests = new Map();
    totalTracked = 0;
    totalCompleted = 0;
    forceShutdownTriggered = false;
    forceKilledRequestIds = [];
    shuttingDown = false;
    pendingUpgrade = false;
    upgradeVersion = null;
    upgradeInitiator = null;
    waitTimeoutId = null;
    constructor(config) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        if (this.config.checkInterval < 10) {
            throw new Error('checkInterval must be at least 10ms');
        }
        logger.debug('GracefulShutdownCoordinator initialized', {
            maxWaitTime: this.config.maxWaitTime,
            checkInterval: this.config.checkInterval,
        });
    }
    trackRequest(requestId, clientId) {
        if (!this.canAcceptRequest()) {
            throw new Error('Cannot accept new requests: shutdown in progress');
        }
        if (this.pendingRequests.has(requestId)) {
            logger.warn('Duplicate request ID ignored', { requestId, clientId });
            return;
        }
        const requestInfo = {
            requestId,
            clientId,
            startTime: Date.now(),
        };
        this.pendingRequests.set(requestId, requestInfo);
        this.totalTracked++;
        logger.debug('Request tracked', {
            requestId,
            clientId,
            pendingCount: this.pendingRequests.size,
        });
    }
    completeRequest(requestId) {
        const request = this.pendingRequests.get(requestId);
        if (!request) {
            logger.debug('Complete called for non-existent request', { requestId });
            return;
        }
        this.pendingRequests.delete(requestId);
        this.totalCompleted++;
        const duration = Date.now() - request.startTime;
        logger.debug('Request completed', {
            requestId,
            clientId: request.clientId,
            durationMs: duration,
            pendingCount: this.pendingRequests.size,
        });
    }
    getPendingRequests() {
        return Array.from(this.pendingRequests.values());
    }
    get isShuttingDown() {
        return this.shuttingDown;
    }
    get isPendingUpgrade() {
        return this.pendingUpgrade;
    }
    canAcceptRequest() {
        return !this.shuttingDown && !this.pendingUpgrade;
    }
    async initiateShutdown(reason) {
        if (this.shuttingDown) {
            throw new Error('Shutdown already in progress');
        }
        this.shuttingDown = true;
        logger.info('Initiating graceful shutdown', {
            reason,
            pendingRequests: this.pendingRequests.size,
            maxWaitTime: this.config.maxWaitTime,
        });
        await this.notifyShutdown(reason);
        await this.waitForPendingRequests();
        logger.info('Graceful shutdown complete', {
            reason,
            forceShutdown: this.forceShutdownTriggered,
            forceKilledCount: this.forceKilledRequestIds.length,
        });
    }
    async initiateUpgrade(newVersion, initiatorClientId) {
        this.pendingUpgrade = true;
        this.upgradeVersion = newVersion;
        this.upgradeInitiator = initiatorClientId;
        logger.info('Initiating upgrade', {
            newVersion,
            initiatorClientId,
            pendingRequests: this.pendingRequests.size,
        });
        await this.notifyUpgradePending(newVersion, initiatorClientId);
        await this.initiateShutdown(ShutdownReason.UPGRADE);
    }
    getMetrics() {
        const requestsByClient = {};
        for (const request of this.pendingRequests.values()) {
            requestsByClient[request.clientId] = (requestsByClient[request.clientId] || 0) + 1;
        }
        return {
            totalRequestsTracked: this.totalTracked,
            totalRequestsCompleted: this.totalCompleted,
            currentPending: this.pendingRequests.size,
            requestsByClient,
            forceShutdown: this.forceShutdownTriggered,
            forceKilledRequests: [...this.forceKilledRequestIds],
        };
    }
    async waitForPendingRequests() {
        const startTime = Date.now();
        return new Promise((resolve) => {
            const checkComplete = () => {
                this.waitTimeoutId = null;
                const elapsed = Date.now() - startTime;
                if (this.pendingRequests.size === 0) {
                    logger.debug('All pending requests completed', { elapsedMs: elapsed });
                    resolve();
                    return;
                }
                if (elapsed >= this.config.maxWaitTime) {
                    this.forceShutdownTriggered = true;
                    this.forceKilledRequestIds = Array.from(this.pendingRequests.keys());
                    logger.warn('Force shutdown triggered - timeout reached', {
                        elapsedMs: elapsed,
                        pendingCount: this.pendingRequests.size,
                        forceKilledRequests: this.forceKilledRequestIds,
                    });
                    this.pendingRequests.clear();
                    resolve();
                    return;
                }
                this.waitTimeoutId = setTimeout(checkComplete, this.config.checkInterval);
            };
            checkComplete();
        });
    }
    cancelWaitTimeout() {
        if (this.waitTimeoutId !== null) {
            clearTimeout(this.waitTimeoutId);
            this.waitTimeoutId = null;
            logger.debug('Wait timeout cancelled');
        }
    }
    async notifyShutdown(reason) {
        const message = {
            type: 'shutdown',
            reason,
            gracePeriod: this.config.maxWaitTime,
            timestamp: Date.now(),
        };
        try {
            await this.config.notifyClients(message);
            logger.debug('Shutdown notification sent', { reason });
        }
        catch (error) {
            logger.error('Failed to send shutdown notification', {
                reason,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    async notifyUpgradePending(newVersion, initiatorClientId) {
        const message = {
            type: 'upgrade_pending',
            newVersion,
            estimatedShutdownTime: this.config.maxWaitTime,
            initiatorClientId,
            timestamp: Date.now(),
        };
        try {
            await this.config.notifyClients(message);
            logger.debug('Upgrade pending notification sent', {
                newVersion,
                initiatorClientId,
            });
        }
        catch (error) {
            logger.error('Failed to send upgrade pending notification', {
                newVersion,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
}
//# sourceMappingURL=GracefulShutdownCoordinator.js.map