# RAG Agent 部署指南

本文檔說明如何部署 Advanced RAG Agent，包含本地開發和生產環境配置。

## 目錄

- [系統需求](#系統需求)
- [本地開發部署](#本地開發部署)
- [Docker 部署](#docker-部署)
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
- **Docker**: >= 20.10 (如使用 Docker 部署)

### 推薦配置

- **CPU**: 4+ 核心
- **RAM**: 8+ GB
- **硬碟**: 50+ GB SSD
- **網路**: 穩定的網路連接（OpenAI API）

### 軟體依賴

```bash
# Node.js 和 npm
node --version  # >= 18.0.0
npm --version   # >= 9.0.0

# Docker (可選)
docker --version
docker-compose --version
```

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

### 2. 配置 .env

```env
# OpenAI API
OPENAI_API_KEY=sk-xxxxx
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# ChromaDB
CHROMA_HOST=localhost
CHROMA_PORT=8000
CHROMA_COLLECTION_NAME=smart_agents_kb
```

### 3. 啟動 ChromaDB

#### 選項 A: Docker (推薦)

```bash
docker-compose -f docker-compose.rag.yml up -d

# 驗證啟動
curl http://localhost:8000/api/v1/heartbeat
```

#### 選項 B: 本地安裝

```bash
# 安裝 ChromaDB
pip install chromadb

# 啟動 ChromaDB server
chroma run --path ./chromadb_data --port 8000
```

### 4. 運行 RAG Agent

```bash
# 執行 demo
npm run rag

# 或直接執行
tsx src/agents/rag/demo.ts
```

### 5. 執行測試

```bash
# 執行所有測試
npm test

# 執行 RAG 測試
npm test -- src/agents/rag/rag.test.ts

# 生成覆蓋率報告
npm run test:coverage
```

## Docker 部署

### 完整 Docker Compose 設置

```yaml
# docker-compose.yml
version: '3.8'

services:
  chromadb:
    image: chromadb/chroma:latest
    container_name: smart-agents-chromadb
    ports:
      - "8000:8000"
    volumes:
      - chromadb_data:/chroma/chroma
    environment:
      - IS_PERSISTENT=TRUE
      - ANONYMIZED_TELEMETRY=FALSE
    restart: unless-stopped

  smart-agents:
    build: .
    container_name: smart-agents-app
    depends_on:
      - chromadb
    environment:
      - CHROMA_HOST=chromadb
      - CHROMA_PORT=8000
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./src:/app/src
      - ./data:/app/data
    restart: unless-stopped

volumes:
  chromadb_data:
```

### 啟動服務

```bash
# 啟動所有服務
docker-compose up -d

# 查看日誌
docker-compose logs -f

# 停止服務
docker-compose down

# 停止並刪除資料
docker-compose down -v
```

### 資料持久化

```bash
# 備份 ChromaDB 資料
docker run --rm \
  -v smart-agents_chromadb_data:/data \
  -v $(pwd)/backups:/backup \
  ubuntu tar cvf /backup/chromadb-backup-$(date +%Y%m%d).tar /data

# 恢復資料
docker run --rm \
  -v smart-agents_chromadb_data:/data \
  -v $(pwd)/backups:/backup \
  ubuntu tar xvf /backup/chromadb-backup-YYYYMMDD.tar -C /
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

#### 網路安全

```yaml
# 限制 ChromaDB 僅接受內部連接
services:
  chromadb:
    networks:
      - internal
    # 不暴露到外部網路
```

### 2. 效能優化

#### ChromaDB 配置

```yaml
environment:
  - CHROMA_SERVER_HTTP_PORT=8000
  - CHROMA_SERVER_CORS_ALLOW_ORIGINS=["*"]
  - PERSIST_DIRECTORY=/chroma/chroma
  - ALLOW_RESET=FALSE
```

#### 資源限制

```yaml
services:
  chromadb:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

### 3. 監控設置

#### 健康檢查

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/heartbeat"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

#### 日誌管理

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### 4. 高可用性配置

#### 多實例部署

```yaml
services:
  chromadb:
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
```

#### 負載平衡

```bash
# 使用 Nginx 作為反向代理
upstream chromadb_backend {
    server chromadb-1:8000;
    server chromadb-2:8000;
    server chromadb-3:8000;
}
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

### 2. ChromaDB 索引優化

```python
# 調整 HNSW 參數
collection = client.create_collection(
    name="my_collection",
    metadata={
        "hnsw:space": "cosine",
        "hnsw:construction_ef": 200,  # 建構時的精度
        "hnsw:M": 16,                 # 連接數
        "hnsw:search_ef": 100,        # 搜尋時的精度
    }
)
```

### 3. 快取策略

```typescript
// 啟用 reranker 快取
const results = await rag.searchWithRerank(query, {
  rerankAlgorithm: 'reciprocal-rank',
  useCache: true,
});
```

### 4. 成本優化

```typescript
// 使用 small 模型（適合大部分場景）
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  // $0.02/1M tokens

// 僅在需要高精度時使用 large 模型
OPENAI_EMBEDDING_MODEL=text-embedding-3-large  // $0.13/1M tokens
```

## 監控與維護

### 1. 成本監控

```typescript
// 定期檢查成本
const stats = await rag.getStats();
console.log(`Current cost: $${stats.embeddingStats.totalCost.toFixed(4)}`);

// 設置成本警報
if (stats.embeddingStats.totalCost > MONTHLY_BUDGET_USD * 0.8) {
  console.warn('⚠️ 80% of monthly budget reached!');
}
```

### 2. 效能監控

```typescript
// 追蹤搜尋延遲
const startTime = Date.now();
const results = await rag.search(query);
const latency = Date.now() - startTime;

console.log(`Search latency: ${latency}ms`);
```

### 3. 定期維護

```bash
# 每週備份
0 0 * * 0 /path/to/backup-chromadb.sh

# 每月清理舊資料
0 0 1 * * /path/to/cleanup-old-data.sh

# 每日健康檢查
0 */6 * * * curl http://localhost:8000/api/v1/heartbeat || alert
```

### 4. 日誌分析

```bash
# ChromaDB 日誌
docker logs smart-agents-chromadb --tail 100

# 應用日誌
tail -f logs/rag-agent.log

# 錯誤日誌
grep "ERROR" logs/rag-agent.log | tail -20
```

## 故障排除

### 問題 1: ChromaDB 連接失敗

**症狀**: `Failed to connect to ChromaDB`

**解決方案**:

```bash
# 1. 檢查 ChromaDB 是否運行
curl http://localhost:8000/api/v1/heartbeat

# 2. 檢查 Docker 容器狀態
docker ps | grep chromadb

# 3. 查看容器日誌
docker logs smart-agents-chromadb

# 4. 重啟服務
docker-compose restart chromadb
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

**症狀**: `Out of memory`

**解決方案**:

```bash
# 增加 Docker 記憶體限制
docker update --memory 8g smart-agents-chromadb

# 或修改 docker-compose.yml
services:
  chromadb:
    mem_limit: 8g
```

```typescript
// 減少批次大小
await rag.indexDocuments(docs, {
  batchSize: 20,  // 減少記憶體使用
});
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

### 問題 5: 資料損毀

**症狀**: Collection 無法載入

**解決方案**:

```bash
# 1. 從備份恢復
docker run --rm \
  -v smart-agents_chromadb_data:/data \
  -v $(pwd)/backups:/backup \
  ubuntu tar xvf /backup/chromadb-backup-YYYYMMDD.tar -C /

# 2. 重建 collection
```

```typescript
// 清空並重新索引
await rag.clearAll();
await rag.indexDocuments(allDocuments);
```

## 進階配置

### 分散式部署

```yaml
# 使用 Kubernetes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chromadb
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: chromadb
        image: chromadb/chroma:latest
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
```

### CI/CD 整合

```yaml
# .github/workflows/rag-deploy.yml
name: Deploy RAG Agent

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Build and deploy
        run: |
          docker-compose -f docker-compose.rag.yml build
          docker-compose -f docker-compose.rag.yml up -d

      - name: Run health check
        run: |
          sleep 10
          curl -f http://localhost:8000/api/v1/heartbeat
```

## 總結

完整的 RAG Agent 部署流程：

1. ✅ 環境準備（Node.js, Docker, OpenAI API）
2. ✅ 啟動 ChromaDB（Docker Compose 推薦）
3. ✅ 配置環境變數（.env 或 secrets）
4. ✅ 執行測試驗證
5. ✅ 設置監控和警報
6. ✅ 定期備份和維護

如有問題，請參考 [故障排除](#故障排除) 章節或提交 Issue。
