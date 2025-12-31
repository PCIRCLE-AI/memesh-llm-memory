# RAG Agent 整合指南

本指南說明如何將 RAG Agent 整合到 Claude Code Buddy 生態系統中。

## 目錄

- [與 Agent Orchestrator 整合](#與-agent-orchestrator-整合)
- [與 MCP Memory 整合](#與-mcp-memory-整合)
- [與 Claude API 整合](#與-claude-api-整合)
- [實戰案例](#實戰案例)
- [最佳實踐](#最佳實踐)

## 與 Agent Orchestrator 整合

### 1. 註冊 RAG Agent

```typescript
// src/orchestrator/index.ts
import { getRAGAgent } from '../agents/rag/index.js';

class AgentOrchestrator {
  private ragAgent: RAGAgent;

  async initialize() {
    // 初始化 RAG Agent
    this.ragAgent = await getRAGAgent();
    console.log('RAG Agent registered');
  }

  async handleRAGTask(task: Task): Promise<Response> {
    // 路由到 RAG Agent
    const results = await this.ragAgent.search(task.query, {
      topK: 5,
    });

    return {
      results,
      metadata: {
        agent: 'rag',
        cost: this.ragAgent.getStats().embeddingStats.totalCost,
      },
    };
  }
}
```

### 2. 任務路由邏輯

```typescript
// 根據任務類型自動路由
async routeTask(task: Task): Promise<Response> {
  // 檢測是否為檢索任務
  const isRetrievalTask = this.detectRetrievalIntent(task.query);

  if (isRetrievalTask) {
    // 使用 RAG Agent
    const results = await this.ragAgent.search(task.query);

    // 使用檢索結果增強 Claude prompt
    const context = results.map(r => r.content).join('\n\n');
    const enhancedPrompt = `
      Context:
      ${context}

      Question: ${task.query}

      Please answer based on the provided context.
    `;

    return await this.claudeAgent.complete(enhancedPrompt);
  }

  // 其他任務類型...
}

// 檢測檢索意圖
private detectRetrievalIntent(query: string): boolean {
  const retrievalKeywords = [
    '搜尋', '查找', '尋找', 'search', 'find',
    '什麼是', '解釋', 'what is', 'explain',
    '如何', 'how to', '怎麼',
  ];

  return retrievalKeywords.some(keyword =>
    query.toLowerCase().includes(keyword.toLowerCase())
  );
}
```

## 與 MCP Memory 整合

### 1. 持久化知識庫

```typescript
import { getRAGAgent } from '../agents/rag/index.js';

class KnowledgeManager {
  private rag: RAGAgent;

  async initialize() {
    this.rag = await getRAGAgent();
  }

  /**
   * 從 MCP Memory 同步到 RAG
   */
  async syncFromMCPMemory() {
    // 使用 MCP Memory 工具檢索記憶
    const memories = await mcp__memory__memory_list({
      type: 'knowledge',
    });

    // 轉換為文檔格式
    const documents = memories.map(memory => ({
      content: JSON.stringify(memory.content),
      metadata: {
        source: 'mcp-memory',
        type: memory.type,
        createdAt: memory.timestamp,
        tags: memory.tags || [],
      },
      id: memory.id,
    }));

    // 批次索引到 RAG
    const stats = await this.rag.indexDocuments(documents);

    console.log(`Synced ${stats.totalDocuments} memories to RAG`);
    return stats;
  }

  /**
   * 從 RAG 搜尋結果儲存到 MCP Memory
   */
  async saveSearchToMemory(query: string, results: SearchResult[]) {
    const memoryContent = {
      query,
      results: results.map(r => ({
        content: r.content,
        score: r.score,
        source: r.metadata.source,
      })),
      timestamp: new Date().toISOString(),
    };

    await mcp__memory__memory_create({
      type: 'rag-search-history',
      content: memoryContent,
      source: 'rag-agent',
      confidence: results[0]?.score || 0,
      tags: ['search', 'rag'],
    });
  }
}
```

### 2. 雙向同步

```typescript
/**
 * 學習循環：RAG ↔ MCP Memory
 */
async learningCycle() {
  // 1. 從 MCP Memory 載入新知識
  await this.syncFromMCPMemory();

  // 2. 執行搜尋
  const results = await this.rag.search(query);

  // 3. 儲存搜尋歷史到 MCP Memory
  await this.saveSearchToMemory(query, results);

  // 4. 如果找到高品質結果，標記為重要知識
  if (results[0]?.score > 0.9) {
    await mcp__MCP_DOCKER__create_entities({
      entities: [{
        name: `High-Quality-Knowledge-${Date.now()}`,
        entityType: 'verified_knowledge',
        observations: [
          `Query: ${query}`,
          `Best result: ${results[0].content}`,
          `Score: ${results[0].score}`,
        ],
      }],
    });
  }
}
```

## 與 Claude API 整合

### 1. RAG-enhanced Claude 對話

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { getRAGAgent } from '../agents/rag/index.js';

class RAGEnhancedClaude {
  private claude: Anthropic;
  private rag: RAGAgent;

  constructor() {
    this.claude = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async initialize() {
    this.rag = await getRAGAgent();
  }

  /**
   * RAG-enhanced 對話
   */
  async chat(userMessage: string): Promise<string> {
    // 1. 使用 RAG 檢索相關知識
    const retrievedDocs = await this.rag.searchWithRerank(userMessage, {
      topK: 3,
      rerankAlgorithm: 'reciprocal-rank',
    });

    // 2. 構建增強的 prompt
    const context = retrievedDocs
      .map((doc, i) => `
        [Document ${i + 1}] (Score: ${doc.score.toFixed(2)})
        Source: ${doc.metadata.source}
        Content: ${doc.content}
      `)
      .join('\n\n');

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: `
          以下是相關的背景知識：

          ${context}

          ---

          用戶問題：${userMessage}

          請基於上述背景知識回答用戶問題。如果背景知識不足以回答問題，請明確說明。
        `,
      },
    ];

    // 3. 呼叫 Claude API
    const response = await this.claude.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages,
    });

    // 4. 提取回答
    const answer = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    // 5. 記錄成本
    const ragCost = this.rag.getCostTracker().estimatedCost;
    const claudeCost = this.estimateClaudeCost(response.usage);

    console.log(`Total cost: RAG $${ragCost.toFixed(4)} + Claude $${claudeCost.toFixed(4)}`);

    return answer;
  }

  private estimateClaudeCost(usage: any): number {
    // Claude Sonnet 4.5 pricing (2025)
    const inputPrice = 0.003;   // per 1K tokens
    const outputPrice = 0.015;  // per 1K tokens

    const inputCost = (usage.input_tokens / 1000) * inputPrice;
    const outputCost = (usage.output_tokens / 1000) * outputPrice;

    return inputCost + outputCost;
  }
}
```

### 2. 迭代式 RAG

```typescript
/**
 * 迭代式 RAG：多輪檢索和精煉
 */
async iterativeRAG(query: string, maxIterations = 3): Promise<string> {
  let currentQuery = query;
  let allRetrievedDocs: SearchResult[] = [];

  for (let i = 0; i < maxIterations; i++) {
    console.log(`Iteration ${i + 1}: ${currentQuery}`);

    // 1. 檢索
    const docs = await this.rag.search(currentQuery, { topK: 5 });
    allRetrievedDocs.push(...docs);

    // 2. 使用 Claude 分析檢索結果
    const analysis = await this.claude.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `
          原始問題: ${query}
          當前檢索結果:
          ${docs.map(d => d.content).join('\n')}

          這些結果是否足以回答問題？
          如果不足，請生成一個更好的搜尋查詢。
          如果足夠，回答 "SUFFICIENT"。
        `,
      }],
    });

    const analysisText = analysis.content[0].type === 'text'
      ? analysis.content[0].text
      : '';

    // 3. 檢查是否需要繼續迭代
    if (analysisText.includes('SUFFICIENT')) {
      break;
    }

    // 4. 提取新的查詢
    currentQuery = analysisText;
  }

  // 5. 使用所有檢索結果生成最終答案
  const uniqueDocs = this.deduplicateDocs(allRetrievedDocs);
  const finalContext = uniqueDocs.map(d => d.content).join('\n\n');

  const finalAnswer = await this.claude.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `
        Context: ${finalContext}
        Question: ${query}

        Please provide a comprehensive answer.
      `,
    }],
  });

  return finalAnswer.content[0].type === 'text'
    ? finalAnswer.content[0].text
    : '';
}

