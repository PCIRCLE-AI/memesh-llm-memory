# Self-Evolving Agent System

> V2 Month 2-3 Feature: Autonomous Agent Learning and Adaptation

## 概述

Smart Agents V2 的 Self-Evolving Agent System 讓 AI agents 能夠從執行經驗中學習，自動識別成功模式，並動態調整行為以提升性能、品質和成本效益。

### V2.0 MCP Server Pattern 說明

**Evolution System 在 V2.0 中的運作方式**：

在 V2.0 MCP Server Pattern 中，smart-agents 作為 MCP server 生成 enhanced prompts 並返回給 Claude Code。Evolution System 的各項功能在 V2.0 的實際行為如下：

1. **Prompt Optimization** ✅ 完全支援
   - Evolution System 可以優化和調整 prompts
   - 生成的 enhanced prompts 直接包含優化建議

2. **Model Selection** ⚠️ 建議模式
   - Evolution System **建議**適合的模型（Opus/Sonnet/Haiku）
   - 建議包含在 enhanced prompt 的 metadata 中
   - **實際模型選擇由 Claude Code 或用戶決定**
   - V3.0 將支援直接模型選擇和執行

3. **Timeout Adjustment** ✅ 完全支援
   - Evolution System 可以調整 timeout 設定
   - 包含在返回的配置建議中

4. **Retry Strategy** ✅ 完全支援
   - Evolution System 可以建議 retry 策略
   - 包含在返回的配置建議中

**總結**：Evolution System 在 V2.0 中以「建議」和「prompt 優化」的形式運作，在 V3.0 中將擴展為直接執行能力。

### 核心理念

**Learn → Adapt → Improve → Repeat**

1. **Learn**: 從每次執行中收集性能數據
2. **Adapt**: 分析數據，識別成功與失敗模式
3. **Improve**: 應用學到的模式，調整 agent 行為
4. **Repeat**: 持續循環，實現持續改進

## 🏗️ 系統架構

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Execution Layer                    │
│  (CodeReviewAgent, ResearchAgent, ArchitectureAgent, etc.) │
└────────────────┬─────────────────────────────────┬──────────┘
                 │                                 │
                 ▼ track()                         ▼ execute with
         ┌──────────────────┐             ┌──────────────────┐
         │ Performance      │             │ Adaptation       │
         │ Tracker          │             │ Engine           │
         └────────┬─────────┘             └─────────┬────────┘
                  │                                  │
                  │ metrics                          │ patterns
                  │                                  │
                  ▼                                  ▼
         ┌──────────────────┐             ┌──────────────────┐
         │ Learning         │◄────────────┤ Stored           │
         │ Manager          │  analyze    │ Patterns         │
         └──────────────────┘             └──────────────────┘
```

## 📦 核心組件

### 1. PerformanceTracker

**職責**: 記錄並分析 agent 執行指標

**功能**:
- 追蹤執行時間、成本、品質分數、成功率
- 計算歷史與近期趨勢（success rate, cost efficiency, quality）
- 偵測性能異常（slow, expensive, low-quality, failure）
- 提供統計數據支持學習

**使用範例**:
```typescript
import { PerformanceTracker } from './evolution';

const tracker = new PerformanceTracker({
  maxMetricsPerAgent: 1000 // 每個 agent 最多保留 1000 筆記錄
});

// 追蹤執行結果
const metrics = tracker.track({
  agentId: 'code-review-agent',
  taskType: 'code-review',
  success: true,
  durationMs: 12000,
  cost: 0.05,
  qualityScore: 0.9,
});

// 獲取演化統計
const stats = tracker.getEvolutionStats('code-review-agent');
console.log(`Success rate improved by: ${stats.successRateTrend.improvement * 100}%`);

// 偵測異常
const anomaly = tracker.detectAnomalies('code-review-agent', metrics);
if (anomaly.isAnomaly) {
  console.log(`⚠️ ${anomaly.type}: ${anomaly.message}`);
}
```

**關鍵 API**:
- `track(metrics)` - 記錄執行指標
- `getMetrics(agentId, filter?)` - 檢索指標（可篩選）
- `getEvolutionStats(agentId)` - 計算演化趨勢
- `detectAnomalies(agentId, metric)` - 異常檢測
- `getAveragePerformance(agentId, taskType)` - 基準性能

---

### 2. LearningManager

**職責**: 從性能數據中提取模式與知識

**功能**:
- 識別成功模式（high quality, cost-efficient, fast execution）
- 識別反模式（timeout failures, low quality output）
- 發現優化機會（20% cost reduction with same quality）
- 整合用戶反饋
- 提供基於信心度的建議

**使用範例**:
```typescript
import { LearningManager } from './evolution';

const learner = new LearningManager(tracker, {
  minObservations: 10,      // 至少 10 次觀察才建立模式
  minConfidence: 0.6,       // 最低信心度 60%
  successRateThreshold: 0.7, // 成功率閾值 70%
  failureRateThreshold: 0.3, // 失敗率閾值 30%
  maxPatternsPerAgent: 100,  // 每個 agent 最多保留 100 個模式
});

// 分析並提取模式
const patterns = learner.analyzePatterns('code-review-agent');
console.log(`發現 ${patterns.length} 個新模式`);

patterns.forEach(pattern => {
  console.log(`
    類型: ${pattern.type}
    描述: ${pattern.description}
    信心度: ${(pattern.confidence * 100).toFixed(0)}%
    觀察次數: ${pattern.observationCount}
    成功率: ${(pattern.successRate * 100).toFixed(0)}%
  `);
});

// 獲取建議
const recommendations = learner.getRecommendations(
  'code-review-agent',
  'code-review',
  'medium' // task complexity
);

console.log(`建議應用 ${recommendations.length} 個模式`);
```

**Pattern 類型**:

1. **Success Pattern** (成功模式)
   - Consistent high quality (≥0.8)
   - Cost-efficient execution
   - Fast with high quality

2. **Anti-Pattern** (反模式)
   - Timeout failures
   - Low quality output
   - Excessive cost

3. **Optimization** (優化機會)
   - Cost reduction without quality loss
   - Speed improvement opportunities

**關鍵 API**:
- `analyzePatterns(agentId)` - 分析並提取模式
- `getPatterns(agentId, filter?)` - 檢索模式
- `getRecommendations(agentId, taskType, complexity?)` - 獲取建議
- `addFeedback(feedback)` - 添加用戶反饋
- `updatePattern(patternId, success)` - 更新模式信心度

---

### 3. AdaptationEngine

**職責**: 應用學到的模式，動態調整 agent 行為

**功能**:
- 4 種適應類型：prompt optimization, model selection, timeout adjustment, retry strategy
- 配置化的適應啟用控制
- 模式信心度驗證
- 適應效果追蹤
- 回饋循環

**使用範例**:
```typescript
import { AdaptationEngine } from './evolution';

const adapter = new AdaptationEngine(learner, tracker);

