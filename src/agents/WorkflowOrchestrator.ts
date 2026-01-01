/**
 * WorkflowOrchestrator - 智能工作流協調器
 *
 * 用戶只需描述想做什麼，自動選擇最佳平台並創建工作流
 * - Google Opal: 快速 AI 原型
 * - n8n: 生產級工作流
 */

import { MCPToolInterface } from '../core/MCPToolInterface.js';
import { OpalAutomationAgent, OpalWorkflowRequest } from './OpalAutomationAgent.js';
import { N8nWorkflowAgent, N8nWorkflow, N8nNode, N8nConnections } from './N8nWorkflowAgent.js';
import { logger } from '../utils/logger.js';

export interface WorkflowRequest {
  description: string;          // 用戶的自然語言描述
  platform?: 'opal' | 'n8n' | 'auto';  // 指定平台或自動選擇
  priority?: 'speed' | 'production';   // 優先級：速度 vs 生產級
}

export interface WorkflowResult {
  success: boolean;
  platform: 'opal' | 'n8n';
  workflowUrl?: string;
  workflowId?: string;
  screenshot?: string;
  error?: string;
  reasoning?: string;  // 為什麼選擇這個平台
}

export class WorkflowOrchestrator {
  private opalAgent: OpalAutomationAgent;
  private n8nAgent: N8nWorkflowAgent;

  constructor(private mcp: MCPToolInterface) {
    this.opalAgent = new OpalAutomationAgent(mcp);
    this.n8nAgent = new N8nWorkflowAgent(mcp);
  }