private deduplicateDocs(docs: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return docs.filter(doc => {
    const hash = this.simpleHash(doc.content);
    if (seen.has(hash)) return false;
    seen.add(hash);
    return true;
  });
}
```

## 實戰案例

### 案例 1: 技術文檔助手

```typescript
class TechDocsAssistant {
  private rag: RAGAgent;
  private claude: RAGEnhancedClaude;

  async initialize() {
    this.rag = await getRAGAgent();
    this.claude = new RAGEnhancedClaude();
    await this.claude.initialize();

    // 索引技術文檔
    await this.indexTechDocs();
  }

  /**
   * 索引技術文檔
   */
  private async indexTechDocs() {
    const docPaths = [
      './docs/typescript-handbook.md',
      './docs/react-docs.md',
      './docs/node-api.md',
      // ... more docs
    ];

    const documents = [];

    for (const path of docPaths) {
      const content = await fs.readFile(path, 'utf-8');

      // 分割成段落（簡化版）
      const paragraphs = content.split('\n\n').filter(p => p.trim().length > 50);

      paragraphs.forEach((paragraph, index) => {
        documents.push({
          content: paragraph,
          metadata: {
            source: path,
            category: 'tech-docs',
            section: index,
          },
        });
      });
    }

    const stats = await this.rag.indexDocuments(documents, {
      batchSize: 100,
      onProgress: (current, total) => {
        console.log(`Indexing: ${current}/${total}`);
      },
    });

    console.log(`Indexed ${stats.totalDocuments} document chunks`);
    console.log(`Cost: $${stats.totalCost.toFixed(4)}`);
  }

