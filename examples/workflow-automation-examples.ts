/**
 * Workflow Automation Examples
 *
 * 實際使用範例展示如何使用 WorkflowOrchestrator、OpalAutomationAgent 和 N8nWorkflowAgent
 */

import { MCPToolInterface } from '../src/core/MCPToolInterface.js';
import { WorkflowOrchestrator, WorkflowRequest } from '../src/agents/WorkflowOrchestrator.js';
import { OpalAutomationAgent } from '../src/agents/OpalAutomationAgent.js';
import { N8nWorkflowAgent } from '../src/agents/N8nWorkflowAgent.js';

// =============================================================================
// 範例 1: 基本使用 - 自動選擇平台
// =============================================================================

async function example1_autoSelection() {
  console.log('📌 範例 1: 自動平台選擇\n');

  const mcp = new MCPToolInterface();
  const orchestrator = new WorkflowOrchestrator(mcp);

  // AI 相關任務 → 自動選擇 Opal
  const aiTask: WorkflowRequest = {
    description: "創建一個 AI 聊天機器人，可以回答客戶問題並自動總結對話"
  };

  const result1 = await orchestrator.createWorkflow(aiTask);
  console.log('AI 任務結果：', {
    platform: result1.platform,  // 預期：'opal'
    success: result1.success,
    url: result1.workflowUrl,
    reasoning: result1.reasoning
  });

  // 系統整合任務 → 自動選擇 n8n
  const integrationTask: WorkflowRequest = {
    description: "連接 Stripe webhook 到 PostgreSQL 資料庫，並發送 Slack 通知"
  };

  const result2 = await orchestrator.createWorkflow(integrationTask);
  console.log('\n整合任務結果：', {
    platform: result2.platform,  // 預期：'n8n'
    success: result2.success,
    workflowId: result2.workflowId,
    reasoning: result2.reasoning
  });
}

// =============================================================================
// 範例 2: 指定平台 - 強制使用特定平台
// =============================================================================

async function example2_specifyPlatform() {
  console.log('\n📌 範例 2: 指定平台\n');

  const mcp = new MCPToolInterface();
  const orchestrator = new WorkflowOrchestrator(mcp);

  // 強制使用 Opal（即使任務可能更適合 n8n）
  const opalOnly: WorkflowRequest = {
    description: "創建一個簡單的 HTTP API 調用工作流",
    platform: 'opal'  // 明確指定
  };

  const result1 = await orchestrator.createWorkflow(opalOnly);
  console.log('強制 Opal 結果：', result1.platform);  // 一定是 'opal'

  // 強制使用 n8n（即使任務可能更適合 Opal）
  const n8nOnly: WorkflowRequest = {
    description: "創建一個 AI 文本生成工作流",
    platform: 'n8n'  // 明確指定
  };

  const result2 = await orchestrator.createWorkflow(n8nOnly);
  console.log('強制 n8n 結果：', result2.platform);  // 一定是 'n8n'
}

// =============================================================================
// 範例 3: 優先級控制 - 速度 vs 生產級
// =============================================================================

async function example3_priorityControl() {
  console.log('\n📌 範例 3: 優先級控制\n');

  const mcp = new MCPToolInterface();
  const orchestrator = new WorkflowOrchestrator(mcp);

  const taskDescription = "創建一個客戶服務聊天機器人";

  // 優先速度 → Opal（快速原型）
  const speedFirst: WorkflowRequest = {
    description: taskDescription,
    priority: 'speed'
  };

  const result1 = await orchestrator.createWorkflow(speedFirst);
  console.log('優先速度：', {
    platform: result1.platform,  // 預期：'opal'
    reasoning: result1.reasoning
  });

  // 優先生產級 → n8n（可靠穩定）
  const productionFirst: WorkflowRequest = {
    description: taskDescription,
    priority: 'production'
  };

  const result2 = await orchestrator.createWorkflow(productionFirst);
  console.log('\n優先生產：', {
    platform: result2.platform,  // 預期：'n8n'
    reasoning: result2.reasoning
  });
}

// =============================================================================
// 範例 4: 直接使用 OpalAutomationAgent
// =============================================================================

