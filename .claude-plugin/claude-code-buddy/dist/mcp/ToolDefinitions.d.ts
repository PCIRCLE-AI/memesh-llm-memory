import { AgentMetadata } from '../core/AgentRegistry.js';
export declare const CommonSchemas: {
    taskInput: {
        type: "object";
        properties: {
            taskDescription: {
                type: string;
                description: string;
            };
            priority: {
                type: string;
                description: string;
                minimum: number;
                maximum: number;
            };
        };
        required: string[];
    };
    dashboardInput: {
        type: "object";
        properties: {
            format: {
                type: string;
                description: string;
                enum: string[];
            };
        };
    };
};
export interface MCPToolDefinition {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}
export declare function getAllToolDefinitions(allAgents: AgentMetadata[]): MCPToolDefinition[];
//# sourceMappingURL=ToolDefinitions.d.ts.map