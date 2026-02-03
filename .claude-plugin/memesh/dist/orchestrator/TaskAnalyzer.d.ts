import { Task, TaskAnalysis } from './types.js';
export declare class TaskAnalyzer {
    constructor();
    analyze(task: Task): Promise<TaskAnalysis>;
    private determineComplexity;
    private matchesRule;
    private estimateTokens;
    private detectRequiredCapabilities;
    private determineExecutionMode;
    private calculateEstimatedCost;
    private generateReasoning;
    analyzeBatch(tasks: Task[]): Promise<TaskAnalysis[]>;
    suggestPriority(analysis: TaskAnalysis): number;
}
//# sourceMappingURL=TaskAnalyzer.d.ts.map