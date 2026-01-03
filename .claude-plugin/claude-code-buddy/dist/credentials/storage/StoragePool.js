import { logger } from '../../utils/logger.js';
export var LoadBalancingStrategy;
(function (LoadBalancingStrategy) {
    LoadBalancingStrategy["PRIORITY"] = "priority";
    LoadBalancingStrategy["ROUND_ROBIN"] = "round_robin";
    LoadBalancingStrategy["WEIGHTED_RANDOM"] = "weighted_random";
    LoadBalancingStrategy["LEAST_USED"] = "least_used";
})(LoadBalancingStrategy || (LoadBalancingStrategy = {}));
export class StoragePool {
    backends = new Map();
    health = new Map();
    strategy;
    roundRobinIndex = 0;
    totalRequests = 0;
    failedRequests = 0;
    constructor(strategy = LoadBalancingStrategy.PRIORITY) {
        this.strategy = strategy;
        logger.info('Storage pool initialized', { strategy });
    }
    addBackend(config) {
        const healthState = {
            failures: 0,
            circuitBroken: false,
            requests: 0,
        };
        this.backends.set(config.name, {
            ...config,
            weight: config.weight || 1,
            maxFailures: config.maxFailures || 3,
            resetTimeout: config.resetTimeout || 60000,
        });
        this.health.set(config.name, healthState);
        logger.info('Backend added to storage pool', {
            name: config.name,
            priority: config.priority,
            weight: config.weight || 1,
        });
    }
    removeBackend(name) {
        const health = this.health.get(name);
        if (health?.resetTimeout) {
            clearTimeout(health.resetTimeout);
        }
        this.backends.delete(name);
        this.health.delete(name);
        logger.info('Backend removed from storage pool', { name });
    }
    getSortedBackends() {
        return Array.from(this.backends.entries())
            .filter(([name]) => !this.health.get(name)?.circuitBroken)
            .sort(([, a], [, b]) => a.priority - b.priority);
    }
    selectBackend() {
        const backends = this.getSortedBackends();
        if (backends.length === 0) {
            return null;
        }
        switch (this.strategy) {
            case LoadBalancingStrategy.PRIORITY:
                return backends[0][1];
            case LoadBalancingStrategy.ROUND_ROBIN: {
                const highestPriority = backends[0][1].priority;
                const samePriority = backends.filter(([, b]) => b.priority === highestPriority);
                const selected = samePriority[this.roundRobinIndex % samePriority.length][1];
                this.roundRobinIndex++;
                return selected;
            }
            case LoadBalancingStrategy.WEIGHTED_RANDOM: {
                const totalWeight = backends.reduce((sum, [, b]) => sum + (b.weight || 1), 0);
                let random = Math.random() * totalWeight;
                for (const [, backend] of backends) {
                    random -= backend.weight || 1;
                    if (random <= 0) {
                        return backend;
                    }
                }
                return backends[0][1];
            }
            case LoadBalancingStrategy.LEAST_USED: {
                const sorted = backends.sort(([nameA], [nameB]) => {
                    const healthA = this.health.get(nameA);
                    const healthB = this.health.get(nameB);
                    return healthA.requests - healthB.requests;
                });
                return sorted[0][1];
            }
            default:
                return backends[0][1];
        }
    }
    async executeWithFallback(operation) {
        this.totalRequests++;
        const backends = this.getSortedBackends();
        if (backends.length === 0) {
            throw new Error('No healthy backends available');
        }
        let lastError = null;
        for (const [name, config] of backends) {
            const health = this.health.get(name);
            health.requests++;
            health.lastUsed = new Date();
            try {
                const result = await operation(config.backend);
                if (health.failures > 0) {
                    health.failures = 0;
                    logger.info('Backend recovered', { name });
                }
                return result;
            }
            catch (error) {
                lastError = error;
                health.failures++;
                health.lastFailure = new Date();
                logger.warn('Backend operation failed', {
                    name,
                    failures: health.failures,
                    maxFailures: config.maxFailures,
                    error: error.message,
                });
                if (health.failures >= config.maxFailures && !health.circuitBroken) {
                    health.circuitBroken = true;
                    logger.error('Circuit breaker triggered', {
                        name,
                        failures: health.failures,
                    });
                    health.resetTimeout = setTimeout(() => {
                        health.circuitBroken = false;
                        health.failures = 0;
                        logger.info('Circuit breaker reset', { name });
                    }, config.resetTimeout);
                }
            }
        }
        this.failedRequests++;
        throw new Error(`All backends failed. Last error: ${lastError?.message || 'Unknown error'}`);
    }
    async set(credential) {
        return this.executeWithFallback((backend) => backend.set(credential));
    }
    async get(service, account) {
        return this.executeWithFallback((backend) => backend.get(service, account));
    }
    async delete(service, account) {
        return this.executeWithFallback((backend) => backend.delete(service, account));
    }
    async list(query) {
        return this.executeWithFallback((backend) => backend.list(query));
    }
    async isAvailable() {
        const backends = Array.from(this.backends.values());
        for (const config of backends) {
            try {
                const available = await config.backend.isAvailable();
                if (available) {
                    return true;
                }
            }
            catch (error) {
                continue;
            }
        }
        return false;
    }
    async healthCheck() {
        const results = new Map();
        for (const [name, config] of this.backends.entries()) {
            try {
                const available = await config.backend.isAvailable();
                results.set(name, available);
                if (!available) {
                    logger.warn('Backend health check failed', { name });
                }
            }
            catch (error) {
                results.set(name, false);
                logger.error('Backend health check error', {
                    name,
                    error: error.message,
                });
            }
        }
        return results;
    }
    getStats() {
        const backendStats = Array.from(this.backends.entries()).map(([name, config]) => {
            const health = this.health.get(name);
            return {
                name,
                healthy: !health.circuitBroken && health.failures < config.maxFailures,
                circuitBroken: health.circuitBroken,
                requests: health.requests,
                failures: health.failures,
                lastUsed: health.lastUsed,
            };
        });
        const healthyBackends = backendStats.filter((b) => b.healthy).length;
        const circuitBrokenBackends = backendStats.filter((b) => b.circuitBroken).length;
        return {
            totalBackends: this.backends.size,
            healthyBackends,
            circuitBrokenBackends,
            totalRequests: this.totalRequests,
            failedRequests: this.failedRequests,
            backendStats,
        };
    }
    resetAllCircuitBreakers() {
        for (const [name, health] of this.health.entries()) {
            if (health.circuitBroken) {
                health.circuitBroken = false;
                health.failures = 0;
                logger.info('Circuit breaker manually reset', { name });
            }
            if (health.resetTimeout) {
                clearTimeout(health.resetTimeout);
                health.resetTimeout = undefined;
            }
        }
    }
    getType() {
        return 'storage-pool';
    }
    dispose() {
        for (const health of this.health.values()) {
            if (health.resetTimeout) {
                clearTimeout(health.resetTimeout);
            }
        }
        this.backends.clear();
        this.health.clear();
        logger.info('Storage pool disposed');
    }
}
//# sourceMappingURL=StoragePool.js.map