import { LearningManager } from './LearningManager.js';
import { AgentFeedback } from './types.js';
import { AgentType } from '../orchestrator/types.js';
export interface RoutingApprovalInput {
    taskId: string;
    recommendedAgent: AgentType;
    selectedAgent: AgentType;
    wasOverridden: boolean;
    confidence: number;
}
export interface TaskCompletionInput {
    taskId: string;
    agentId: AgentType;
    success: boolean;
    qualityScore: number;
    durationMs: number;
    userRating?: number;
    userComment?: string;
}
export declare class FeedbackCollector {
    private learningManager;
    constructor(learningManager: LearningManager);
    recordRoutingApproval(input: RoutingApprovalInput): AgentFeedback;
    recordTaskCompletion(input: TaskCompletionInput): AgentFeedback;
}
//# sourceMappingURL=FeedbackCollector.d.ts.map