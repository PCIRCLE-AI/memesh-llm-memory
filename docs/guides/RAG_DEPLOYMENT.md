# RAG Agent 部署指南

本文檔說明如何部署 Advanced RAG Agent（使用 Vectra 本地向量資料庫）。

## 目錄

- [系統需求](#系統需求)
- [本地開發部署](#本地開發部署)
- [生產環境部署](#生產環境部署)
- [效能調優](#效能調優)
- [監控與維護](#監控與維護)
- [故障排除](#故障排除)

## 系統需求

### 最低需求

- **CPU**: 2 核心
- **RAM**: 4 GB
- **硬碟**: 10 GB 可用空間
- **Node.js**: >= 18.0.0

### 推薦配置

- **CPU**: 4+ 核心
- **RAM**: 8+ GB
- **硬碟**: 50+ GB SSD（用於向量資料存儲）
- **網路**: 穩定的網路連接（OpenAI API）

### 軟體依賴

```bash
# Node.js 和 npm
node --version  # >= 18.0.0
npm --version   # >= 9.0.0
```

**就這樣！** Vectra 是純 Node.js 實現，無需 Docker、Python 或其他依賴。

## 本地開發部署

### 1. 環境設置

```bash
# 克隆專案
cd /Users/ktseng/Developer/Projects/smart-agents

# 安裝依賴
npm install

# 配置環境變數
cp .env.example .env
```

### 2. 配置 OpenAI API Key

RAG Agent 使用 OpenAI Embeddings API（穩定可靠）

#### 方式 1：環境變數預先設定

```bash
cp .env.example .env
```

編輯 `.env` 文件：

```env
# OpenAI Embeddings API
OPENAI_API_KEY=sk-xxxxx
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # 可選，預設值
```

**成本參考**：
- text-embedding-3-small: $0.02 / 1M tokens (~62,500 pages of text)
- text-embedding-3-large: $0.13 / 1M tokens (更高品質)

#### 方式 2：使用時互動式設定

如果沒有預先設定 API key，第一次使用時會提示輸入：

```typescript
const rag = new RAGAgent();
await rag.initialize();

// 系統會顯示 RAG 功能說明並提示輸入 API key
```

#### 方式 3：程式碼中啟用

```typescript
const rag = new RAGAgent();
await rag.initialize(); // RAG 功能 disabled

// 稍後啟用
await rag.enableRAG('sk-xxxxx'); // 提供 API key
// 或
await rag.enableRAG(); // 互動式提示
```

### 3. 運行 RAG Agent

```bash
# 執行 demo（會自動創建 data/vectorstore/ 目錄）
npm run rag

# 或直接執行
tsx src/agents/rag/demo.ts
```

向量資料會自動存儲在 `data/vectorstore/` 目錄，無需手動創建。

### 3a. 使用檔案投放功能（可選）

**檔案投放功能** 讓您輕鬆建立知識庫，只需將檔案投放到指定資料夾，RAG Agent 會自動索引。

#### 📂 檔案投放資料夾位置（平台友好）

```bash
# macOS / Linux
~/Documents/smart-agents-knowledge/

# Windows
%USERPROFILE%\Documents\smart-agents-knowledge\
```

**為什麼使用 Documents 資料夾？**
- ✅ 用戶熟悉的位置（跨平台標準）
- ✅ 容易存取和管理
- ✅ 不與專案代碼混在一起
- ✅ 可以跨專案共用知識庫

#### 啟動 File Watcher

```bash
# 啟動 File Watcher（自動創建資料夾）
npm run rag:watch

# 輸出範例：
📁 File Watcher Started
📂 Watching directory: /Users/你的用戶名/Documents/smart-agents-knowledge
📄 Supported extensions: .md, .txt, .json, .pdf, .docx
⏱️  Polling interval: 5000ms (每 5 秒掃描一次)

💡 Tip: Drop your files into this folder and they will be automatically indexed!

📡 File Watcher is running... (Press Ctrl+C to stop)
```

#### 使用流程

1. **啟動 File Watcher**：
   ```bash
   npm run rag:watch
   ```

2. **投放檔案**：
   - 將您的文檔、筆記、代碼文件投放到 `~/Documents/smart-agents-knowledge/`
   - 支援格式：`.md`, `.txt`, `.json`, `.pdf`, `.docx`

3. **自動索引**：
   - File Watcher 每 5 秒掃描一次資料夾
   - 自動檢測並索引新檔案
   - 顯示索引進度和統計

4. **立即可用**：
   - 所有 13 個 agents 立即可以搜尋這些知識
   - 使用語義搜尋找到最相關的資訊

#### 支援的檔案格式

| 格式 | 副檔名 | 說明 |
|------|--------|------|
| Markdown | `.md` | 筆記、文檔 |
| 文字檔 | `.txt` | 純文字內容 |
| JSON | `.json` | 結構化資料 |
| PDF | `.pdf` | PDF 文檔（需額外處理）|
| Word | `.docx` | Word 文檔（需額外處理）|

**注意**：PDF 和 .docx 檔案需要額外的文字提取處理，建議使用 Markdown 或純文字格式以獲得最佳效果。

#### 實例：建立專案知識庫

```bash
# 1. 啟動 File Watcher
npm run rag:watch

# 2. 在另一個終端，投放檔案到資料夾
cp ~/Downloads/project-docs/*.md ~/Documents/smart-agents-knowledge/
cp ~/Downloads/api-specs/*.json ~/Documents/smart-agents-knowledge/

# 3. File Watcher 會自動索引
# 輸出：
🆕 Found 5 new file(s):
   - api-v1-spec.json
   - database-schema.md
   - deployment-guide.md
   - security-guidelines.md
   - troubleshooting.md

📥 Processing batch of 5 file(s)...
   ✅ Indexed: api-v1-spec.json
   ✅ Indexed: database-schema.md
   ✅ Indexed: deployment-guide.md
   ✅ Indexed: security-guidelines.md
   ✅ Indexed: troubleshooting.md
✅ Batch processing complete

✨ Successfully indexed 5 file(s)

# 4. 所有 agents 現在都可以搜尋這些知識
```

#### 進階配置（可選）

如果需要自訂監控行為，可以直接使用 `FileWatcher` API：

```typescript
import { RAGAgent } from './agents/rag/index.js';
import { FileWatcher } from './agents/rag/FileWatcher.js';

const rag = new RAGAgent();
await rag.initialize();

const watcher = new FileWatcher(rag, {
  watchDir: '/custom/path/to/watch',           // 自訂監控資料夾
  supportedExtensions: ['.md', '.txt'],        // 自訂支援格式
  batchSize: 20,                               // 批次大小
  pollingInterval: 10000,                      // 掃描間隔（毫秒）
  onIndexed: (files) => {
    console.log(`Indexed ${files.length} files`);
  },
  onError: (error, file) => {
    console.error(`Error indexing ${file}:`, error);
  },
});

await watcher.start();
```

### 4. 執行測試

```bash
# 執行所有測試
npm test

# 執行 RAG 測試
npm test -- src/agents/rag/rag.test.ts

# 生成覆蓋率報告
npm run test:coverage
```

## 生產環境部署

### 1. 安全配置

#### API Key 管理

```bash
# 使用環境變數（不要寫入 .env 文件）
export OPENAI_API_KEY=sk-xxxxx

# 或使用 secrets management
# - AWS Secrets Manager
# - HashiCorp Vault
# - Kubernetes Secrets
```

#### 檔案系統權限

```bash
# 確保應用程序有權限寫入資料目錄
mkdir -p data/vectorstore
chmod 750 data/vectorstore

# 設置適當的擁有者
chown -R app_user:app_group data/
```

### 2. 資料持久化

#### 備份策略

```bash
# 定期備份向量資料（簡單的 tar 即可）
tar -czf backups/vectorstore-$(date +%Y%m%d).tar.gz data/vectorstore/

# 恢復資料
tar -xzf backups/vectorstore-YYYYMMDD.tar.gz
```

#### 版本控制

```bash
# .gitignore 應包含（已配置）
data/vectorstore/
```

### 3. Process Manager 配置

#### 使用 PM2

```bash
# 安裝 PM2
npm install -g pm2

# 啟動應用
pm2 start npm --name "rag-agent" -- run rag

# 保存配置
pm2 save

# 設置開機啟動
pm2 startup
```

#### PM2 ecosystem 配置

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'rag-agent',
    script: 'npm',
    args: 'run rag',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    }
  }]
};
```

### 4. 監控設置

#### 健康檢查

```typescript
// health-check.ts
import { RAGAgent } from './agents/rag/index.js';

async function healthCheck() {
  const rag = new RAGAgent();
  await rag.initialize();

  const stats = await rag.getStats();
  const isHealthy = stats.totalDocuments >= 0; // 基本檢查

  await rag.close();
  return isHealthy;
}

healthCheck()
  .then(healthy => process.exit(healthy ? 0 : 1))
  .catch(() => process.exit(1));
```

```bash
# Cron 健康檢查（每小時）
0 * * * * cd /path/to/smart-agents && tsx health-check.ts || alert
```

#### 日誌管理

```bash
# 應用日誌
tail -f logs/rag-agent.log

# 錯誤日誌
grep "ERROR" logs/rag-agent.log | tail -20

# 日誌輪轉（使用 logrotate）
cat > /etc/logrotate.d/rag-agent <<EOF
/path/to/smart-agents/logs/*.log {
  daily
  rotate 7
  compress
  delaycompress
  missingok
  notifempty
}
EOF
```

## 效能調優

### 1. Embedding 批次處理

```typescript
// ✅ 推薦：大批次
await rag.indexDocuments(docs, {
  batchSize: 100,
  maxConcurrent: 5,
});

// ❌ 避免：小批次
await rag.indexDocuments(docs, {
  batchSize: 10,
  maxConcurrent: 1,
});
```

### 2. 檔案系統優化

```bash
# 使用 SSD 存儲向量資料
# 確保 data/vectorstore/ 在快速存儲裝置上

# 檢查磁碟 I/O 性能
sudo iotop

# 優化檔案系統（ext4）
sudo tune2fs -O dir_index /dev/sdX
```

### 3. 快取策略

```typescript
// 啟用 reranker 快取
const results = await rag.searchWithRerank(query, {
  rerankAlgorithm: 'reciprocal-rank',
  useCache: true,  // 預設啟用
});
```

### 4. 成本優化

```typescript
// 使用 small 模型（適合大部分場景）
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  // $0.02/1M tokens

// 僅在需要高精度時使用 large 模型
OPENAI_EMBEDDING_MODEL=text-embedding-3-large  // $0.13/1M tokens
```

### 5. 記憶體管理

```typescript
// 對於大量文檔，使用流式處理
async function indexLargeDataset(docs: DocumentInput[]) {
  const chunkSize = 1000;

  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize);
    await rag.indexDocuments(chunk, {
      batchSize: 100,
      maxConcurrent: 5,
    });

    console.log(`Indexed ${i + chunk.length}/${docs.length} documents`);

    // 釋放記憶體
    if (global.gc) global.gc();
  }
}
```

## 監控與維護

### 1. 成本監控

```typescript
// 定期檢查成本
const stats = await rag.getStats();
console.log(`Current cost: $${stats.embeddingStats.totalCost.toFixed(4)}`);

// 設置成本警報
const MONTHLY_BUDGET_USD = 50;
if (stats.embeddingStats.totalCost > MONTHLY_BUDGET_USD * 0.8) {
  console.warn('⚠️ 80% of monthly budget reached!');
  // 發送警報（email, Slack, etc.）
}
```

### 2. 效能監控

```typescript
// 追蹤搜尋延遲
const startTime = Date.now();
const results = await rag.search(query);
const latency = Date.now() - startTime;

console.log(`Search latency: ${latency}ms`);

// 記錄到監控系統（Prometheus, DataDog, etc.）
```

### 3. 定期維護

```bash
# 每週備份
0 0 * * 0 /path/to/backup-vectorstore.sh

# 每月清理舊資料（如需要）
0 0 1 * * /path/to/cleanup-old-data.sh

# 每日健康檢查
0 */6 * * * tsx /path/to/health-check.ts || alert
```

### 4. 資料完整性檢查

```typescript
// 定期檢查向量資料完整性
import { LocalIndex } from 'vectra';

async function checkIntegrity() {
  const index = new LocalIndex('data/vectorstore');

  if (!(await index.isIndexCreated())) {
    console.error('❌ Index not found!');
    return false;
  }

  console.log('✅ Index integrity OK');
  return true;
}
```

## 故障排除

### 問題 1: 向量資料庫初始化失敗

**症狀**: `VectorStore initialization failed`

**解決方案**:

```bash
# 1. 檢查目錄權限
ls -la data/vectorstore/

# 2. 確保目錄存在且可寫
mkdir -p data/vectorstore
chmod 750 data/vectorstore

# 3. 檢查磁碟空間
df -h

# 4. 如果資料損毀，刪除並重建
rm -rf data/vectorstore/
# 重新運行應用，會自動創建新 index
```

### 問題 2: Embedding API 速率限制

**症狀**: `Rate limit exceeded`

**解決方案**:

```typescript
// 減少並發請求
await rag.indexDocuments(docs, {
  batchSize: 50,     // 從 100 減少到 50
  maxConcurrent: 2,  // 從 5 減少到 2
});

// 添加重試邏輯
async function indexWithRetry(docs, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await rag.indexDocuments(docs);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(2000 * (i + 1)); // 指數退避
    }
  }
}
```

### 問題 3: 記憶體不足

**症狀**: `JavaScript heap out of memory`

**解決方案**:

```bash
# 增加 Node.js 記憶體限制
NODE_OPTIONS="--max-old-space-size=4096" npm run rag
```

```typescript
// 減少批次大小
await rag.indexDocuments(docs, {
  batchSize: 20,  // 減少記憶體使用
});

