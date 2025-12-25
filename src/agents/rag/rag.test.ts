/**
 * RAG Agent 測試
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { RAGAgent, EmbeddingService, VectorStore, Reranker } from './index.js';
import type { DocumentMetadata, SearchResult } from './types.js';

describe('EmbeddingService', () => {
  let embeddings: EmbeddingService;

  beforeAll(() => {
    embeddings = new EmbeddingService();
  });

  it('should create embedding for single text', async () => {
    const text = 'This is a test sentence';
    const embedding = await embeddings.createEmbedding(text);

    expect(embedding).toBeDefined();
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBe(1536); // text-embedding-3-small dimension
  });

  it('should create embeddings for batch', async () => {
    const texts = ['First sentence', 'Second sentence', 'Third sentence'];
    const embeddingsBatch = await embeddings.createEmbeddingsBatch(texts);

    expect(embeddingsBatch).toBeDefined();
    expect(embeddingsBatch.length).toBe(3);
    embeddingsBatch.forEach((emb) => {
      expect(emb.length).toBe(1536);
    });
  });

  it('should calculate cosine similarity', () => {
    const a = [1, 0, 0];
    const b = [1, 0, 0];
    const c = [0, 1, 0];

    const similarity1 = embeddings.cosineSimilarity(a, b);
    const similarity2 = embeddings.cosineSimilarity(a, c);

    expect(similarity1).toBeCloseTo(1.0, 5); // Same vectors
    expect(similarity2).toBeCloseTo(0.0, 5); // Orthogonal vectors
  });

  it('should estimate tokens', () => {
    const text = 'This is a test';
    const tokens = embeddings.estimateTokens(text);

    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(text.length); // Rough estimate
  });

  it('should track costs', async () => {
    const initialTracker = embeddings.getCostTracker();
    const initialCalls = initialTracker.embeddingCalls;

    await embeddings.createEmbedding('Test text');

    const updatedTracker = embeddings.getCostTracker();
    expect(updatedTracker.embeddingCalls).toBe(initialCalls + 1);
    expect(updatedTracker.totalTokens).toBeGreaterThan(0);
    expect(updatedTracker.estimatedCost).toBeGreaterThan(0);
  });

  it('should reset cost tracker', () => {
    embeddings.resetCostTracker();
    const tracker = embeddings.getCostTracker();

    expect(tracker.embeddingCalls).toBe(0);
    expect(tracker.totalTokens).toBe(0);
    expect(tracker.estimatedCost).toBe(0);
  });
});

describe('VectorStore', () => {
  let vectorStore: VectorStore;

  beforeAll(async () => {
    vectorStore = new VectorStore();
    await vectorStore.initialize();
  });

  afterAll(async () => {
    await vectorStore.close();
  });

  beforeEach(async () => {
    await vectorStore.clear();
  });

  it('should initialize successfully', async () => {
    const isHealthy = await vectorStore.healthCheck();
    expect(isHealthy).toBe(true);
  });

  it('should add and count documents', async () => {
    const doc = {
      content: 'Test document',
      metadata: { source: 'test.md' } as DocumentMetadata,
      embedding: new Array(1536).fill(0.1),
    };

    await vectorStore.addDocument(doc);
    const count = await vectorStore.count();

    expect(count).toBe(1);
  });

  it('should add multiple documents in batch', async () => {
    const docs = Array.from({ length: 5 }, (_, i) => ({
      content: `Document ${i}`,
      metadata: { source: `doc${i}.md` } as DocumentMetadata,
      embedding: new Array(1536).fill(0.1 * (i + 1)),
    }));

    await vectorStore.addDocuments(docs);
    const count = await vectorStore.count();

    expect(count).toBe(5);
  });

  it('should search with embeddings', async () => {
    // Add test documents
    const docs = [
      {
        content: 'TypeScript is great',
        metadata: { source: 'ts.md' } as DocumentMetadata,
        embedding: new Array(1536).fill(0.5),
      },
      {
        content: 'JavaScript is awesome',
        metadata: { source: 'js.md' } as DocumentMetadata,
        embedding: new Array(1536).fill(0.3),
      },
    ];

    await vectorStore.addDocuments(docs);

    // Search
    const queryEmbedding = new Array(1536).fill(0.5);
    const results = await vectorStore.searchWithEmbedding(queryEmbedding, { topK: 2 });

    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('id');
    expect(results[0]).toHaveProperty('content');
    expect(results[0]).toHaveProperty('score');
  });

  it('should get collection info', async () => {
    const info = await vectorStore.getCollectionInfo();

    expect(info).toHaveProperty('name');
    expect(info).toHaveProperty('count');
    expect(info).toHaveProperty('metadata');
  });

  it('should delete documents', async () => {
    const doc = {
      id: 'test-doc-1',
      content: 'Test document',
      metadata: { source: 'test.md' } as DocumentMetadata,
      embedding: new Array(1536).fill(0.1),
    };

    await vectorStore.addDocument(doc);
    let count = await vectorStore.count();
    expect(count).toBe(1);

    await vectorStore.delete(['test-doc-1']);
    count = await vectorStore.count();
    expect(count).toBe(0);
  });
});

describe('Reranker', () => {
  let reranker: Reranker;
  let sampleResults: SearchResult[];

  beforeAll(() => {
    reranker = new Reranker();
    sampleResults = [
      {
        id: '1',
        content: 'First result',
        metadata: { source: 'doc1.md' } as DocumentMetadata,
        score: 0.9,
        distance: 0.1,
      },
      {
        id: '2',
        content: 'Second result',
        metadata: { source: 'doc2.md' } as DocumentMetadata,
        score: 0.7,
        distance: 0.3,
      },
      {
        id: '3',
        content: 'Third result',
        metadata: { source: 'doc3.md' } as DocumentMetadata,
        score: 0.5,
        distance: 0.5,
      },
    ];
  });

  it('should rerank with reciprocal-rank algorithm', () => {
    const reranked = reranker.rerank(sampleResults, 'test query', {
      algorithm: 'reciprocal-rank',
      useCache: false,
    });

    expect(reranked).toBeDefined();
    expect(reranked.length).toBe(sampleResults.length);
  });

  it('should rerank with score-fusion algorithm', () => {
    const reranked = reranker.rerank(sampleResults, 'test query', {
      algorithm: 'score-fusion',
      useCache: false,
    });

    expect(reranked).toBeDefined();
    expect(reranked.length).toBe(sampleResults.length);
  });

  it('should boost results with keyword matches', () => {
    const results = [
      {
        id: '1',
        content: 'TypeScript programming language',
        metadata: { source: 'ts.md' } as DocumentMetadata,
        score: 0.5,
        distance: 0.5,
      },
      {
        id: '2',
        content: 'Python development',
        metadata: { source: 'py.md' } as DocumentMetadata,
        score: 0.6,
        distance: 0.4,
      },
    ];

    const boosted = reranker.keywordBoost(results, ['TypeScript', 'programming']);

    expect(boosted[0].id).toBe('1'); // Should be boosted to first
  });

  it('should deduplicate results', () => {
    const duplicates: SearchResult[] = [
      {
        id: '1',
        content: 'Duplicate content',
        metadata: { source: 'doc1.md' } as DocumentMetadata,
        score: 0.9,
        distance: 0.1,
      },
      {
        id: '2',
        content: 'Duplicate content',
        metadata: { source: 'doc2.md' } as DocumentMetadata,
        score: 0.8,
        distance: 0.2,
      },
      {
        id: '3',
        content: 'Unique content',
        metadata: { source: 'doc3.md' } as DocumentMetadata,
        score: 0.7,
        distance: 0.3,
      },
    ];

    const deduped = reranker.deduplicate(duplicates);

    expect(deduped.length).toBeLessThan(duplicates.length);
  });

  it('should apply diversity reranking', () => {
    const diverse = reranker.diversityRerank(sampleResults, 0.5);

    expect(diverse).toBeDefined();
    expect(diverse.length).toBe(sampleResults.length);
  });

  it('should cache reranked results', () => {
    const query = 'test query';
    const algorithm = 'reciprocal-rank';

    // First call
    const result1 = reranker.rerank(sampleResults, query, {
      algorithm,
      useCache: true,
    });

    // Second call (should use cache)
    const result2 = reranker.rerank(sampleResults, query, {
      algorithm,
      useCache: true,
    });

    expect(result1).toEqual(result2);
  });

  it('should clear cache', () => {
    reranker.clearCache();
    // No assertion needed, just verify it doesn't throw
  });
});

describe('RAGAgent (Integration)', () => {
  let rag: RAGAgent;

  beforeAll(async () => {
    rag = new RAGAgent();
    await rag.initialize();
  });

  afterAll(async () => {
    await rag.close();
  });

  beforeEach(async () => {
    await rag.clearAll();
  });

  it('should index and search documents', async () => {
    // Index documents
    await rag.indexDocument(
      'TypeScript is a typed superset of JavaScript',
      {
        source: 'typescript.md',
        category: 'programming',
        tags: ['typescript', 'javascript'],
      } as DocumentMetadata
    );

    await rag.indexDocument(
      'React is a JavaScript library for building user interfaces',
      {
        source: 'react.md',
        category: 'programming',
        tags: ['react', 'javascript'],
      } as DocumentMetadata
    );

    // Search
    const results = await rag.search('What is TypeScript?', { topK: 2 });

    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toContain('TypeScript');
  }, 30000); // 增加 timeout

  it('should batch index documents', async () => {
    const documents = Array.from({ length: 3 }, (_, i) => ({
      content: `Document content ${i}`,
      metadata: {
        source: `doc${i}.md`,
        category: 'test',
      } as DocumentMetadata,
    }));

    const stats = await rag.indexDocuments(documents, {
      batchSize: 2,
    });

    expect(stats.totalDocuments).toBe(3);
    expect(stats.totalTokens).toBeGreaterThan(0);
    expect(stats.totalCost).toBeGreaterThan(0);
  }, 30000);

  it('should perform hybrid search', async () => {
    // Index test documents
    await rag.indexDocument(
      'Docker is a containerization platform',
      {
        source: 'docker.md',
        category: 'devops',
      } as DocumentMetadata
    );

    const results = await rag.hybridSearch('Docker containers', {
      topK: 5,
      semanticWeight: 0.7,
      keywordWeight: 0.3,
    });

    expect(results).toBeDefined();
  }, 30000);

  it('should get stats', async () => {
    const stats = await rag.getStats();

    expect(stats).toHaveProperty('documentCount');
    expect(stats).toHaveProperty('embeddingStats');
    expect(stats).toHaveProperty('collectionInfo');
  });
});
