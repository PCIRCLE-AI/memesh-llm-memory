import { z } from 'zod';
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
export const DocumentInputSchema = z.object({
    id: z.string().optional(),
    content: z.string(),
    metadata: DocumentMetadataSchema,
    embedding: z.array(z.number()).optional(),
});
export const SearchResultSchema = z.object({
    id: z.string(),
    content: z.string(),
    metadata: DocumentMetadataSchema,
    score: z.number(),
    distance: z.number(),
});
export const SearchOptionsSchema = z.object({
    query: z.string(),
    topK: z.number().default(5),
    scoreThreshold: z.number().optional(),
    filter: z.record(z.any()).optional(),
    includeMetadata: z.boolean().default(true),
});
export const HybridSearchOptionsSchema = SearchOptionsSchema.extend({
    semanticWeight: z.number().min(0).max(1).default(0.7),
    keywordWeight: z.number().min(0).max(1).default(0.3),
    keywords: z.array(z.string()).optional(),
});
export const BatchOptionsSchema = z.object({
    batchSize: z.number().default(100),
    maxConcurrent: z.number().default(5),
    onProgress: z.function().args(z.number(), z.number()).returns(z.void()).optional(),
});
export const RAGConfigSchema = z.object({
    embeddingModel: z.string(),
    embeddingDimension: z.number().default(1536),
    maxBatchSize: z.number().default(100),
    cacheEnabled: z.boolean().default(true),
});
export const RerankOptionsSchema = z.object({
    algorithm: z.enum(['reciprocal-rank', 'score-fusion', 'llm-rerank']).default('reciprocal-rank'),
    useCache: z.boolean().default(true),
    cacheKey: z.string().optional(),
});
export var EmbeddingProvider;
(function (EmbeddingProvider) {
    EmbeddingProvider["OpenAI"] = "openai";
    EmbeddingProvider["HuggingFace"] = "huggingface";
    EmbeddingProvider["Ollama"] = "ollama";
    EmbeddingProvider["Local"] = "local";
})(EmbeddingProvider || (EmbeddingProvider = {}));
//# sourceMappingURL=types.js.map