# 🤖 模型選擇指南

## Claude 模型系列（主力）

### Claude Sonnet 4.5 ⭐ 推薦

**用途**：日常開發、代碼生成、一般對話

**優勢**：
- 速度快（< 3 秒響應）
- 性價比高
- 品質優秀

**成本**：
- Input: $3 / 1M tokens
- Output: $15 / 1M tokens

**典型使用場景**：
```typescript
// 代碼生成
const result = await orchestrator.route({
  task: "寫一個 TypeScript 函數計算費氏數列",
  complexity: "medium" // 自動選擇 Sonnet
});

// 一般問答
const answer = await orchestrator.route({
  task: "解釋什麼是閉包",
  complexity: "simple" // 可能用 Haiku
});
```

---

### Claude Opus 4.5 💎 高階

**用途**：複雜推理、創意寫作、系統架構設計

**優勢**：
- 最強推理能力
- 創意表現優秀
- 複雜任務準確率高

**成本**：
- Input: $15 / 1M tokens
- Output: $75 / 1M tokens

**典型使用場景**：
```typescript
// 系統架構設計
const architecture = await orchestrator.route({
  task: "設計一個高可用的微服務架構",
  complexity: "complex" // 自動選擇 Opus
});

// 創意寫作
const story = await orchestrator.route({
  task: "寫一個科幻短篇小說",
  complexity: "complex"
});
```

---

### Claude Haiku 4 ⚡ 快速

**用途**：簡單任務、快速響應

**優勢**：
- 超快響應（< 1 秒）
- 成本最低
- 適合大量簡單任務

**成本**：
- Input: $0.8 / 1M tokens
- Output: $4 / 1M tokens

**典型使用場景**：
```typescript
// 簡單分類
const category = await orchestrator.route({
  task: "這個文本是正面還是負面：'這產品很棒！'",
  complexity: "simple" // 自動選擇 Haiku
});
```

---

## OpenAI 模型（輔助）

### Whisper（語音轉文字）

**成本**：$0.006 / 分鐘

**使用範例**：
```typescript
const transcription = await voiceAgent.transcribe({
  audioPath: "/path/to/audio.mp3",
  language: "zh"
});

// 成本：5 分鐘音訊 = $0.03
```

---

### TTS（文字轉語音）

**模型**：
- `tts-1`：標準品質（推薦）
- `tts-1-hd`：高品質

**成本**：$0.015 / 1K 字元

**語音選擇**：
- `alloy`：中性、清晰（推薦）
- `echo`：男聲、溫暖
- `fable`：英式口音
- `onyx`：深沉男聲
- `nova`：女聲、友善
- `shimmer`：女聲、柔和

**使用範例**：
```typescript
const audio = await voiceAgent.synthesize({
  text: "你好，歡迎使用 Smart Agents！",
  voice: "alloy",
  quality: "standard"
});

// 成本：50 字元 = $0.00075
```

---

### Embeddings（向量化）

**模型選擇**：
- `text-embedding-3-small`：512 維（推薦）
- `text-embedding-3-large`：1536 維

**成本**：
- Small: $0.02 / 1M tokens
- Large: $0.13 / 1M tokens

**使用範例**：
```typescript
await ragAgent.indexDocuments({
  documents: [
    "文檔內容 1...",
    "文檔內容 2..."
  ],
  model: "text-embedding-3-small"
});

// 成本：1000 個文檔 (~500K tokens) = $0.01
```

---

## 自動模型選擇邏輯

Orchestrator 會根據任務自動選擇模型：

```typescript
function selectModel(task: string): ModelConfig {
  const complexity = analyzeComplexity(task);

  if (complexity === 'simple') {
    return {
      model: 'claude-haiku-4',
      reasoning: '簡單任務，使用 Haiku 節省成本'
    };
  }

  if (complexity === 'medium') {
    return {
      model: 'claude-sonnet-4-5',
      reasoning: '中等任務，使用 Sonnet 平衡性能與成本'
    };
  }

  return {
    model: 'claude-opus-4-5',
    reasoning: '複雜任務，使用 Opus 確保品質'
  };
}
```

---

## 成本優化建議

### 1. 使用快取

```typescript
// 相同查詢不重複計算
@cache()
async function getEmbedding(text: string) {
  return await openai.embeddings.create({ input: text });
}
```

### 2. 批次處理

```typescript
// 一次處理多個文檔
await ragAgent.indexDocuments(documents); // ✅ 好
// vs
for (const doc of documents) {
  await ragAgent.indexDocument(doc); // ❌ 貴
}
```

### 3. 選擇合適的模型

```typescript
// 簡單任務用 Haiku
await orchestrator.route({ task: "分類", complexity: "simple" }); // $0.001

// vs 用 Opus
await orchestrator.route({ task: "分類", complexity: "complex" }); // $0.015
// 省下 15 倍成本！
```

---

## 月度成本預估

**保守使用**（預算 $30-50/月）：

| 服務 | 用量 | 成本 |
|------|------|------|
| Claude Sonnet | 500K tokens/天 | $15-20 |
| Whisper | 100 分鐘/月 | $0.60 |
| TTS | 50K 字元/月 | $0.75 |
| Embeddings | 1M tokens/月 | $0.02 |
| **總計** | | **~$20-25/月** |

**中度使用**（預算 $50-100/月）：

| 服務 | 用量 | 成本 |
|------|------|------|
| Claude Sonnet | 1M tokens/天 | $30-40 |
| Claude Opus | 100K tokens/月 | $5-10 |
| Whisper | 300 分鐘/月 | $1.80 |
| TTS | 100K 字元/月 | $1.50 |
| Embeddings | 5M tokens/月 | $0.10 |
| **總計** | | **~$40-55/月** |

---

## 監控與警報

Smart Agents 會自動追蹤成本：

```typescript
// 檢查當前成本
const report = costTracker.getReport();
console.log(`本月已用: $${report.monthlyTotal}`);
console.log(`剩餘預算: $${report.remaining}`);

// 超過 80% 時會自動警告
// 超過 100% 時會切換到更便宜的模型
```
