# Smart-Agents 代碼庫分析 - 專案記憶系統

**分析日期**: 2025-12-31
**目的**: 檢視現有代碼結構，避免重複實作專案記憶系統

---

## 📋 執行摘要

經過全面檢視 smart-agents 代碼庫，發現以下關鍵基礎設施已經實作：

✅ **可重用的組件**:
1. Knowledge Graph (完整實作) - 完美適合專案記憶儲存
2. Hook Integration 系統 - 可擴展用於自動追蹤
3. MCP Tool Interface - 標準化的工具介面
4. Evolution System - 性能追蹤和學習系統

❌ **尚未實作的功能**:
1. 跨 session 專案記憶追蹤
2. 30 天自動清理機制
3. 故事敘述生成器
4. Claude Code 專案記憶整合 API

**建議**: 在現有基礎上擴展，避免重複造輪子

---

## 🔍 詳細發現

### 1. Knowledge Graph System (已實作 ✅)

**位置**: `/src/knowledge-graph/index.ts`

**核心功能**:
```typescript
class KnowledgeGraph {
  createEntity(entity: Entity): number
  createRelation(relation: Relation): void
  searchEntities(query: SearchQuery): Entity[]
  getEntity(name: string): Entity | null
  traceRelations(entityName: string, depth: number): RelationTrace
  getStats(): { totalEntities, totalRelations, entitiesByType }
}
```

**儲存**:
- SQLite 資料庫: `data/knowledge-graph.db`
- Schema: entities, observations, relations, tags
- 支援全文搜尋、關係追蹤、標籤過濾

**Entity 結構**:
```typescript
interface Entity {
  id?: number;
  name: string;
  type: string;
  observations?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}
```

**Relation 結構**:
```typescript
interface Relation {
  from: string;
  to: string;
  relationType: string;
  metadata?: Record<string, unknown>;
}
```

**評估**: ✅ **完美適合專案記憶系統**
- 已經有 Entity-Observation-Relation 模型
- 支援語義搜尋和關係追蹤
- SQLite 儲存，效能優異
- 完整的查詢 API

**建議**: 直接使用，定義新的 Entity 類型（Project, WorkSession, Feature, Issue, Decision）

---

### 2. Hook Integration System (已實作 ✅)

**位置**: `/src/core/HookIntegration.ts`

**核心功能**:
```typescript
class HookIntegration {
  async detectCheckpointFromToolUse(toolData: ToolUseData): Promise<Checkpoint | null>
  async processToolUse(toolData: ToolUseData): Promise<void>
  onButlerTrigger(callback: (context: CheckpointContext) => void): void
}
```

**監控的工具**:
- Write - 新檔案創建
- Edit - 檔案修改
- Bash - 命令執行（測試、Git 操作）

**Checkpoint 類型**:
- `code-written` - 代碼撰寫完成
- `test-complete` - 測試完成
- `commit-ready` - 準備提交

**評估**: ✅ **可擴展用於專案記憶追蹤**
- 已經監控關鍵工具使用
- 有 checkpoint 偵測機制
- 可添加新的 checkpoint 類型

**建議**: 擴展現有 Hook 系統，新增專案記憶相關的 checkpoints

---

### 3. Session Management (部分實作 ⚠️)

**已實作**:

**SessionContextMonitor** (`/src/core/SessionContextMonitor.ts`):
```typescript
class SessionContextMonitor {
  checkSessionHealth(): SessionHealth
  recordQualityScore(score: number): void
  getStats(): { tokenStats, qualityHistory, lastHealthCheck }
}
```

**SessionTokenTracker** (`/src/core/SessionTokenTracker.ts`):
- Token 使用追蹤
- 閾值警告
- 使用百分比計算

**評估**: ⚠️ **只有 session 內的監控，沒有跨 session 記憶**
- 可追蹤當前 session 的 token 和品質
- **缺少跨 session 的專案追蹤**
- **缺少 30 天歷史記錄**

