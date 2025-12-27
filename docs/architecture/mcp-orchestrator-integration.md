# MCP Session Orchestrator Integration with Smart-Agents

## Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Main Agent (CLI - Claude Sonnet 4.5)                       │
│  • 和用戶對話                                                  │
│  • 拆解任務                                                    │
│  • 監督子代理輸出                                              │
│  • 接收 orchestrator 的提醒和建議                              │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ MCP Protocol
               │
               ├─────────────────────────────────────────────┐
               │                                             │
               ▼                                             ▼
┌──────────────────────────────┐         ┌──────────────────────────────┐
│  Subagents (專門角色)         │         │  Session Orchestrator        │
│                              │         │  (背景子代理)                 │
│  • research-agent            │         │                              │
│  • impl-agent                │         │  ├─ 背景監控主對話             │
│  • test-agent                │         │  │  - 追蹤工具使用              │
│  • code-reviewer             │         │  │  - 偵測違規                 │
│  • debugger                  │         │  │  - 記錄決策                 │
│  • ...                       │         │  │                            │
│                              │         │  ├─ 定時任務                  │
│  背景執行 (Task tool)          │         │  │  - 每小時注入 CLAUDE.md     │
│  完成後回灌結果                │         │  │  - 每30分鐘更新記憶         │
│                              │         │  │  - 定期合規檢查             │
└──────────────────────────────┘         │  │                            │
                                         │  └─ 主動提醒                  │
                                         │     - 發現違規時提醒           │
                                         │     - 該載入 guide 時建議      │
                                         │     - 該更新記憶時提醒         │
                                         │                              │
                                         └──────────────────────────────┘
```

## 運作流程

### 1. Session 啟動

```typescript
// 用戶啟動 Claude Code session
$ claude chat

// Main Agent 自動呼叫 Session Orchestrator MCP
await mcp.tools.call('session_start', {
  projectPath: process.cwd(),
  config: {
    claudeMdInterval: 60,      // 每小時注入 CLAUDE.md
    memoryInterval: 30,         // 每30分鐘更新記憶
    autoLoadGuides: true        // 自動載入相關 guides
  }
});

// Session Orchestrator 開始背景監控
// (作為背景子代理持續運行)
```

### 2. 主對話進行中

```
User: "幫我重構這個 API endpoint"

Main Agent (我):
  1. 理解任務
  2. 拆解步驟
  3. 啟動專門子代理

  // 啟動 impl-agent 在背景執行
  Task tool → impl-agent
    - System prompt: 專精於實作
    - Tools: Read, Write, Edit, Bash
    - Context: API endpoint 相關檔案

  // 同時，Session Orchestrator 持續在背景運行
  Session Orchestrator (背景子代理):
    ✓ 監控 Main Agent 的工具使用
    ✓ 追蹤檔案修改
    ✓ 偵測是否違反 CLAUDE.md 規則
    ✓ 計時器：距離上次 CLAUDE.md 注入已 55 分鐘

Main Agent: "impl-agent 正在背景實作，讓我先檢查現有代碼..."
  (繼續和用戶對話，不被背景任務阻塞)
```

### 3. 定時提醒 (1小時後)

```
// Session Orchestrator 偵測到時間到了
Session Orchestrator → Main Agent:
  {
    type: "reminder",
    priority: "high",
    message: "📋 CLAUDE.md Reminder (已過 1 小時)",
    content: {
      sections: [
        "Anti-Hallucination Protocol",
        "Fix All Issues",
        "Proactive Issue Resolution"
      ],
      summary: "記得：READ BEFORE EDIT、RUN BEFORE CLAIM、FIX ALL ISSUES"
    }
  }

// Main Agent 收到提醒，內化規則
// (不需要向用戶展示，silent injection)
```

### 4. 違規偵測與提醒

```
// Main Agent 不小心違規
Main Agent: "這個檔案應該包含 validateInput 函數..."
  (假設內容，未實際讀取檔案)

// Session Orchestrator 立即偵測
Session Orchestrator → Main Agent:
  {
    type: "violation",
    severity: "critical",
    rule: "Anti-Hallucination Protocol - READ BEFORE EDIT",
    description: "You assumed file content without reading it first",
    suggestion: "Use Read tool to verify actual content",
    action: "stop_and_read"
  }

// Main Agent 收到警告，自我修正
Main Agent: "抱歉，讓我先讀取檔案確認實際內容..."
  [使用 Read tool]
```

### 5. 自動記憶更新 (30分鐘)

```
// Session Orchestrator 定時更新記憶
Session Orchestrator (背景執行):
  1. 收集過去30分鐘的 session state:
     - 工具使用記錄
     - 檔案修改
     - 重要決策
     - 違規事件

  2. 創建 Knowledge Graph 實體:
     await mcp.memory.createEntities({
       entities: [
         {
           name: "API Refactoring Session 2025-12-27",
           type: "session_progress",
           observations: [
             "重構了 3 個 API endpoints",
             "修復了 2 個安全漏洞",
             "新增了 15 個單元測試",
             "違規 1 次：未讀檔案就假設內容（已修正）"
           ]
         }
       ]
     });

  3. 建立關聯:
     - Session → Decisions
     - Session → Violations
     - Session → Files Modified

