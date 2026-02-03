import os from 'os';
import { ValidationError } from '../errors/index.js';
import { logger } from '../utils/logger.js';
export class ResourceMonitor {
    activeBackgroundCount = 0;
    maxBackgroundAgents;
    thresholds;
    activeIntervals = new Set();
    disposed = false;
    constructor(maxBackgroundAgents = 6, thresholds) {
        if (!Number.isFinite(maxBackgroundAgents)) {
            throw new ValidationError('Max background agents must be finite', {
                providedValue: maxBackgroundAgents,
            });
        }
        if (!Number.isSafeInteger(maxBackgroundAgents)) {
            throw new ValidationError('Max background agents must be safe integer', {
                providedValue: maxBackgroundAgents,
                max: Number.MAX_SAFE_INTEGER,
            });
        }
        if (maxBackgroundAgents < 1) {
            throw new ValidationError('Max background agents must be >= 1', {
                providedValue: maxBackgroundAgents,
                min: 1,
            });
        }
        const maxCPU = thresholds?.maxCPU ?? 70;
        if (!Number.isFinite(maxCPU)) {
            throw new ValidationError('Max CPU must be finite', {
                providedValue: maxCPU,
            });
        }
        if (maxCPU < 0 || maxCPU > 100) {
            throw new ValidationError('Max CPU must be 0-100', {
                providedValue: maxCPU,
                range: [0, 100],
            });
        }
        const maxMemory = thresholds?.maxMemory ?? 8192;
        if (!Number.isFinite(maxMemory)) {
            throw new ValidationError('Max memory must be finite', {
                providedValue: maxMemory,
            });
        }
        if (maxMemory < 0) {
            throw new ValidationError('Max memory must be non-negative', {
                providedValue: maxMemory,
                min: 0,
            });
        }
        this.maxBackgroundAgents = maxBackgroundAgents;
        this.thresholds = {
            maxCPU,
            maxMemory,
        };
    }
    getCurrentResources() {
        const cpus = os.cpus();
        const fallbackCores = typeof os.availableParallelism === 'function'
            ? os.availableParallelism()
            : 1;
        const cores = Math.max(cpus.length, fallbackCores, 1);
        const totalMem = os.totalmem() / (1024 * 1024);
        const freeMem = os.freemem() / (1024 * 1024);
        const usedMem = totalMem - freeMem;
        const loadAvg = os.loadavg()[0];
        const cpuUsage = Math.min(100, (loadAvg / cores) * 100);
        return {
            cpu: {
                usage: cpuUsage,
                cores,
            },
            memory: {
                total: totalMem,
                used: usedMem,
                available: freeMem,
                usagePercent: (usedMem / totalMem) * 100,
            },
            activeBackgroundAgents: this.activeBackgroundCount,
        };
    }
    canRunBackgroundTask(config) {
        const resources = this.getCurrentResources();
        if (resources.activeBackgroundAgents >= this.maxBackgroundAgents) {
            return {
                canExecute: false,
                reason: `Max concurrent background agents reached (${this.maxBackgroundAgents})`,
                suggestion: 'Wait for existing tasks to complete or use foreground mode',
                resources,
            };
        }
        if (resources.cpu.usage > this.thresholds.maxCPU) {
            return {
                canExecute: false,
                reason: `CPU usage too high (${resources.cpu.usage.toFixed(1)}% > ${this.thresholds.maxCPU}%)`,
                suggestion: 'Use foreground mode or wait for CPU usage to decrease',
                resources,
            };
        }
        if (resources.memory.used > this.thresholds.maxMemory) {
            return {
                canExecute: false,
                reason: `Memory usage too high (${resources.memory.used.toFixed(0)}MB > ${this.thresholds.maxMemory}MB)`,
                suggestion: 'Close other applications or use foreground mode',
                resources,
            };
        }
        if (config && config.resourceLimits) {
            const { maxCPU, maxMemory } = config.resourceLimits;
            if (maxCPU !== undefined) {
                const availableCPU = this.thresholds.maxCPU - resources.cpu.usage;
                if (maxCPU > availableCPU) {
                    return {
                        canExecute: false,
                        reason: `Task requires ${maxCPU}% CPU but only ${availableCPU.toFixed(1)}% available`,
                        suggestion: 'Reduce task resource requirements or wait',
                        resources,
                    };
                }
            }
            if (maxMemory !== undefined) {
                if (maxMemory > resources.memory.available) {
                    return {
                        canExecute: false,
                        reason: `Task requires ${maxMemory}MB but only ${resources.memory.available.toFixed(0)}MB available`,
                        suggestion: 'Reduce task memory requirements or wait',
                        resources,
                    };
                }
            }
        }
        return {
            canExecute: true,
            resources,
        };
    }
    registerBackgroundTask() {
        this.activeBackgroundCount++;
    }
    unregisterBackgroundTask() {
        if (this.activeBackgroundCount > 0) {
            this.activeBackgroundCount--;
        }
    }
    getActiveBackgroundCount() {
        return this.activeBackgroundCount;
    }
    setMaxCPU(percentage) {
        if (!Number.isFinite(percentage)) {
            throw new ValidationError('CPU percentage must be finite', {
                value: percentage,
            });
        }
        if (percentage < 0 || percentage > 100) {
            throw new ValidationError('CPU percentage must be between 0 and 100', {
                value: percentage,
                min: 0,
                max: 100,
            });
        }
        this.thresholds.maxCPU = percentage;
    }
    setMaxMemory(megabytes) {
        if (!Number.isFinite(megabytes)) {
            throw new ValidationError('Memory must be finite', {
                value: megabytes,
            });
        }
        if (megabytes < 0) {
            throw new ValidationError('Memory must be positive', {
                value: megabytes,
                min: 0,
            });
        }
        this.thresholds.maxMemory = megabytes;
    }
    setMaxBackgroundAgents(count) {
        if (!Number.isFinite(count)) {
            throw new ValidationError('Max agents must be finite', {
                value: count,
            });
        }
        if (!Number.isSafeInteger(count)) {
            throw new ValidationError('Max agents must be safe integer', {
                value: count,
                max: Number.MAX_SAFE_INTEGER,
            });
        }
        if (count < 1) {
            throw new ValidationError('Max background agents must be at least 1', {
                value: count,
                min: 1,
            });
        }
        this.maxBackgroundAgents = count;
    }
    dispose() {
        this.disposed = true;
        for (const intervalId of this.activeIntervals) {
            clearInterval(intervalId);
        }
        this.activeIntervals.clear();
        logger.debug('[ResourceMonitor] Disposed all resources');
    }
    onThresholdExceeded(threshold, callback) {
        if (this.disposed) {
            throw new Error('ResourceMonitor has been disposed');
        }
        const intervalId = setInterval(() => {
            try {
                const resources = this.getCurrentResources();
                if (threshold === 'cpu' && resources.cpu.usage > this.thresholds.maxCPU) {
                    callback(resources);
                }
                else if (threshold === 'memory' &&
                    resources.memory.used > this.thresholds.maxMemory) {
                    callback(resources);
                }
            }
            catch (error) {
                logger.error(`[ResourceMonitor] Threshold callback error (${threshold}):`, {
                    error: error instanceof Error ? error.message : String(error),
                    threshold,
                });
            }
        }, 5000);
        this.activeIntervals.add(intervalId);
        return () => {
            clearInterval(intervalId);
            this.activeIntervals.delete(intervalId);
        };
    }
    getStats() {
        return {
            activeIntervals: this.activeIntervals.size,
            activeBackgroundAgents: this.activeBackgroundCount,
            maxBackgroundAgents: this.maxBackgroundAgents,
            thresholds: { ...this.thresholds },
        };
    }
}
//# sourceMappingURL=ResourceMonitor.js.map