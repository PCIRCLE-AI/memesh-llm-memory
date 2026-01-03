import os from 'os';
import { ValidationError } from '../errors/index.js';
export class ResourceMonitor {
    activeBackgroundCount = 0;
    maxBackgroundAgents;
    thresholds;
    constructor(maxBackgroundAgents = 6, thresholds) {
        this.maxBackgroundAgents = maxBackgroundAgents;
        this.thresholds = {
            maxCPU: thresholds?.maxCPU ?? 70,
            maxMemory: thresholds?.maxMemory ?? 8192,
        };
    }
    getCurrentResources() {
        const cpus = os.cpus();
        const totalMem = os.totalmem() / (1024 * 1024);
        const freeMem = os.freemem() / (1024 * 1024);
        const usedMem = totalMem - freeMem;
        const loadAvg = os.loadavg()[0];
        const cpuUsage = Math.min(100, (loadAvg / cpus.length) * 100);
        return {
            cpu: {
                usage: cpuUsage,
                cores: cpus.length,
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
        if (config) {
            const { maxCPU, maxMemory } = config.resourceLimits;
            const availableCPU = this.thresholds.maxCPU - resources.cpu.usage;
            if (maxCPU > availableCPU) {
                return {
                    canExecute: false,
                    reason: `Task requires ${maxCPU}% CPU but only ${availableCPU.toFixed(1)}% available`,
                    suggestion: 'Reduce task resource requirements or wait',
                    resources,
                };
            }
            if (maxMemory > resources.memory.available) {
                return {
                    canExecute: false,
                    reason: `Task requires ${maxMemory}MB but only ${resources.memory.available.toFixed(0)}MB available`,
                    suggestion: 'Reduce task memory requirements or wait',
                    resources,
                };
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
        if (megabytes < 0) {
            throw new ValidationError('Memory must be positive', {
                value: megabytes,
                min: 0,
            });
        }
        this.thresholds.maxMemory = megabytes;
    }
    setMaxBackgroundAgents(count) {
        if (count < 1) {
            throw new ValidationError('Max background agents must be at least 1', {
                value: count,
                min: 1,
            });
        }
        this.maxBackgroundAgents = count;
    }
    onThresholdExceeded(threshold, callback) {
        const intervalId = setInterval(() => {
            const resources = this.getCurrentResources();
            if (threshold === 'cpu' && resources.cpu.usage > this.thresholds.maxCPU) {
                callback(resources);
            }
            else if (threshold === 'memory' &&
                resources.memory.used > this.thresholds.maxMemory) {
                callback(resources);
            }
        }, 5000);
        return () => clearInterval(intervalId);
    }
}
//# sourceMappingURL=ResourceMonitor.js.map