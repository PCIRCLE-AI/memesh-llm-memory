import { appConfig } from '../config/index.js';
import { logger } from './logger.js';
class MemoryMonitor {
    maxMemoryMB;
    constructor() {
        this.maxMemoryMB = appConfig.orchestrator.maxMemoryMB;
    }
    getCurrentUsage() {
        const used = process.memoryUsage();
        return Math.round(used.heapUsed / 1024 / 1024);
    }
    getUsagePercent() {
        return (this.getCurrentUsage() / this.maxMemoryMB) * 100;
    }
    isLowMemory() {
        return this.getUsagePercent() > 80;
    }
    getAvailableMemory() {
        return this.maxMemoryMB - this.getCurrentUsage();
    }
    getReport() {
        const usage = this.getCurrentUsage();
        const percent = this.getUsagePercent();
        const available = this.getAvailableMemory();
        const status = percent > 80 ? '🔴 High' : percent > 60 ? '🟡 Medium' : '🟢 Low';
        return {
            usage,
            max: this.maxMemoryMB,
            available,
            percent,
            status,
        };
    }
    logStatus() {
        const report = this.getReport();
        logger.info(`Memory: ${report.usage}MB / ${report.max}MB (${report.percent.toFixed(1)}%) ${report.status}`);
        if (this.isLowMemory()) {
            logger.warn('⚠️ Low memory! Consider reducing concurrent operations.');
        }
    }
    forceGC() {
        if (global.gc) {
            logger.debug('Running garbage collection...');
            global.gc();
            logger.debug('GC complete');
        }
        else {
            logger.warn('GC not available. Run node with --expose-gc flag.');
        }
    }
}
export const memoryMonitor = new MemoryMonitor();
//# sourceMappingURL=memory.js.map