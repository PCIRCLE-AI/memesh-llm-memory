import { AgentType } from '../../orchestrator/types.js';
export declare const AGENT_PERSONAS: Record<AgentType, string>;
export declare const AGENT_TOOLS: Record<AgentType, string[]>;
export interface ModelSuggestion {
    simple: string;
    medium: string;
    complex: string;
}
export declare const MODEL_SUGGESTIONS: Record<AgentType, ModelSuggestion>;
export declare const AGENT_INSTRUCTIONS: Record<AgentType, string>;
//# sourceMappingURL=PromptTemplates.d.ts.map