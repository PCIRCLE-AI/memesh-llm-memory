import { logger } from '../utils/logger.js';
export class EvolutionMonitor {
    performanceTracker;
    learningManager;
    constructor(performanceTracker, learningManager) {
        this.performanceTracker = performanceTracker;
        this.learningManager = learningManager;
        logger.info('Evolution monitor initialized (simplified)');
    }
    getPerformanceTracker() {
        return this.performanceTracker;
    }
    getLearningManager() {
        return this.learningManager;
    }
}
//# sourceMappingURL=EvolutionMonitor.js.map