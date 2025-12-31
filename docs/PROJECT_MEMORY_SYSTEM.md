# Project Memory System Design

## 🎯 Goals

讓 Smart-Agents 幫助 Claude Code 記住所有工作過的專案（30 天內），並以清晰的故事線方式呈現專案歷史。

## 📋 Requirements

1. **30 天本地記憶** - 自動記錄所有專案活動
2. **本地資源** - 完全在本機運作，不需要雲端
3. **故事線查詢** - 將記憶轉換成清晰的敘述
4. **Claude Code 整合** - 提供簡單的查詢接口

## 🏗️ Architecture Design

### Option 1: Knowledge Graph (RECOMMENDED) ⭐

**為什麼推薦**：
- ✅ **已經在用** - Smart-agents 已整合 Knowledge Graph (MCP Memory)
- ✅ **語義化搜尋** - 可以用自然語言查詢
- ✅ **關聯性強** - 專案、檔案、功能、commit 之間的關係清晰
- ✅ **時間序列** - 自然支援按時間排序
- ✅ **故事生成容易** - Entity + Relations 天然適合敘述故事

**資料結構**：
```typescript
// 專案實體
Entity: Project {
  name: "smart-agents",
  entityType: "project",
  observations: [
    "Path: /Users/ktseng/Developer/Projects/smart-agents",
    "Created: 2025-12-15T10:00:00Z",
    "Last Accessed: 2025-12-31T14:00:00Z",
    "Language: TypeScript",
    "Framework: Node.js",
    "Git: Initialized"
  ]
}

// 工作 Session 實體
Entity: WorkSession {
  name: "smart-agents Work Session 2025-12-31 14:00",
  entityType: "work_session",
  observations: [
    "Project: smart-agents",
    "Start: 2025-12-31T14:00:00Z",
    "End: 2025-12-31T16:30:00Z",
    "Duration: 2.5 hours",
    "Files Modified: 15",
    "Commits: 3"
  ]
}

// 功能開發實體
Entity: Feature {
  name: "Git Assistant Implementation",
  entityType: "feature",
  observations: [
    "Project: smart-agents",
    "Status: Completed",
    "Started: 2025-12-31T14:00:00Z",
    "Completed: 2025-12-31T16:30:00Z",
    "Files: GitAssistantHook.ts, FriendlyGitCommands.ts, ...",
    "Tests: Passed",
    "Documentation: Updated"
  ]
}

// 關聯關係
Relation: Project "smart-agents" --[has_session]--> WorkSession "2025-12-31 14:00"
Relation: WorkSession "2025-12-31 14:00" --[implemented]--> Feature "Git Assistant"
Relation: Feature "Git Assistant" --[uses]--> Entity "Knowledge Graph"
```

**查詢範例**：
```typescript
// 查詢 30 天內的專案
const projects = await mcp.memory.searchNodes({
  entityType: "project",
  timeRange: "last-30-days"
});

// 查詢特定專案的歷史
const history = await mcp.memory.searchNodes({
  query: "smart-agents project history",
  timeRange: "last-30-days"
});

// 查詢昨天做了什麼
const yesterday = await mcp.memory.searchNodes({
  query: "work sessions yesterday"
});
```

### Option 2: SQLite Database

**優點**：
- 結構化查詢（SQL）
- 快速範圍查詢
- 支援複雜 JOIN

**缺點**：
- 需要額外設置 SQLite
- 沒有語義化搜尋
- 需要定義 schema
- 不如 Knowledge Graph 直覺

### Option 3: JSON Files

**優點**：
- 簡單、無依賴
- 人類可讀

**缺點**：
- 查詢效能差
- 沒有關聯性
- 難以維護
- 不適合大量資料

## 🎯 推薦方案：Knowledge Graph

使用已整合的 Knowledge Graph (MCP Memory) 作為專案記憶系統。

### 為什麼這是最佳解決方案

1. **Zero Setup** - 已經在用，不需要額外配置
2. **語義化** - 可以用自然語言查詢專案歷史
3. **關聯性** - 專案之間、功能之間的關係清晰
4. **時間序列** - 自然支援按時間排序和過濾
5. **故事生成** - Entity + Observations 天然適合生成敘述
6. **可擴展** - 可以輕鬆添加新的實體類型