// 配置 agent 適應行為
adapter.configureAgent('code-review-agent', {
  agentId: 'code-review-agent',
  enabledAdaptations: {
    promptOptimization: true,  // 啟用 prompt 優化
    modelSelection: true,      // 啟用 model 選擇
    timeoutAdjustment: true,   // 啟用 timeout 調整
    retryStrategy: false,      // 禁用 retry 策略
  },
  learningRate: 0.1,        // 學習速率
  minConfidence: 0.7,       // 最低信心度
  minObservations: 10,      // 最少觀察次數
  maxPatterns: 100,         // 最多模式數量
});

// 執行任務前應用適應
const baseConfig = {
  model: 'claude-sonnet-4-5',
  maxTokens: 4000,
  timeout: 30000,
  systemPrompt: 'Review this code for potential issues.',
};

const adapted = await adapter.adaptExecution(
  'code-review-agent',
  'code-review',
  baseConfig
);

console.log('Original config:', adapted.originalConfig);
console.log('Adapted config:', adapted.adaptedConfig);
console.log('Applied patterns:', adapted.appliedPatterns);

// 執行任務...
const result = await executeTask(adapted.adaptedConfig);

// 提供反饋
await adapter.provideFeedback(
  adapted.appliedPatterns[0],
  {
    executionId: 'exec-123',
    agentId: 'code-review-agent',
    taskType: 'code-review',
    success: true,
    durationMs: 15000,
    cost: 0.04,
    qualityScore: 0.95,
    timestamp: new Date(),
  }
);

// 查看適應統計
const stats = adapter.getAdaptationStats('code-review-agent');
console.log(`
  總適應次數: ${stats.totalAdaptations}
  按類型分布: ${JSON.stringify(stats.byType, null, 2)}
  熱門模式: ${stats.topPatterns.slice(0, 3).map(p => p.patternId).join(', ')}
`);
```

**Adaptation 類型**:

1. **Prompt Optimization**
   - 策略: `efficient` (cost-focused) 或 `quality-focused`
   - 焦點領域: quality, cost-optimization, accuracy, consistency
   - 附加指示: 針對特定需求調整

2. **Model Selection**
   - 成本優化: Opus → Sonnet → Haiku
   - 品質優化: Haiku → Sonnet → Opus
   - 動態選擇: 根據任務複雜度和歷史表現

3. **Timeout Adjustment**
   - 根據 P95 duration 調整
   - 防止 timeout failures
   - 優化執行時間

4. **Retry Strategy**
   - 針對暫時性失敗
   - 指數退避策略
   - 最大重試次數限制

**關鍵 API**:
- `configureAgent(agentId, config)` - 配置 agent 適應行為
- `adaptExecution(agentId, taskType, baseConfig)` - 應用適應
- `provideFeedback(patternId, metrics)` - 提供反饋
- `getAdaptationStats(agentId)` - 查看適應統計
- `resetAdaptations(agentId)` - 重置適應
- `updateAdaptationConfig(agentId, updates)` - 更新配置

---

## 🔄 完整演化循環

以下展示一個完整的 agent 演化流程：

```typescript
import {
  PerformanceTracker,
  LearningManager,
  AdaptationEngine,
} from './evolution';

// ========================================
// Phase 1: 初始化系統
// ========================================
const tracker = new PerformanceTracker();
const learner = new LearningManager(tracker, {
  minObservations: 10,
  minConfidence: 0.6,
  successRateThreshold: 0.7,
});
const adapter = new AdaptationEngine(learner, tracker);

adapter.configureAgent('my-agent', {
  agentId: 'my-agent',
  enabledAdaptations: {
    promptOptimization: true,
    modelSelection: true,
    timeoutAdjustment: true,
  },
  learningRate: 0.1,
  minConfidence: 0.6,
  minObservations: 10,
  maxPatterns: 100,
});

// ========================================
// Phase 2: 初始執行 (建立基準)
// ========================================
for (let i = 0; i < 20; i++) {
  const result = await executeTask({
    model: 'claude-sonnet-4-5',
    maxTokens: 2000,
  });

  tracker.track({
    agentId: 'my-agent',
    taskType: 'analysis',
    success: result.success,
    durationMs: result.duration,
    cost: result.cost,
    qualityScore: result.quality,
  });
}

// ========================================
// Phase 3: 學習模式
// ========================================
const patterns = learner.analyzePatterns('my-agent');
console.log(`✓ 發現 ${patterns.length} 個模式`);

// ========================================
// Phase 4: 應用適應
// ========================================
const adapted = await adapter.adaptExecution(
  'my-agent',
  'analysis',
  { model: 'claude-sonnet-4-5', maxTokens: 2000 }
);

console.log(`✓ 應用了 ${adapted.appliedPatterns.length} 個模式`);

// ========================================
// Phase 5: 執行並記錄結果
// ========================================
const result = await executeTask(adapted.adaptedConfig);

const metrics = tracker.track({
  agentId: 'my-agent',
  taskType: 'analysis',
  success: result.success,
  durationMs: result.duration,
  cost: result.cost,
  qualityScore: result.quality,
});

// ========================================
// Phase 6: 提供反饋
// ========================================
if (adapted.appliedPatterns.length > 0) {
  await adapter.provideFeedback(adapted.appliedPatterns[0], metrics);
}

// ========================================
// Phase 7: 驗證改進
// ========================================
const stats = tracker.getEvolutionStats('my-agent');
console.log(`
  成功率改進: ${(stats.successRateTrend.improvement * 100).toFixed(1)}%
  成本效率改進: ${(stats.costEfficiencyTrend.improvement * 100).toFixed(1)}%
  品質改進: ${(stats.qualityScoreTrend.improvement * 100).toFixed(1)}%
`);
```

---

## 🎯 使用場景

### 場景 1: 成本優化

**問題**: Agent 執行成本過高

**解決方案**:
```typescript
// 系統會自動識別「高品質低成本」的執行模式
// 並建議切換到更經濟的 model 或優化 prompt

const patterns = learner.getPatterns('expensive-agent', {
  type: 'optimization'
});

// 找到成本優化機會
const costPattern = patterns.find(p =>
  p.description.includes('cost reduction')
);

if (costPattern) {
  console.log(`
    發現成本優化機會:
    - 預期降低成本: ${costPattern.action.parameters.targetCostReduction * 100}%
    - 維持品質: ≥${costPattern.action.parameters.minQualityScore}
  `);
}
```

### 場景 2: 品質改進

**問題**: Agent 輸出品質不穩定

**解決方案**:
```typescript
// 系統會識別低品質輸出的反模式
// 並建議調整 prompt 為品質優先策略

const antiPatterns = learner.getPatterns('inconsistent-agent', {
  type: 'anti-pattern'
});

const qualityIssue = antiPatterns.find(p =>
  p.description.includes('low quality')
);