// 使用流式處理大量文檔
// 見「效能調優 -> 記憶體管理」章節
```

### 問題 4: 搜尋結果不準確

**症狀**: 搜尋結果相關性差

**解決方案**:

```typescript
// 1. 使用 hybrid search
const results = await rag.hybridSearch(query, {
  semanticWeight: 0.7,
  keywordWeight: 0.3,
});

// 2. 調整 topK 和重排序
const results = await rag.searchWithRerank(query, {
  topK: 20,  // 先獲取更多結果
  rerankAlgorithm: 'reciprocal-rank',
});

// 3. 升級到 large 模型
OPENAI_EMBEDDING_MODEL=text-embedding-3-large
```

### 問題 5: 磁碟空間不足

**症狀**: `ENOSPC: no space left on device`

**解決方案**:

```bash
# 檢查磁碟使用
du -sh data/vectorstore/

# 清理舊的向量資料（謹慎！）
await rag.clearAll();

# 或刪除特定文檔
const oldDocIds = [...];  // 獲取舊文檔 ID
await rag.deleteDocuments(oldDocIds);

# 壓縮資料目錄（備份）
tar -czf vectorstore-backup.tar.gz data/vectorstore/
```

### 問題 6: 檔案權限錯誤

**症狀**: `EACCES: permission denied`

**解決方案**:

```bash
# 修正擁有者
chown -R $USER:$USER data/vectorstore/

