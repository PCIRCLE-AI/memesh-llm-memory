import type { WorkflowOrchestrator } from '../../agents/WorkflowOrchestrator.js';
export interface CreateWorkflowArgs {
    description: string;
    platform?: 'opal' | 'n8n' | 'auto';
    priority?: 'speed' | 'production';
}
export declare const createWorkflowTool: {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            description: {
                type: string;
                description: string;
            };
            platform: {
                type: string;
                enum: string[];
                description: string;
            };
            priority: {
                type: string;
                enum: string[];
                description: string;
            };
        };
        required: string[];
    };
    handler(args: CreateWorkflowArgs, workflowOrchestrator: WorkflowOrchestrator): Promise<{
        success: boolean;
        error: string;
        platform?: undefined;
        workflowUrl?: undefined;
        workflowId?: undefined;
        screenshot?: undefined;
        reasoning?: undefined;
        message?: undefined;
        nextSteps?: undefined;
    } | {
        success: boolean;
        platform: "opal" | "n8n";
        workflowUrl: string | undefined;
        workflowId: string | undefined;
        screenshot: string | undefined;
        reasoning: string | undefined;
        message: string;
        nextSteps: string;
        error?: undefined;
    }>;
};
//# sourceMappingURL=workflow-create.d.ts.map