  /**
   * 回答技術問題
   */
  async answerQuestion(question: string): Promise<string> {
    return await this.claude.chat(question);
  }
}

// 使用
const assistant = new TechDocsAssistant();
await assistant.initialize();

const answer = await assistant.answerQuestion(
  'How do I use React hooks with TypeScript?'
);
console.log(answer);
```

### 案例 2: 程式碼搜尋引擎

```typescript
class CodeSearchEngine {
  private rag: RAGAgent;

  async initialize() {
    this.rag = await getRAGAgent();
  }

  /**
   * 索引程式碼庫
   */
  async indexCodebase(rootPath: string) {
    const files = await this.findCodeFiles(rootPath);
    const documents = [];

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');

      // 分割成函數/類別
      const codeBlocks = this.extractCodeBlocks(content);

      codeBlocks.forEach(block => {
        documents.push({
          content: block.code,
          metadata: {
            source: file,
            type: block.type, // 'function' | 'class' | 'interface'
            name: block.name,
            language: this.detectLanguage(file),
            category: 'code',
          },
        });
      });
    }

    return await this.rag.indexDocuments(documents);
  }

  /**
   * 搜尋程式碼
   */
  async searchCode(query: string, options?: {
    language?: string;
    type?: string;
  }): Promise<SearchResult[]> {
    const filter: any = { category: 'code' };

    if (options?.language) {
      filter.language = options.language;
    }

    if (options?.type) {
      filter.type = options.type;
    }

    return await this.rag.hybridSearch(query, {
      topK: 10,
      filter,
    });
  }

  private async findCodeFiles(rootPath: string): Promise<string[]> {
    // 使用 glob 或遞迴搜尋
    // 實作略
    return [];
  }

  private extractCodeBlocks(content: string): any[] {
    // 解析程式碼並提取函數/類別
    // 實作略（可使用 AST parser）
    return [];
  }

  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop();
    const langMap: Record<string, string> = {
      ts: 'typescript',
      js: 'javascript',
      py: 'python',
      // ... more
    };
    return langMap[ext || ''] || 'unknown';
  }
}
```

### 案例 3: 對話式學習助手

```typescript
class ConversationalLearningAssistant {
  private rag: RAGAgent;
  private claude: Anthropic;
  private conversationHistory: Anthropic.MessageParam[] = [];

