import type { ProjectMemoryManager } from '../../memory/ProjectMemoryManager.js';
export interface RecallMemoryArgs {
    limit?: number;
    query?: string;
}
export declare const recallMemoryTool: {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            limit: {
                type: string;
                description: string;
                default: number;
            };
            query: {
                type: string;
                description: string;
            };
        };
    };
    handler(args: RecallMemoryArgs, memoryManager: ProjectMemoryManager): Promise<{
        memories: {
            type: import("../../knowledge-graph/types.js").EntityType;
            observations: string[];
            timestamp: any;
        }[];
    }>;
};
//# sourceMappingURL=recall-memory.d.ts.map