if (qualityIssue) {
  // 系統會自動應用 'quality-focused' strategy
  adapter.configureAgent('inconsistent-agent', {
    enabledAdaptations: {
      promptOptimization: true,
      modelSelection: true, // 可能升級到更強的 model
    },
  });
}
```

### 場景 3: 性能調優

**問題**: Agent 執行時間過長，經常 timeout

**解決方案**:
```typescript
// 系統會偵測 timeout 模式並調整 timeout 設定
const anomalies = [];

for (const metric of tracker.getMetrics('slow-agent')) {
  const anomaly = tracker.detectAnomalies('slow-agent', metric);
  if (anomaly.type === 'slow') {
    anomalies.push(anomaly);
  }
}

if (anomalies.length > 5) {
  console.log('⚠️ 檢測到多次慢執行');

  // 系統會自動建議增加 timeout
  const patterns = learner.analyzePatterns('slow-agent');
  const timeoutPattern = patterns.find(p =>
    p.action.type === 'modify_timeout'
  );

  if (timeoutPattern) {
    console.log(`建議 timeout: ${timeoutPattern.action.parameters.timeoutMs}ms`);
  }
}
```

---

## 📊 性能指標

### 追蹤的指標

| 指標 | 說明 | 用途 |
|------|------|------|
| **executionId** | 執行唯一 ID | 追蹤單次執行 |
| **success** | 是否成功 | 計算成功率 |
| **durationMs** | 執行時間 (ms) | 偵測慢執行 |
| **cost** | 成本 (USD) | 成本優化 |
| **qualityScore** | 品質分數 (0-1) | 品質改進 |
| **userSatisfaction** | 用戶滿意度 (0-1) | 用戶反饋 |
| **timestamp** | 時間戳 | 趨勢分析 |

### 演化趨勢

系統會計算以下趨勢（歷史 vs 近期）：

1. **Success Rate Trend**
   - Historical: 歷史成功率
   - Recent: 近期成功率 (default: 7 天)
   - Improvement: 改進幅度

2. **Cost Efficiency Trend**
   - Formula: `qualityScore / cost`
   - 衡量單位成本的品質產出

3. **Quality Score Trend**
   - 平均品質分數變化
   - 識別品質提升或下降

---

## ⚙️ 配置選項

### PerformanceTracker 配置

```typescript
const tracker = new PerformanceTracker({
  maxMetricsPerAgent: 1000  // 每個 agent 最多保留多少筆記錄（FIFO）
});
```

### LearningManager 配置

```typescript
const learner = new LearningManager(tracker, {
  minObservations: 10,           // 最少觀察次數才建立模式
  minConfidence: 0.6,            // 最低信心度閾值 (0-1)
  successRateThreshold: 0.7,     // 成功模式的最低成功率
  failureRateThreshold: 0.3,     // 反模式的最低失敗率
  maxPatternsPerAgent: 100       // 每個 agent 最多保留多少模式
});
```

### AdaptationEngine 配置

```typescript
adapter.configureAgent('agent-id', {
  agentId: 'agent-id',
  enabledAdaptations: {
    promptOptimization: true,    // 是否啟用 prompt 優化
    modelSelection: true,        // 是否啟用 model 選擇
    timeoutAdjustment: true,     // 是否啟用 timeout 調整
    retryStrategy: false         // 是否啟用 retry 策略
  },
  learningRate: 0.1,             // 學習速率 (0-1)
  minConfidence: 0.6,            // 應用模式的最低信心度
  minObservations: 10,           // 應用模式的最少觀察次數
  maxPatterns: 100               // 最多保留多少模式
});
```

---

## 🔍 除錯與監控

### 查看演化統計

```typescript
const stats = tracker.getEvolutionStats('agent-id');

console.log(`
📊 Agent Evolution Stats
========================
Agent ID: ${stats.agentId}
Total Executions: ${stats.totalExecutions}

Success Rate:
  Historical: ${(stats.successRateTrend.historical * 100).toFixed(1)}%
  Recent: ${(stats.successRateTrend.recent * 100).toFixed(1)}%
  Improvement: ${(stats.successRateTrend.improvement * 100).toFixed(1)}%

Cost Efficiency:
  Historical: ${stats.costEfficiencyTrend.historical.toFixed(2)}
  Recent: ${stats.costEfficiencyTrend.recent.toFixed(2)}
  Improvement: ${(stats.costEfficiencyTrend.improvement * 100).toFixed(1)}%

Quality Score:
  Historical: ${(stats.qualityScoreTrend.historical * 100).toFixed(1)}%
  Recent: ${(stats.qualityScoreTrend.recent * 100).toFixed(1)}%
  Improvement: ${(stats.qualityScoreTrend.improvement * 100).toFixed(1)}%

Learned Patterns: ${stats.learnedPatterns}
Applied Adaptations: ${stats.appliedAdaptations}
Last Learning: ${stats.lastLearningDate.toISOString()}
`);
```

### 查看適應統計

```typescript
const adaptStats = adapter.getAdaptationStats('agent-id');

console.log(`
🔧 Adaptation Stats
===================
Total Adaptations: ${adaptStats.totalAdaptations}

By Type:
${Object.entries(adaptStats.byType).map(([type, count]) =>
  `  ${type}: ${count}`
).join('\n')}

Top Patterns:
${adaptStats.topPatterns.slice(0, 5).map((p, i) =>
  `  ${i + 1}. Pattern ${p.patternId.slice(0, 8)}: ${p.count} times`
).join('\n')}
`);
```

### 查看模式詳情

```typescript
const patterns = learner.getPatterns('agent-id');

