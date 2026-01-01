/**
 * RAG Agent 類型定義
 */

import { z } from 'zod';

/**
 * 文檔元數據
 */
export const DocumentMetadataSchema = z.object({
  source: z.string(),
  title: z.string().optional(),
  author: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  language: z.string().optional().default('zh-TW'),
});

export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;

/**
 * 文檔輸入
 */
export const DocumentInputSchema = z.object({
  id: z.string().optional(),
  content: z.string(),
  metadata: DocumentMetadataSchema,
  embedding: z.array(z.number()).optional(),
});

export type DocumentInput = z.infer<typeof DocumentInputSchema>;

/**
 * 檢索結果
 */
export const SearchResultSchema = z.object({
  id: z.string(),
  content: z.string(),
  metadata: DocumentMetadataSchema,
  score: z.number(),
  distance: z.number(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

/**
 * 搜尋選項
 */
export const SearchOptionsSchema = z.object({
  query: z.string(),
  topK: z.number().default(5),
  scoreThreshold: z.number().optional(),
  filter: z.record(z.any()).optional(),
  includeMetadata: z.boolean().default(true),
});

export type SearchOptions = z.infer<typeof SearchOptionsSchema>;

/**
 * Hybrid 搜尋選項
 */
export const HybridSearchOptionsSchema = SearchOptionsSchema.extend({
  semanticWeight: z.number().min(0).max(1).default(0.7),
  keywordWeight: z.number().min(0).max(1).default(0.3),
  keywords: z.array(z.string()).optional(),
});

export type HybridSearchOptions = z.infer<typeof HybridSearchOptionsSchema>;

/**
 * 批次處理選項
 */
export const BatchOptionsSchema = z.object({
  batchSize: z.number().default(100),
  maxConcurrent: z.number().default(5),
  onProgress: z.function().args(z.number(), z.number()).returns(z.void()).optional(),
});

export type BatchOptions = z.infer<typeof BatchOptionsSchema>;

/**
 * Embedding 統計
 */
export interface EmbeddingStats {
  totalDocuments: number;
  totalTokens: number;
  totalCost: number;
  averageTokensPerDocument: number;
}

/**
 * RAG 配置 (Vectra-based)
 */
export const RAGConfigSchema = z.object({
  embeddingModel: z.string(),
  embeddingDimension: z.number().default(1536),
  maxBatchSize: z.number().default(100),
  cacheEnabled: z.boolean().default(true),
});

export type RAGConfig = z.infer<typeof RAGConfigSchema>;

/**
 * 重排序選項
 */
export const RerankOptionsSchema = z.object({
  algorithm: z.enum(['reciprocal-rank', 'score-fusion', 'llm-rerank']).default('reciprocal-rank'),
  useCache: z.boolean().default(true),
  cacheKey: z.string().optional(),
});

export type RerankOptions = z.infer<typeof RerankOptionsSchema>;

/**
 * 成本追蹤
 */
export interface CostTracker {
  embeddingCalls: number;
  totalTokens: number;
  estimatedCost: number;
  lastUpdated: Date;
}

/**
 * Embedding Provider Types
 */
export enum EmbeddingProvider {
  OpenAI = 'openai',
  HuggingFace = 'huggingface',
  Ollama = 'ollama',
  Local = 'local',
}

/**
 * Model Information
 */
export interface ModelInfo {
  provider: string;
  model: string;
  dimensions: number;
  maxTokens?: number;
}

/**
 * Embedding Provider Interface
 *
 * All embedding providers must implement this interface to ensure
 * consistent behavior across different backends.
 */
export interface IEmbeddingProvider {
  /**
   * Generate embedding for a single text
   * @param text - Text to embed
   * @returns Embedding vector
   */
  embed(text: string): Promise<number[]>;

  /**
   * Generate embeddings for multiple texts in batch
   * @param texts - Array of texts to embed
   * @returns Array of embedding vectors
   */
  embedBatch(texts: string[]): Promise<number[][]>;

  /**
   * Get model information
   * @returns Model metadata
   */
  getModelInfo(): ModelInfo;
}

/**
 * Provider Configuration Types
 */
export interface OpenAIProviderConfig {
  provider: 'openai';
  apiKey: string;
  model?: string;
  dimensions?: number;
}

export interface HuggingFaceProviderConfig {
  provider: 'huggingface';
  apiKey: string;
  model?: string;
  dimensions?: number;
}

export interface OllamaProviderConfig {
  provider: 'ollama';
  baseUrl?: string;
  model?: string;
  dimensions?: number;
}

export interface LocalProviderConfig {
  provider: 'local';
  modelPath: string;
  model?: string;
  dimensions?: number;
}

/**
 * Union type for all provider configurations
 */
export type EmbeddingProviderConfig =
  | OpenAIProviderConfig
  | HuggingFaceProviderConfig
  | OllamaProviderConfig
  | LocalProviderConfig;

/**
 * RAG Agent Interface
 *
 * Minimal interface required by FileWatcher to avoid circular dependency.
 * FileWatcher only needs indexDocument method, so we extract that here.
 */
export interface IRAGAgent {
  /**
   * Index a single document
   * @param content - Document content
   * @param metadata - Document metadata
   * @param id - Optional document ID
   */
  indexDocument(content: string, metadata: DocumentMetadata, id?: string): Promise<void>;
}
