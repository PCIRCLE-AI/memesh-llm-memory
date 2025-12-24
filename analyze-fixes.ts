#!/usr/bin/env tsx
/**
 * 使用 Architecture Agent 分析 P0-P2 修復任務
 *
 * 這個腳本展示如何使用 smart-agents 自己來規劃和分析修復工作
 */

import { CollaborationManager } from './src/collaboration/index.js';
import { ArchitectureAgent } from './src/agents/architecture/ArchitectureAgent.js';
import { CollaborativeTask } from './src/collaboration/types.js';
import { logger } from './src/utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

async function analyzeFixTasks() {
  logger.info('🔍 使用 Smart Agents 分析 P0-P2 修復任務...\n');

  // 1. 初始化協作管理器
  const manager = new CollaborationManager();
  await manager.initialize();

  // 2. 創建專業化的 Architecture Agents
  const codeQualityAgent = new ArchitectureAgent({
    name: 'Code Quality Architect',
    systemPrompt: `你是代碼品質專家，專注於：
- 代碼清理和重構
- 錯誤處理標準化
- 日誌管理最佳實踐
- 技術債務管理
提供具體、可執行的代碼改進方案。`,
  });

  const infrastructureAgent = new ArchitectureAgent({
    name: 'Infrastructure Architect',
    systemPrompt: `你是基礎設施架構師，專注於：
- 資料持久化設計（SQLite, PostgreSQL）
- API 限流和重試機制
- 監控和可觀測性（Prometheus, OpenTelemetry）
- 系統可靠性工程
提供生產級基礎設施解決方案。`,
  });

  const testingAgent = new ArchitectureAgent({
    name: 'Testing Architect',
    systemPrompt: `你是測試架構師，專注於：
- E2E 測試策略（Playwright）
- 測試覆蓋率優化
- CI/CD pipeline 設計
- 測試自動化最佳實踐
提供完整的測試解決方案。`,
  });

  // 3. 註冊 agents
  manager.registerAgent(codeQualityAgent);
  manager.registerAgent(infrastructureAgent);
  manager.registerAgent(testingAgent);

  logger.info(`✅ 已註冊 ${manager.getAgents().length} 個專業 Agents\n`);

  // 4. 創建 Fix Analysis Team
  const fixTeam = manager.createTeam({
    name: 'Smart Agents Fix Team',
    description: '負責分析和規劃 P0-P2 修復任務的專家團隊',
    members: [codeQualityAgent.id, infrastructureAgent.id, testingAgent.id],
    leader: codeQualityAgent.id,
    capabilities: [
      'analyze_architecture',
      'suggest_improvements',
      'evaluate_technology',
    ],
  });

  logger.info(`✅ 已創建團隊: ${fixTeam.name}\n`);

  // 5. 定義 P0-P2 任務
  const task: CollaborativeTask = {
    id: uuidv4(),
    description: 'Analyze and plan execution strategy for P0-P2 fix tasks in smart-agents project',
    requiredCapabilities: [
      'analyze_architecture',
      'suggest_improvements',
      'evaluate_technology',
    ],
    status: 'pending',
    context: {
      project: 'smart-agents',
      currentState: {
        codebase: '~8,560 lines TypeScript',
        testCoverage: '58+ tests passing',
        knownIssues: [
          'Voice RAG Web recording issue (macOS MediaRecorder API)',
          '4 TODO comments to track',
          'DEBUG logs residue (voice-rag/server.ts)',
          '27 console.error usages (should use logger)',
        ],
      },
      tasks: {
        P0: [
          '修復 Voice RAG Web 錄音功能（macOS MediaRecorder API 問題）',
          '移除 DEBUG 日誌殘留（4 處）',
          '清理並追蹤 TODO 註解（4 處）',
          '統一錯誤處理機制（27 處 console.error → logger）',
        ],
        P1: [
          '實現 SQLite 持久化儲存（訊息歷史、成本追蹤、Team 指標）',
          '添加 Rate Limiting 機制（express-rate-limit）',
          '實現 API 呼叫重試機制（exponential backoff）',
          '創建 E2E 測試框架（Playwright）',
        ],
        P2: [
          '整合 Prometheus 監控（metrics endpoint）',
          '實現分散式 tracing（OpenTelemetry）',
          '開發 Code Generator Team（新 Agent）',
          '開發 Research Team（新 Agent）',
          '生成 OpenAPI/Swagger API 文檔',
        ],
      },
      constraints: {
        platform: 'macOS (M2 Pro, 16GB RAM)',
        runtime: 'Node.js 18+, TypeScript 5.7.2',
        budget: 'API calls cost < $5',
        priority: 'P0 優先，然後 P1, P2',
      },
      questions: [
        '應該如何修復 macOS MediaRecorder API 的錄音問題？',
        'SQLite vs PostgreSQL 哪個更適合持久化需求？',
        '如何設計 Rate Limiting 來平衡性能和安全？',
        'E2E 測試應該涵蓋哪些關鍵 workflows？',
        'Prometheus 和 OpenTelemetry 的整合策略？',
        '新 Agent Teams 的能力設計建議？',
      ],
    },
  };

  // 6. 執行協作分析
  logger.info('📋 開始執行任務分析...\n');
  const session = await manager.executeTask(task);

  // 7. 顯示結果
  logger.info('\n' + '═'.repeat(80));
  logger.info('📊 分析結果');
  logger.info('═'.repeat(80));

  logger.info(`\nSession ID: ${session.id}`);
  logger.info(`Team: ${session.team.name}`);
  logger.info(`Status: ${session.results.success ? '✅ 成功' : '❌ 失敗'}`);
  logger.info(`Duration: ${(session.results.durationMs / 1000).toFixed(1)}s`);
  logger.info(`Cost: $${session.results.cost.toFixed(4)}`);

  if (session.results.success && session.results.output) {
    logger.info('\n📝 Agents 分析與建議:');
    logger.info('─'.repeat(80));

    session.results.output.forEach((result: any, index: number) => {
      const agentName = index === 0 ? 'Code Quality' : index === 1 ? 'Infrastructure' : 'Testing';
      logger.info(`\n[${agentName} Architect]\n${result}\n`);
    });
  }

  if (session.results.error) {
    logger.error(`\n❌ 錯誤: ${session.results.error}`);
  }

  // 8. Team 性能指標
  const metrics = manager.getTeamMetrics(fixTeam.id);
  if (metrics) {
    logger.info('\n' + '═'.repeat(80));
    logger.info('📈 團隊性能指標');
    logger.info('═'.repeat(80));
    logger.info(`完成任務數: ${metrics.tasksCompleted}`);
    logger.info(`成功率: ${(metrics.successRate * 100).toFixed(1)}%`);
    logger.info(`平均耗時: ${(metrics.averageDurationMs / 1000).toFixed(1)}s`);
    logger.info(`總成本: $${metrics.totalCost.toFixed(4)}`);
  }

  // 9. 清理
  await manager.shutdown();
  logger.info('\n✅ 分析完成！\n');
}

// 執行分析
analyzeFixTasks()
  .then(() => process.exit(0))
  .catch(error => {
    logger.error('分析失敗:', error);
    process.exit(1);
  });
