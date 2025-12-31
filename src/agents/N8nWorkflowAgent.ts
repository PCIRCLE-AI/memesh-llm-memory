/**
 * N8nWorkflowAgent - n8n 工作流 API 整合
 *
 * 使用 n8n MCP Server 進行程式化工作流管理
 * https://docs.n8n.io/
 */

import { MCPToolInterface } from '../core/MCPToolInterface.js';

export interface N8nWorkflow {
  id?: string;
  name: string;
  nodes: N8nNode[];
  connections: N8nConnections;
  active?: boolean;
  settings?: Record<string, any>;
}

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  parameters: Record<string, any>;
}

export interface N8nConnections {
  [key: string]: {
    main: Array<Array<{ node: string; type: string; index: number }>>;
  };
}

export interface N8nWorkflowResult {
  success: boolean;
  workflowId?: string;
  workflowUrl?: string;
  error?: string;
}

export class N8nWorkflowAgent {
  private readonly N8N_BASE_URL: string;
  private readonly API_KEY: string;

  constructor(
    private mcp: MCPToolInterface,
    config?: { baseUrl?: string; apiKey?: string }
  ) {
    // 從環境變數或配置獲取
    this.N8N_BASE_URL = config?.baseUrl || process.env.N8N_API_URL || 'http://localhost:5678/api/v1';
    this.API_KEY = config?.apiKey || process.env.N8N_API_KEY || '';
  }

  /**
   * 創建新的 n8n 工作流
   */
  async createWorkflow(workflow: N8nWorkflow): Promise<N8nWorkflowResult> {
    try {
      // 使用 MCP bash tool 執行 curl 請求
      // 注意：實際應該使用 n8n MCP server 的工具
      const response = await this.mcp.bash({
        command: `curl -X POST "${this.N8N_BASE_URL}/workflows" \\
          -H "X-N8N-API-KEY: ${this.API_KEY}" \\
          -H "Content-Type: application/json" \\
          -d '${JSON.stringify(workflow)}'`,
        timeout: 30000
      });

      if (response.exitCode !== 0) {
        throw new Error(`n8n API request failed: ${response.stderr}`);
      }

      const result = JSON.parse(response.stdout);
      const workflowId = result.data?.id;

      // 記錄到 Knowledge Graph
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

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 獲取現有工作流
   */
  async getWorkflow(workflowId: string): Promise<N8nWorkflow | null> {
    try {
      const response = await this.mcp.bash({
        command: `curl -X GET "${this.N8N_BASE_URL}/workflows/${workflowId}" \\
          -H "X-N8N-API-KEY: ${this.API_KEY}"`,
        timeout: 30000
      });

      if (response.exitCode !== 0) {
        throw new Error(`Failed to get workflow: ${response.stderr}`);
      }

      const result = JSON.parse(response.stdout);
      return result.data;

    } catch (error) {
      console.error('Get workflow failed:', error);
      return null;
    }
  }

  /**
   * 列出所有工作流
   */
  async listWorkflows(): Promise<N8nWorkflow[]> {
    try {
      const response = await this.mcp.bash({
        command: `curl -X GET "${this.N8N_BASE_URL}/workflows" \\
          -H "X-N8N-API-KEY: ${this.API_KEY}"`,
        timeout: 30000
      });

      if (response.exitCode !== 0) {
        throw new Error(`Failed to list workflows: ${response.stderr}`);
      }

      const result = JSON.parse(response.stdout);
      return result.data || [];

    } catch (error) {
      console.error('List workflows failed:', error);
      return [];
    }
  }

  /**
   * 更新工作流
   */
  async updateWorkflow(
    workflowId: string,
    updates: Partial<N8nWorkflow>
  ): Promise<N8nWorkflowResult> {
    try {
      const response = await this.mcp.bash({
        command: `curl -X PATCH "${this.N8N_BASE_URL}/workflows/${workflowId}" \\
          -H "X-N8N-API-KEY: ${this.API_KEY}" \\
          -H "Content-Type: application/json" \\
          -d '${JSON.stringify(updates)}'`,
        timeout: 30000
      });

      if (response.exitCode !== 0) {
        throw new Error(`Failed to update workflow: ${response.stderr}`);
      }

      return {
        success: true,
        workflowId
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 刪除工作流
   */
  async deleteWorkflow(workflowId: string): Promise<boolean> {
    try {
      const response = await this.mcp.bash({
        command: `curl -X DELETE "${this.N8N_BASE_URL}/workflows/${workflowId}" \\
          -H "X-N8N-API-KEY: ${this.API_KEY}"`,
        timeout: 30000
      });

      return response.exitCode === 0;

    } catch (error) {
      console.error('Delete workflow failed:', error);
      return false;
    }
  }

  /**
   * 執行工作流
   */
  async executeWorkflow(workflowId: string, data?: any): Promise<any> {
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
        throw new Error(`Workflow execution failed: ${response.stderr}`);
      }

      const result = JSON.parse(response.stdout);
      return result.data;

    } catch (error) {
      console.error('Execute workflow failed:', error);
      return null;
    }
  }

  /**
   * 創建簡單的 HTTP Request 工作流範例
   */
  createSimpleHttpWorkflow(name: string, url: string): N8nWorkflow {
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

  /**
   * 創建 AI Agent 工作流範例
   */
  createAIAgentWorkflow(name: string, prompt: string): N8nWorkflow {
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
