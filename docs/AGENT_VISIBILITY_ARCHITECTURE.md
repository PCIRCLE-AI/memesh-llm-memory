# Agent Visibility Architecture

## 🎯 目標

讓用戶能清楚看到 Claude Code 如何使用 smart-agents 來完成任務，提供完全透明的工作流程。

## 💡 核心原則

1. **透明性** - 用戶應該知道哪個 agent 正在工作
2. **進度可見** - 用戶應該看到 agent 的工作進度
3. **結果清晰** - Agent 的輸出應該格式化並易於理解
4. **可追蹤** - 所有 agent 使用都應記錄到 Knowledge Graph

## 🏗️ 架構設計

### 層級架構

```
┌─────────────────────────────────────────────────────────┐
│                    User Request                          │
│           "請幫我寫 calculator.ts 的測試"                  │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│                 Claude Code (Main)                       │
│  - 分析用戶需求                                            │
│  - 決定使用哪個 agent                                      │
│  - 調用 AgentManager                                      │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│              AgentManager (新組件)                        │
│  ┌─────────────────────────────────────────────┐        │
│  │ 1. 📢 宣告開始                                │        │
│  │    "🤖 Using TestWriterAgent..."           │        │
│  │                                             │        │
│  │ 2. 📝 更新 TodoWrite                         │        │
│  │    [in_progress] Generating tests...       │        │
│  │                                             │        │
│  │ 3. 🚀 執行 Agent                             │        │
│  │    TestWriterAgent.generateTests()         │        │
│  │                                             │        │
│  │ 4. 📊 顯示進度                               │        │
│  │    "⚡ Analyzing functions..."             │        │
│  │    "⚡ Generating test cases..."           │        │
│  │                                             │        │
│  │ 5. 💾 記錄到 Knowledge Graph                │        │
│  │    agent: TestWriterAgent                  │        │
│  │    input: calculator.ts                    │        │
│  │    output: calculator.test.ts              │        │
│  │                                             │        │
│  │ 6. ✅ 返回結果                               │        │
│  │    Formatted + Structured                  │        │
│  └─────────────────────────────────────────────┘        │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│                    User Sees                             │
│  🤖 Using TestWriterAgent to analyze calculator.ts       │
│  ⚡ Analyzing 4 functions...                             │
│  ⚡ Generating test cases for add, subtract...           │
│  ✅ Generated 12 test cases                              │
│  📁 Created: calculator.test.ts                          │
│                                                          │
│  TodoList:                                               │
│  ✅ Generating tests with TestWriterAgent                │
│                                                          │
│  Knowledge Graph:                                        │
│  📊 Recorded: TestWriterAgent usage at 2025-12-31...    │
└─────────────────────────────────────────────────────────┘
```

## 🔧 實作組件

### 1. AgentManager (核心管理器)

負責所有 agent 的調用、監控、記錄。