## 📊 資料模型

### Entity Types

```typescript
// 1. Project (專案)
{
  name: "專案名稱",
  entityType: "project",
  observations: [
    "Path: 絕對路徑",
    "Language: 主要語言",
    "Framework: 框架",
    "Created: 建立時間",
    "Last Accessed: 最後存取時間",
    "Total Sessions: 工作次數",
    "Git Status: Git 狀態"
  ]
}

// 2. Work Session (工作 Session)
{
  name: "專案名稱 Work Session 日期時間",
  entityType: "work_session",
  observations: [
    "Project: 專案名稱",
    "Start: 開始時間",
    "End: 結束時間",
    "Duration: 工作時長",
    "Files Modified: 修改檔案數",
    "Lines Added: 新增行數",
    "Lines Removed: 刪除行數",
    "Commits: Commit 數量",
    "Summary: AI 生成的摘要"
  ]
}

// 3. Feature (功能開發)
{
  name: "功能名稱",
  entityType: "feature",
  observations: [
    "Project: 所屬專案",
    "Status: 狀態（In Progress, Completed, Blocked）",
    "Started: 開始時間",
    "Completed: 完成時間",
    "Files: 相關檔案清單",
    "Description: 功能描述",
    "Tests: 測試狀態",
    "Documentation: 文檔狀態"
  ]
}

// 4. Issue/Bug (問題/Bug)
{
  name: "問題描述",
  entityType: "issue",
  observations: [
    "Project: 所屬專案",
    "Type: Bug | Enhancement | Question",
    "Status: Open | In Progress | Resolved",
    "Reported: 回報時間",
    "Resolved: 解決時間",
    "Root Cause: 根本原因",
    "Solution: 解決方案",
    "Related Files: 相關檔案"
  ]
}

// 5. Decision (技術決策)
{
  name: "決策標題",
  entityType: "decision",
  observations: [
    "Project: 所屬專案",
    "Date: 決策日期",
    "Context: 決策背景",
    "Options Considered: 考慮的選項",
    "Decision: 最終決策",
    "Reasoning: 決策理由",
    "Impact: 影響範圍"
  ]
}
```

### Relation Types

```
Project --[has_session]--> WorkSession
WorkSession --[implemented]--> Feature
WorkSession --[fixed]--> Issue
Feature --[depends_on]--> Feature
Issue --[related_to]--> Feature
Decision --[affects]--> Feature
Project --[uses]--> Technology
```

## 🔄 Automatic Tracking

### Hook Points (自動追蹤時機)

```typescript
// 1. Project Open
onProjectOpen(projectPath: string) {
  // 創建/更新 Project entity
  // 創建新 WorkSession entity
  // 記錄開始時間
}

// 2. File Change
onFileChanged(files: string[]) {
  // 更新當前 WorkSession 的修改統計
  // 累積 files modified, lines changed
}

// 3. Git Commit
onGitCommit(message: string, files: string[]) {
  // 記錄 commit 到 WorkSession
  // 可能觸發 Feature 狀態更新
}

// 4. Feature Complete
onFeatureComplete(featureName: string, files: string[]) {
  // 創建/更新 Feature entity
  // 關聯到當前 WorkSession
  // 設置 Status = Completed
}

// 5. Bug Fixed
onBugFixed(bugDescription: string, solution: string) {
  // 創建/更新 Issue entity
  // 設置 Status = Resolved
  // 關聯到當前 WorkSession
}

// 6. Session End
onSessionEnd() {
  // 更新 WorkSession End time
  // 計算 Duration
  // 生成 AI Summary
}

// 7. Decision Made
onDecisionMade(title: string, context: string, decision: string) {
  // 創建 Decision entity
  // 關聯到當前 Project
}
```

### Auto-Cleanup (30 天自動清理)

```typescript
// 每日清理腳本
async function cleanupOldMemories() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 刪除 30 天前的 WorkSession
  await mcp.memory.deleteEntities({
    entityType: "work_session",
    createdBefore: thirtyDaysAgo
  });

  // 保留重要資訊（Feature, Decision, Issue 如果已解決）
  // 可選：歸檔到壓縮的 JSON 檔案
}
```

