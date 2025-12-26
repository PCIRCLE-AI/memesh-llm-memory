# Specialized Agent Teams - Smart Agents V2

> V2 Month 2-3 實作：4 個專業團隊協作框架

## 概述

Smart Agents V2 包含 **5 個專業團隊**，每個團隊專注於特定領域的任務：

1. **System Architecture Team** ✅ (Month 1 已完成)
2. **Code Development Team** ✅ (代碼開發)
3. **Research & Analysis Team** ✅ (研究分析)
4. **Quality Assurance Team** ✅ (品質保證)
5. **Orchestration & Optimization Team** ✅ (編排優化)

## 團隊詳情

### 1. Code Development Team - 代碼開發團隊

**職責**：
- 代碼審查 (Code Review)
- 安全審計 (Security Audit)
- 性能分析 (Performance Analysis)

**核心能力**：
- `code-review` - 全面代碼審查
- `security-audit` - 安全漏洞檢測
- `performance-analysis` - 性能優化建議

**使用場景**：
```typescript
import { createCodeDevelopmentTeam, CODE_DEV_TEAM_USE_CASES } from './teams';

// 代碼審查
CODE_DEV_TEAM_USE_CASES.code_review // 基本代碼審查

// 安全審計
CODE_DEV_TEAM_USE_CASES.security_audit // 安全審計

// 性能優化
CODE_DEV_TEAM_USE_CASES.performance_optimization // 性能優化分析

// 全面審查
CODE_DEV_TEAM_USE_CASES.comprehensive_review // 安全+性能+品質
```

**預估成本**: $0.10 - $0.15
**預估時間**: 15-20秒

---

### 2. Research & Analysis Team - 研究分析團隊

**職責**：
- 技術調研
- 競品分析
- 最佳實踐研究

**核心能力**：
- `technical-research` - 技術框架/工具調研
- `competitive-analysis` - 競品功能分析
- `best-practices` - 行業最佳實踐

**使用場景**：
```typescript
import { createResearchAnalysisTeam, RESEARCH_TEAM_USE_CASES } from './teams';

// 技術評估
RESEARCH_TEAM_USE_CASES.technology_evaluation // 框架選型

// 市場調研
RESEARCH_TEAM_USE_CASES.market_research // 市場趨勢

// 最佳實踐
RESEARCH_TEAM_USE_CASES.best_practices_research // 行業標準

// 競品分析
RESEARCH_TEAM_USE_CASES.competitive_intelligence // 競品特性
```

**預估成本**: $0.07 - $0.09
**預估時間**: 10-15秒

---

### 3. Quality Assurance Team - 品質保證團隊

**職責**：
- 代碼品質檢查
- 安全漏洞掃描
- 性能測試

**核心能力**：
- `code-review` - 代碼品質審查
- `security-audit` - 安全測試
- `performance-analysis` - 性能分析

**使用場景**：
```typescript
import { createQualityAssuranceTeam, QA_TEAM_USE_CASES } from './teams';

// 全面品質檢查
QA_TEAM_USE_CASES.comprehensive_qa // 安全+性能+品質

// 安全審計
QA_TEAM_USE_CASES.security_audit // 安全漏洞檢測

// 性能測試
QA_TEAM_USE_CASES.performance_testing // 性能分析

// 發布前檢查
QA_TEAM_USE_CASES.pre_release_check // 上線前驗證
```

**預估成本**: $0.10 - $0.15
**預估時間**: 15-22秒

---

### 4. Orchestration & Optimization Team - 編排優化團隊

**職責**：
- 系統架構分析
- 優化方案建議
- 成本與性能監控

**核心能力**：
- `analyze_architecture` - 架構分析
- `suggest_improvements` - 改進建議

**使用場景**：
```typescript
import { createOrchestrationTeam, ORCHESTRATION_TEAM_USE_CASES } from './teams';

// 架構分析
ORCHESTRATION_TEAM_USE_CASES.architecture_analysis // 系統架構分析

// 改進建議
ORCHESTRATION_TEAM_USE_CASES.improvement_suggestions // 優化建議

// 架構審查
ORCHESTRATION_TEAM_USE_CASES.architecture_review // 全面架構審查

// 優化規劃
ORCHESTRATION_TEAM_USE_CASES.optimization_planning // 優化方案
```

**預估成本**: $0.07 - $0.10
**預估時間**: 10-14秒

---

## 快速開始

### 創建單個團隊

```typescript
import { MessageBus } from './collaboration/MessageBus';
import { TeamCoordinator } from './collaboration/TeamCoordinator';
import {
  createCodeDevelopmentTeam,
  createResearchAnalysisTeam,
  createQualityAssuranceTeam,
  createOrchestrationTeam,
} from './teams';

const messageBus = new MessageBus();
const teamCoordinator = new TeamCoordinator(messageBus);

// 創建代碼開發團隊
const codingTeam = createCodeDevelopmentTeam({ teamCoordinator });

// 創建研究分析團隊
const researchTeam = createResearchAnalysisTeam({ teamCoordinator });

// 創建品質保證團隊
const qaTeam = createQualityAssuranceTeam({ teamCoordinator });

// 創建編排優化團隊
const orchestrationTeam = createOrchestrationTeam({ teamCoordinator });
```

### 創建所有團隊

```typescript
import { createAllTeams } from './teams';

const teams = await createAllTeams({ teamCoordinator });

console.log(teams.codeDevelopment);
console.log(teams.researchAnalysis);
console.log(teams.qualityAssurance);
console.log(teams.orchestration);
```