patterns.forEach(pattern => {
  console.log(`
Pattern: ${pattern.id}
==================
Type: ${pattern.type}
Description: ${pattern.description}
Task Type: ${pattern.taskType}
Complexity: ${pattern.conditions.taskComplexity}

Action:
  Type: ${pattern.action.type}
  Parameters: ${JSON.stringify(pattern.action.parameters, null, 2)}

Stats:
  Confidence: ${(pattern.confidence * 100).toFixed(1)}%
  Observations: ${pattern.observationCount}
  Success Rate: ${(pattern.successRate * 100).toFixed(1)}%

Created: ${pattern.createdAt.toISOString()}
Updated: ${pattern.updatedAt.toISOString()}
  `);
});
```

---

## 💡 最佳實踐

### 1. 數據收集

- **足夠的樣本**: 至少 20+ 次執行才能可靠地建立模式
- **多樣性**: 確保覆蓋不同 task complexity 和場景
- **準確標記**: qualityScore 應準確反映實際品質

### 2. Pattern 管理

- **定期審查**: 檢查學到的 patterns 是否合理
- **清理無效**: 刪除低成功率或過時的 patterns
- **調整閾值**: 根據實際情況調整 minConfidence 和 minObservations

### 3. Adaptation 控制

- **漸進式**: 先啟用部分 adaptations，觀察效果後再啟用更多
- **A/B Testing**: 對比啟用/禁用 adaptation 的效果
- **監控回退**: 如果適應導致性能下降，及時回退

### 4. 性能優化

- **限制存儲**: 設定合理的 maxMetricsPerAgent 和 maxPatterns
- **定期清理**: 清除舊的或無效的 patterns
- **批量分析**: 定期批量分析 patterns，而非每次執行都分析

---

## 🚨 注意事項

### 1. 信心度閾值

- **過高** (>0.8): 可能錯失有效 patterns
- **過低** (<0.5): 可能應用不可靠 patterns
- **建議**: 0.6-0.7 為合理範圍

### 2. 樣本大小

- **過少** (<10): patterns 不可靠
- **過多** (>1000): 可能包含過時數據
- **建議**: 保留最近 1000 筆即可

### 3. Adaptation 衝突

- 多個 patterns 可能建議不同的 adaptations
- 系統會按信心度排序，優先應用高信心度 patterns
- 如果衝突嚴重，考慮禁用部分 adaptations

### 4. Cold Start

- 新 agent 沒有歷史數據時無法建立 patterns
- 建議先執行 20+ 次累積基準數據
- 或從類似 agent 複製初始 patterns

---

## 📈 效益評估

### 預期改進

基於測試數據，啟用 Self-Evolving 系統後的預期改進：

- **成功率**: +5-15%
- **成本效率**: +10-30%
- **品質分數**: +5-10%
- **執行時間**: -10-20%

### ROI 計算

假設：
- 每月執行 1000 次
- 平均成本 $0.10/次
- 啟用 evolution 後成本降低 20%

**月度節省**: 1000 * $0.10 * 20% = **$20/月**

加上品質和成功率提升帶來的間接收益，ROI 非常可觀。

---

## 🌐 Phase 3: 進階協作功能

Phase 3 引入跨 agent 知識轉移、A/B 測試框架和聯邦學習功能，讓 agents 能夠互相學習、科學驗證改進效果。

### 核心功能

1. **Cross-Agent Knowledge Transfer** - Agents 之間共享成功模式
2. **A/B Testing Framework** - 科學驗證配置變更效果
3. **Federated Learning** - 分散式模型訓練（規劃中）

---

### 🔄 Cross-Agent Knowledge Transfer

Agents 可以從其他 agents 的經驗中學習，加速新 agent 的訓練過程。

#### 架構

```
┌─────────────────┐         ┌─────────────────┐
│  Source Agent   │         │  Target Agent   │
│  (Experienced)  │         │    (New)        │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │ learned patterns          │ needs patterns
         │                           │
         ▼                           ▼
  ┌──────────────────────────────────────────┐
  │      KnowledgeTransferManager            │
  │  ┌────────────────────────────────────┐  │
  │  │   TransferabilityChecker           │  │
  │  │   - Context similarity (weighted)  │  │
  │  │   - Confidence adjustment          │  │
  │  └────────────────────────────────────┘  │
  └──────────────────────────────────────────┘
```

#### 核心組件

**1. TransferabilityChecker**

評估 pattern 是否適用於目標 agent，使用加權上下文相似度：

```typescript
import { TransferabilityChecker } from './evolution';

const checker = new TransferabilityChecker();

// 評估 pattern 可轉移性
const assessment = checker.assessTransferability(
  pattern,           // 來源 pattern
  'source-agent',
  'target-agent',
  {                  // 目標上下文
    agent_type: 'code-reviewer',
    task_type: 'security_audit',
    complexity: 'high',
  }
);

console.log(`
  適用性分數: ${(assessment.applicabilityScore * 100).toFixed(0)}%
  上下文相似度: ${(assessment.contextSimilarity * 100).toFixed(0)}%
  調整後信心度: ${(assessment.confidence * 100).toFixed(0)}%
  理由: ${assessment.reasoning.join(', ')}
`);
```

**加權相似度計算**:
- agent_type 匹配: **40%**
- task_type 匹配: **30%**
- complexity 匹配: **20%**
- config_keys Jaccard 相似度: **10%**

**2. KnowledgeTransferManager**

管理 pattern 發現與轉移流程：

```typescript
import { KnowledgeTransferManager } from './evolution';

const transferManager = new KnowledgeTransferManager(
  learningManager,
  transferabilityChecker
);

// 尋找可轉移的 patterns
const transferablePatterns = await transferManager.findTransferablePatterns(
  'experienced-agent',  // 來源 agent
  'new-agent',          // 目標 agent
  {                     // 目標上下文
    agent_type: 'code-reviewer',
    task_type: 'code_review',
    complexity: 'medium',
  },
  {
    minConfidence: 0.7,      // 最低信心度
    minObservations: 10,     // 最少觀察次數
  }
);

console.log(`找到 ${transferablePatterns.length} 個可轉移的 patterns`);

transferablePatterns.forEach(tp => {
  console.log(`
    Pattern: ${tp.pattern.id}
    原始信心度: ${(tp.originalConfidence * 100).toFixed(0)}%
    調整後信心度: ${(tp.pattern.confidence * 100).toFixed(0)}%
    轉移時間: ${tp.transferredAt.toISOString()}
  `);
});
```

#### 使用場景

**場景 1: 新 Agent 快速啟動**

```typescript
// 1. 新 agent 缺少經驗數據
const newAgentPatterns = await learner.getLearnedPatterns('new-code-reviewer');
console.log(`新 agent 的 patterns: ${newAgentPatterns.length}`); // 0

// 2. 從經驗豐富的 agent 轉移知識
const transferred = await transferManager.findTransferablePatterns(
  'senior-code-reviewer',  // 300+ patterns
  'new-code-reviewer',
  {
    agent_type: 'code-reviewer',
    task_type: 'code_review',
    complexity: 'medium',
  }
);

console.log(`轉移了 ${transferred.length} 個 patterns`); // 例如: 45

// 3. 新 agent 立即具備基礎能力
// 信心度會自動降低 10%，隨著使用逐步提升
```

**場景 2: 跨領域知識遷移**

```typescript
// 安全審查 agent 的經驗可以部分遷移到代碼審查
const crossDomainTransfer = await transferManager.findTransferablePatterns(
  'security-auditor',
  'code-reviewer',
  {
    agent_type: 'code-reviewer',
    task_type: 'security_audit',  // 相關任務類型
    complexity: 'high',
  }
);