// Main Agent 和用戶持續對話，完全不受影響
// (背景完成，無需打斷)
```

### 6. 子代理完成，回灌結果

```
// impl-agent 完成背景任務
impl-agent → Main Agent:
  {
    status: "completed",
    summary: "API endpoint 重構完成",
    changes: [
      "src/api/user.ts: 重構 getUserById",
      "src/api/user.test.ts: 新增 20 個測試",
      "src/types/user.ts: 更新型別定義"
    ],
    testsRun: "35/35 passed ✓"
  }

// Session Orchestrator 同時記錄這個完成事件
Session Orchestrator:
  await mcp.memory.addObservation({
    entity: "API Refactoring Session 2025-12-27",
    observation: "impl-agent 成功完成重構，所有測試通過"
  });

// Main Agent 向用戶報告
Main Agent: "✅ API endpoint 重構完成！
  - 3 個檔案已修改
  - 35/35 測試通過
  - 已自動記錄到知識圖譜"
```

## 關鍵特性

### 1. 非阻塞 (Non-blocking)

Session Orchestrator 作為**背景子代理**，完全不阻塞主對話：

```typescript
// ❌ 錯誤方式：阻塞主對話
Main Agent: "等我先注入 CLAUDE.md..."
  [等待 5 秒]
Main Agent: "好了，現在可以繼續..."

// ✅ 正確方式：背景處理
Main Agent: "我正在分析這個問題..."
  (同時 Session Orchestrator 在背景注入 CLAUDE.md)
Main Agent: "分析完成，建議採用 Strategy Pattern..."
  (CLAUDE.md 已靜默注入，規則已內化)
```

### 2. 主動監督 (Proactive Monitoring)

Session Orchestrator 主動偵測問題：

```typescript
// 監控工具使用模式
if (toolCall === 'Edit' && !recentToolCalls.includes('Read')) {
  // 違反 "READ BEFORE EDIT" 規則
  sendViolationAlert({
    rule: 'READ_BEFORE_EDIT',
    severity: 'critical'
  });
}

// 監控時間間隔
if (timeSinceLastMemoryUpdate > 30 * 60 * 1000) {
  // 超過 30 分鐘未更新記憶
  updateMemoryAutomatically();
}

// 監控合規性
if (complianceScore < 75) {
  // 合規分數過低
  suggestGuideLoading(['systematic-debugging', 'anti-hallucination']);
}
```

### 3. 智能注入 (Smart Injection)

只注入相關的 CLAUDE.md 段落：

```typescript
// 偵測到正在做前端工作
if (currentFiles.some(f => f.includes('frontend'))) {
  injectClaudeMdSections([
    'Frontend Design',
    'UI/UX Guidelines',
    'Accessibility Standards'
  ]);
}

// 偵測到準備 commit
if (recentToolCalls.includes('git add')) {
  injectClaudeMdSections([
    'DevOps and Version Control',
    'Commit Message Standards',
    'Pre-commit Checklist'
  ]);
}

// 偵測到違規次數增加
if (violationsInLast10Min > 3) {
  // 強制注入完整 CLAUDE.md
  injectClaudeMdSections(['all']);
}
```

## 實作細節

### Session Orchestrator 作為 MCP Server

```typescript
// src/mcp-session-orchestrator/index.ts

class SessionOrchestrator {
  private sessions: Map<string, Session> = new Map();
  private backgroundTasks: Map<string, NodeJS.Timer> = new Map();