# 修正權限
chmod -R 750 data/vectorstore/
```

## 部署檢查清單

完整的 RAG Agent 部署流程：

- [ ] ✅ 環境準備（Node.js >= 18）
- [ ] ✅ 安裝依賴（`npm install`）
- [ ] ✅ 配置 OpenAI API Key
- [ ] ✅ 設置資料目錄權限
- [ ] ✅ 執行測試驗證（`npm test`）
- [ ] ✅ 配置 Process Manager（PM2）
- [ ] ✅ 設置備份腳本
- [ ] ✅ 配置監控和警報
- [ ] ✅ 設置日誌輪轉
- [ ] ✅ 執行健康檢查

## 技術架構說明

### Vectra 向量資料庫

Smart-Agents RAG 使用 Vectra 作為向量資料庫：

| 特性 | 說明 |
|------|------|
| **部署** | 零配置，npm install 即可 |
| **依賴** | 純 Node.js，零額外依賴 |
| **資料存儲** | 本地檔案（data/vectorstore/） |
| **備份** | 簡單 tar 壓縮即可 |
| **性能** | < 100ms (本地檔案存取) |
| **維護** | 零維護成本 |
| **基礎設施成本** | $0 |

**選擇 Vectra 的原因**：簡單、快速、零維護成本。

### OpenAI Embeddings API

使用 OpenAI Embeddings API 的優勢：

- ✅ **穩定可靠** - 官方維護的 API，穩定性高
- ✅ **簡單整合** - 官方 SDK 支援完善
- ✅ **高品質** - text-embedding-3-small/large 模型品質優秀
- ✅ **成本實惠** - $0.02 / 1M tokens，約 62,500 頁文本
- ✅ **無需維護** - 雲端服務，無需自行部署

## 生產環境建議

### 小型部署（< 100K 文檔）
- 使用單機 Vectra 部署
- PM2 管理進程
- 定期備份到 S3/NAS

### 中型部署（100K - 1M 文檔）
- 使用 SSD 存儲
- 增加 Node.js 記憶體限制
- 實施分片策略（多個 Vectra index）

### 大型部署（> 1M 文檔）
- 考慮分散式向量資料庫（Qdrant, Weaviate）
- 實施快取層（Redis）
- 使用 CDN 加速查詢

## 總結

Vectra 部署的優勢：

✅ **零配置** - npm install 即可開始
✅ **零維護** - 無需管理 Docker 容器
✅ **快速** - 本地檔案存取，< 100ms 延遲
✅ **簡單備份** - tar 壓縮即可
✅ **低成本** - 無額外基礎設施成本

如有問題，請參考 [故障排除](#故障排除) 章節或提交 Issue。