**建議**: 整合 SessionContextMonitor 與新的 ProjectMemoryManager

---

### 4. Evolution System (已實作 ✅)

**位置**: `/src/evolution/`

**核心組件**:

**LearningManager** (`LearningManager.ts`):
```typescript
class LearningManager {
  private patterns: Map<string, LearnedPattern[]>
  private feedback: Map<string, AgentFeedback[]>

  async analyzePerformance(agentId: string): Promise<AgentPerformanceAnalysis>
  recordPatternValidation(patternId: string, success: boolean): void
  getOptimizationCandidates(agentId: string): OptimizationCandidate[]
}
```

**PerformanceTracker** (`PerformanceTracker.ts`):
- 追蹤 agent 執行指標
- 性能歷史記錄
- 統計分析

**SQLiteStore** (`storage/SQLiteStore.ts`):
- 完整的演化數據儲存
- Schema: patterns, metrics, feedback, experiments
- Migration 支援

**評估**: ✅ **可參考其性能追蹤模式**
- 成熟的追蹤和學習機制
- 但專注於 agent 行為，不是專案歷史

**建議**: 參考其追蹤模式，但不直接使用（領域不同）

---

### 5. MCP Integration (已實作 ✅)

**MCPToolInterface** (`/src/core/MCPToolInterface.ts`):
```typescript
class MCPToolInterface {
  public filesystem = {
    readFile: async (path: string): Promise<string>
    writeFile: async (opts: { path, content }): Promise<void>
  }

  public memory = {
    createEntities: async (opts): Promise<void>
  }

  public bash = async (opts: { command, timeout }): Promise<{ exitCode, stdout, stderr }>
}
```

**評估**: ✅ **標準化的工具介面**
- 已經有 memory 輔助方法（Knowledge Graph）
- 可直接使用

**建議**: 擴展 `memory` 輔助方法，新增專案記憶相關 API

---

## 📊 架構分析

### 現有系統架構 (from ARCHITECTURE.md)

```
Claude Code (MCP Client)
    ↓
Smart-Agents MCP Server
    ↓
Router (Orchestrator)
    ├─ TaskAnalyzer
    ├─ AgentRouter
    ├─ PromptEnhancer
    └─ Evolution System
        ├─ PerformanceTracker
        ├─ LearningManager
        └─ AdaptationEngine
    ↓
13 Specialized Agents
    ├─ 5 Real Implementations (RAG, Evolution, KG, Butler, TestWriter)
    └─ 8 Prompt-Enhanced Agents
```

**特點**:
- MCP Server Pattern - 透過 MCP protocol 與 Claude Code 整合
- Prompt Enhancement - 生成優化的 prompts，由 Claude Code 執行
- Evolution System - 自我學習和優化

---

## 🎯 專案記憶系統整合建議

### 推薦架構

```
Project Memory System
├─ 數據層 (使用現有 Knowledge Graph)
│  ├─ Entity 類型: Project, WorkSession, Feature, Issue, Decision
│  ├─ Relations: worked_on, contains, depends_on, resolved
│  └─ 使用現有 KnowledgeGraph API
│
├─ 追蹤層 (擴展現有 Hook 系統)
│  ├─ 擴展 HookIntegration
│  ├─ 新增 checkpoints: session-start, session-end, feature-complete
│  └─ 自動記錄到 Knowledge Graph
│
├─ 故事生成層 (新實作)
│  ├─ ProjectStoryGenerator
│  ├─ 查詢 Knowledge Graph
│  └─ 生成 timeline / narrative / summary
│
└─ 清理層 (新實作)
   ├─ 30-day retention policy
   ├─ 自動清理過期數據
   └─ 保留重要實體（標記為 "important"）
```

### 避免重複的關鍵決策

#### ✅ 使用現有的：

1. **Knowledge Graph** - 數據儲存
   - 路徑：`src/knowledge-graph/index.ts`
   - 使用：`createEntity()`, `createRelation()`, `searchEntities()`
   - 定義新的 Entity 類型：`project`, `work_session`, `feature`, `issue`, `decision`