  /**
   * 主要入口：用戶描述需求，自動創建工作流
   */
  async createWorkflow(request: WorkflowRequest): Promise<WorkflowResult> {
    try {
      // 1. 分析用戶意圖，選擇最佳平台
      const platform = await this.choosePlatform(request);

      logger.info(`🎯 Selected platform: ${platform}`);
      logger.info(`📝 Reasoning: ${this.getReasoningForPlatform(request, platform)}`);

      // 2. 根據平台執行
      if (platform === 'opal') {
        return await this.createOpalWorkflow(request);
      } else {
        return await this.createN8nWorkflow(request);
      }

    } catch (error) {
      return {
        success: false,
        platform: 'opal', // fallback
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 智能選擇平台
   */
  private async choosePlatform(request: WorkflowRequest): Promise<'opal' | 'n8n'> {
    // 如果用戶指定了平台
    if (request.platform && request.platform !== 'auto') {
      return request.platform;
    }

    // 根據描述和優先級自動選擇
    const { description, priority } = request;

    // 分析關鍵字
    const isAIHeavy = /AI|GPT|生成|翻譯|摘要|分析|聊天|對話/i.test(description);
    const isSimple = /簡單|快速|原型|測試|demo/i.test(description);
    const isProduction = /生產|部署|正式|可靠|企業/i.test(description);
    const needsIntegrations = /API|webhook|database|資料庫|整合|串接/i.test(description);

    // 決策邏輯
    if (priority === 'production' || isProduction || needsIntegrations) {
      return 'n8n';  // 生產級需求 → n8n
    }

    if (priority === 'speed' || isSimple || (isAIHeavy && !needsIntegrations)) {
      return 'opal';  // 快速原型或純 AI 任務 → Opal
    }

    // 預設：AI 相關用 Opal，其他用 n8n
    return isAIHeavy ? 'opal' : 'n8n';
  }

  /**
   * 獲取選擇理由
   */
  private getReasoningForPlatform(request: WorkflowRequest, platform: 'opal' | 'n8n'): string {
    if (platform === 'opal') {
      return 'Google Opal 適合快速創建 AI 驅動的工作流原型，使用自然語言編輯器';
    } else {
      return 'n8n 適合需要多系統整合、生產級可靠性的複雜工作流';
    }
  }

  /**
   * 使用 Opal 創建工作流
   */
  private async createOpalWorkflow(request: WorkflowRequest): Promise<WorkflowResult> {
    const opalRequest: OpalWorkflowRequest = {
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

  /**
   * 使用 n8n 創建工作流
   */
  private async createN8nWorkflow(request: WorkflowRequest): Promise<WorkflowResult> {
    // 基於描述生成 n8n 工作流結構
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

  /**
   * 從自然語言描述生成 n8n 工作流
   * 使用 AI (superpowers:brainstorming skill) 進行智能分析
   */
  private async generateN8nWorkflowFromDescription(description: string): Promise<N8nWorkflow> {
    logger.info('Generating n8n workflow with AI', { description });

    try {
      // Use superpowers:brainstorming skill for intelligent analysis
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

      // Invoke brainstorming skill
      const workflowAnalysis = await this.invokeBrainstormingSkill(brainstormingPrompt);

      // Parse AI response into n8n workflow structure
      const workflow = this.parseAIWorkflowResponse(workflowAnalysis, description);

      logger.info('AI-generated n8n workflow', {
        nodeCount: workflow.nodes.length
      });

      return workflow;

    } catch (error) {
      logger.error('AI workflow generation failed, using fallback', { error });
      // Fallback to keyword-based generation
      return this.generateN8nWorkflowFromKeywords(description);
    }
  }

  /**
   * Invoke brainstorming skill via MCP
   */
  private async invokeBrainstormingSkill(prompt: string): Promise<string> {
    // TODO: Replace with actual MCP tool invocation - See issue #4
    // For now, use a mock implementation

    // In production, this would be:
    // const result = await this.mcpClient.invokeSkill('superpowers:brainstorming', { prompt });
    // return result.analysis;

    // Mock for development/testing
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

  /**
   * Parse AI response into n8n workflow
   */
  private parseAIWorkflowResponse(aiResponse: string, originalDescription: string): N8nWorkflow {
    try {
      const analysis = JSON.parse(aiResponse) as {
        workflow_steps: Array<{
          step: string;
          type: string;
          description: string;
        }>;
        connections: Array<{
          from: string;
          to: string;
        }>;
      };

      const nodes: N8nNode[] = analysis.workflow_steps.map((step, index: number) => ({
        id: `node_${index}`,
        type: `n8n-nodes-base.${step.type}`,
        name: step.step,
        parameters: this.generateNodeParameters(step.type, step.description),
        position: [100 + index * 200, 100],
      }));

      // Build connections in n8n format
      const connections: N8nConnections = {};
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

    } catch (error) {
      logger.error('Failed to parse AI workflow response', { error, aiResponse });
      throw new Error('Invalid AI workflow response format');
    }
  }

  /**
   * Generate node-specific parameters
   */
  private generateNodeParameters(nodeType: string, description: string): Record<string, unknown> {
    // Basic parameter generation based on node type
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
          url: '={{ $json.url }}', // Dynamic from previous node
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

  /**
   * Fallback: keyword-based workflow generation (original simple logic)
   */
  private generateN8nWorkflowFromKeywords(description: string): N8nWorkflow {
    // Original simple keyword matching logic as fallback
    const lowerDesc = description.toLowerCase();

    // 檢測工作流類型
    if (lowerDesc.includes('http') || lowerDesc.includes('api') || lowerDesc.includes('請求')) {
      const url = this.extractUrl(description) || 'https://api.example.com';
      return this.n8nAgent.createSimpleHttpWorkflow(
        `API Workflow - ${Date.now()}`,
        url
      );
    }

    if (lowerDesc.includes('ai') || lowerDesc.includes('gpt') || lowerDesc.includes('生成')) {
      const prompt = description;
      return this.n8nAgent.createAIAgentWorkflow(
        `AI Workflow - ${Date.now()}`,
        prompt
      );
    }

    // 預設：簡單的 HTTP 工作流
    return this.n8nAgent.createSimpleHttpWorkflow(
      `Workflow - ${Date.now()}`,
      'https://api.example.com'
    );
  }

  /**
   * 從描述中提取 URL
   */
  private extractUrl(description: string): string | null {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = description.match(urlRegex);
    return matches ? matches[0] : null;
  }

  /**
   * 列出所有現有工作流
   */
  async listAllWorkflows(): Promise<{
    opal: Array<{ url: string; description: string }>;
    n8n: N8nWorkflow[];
  }> {
    // Opal 工作流需要從 Knowledge Graph 檢索
    const opalWorkflows = await this.getOpalWorkflowsFromMemory();

    // n8n 工作流從 API 獲取
    const n8nWorkflows = await this.n8nAgent.listWorkflows();

    return {
      opal: opalWorkflows,
      n8n: n8nWorkflows
    };
  }

  /**
   * 從 Memory 檢索 Opal 工作流
   */
  private async getOpalWorkflowsFromMemory(): Promise<Array<{ url: string; description: string }>> {
    try {
      const results = await this.mcp.memory.searchNodes('opal_workflow');

      return results.map((nodeData: unknown) => {
        // Type guard for memory node structure
        if (!nodeData || typeof nodeData !== 'object') {
          return { url: '', description: '' };
        }

        const node = nodeData as { observations?: string[] };
        if (!Array.isArray(node.observations)) {
          return { url: '', description: '' };
        }

        return {
          url: node.observations.find((obs) => obs.startsWith('URL:'))?.split('URL: ')[1] || '',
          description: node.observations.find((obs) => obs.startsWith('Description:'))?.split('Description: ')[1] || ''
        };
      });
    } catch (error) {
      logger.error('Failed to retrieve Opal workflows from memory:', error);
      return [];
    }
  }

  /**
   * 關閉所有 Agent
   */
  async cleanup(): Promise<void> {
    await this.opalAgent.close();
  }
}
