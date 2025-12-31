/**
 * WorkflowOrchestrator - 智能工作流協調器
 *
 * 用戶只需描述想做什麼，自動選擇最佳平台並創建工作流
 * - Google Opal: 快速 AI 原型
 * - n8n: 生產級工作流
 */

import { MCPToolInterface } from '../core/MCPToolInterface.js';
import { OpalAutomationAgent, OpalWorkflowRequest } from './OpalAutomationAgent.js';
import { N8nWorkflowAgent, N8nWorkflow } from './N8nWorkflowAgent.js';

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

      console.log(`🎯 Selected platform: ${platform}`);
      console.log(`📝 Reasoning: ${this.getReasoningForPlatform(request, platform)}`);

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
   * TODO: 整合 superpowers:brainstorming skill 進行智能分析
   */
  private async generateN8nWorkflowFromDescription(description: string): Promise<N8nWorkflow> {
    // 簡化版：根據關鍵字生成基本工作流
    // 實際應該使用 AI 分析描述並生成適當的節點結構

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

      return results.map((node: any) => ({
        url: node.observations.find((obs: string) => obs.startsWith('URL:'))?.split('URL: ')[1] || '',
        description: node.observations.find((obs: string) => obs.startsWith('Description:'))?.split('Description: ')[1] || ''
      }));
    } catch (error) {
      console.error('Failed to retrieve Opal workflows from memory:', error);
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
