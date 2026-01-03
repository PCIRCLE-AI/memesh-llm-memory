import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger.js';
const execAsync = promisify(exec);
export class SystemResourceManager {
    config;
    constructor(config = {}) {
        this.config = {
            cpuThreshold: config.cpuThreshold ?? 80,
            memoryThreshold: config.memoryThreshold ?? 85,
            threadStrategy: config.threadStrategy ?? 'balanced',
            minThreads: config.minThreads ?? 1,
            maxThreads: config.maxThreads ?? os.cpus().length,
            e2eMaxConcurrent: config.e2eMaxConcurrent ?? 0,
        };
    }
    async getResources() {
        const cpuCores = os.cpus().length;
        const totalMemoryMB = os.totalmem() / (1024 * 1024);
        const freeMemoryMB = os.freemem() / (1024 * 1024);
        const usedMemoryMB = totalMemoryMB - freeMemoryMB;
        const memoryUsage = (usedMemoryMB / totalMemoryMB) * 100;
        const cpuUsage = await this.getCPUUsage();
        const availableCPU = 100 - cpuUsage;
        const recommendedThreads = this.calculateRecommendedThreads(cpuCores, cpuUsage, memoryUsage);
        const recommendedE2E = this.calculateRecommendedE2E(cpuCores, cpuUsage, memoryUsage);
        const warnings = [];
        let healthy = true;
        if (cpuUsage > this.config.cpuThreshold) {
            healthy = false;
            warnings.push(`High CPU usage: ${cpuUsage.toFixed(1)}% (threshold: ${this.config.cpuThreshold}%)`);
        }
        if (memoryUsage > this.config.memoryThreshold) {
            healthy = false;
            warnings.push(`High memory usage: ${memoryUsage.toFixed(1)}% (threshold: ${this.config.memoryThreshold}%)`);
        }
        if (freeMemoryMB < 1024) {
            healthy = false;
            warnings.push(`Low free memory: ${freeMemoryMB.toFixed(0)}MB`);
        }
        return {
            cpuCores,
            cpuUsage,
            availableCPU,
            totalMemoryMB,
            usedMemoryMB,
            freeMemoryMB,
            memoryUsage,
            recommendedThreads,
            recommendedE2E,
            healthy,
            warnings,
        };
    }
    calculateRecommendedThreads(cpuCores, cpuUsage, memoryUsage) {
        let threads;
        switch (this.config.threadStrategy) {
            case 'conservative':
                threads = Math.max(1, Math.floor(cpuCores * 0.5));
                break;
            case 'aggressive':
                if (cpuUsage < 30 && memoryUsage < 60) {
                    threads = cpuCores;
                }
                else {
                    threads = Math.max(1, Math.floor(cpuCores * 0.75));
                }
                break;
            case 'balanced':
            default:
                if (cpuUsage > 70 || memoryUsage > 80) {
                    threads = Math.max(1, Math.floor(cpuCores * 0.25));
                }
                else if (cpuUsage > 50 || memoryUsage > 60) {
                    threads = Math.max(1, Math.floor(cpuCores * 0.5));
                }
                else {
                    threads = Math.max(1, Math.floor(cpuCores * 0.75));
                }
                break;
        }
        threads = Math.max(this.config.minThreads, threads);
        threads = Math.min(this.config.maxThreads, threads);
        return threads;
    }
    calculateRecommendedE2E(cpuCores, cpuUsage, memoryUsage) {
        if (this.config.e2eMaxConcurrent > 0) {
            return this.config.e2eMaxConcurrent;
        }
        const availableCPU = 100 - cpuUsage;
        const availableMemoryPercent = 100 - memoryUsage;
        const cpuBasedE2E = Math.floor(availableCPU / 25);
        const memoryBasedE2E = Math.floor(availableMemoryPercent / 25);
        let e2e = Math.min(cpuBasedE2E, memoryBasedE2E);
        e2e = Math.min(e2e, Math.floor(cpuCores / 2));
        e2e = Math.max(1, Math.min(4, e2e));
        return e2e;
    }
    async getCPUUsage() {
        try {
            const startUsage = this.getCPUSnapshot();
            await new Promise(resolve => setTimeout(resolve, 100));
            const endUsage = this.getCPUSnapshot();
            const totalDiff = endUsage.total - startUsage.total;
            const idleDiff = endUsage.idle - startUsage.idle;
            if (totalDiff === 0) {
                return 0;
            }
            const usagePercent = ((totalDiff - idleDiff) / totalDiff) * 100;
            return Math.max(0, Math.min(100, usagePercent));
        }
        catch (error) {
            logger.warn('Failed to get CPU usage, using fallback:', error);
            const loadavg = os.loadavg()[0];
            const cpuCores = os.cpus().length;
            return Math.min(100, (loadavg / cpuCores) * 100);
        }
    }
    getCPUSnapshot() {
        const cpus = os.cpus();
        let totalTime = 0;
        let idleTime = 0;
        for (const cpu of cpus) {
            for (const type in cpu.times) {
                totalTime += cpu.times[type];
            }
            idleTime += cpu.times.idle;
        }
        return { total: totalTime, idle: idleTime };
    }
    async canRunE2E(count = 1) {
        const resources = await this.getResources();
        if (!resources.healthy) {
            return {
                canRun: false,
                reason: `System resources unhealthy: ${resources.warnings.join(', ')}`,
                recommendation: 'Wait for system to stabilize or reduce concurrent tasks',
            };
        }
        if (count > resources.recommendedE2E) {
            return {
                canRun: false,
                reason: `Requested ${count} E2E tests exceeds recommended ${resources.recommendedE2E}`,
                recommendation: `Run ${resources.recommendedE2E} E2E test(s) instead, or run sequentially`,
            };
        }
        const estimatedCPU = count * 25;
        const estimatedMemory = count * 25;
        if (estimatedCPU > resources.availableCPU) {
            return {
                canRun: false,
                reason: `Insufficient CPU (need ${estimatedCPU}%, available ${resources.availableCPU.toFixed(1)}%)`,
                recommendation: 'Reduce E2E test count or run sequentially',
            };
        }
        if (estimatedMemory > (100 - resources.memoryUsage)) {
            return {
                canRun: false,
                reason: `Insufficient memory (need ~${(count * 2048).toFixed(0)}MB, available ${resources.freeMemoryMB.toFixed(0)}MB)`,
                recommendation: 'Close other applications or run E2E tests sequentially',
            };
        }
        return { canRun: true };
    }
    async generateReport() {
        const resources = await this.getResources();
        let report = '╔═══════════════════════════════════════════════════════════╗\n';
        report += '║           SYSTEM RESOURCES REPORT                       ║\n';
        report += '╠═══════════════════════════════════════════════════════════╣\n';
        report += `║ CPU Cores:           ${resources.cpuCores.toString().padEnd(36)}║\n`;
        report += `║ CPU Usage:           ${resources.cpuUsage.toFixed(1)}% ${this.getStatusEmoji(resources.cpuUsage, this.config.cpuThreshold).padEnd(29)}║\n`;
        report += `║ Memory Total:        ${resources.totalMemoryMB.toFixed(0)}MB ${' '.repeat(32 - resources.totalMemoryMB.toFixed(0).length)}║\n`;
        report += `║ Memory Usage:        ${resources.memoryUsage.toFixed(1)}% ${this.getStatusEmoji(resources.memoryUsage, this.config.memoryThreshold).padEnd(29)}║\n`;
        report += '╠═══════════════════════════════════════════════════════════╣\n';
        report += `║ Recommended Threads: ${resources.recommendedThreads.toString().padEnd(36)}║\n`;
        report += `║ Recommended E2E:     ${resources.recommendedE2E.toString().padEnd(36)}║\n`;
        report += `║ Strategy:            ${this.config.threadStrategy.padEnd(36)}║\n`;
        report += '╠═══════════════════════════════════════════════════════════╣\n';
        if (resources.warnings.length > 0) {
            report += `║ ⚠️  WARNINGS:                                            ║\n`;
            for (const warning of resources.warnings) {
                const words = warning.split(' ');
                let line = '';
                for (const word of words) {
                    if ((line + word).length > 54) {
                        report += `║ ${line.padEnd(54)}   ║\n`;
                        line = '  ' + word + ' ';
                    }
                    else {
                        line += word + ' ';
                    }
                }
                if (line.trim()) {
                    report += `║ ${line.trim().padEnd(54)}   ║\n`;
                }
            }
        }
        else {
            report += `║ ✅ System Healthy                                        ║\n`;
        }
        report += '╚═══════════════════════════════════════════════════════════╝\n';
        return report;
    }
    getStatusEmoji(usage, threshold) {
        if (usage < threshold * 0.7)
            return '✅';
        if (usage < threshold)
            return '⚠️ ';
        return '🔴';
    }
}
export async function getSystemResources(config) {
    const manager = new SystemResourceManager(config);
    return manager.getResources();
}
export async function canRunE2ETest(count = 1, config) {
    const manager = new SystemResourceManager(config);
    return manager.canRunE2E(count);
}
//# sourceMappingURL=SystemResources.js.map