2. **Hook Integration** - 自動追蹤
   - 路徑：`src/core/HookIntegration.ts`
   - 擴展：新增專案記憶相關的 checkpoints
   - 使用：現有的 `processToolUse()` 機制

3. **MCPToolInterface** - 標準介面
   - 路徑：`src/core/MCPToolInterface.ts`
   - 擴展：`memory` 輔助方法
   - 新增：`memory.getProjectHistory()`, `memory.generateStory()`

#### 🆕 需要新實作的：

1. **ProjectMemoryManager** (新)
   - 職責：專案記憶管理邏輯
   - 位置：`src/core/ProjectMemoryManager.ts`
   - 使用 Knowledge Graph API

2. **ProjectAutoTracker** (新)
   - 職責：自動追蹤專案活動
   - 位置：`src/hooks/ProjectAutoTracker.ts`
   - 整合 HookIntegration

3. **ProjectStoryGenerator** (新)
   - 職責：生成故事敘述
   - 位置：`src/utils/ProjectStoryGenerator.ts`
   - 查詢 Knowledge Graph，生成 narrative

4. **30-Day Cleanup Service** (新)
   - 職責：自動清理過期記憶
   - 位置：`src/services/ProjectMemoryCleanup.ts`
   - 定時任務，保留重要數據

---

## 💾 數據模型設計

### 使用 Knowledge Graph 的 Entity 定義

```typescript
// Project Entity
{
  name: "smart-agents",
  type: "project",
  observations: [
    "Path: /Users/ktseng/Developer/Projects/smart-agents",
    "Created: 2025-12-15T10:00:00Z",
    "Last Accessed: 2025-12-31T14:00:00Z",
    "Language: TypeScript",
    "Framework: Node.js",
    "Git: Initialized",
    "Total Sessions: 15",
    "Total Features: 8"
  ],
  tags: ["active", "typescript", "agent-system"],
  metadata: {
    createdAt: "2025-12-15T10:00:00Z",
    lastAccessed: "2025-12-31T14:00:00Z",
    retentionPolicy: "30-days"
  }
}

// WorkSession Entity
{
  name: "smart-agents-session-2025-12-31-14:00",
  type: "work_session",
  observations: [
    "Started: 2025-12-31T14:00:00Z",
    "Ended: 2025-12-31T16:30:00Z",
    "Duration: 2.5 hours",
    "Features Worked: Git Assistant Integration",
    "Files Modified: 7",
    "Tests: 34 passed",
    "Commits: 3"
  ],
  tags: ["completed", "git-integration"],
  metadata: {
    startTime: "2025-12-31T14:00:00Z",
    endTime: "2025-12-31T16:30:00Z",
    quality: 0.95
  }
}

// Feature Entity
{
  name: "Git Assistant Integration",
  type: "feature",
  observations: [
    "Description: Auto Git management with 4 automation levels",
    "Status: Completed",
    "Files Created: 6",
    "Tests Added: 12",
    "Documentation: docs/GIT_ASSISTANT.md",
    "Complexity: Medium"
  ],
  tags: ["git", "automation", "completed"],
  metadata: {
    startedAt: "2025-12-31T14:00:00Z",
    completedAt: "2025-12-31T16:30:00Z"
  }
}
```

### Relations

```typescript
// Project worked_on WorkSession
{
  from: "smart-agents",
  to: "smart-agents-session-2025-12-31-14:00",
  relationType: "worked_on"
}

// WorkSession contains Feature
{
  from: "smart-agents-session-2025-12-31-14:00",
  to: "Git Assistant Integration",
  relationType: "contains"
}

// Feature resolved Issue
{
  from: "Git Assistant Integration",
  to: "Issue-15-git-tracking",
  relationType: "resolved"
}
```

---

## 🔧 實作計劃

### Phase 1: 數據層（使用現有 Knowledge Graph）

**不需要新實作 schema**，直接使用現有的 KnowledgeGraph:

```typescript
// src/core/ProjectMemoryManager.ts
import { KnowledgeGraph } from '../knowledge-graph/index.js';

export class ProjectMemoryManager {
  private kg: KnowledgeGraph;

  async recordProject(projectPath: string) {
    await this.kg.createEntity({
      name: this.getProjectName(projectPath),
      type: 'project',
      observations: [
        `Path: ${projectPath}`,
        `Created: ${new Date().toISOString()}`,
        // ...
      ],
      tags: ['active']
    });
  }

  async recordWorkSession(projectName: string, sessionData: WorkSessionData) {
    const sessionName = `${projectName}-session-${new Date().toISOString()}`;

    // Create session entity
    await this.kg.createEntity({
      name: sessionName,
      type: 'work_session',
      observations: [...],
      tags: ['active']
    });

    // Link to project
    await this.kg.createRelation({
      from: projectName,
      to: sessionName,
      relationType: 'worked_on'
    });
  }
}
```

### Phase 2: 追蹤層（擴展 Hook 系統）

```typescript
// src/hooks/ProjectAutoTracker.ts
import { HookIntegration } from '../core/HookIntegration.js';
import { ProjectMemoryManager } from '../core/ProjectMemoryManager.js';

export class ProjectAutoTracker {
  constructor(
    private hookIntegration: HookIntegration,
    private memoryManager: ProjectMemoryManager
  ) {
    this.setupHooks();
  }

  private setupHooks() {
    // Hook 到現有的 checkpoint 系統
    this.hookIntegration.onButlerTrigger(async (context) => {
      if (context.checkpoint === 'code-written') {
        await this.memoryManager.trackFileModification(context.data);
      }
      if (context.checkpoint === 'test-complete') {
        await this.memoryManager.trackTestResults(context.data);
      }
      // ... more checkpoints
    });
  }
}
```

### Phase 3: 故事生成層（新實作）

```typescript
// src/utils/ProjectStoryGenerator.ts
import { KnowledgeGraph } from '../knowledge-graph/index.js';

export class ProjectStoryGenerator {
  constructor(private kg: KnowledgeGraph) {}

  async generateStory(projectName: string, options: StoryOptions): Promise<string> {
    // 1. 查詢專案實體
    const project = await this.kg.getEntity(projectName);

    // 2. 追蹤關聯實體
    const relations = await this.kg.traceRelations(projectName, 3);

    // 3. 按時間排序
    const timeline = this.buildTimeline(relations);

    // 4. 生成敘述
    return this.formatAsNarrative(timeline, options);
  }
}
```

### Phase 4: 清理層（新實作）

```typescript
// src/services/ProjectMemoryCleanup.ts
export class ProjectMemoryCleanup {
  async cleanupOldMemories(retentionDays: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // 查詢過期的 work_session
    const oldSessions = await this.kg.searchEntities({
      type: 'work_session',
      // filter by date < cutoffDate
    });

    // 刪除非重要的 sessions
    for (const session of oldSessions) {
      if (!session.tags?.includes('important')) {
        // Delete observations
        // Keep entity skeleton for relations
      }
    }
  }
}
```

---

## 📝 MCP API 擴展建議

### 擴展 MCPToolInterface

```typescript
// src/core/MCPToolInterface.ts
export class MCPToolInterface {
  // ... 現有代碼 ...

  /**
   * Project Memory helper methods
   */
  public projectMemory = {
    /**
     * Get project history
     */
    getProjectHistory: async (projectName: string, timeRange?: string) => {
      const manager = new ProjectMemoryManager(this.knowledgeGraph);
      return await manager.getProjectHistory(projectName, timeRange);
    },

    /**
     * Generate story from project memory
     */
    generateStory: async (projectName: string, options: StoryOptions) => {
      const generator = new ProjectStoryGenerator(this.knowledgeGraph);
      return await generator.generateStory(projectName, options);
    },

    /**
     * Record current session
     */
    recordSession: async (projectName: string, sessionData: SessionData) => {
      const manager = new ProjectMemoryManager(this.knowledgeGraph);
      return await manager.recordWorkSession(projectName, sessionData);
    }
  };
}
```

