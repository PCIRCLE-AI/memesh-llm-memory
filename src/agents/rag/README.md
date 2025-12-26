# Advanced RAG Agent 📚

進階檢索增強生成（Retrieval-Augmented Generation）代理，使用 Vectra 本地向量資料庫和 OpenAI Embeddings。

## 功能特性

### ✨ 核心功能

- **語義搜尋**：使用 OpenAI embeddings 進行語義相似度搜尋
- **Hybrid 搜尋**：結合語義搜尋和關鍵字匹配
- **批次索引**：高效處理大量文檔（支援進度追蹤）
- **結果重排序**：多種重排序演算法（RRF、Score Fusion、LLM Rerank）
- **多樣性優化**：確保搜尋結果涵蓋不同主題
- **成本追蹤**：即時追蹤 Embedding API 使用成本

### 🔧 技術棧

- **Vector Database**: Vectra (本地檔案存儲，零依賴)
- **Embeddings**: OpenAI `text-embedding-3-small` / `text-embedding-3-large`
- **Language**: TypeScript with strict type checking
- **Memory Integration**: 支援 MCP Memory 持久化

## 快速開始

### 1. 安裝依賴

已在專案根目錄的 `package.json` 中配置：

```json
{
  "dependencies": {
    "vectra": "^0.11.1",
    "openai": "^4.70.4"
  }
}
```

### 2. 配置環境變數

在專案根目錄的 `.env` 文件中：

```env
# OpenAI API (for embeddings)
OPENAI_API_KEY=sk-xxxxx
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # 或 text-embedding-3-large
```

**就這樣！** Vectra 是純 Node.js 實現，無需啟動服務或 Docker。

向量資料會自動存儲在 `data/vectorstore/` 目錄。

### 3. 基礎使用

```typescript
import { RAGAgent } from './agents/rag/index.js';

// 初始化
const rag = new RAGAgent();
await rag.initialize();

// 索引文檔
await rag.indexDocument(
  'TypeScript 是 JavaScript 的超集',
  {
    source: 'typescript.md',
    title: 'TypeScript 簡介',
    category: 'programming',
    tags: ['typescript', 'javascript'],
  }
);

// 搜尋
const results = await rag.search('什麼是 TypeScript?', { topK: 5 });
console.log(results);

// 關閉
await rag.close();
```

## 進階用法

### 批次索引（大量文檔）

```typescript
const documents = [
  {
    content: '文檔內容 1',
    metadata: { source: 'doc1.md', category: 'tech' },
  },
  {
    content: '文檔內容 2',
    metadata: { source: 'doc2.md', category: 'tech' },
  },
  // ... 更多文檔
];

// 批次索引，包含進度追蹤
const stats = await rag.indexDocuments(documents, {
  batchSize: 100,        // 每批處理 100 個文檔
  maxConcurrent: 5,      // 最多 5 個並發請求
  onProgress: (current, total) => {
    console.log(`進度: ${current}/${total}`);
  },
});

console.log(`總成本: $${stats.totalCost.toFixed(4)}`);
```

### Hybrid 搜尋（語義 + 關鍵字）

```typescript
const results = await rag.hybridSearch('Docker 容器管理', {
  topK: 10,
  semanticWeight: 0.7,   // 語義權重 70%
  keywordWeight: 0.3,    // 關鍵字權重 30%
  keywords: ['Docker', '容器', '管理'],  // 可選：明確指定關鍵字
});
```

### 搜尋 + 重排序

```typescript
const results = await rag.searchWithRerank('API 設計最佳實踐', {
  topK: 5,
  rerankAlgorithm: 'reciprocal-rank',  // 或 'score-fusion'
  scoreThreshold: 0.7,  // 過濾低分結果
});
```

### 元數據過濾

```typescript
const results = await rag.search('React hooks', {
  topK: 5,
  filter: {
    category: 'frontend',
    tags: { $contains: 'react' },
  },
});
```

## API 參考

### RAGAgent

#### `initialize(): Promise<void>`

初始化 RAG Agent 和 ChromaDB 連接。

#### `indexDocument(content: string, metadata: DocumentMetadata, id?: string): Promise<void>`

索引單個文檔。

**參數：**
- `content`: 文檔內容
- `metadata`: 文檔元數據（source, title, category, tags 等）
- `id`: 可選的文檔 ID

#### `indexDocuments(docs: DocumentInput[], options?: BatchOptions): Promise<EmbeddingStats>`

批次索引多個文檔。

**參數：**
- `docs`: 文檔陣列
- `options.batchSize`: 批次大小（預設：100）
- `options.maxConcurrent`: 最大並發數（預設：5）
- `options.onProgress`: 進度回調函數

**返回：** Embedding 統計資訊

