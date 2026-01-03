import { z } from 'zod';
export declare const DocumentMetadataSchema: z.ZodObject<{
    source: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    author: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    language: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    source: string;
    language: string;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    category?: string | undefined;
    title?: string | undefined;
    author?: string | undefined;
    tags?: string[] | undefined;
}, {
    source: string;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    category?: string | undefined;
    title?: string | undefined;
    author?: string | undefined;
    tags?: string[] | undefined;
    language?: string | undefined;
}>;
export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;
export declare const DocumentInputSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    content: z.ZodString;
    metadata: z.ZodObject<{
        source: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        author: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        language: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        source: string;
        language: string;
        createdAt?: string | undefined;
        updatedAt?: string | undefined;
        category?: string | undefined;
        title?: string | undefined;
        author?: string | undefined;
        tags?: string[] | undefined;
    }, {
        source: string;
        createdAt?: string | undefined;
        updatedAt?: string | undefined;
        category?: string | undefined;
        title?: string | undefined;
        author?: string | undefined;
        tags?: string[] | undefined;
        language?: string | undefined;
    }>;
    embedding: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
}, "strip", z.ZodTypeAny, {
    metadata: {
        source: string;
        language: string;
        createdAt?: string | undefined;
        updatedAt?: string | undefined;
        category?: string | undefined;
        title?: string | undefined;
        author?: string | undefined;
        tags?: string[] | undefined;
    };
    content: string;
    embedding?: number[] | undefined;
    id?: string | undefined;
}, {
    metadata: {
        source: string;
        createdAt?: string | undefined;
        updatedAt?: string | undefined;
        category?: string | undefined;
        title?: string | undefined;
        author?: string | undefined;
        tags?: string[] | undefined;
        language?: string | undefined;
    };
    content: string;
    embedding?: number[] | undefined;
    id?: string | undefined;
}>;
export type DocumentInput = z.infer<typeof DocumentInputSchema>;
export declare const SearchResultSchema: z.ZodObject<{
    id: z.ZodString;
    content: z.ZodString;
    metadata: z.ZodObject<{
        source: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        author: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodOptional<z.ZodString>;
        updatedAt: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        language: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        source: string;
        language: string;
        createdAt?: string | undefined;
        updatedAt?: string | undefined;
        category?: string | undefined;
        title?: string | undefined;
        author?: string | undefined;
        tags?: string[] | undefined;
    }, {
        source: string;
        createdAt?: string | undefined;
        updatedAt?: string | undefined;
        category?: string | undefined;
        title?: string | undefined;
        author?: string | undefined;
        tags?: string[] | undefined;
        language?: string | undefined;
    }>;
    score: z.ZodNumber;
    distance: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    metadata: {
        source: string;
        language: string;
        createdAt?: string | undefined;
        updatedAt?: string | undefined;
        category?: string | undefined;
        title?: string | undefined;
        author?: string | undefined;
        tags?: string[] | undefined;
    };
    id: string;
    content: string;
    score: number;
    distance: number;
}, {
    metadata: {
        source: string;
        createdAt?: string | undefined;
        updatedAt?: string | undefined;
        category?: string | undefined;
        title?: string | undefined;
        author?: string | undefined;
        tags?: string[] | undefined;
        language?: string | undefined;
    };
    id: string;
    content: string;
    score: number;
    distance: number;
}>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export declare const SearchOptionsSchema: z.ZodObject<{
    query: z.ZodString;
    topK: z.ZodDefault<z.ZodNumber>;
    scoreThreshold: z.ZodOptional<z.ZodNumber>;
    filter: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    includeMetadata: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    query: string;
    topK: number;
    includeMetadata: boolean;
    filter?: Record<string, any> | undefined;
    scoreThreshold?: number | undefined;
}, {
    query: string;
    filter?: Record<string, any> | undefined;
    topK?: number | undefined;
    scoreThreshold?: number | undefined;
    includeMetadata?: boolean | undefined;
}>;
export type SearchOptions = z.infer<typeof SearchOptionsSchema>;
export declare const HybridSearchOptionsSchema: z.ZodObject<{
    query: z.ZodString;
    topK: z.ZodDefault<z.ZodNumber>;
    scoreThreshold: z.ZodOptional<z.ZodNumber>;
    filter: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    includeMetadata: z.ZodDefault<z.ZodBoolean>;
} & {
    semanticWeight: z.ZodDefault<z.ZodNumber>;
    keywordWeight: z.ZodDefault<z.ZodNumber>;
    keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    query: string;
    topK: number;
    includeMetadata: boolean;
    semanticWeight: number;
    keywordWeight: number;
    keywords?: string[] | undefined;
    filter?: Record<string, any> | undefined;
    scoreThreshold?: number | undefined;
}, {
    query: string;
    keywords?: string[] | undefined;
    filter?: Record<string, any> | undefined;
    topK?: number | undefined;
    scoreThreshold?: number | undefined;
    includeMetadata?: boolean | undefined;
    semanticWeight?: number | undefined;
    keywordWeight?: number | undefined;
}>;
export type HybridSearchOptions = z.infer<typeof HybridSearchOptionsSchema>;
export declare const BatchOptionsSchema: z.ZodObject<{
    batchSize: z.ZodDefault<z.ZodNumber>;
    maxConcurrent: z.ZodDefault<z.ZodNumber>;
    onProgress: z.ZodOptional<z.ZodFunction<z.ZodTuple<[z.ZodNumber, z.ZodNumber], z.ZodUnknown>, z.ZodVoid>>;
}, "strip", z.ZodTypeAny, {
    batchSize: number;
    maxConcurrent: number;
    onProgress?: ((args_0: number, args_1: number, ...args: unknown[]) => void) | undefined;
}, {
    batchSize?: number | undefined;
    maxConcurrent?: number | undefined;
    onProgress?: ((args_0: number, args_1: number, ...args: unknown[]) => void) | undefined;
}>;
export type BatchOptions = z.infer<typeof BatchOptionsSchema>;
export interface EmbeddingStats {
    totalDocuments: number;
    totalTokens: number;
    totalCost: number;
    averageTokensPerDocument: number;
}
export declare const RAGConfigSchema: z.ZodObject<{
    embeddingModel: z.ZodString;
    embeddingDimension: z.ZodDefault<z.ZodNumber>;
    maxBatchSize: z.ZodDefault<z.ZodNumber>;
    cacheEnabled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    embeddingModel: string;
    embeddingDimension: number;
    maxBatchSize: number;
    cacheEnabled: boolean;
}, {
    embeddingModel: string;
    embeddingDimension?: number | undefined;
    maxBatchSize?: number | undefined;
    cacheEnabled?: boolean | undefined;
}>;
export type RAGConfig = z.infer<typeof RAGConfigSchema>;
export declare const RerankOptionsSchema: z.ZodObject<{
    algorithm: z.ZodDefault<z.ZodEnum<["reciprocal-rank", "score-fusion", "llm-rerank"]>>;
    useCache: z.ZodDefault<z.ZodBoolean>;
    cacheKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    algorithm: "reciprocal-rank" | "score-fusion" | "llm-rerank";
    useCache: boolean;
    cacheKey?: string | undefined;
}, {
    algorithm?: "reciprocal-rank" | "score-fusion" | "llm-rerank" | undefined;
    useCache?: boolean | undefined;
    cacheKey?: string | undefined;
}>;
export type RerankOptions = z.infer<typeof RerankOptionsSchema>;
export interface CostTracker {
    embeddingCalls: number;
    totalTokens: number;
    estimatedCost: number;
    lastUpdated: Date;
}
export declare enum EmbeddingProvider {
    OpenAI = "openai",
    HuggingFace = "huggingface",
    Ollama = "ollama",
    Local = "local"
}
export interface ModelInfo {
    provider: string;
    model: string;
    dimensions: number;
    maxTokens?: number;
}
export interface IEmbeddingProvider {
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
    getModelInfo(): ModelInfo;
}
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
export type EmbeddingProviderConfig = OpenAIProviderConfig | HuggingFaceProviderConfig | OllamaProviderConfig | LocalProviderConfig;
export interface IRAGAgent {
    indexDocument(content: string, metadata: DocumentMetadata, id?: string): Promise<void>;
}
//# sourceMappingURL=types.d.ts.map