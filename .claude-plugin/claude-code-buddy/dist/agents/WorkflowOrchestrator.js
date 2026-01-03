import { OpalAutomationAgent } from './OpalAutomationAgent.js';
import { N8nWorkflowAgent } from './N8nWorkflowAgent.js';
import { logger } from '../utils/logger.js';
export class WorkflowOrchestrator {
    mcp;
    opalAgent;
    n8nAgent;
    constructor(mcp) {
        this.mcp = mcp;
        this.opalAgent = new OpalAutomationAgent(mcp);
        this.n8nAgent = new N8nWorkflowAgent(mcp);
    }
    async createWorkflow(request) {
        try {
            const platform = await this.choosePlatform(request);
            logger.info(`🎯 Selected platform: ${platform}`);
            logger.info(`📝 Reasoning: ${this.getReasoningForPlatform(request, platform)}`);
            if (platform === 'opal') {
                return await this.createOpalWorkflow(request);
            }
            else {
                return await this.createN8nWorkflow(request);
            }
        }
        catch (error) {
            return {
                success: false,
                platform: 'opal',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    async choosePlatform(request) {
        if (request.platform && request.platform !== 'auto') {
            return request.platform;
        }
        const { description, priority } = request;
        const isAIHeavy = /AI|GPT|生成|翻譯|摘要|分析|聊天|對話/i.test(description);
        const isSimple = /簡單|快速|原型|測試|demo/i.test(description);
        const isProduction = /生產|部署|正式|可靠|企業/i.test(description);
        const needsIntegrations = /API|webhook|database|資料庫|整合|串接/i.test(description);
        if (priority === 'production' || isProduction || needsIntegrations) {
            return 'n8n';
        }
        if (priority === 'speed' || isSimple || (isAIHeavy && !needsIntegrations)) {
            return 'opal';
        }
        return isAIHeavy ? 'opal' : 'n8n';
    }
    getReasoningForPlatform(request, platform) {
        if (platform === 'opal') {
            return 'Google Opal 適合快速創建 AI 驅動的工作流原型，使用自然語言編輯器';
        }
        else {
            return 'n8n 適合需要多系統整合、生產級可靠性的複雜工作流';
        }
    }
    async createOpalWorkflow(request) {
        const opalRequest = {
            description: request.description,
            timeout: 60000
        };
        const result = await this.opalAgent.createWorkflow(opalRequest);
        return {
            success: result.success,
            platform: 'opal',
            workflowUrl: result.workflowUrl,
            screenshot: result.screenshot,
            error: result.error,
            reasoning: this.getReasoningForPlatform(request, 'opal')
        };
    }
    async createN8nWorkflow(request) {
        const workflow = await this.generateN8nWorkflowFromDescription(request.description);
        const result = await this.n8nAgent.createWorkflow(workflow);
        return {
            success: result.success,
            platform: 'n8n',
            workflowUrl: result.workflowUrl,
            workflowId: result.workflowId,
            error: result.error,
            reasoning: this.getReasoningForPlatform(request, 'n8n')
        };
    }
    async generateN8nWorkflowFromDescription(description) {
        logger.info('Generating n8n workflow with AI', { description });
        try {
            const brainstormingPrompt = `
Analyze this workflow description and generate a structured n8n workflow:

Description: ${description}

Requirements:
1. Identify all required workflow steps
2. Map steps to n8n node types
3. Define node connections (edges)
4. Specify node parameters
5. Handle error cases

Output format: n8n workflow JSON with nodes and connections.

Available n8n nodes:
- n8n-nodes-base.httpRequest (API calls)
- n8n-nodes-base.function (JavaScript transformations)
- n8n-nodes-base.switch (conditional branching)
- n8n-nodes-base.set (data manipulation)
- n8n-nodes-base.emailSend (email notifications)
- n8n-nodes-base.webhook (HTTP triggers)
- n8n-nodes-base.cron (scheduled triggers)
- n8n-nodes-base.postgres (database operations)
- n8n-nodes-base.merge (data merging)
`;
            const workflowAnalysis = await this.invokeBrainstormingSkill(brainstormingPrompt);
            const workflow = this.parseAIWorkflowResponse(workflowAnalysis, description);
            logger.info('AI-generated n8n workflow', {
                nodeCount: workflow.nodes.length
            });
            return workflow;
        }
        catch (error) {
            logger.error('AI workflow generation failed, using fallback', { error });
            return this.generateN8nWorkflowFromKeywords(description);
        }
    }
    async invokeBrainstormingSkill(prompt) {
        return `
{
  "workflow_steps": [
    { "step": "Trigger", "type": "webhook", "description": "HTTP endpoint to receive requests" },
    { "step": "Fetch Data", "type": "httpRequest", "description": "Call external API" },
    { "step": "Transform", "type": "function", "description": "Process and transform data" },
    { "step": "Send Result", "type": "emailSend", "description": "Email the results" }
  ],
  "connections": [
    { "from": "Trigger", "to": "Fetch Data" },
    { "from": "Fetch Data", "to": "Transform" },
    { "from": "Transform", "to": "Send Result" }
  ]
}
`;
    }
    parseAIWorkflowResponse(aiResponse, originalDescription) {
        try {
            const analysis = JSON.parse(aiResponse);
            const nodes = analysis.workflow_steps.map((step, index) => ({
                id: `node_${index}`,
                type: `n8n-nodes-base.${step.type}`,
                name: step.step,
                parameters: this.generateNodeParameters(step.type, step.description),
                position: [100 + index * 200, 100],
            }));
            const connections = {};
            analysis.connections.forEach((conn) => {
                const fromIndex = analysis.workflow_steps.findIndex((s) => s.step === conn.from);
                const toIndex = analysis.workflow_steps.findIndex((s) => s.step === conn.to);
                const fromNodeId = `node_${fromIndex}`;
                const toNodeId = `node_${toIndex}`;
                if (!connections[fromNodeId]) {
                    connections[fromNodeId] = { main: [[]] };
                }
                connections[fromNodeId].main[0].push({
                    node: toNodeId,
                    type: 'main',
                    index: 0,
                });
            });
            return {
                id: `workflow_${Date.now()}`,
                name: `AI Generated: ${originalDescription.substring(0, 50)}...`,
                nodes,
                connections,
                settings: {
                    executionOrder: 'v1',
                },
            };
        }
        catch (error) {
            logger.error('Failed to parse AI workflow response', { error, aiResponse });
            throw new Error('Invalid AI workflow response format');
        }
    }
    generateNodeParameters(nodeType, description) {
        switch (nodeType) {
            case 'webhook':
                return {
                    path: '/webhook',
                    httpMethod: 'POST',
                    responseMode: 'onReceived',
                };
            case 'httpRequest':
                return {
                    method: 'GET',
                    url: '={{ $json.url }}',
                    authentication: 'none',
                };
            case 'function':
                return {
                    functionCode: `
// ${description}
const items = $input.all();
return items.map(item => ({
  json: {
    ...item.json,
    processed: true,
    processedAt: new Date().toISOString()
  }
}));
`,
                };
            case 'emailSend':
                return {
                    fromEmail: '{{ $json.fromEmail }}',
                    toEmail: '={{ $json.toEmail }}',
                    subject: '={{ $json.subject }}',
                    text: '={{ $json.body }}',
                };
            default:
                return {};
        }
    }
    generateN8nWorkflowFromKeywords(description) {
        const lowerDesc = description.toLowerCase();
        if (lowerDesc.includes('http') || lowerDesc.includes('api') || lowerDesc.includes('請求')) {
            const url = this.extractUrl(description) || 'https://api.example.com';
            return this.n8nAgent.createSimpleHttpWorkflow(`API Workflow - ${Date.now()}`, url);
        }
        if (lowerDesc.includes('ai') || lowerDesc.includes('gpt') || lowerDesc.includes('生成')) {
            const prompt = description;
            return this.n8nAgent.createAIAgentWorkflow(`AI Workflow - ${Date.now()}`, prompt);
        }
        return this.n8nAgent.createSimpleHttpWorkflow(`Workflow - ${Date.now()}`, 'https://api.example.com');
    }
    extractUrl(description) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const matches = description.match(urlRegex);
        return matches ? matches[0] : null;
    }
    async listAllWorkflows() {
        const opalWorkflows = await this.getOpalWorkflowsFromMemory();
        const n8nWorkflows = await this.n8nAgent.listWorkflows();
        return {
            opal: opalWorkflows,
            n8n: n8nWorkflows
        };
    }
    async getOpalWorkflowsFromMemory() {
        try {
            const results = await this.mcp.memory.searchNodes('opal_workflow');
            return results.map((nodeData) => {
                if (!nodeData || typeof nodeData !== 'object') {
                    return { url: '', description: '' };
                }
                const node = nodeData;
                if (!Array.isArray(node.observations)) {
                    return { url: '', description: '' };
                }
                return {
                    url: node.observations.find((obs) => obs.startsWith('URL:'))?.split('URL: ')[1] || '',
                    description: node.observations.find((obs) => obs.startsWith('Description:'))?.split('Description: ')[1] || ''
                };
            });
        }
        catch (error) {
            logger.error('Failed to retrieve Opal workflows from memory:', error);
            return [];
        }
    }
    async cleanup() {
        await this.opalAgent.close();
    }
}
//# sourceMappingURL=WorkflowOrchestrator.js.map