## 🎨 Story Generation (故事線生成)

### 查詢接口

```typescript
interface ProjectMemoryQuery {
  project?: string;        // 特定專案
  timeRange?: string;      // "today", "yesterday", "last-week", "last-30-days"
  type?: EntityType[];     // 過濾實體類型
  search?: string;         // 自然語言搜尋
}

interface StoryOptions {
  format: 'timeline' | 'narrative' | 'summary';
  verbosity: 'brief' | 'detailed' | 'comprehensive';
  groupBy?: 'session' | 'feature' | 'day';
}
```

### Story Formats

#### 1. Timeline Format (時間線)

```
📅 2025-12-31
  🕐 14:00 - 16:30 (2.5 hours)
  📁 Project: smart-agents
  ✨ Completed: Git Assistant Implementation
     • Created GitAssistantHook.ts
     • Created FriendlyGitCommands.ts
     • Created GitSetupWizard.ts
     • Updated documentation
     💾 Commits: 3
     📝 Files modified: 15

  🕐 17:00 - 18:00 (1 hour)
  📁 Project: smart-agents
  🔨 Started: Project Memory System Design
     • Created design document
     • Analyzed options (Knowledge Graph vs SQLite vs JSON)
     • Decided on Knowledge Graph approach
```

#### 2. Narrative Format (敘述式)

```
Today you worked on two major tasks in the smart-agents project.

In the afternoon session from 14:00 to 16:30, you completed the Git Assistant
implementation. This involved creating three core components:
- GitAssistantHook for automatic Git management
- FriendlyGitCommands to provide user-friendly Git operations
- GitSetupWizard for interactive setup

You modified 15 files and made 3 commits. The implementation follows the
design approved earlier, with 4 automation levels and optional GitHub integration.

Later in the evening (17:00-18:00), you started designing the Project Memory
System. You evaluated three options - Knowledge Graph, SQLite, and JSON files -
and decided on Knowledge Graph because it's already integrated and provides
semantic search capabilities.
```

#### 3. Summary Format (摘要式)

```
📊 Today's Work Summary

Projects Worked On:
  • smart-agents (3.5 hours)

Key Accomplishments:
  ✅ Git Assistant Implementation (completed)
  🚧 Project Memory System Design (in progress)

Statistics:
  • Sessions: 2
  • Duration: 3.5 hours
  • Files modified: 18
  • Commits: 3
  • Features completed: 1
```

### Story Generator Implementation

```typescript
class ProjectStoryGenerator {
  async generateStory(
    query: ProjectMemoryQuery,
    options: StoryOptions
  ): Promise<string> {
    // 1. Query Knowledge Graph
    const entities = await this.queryMemories(query);

    // 2. Organize by time or structure
    const organized = this.organizeEntities(entities, options.groupBy);

    // 3. Generate story based on format
    switch (options.format) {
      case 'timeline':
        return this.generateTimeline(organized, options.verbosity);
      case 'narrative':
        return this.generateNarrative(organized, options.verbosity);
      case 'summary':
        return this.generateSummary(organized);
    }
  }

  private async queryMemories(query: ProjectMemoryQuery) {
    // Build search query for Knowledge Graph
    let searchQuery = '';

    if (query.project) {
      searchQuery += `project ${query.project} `;
    }

    if (query.timeRange) {
      searchQuery += query.timeRange;
    }

    return await this.mcp.memory.searchNodes({
      query: searchQuery,
      entityTypes: query.type
    });
  }

  private generateTimeline(entities: Entity[], verbosity: string): string {
    // Group by day
    const byDay = this.groupByDay(entities);

    let timeline = '';
    for (const [day, events] of byDay) {
      timeline += `📅 ${day}\n`;

      for (const event of events) {
        if (event.entityType === 'work_session') {
          timeline += this.formatWorkSession(event, verbosity);
        } else if (event.entityType === 'feature') {
          timeline += this.formatFeature(event, verbosity);
        }
      }

      timeline += '\n';
    }

    return timeline;
  }

  private generateNarrative(entities: Entity[], verbosity: string): string {
    // AI-powered narrative generation
    // Use Claude/GPT to convert structured data into flowing text

    const structuredData = this.structureForNarrative(entities);

    const prompt = `
