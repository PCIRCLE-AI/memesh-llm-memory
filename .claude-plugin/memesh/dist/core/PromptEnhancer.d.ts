import { AgentType, Task, EnhancedPrompt } from '../orchestrator/types.js';
export declare class PromptEnhancer {
    enhance(agentType: AgentType, task: Task, complexity?: 'simple' | 'medium' | 'complex'): EnhancedPrompt;
    private buildSystemPrompt;
    private buildUserPrompt;
    private buildGuardrails;
    private getEvidenceGuardrails;
    private getAgentSpecificInstructions;
    private suggestModel;
    getAgentPersona(agentType: AgentType): string;
    getAgentTools(agentType: AgentType): string[];
}
//# sourceMappingURL=PromptEnhancer.d.ts.map