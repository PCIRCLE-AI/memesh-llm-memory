#!/usr/bin/env tsx
/**
 * P1 Implementation Plan
 * Uses Architecture Agents to plan and guide P1 feature implementation
 */

import { CollaborationManager } from './src/collaboration/index.js';
import { ArchitectureAgent } from './src/agents/architecture/ArchitectureAgent.js';
import { CollaborativeTask } from './src/collaboration/types.js';
import { logger } from './src/utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

async function planP1Implementation() {
  logger.info('🎯 開始 P1 實作規劃...\n');

  // 1. 初始化協作管理器
  const manager = new CollaborationManager();
  await manager.initialize();

  // 2. 創建專業 Architecture Agents
  const sqliteArchitect = new ArchitectureAgent({
    name: 'SQLite Architect',
    systemPrompt: `你是 SQLite 資料庫專家，專注於：
- 資料庫 schema 設計和優化
- SQLite 最佳實踐（WAL mode, indexes, transactions）
- TypeScript ORM 整合（Kysely, TypeORM, Prisma）
- 資料遷移策略
- 資料持久化和備份

任務：設計 CollaborationManager 的 SQLite 持久化方案
需求：
- 持久化 Agent teams 配置
- 持久化 Collaboration sessions 歷史
- 高效查詢和檢索
- 支持未來擴展（新的 agent types, team structures）

提供：
1. 完整的 database schema（SQL）
2. TypeScript 類型定義
3. 遷移腳本
4. CRUD 操作實作建議`,
  });

  const apiArchitect = new ArchitectureAgent({
    name: 'API Security Architect',
    systemPrompt: `你是 API 安全和中間件專家，專注於：
- Express middleware 設計
- Rate limiting 策略（express-rate-limit, bottleneck）
- API retry 機制（exponential backoff）
- Request validation 和 sanitization
- Error handling 和 recovery

任務：設計 API 安全中間件
需求：
- Rate Limiting：防止 API 濫用
  * 每個 IP: 100 requests/15min
  * 特殊端點（voice transcription）: 10 requests/min
- Retry Mechanism：
  * 自動重試暫時性錯誤（429, 503, network errors）
  * Exponential backoff with jitter
  * 最多 3 次重試
- Request Validation：
  * 輸入驗證和清理
  * Content-Type 檢查

提供：
1. Rate limiting middleware 實作
2. Retry utility function
3. Validation middleware
4. 使用範例和測試`,
  });

  const testingArchitect = new ArchitectureAgent({
    name: 'E2E Testing Architect',
    systemPrompt: `你是 E2E 測試專家，專注於：
- Playwright 測試設計
- 測試場景設計（happy path, edge cases, error cases）
- CI/CD 整合
- 測試數據管理
- 測試覆蓋率優化

任務：設計 smart-agents 的 E2E 測試套件
需求：
- Voice RAG 完整流程測試
  * 麥克風權限、錄音、上傳、轉錄、RAG 檢索、Claude 回應、TTS
- Collaboration 系統測試
  * Team creation, task assignment, agent communication
- API 端點測試
  * 正常流程、錯誤處理、安全限制
- 跨瀏覽器測試（Chrome, Safari, Firefox）

提供：
1. 測試場景清單（優先級排序）
2. Playwright 配置
3. 關鍵測試腳本範例
4. CI 整合建議`,
  });

  // 3. 註冊 Agents
  manager.registerAgent(sqliteArchitect);
  manager.registerAgent(apiArchitect);
  manager.registerAgent(testingArchitect);

  logger.info(`✅ 已註冊 ${manager.getAgents().length} 個 Architecture Agents\n`);

  // 4. 創建 P1 Planning Team
  const p1Team = await manager.createTeam({
    name: 'P1 Implementation Team',
    description: 'P1 功能實作規劃團隊',
    members: [sqliteArchitect.id, apiArchitect.id, testingArchitect.id],
    leader: sqliteArchitect.id,
    capabilities: [
      'analyze_architecture',
      'suggest_improvements',
      'evaluate_technology',
    ],
  });

  logger.info(`✅ 已創建規劃團隊: ${p1Team.name}\n`);

  // 5. 定義 P1 Planning Task
  const task: CollaborativeTask = {
    id: uuidv4(),
    description: 'Plan P1 feature implementation: SQLite persistence, Rate limiting, API retry, E2E tests',
    requiredCapabilities: [
      'analyze_architecture',
      'suggest_improvements',
      'evaluate_technology',
    ],
    status: 'pending',
    context: {
      projectInfo: {
        name: 'smart-agents',
        tech: 'TypeScript, Express, OpenAI API, ChromaDB',
        currentState: 'P0 fixes completed and tested',
      },
      p1Features: {
        '1_sqlite_persistence': {
          priority: 'P1',
          description: 'Persist Agent teams and Collaboration sessions to SQLite',
          estimatedEffort: '4-6 hours',
          files: [
            'src/collaboration/persistence/database.ts (new)',
            'src/collaboration/persistence/schema.sql (new)',
            'src/collaboration/CollaborationManager.ts (modify)',
          ],
          requirements: [
            'Store team configurations (name, members, capabilities)',
            'Store session history (id, team, task, results, timestamps)',
            'Support queries: get recent sessions, search by team/task',
            'Migration system for future schema changes',
          ],
        },
        '2_rate_limiting': {
          priority: 'P1',
          description: 'Add rate limiting middleware to prevent API abuse',
          estimatedEffort: '2-3 hours',
          files: [
            'src/middleware/rateLimiter.ts (new)',
            'src/agents/voice-rag/server.ts (modify)',
          ],
          requirements: [
            'General rate limit: 100 requests per 15 minutes per IP',
            'Voice endpoints: 10 requests per minute per IP',
            'Clear error messages (429 status, Retry-After header)',
            'Configurable limits (environment variables)',
          ],
        },
        '3_api_retry': {
          priority: 'P1',
          description: 'Implement retry mechanism for transient API failures',
          estimatedEffort: '2-3 hours',
          files: [
            'src/utils/retry.ts (new)',
            'src/agents/voice/transcriber.ts (modify)',
            'src/agents/voice/synthesizer.ts (modify)',
          ],
          requirements: [
            'Retry on: 429, 503, network errors',
            'Exponential backoff: 1s, 2s, 4s with jitter',
            'Maximum 3 retries',
            'Detailed error logging',
          ],
        },
        '4_e2e_tests': {
          priority: 'P1',
          description: 'E2E test suite for critical user flows',
          estimatedEffort: '6-8 hours',
          files: [
            'tests/e2e/voice-rag.spec.ts (new)',
            'tests/e2e/collaboration.spec.ts (new)',
            'playwright.config.ts (modify)',
          ],
          requirements: [
            'Voice RAG: record → transcribe → RAG → response → TTS',
            'Collaboration: create team → assign task → execute → verify results',
            'API security: test rate limits, file size limits, MIME validation',
            'Cross-browser: Chrome, Safari, Firefox',
          ],
        },
      },
      constraints: {
        budget: 'API costs < $1 per implementation',
        timeline: 'Complete P1 in current session',
        testing: 'All features must have tests before merging',
      },
    },
  };

  // 6. 執行規劃任務
  logger.info('📋 開始執行 P1 規劃任務...\n');
  const session = await manager.executeTask(task);

  // 7. 顯示規劃結果
  logger.info('\n' + '═'.repeat(80));
  logger.info('📊 P1 實作規劃結果');
  logger.info('═'.repeat(80));

  logger.info(`\nSession ID: ${session.id}`);
  logger.info(`Team: ${session.team.name}`);
  logger.info(`Status: ${session.results.success ? '✅ 規劃完成' : '❌ 規劃失敗'}`);
  logger.info(`Duration: ${(session.results.durationMs / 1000).toFixed(1)}s`);
  logger.info(`Cost: $${session.results.cost.toFixed(4)}`);

  if (session.results.success && session.results.output) {
    logger.info('\n📝 實作規劃：');
    logger.info('─'.repeat(80));

    session.results.output.forEach((result: any, index: number) => {
      const architectName =
        index === 0 ? 'SQLite Architect' :
        index === 1 ? 'API Security Architect' :
        'E2E Testing Architect';

      logger.info(`\n[${architectName}]\n${result}\n`);
    });
  }

  if (session.results.error) {
    logger.error(`\n❌ 錯誤: ${session.results.error}`);
  }

  // 8. 清理
  await manager.shutdown();
  logger.info('\n✅ P1 規劃完成！\n');
  logger.info('📋 下一步：根據規劃執行實作任務');
}

// 執行規劃
planP1Implementation()
  .then(() => process.exit(0))
  .catch(error => {
    logger.error('P1 規劃失敗:', {
      message: error.message,
      stack: error.stack,
      error
    });
    console.error(error);
    process.exit(1);
  });
