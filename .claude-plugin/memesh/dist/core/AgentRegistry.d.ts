import { AgentType } from '../orchestrator/types.js';
import { AgentClassification } from '../types/AgentClassification.js';
export interface AgentMetadata {
    name: AgentType;
    description: string;
    category: string;
    classification: AgentClassification;
    capabilities?: string[];
    mcpTools?: string[];
    requiredDependencies?: string[];
    inputSchema?: {
        type: string;
        properties: Record<string, unknown>;
        required: string[];
    };
}
export declare class AgentRegistry {
    private agents;
    constructor();
    registerAgent(agent: AgentMetadata): void;
    getAllAgents(): AgentMetadata[];
    getAgent(name: AgentType): AgentMetadata | undefined;
    getAgentsByCategory(category: string): AgentMetadata[];
    hasAgent(name: AgentType): boolean;
    getAgentCount(): number;
    getAllAgentTypes(): AgentType[];
    getRealImplementations(): AgentMetadata[];
    getEnhancedPrompts(): AgentMetadata[];
    getOptionalAgents(): AgentMetadata[];
    private registerAllAgents;
}
//# sourceMappingURL=AgentRegistry.d.ts.map