  async chat(userMessage: string): Promise<string> {
    // 1. 檢索相關知識
    const docs = await this.rag.search(userMessage, { topK: 3 });

    // 2. 添加到對話歷史
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    // 3. 構建系統 prompt
    const systemPrompt = `
      你是一個學習助手。以下是相關的背景知識：

      ${docs.map(d => d.content).join('\n\n')}

      請基於這些知識幫助用戶學習，使用蘇格拉底式提問引導思考。
    `;

    // 4. 呼叫 Claude
    const response = await this.claude.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1000,
      system: systemPrompt,
      messages: this.conversationHistory,
    });

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    // 5. 添加回答到歷史
    this.conversationHistory.push({
      role: 'assistant',
      content: assistantMessage,
    });

    return assistantMessage;
  }

  reset() {
    this.conversationHistory = [];
  }
}
```

## 最佳實踐

### 1. 文檔分割策略

```typescript
/**
 * 智能文檔分割
 */
function splitDocument(content: string, options = {
  maxChunkSize: 500,    // 最大 token 數
  overlap: 50,          // 重疊 token 數
}): string[] {
  const chunks: string[] = [];

  // 按段落分割
  const paragraphs = content.split('\n\n');

  let currentChunk = '';
  let currentSize = 0;

  for (const paragraph of paragraphs) {
    const paragraphSize = estimateTokens(paragraph);

    if (currentSize + paragraphSize > options.maxChunkSize && currentChunk) {
      // 保存當前 chunk
      chunks.push(currentChunk);

      // 添加重疊部分
      const words = currentChunk.split(' ');
      const overlapText = words.slice(-options.overlap).join(' ');

      currentChunk = overlapText + ' ' + paragraph;
      currentSize = estimateTokens(currentChunk);
    } else {
      currentChunk += '\n\n' + paragraph;
      currentSize += paragraphSize;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}
```

### 2. 增量索引

```typescript
/**
 * 增量更新：只索引新文檔
 */
async function incrementalIndex(
  rag: RAGAgent,
  newDocs: Document[]
): Promise<void> {
  // 檢查哪些文檔已存在
  const existingDocs = await rag.search('', { topK: 10000 });
  const existingSources = new Set(existingDocs.map(d => d.metadata.source));

  // 過濾出新文檔
  const docsToIndex = newDocs.filter(
    doc => !existingSources.has(doc.metadata.source)
  );

  if (docsToIndex.length === 0) {
    console.log('No new documents to index');
    return;
  }

  console.log(`Indexing ${docsToIndex.length} new documents`);
  await rag.indexDocuments(docsToIndex);
}
```

### 3. 成本控制

```typescript
/**
 * 預算感知的索引
 */
async function budgetAwareIndexing(
  rag: RAGAgent,
  docs: Document[],
  monthlyBudget: number
): Promise<void> {
  // 估算成本
  const estimatedCost = rag.embeddings.estimateCost(
    docs.map(d => d.content)
  );

  console.log(`Estimated cost: $${estimatedCost.toFixed(4)}`);

  // 檢查當前月份使用量
  const currentUsage = await getCurrentMonthUsage();

  if (currentUsage + estimatedCost > monthlyBudget) {
    throw new Error(
      `Indexing would exceed monthly budget ($${monthlyBudget}). ` +
      `Current: $${currentUsage}, Estimated: $${estimatedCost}`
    );
  }

  // 執行索引
  await rag.indexDocuments(docs);
}
```

### 4. 監控和告警

```typescript
/**
 * RAG 效能監控
 */
class RAGMonitor {
  private metrics = {
    searches: 0,
    averageLatency: 0,
    totalCost: 0,
  };

  async monitoredSearch(
    rag: RAGAgent,
    query: string
  ): Promise<SearchResult[]> {
    const startTime = Date.now();

    try {
      const results = await rag.search(query);

      // 更新指標
      const latency = Date.now() - startTime;
      this.updateMetrics(latency);

      // 檢查異常
      if (latency > 5000) {
        console.warn(`⚠️ Slow search detected: ${latency}ms`);
      }

      return results;
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  private updateMetrics(latency: number) {
    this.metrics.searches++;
    this.metrics.averageLatency =
      (this.metrics.averageLatency * (this.metrics.searches - 1) + latency) /
      this.metrics.searches;
  }

  getMetrics() {
    return { ...this.metrics };
  }
}
```

## 總結

RAG Agent 可以與 Claude Code Buddy 生態系統無縫整合：

1. ✅ **Agent Orchestrator**: 智能任務路由
2. ✅ **MCP Memory**: 雙向知識同步
3. ✅ **Claude API**: RAG-enhanced 對話
4. ✅ **監控系統**: 成本和效能追蹤

遵循最佳實踐，可以構建高效、經濟、可靠的 RAG 應用。
