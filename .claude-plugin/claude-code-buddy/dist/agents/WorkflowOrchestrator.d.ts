import { MCPToolInterface } from '../core/MCPToolInterface.js';
import { N8nWorkflow } from './N8nWorkflowAgent.js';
export interface WorkflowRequest {
    description: string;
    platform?: 'opal' | 'n8n' | 'auto';
    priority?: 'speed' | 'production';
}
export interface WorkflowResult {
    success: boolean;
    platform: 'opal' | 'n8n';
    workflowUrl?: string;
    workflowId?: string;
    screenshot?: string;
    error?: string;
    reasoning?: string;
}
export declare class WorkflowOrchestrator {
    private mcp;
    private opalAgent;
    private n8nAgent;
    constructor(mcp: MCPToolInterface);
    createWorkflow(request: WorkflowRequest): Promise<WorkflowResult>;
    private choosePlatform;
    private getReasoningForPlatform;
    private createOpalWorkflow;
    private createN8nWorkflow;
    private generateN8nWorkflowFromDescription;
    private invokeBrainstormingSkill;
    private parseAIWorkflowResponse;
    private generateNodeParameters;
    private generateN8nWorkflowFromKeywords;
    private extractUrl;
    listAllWorkflows(): Promise<{
        opal: Array<{
            url: string;
            description: string;
        }>;
        n8n: N8nWorkflow[];
    }>;
    private getOpalWorkflowsFromMemory;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=WorkflowOrchestrator.d.ts.map