async function example4_directOpalUsage() {
  console.log('\n📌 範例 4: 直接使用 Opal Agent\n');

  const mcp = new MCPToolInterface();
  const opalAgent = new OpalAutomationAgent(mcp);

  // 4.1 創建新工作流
  console.log('4.1 創建新工作流...');
  const createResult = await opalAgent.createWorkflow({
    description: "每天早上 9 點發送天氣預報郵件給團隊",
    timeout: 60000
  });

  if (createResult.success) {
    console.log('✅ 工作流已創建:', createResult.workflowUrl);
    console.log('📸 截圖保存:', createResult.screenshot);

    // 4.2 導出工作流
    console.log('\n4.2 導出工作流...');
    const exportResult = await opalAgent.exportWorkflow(createResult.workflowUrl!);
    console.log('📸 導出截圖:', exportResult.screenshot);
  } else {
    console.error('❌ 創建失敗:', createResult.error);
  }

  // 4.3 從 Gallery 複製範例
  console.log('\n4.3 從 Gallery 複製範例...');
  const remixResult = await opalAgent.remixFromGallery("email automation");
  if (remixResult.success) {
    console.log('✅ 已複製 Gallery 範例:', remixResult.workflowUrl);
  }

  // 清理
  await opalAgent.close();
}

// =============================================================================
// 範例 5: 直接使用 N8nWorkflowAgent
// =============================================================================

async function example5_directN8nUsage() {
  console.log('\n📌 範例 5: 直接使用 n8n Agent\n');

  const mcp = new MCPToolInterface();
  const n8nAgent = new N8nWorkflowAgent(mcp, {
    baseUrl: process.env.N8N_API_URL || 'http://localhost:5678/api/v1',
    apiKey: process.env.N8N_API_KEY || ''
  });

  // 5.1 創建簡單的 HTTP 工作流
  console.log('5.1 創建 HTTP 工作流...');
  const httpWorkflow = n8nAgent.createSimpleHttpWorkflow(
    "GitHub Issues Fetcher",
    "https://api.github.com/repos/microsoft/vscode/issues"
  );

  const httpResult = await n8nAgent.createWorkflow(httpWorkflow);
  if (httpResult.success) {
    console.log('✅ HTTP 工作流已創建:', httpResult.workflowId);
    console.log('🔗 URL:', httpResult.workflowUrl);
  }

  // 5.2 創建 AI Agent 工作流
  console.log('\n5.2 創建 AI Agent 工作流...');
  const aiWorkflow = n8nAgent.createAIAgentWorkflow(
    "Customer Support Assistant",
    `You are a helpful customer support assistant.
    Answer questions politely and professionally.
    If you don't know the answer, offer to escalate to a human agent.`
  );

  const aiResult = await n8nAgent.createWorkflow(aiWorkflow);
  if (aiResult.success) {
    console.log('✅ AI 工作流已創建:', aiResult.workflowId);
  }

  // 5.3 列出所有工作流
  console.log('\n5.3 列出所有工作流...');
  const allWorkflows = await n8nAgent.listWorkflows();
  console.log(`📋 共 ${allWorkflows.length} 個工作流`);
  allWorkflows.slice(0, 3).forEach(wf => {
    console.log(`  - ${wf.name} (${wf.nodes.length} 個節點)`);
  });

  // 5.4 執行工作流
  if (httpResult.success && httpResult.workflowId) {
    console.log('\n5.4 執行工作流...');
    const execution = await n8nAgent.executeWorkflow(httpResult.workflowId);
    console.log('⚡ 執行結果:', execution ? '成功' : '失敗');
  }

  // 5.5 更新工作流
  if (httpResult.success && httpResult.workflowId) {
    console.log('\n5.5 更新工作流...');
    const updateResult = await n8nAgent.updateWorkflow(
      httpResult.workflowId,
      { active: true }  // 啟用工作流
    );
    console.log('🔄 更新結果:', updateResult.success ? '成功' : '失敗');
  }
}

// =============================================================================
// 範例 6: 查詢和管理所有工作流
// =============================================================================

