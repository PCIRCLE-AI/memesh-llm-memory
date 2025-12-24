#!/usr/bin/env tsx
/**
 * P0 修復代碼審查
 * 使用 Architecture Agent 審查已完成的 P0 修復
 */

import { CollaborationManager } from './src/collaboration/index.js';
import { ArchitectureAgent } from './src/agents/architecture/ArchitectureAgent.js';
import { CollaborativeTask } from './src/collaboration/types.js';
import { logger } from './src/utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';

async function reviewP0Fixes() {
  logger.info('🔍 開始 P0 修復代碼審查...\n');

  // 1. 讀取修改的文件內容
  const changedFiles = [
    'voice-rag-widget.html',
    'src/agents/voice-rag/server.ts',
    'src/agents/rag/embeddings.ts',
    'src/agents/rag/vectorstore.ts',
    'src/index.ts',
    'src/collaboration/CollaborationManager.ts',
  ];

  const fileContents: Record<string, string> = {};
  for (const file of changedFiles) {
    try {
      fileContents[file] = await fs.readFile(file, 'utf-8');
    } catch (error) {
      logger.warn(`無法讀取文件: ${file}`, { error });
    }
  }

  // 2. 初始化協作管理器
  const manager = new CollaborationManager();
  await manager.initialize();

  // 3. 創建代碼審查專家團隊
  const codeReviewAgent = new ArchitectureAgent({
    name: 'Senior Code Reviewer',
    systemPrompt: `你是資深代碼審查專家，專注於：
- 代碼品質和可維護性
- 安全性漏洞檢測
- 性能優化建議
- 最佳實踐遵循
- 潛在 Bug 識別

審查標準：
✅ 代碼可讀性和清晰度
✅ 錯誤處理完整性
✅ 安全性考量
✅ 性能影響
✅ 測試覆蓋需求

提供具體、可執行的改進建議。`,
  });

  const securityReviewAgent = new ArchitectureAgent({
    name: 'Security Reviewer',
    systemPrompt: `你是安全審查專家，專注於：
- OWASP Top 10 漏洞
- 輸入驗證和清理
- 認證和授權
- 敏感數據處理
- API 安全

重點關注：
⚠️ XSS 漏洞
⚠️ 注入攻擊
⚠️ 不安全的配置
⚠️ 敏感數據暴露
⚠️ 缺少認證/授權

提供安全風險評估和修復建議。`,
  });

  const performanceReviewAgent = new ArchitectureAgent({
    name: 'Performance Reviewer',
    systemPrompt: `你是性能優化專家，專注於：
- 時間複雜度分析
- 空間複雜度優化
- 異步操作效率
- 資源洩漏檢測
- 瓶頸識別

關注點：
📊 算法效率
📊 記憶體使用
📊 網路請求優化
📊 並發處理
📊 緩存策略

提供性能優化建議和預期改進效果。`,
  });

  // 4. 註冊 Agents
  manager.registerAgent(codeReviewAgent);
  manager.registerAgent(securityReviewAgent);
  manager.registerAgent(performanceReviewAgent);

  logger.info(`✅ 已註冊 ${manager.getAgents().length} 個審查 Agents\n`);

  // 5. 創建 Code Review Team
  const reviewTeam = manager.createTeam({
    name: 'P0 Code Review Team',
    description: '專業代碼審查團隊，負責審查 P0 修復的代碼品質',
    members: [codeReviewAgent.id, securityReviewAgent.id, performanceReviewAgent.id],
    leader: codeReviewAgent.id,
    capabilities: [
      'analyze_architecture',
      'suggest_improvements',
      'evaluate_technology',
    ],
  });

  logger.info(`✅ 已創建審查團隊: ${reviewTeam.name}\n`);

  // 6. 定義代碼審查任務
  const task: CollaborativeTask = {
    id: uuidv4(),
    description: 'Review P0 fixes: Voice RAG recording, DEBUG logs removal, error handling unification, TODO cleanup',
    requiredCapabilities: [
      'analyze_architecture',
      'suggest_improvements',
      'evaluate_technology',
    ],
    status: 'pending',
    context: {
      reviewScope: 'P0 修復代碼審查',
      changedFiles: Object.keys(fileContents),
      fixes: {
        fix1: {
          name: 'Voice RAG 錄音功能修復',
          file: 'voice-rag-widget.html',
          changes: [
            '添加 MIME type 自動檢測函數 getSupportedMimeType()',
            '優化 getUserMedia 音頻配置（降噪、回聲消除）',
            '使用檢測到的 MIME type 創建 MediaRecorder',
            '動態文件副檔名 (.mp4/.webm/.ogg)',
            '添加詳細日誌以便調試',
          ],
          linesChanged: '約 30 行新增/修改',
          impact: '修復 macOS Safari 錄音兼容性問題',
        },
        fix2: {
          name: 'DEBUG 日誌移除',
          file: 'src/agents/voice-rag/server.ts',
          changes: [
            '移除 4 行 DEBUG console.log',
            '保留核心功能日誌',
          ],
          linesChanged: '4 行刪除',
          impact: '清理代碼，減少日誌噪音',
        },
        fix3: {
          name: '錯誤處理統一',
          files: [
            'src/agents/voice-rag/server.ts',
            'src/agents/rag/embeddings.ts',
            'src/agents/rag/vectorstore.ts',
          ],
          changes: [
            'console.error → logger.error',
            '添加結構化錯誤上下文',
            '保持一致的錯誤處理模式',
          ],
          linesChanged: '6 處修改',
          impact: '標準化錯誤日誌，便於監控和調試',
        },
        fix4: {
          name: 'TODO 清理',
          files: [
            'src/index.ts',
            'src/collaboration/CollaborationManager.ts',
            'TECH_DEBT.md (新增)',
          ],
          changes: [
            '移除代碼中的 TODO 註解',
            '創建 TECH_DEBT.md 追蹤技術債務',
            '添加清晰的未來改進計劃',
          ],
          linesChanged: '4 處 TODO 轉移',
          impact: '改善代碼可維護性，集中管理技術債務',
        },
      },
      reviewCriteria: {
        codeQuality: [
          '代碼是否清晰易讀？',
          '命名是否語義化？',
          '是否遵循 TypeScript 最佳實踐？',
        ],
        security: [
          '是否存在 XSS 漏洞（HTML 拼接）？',
          '用戶輸入是否經過驗證？',
          '敏感數據是否妥善處理？',
        ],
        performance: [
          '是否存在性能瓶頸？',
          '異步操作是否高效？',
          '是否有記憶體洩漏風險？',
        ],
        testing: [
          '修復是否需要新增測試？',
          '是否影響現有測試？',
          '如何驗證修復有效性？',
        ],
      },
      budget: 'API calls cost < $0.50',
    },
  };

  // 7. 執行代碼審查
  logger.info('📋 開始執行代碼審查...\n');
  const session = await manager.executeTask(task);

  // 8. 顯示審查結果
  logger.info('\n' + '═'.repeat(80));
  logger.info('📊 代碼審查結果');
  logger.info('═'.repeat(80));

  logger.info(`\nSession ID: ${session.id}`);
  logger.info(`Team: ${session.team.name}`);
  logger.info(`Status: ${session.results.success ? '✅ 審查完成' : '❌ 審查失敗'}`);
  logger.info(`Duration: ${(session.results.durationMs / 1000).toFixed(1)}s`);
  logger.info(`Cost: $${session.results.cost.toFixed(4)}`);

  if (session.results.success && session.results.output) {
    logger.info('\n📝 審查報告：');
    logger.info('─'.repeat(80));

    session.results.output.forEach((result: any, index: number) => {
      const reviewerName =
        index === 0 ? 'Code Quality Review' :
        index === 1 ? 'Security Review' :
        'Performance Review';

      logger.info(`\n[${reviewerName}]\n${result}\n`);
    });
  }

  if (session.results.error) {
    logger.error(`\n❌ 錯誤: ${session.results.error}`);
  }

  // 9. 清理
  await manager.shutdown();
  logger.info('\n✅ 代碼審查完成！\n');
}

// 執行審查
reviewP0Fixes()
  .then(() => process.exit(0))
  .catch(error => {
    logger.error('代碼審查失敗:', error);
    process.exit(1);
  });
