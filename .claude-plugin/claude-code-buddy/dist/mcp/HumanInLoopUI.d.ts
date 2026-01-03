import { AgentType } from '../orchestrator/types.js';
export interface AgentAlternative {
    agent: AgentType;
    confidence: number;
    reason: string;
}
export interface ConfirmationRequest {
    taskDescription: string;
    recommendedAgent: AgentType;
    confidence: number;
    reasoning: string[];
    alternatives: AgentAlternative[];
}
export interface ConfirmationResponse {
    accepted: boolean;
    selectedAgent?: AgentType;
    wasOverridden: boolean;
}
export declare class HumanInLoopUI {
    formatConfirmationRequest(request: ConfirmationRequest): string;
    parseUserResponse(input: string, request: ConfirmationRequest): ConfirmationResponse;
}
//# sourceMappingURL=HumanInLoopUI.d.ts.map