### 執行協作任務

```typescript
import type { CollaborativeTask } from './collaboration/types';

// 定義任務
const task: CollaborativeTask = {
  id: 'task-1',
  description: 'Review authentication code for security issues',
  requiredCapabilities: ['code-review', 'security-audit'],
  status: 'pending',
};

// 讓 TeamCoordinator 自動選擇合適的團隊
const selectedTeam = teamCoordinator.selectTeamForTask(task);

// 執行任務
const session = await teamCoordinator.executeCollaborativeTask(task);

console.log('Task completed:', session.results);
```

---

## 團隊選擇指南

使用 `TEAM_SELECTION_GUIDE` 自動推薦團隊：

```typescript
import { TEAM_SELECTION_GUIDE } from './teams';

// 新功能開發
TEAM_SELECTION_GUIDE['feature-development']
// → primaryTeam: 'codeDevelopment', supportTeams: ['qualityAssurance']

// 技術調研
TEAM_SELECTION_GUIDE['technical-research']
// → primaryTeam: 'researchAnalysis', supportTeams: []

// 性能優化
TEAM_SELECTION_GUIDE['performance-optimization']
// → primaryTeam: 'orchestration', supportTeams: ['codeDevelopment', 'qualityAssurance']

// 安全審計
TEAM_SELECTION_GUIDE['security-audit']
// → primaryTeam: 'qualityAssurance', supportTeams: ['codeDevelopment']

// 成本優化
TEAM_SELECTION_GUIDE['cost-optimization']
// → primaryTeam: 'orchestration', supportTeams: []

// 代碼重構
TEAM_SELECTION_GUIDE['code-refactoring']
// → primaryTeam: 'codeDevelopment', supportTeams: ['qualityAssurance']

// 競品分析
TEAM_SELECTION_GUIDE['competitive-analysis']
// → primaryTeam: 'researchAnalysis', supportTeams: []

// 發布前驗證
TEAM_SELECTION_GUIDE['pre-release-validation']
// → primaryTeam: 'qualityAssurance', supportTeams: ['codeDevelopment', 'orchestration']
```

---

## 團隊協作範例

### 範例 1: 全棧功能開發流程

```typescript
// 1. 研究最佳實踐
const researchTask: CollaborativeTask = {
  id: 'research-auth',
  description: 'Research best authentication practices',
  requiredCapabilities: ['technical-research', 'best-practices'],
  status: 'pending',
};
await teamCoordinator.executeCollaborativeTask(researchTask);

// 2. 代碼審查
const reviewTask: CollaborativeTask = {
  id: 'review-auth',
  description: 'Review authentication implementation',
  requiredCapabilities: ['code-review', 'security-audit'],
  status: 'pending',
};
await teamCoordinator.executeCollaborativeTask(reviewTask);

// 3. 品質檢查
const qaTask: CollaborativeTask = {
  id: 'qa-auth',
  description: 'QA authentication module',
  requiredCapabilities: ['security-audit', 'performance-analysis'],
  status: 'pending',
};
await teamCoordinator.executeCollaborativeTask(qaTask);

// 4. 架構優化
const archTask: CollaborativeTask = {
  id: 'arch-auth',
  description: 'Optimize authentication architecture',
  requiredCapabilities: ['analyze_architecture', 'suggest_improvements'],
  status: 'pending',
};
await teamCoordinator.executeCollaborativeTask(archTask);
```

---

## 測試覆蓋

完整的測試套件確保團隊正常運作：

```bash
npm test -- src/teams/teams.test.ts
```

**測試覆蓋率**: 16/16 測試通過 ✅

---

## 架構設計

### 團隊組成

每個團隊由以下組成：
- **Leader**: 團隊領導者（一個 agent）
- **Members**: 團隊成員（目前每個團隊 1 個專業 agent）
- **Capabilities**: 團隊能力集合（來自所有成員）
- **Domain**: 專業領域標籤
- **Expertise**: 專長列表

### 能力匹配

TeamCoordinator 會根據任務需求的 `requiredCapabilities` 自動選擇最合適的團隊：

```typescript
const matchScore = matchedCapabilities.length / requiredCapabilities.length;

// 匹配度 ≥ 50% 才會選擇該團隊
if (matchScore >= 0.5) {
  return team;
}
```

### 子任務分解

TeamCoordinator 會自動將任務分解為子任務並分配給團隊成員：

1. 分析 capability 之間的依賴關係
2. 為每個 capability 創建一個 subtask
3. 根據負載均衡分配給成員
4. 並行執行所有準備好的 subtasks

---

## 成本優化

團隊使用 Claude Sonnet 4.5 API，成本已高度優化：

- **Code Development**: ~$0.10-0.15 / 任務
- **Research**: ~$0.07-0.09 / 任務
- **QA**: ~$0.10-0.15 / 任務
- **Orchestration**: ~$0.07-0.10 / 任務

**月度預算**（中等使用）：
- 每日 5-10 個任務 = ~$20-40 / 月
- 結合 Ollama 本地模型可進一步降低成本 40%

---

## 已完成

1. ✅ **4 個專業團隊實作** (2025-12-26)
2. ✅ **Self-Evolving Agent 機制** (2025-12-26 - 詳見 EVOLUTION.md)
3. ✅ **完整文檔** (README.md, TEAMS.md, EVOLUTION.md)

## 未來計劃

1. 性能優化與基準測試
2. 本地模型整合 (Ollama)
3. 更多專業團隊（根據需求擴展）

---

**文檔版本**: V2.0
**最後更新**: 2025-12-26
