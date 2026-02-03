import type { PerformanceTracker } from './PerformanceTracker.js';
import type { LearningManager } from './LearningManager.js';
export declare class EvolutionMonitor {
    private performanceTracker;
    private learningManager;
    constructor(performanceTracker?: PerformanceTracker, learningManager?: LearningManager);
    getPerformanceTracker(): PerformanceTracker;
    getLearningManager(): LearningManager;
}
//# sourceMappingURL=EvolutionMonitor.d.ts.map