Given the following project activities, generate a clear narrative story:

${JSON.stringify(structuredData, null, 2)}

Generate a ${verbosity} narrative that explains:
- What was accomplished
- How the work progressed
- Key decisions made
- Current status

Use natural language, past tense, and maintain chronological flow.
`;

    // Send to Claude for narrative generation
    return this.generateWithAI(prompt);
  }

  private generateSummary(entities: Entity[]): string {
    // Calculate statistics
    const stats = this.calculateStatistics(entities);

    return `
📊 Work Summary

Projects: ${stats.projects.length}
${stats.projects.map(p => `  • ${p.name} (${p.duration})`).join('\n')}

Accomplishments:
${stats.features.completed.map(f => `  ✅ ${f}`).join('\n')}
${stats.features.inProgress.map(f => `  🚧 ${f}`).join('\n')}

Statistics:
  • Sessions: ${stats.sessions}
  • Duration: ${stats.totalDuration}
  • Files modified: ${stats.filesModified}
  • Commits: ${stats.commits}
    `;
  }
}
```

## 🔌 Claude Code Integration

### Usage Examples

```typescript
// In Claude Code conversation:

User: "What did I work on yesterday?"

// Claude Code calls:
const story = await smartAgents.projectMemory.getStory({
  timeRange: "yesterday",
  format: "narrative",
  verbosity: "detailed"
});

// Response:
// "Yesterday you worked on the smart-agents project for 4 hours.
//  You implemented the Git Assistant feature, which involved..."

// ─────────────────────────────────────────────────────────

User: "Show me all projects I worked on last week"

// Claude Code calls:
const story = await smartAgents.projectMemory.getStory({
  timeRange: "last-week",
  format: "summary"
});

// Response:
// "Last week you worked on 3 projects:
//  - smart-agents (12 hours)
//  - personal-website (3 hours)
//  - data-analysis (5 hours)
//  ..."

// ─────────────────────────────────────────────────────────

User: "Tell me about the Git Assistant feature"

// Claude Code calls:
const story = await smartAgents.projectMemory.getStory({
  search: "Git Assistant feature",
  format: "narrative"
});

// Response:
// "The Git Assistant feature was developed on December 31st.
//  The implementation took 2.5 hours and involved creating..."
```

## 📁 File Structure

```
src/
├── memory/
│   ├── ProjectMemoryManager.ts     // Main manager
│   ├── ProjectStoryGenerator.ts    // Story generation
│   ├── AutoTracker.ts              // Automatic tracking hooks
│   └── types.ts                    // TypeScript types
│
├── integrations/
│   └── ProjectMemoryIntegration.ts // Claude Code integration
│
└── templates/
    └── story-templates.ts          // Story formatting templates
```

## 🚀 Implementation Plan

### Phase 1: Core Infrastructure
1. ✅ Design data model (Entity types, Relations)
2. ⬜ Implement ProjectMemoryManager
3. ⬜ Implement AutoTracker hooks
4. ⬜ Test with manual tracking

### Phase 2: Story Generation
1. ⬜ Implement ProjectStoryGenerator
2. ⬜ Create story templates (timeline, narrative, summary)
3. ⬜ Integrate AI-powered narrative generation
4. ⬜ Test story generation with sample data

### Phase 3: Integration
1. ⬜ Integrate with Git Assistant hooks
2. ⬜ Create Claude Code integration API
3. ⬜ Add automatic cleanup (30-day retention)
4. ⬜ Add configuration options

### Phase 4: Polish
1. ⬜ Add comprehensive examples
2. ⬜ Write documentation
3. ⬜ Create user guide
4. ⬜ Performance optimization

## 🎯 Success Metrics

- ✅ Automatically tracks all project activities
- ✅ Retains 30 days of history
- ✅ Generates clear, readable stories
- ✅ Claude Code can query memories easily
- ✅ Zero configuration required (uses existing Knowledge Graph)
- ✅ Fast query response (< 1 second)
- ✅ Natural language queries work

## 📚 References

- MCP Memory Documentation
- Knowledge Graph Best Practices
- Semantic Search Techniques
- AI Narrative Generation
