import { SystemResourceManager } from '../utils/SystemResources.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import { logger } from '../utils/logger.js';
const execAsync = promisify(exec);
export class GlobalResourcePool {
    static instance = null;
    resourceManager;
    config;
    activeE2E = new Map();
    activeBuilds = new Map();
    e2eWaitQueue = [];
    staleCheckTimer = null;
    constructor(config = {}) {
        this.config = {
            cpuThreshold: config.cpuThreshold ?? 80,
            memoryThreshold: config.memoryThreshold ?? 85,
            threadStrategy: config.threadStrategy ?? 'balanced',
            minThreads: config.minThreads ?? 1,
            maxThreads: config.maxThreads ?? os.cpus().length,
            e2eMaxConcurrent: config.e2eMaxConcurrent ?? 0,
            maxConcurrentE2E: config.maxConcurrentE2E ?? 1,
            e2eWaitTimeout: config.e2eWaitTimeout ?? 300000,
            maxConcurrentBuilds: config.maxConcurrentBuilds ?? 2,
            buildWaitTimeout: config.buildWaitTimeout ?? 600000,
            staleCheckInterval: config.staleCheckInterval ?? 60000,
            staleLockThreshold: config.staleLockThreshold ?? 1800000,
        };
        this.resourceManager = new SystemResourceManager(this.config);
        this.startStaleCheckTimer();
    }
    static getInstance(config) {
        if (!GlobalResourcePool.instance) {
            GlobalResourcePool.instance = new GlobalResourcePool(config);
        }
        return GlobalResourcePool.instance;
    }
    static resetInstance() {
        if (GlobalResourcePool.instance) {
            GlobalResourcePool.instance.cleanup();
            GlobalResourcePool.instance = null;
        }
    }
    async acquireE2ESlot(orchestratorId) {
        if (this.activeE2E.has(orchestratorId)) {
            logger.warn(`Orchestrator ${orchestratorId} already holds E2E slot`);
            return;
        }
        if (this.activeE2E.size < this.config.maxConcurrentE2E) {
            this.activeE2E.set(orchestratorId, {
                type: 'e2e',
                orchestratorId,
                acquiredAt: new Date(),
                pid: process.pid,
            });
            logger.info(`[ResourcePool] E2E slot acquired by ${orchestratorId} (${this.activeE2E.size}/${this.config.maxConcurrentE2E})`);
            return;
        }
        logger.info(`[ResourcePool] E2E slot full, ${orchestratorId} waiting... (queue: ${this.e2eWaitQueue.length})`);
        return new Promise((resolve, reject) => {
            const queuedAt = new Date();
            const timeoutId = setTimeout(() => {
                const index = this.e2eWaitQueue.findIndex(item => item.orchestratorId === orchestratorId);
                if (index !== -1) {
                    this.e2eWaitQueue.splice(index, 1);
                }
                reject(new Error(`E2E slot acquisition timeout for ${orchestratorId} after ${this.config.e2eWaitTimeout}ms`));
            }, this.config.e2eWaitTimeout);
            this.e2eWaitQueue.push({
                orchestratorId,
                resolve: () => {
                    clearTimeout(timeoutId);
                    resolve();
                },
                reject: (error) => {
                    clearTimeout(timeoutId);
                    reject(error);
                },
                queuedAt,
            });
        });
    }
    releaseE2ESlot(orchestratorId) {
        if (!this.activeE2E.has(orchestratorId)) {
            logger.warn(`Orchestrator ${orchestratorId} does not hold E2E slot`);
            return;
        }
        this.activeE2E.delete(orchestratorId);
        logger.info(`[ResourcePool] E2E slot released by ${orchestratorId} (${this.activeE2E.size}/${this.config.maxConcurrentE2E})`);
        this.processE2EWaitQueue();
    }
    processE2EWaitQueue() {
        while (this.e2eWaitQueue.length > 0 &&
            this.activeE2E.size < this.config.maxConcurrentE2E) {
            const next = this.e2eWaitQueue.shift();
            if (!next)
                break;
            this.activeE2E.set(next.orchestratorId, {
                type: 'e2e',
                orchestratorId: next.orchestratorId,
                acquiredAt: new Date(),
                pid: process.pid,
            });
            logger.info(`[ResourcePool] E2E slot assigned to ${next.orchestratorId} from queue (waited ${Date.now() - next.queuedAt.getTime()}ms)`);
            next.resolve();
        }
    }
    async canRunE2E(count = 1) {
        const availableSlots = this.config.maxConcurrentE2E - this.activeE2E.size;
        if (count > availableSlots) {
            return {
                canRun: false,
                reason: `Insufficient E2E slots (need ${count}, available ${availableSlots})`,
                recommendation: `Wait for ${count - availableSlots} E2E test(s) to complete`,
            };
        }
        return this.resourceManager.canRunE2E(count);
    }
    getStatus() {
        return {
            e2e: {
                active: this.activeE2E.size,
                max: this.config.maxConcurrentE2E,
                waiting: this.e2eWaitQueue.length,
                slots: Array.from(this.activeE2E.values()),
            },
            builds: {
                active: this.activeBuilds.size,
                max: this.config.maxConcurrentBuilds,
                slots: Array.from(this.activeBuilds.values()),
            },
        };
    }
    async generateReport() {
        const status = this.getStatus();
        const resources = await this.resourceManager.getResources();
        let report = '╔═══════════════════════════════════════════════════════════╗\n';
        report += '║         GLOBAL RESOURCE POOL STATUS                     ║\n';
        report += '╠═══════════════════════════════════════════════════════════╣\n';
        report += `║ E2E Tests:       ${status.e2e.active}/${status.e2e.max} active, ${status.e2e.waiting} waiting ${' '.repeat(19)}║\n`;
        report += `║ Build Tasks:     ${status.builds.active}/${status.builds.max} active ${' '.repeat(29)}║\n`;
        report += '╠═══════════════════════════════════════════════════════════╣\n';
        report += `║ CPU Usage:       ${resources.cpuUsage.toFixed(1)}% ${' '.repeat(34)}║\n`;
        report += `║ Memory Usage:    ${resources.memoryUsage.toFixed(1)}% ${' '.repeat(34)}║\n`;
        report += `║ Recommended:     ${resources.recommendedThreads} threads, ${resources.recommendedE2E} E2E ${' '.repeat(20)}║\n`;
        report += '╚═══════════════════════════════════════════════════════════╝\n';
        if (status.e2e.slots.length > 0) {
            report += '\n🔴 Active E2E Tests:\n';
            for (const slot of status.e2e.slots) {
                const duration = Date.now() - slot.acquiredAt.getTime();
                report += `  - ${slot.orchestratorId} (${Math.floor(duration / 1000)}s ago, PID: ${slot.pid})\n`;
            }
        }
        return report;
    }
    async checkStaleLocksと() {
        const now = Date.now();
        for (const [orchestratorId, slot] of this.activeE2E.entries()) {
            const age = now - slot.acquiredAt.getTime();
            if (age > this.config.staleLockThreshold) {
                logger.warn(`[ResourcePool] Stale E2E slot detected: ${orchestratorId} (${Math.floor(age / 1000)}s old)`);
                try {
                    process.kill(slot.pid, 0);
                    logger.warn(`  PID ${slot.pid} still alive, keeping lock`);
                }
                catch (error) {
                    logger.warn(`  PID ${slot.pid} dead, releasing stale lock`);
                    this.activeE2E.delete(orchestratorId);
                    this.processE2EWaitQueue();
                }
            }
        }
    }
    startStaleCheckTimer() {
        this.staleCheckTimer = setInterval(() => {
            this.checkStaleLocksと().catch(error => {
                logger.error('[ResourcePool] Stale check error:', error);
            });
        }, this.config.staleCheckInterval);
    }
    cleanup() {
        if (this.staleCheckTimer) {
            clearInterval(this.staleCheckTimer);
            this.staleCheckTimer = null;
        }
        for (const waiting of this.e2eWaitQueue) {
            waiting.reject(new Error('GlobalResourcePool is shutting down'));
        }
        this.e2eWaitQueue = [];
        this.activeE2E.clear();
        this.activeBuilds.clear();
    }
}
export async function acquireE2ESlot(orchestratorId) {
    const pool = GlobalResourcePool.getInstance();
    return pool.acquireE2ESlot(orchestratorId);
}
export function releaseE2ESlot(orchestratorId) {
    const pool = GlobalResourcePool.getInstance();
    pool.releaseE2ESlot(orchestratorId);
}
export async function canRunE2E(count = 1) {
    const pool = GlobalResourcePool.getInstance();
    return pool.canRunE2E(count);
}
//# sourceMappingURL=GlobalResourcePool.js.map