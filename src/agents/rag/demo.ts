/**
 * RAG Agent 使用範例
 */

import { RAGAgent } from './index.js';
import type { DocumentMetadata } from './types.js';

/**
 * 基礎範例：索引和搜尋
 */
async function basicExample() {
  console.log('\n=== Basic Example ===\n');

  const rag = new RAGAgent();
  await rag.initialize();

  try {
    // 1. 索引單個文檔
    await rag.indexDocument(
      'TypeScript 是 JavaScript 的超集，添加了靜態類型檢查。它可以編譯成純 JavaScript。',
      {
        source: 'typescript-intro.md',
        language: 'zh-TW',
        title: 'TypeScript 簡介',
        category: 'programming',
        tags: ['typescript', 'javascript', 'programming-language'],
      }
    );

    await rag.indexDocument(
      'React 是一個用於構建用戶界面的 JavaScript 函式庫。它使用虛擬 DOM 來提高性能。',
      {
        source: 'react-intro.md',
        language: 'zh-TW',
        title: 'React 簡介',
        category: 'programming',
        tags: ['react', 'javascript', 'frontend'],
      }
    );

    // 2. 語義搜尋
    const results = await rag.search('什麼是 TypeScript?', { topK: 2 });

    console.log('\n搜尋結果:');
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. Score: ${result.score.toFixed(4)}`);
      console.log(`   Source: ${result.metadata.source}`);
      console.log(`   Content: ${result.content.substring(0, 100)}...`);
    });

    // 3. 取得統計資訊
    const stats = await rag.getStats();
    console.log('\n統計資訊:');
    console.log(`總文檔數: ${stats.documentCount}`);
    console.log(`總成本: $${stats.embeddingStats.totalCost.toFixed(4)}`);
  } finally {
    await rag.close();
  }
}

/**
 * 批次索引範例
 */
async function batchIndexingExample() {
  console.log('\n=== Batch Indexing Example ===\n');

  const rag = new RAGAgent();
  await rag.initialize();

  try {
    // 準備大量文檔
    const documents = [
      {
        content: 'Python 是一種高階程式語言，以其簡潔的語法和強大的功能而聞名。',
        metadata: {
          source: 'python.md',
          title: 'Python 簡介',
          category: 'programming',
          tags: ['python', 'programming-language'],
        } as DocumentMetadata,
      },
      {
        content: 'Docker 是一個開源的容器化平台，可以讓開發者打包應用程式及其依賴。',
        metadata: {
          source: 'docker.md',
          title: 'Docker 簡介',
          category: 'devops',
          tags: ['docker', 'container', 'devops'],
        } as DocumentMetadata,
      },
      {
        content: 'Kubernetes 是一個開源的容器編排系統，用於自動化部署、擴展和管理容器化應用。',
        metadata: {
          source: 'kubernetes.md',
          title: 'Kubernetes 簡介',
          category: 'devops',
          tags: ['kubernetes', 'container', 'orchestration'],
        } as DocumentMetadata,
      },
      {
        content: 'Git 是一個分散式版本控制系統，用於追蹤代碼變更和協作開發。',
        metadata: {
          source: 'git.md',
          title: 'Git 簡介',
          category: 'devops',
          tags: ['git', 'version-control'],
        } as DocumentMetadata,
      },
      {
        content: 'Redis 是一個開源的記憶體資料庫，常用作快取和訊息佇列。',
        metadata: {
          source: 'redis.md',
          title: 'Redis 簡介',
          category: 'database',
          tags: ['redis', 'cache', 'database'],
        } as DocumentMetadata,
      },
    ];

    // 批次索引，包含進度追蹤
    const stats = await rag.indexDocuments(documents, {
      batchSize: 2,
      onProgress: (current, total) => {
        console.log(`進度: ${current}/${total}`);
      },
    });

    console.log('\n索引完成統計:');
    console.log(`文檔總數: ${stats.totalDocuments}`);
    console.log(`Token 總數: ${stats.totalTokens}`);
    console.log(`平均 Token/文檔: ${stats.averageTokensPerDocument}`);
    console.log(`總成本: $${stats.totalCost.toFixed(4)}`);
  } finally {
    await rag.close();
  }
}

/**
 * Hybrid 搜尋範例
 */
async function hybridSearchExample() {
  console.log('\n=== Hybrid Search Example ===\n');

  const rag = new RAGAgent();
  await rag.initialize();

  try {
    // 索引一些文檔
    const documents = [
      {
        content: 'Docker Compose 是一個用於定義和運行多容器 Docker 應用的工具。',
        metadata: {
          source: 'docker-compose.md',
          category: 'devops',
        } as DocumentMetadata,
      },
      {
        content: 'Docker Swarm 是 Docker 原生的集群管理工具。',
        metadata: {
          source: 'docker-swarm.md',
          category: 'devops',
        } as DocumentMetadata,
      },
      {
        content: 'Podman 是 Docker 的替代品，不需要守護進程。',
        metadata: {
          source: 'podman.md',
          category: 'devops',
        } as DocumentMetadata,
      },
    ];

    await rag.indexDocuments(documents);

    // Hybrid 搜尋（語義 + 關鍵字）
    const results = await rag.hybridSearch('Docker 容器管理', {
      topK: 3,
      semanticWeight: 0.7,
      keywordWeight: 0.3,
      keywords: ['Docker', '容器', '管理'],
    });

    console.log('\nHybrid 搜尋結果:');
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. Score: ${result.score.toFixed(4)}`);
      console.log(`   Source: ${result.metadata.source}`);
      console.log(`   Content: ${result.content}`);
    });
  } finally {
    await rag.close();
  }
}

/**
 * 進階搜尋：包含重排序和多樣性
 */
async function advancedSearchExample() {
  console.log('\n=== Advanced Search with Reranking ===\n');

  const rag = new RAGAgent();
  await rag.initialize();

  try {
    // 索引技術文檔
    const documents = [
      {
        content: 'REST API 是一種基於 HTTP 的 API 設計風格。',
        metadata: { source: 'rest-api.md', category: 'api' } as DocumentMetadata,
      },
      {
        content: 'GraphQL 是一種 API 查詢語言，由 Facebook 開發。',
        metadata: { source: 'graphql.md', category: 'api' } as DocumentMetadata,
      },
      {
        content: 'gRPC 是一個高性能的 RPC 框架，使用 Protocol Buffers。',
        metadata: { source: 'grpc.md', category: 'api' } as DocumentMetadata,
      },
      {
        content: 'WebSocket 提供全雙工通訊通道。',
        metadata: { source: 'websocket.md', category: 'api' } as DocumentMetadata,
      },
    ];

    await rag.indexDocuments(documents);

    // 搜尋並重排序
    const results = await rag.searchWithRerank('API 設計', {
      topK: 3,
      rerankAlgorithm: 'reciprocal-rank',
    });

    console.log('\n重排序後的搜尋結果:');
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. Score: ${result.score.toFixed(4)}`);
      console.log(`   Source: ${result.metadata.source}`);
      console.log(`   Content: ${result.content}`);
    });
  } finally {
    await rag.close();
  }
}

/**
 * 執行所有範例
 */
async function runAllExamples() {
  try {
    await basicExample();
    await batchIndexingExample();
    await hybridSearchExample();
    await advancedSearchExample();

    console.log('\n\n✅ 所有範例執行完成！\n');
  } catch (error) {
    console.error('範例執行失敗:', error);
    process.exit(1);
  }
}

// 執行範例
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}

export {
  basicExample,
  batchIndexingExample,
  hybridSearchExample,
  advancedSearchExample,
};