async function example6_listAllWorkflows() {
  console.log('\n📌 範例 6: 查詢所有工作流\n');

  const mcp = new MCPToolInterface();
  const orchestrator = new WorkflowOrchestrator(mcp);

  const allWorkflows = await orchestrator.listAllWorkflows();

  console.log('📊 Opal 工作流：');
  allWorkflows.opal.forEach(wf => {
    console.log(`  - ${wf.description}`);
    console.log(`    URL: ${wf.url}`);
  });

  console.log('\n📊 n8n 工作流：');
  allWorkflows.n8n.forEach(wf => {
    console.log(`  - ${wf.name}`);
    console.log(`    ID: ${wf.id}`);
    console.log(`    Nodes: ${wf.nodes.length}`);
    console.log(`    Active: ${wf.active ? '✅' : '❌'}`);
  });
}

// =============================================================================
// 範例 7: 實際業務場景 - 內容生成管道
// =============================================================================

async function example7_contentPipeline() {
  console.log('\n📌 範例 7: 內容生成管道\n');

  const mcp = new MCPToolInterface();
  const orchestrator = new WorkflowOrchestrator(mcp);

  const contentPipeline: WorkflowRequest = {
    description: `
      創建一個自動化內容生成管道：
      1. 從 RSS feed 讀取科技新聞
      2. 使用 GPT-4 生成文章摘要（200 字）
      3. 翻譯成繁體中文、英文、日文
      4. 生成社群媒體貼文（Twitter、LinkedIn）
      5. 發布到 WordPress 部落格
      6. 發送 Slack 通知給編輯團隊
    `,
    priority: 'production'  // 生產級需求
  };

  const result = await orchestrator.createWorkflow(contentPipeline);

  console.log('內容管道結果：');
  console.log('  平台:', result.platform);  // 可能選擇 n8n（複雜整合）
  console.log('  成功:', result.success);
  console.log('  理由:', result.reasoning);

  if (result.platform === 'n8n') {
    console.log('  工作流 ID:', result.workflowId);
    console.log('  URL:', result.workflowUrl);
  } else {
    console.log('  Opal URL:', result.workflowUrl);
    console.log('  截圖:', result.screenshot);
  }
}

// =============================================================================
// 範例 8: 實際業務場景 - 客戶支援自動化
// =============================================================================

async function example8_customerSupport() {
  console.log('\n📌 範例 8: 客戶支援自動化\n');

  const mcp = new MCPToolInterface();
  const orchestrator = new WorkflowOrchestrator(mcp);

  const supportAutomation: WorkflowRequest = {
    description: `
      創建客戶支援自動化系統：
      1. 接收客戶郵件
      2. AI 分析問題類型（技術/帳單/一般）
      3. 自動回覆常見問題
      4. 複雜問題分配給人工客服
      5. 記錄對話到 CRM
      6. 生成每日支援報告
    `
  };

  const result = await orchestrator.createWorkflow(supportAutomation);

  console.log('客戶支援系統結果：');
  console.log('  平台:', result.platform);  // 可能選擇 Opal（AI 分析）
  console.log('  成功:', result.success);
  console.log('  理由:', result.reasoning);
}

// =============================================================================
// 範例 9: 錯誤處理和重試
// =============================================================================

async function example9_errorHandling() {
  console.log('\n📌 範例 9: 錯誤處理\n');

  const mcp = new MCPToolInterface();
  const orchestrator = new WorkflowOrchestrator(mcp);

  try {
    const result = await orchestrator.createWorkflow({
      description: "測試工作流",
      timeout: 5000  // 短超時可能失敗
    });

    if (result.success) {
      console.log('✅ 成功:', result.workflowUrl);
    } else {
      console.error('❌ 失敗:', result.error);

      // 重試策略：切換平台
      console.log('🔄 嘗試切換平台...');
      const retryResult = await orchestrator.createWorkflow({
        description: "測試工作流",
        platform: result.platform === 'opal' ? 'n8n' : 'opal'
      });

      if (retryResult.success) {
        console.log('✅ 重試成功:', retryResult.platform);
      }
    }
  } catch (error) {
    console.error('💥 異常:', error);
  }
}

// =============================================================================
// 範例 10: 自定義 n8n 工作流（進階）
// =============================================================================