  async initialize() {
    // 啟動 MCP server
    const server = new Server({
      name: 'smart-agents-orchestrator',
      version: '1.0.0'
    });

    // 註冊工具
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'session_start',
          description: 'Start session monitoring',
          inputSchema: { /* ... */ }
        },
        {
          name: 'inject_claudemd',
          description: 'Inject CLAUDE.md sections',
          inputSchema: { /* ... */ }
        },
        {
          name: 'update_memory',
          description: 'Update MCP Memory with session state',
          inputSchema: { /* ... */ }
        },
        {
          name: 'check_compliance',
          description: 'Check guideline compliance',
          inputSchema: { /* ... */ }
        }
      ]
    }));

    // 註冊工具執行
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'session_start':
          return this.handleSessionStart(request.params.arguments);
        case 'inject_claudemd':
          return this.handleInjectClaudeMd(request.params.arguments);
        // ...
      }
    });

    // 啟動 server
    await server.connect(process.stdin, process.stdout);
  }

  private async handleSessionStart(args: SessionStartInput) {
    const sessionId = args.sessionId || generateSessionId();
    const session = new Session(sessionId, args);

    // 儲存 session
    this.sessions.set(sessionId, session);

    // 啟動背景定時任務
    this.startBackgroundTasks(session);

    // 載入初始 context
    await this.loadInitialContext(session);

    return {
      sessionId,
      startTime: new Date().toISOString(),
      config: session.config,
      loadedGuides: session.loadedGuides
    };
  }

  private startBackgroundTasks(session: Session) {
    // 1. CLAUDE.md 注入定時器
    const claudeMdTimer = setInterval(async () => {
      await this.injectClaudeMd(session);
    }, session.config.claudeMdInterval * 60 * 1000);

    // 2. 記憶更新定時器
    const memoryTimer = setInterval(async () => {
      await this.updateMemory(session);
    }, session.config.memoryInterval * 60 * 1000);

    // 3. 合規檢查定時器 (每10分鐘)
    const complianceTimer = setInterval(async () => {
      const result = await this.checkCompliance(session);
      if (!result.compliant) {
        await this.sendComplianceAlert(session, result);
      }
    }, 10 * 60 * 1000);

    // 儲存定時器以便後續清理
    this.backgroundTasks.set(session.id, {
      claudeMd: claudeMdTimer,
      memory: memoryTimer,
      compliance: complianceTimer
    });
  }

  private async injectClaudeMd(session: Session) {
    // 讀取 CLAUDE.md
    const claudeMd = await fs.readFile(
      session.config.claudeMdPath,
      'utf-8'
    );

    // 根據 context 選擇相關段落
    const relevantSections = this.selectRelevantSections(
      session,
      claudeMd
    );

    // 透過 MCP 注入 (作為 resource 或 prompt)
    await this.injectContext(session, {
      type: 'claudemd_reminder',
      content: relevantSections,
      priority: 'high',
      timestamp: new Date().toISOString()
    });

    // 記錄注入
    session.lastClaudeMdInjection = new Date();
    await this.saveSession(session);
  }

  private async updateMemory(session: Session) {
    // 收集 session state
    const state = this.captureSessionState(session);

    // 創建 Knowledge Graph 實體
    const entities = this.buildMemoryEntities(state);

    // 透過 MCP Memory server 儲存
    await mcpMemoryClient.createEntities({ entities });

    // 創建關聯
    const relations = this.buildMemoryRelations(entities);
    await mcpMemoryClient.createRelations({ relations });

    // 記錄更新
    session.lastMemoryUpdate = new Date();
    await this.saveSession(session);
  }

  private async checkCompliance(session: Session): Promise<ComplianceResult> {
    const violations = [];

    // 檢查 "READ BEFORE EDIT" 規則
    const editCalls = session.toolCalls.filter(t => t.name === 'Edit');
    for (const edit of editCalls) {
      const priorReads = session.toolCalls.filter(
        t => t.name === 'Read' &&
             t.timestamp < edit.timestamp &&
             t.args.file_path === edit.args.file_path
      );

      if (priorReads.length === 0) {
        violations.push({
          rule: 'READ_BEFORE_EDIT',
          severity: 'critical',
          description: `Edited ${edit.args.file_path} without reading first`,
          timestamp: edit.timestamp
        });
      }
    }

    // 檢查 "RUN BEFORE CLAIM" 規則
    // ...

    // 檢查 "FIX ALL ISSUES" 規則
    // ...

    return {
      compliant: violations.length === 0,
      score: this.calculateComplianceScore(violations),
      violations
    };
  }
}

// 啟動 MCP server
new SessionOrchestrator().initialize();
```

### Main Agent 整合

```typescript
// Claude Code 內部自動呼叫

// 1. Session 啟動時
async function onSessionStart() {
  const result = await mcp.callTool('smart-agents-orchestrator', 'session_start', {
    projectPath: process.cwd(),
    config: loadUserConfig()
  });

  console.log(`Session ${result.sessionId} started`);
  console.log(`Loaded guides: ${result.loadedGuides.join(', ')}`);
}

// 2. 監聽 MCP notifications (背景提醒)
mcp.on('notification', (notification) => {
  if (notification.method === 'orchestrator/reminder') {
    // Session Orchestrator 發送的提醒
    injectContextToAgent(notification.params.content);
  }

  if (notification.method === 'orchestrator/violation') {
    // 違規警告
    handleViolationAlert(notification.params);
  }
});

// 3. Session 結束時
async function onSessionEnd() {
  const report = await mcp.callTool('smart-agents-orchestrator', 'session_end', {
    sessionId: currentSessionId,
    saveReport: true
  });

  console.log(`Session ended. Duration: ${report.duration} minutes`);
  console.log(`Report saved to: ${report.reportPath}`);
}
```

## 優勢總結

1. **完全非阻塞**：背景運行，不干擾主對話
2. **主動監督**：自動偵測違規，即時提醒
3. **自動記憶**：定時更新知識圖譜，無需手動
4. **智能提醒**：根據 context 注入相關 CLAUDE.md 段落
5. **持續學習**：違規記錄供未來改進
6. **無縫整合**：作為 MCP server，與 Claude Code 深度整合

這正是 smart-agents 的**背景子代理**能力的完美應用！