---

## ⚠️ 避免的錯誤

### ❌ 不要做的事：

1. **不要創建新的 SQLite schema**
   - 原因：Knowledge Graph 已經有完整的 entity-relation 模型
   - 使用：直接定義新的 Entity 類型

2. **不要重新實作 Hook 系統**
   - 原因：HookIntegration 已經監控工具使用
   - 使用：擴展現有的 checkpoint 系統

3. **不要創建新的 MCP 工具介面**
   - 原因：MCPToolInterface 已經標準化
   - 使用：擴展 `memory` 輔助方法

4. **不要在 Evolution System 裡儲存專案記憶**
   - 原因：Evolution System 專注於 agent 學習
   - 使用：Knowledge Graph 專門儲存專案記憶

### ✅ 應該做的事：

1. **使用 Knowledge Graph 儲存所有專案記憶**
2. **擴展現有 Hook 系統進行自動追蹤**
3. **在 MCPToolInterface 新增專案記憶 API**
4. **實作獨立的 StoryGenerator 和 Cleanup Service**

---

## 📚 相關檔案索引

### 現有基礎設施

1. **Knowledge Graph**:
   - `/src/knowledge-graph/index.ts` - 主要實作
   - `/src/knowledge-graph/types.ts` - 型別定義

2. **Hook System**:
   - `/src/core/HookIntegration.ts` - Hook 整合
   - `/src/core/CheckpointDetector.ts` - Checkpoint 偵測

3. **MCP Integration**:
   - `/src/core/MCPToolInterface.ts` - 工具介面
   - `/src/mcp/server.ts` - MCP Server

4. **Evolution System** (參考用):
   - `/src/evolution/LearningManager.ts` - 學習管理
   - `/src/evolution/PerformanceTracker.ts` - 性能追蹤
   - `/src/evolution/storage/SQLiteStore.ts` - 儲存實作

5. **Session Management**:
   - `/src/core/SessionContextMonitor.ts` - Session 監控
   - `/src/core/SessionTokenTracker.ts` - Token 追蹤

### 需要創建的檔案

1. **Core Logic**:
   - `/src/core/ProjectMemoryManager.ts` - 專案記憶管理器

2. **Auto Tracking**:
   - `/src/hooks/ProjectAutoTracker.ts` - 自動追蹤

3. **Story Generation**:
   - `/src/utils/ProjectStoryGenerator.ts` - 故事生成器

4. **Cleanup**:
   - `/src/services/ProjectMemoryCleanup.ts` - 清理服務

5. **Types**:
   - `/src/types/project-memory.ts` - 專案記憶型別定義

6. **Integration**:
   - `/src/integrations/ProjectMemoryIntegration.ts` - 整合層（類似 GitAssistantIntegration）

---

## 🎯 結論

**核心發現**:
- Smart-agents 已經有完整的 Knowledge Graph 系統
- Hook Integration 提供自動追蹤基礎
- 專案記憶系統可以在現有基礎上快速構建
- **避免重複造輪子，善用現有組件**

**推薦路徑**:
1. ✅ 使用 Knowledge Graph 儲存專案記憶（已驗證可行）
2. ✅ 擴展 Hook 系統進行自動追蹤（已驗證可行）
3. 🆕 實作 StoryGenerator（新組件）
4. 🆕 實作 Cleanup Service（新組件）
5. ✅ 整合到 MCPToolInterface（擴展現有）

**預估工作量**:
- 數據層：0 小時（使用現有 Knowledge Graph）
- 追蹤層：2-3 小時（擴展 Hook 系統）
- 故事生成：4-5 小時（新實作）
- 清理服務：2-3 小時（新實作）
- 整合測試：2-3 小時
- **總計：10-14 小時**

**下一步**:
向用戶報告分析結果，徵求同意後開始實作。