```typescript
// src/core/AgentManager.ts

export interface AgentInvocation {
  agentName: string;
  method: string;
  input: any;
  startTime: Date;
  endTime?: Date;
  success?: boolean;
  output?: any;
  error?: string;
}

export class AgentManager {
  private mcp: MCPToolInterface;
  private activeInvocations: Map<string, AgentInvocation> = new Map();

  constructor(mcp: MCPToolInterface) {
    this.mcp = mcp;
  }

  /**
   * 透明地執行 agent
   */
  async invoke<T>(
    agentName: string,
    method: string,
    agent: any,
    args: any[]
  ): Promise<T> {
    const invocationId = `${agentName}_${Date.now()}`;

    // 1. 📢 宣告開始
    console.log(`\n🤖 Using ${agentName}`);
    console.log(`   Method: ${method}`);
    console.log(`   Input: ${JSON.stringify(args).slice(0, 100)}...`);

    // 2. 📝 更新 TodoWrite
    await this.updateTodoList(agentName, method, 'in_progress');

    // 3. 📊 記錄開始
    const invocation: AgentInvocation = {
      agentName,
      method,
      input: args,
      startTime: new Date()
    };
    this.activeInvocations.set(invocationId, invocation);

    try {
      // 4. 🚀 執行 Agent（帶進度回調）
      console.log(`   ⚡ Executing ${agentName}...`);

      const result = await agent[method](...args);

      // 5. ✅ 成功
      console.log(`   ✅ ${agentName} completed successfully`);

      invocation.endTime = new Date();
      invocation.success = true;
      invocation.output = result;

      // 6. 📝 更新 TodoWrite
      await this.updateTodoList(agentName, method, 'completed');

      // 7. 💾 記錄到 Knowledge Graph
      await this.recordToKnowledgeGraph(invocation);

      // 8. 📊 顯示結果摘要
      this.displayResultSummary(agentName, result);

      return result;

    } catch (error) {
      // ❌ 失敗處理
      console.error(`   ❌ ${agentName} failed:`, error);

      invocation.endTime = new Date();
      invocation.success = false;
      invocation.error = error instanceof Error ? error.message : String(error);

      await this.updateTodoList(agentName, method, 'failed');
      await this.recordToKnowledgeGraph(invocation);

      throw error;
    } finally {
      this.activeInvocations.delete(invocationId);
    }
  }

  /**
   * 更新 TodoWrite 顯示進度
   */
  private async updateTodoList(
    agentName: string,
    method: string,
    status: 'in_progress' | 'completed' | 'failed'
  ): Promise<void> {
    const description = this.getTodoDescription(agentName, method);

    // 這裡應該與 Claude Code 的 TodoWrite 整合
    // 實際實作需要存取 Claude Code 的 todo list API
  }

  /**
   * 記錄到 Knowledge Graph
   */
  private async recordToKnowledgeGraph(invocation: AgentInvocation): Promise<void> {
    const duration = invocation.endTime
      ? invocation.endTime.getTime() - invocation.startTime.getTime()
      : 0;

    await this.mcp.memory.createEntities({
      entities: [{
        name: `${invocation.agentName} Invocation ${invocation.startTime.toISOString()}`,
        entityType: 'agent_invocation',
        observations: [
          `Agent: ${invocation.agentName}`,
          `Method: ${invocation.method}`,
          `Input: ${JSON.stringify(invocation.input).slice(0, 500)}`,
          `Success: ${invocation.success}`,
          `Duration: ${duration}ms`,
          `Output: ${invocation.success ? JSON.stringify(invocation.output).slice(0, 500) : 'N/A'}`,
          `Error: ${invocation.error || 'N/A'}`,
          `Timestamp: ${invocation.startTime.toISOString()}`
        ]
      }]
    });
  }

  /**
   * 顯示結果摘要
   */
  private displayResultSummary(agentName: string, result: any): void {
    console.log(`\n📊 ${agentName} Result Summary:`);

    // 根據不同 agent 類型格式化輸出
    if (agentName === 'TestWriterAgent') {
      console.log(`   ✅ Generated test file`);
      console.log(`   📏 Lines: ${result.split('\n').length}`);
      console.log(`   🧪 Test cases: ${(result.match(/it\(/g) || []).length}`);
    } else if (agentName === 'WorkflowOrchestrator') {
      console.log(`   ✅ Platform: ${result.platform}`);
      console.log(`   🔗 URL: ${result.workflowUrl}`);
      console.log(`   💡 Reasoning: ${result.reasoning}`);
    } else {
      // 通用格式
      console.log(`   📄 Result:`, JSON.stringify(result, null, 2).slice(0, 200));
    }
  }

  /**
   * 獲取所有活躍的 agent invocations
   */
  getActiveInvocations(): AgentInvocation[] {
    return Array.from(this.activeInvocations.values());
  }

  /**
   * 獲取 agent 使用統計
   */
  async getAgentStats(): Promise<{
    agentName: string;
    totalInvocations: number;
    successRate: number;
    avgDuration: number;
  }[]> {
    // 從 Knowledge Graph 查詢統計
    const allInvocations = await this.mcp.memory.searchNodes('agent_invocation');

    // 分組統計
    const stats = new Map<string, {
      total: number;
      success: number;
      totalDuration: number;
    }>();

    for (const node of allInvocations) {
      const agentName = node.observations.find(o => o.startsWith('Agent:'))
        ?.replace('Agent: ', '') || 'Unknown';

      const success = node.observations.find(o => o.startsWith('Success:'))
        ?.includes('true') || false;

      const duration = parseInt(
        node.observations.find(o => o.startsWith('Duration:'))
          ?.replace('Duration: ', '').replace('ms', '') || '0'
      );

      if (!stats.has(agentName)) {
        stats.set(agentName, { total: 0, success: 0, totalDuration: 0 });
      }

      const stat = stats.get(agentName)!;
      stat.total++;
      if (success) stat.success++;
      stat.totalDuration += duration;
    }

    return Array.from(stats.entries()).map(([agentName, stat]) => ({
      agentName,
      totalInvocations: stat.total,
      successRate: stat.success / stat.total,
      avgDuration: stat.totalDuration / stat.total
    }));
  }

  private getTodoDescription(agentName: string, method: string): string {
    const descriptions: Record<string, string> = {
      'TestWriterAgent.generateTests': 'Generating tests with TestWriterAgent',
      'DevOpsEngineerAgent.analyzeDeploymentReadiness': 'Checking deployment readiness',
      'WorkflowOrchestrator.createWorkflow': 'Creating workflow automation',
      'OpalAutomationAgent.createWorkflow': 'Creating Opal workflow',
      'N8nWorkflowAgent.createWorkflow': 'Creating n8n workflow',
      'KnowledgeAgent.createEntities': 'Updating knowledge graph',
      'RAGAgent.search': 'Searching documentation'
    };

    return descriptions[`${agentName}.${method}`] || `Using ${agentName}`;
  }
}
```

### 2. Agent 包裝器（讓現有 agents 支援透明性）

```typescript
// src/core/AgentWrapper.ts

/**
 * 包裝現有 agents，自動加入透明性功能
 */
export function wrapAgent<T extends object>(
  agent: T,
  agentName: string,
  manager: AgentManager
): T {
  return new Proxy(agent, {
    get(target, prop) {
      const original = target[prop as keyof T];

      // 只包裝函數
      if (typeof original !== 'function') {
        return original;
      }

      // 返回包裝後的函數
      return async function (...args: any[]) {
        return await manager.invoke(
          agentName,
          String(prop),
          target,
          args
        );
      };
    }
  });
}

// 使用範例
const manager = new AgentManager(mcp);
const testWriter = new TestWriterAgent(mcp);
const wrappedTestWriter = wrapAgent(testWriter, 'TestWriterAgent', manager);

// 現在所有調用都會自動顯示進度
const tests = await wrappedTestWriter.generateTests('calculator.ts', sourceCode);
// 用戶會看到:
// 🤖 Using TestWriterAgent
//    Method: generateTests
//    Input: "calculator.ts", "export function add..."
//    ⚡ Executing TestWriterAgent...
//    ✅ TestWriterAgent completed successfully
// 📊 TestWriterAgent Result Summary:
//    ✅ Generated test file
//    📏 Lines: 45
//    🧪 Test cases: 4
```

### 3. MCP Tool Wrappers（讓 agents 成為 MCP tools）

```typescript
// src/mcp-tools/agent-tools.ts

/**
 * 將所有 agents 暴露為 MCP tools
 * 這樣 Claude Code 就可以直接調用
 */

export const agentMcpTools = {
  // TestWriterAgent
  'agent_test_writer_generate': {
    description: 'Generate unit tests for a source file using TestWriterAgent',
    inputSchema: {
      type: 'object',
      properties: {
        fileName: { type: 'string', description: 'Source file name' },
        sourceCode: { type: 'string', description: 'Source code content' }
      },
      required: ['fileName', 'sourceCode']
    },
    handler: async (input: { fileName: string; sourceCode: string }) => {
      const manager = new AgentManager(mcp);
      const testWriter = wrapAgent(new TestWriterAgent(mcp), 'TestWriterAgent', manager);
      return await testWriter.generateTests(input.fileName, input.sourceCode);
    }
  },

  // WorkflowOrchestrator
  'agent_workflow_create': {
    description: 'Create a workflow automation using WorkflowOrchestrator',
    inputSchema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Natural language workflow description' },
        platform: { type: 'string', enum: ['auto', 'opal', 'n8n'] },
        priority: { type: 'string', enum: ['speed', 'production'] }
      },
      required: ['description']
    },
    handler: async (input: WorkflowRequest) => {
      const manager = new AgentManager(mcp);
      const orchestrator = wrapAgent(
        new WorkflowOrchestrator(mcp),
        'WorkflowOrchestrator',
        manager
      );
      return await orchestrator.createWorkflow(input);
    }
  },

  // DevOpsEngineerAgent
  'agent_devops_check_deployment': {
    description: 'Check deployment readiness using DevOpsEngineerAgent',
    inputSchema: {
      type: 'object',
      properties: {
        testCommand: { type: 'string' },
        buildCommand: { type: 'string' }
      }
    },
    handler: async (input: { testCommand?: string; buildCommand?: string }) => {
      const manager = new AgentManager(mcp);
      const devops = wrapAgent(new DevOpsEngineerAgent(mcp), 'DevOpsEngineerAgent', manager);
      return await devops.analyzeDeploymentReadiness(input);
    }
  },

  // KnowledgeAgent
  'agent_knowledge_search': {
    description: 'Search knowledge graph using KnowledgeAgent',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' }
      },
      required: ['query']
    },
    handler: async (input: { query: string }) => {
      const manager = new AgentManager(mcp);
      const knowledge = wrapAgent(new KnowledgeAgent(), 'KnowledgeAgent', manager);
      return await knowledge.searchNodes(input.query);
    }
  },

  // RAGAgent
  'agent_rag_search': {
    description: 'Search documentation using RAGAgent',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        topK: { type: 'number', description: 'Number of results' }
      },
      required: ['query']
    },
    handler: async (input: { query: string; topK?: number }) => {
      const manager = new AgentManager(mcp);
      const rag = wrapAgent(
        new RAGAgent({ embeddingProvider: 'openai' }),
        'RAGAgent',
        manager
      );
      return await rag.search(input.query, { topK: input.topK });
    }
  },

  // Agent 統計
  'agent_get_stats': {
    description: 'Get usage statistics for all agents',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const manager = new AgentManager(mcp);
      return await manager.getAgentStats();
    }
  }
};
```

### 4. 進度回調系統

```typescript
// src/core/ProgressCallback.ts

export interface ProgressUpdate {
  stage: string;
  progress: number;  // 0-100
  message: string;
}

export type ProgressCallback = (update: ProgressUpdate) => void;

/**
 * 讓 agents 支援進度報告
 */
export class ProgressReporter {
  constructor(private callback?: ProgressCallback) {}

  report(stage: string, progress: number, message: string): void {
    if (this.callback) {
      this.callback({ stage, progress, message });
    }

    // 同時輸出到 console
    console.log(`   ⚡ [${progress}%] ${stage}: ${message}`);
  }
}

// 修改現有 agents 支援進度報告
// 範例: TestWriterAgent with progress

export class TestWriterAgent {
  async generateTests(
    fileName: string,
    sourceCode: string,
    progress?: ProgressReporter
  ): Promise<string> {
    progress?.report('analyze', 0, 'Starting analysis...');

    // 分析函數
    const functions = this.extractFunctions(sourceCode);
    progress?.report('analyze', 30, `Found ${functions.length} functions`);

    // 生成測試
    progress?.report('generate', 50, 'Generating test cases...');
    const tests = this.generateTestCases(functions);
    progress?.report('generate', 80, `Generated ${tests.length} test cases`);

    // 格式化
    progress?.report('format', 90, 'Formatting test file...');
    const formatted = this.formatTests(tests);
    progress?.report('complete', 100, 'Test generation completed');

    return formatted;
  }
}
```

## 📊 用戶體驗流程

### 場景 1: 生成測試

```bash
User: "請幫我寫 calculator.ts 的測試"

Claude Code:
🤖 Using TestWriterAgent
   Method: generateTests
   Input: "calculator.ts", "export function add(a, b) { ... }"
   ⚡ Executing TestWriterAgent...
   ⚡ [0%] analyze: Starting analysis...
   ⚡ [30%] analyze: Found 4 functions
   ⚡ [50%] generate: Generating test cases...
   ⚡ [80%] generate: Generated 12 test cases
   ⚡ [90%] format: Formatting test file...
   ⚡ [100%] complete: Test generation completed
   ✅ TestWriterAgent completed successfully

📊 TestWriterAgent Result Summary:
   ✅ Generated test file
   📏 Lines: 45
   🧪 Test cases: 12
   📁 Created: calculator.test.ts

TodoList updated:
   ✅ Generating tests with TestWriterAgent

Knowledge Graph updated:
   📊 Recorded: TestWriterAgent invocation at 2025-12-31T10:30:00Z
```

### 場景 2: 創建工作流

```bash
User: "創建一個 AI 聊天機器人工作流"

Claude Code:
🤖 Using WorkflowOrchestrator
   Method: createWorkflow
   Input: { description: "創建一個 AI 聊天機器人工作流" }
   ⚡ Executing WorkflowOrchestrator...

   🧠 Analyzing workflow requirements...
      Keywords detected: AI, 聊天機器人
      Recommendation: Google Opal (AI-driven workflows)

   🤖 Using OpalAutomationAgent
      ⚡ [0%] navigate: Opening https://opal.withgoogle.com/
      ⚡ [20%] click: Clicking 'Create new' button
      ⚡ [40%] input: Entering workflow description
      ⚡ [60%] wait: Waiting for AI to generate workflow
      ⚡ [80%] screenshot: Capturing workflow screenshot
      ⚡ [100%] complete: Opal workflow created

   ✅ WorkflowOrchestrator completed successfully

📊 WorkflowOrchestrator Result Summary:
   ✅ Platform: opal
   🔗 URL: https://opal.withgoogle.com/workflow/abc123
   📸 Screenshot: /tmp/opal-workflow-1735642200000.png
   💡 Reasoning: Google Opal 適合快速創建 AI 驅動的工作流原型

TodoList updated:
   ✅ Creating workflow with WorkflowOrchestrator

Knowledge Graph updated:
   📊 Recorded: WorkflowOrchestrator → OpalAutomationAgent chain
```

## 🎯 實作計劃

### Phase 1: 核心基礎設施

1. ✅ 實作 `AgentManager` 類別
2. ✅ 實作 `AgentWrapper` 代理模式
3. ✅ 實作 `ProgressReporter` 系統
4. ⬜ 整合 TodoWrite API
5. ⬜ 整合 Knowledge Graph 記錄

### Phase 2: Agent 改造

1. ⬜ 修改所有現有 agents 支援 `ProgressReporter`
2. ⬜ 標準化 agent 返回格式
3. ⬜ 添加 agent 元數據（描述、版本、能力）

### Phase 3: MCP Tool 暴露

1. ⬜ 創建 MCP tool wrappers
2. ⬜ 註冊到 MCP server
3. ⬜ 測試 Claude Code 調用

### Phase 4: 可視化增強

1. ⬜ 實作 agent 統計儀表板
2. ⬜ 實作 agent 調用鏈視覺化
3. ⬜ 添加實時監控功能

## 📝 使用指南（未來）

當實作完成後，Claude Code 可以這樣使用：

```typescript
// 在 Claude Code 內部

// 方式 1: 透過 AgentManager（推薦）
const manager = new AgentManager(mcp);
const testWriter = wrapAgent(new TestWriterAgent(mcp), 'TestWriterAgent', manager);
const tests = await testWriter.generateTests('calculator.ts', sourceCode);
// → 自動顯示進度、記錄到 KG、更新 TodoWrite

// 方式 2: 透過 MCP Tools（更簡單）
const tests = await mcp.callTool('agent_test_writer_generate', {
  fileName: 'calculator.ts',
  sourceCode: '...'
});
// → 同樣透明，但不需要 import agents

// 方式 3: 直接調用（不推薦，缺乏透明性）
const testWriter = new TestWriterAgent(mcp);
const tests = await testWriter.generateTests('calculator.ts', sourceCode);
// → 沒有進度顯示，沒有記錄
```

## 🔍 監控和調試

```typescript
// 查看當前活躍的 agents
const active = manager.getActiveInvocations();
console.log('Active agents:', active);

// 查看 agent 使用統計
const stats = await manager.getAgentStats();
console.log('Agent stats:', stats);
/*
[
  {
    agentName: 'TestWriterAgent',
    totalInvocations: 42,
    successRate: 0.95,
    avgDuration: 3500
  },
  {
    agentName: 'WorkflowOrchestrator',
    totalInvocations: 15,
    successRate: 0.87,
    avgDuration: 12000
  }
]
*/

// 從 Knowledge Graph 查詢特定 agent 的使用歷史
const testWriterHistory = await mcp.memory.searchNodes('agent_invocation TestWriterAgent');
console.log('TestWriterAgent history:', testWriterHistory);
```

## 🚀 未來改進

1. **實時 Dashboard** - Web UI 顯示所有 agent 活動
2. **Agent 熱重載** - 更新 agent 代碼不需要重啟
3. **Agent 版本管理** - 追蹤 agent 代碼版本
4. **Agent A/B 測試** - 比較不同 agent 實作效果
5. **Agent 性能優化** - 基於統計數據自動優化
6. **Agent 組合** - 自動發現最佳 agent 組合
7. **分布式 Agent** - Agent 可以在不同機器上運行
