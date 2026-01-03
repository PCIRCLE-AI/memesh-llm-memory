import { ExternalServiceError } from '../errors/index.js';
import { logger } from '../utils/logger.js';
export class N8nWorkflowAgent {
    mcp;
    N8N_BASE_URL;
    API_KEY;
    constructor(mcp, config) {
        this.mcp = mcp;
        this.N8N_BASE_URL = config?.baseUrl || process.env.N8N_API_URL || 'http://localhost:5678/api/v1';
        this.API_KEY = config?.apiKey || process.env.N8N_API_KEY || '';
    }
    async createWorkflow(workflow) {
        try {
            const response = await this.mcp.bash({
                command: `curl -X POST "${this.N8N_BASE_URL}/workflows" \\
          -H "X-N8N-API-KEY: ${this.API_KEY}" \\
          -H "Content-Type: application/json" \\
          -d '${JSON.stringify(workflow)}'`,
                timeout: 30000
            });
            if (response.exitCode !== 0) {
                throw new ExternalServiceError(`n8n API request failed: ${response.stderr}`, {
                    service: 'n8n',
                    endpoint: `${this.N8N_BASE_URL}/workflows`,
                    method: 'POST',
                    exitCode: response.exitCode,
                    stderr: response.stderr,
                });
            }
            const result = JSON.parse(response.stdout);
            const workflowId = result.data?.id;
            await this.mcp.memory.createEntities({
                entities: [{
                        name: `n8n Workflow ${workflow.name}`,
                        entityType: 'n8n_workflow',
                        observations: [
                            `Workflow ID: ${workflowId}`,
                            `Name: ${workflow.name}`,
                            `Nodes: ${workflow.nodes.length}`,
                            `Active: ${workflow.active}`,
                            `Created: ${new Date().toISOString()}`
                        ]
                    }]
            });
            return {
                success: true,
                workflowId,
                workflowUrl: `${this.N8N_BASE_URL.replace('/api/v1', '')}/workflow/${workflowId}`
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    async getWorkflow(workflowId) {
        try {
            const response = await this.mcp.bash({
                command: `curl -X GET "${this.N8N_BASE_URL}/workflows/${workflowId}" \\
          -H "X-N8N-API-KEY: ${this.API_KEY}"`,
                timeout: 30000
            });
            if (response.exitCode !== 0) {
                throw new ExternalServiceError(`Failed to get workflow: ${response.stderr}`, {
                    service: 'n8n',
                    endpoint: `${this.N8N_BASE_URL}/workflows/${workflowId}`,
                    method: 'GET',
                    workflowId,
                    exitCode: response.exitCode,
                    stderr: response.stderr,
                });
            }
            const result = JSON.parse(response.stdout);
            return result.data;
        }
        catch (error) {
            logger.error('Get workflow failed:', error);
            return null;
        }
    }
    async listWorkflows() {
        try {
            const response = await this.mcp.bash({
                command: `curl -X GET "${this.N8N_BASE_URL}/workflows" \\
          -H "X-N8N-API-KEY: ${this.API_KEY}"`,
                timeout: 30000
            });
            if (response.exitCode !== 0) {
                throw new ExternalServiceError(`Failed to list workflows: ${response.stderr}`, {
                    service: 'n8n',
                    endpoint: `${this.N8N_BASE_URL}/workflows`,
                    method: 'GET',
                    exitCode: response.exitCode,
                    stderr: response.stderr,
                });
            }
            const result = JSON.parse(response.stdout);
            return result.data || [];
        }
        catch (error) {
            logger.error('List workflows failed:', error);
            return [];
        }
    }
    async updateWorkflow(workflowId, updates) {
        try {
            const response = await this.mcp.bash({
                command: `curl -X PATCH "${this.N8N_BASE_URL}/workflows/${workflowId}" \\
          -H "X-N8N-API-KEY: ${this.API_KEY}" \\
          -H "Content-Type: application/json" \\
          -d '${JSON.stringify(updates)}'`,
                timeout: 30000
            });
            if (response.exitCode !== 0) {
                throw new ExternalServiceError(`Failed to update workflow: ${response.stderr}`, {
                    service: 'n8n',
                    endpoint: `${this.N8N_BASE_URL}/workflows/${workflowId}`,
                    method: 'PATCH',
                    workflowId,
                    exitCode: response.exitCode,
                    stderr: response.stderr,
                });
            }
            return {
                success: true,
                workflowId
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    async deleteWorkflow(workflowId) {
        try {
            const response = await this.mcp.bash({
                command: `curl -X DELETE "${this.N8N_BASE_URL}/workflows/${workflowId}" \\
          -H "X-N8N-API-KEY: ${this.API_KEY}"`,
                timeout: 30000
            });
            return response.exitCode === 0;
        }
        catch (error) {
            logger.error('Delete workflow failed:', error);
            return false;
        }
    }
    async executeWorkflow(workflowId, data) {
        try {
            const payload = data ? JSON.stringify({ data }) : '{}';
            const response = await this.mcp.bash({
                command: `curl -X POST "${this.N8N_BASE_URL}/workflows/${workflowId}/execute" \\
          -H "X-N8N-API-KEY: ${this.API_KEY}" \\
          -H "Content-Type: application/json" \\
          -d '${payload}'`,
                timeout: 60000
            });
            if (response.exitCode !== 0) {
                throw new ExternalServiceError(`Workflow execution failed: ${response.stderr}`, {
                    service: 'n8n',
                    endpoint: `${this.N8N_BASE_URL}/workflows/${workflowId}/execute`,
                    method: 'POST',
                    workflowId,
                    exitCode: response.exitCode,
                    stderr: response.stderr,
                });
            }
            const result = JSON.parse(response.stdout);
            return result.data;
        }
        catch (error) {
            logger.error('Execute workflow failed:', error);
            return null;
        }
    }
    createSimpleHttpWorkflow(name, url) {
        return {
            name,
            nodes: [
                {
                    id: 'start',
                    name: 'Start',
                    type: 'n8n-nodes-base.start',
                    position: [250, 300],
                    parameters: {}
                },
                {
                    id: 'httpRequest',
                    name: 'HTTP Request',
                    type: 'n8n-nodes-base.httpRequest',
                    position: [450, 300],
                    parameters: {
                        url,
                        method: 'GET'
                    }
                }
            ],
            connections: {
                Start: {
                    main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]]
                }
            },
            active: false
        };
    }
    createAIAgentWorkflow(name, prompt) {
        return {
            name,
            nodes: [
                {
                    id: 'start',
                    name: 'Start',
                    type: 'n8n-nodes-base.start',
                    position: [250, 300],
                    parameters: {}
                },
                {
                    id: 'aiAgent',
                    name: 'AI Agent',
                    type: 'n8n-nodes-base.aiAgent',
                    position: [450, 300],
                    parameters: {
                        prompt,
                        model: 'gpt-4'
                    }
                }
            ],
            connections: {
                Start: {
                    main: [[{ node: 'AI Agent', type: 'main', index: 0 }]]
                }
            },
            active: false
        };
    }
}
//# sourceMappingURL=N8nWorkflowAgent.js.map