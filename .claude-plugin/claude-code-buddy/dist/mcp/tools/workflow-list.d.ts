import type { WorkflowOrchestrator } from '../../agents/WorkflowOrchestrator.js';
export interface ListWorkflowsArgs {
    platform?: 'opal' | 'n8n' | 'all';
}
export declare const listWorkflowsTool: {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            platform: {
                type: string;
                enum: string[];
                description: string;
            };
        };
        required: never[];
    };
    handler(args: ListWorkflowsArgs, workflowOrchestrator: WorkflowOrchestrator): Promise<{
        success: boolean;
        summary: {
            total: number;
            opal: number;
            n8n: number;
        };
        opalWorkflows: {
            index: number;
            platform: string;
            url: string;
            description: string;
        }[];
        n8nWorkflows: {
            index: number;
            platform: string;
            id: string | undefined;
            name: string;
            nodes: number;
            active: string;
        }[];
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        summary?: undefined;
        opalWorkflows?: undefined;
        n8nWorkflows?: undefined;
        message?: undefined;
    }>;
};
//# sourceMappingURL=workflow-list.d.ts.map