#### `search(query: string, options?: SearchOptions): Promise<SearchResult[]>`

語義搜尋。

**參數：**
- `query`: 搜尋查詢
- `options.topK`: 返回結果數量（預設：5）
- `options.scoreThreshold`: 最低分數閾值
- `options.filter`: 元數據過濾條件

#### `hybridSearch(query: string, options?: HybridSearchOptions): Promise<SearchResult[]>`

Hybrid 搜尋（語義 + 關鍵字）。

**參數：**
- `query`: 搜尋查詢
- `options.semanticWeight`: 語義權重（預設：0.7）
- `options.keywordWeight`: 關鍵字權重（預設：0.3）
- `options.keywords`: 明確指定的關鍵字

#### `searchWithRerank(query: string, options?): Promise<SearchResult[]>`

搜尋並重排序。

**參數：**
- `options.rerankAlgorithm`: 'reciprocal-rank' | 'score-fusion' | 'llm-rerank'

#### `getStats(): Promise<Stats>`

取得統計資訊（文檔數量、成本等）。

#### `deleteDocuments(ids: string[]): Promise<void>`

刪除指定文檔。

#### `clearAll(): Promise<void>`

清空所有文檔。

#### `close(): Promise<void>`

關閉連接。

### 類型定義

```typescript
interface DocumentMetadata {
  source: string;
  title?: string;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
  category?: string;
  tags?: string[];
  language?: string;
}

interface SearchResult {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  score: number;      // 相似度分數 (0-1)
  distance: number;   // 向量距離
}

interface EmbeddingStats {
  totalDocuments: number;
  totalTokens: number;
  totalCost: number;
  averageTokensPerDocument: number;
}
```

## 成本估算

### Embedding 模型價格（per 1M tokens）

| 模型 | 價格 | 維度 | 適用場景 |
|------|------|------|----------|
| text-embedding-3-small | $0.02 | 1536 | 一般用途，性價比高 |
| text-embedding-3-large | $0.13 | 3072 | 高精度需求 |

### 估算範例

```typescript
// 索引 1000 個文檔，平均每個 500 字（約 150 tokens）
// 使用 text-embedding-3-small

總 tokens = 1000 × 150 = 150,000
成本 = (150,000 / 1,000,000) × $0.02 = $0.003
```

## 效能優化

### 1. 批次處理

```typescript
// ✅ 推薦：批次處理
await rag.indexDocuments(docs, { batchSize: 100 });

// ❌ 避免：逐個索引
for (const doc of docs) {
  await rag.indexDocument(doc.content, doc.metadata);
}
```

### 2. 快取搜尋結果

```typescript
// Reranker 自動快取重排序結果
const results = await rag.searchWithRerank(query, {
  rerankAlgorithm: 'reciprocal-rank',
  useCache: true,  // 預設啟用
});
```

### 3. 調整 Embedding 模型

```typescript
// 對於簡單任務，使用 small 模型
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

// 對於複雜/多語言任務，使用 large 模型
OPENAI_EMBEDDING_MODEL=text-embedding-3-large
```

## 執行範例

```bash
# 執行 demo
npm run rag

# 或直接執行
tsx src/agents/rag/demo.ts
```

## 架構設計

```
rag/
├── index.ts          # RAG Agent 主類別
├── vectorstore.ts    # ChromaDB 封裝
├── embeddings.ts     # OpenAI Embeddings 服務
├── reranker.ts       # 結果重排序邏輯
├── types.ts          # 類型定義
├── demo.ts           # 使用範例
└── README.md         # 本文檔
```

### 資料流程

```
文檔輸入
  ↓
EmbeddingService (生成 embeddings)
  ↓
VectorStore (ChromaDB 儲存)
  ↓
搜尋查詢
  ↓
VectorStore (向量相似度搜尋)
  ↓
Reranker (重排序、去重、多樣性優化)
  ↓
最終結果
```

## 故障排除

### ChromaDB 連接失敗

```bash
# 檢查 ChromaDB 是否運行
curl http://localhost:8000/api/v1/heartbeat

# 檢查 Docker 容器
docker ps | grep chromadb

# 重啟 ChromaDB
docker restart chromadb
```

### Embedding API 錯誤

- 確認 `OPENAI_API_KEY` 設置正確
- 檢查 API 用量限制
- 確認網路連接

### 記憶體不足

- 減少 `batchSize`
- 減少 `maxConcurrent`
- 使用 `text-embedding-3-small` 而非 `large`

## 下一步

- [ ] 整合 Claude API 進行 RAG 回答生成
- [ ] 支援多模態（圖片 + 文字）
- [ ] 實作 LLM-based reranking
- [ ] 整合 MCP Memory 持久化
- [ ] 添加分散式部署支援

## 授權

MIT