async function example10_customN8nWorkflow() {
  console.log('\n📌 範例 10: 自定義 n8n 工作流\n');

  const mcp = new MCPToolInterface();
  const n8nAgent = new N8nWorkflowAgent(mcp);

  // 創建複雜的自定義工作流
  const customWorkflow = {
    name: "Advanced Data Pipeline",
    nodes: [
      {
        id: 'webhook',
        name: 'Webhook Trigger',
        type: 'n8n-nodes-base.webhook',
        position: [250, 300],
        parameters: {
          path: 'data-ingestion',
          httpMethod: 'POST'
        }
      },
      {
        id: 'validate',
        name: 'Validate Input',
        type: 'n8n-nodes-base.function',
        position: [450, 300],
        parameters: {
          functionCode: `
            const data = items[0].json;
            if (!data.userId || !data.eventType) {
              throw new Error('Missing required fields');
            }
            return items;
          `
        }
      },
      {
        id: 'transform',
        name: 'Transform Data',
        type: 'n8n-nodes-base.function',
        position: [650, 300],
        parameters: {
          functionCode: `
            const data = items[0].json;
            return [{
              json: {
                user_id: data.userId,
                event_type: data.eventType,
                timestamp: new Date().toISOString(),
                metadata: JSON.stringify(data.metadata || {})
              }
            }];
          `
        }
      },
      {
        id: 'saveDb',
        name: 'Save to PostgreSQL',
        type: 'n8n-nodes-base.postgres',
        position: [850, 300],
        parameters: {
          operation: 'insert',
          table: 'events',
          columns: 'user_id,event_type,timestamp,metadata'
        }
      },
      {
        id: 'notify',
        name: 'Send Slack Notification',
        type: 'n8n-nodes-base.slack',
        position: [1050, 300],
        parameters: {
          channel: '#data-pipeline',
          text: '新事件已記錄：{{$json["event_type"]}}'
        }
      }
    ],
    connections: {
      'Webhook Trigger': {
        main: [[{ node: 'Validate Input', type: 'main', index: 0 }]]
      },
      'Validate Input': {
        main: [[{ node: 'Transform Data', type: 'main', index: 0 }]]
      },
      'Transform Data': {
        main: [[
          { node: 'Save to PostgreSQL', type: 'main', index: 0 },
          { node: 'Send Slack Notification', type: 'main', index: 0 }
        ]]
      }
    },
    active: true
  };

  const result = await n8nAgent.createWorkflow(customWorkflow);

  if (result.success) {
    console.log('✅ 複雜工作流已創建');
    console.log('  ID:', result.workflowId);
    console.log('  URL:', result.workflowUrl);
    console.log('  節點數:', customWorkflow.nodes.length);
  }
}

// =============================================================================
// 主程式 - 運行所有範例
// =============================================================================

async function runAllExamples() {
  console.log('🚀 Workflow Automation Examples\n');
  console.log('='.repeat(80));

  try {
    await example1_autoSelection();
    console.log('\n' + '='.repeat(80));

    await example2_specifyPlatform();
    console.log('\n' + '='.repeat(80));

    await example3_priorityControl();
    console.log('\n' + '='.repeat(80));

    await example4_directOpalUsage();
    console.log('\n' + '='.repeat(80));

    await example5_directN8nUsage();
    console.log('\n' + '='.repeat(80));

    await example6_listAllWorkflows();
    console.log('\n' + '='.repeat(80));

    await example7_contentPipeline();
    console.log('\n' + '='.repeat(80));

    await example8_customerSupport();
    console.log('\n' + '='.repeat(80));

    await example9_errorHandling();
    console.log('\n' + '='.repeat(80));

    await example10_customN8nWorkflow();

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ All examples completed!\n');

  } catch (error) {
    console.error('\n💥 Error running examples:', error);
  }
}

// 如果直接運行此檔案
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error);
}

// 導出範例函數供其他檔案使用
export {
  example1_autoSelection,
  example2_specifyPlatform,
  example3_priorityControl,
  example4_directOpalUsage,
  example5_directN8nUsage,
  example6_listAllWorkflows,
  example7_contentPipeline,
  example8_customerSupport,
  example9_errorHandling,
  example10_customN8nWorkflow
};
