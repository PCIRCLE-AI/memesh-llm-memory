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
    outputSchema?: Record<string, unknown>;
    annotations?: {
        title?: string;
        readOnlyHint?: boolean;
        destructiveHint?: boolean;
        idempotentHint?: boolean;
        openWorldHint?: boolean;
    };
}
export declare function getAllToolDefinitions(): MCPToolDefinition[];
//# sourceMappingURL=ToolDefinitions.d.ts.map