// 只會轉移高相似度的 patterns（例如: 複雜度處理、超時設定）
// task_type 不完全匹配時，相似度評分會降低
```

---

### 🧪 A/B Testing Framework

科學驗證 agent 配置變更的效果，基於統計顯著性做決策。

#### 架構

```
┌──────────────────────────────────────────────┐
│            ABTestManager                     │
│  ┌────────────────────────────────────────┐  │
│  │  Experiment Management                 │  │
│  │  - Create experiments                  │  │
│  │  - Variant assignment (deterministic)  │  │
│  │  - Traffic splitting                   │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  StatisticalAnalyzer                   │  │
│  │  - Welch's t-test                      │  │
│  │  - Effect size (Cohen's d)             │  │
│  │  - Confidence intervals                │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

#### 核心組件

**1. StatisticalAnalyzer**

提供統計分析方法：

```typescript
import { StatisticalAnalyzer } from './evolution';

const analyzer = new StatisticalAnalyzer();

// Welch's t-test (不假設方差相等)
const tTest = analyzer.welchTTest(
  [0.85, 0.82, 0.88, 0.90, 0.87],  // control group
  [0.92, 0.94, 0.91, 0.95, 0.93]   // treatment group
);

console.log(`
  t 統計量: ${tTest.tStatistic.toFixed(3)}
  p-value: ${tTest.pValue.toFixed(4)}
  自由度: ${tTest.degreesOfFreedom.toFixed(1)}
  結果: ${tTest.pValue < 0.05 ? '統計顯著' : '無顯著差異'}
`);

// Effect size (Cohen's d)
const effectSize = analyzer.calculateEffectSize(controlGroup, treatmentGroup);
console.log(`效應大小: ${effectSize.toFixed(3)}`);

// Confidence interval
const ci = analyzer.calculateConfidenceInterval(data, 0.95);
console.log(`95% 信賴區間: [${ci[0].toFixed(3)}, ${ci[1].toFixed(3)}]`);
```

**2. ABTestManager**

管理 A/B 測試實驗：

```typescript
import { ABTestManager } from './evolution';

const abtest = new ABTestManager();

// 創建實驗
const experiment = abtest.createExperiment(
  'prompt-optimization-test',
  'Test new prompt strategy',
  [
    {
      name: 'control',
      config: { strategy: 'efficient' },
      description: 'Current prompt strategy'
    },
    {
      name: 'treatment',
      config: { strategy: 'quality-focused' },
      description: 'New quality-focused prompt'
    }
  ],
  [0.5, 0.5],           // 50/50 traffic split
  'quality_score',      // Primary success metric
  {
    durationDays: 7,
    minSampleSize: 30,
    significanceLevel: 0.05
  }
);

// 啟動實驗
abtest.startExperiment(experiment.id);

// 分配 variant (deterministic - 同一 agent 永遠得到相同 variant)
const assignment = abtest.assignVariant(experiment.id, 'agent-123');
console.log(`Agent 123 分配到: ${assignment.variantName}`);

// 記錄指標
abtest.addMetric(experiment.id, 'control', {
  quality_score: 0.85,
  duration: 12000,
  cost: 0.05
});

abtest.addMetric(experiment.id, 'treatment', {
  quality_score: 0.92,
  duration: 13000,
  cost: 0.06
});

// 分析結果 (樣本數足夠時)
const results = abtest.analyzeResults(experiment.id);

console.log(`
  實驗: ${results.experimentId}
  贏家: ${results.winner || '無顯著差異'}
  信心度: ${(results.confidence * 100).toFixed(1)}%
  p-value: ${results.statisticalTests.pValue.toFixed(4)}
  效應大小: ${results.statisticalTests.effectSize.toFixed(3)}
  建議: ${results.recommendation}
`);

// Variant 統計
Object.entries(results.variantStats).forEach(([name, stats]) => {
  console.log(`
    ${name}:
      樣本數: ${stats.sampleSize}
      平均值: ${stats.mean.toFixed(3)}
      標準差: ${stats.stdDev.toFixed(3)}
      信賴區間: [${stats.confidenceInterval[0].toFixed(3)}, ${stats.confidenceInterval[1].toFixed(3)}]
  `);
});
```

#### 使用場景

**場景 1: 驗證 Prompt 優化效果**

```typescript
// 問題: 不確定新的 prompt 策略是否真的更好

// 1. 創建 A/B 測試
const promptTest = abtest.createExperiment(
  'prompt-strategy-test',
  'Quality-focused vs Efficient prompt',
  [
    { name: 'efficient', config: { strategy: 'efficient' } },
    { name: 'quality', config: { strategy: 'quality-focused' } }
  ],
  [0.5, 0.5],
  'quality_score',
  { minSampleSize: 50 }
);

abtest.startExperiment(promptTest.id);

// 2. 執行 100 次，50/50 分配
for (let i = 0; i < 100; i++) {
  const assignment = abtest.assignVariant(promptTest.id, `agent-${i}`);
  const config = promptTest.variants.find(v => v.name === assignment.variantName).config;

  // 執行 agent 並記錄結果
  const result = await executeAgent(config);
  abtest.addMetric(promptTest.id, assignment.variantName, {
    quality_score: result.quality
  });
}

// 3. 分析結果
const results = abtest.analyzeResults(promptTest.id);

if (results.winner === 'quality' && results.statisticalTests.pValue < 0.05) {
  console.log('✓ 統計顯著: quality-focused 策略顯著提升品質');
  console.log(`  提升幅度: ${results.statisticalTests.effectSize.toFixed(2)} 標準差`);
} else {
  console.log('✗ 無顯著差異，維持現有策略');
}
```

**場景 2: Model 選擇驗證**

```typescript
// 測試: Sonnet vs Haiku 在簡單任務上的效果

const modelTest = abtest.createExperiment(
  'model-selection-test',
  'Sonnet vs Haiku for simple tasks',
  [
    { name: 'sonnet', config: { model: 'claude-sonnet-4-5' } },
    { name: 'haiku', config: { model: 'claude-haiku-3-5' } }
  ],
  [0.5, 0.5],
  'quality_score',
  {
    minSampleSize: 30,
    secondaryMetrics: ['cost', 'duration']
  }
);

// ... 執行測試 ...

const results = abtest.analyzeResults(modelTest.id);

// 多指標決策
const sonnetStats = results.variantStats.sonnet;
const haikuStats = results.variantStats.haiku;

const qualityDiff = sonnetStats.mean - haikuStats.mean;
const costRatio = haikuStats.mean / sonnetStats.mean;  // 假設 cost 也在 metrics

if (Math.abs(qualityDiff) < 0.05 && costRatio < 0.5) {
  console.log('✓ Haiku 品質相近但成本低 50%，建議切換');
}
```

---

### 📊 Phase 3 完整工作流程

```typescript
import {
  LearningManager,
  PerformanceTracker,
  KnowledgeTransferManager,
  TransferabilityChecker,
  ABTestManager,
} from './evolution';

// ========================================
// 1. 初始化系統
// ========================================
const tracker = new PerformanceTracker();
const learner = new LearningManager(tracker);
const transferChecker = new TransferabilityChecker();
const transferManager = new KnowledgeTransferManager(learner, transferChecker);
const abtest = new ABTestManager();

// ========================================
// 2. 新 Agent 從經驗 Agent 學習
// ========================================
const transferred = await transferManager.findTransferablePatterns(
  'experienced-agent',
  'new-agent',
  { agent_type: 'code-reviewer', task_type: 'code_review', complexity: 'medium' },
  { minConfidence: 0.7, minObservations: 10 }
);

console.log(`✓ 轉移了 ${transferred.length} 個 patterns 給新 agent`);

// ========================================
// 3. A/B 測試驗證配置變更
// ========================================
const experiment = abtest.createExperiment(
  'config-test',
  'Test new configuration',
  [
    { name: 'baseline', config: { /* current */ } },
    { name: 'optimized', config: { /* new */ } }
  ],
  [0.5, 0.5],
  'quality_score'
);

abtest.startExperiment(experiment.id);

// ========================================
// 4. 執行測試並收集數據
// ========================================
for (let i = 0; i < 100; i++) {
  const assignment = abtest.assignVariant(experiment.id, `agent-${i}`);
  const result = await executeAgent(assignment.variantName);

  abtest.addMetric(experiment.id, assignment.variantName, {
    quality_score: result.quality,
    cost: result.cost,
    duration: result.duration
  });
}

// ========================================
// 5. 分析結果並做決策
// ========================================
const results = abtest.analyzeResults(experiment.id);

if (results.winner && results.statisticalTests.pValue < 0.05) {
  console.log(`✓ 統計顯著: ${results.winner} 勝出`);
  console.log(`  p-value: ${results.statisticalTests.pValue.toFixed(4)}`);
  console.log(`  效應大小: ${results.statisticalTests.effectSize.toFixed(3)}`);
  console.log(`  建議: ${results.recommendation}`);
} else {
  console.log('✗ 無顯著差異，維持現狀');
}
```

---

### 🎯 Phase 3 效益

**Cross-Agent Knowledge Transfer:**
- ⏱️ 新 agent 啟動時間: 從數週降至數天
- 📈 初始性能: 提升 30-50%（基於轉移的 patterns）
- 🔄 知識複用: 避免重複學習相同經驗

**A/B Testing Framework:**
- 🔬 科學決策: 基於統計顯著性而非直覺
- 📊 量化改進: 精確測量配置變更效果
- ⚠️ 風險控制: 50/50 分流降低全面部署風險

**整體改進:**
- 成本優化: 10-30% (基於 A/B 測試驗證的配置)
- 品質提升: 5-15% (跨 agent 最佳實踐共享)
- 開發效率: 40-60% (新 agent 快速啟動)

---

## 📊 Phase 4: Evolution Dashboard & Monitoring

Phase 4 引入統一的監控儀表板，提供所有 agents 的演化進度、學習狀態和性能趨勢的即時可視化。

### 核心組件

#### 4. EvolutionMonitor

**職責**: 統一監控所有 agents 的演化狀態，提供儀表板和進度追蹤

**功能**:
- 聚合所有 agents 的演化統計
- 提供儀表板摘要 (總代理數、總模式數、平均成功率)
- 追蹤個別 agent 的學習進度
- 識別表現最佳和改進最快的 agents
- 格式化美觀的終端輸出

**使用範例**:
```typescript
import { EvolutionMonitor } from './evolution';
import { Router } from './orchestrator';

const router = new Router();
const monitor = new EvolutionMonitor(
  router.getPerformanceTracker(),
  router.getLearningManager(),
  router.getAdaptationEngine()
);

// 獲取儀表板摘要
const summary = monitor.getDashboardSummary();
console.log(`
📊 Evolution Dashboard Summary
==============================
Total Agents: ${summary.totalAgents}
Agents with Patterns: ${summary.agentsWithPatterns}
Total Patterns: ${summary.totalPatterns}
Total Executions: ${summary.totalExecutions}
Average Success Rate: ${(summary.averageSuccessRate * 100).toFixed(1)}%

Top Improving Agents:
${summary.topImprovingAgents.map(a =>
  `  - ${a.agentId}: +${(a.improvement * 100).toFixed(1)}%`
).join('\n')}
`);

// 查看特定 agent 的統計
const agentStats = monitor.getAgentStats('code-reviewer');
console.log(`
Agent: ${agentStats.agentId}
Total Executions: ${agentStats.totalExecutions}
Learned Patterns: ${agentStats.learnedPatterns}
Applied Adaptations: ${agentStats.appliedAdaptations}
Success Rate Improvement: +${(agentStats.successRateImprovement * 100).toFixed(1)}%
`);

// 獲取所有 agents 的學習進度
const progress = monitor.getLearningProgress();
progress.forEach(p => {
  if (p.totalExecutions > 0) {
    console.log(`
${p.agentId}:
  Executions: ${p.totalExecutions}
  Patterns: ${p.learnedPatterns}
  Adaptations: ${p.appliedAdaptations}
  Improvement: +${(p.successRateImprovement * 100).toFixed(1)}%
  Last Learning: ${p.lastLearningDate.toISOString()}
    `);
  }
});

// 格式化完整儀表板 (終端友好格式)
const dashboard = monitor.formatDashboard();
console.log(dashboard);
```

**關鍵 API**:
- `getDashboardSummary()` - 獲取總覽統計
- `getAgentStats(agentId)` - 獲取特定 agent 統計
- `getLearningProgress()` - 獲取所有 agents 的學習進度
- `formatDashboard()` - 格式化美觀的終端輸出

**Dashboard 介面定義**:
```typescript
interface DashboardSummary {
  totalAgents: number;              // 總 agent 數量
  agentsWithPatterns: number;       // 有 patterns 的 agent 數量
  totalPatterns: number;            // 總 pattern 數量
  totalExecutions: number;          // 總執行次數
  averageSuccessRate: number;       // 平均成功率
  topImprovingAgents: Array<{
    agentId: string;
    improvement: number;            // 成功率改進幅度
  }>;
}

interface AgentLearningProgress {
  agentId: string;
  totalExecutions: number;          // 執行次數
  learnedPatterns: number;          // 學到的 patterns
  appliedAdaptations: number;       // 應用的 adaptations
  successRateImprovement: number;   // 成功率改進
  lastLearningDate: Date;           // 最後學習時間
}
```

---

### MCP Server 整合

Evolution dashboard 已整合到 MCP server，可透過 Claude Code 直接查看：

**evolution_dashboard Tool**:
```typescript
// Claude Code 中使用
mcp__smart_agents__evolution_dashboard({ format: 'summary' })
mcp__smart_agents__evolution_dashboard({ format: 'detailed' })
```

**Tool 定義**:
```typescript
{
  name: 'evolution_dashboard',
  description: 'View evolution system dashboard showing agent learning progress, patterns, and performance improvements. Displays statistics for all 22 agents.',
  inputSchema: {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        description: 'Dashboard format: "summary" (default) or "detailed"',
        enum: ['summary', 'detailed'],
      },
    },
  },
}
```

**輸出格式**:

- **Summary Format**: 精簡版儀表板，顯示總覽統計和 top 5 改進最快的 agents
- **Detailed Format**: 完整版儀表板，包含所有 agents 的詳細學習進度

---

## 🧪 Phase 5: Testing & Validation Infrastructure

Phase 5 建立完整的測試和驗證基礎設施，確保演化系統的可靠性、性能和向後兼容性。

### 測試套件架構

```
tests/
├── evolution/
│   ├── PerformanceTracker.test.ts
│   ├── LearningManager.test.ts
│   ├── AdaptationEngine.test.ts
│   └── EvolutionMonitor.test.ts         ← Phase 4
├── integration/
│   └── evolution-e2e.test.ts            ← Phase 5: E2E Integration
├── benchmarks/
│   └── evolution-performance.bench.ts   ← Phase 5: Performance
├── regression/
│   └── evolution-regression.test.ts     ← Phase 5: Regression
└── ...

scripts/
└── user-acceptance-test.ts              ← Phase 5: UAT

experiments/
└── self-improvement-demo.ts             ← Phase 5: Self-Improvement
```

### 1. 端對端整合測試 (E2E)

**檔案**: `tests/integration/evolution-e2e.test.ts`

**目的**: 測試完整工作流程，從 task routing 到 dashboard 的整個演化系統

**測試場景**:
```typescript
describe('Evolution System E2E Integration', () => {
  it('should route task and track performance', async () => {
    // 1. Route task
    const result = await router.routeTask(task);

    // 2. Verify performance tracking
    const stats = router.getPerformanceTracker()
      .getEvolutionStats(result.routing.selectedAgent);

    expect(stats.totalExecutions).toBeGreaterThan(0);
  });

  it('should collect performance metrics across multiple tasks', async () => {
    // Execute multiple tasks
    for (const task of tasks) {
      await router.routeTask(task);
    }

    // Verify dashboard summary
    const summary = monitor.getDashboardSummary();
    expect(summary.totalExecutions).toBeGreaterThanOrEqual(3);
  });

  it('should show evolution progress in dashboard', async () => {
    // Execute tasks
    // ...

    // Verify dashboard formatting
    const dashboard = monitor.formatDashboard();
    expect(dashboard).toContain('Evolution Dashboard');
    expect(dashboard).toContain('Total Agents');
    expect(dashboard).toContain('22');
  });
});
```

**覆蓋範圍**:
- Task routing → Performance tracking
- Evolution configuration integration
- Dashboard summary generation
- Learning progress tracking
- Adaptation application
- Cost tracking integration
- Error handling
- System resources

---

### 2. 性能基準測試 (Performance Benchmarks)

**檔案**: `tests/benchmarks/evolution-performance.bench.ts`

**目的**: 確保演化系統的性能開銷在可接受範圍內，防止性能退化

**基準測試項目**:
```typescript
describe('Evolution System Performance Benchmarks', () => {
  // Task routing performance
  bench('single task routing', async () => {
    await router.routeTask(task);
  });

  bench('batch task routing (10 tasks)', async () => {
    await router.routeBatch(tasks);
  });

  // Performance tracking overhead
  bench('track single metric', () => {
    performanceTracker.track(metrics);
  });

  bench('track 100 metrics', () => {
    for (let i = 0; i < 100; i++) {
      performanceTracker.track(metrics);
    }
  });

  // Pattern analysis performance
  bench('analyze patterns (5 observations)', () => {
    learningManager.analyzePatterns('agent-id');
  });

  // Dashboard generation performance
  bench('get dashboard summary', () => {
    monitor.getDashboardSummary();
  });

  bench('format dashboard', () => {
    monitor.formatDashboard();
  });
});
```

**性能目標**:
```typescript
/**
 * Performance Targets:
 *
 * Task Routing:
 * - Single task: < 100ms
 * - Batch (10 tasks): < 500ms
 * - Batch (50 tasks): < 2000ms
 *
 * Performance Tracking:
 * - Single metric: < 1ms
 * - 100 metrics: < 10ms
 * - Get stats: < 5ms
 *
 * Pattern Analysis:
 * - Analyze patterns: < 50ms
 * - Get patterns: < 1ms
 * - Get recommendations: < 5ms
 *
 * Dashboard:
 * - Get summary: < 10ms
 * - Get progress: < 20ms
 * - Format dashboard: < 50ms
 *
 * Concurrent:
 * - 10 parallel tasks: < 500ms
 * - 100 parallel tracking: < 20ms
 *
 * Memory:
 * - 1000 metrics: < 100MB
 */
```

**運行方式**:
```bash
npx vitest bench tests/benchmarks/evolution-performance.bench.ts
```

---

### 3. 回歸測試套件 (Regression Tests)

**檔案**: `tests/regression/evolution-regression.test.ts`

**目的**: 確保演化系統變更不會破壞現有功能，維持向後兼容性

**測試項目**:

**3.1 API 向後兼容性**
```typescript
describe('API Backward Compatibility', () => {
  it('should maintain Router.routeTask() signature', async () => {
    const result = await router.routeTask(task);

    // Original return type structure
    expect(result).toHaveProperty('analysis');
    expect(result).toHaveProperty('routing');
    expect(result).toHaveProperty('approved');
    expect(result).toHaveProperty('message');

    // New evolution field (additive only)
    expect(result).toHaveProperty('adaptedExecution');
  });

  it('should maintain Router getter methods', () => {
    // Original getters
    expect(router.getAnalyzer()).toBeDefined();
    expect(router.getRouter()).toBeDefined();
    expect(router.getCostTracker()).toBeDefined();

    // New evolution getters (additive only)
    expect(router.getPerformanceTracker()).toBeDefined();
    expect(router.getLearningManager()).toBeDefined();
    expect(router.getAdaptationEngine()).toBeDefined();
  });
});
```

**3.2 Evolution Configuration 穩定性**
```typescript
describe('Evolution Configuration Stability', () => {
  it('should maintain all 22 agent configurations', () => {
    const configs = getAllAgentConfigs();
    expect(configs.size).toBe(22);

    // Verify all required agents exist
    const requiredAgents = [
      'code-reviewer', 'test-writer', 'debugger',
      // ... (complete list)
    ];

    requiredAgents.forEach(agentId => {
      expect(configs.has(agentId as any)).toBe(true);
    });
  });

  it('should maintain config structure for all agents', () => {
    configs.forEach((config, agentId) => {
      expect(config.agentId).toBe(agentId);
      expect(config.category).toBeDefined();
      expect(config.evolutionEnabled).toBeDefined();
      expect(config.confidenceThreshold).toBeGreaterThanOrEqual(0);
      expect(config.confidenceThreshold).toBeLessThanOrEqual(1);
    });
  });
});
```

**3.3 性能回歸防護**
```typescript
describe('Performance Regression Prevention', () => {
  it('should route tasks within performance threshold', async () => {
    const startTime = Date.now();
    await router.routeTask(task);
    const duration = Date.now() - startTime;

    // Should complete within 200ms (with evolution overhead)
    expect(duration).toBeLessThan(200);
  });
});
```

**3.4 數據完整性**
```typescript
describe('Data Integrity', () => {
  it('should preserve task data through routing', async () => {
    const result = await router.routeTask(task);

    expect(result.analysis.taskType).toBeDefined();
    expect(result.analysis.complexity).toBeGreaterThan(0);
    expect(result.routing.selectedAgent).toBeDefined();
  });
});
```

---

### 4. 用戶驗收測試 (User Acceptance Test)

**檔案**: `scripts/user-acceptance-test.ts`

**目的**: 從用戶角度模擬真實工作流程，驗證 UX 和系統可用性

**測試場景**:
```typescript
class UserAcceptanceTest {
  async runAllTests(): Promise<void> {
    await this.testScenario1_BasicTaskRouting();
    await this.testScenario2_SmartAgentSelection();
    await this.testScenario3_EvolutionDashboard();
    await this.testScenario4_LearningProgress();
    await this.testScenario5_PerformanceImprovement();

    this.printFinalResults();
  }
}
```

**Scenario 1: Basic Task Routing**
```typescript
console.log(`User: "Route my code review task to appropriate agent"`);
const result = await this.router.routeTask(task);

console.log(`System: Selected agent "${result.routing.selectedAgent}"`);
console.log(`System: ${result.message}`);
```

**Scenario 2: Smart Agent Selection**
```typescript
// 測試不同任務類型是否選擇合適的 agent
const testCases = [
  { description: 'Debug login error', expectedCategory: 'development' },
  { description: 'Research best practices', expectedCategory: 'research' },
  { description: 'Deploy to production', expectedCategory: 'operations' },
];
```

**Scenario 3: Evolution Dashboard**
```typescript
console.log('User: "Show me the evolution dashboard"');
const dashboard = this.monitor.formatDashboard();
console.log(dashboard);
```

**Scenario 4: Learning Progress**
```typescript
console.log('User: "Show learning progress for all agents"');
const progress = this.monitor.getLearningProgress();
// Verify progress for all 22 agents
```

**Scenario 5: Performance Improvement**
```typescript
console.log('User: "Execute same task 3 times to test learning"');
// Execute same task 3 times, verify consistent agent selection
```

**成功標準**:
```typescript
private printFinalResults(): void {
  const passRate = (this.passed / total) * 100;

  if (passRate >= 80) {
    console.log('\n✅ USER ACCEPTANCE: PASS');
    console.log('Evolution system meets user acceptance criteria!');
  } else {
    console.log('\n❌ USER ACCEPTANCE: FAIL');
  }
}
```

**運行方式**:
```bash
npx tsx scripts/user-acceptance-test.ts
```

---

### 5. 自我改進實驗 (Self-Improvement Experiment)

**檔案**: `experiments/self-improvement-demo.ts`

**目的**: 演示演化系統的學習能力，展示 3 輪執行中的性能改進

**實驗設計**:
```typescript
class SelfImprovementExperiment {
  async runExperiment(): Promise<void> {
    // Round 1: Baseline performance (10 tasks)
    console.log('🔵 Round 1: Baseline Performance');
    await this.runRound('code-review', 10, 'Round 1');

    // Round 2: Learning phase (10 tasks)
    console.log('🟡 Round 2: Learning Phase');
    await this.runRound('code-review', 10, 'Round 2');

    // Round 3: Improved performance (10 tasks)
    console.log('🟢 Round 3: Improved Performance');
    await this.runRound('code-review', 10, 'Round 3');

    this.generateReport();
  }

  private generateReport(): void {
    // Compare metrics across rounds
    const round1 = this.getRoundStats('Round 1');
    const round2 = this.getRoundStats('Round 2');
    const round3 = this.getRoundStats('Round 3');

    console.log(`
📊 Self-Improvement Experiment Results
=========================================

Round 1 (Baseline):
  Average patterns: ${round1.avgPatterns.toFixed(1)}
  Success rate: ${(round1.successRate * 100).toFixed(1)}%

Round 2 (Learning):
  Average patterns: ${round2.avgPatterns.toFixed(1)}
  Success rate: ${(round2.successRate * 100).toFixed(1)}%
  Improvement: +${((round2.successRate - round1.successRate) * 100).toFixed(1)}%

Round 3 (Improved):
  Average patterns: ${round3.avgPatterns.toFixed(1)}
  Success rate: ${(round3.successRate * 100).toFixed(1)}%
  Improvement: +${((round3.successRate - round1.successRate) * 100).toFixed(1)}%

✅ Evidence of Learning: System applied ${round3.avgPatterns} patterns in Round 3
    `);
  }
}
```

**運行方式**:
```bash
npx tsx experiments/self-improvement-demo.ts
```

**預期輸出**:
- Round 1: 無 patterns，baseline 性能
- Round 2: 開始學習 patterns，性能開始改進
- Round 3: 應用學到的 patterns，顯著改進

---

### 測試覆蓋率目標

| 測試類型 | 目標覆蓋率 | 檔案 |
|---------|-----------|------|
| Unit Tests | ≥ 85% | `tests/evolution/*.test.ts` |
| Integration Tests | ≥ 80% | `tests/integration/*.test.ts` |
| Regression Tests | 100% API | `tests/regression/*.test.ts` |
| Performance Benchmarks | All critical paths | `tests/benchmarks/*.bench.ts` |
| UAT Scenarios | ≥ 5 scenarios | `scripts/user-acceptance-test.ts` |

---

### 持續集成 (CI)

**建議的 CI Pipeline**:
```yaml
# .gitlab-ci.yml or .github/workflows/evolution-tests.yml

evolution-tests:
  script:
    - npm install
    - npm run test:evolution       # Unit tests
    - npm run test:integration     # E2E tests
    - npm run test:regression      # Regression tests
    - npm run test:uat             # User acceptance tests
    - npm run benchmark:evolution  # Performance benchmarks
```

**品質門檻**:
- ✅ All tests pass (100%)
- ✅ Unit test coverage ≥ 85%
- ✅ No performance regressions (< 10% slowdown)
- ✅ UAT pass rate ≥ 80%

---

## 🔮 未來發展

### 計劃中的功能

1. **Federated Learning** (Phase 3 進行中)
   - 分散式模型訓練
   - 隱私保護的知識聚合
   - 多 agent 協作學習

2. **Multi-Objective Optimization** (Phase 2 進行中)
   - 同時優化成本、品質、速度
   - Pareto frontier 分析
   - 多目標決策支持

3. **Reinforcement Learning**
   - 更先進的學習算法
   - 自動調整 learning rate
   - 動態策略優化

4. **Pattern Visualization**
   - Web UI 顯示 patterns
   - 互動式 pattern 管理
   - 視覺化 A/B 測試結果

5. **Real-time Dashboard** (Phase 4 擴展)
   - WebSocket 即時更新
   - 圖表化趨勢顯示
   - 告警與異常檢測

---

## 🤝 貢獻

歡迎提交 PR 改進 Self-Evolving Agent System！

請遵循：
1. 所有新功能必須有測試覆蓋
2. 更新相關文檔
3. 保持與現有架構一致

---

**文檔版本**: V2.1
**最後更新**: 2025-12-28
**作者**: Smart Agents Team
**Phase 4 & 5 新增**: EvolutionMonitor, evolution_dashboard MCP tool, 完整測試基礎設施
