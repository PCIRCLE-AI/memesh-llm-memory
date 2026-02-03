export interface AgentCard {
    id: string;
    name: string;
    description?: string;
    version?: string;
    capabilities: AgentCapabilities;
    endpoints: AgentEndpoints;
    metadata?: Record<string, unknown>;
}
export interface AgentCapabilities {
    skills: Skill[];
    supportedFormats?: string[];
    maxMessageSize?: number;
    streaming?: boolean;
    pushNotifications?: boolean;
}
export interface Skill {
    name: string;
    description: string;
    parameters?: SkillParameter[];
    examples?: SkillExample[];
}
export interface SkillParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description?: string;
    required?: boolean;
    default?: unknown;
}
export interface SkillExample {
    description: string;
    input: Record<string, unknown>;
    output?: unknown;
}
export interface AgentEndpoints {
    baseUrl: string;
    sendMessage?: string;
    getTask?: string;
    listTasks?: string;
    cancelTask?: string;
    getAgentCard?: string;
}
export interface AgentRegistryEntry {
    agentId: string;
    baseUrl: string;
    port: number;
    status: 'active' | 'inactive' | 'stale';
    lastHeartbeat: string;
    capabilities?: AgentCapabilities;
    metadata?: Record<string, unknown>;
}
export interface RegisterAgentParams {
    agentId: string;
    baseUrl: string;
    port: number;
    capabilities?: AgentCapabilities;
    metadata?: Record<string, unknown>;
}
//# sourceMappingURL=agent-card.d.ts.map