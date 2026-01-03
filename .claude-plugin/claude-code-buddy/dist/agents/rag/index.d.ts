import { VectorStore } from './vectorstore.js';
import { EmbeddingProviderFactory } from './embedding-provider.js';
import { Reranker } from './reranker.js';
import type { IEmbeddingProvider, IRAGAgent, DocumentInput, SearchResult, SearchOptions, HybridSearchOptions, BatchOptions, EmbeddingStats, DocumentMetadata } from './types.js';
export declare class RAGAgent implements IRAGAgent {
    private vectorStore;
    private embeddings;
    private reranker;
    private isInitialized;
    constructor();
    private tryCreateDefaultProvider;
    isRAGEnabled(): boolean;
    enableRAG(providerConfig?: string | {
        provider: 'openai';
        apiKey?: string;
        model?: string;
    } | {
        provider: 'huggingface';
        apiKey: string;
        model?: string;
        dimensions?: number;
    } | {
        provider: 'ollama';
        baseUrl?: string;
        model?: string;
        dimensions?: number;
    } | {
        provider: 'local';
        modelPath: string;
        model?: string;
        dimensions?: number;
    }): Promise<boolean>;
    initialize(): Promise<void>;
    indexDocument(content: string, metadata: DocumentMetadata, id?: string): Promise<void>;
    indexDocuments(documents: Array<{
        content: string;
        metadata: DocumentMetadata;
        id?: string;
    }>, options?: Partial<BatchOptions>): Promise<EmbeddingStats>;
    search(query: string, options?: Partial<SearchOptions>): Promise<SearchResult[]>;
    hybridSearch(query: string, options?: Partial<HybridSearchOptions>): Promise<SearchResult[]>;
    searchWithRerank(query: string, options?: Partial<SearchOptions & {
        rerankAlgorithm?: 'reciprocal-rank' | 'score-fusion';
    }>): Promise<SearchResult[]>;
    getStats(): Promise<{
        documentCount: number;
        embeddingStats: EmbeddingStats;
        collectionInfo: {
            name: string;
            count: number;
            metadata: Record<string, any>;
        };
    }>;
    deleteDocuments(ids: string[]): Promise<void>;
    clearAll(): Promise<void>;
    close(): Promise<void>;
    private ensureInitialized;
    private ensureRAGEnabled;
    private extractKeywords;
    private printStats;
}
export declare function getRAGAgent(): Promise<RAGAgent>;
export { VectorStore, EmbeddingProviderFactory, Reranker };
export { FileWatcher } from './FileWatcher.js';
export type { DocumentInput, SearchResult, SearchOptions, HybridSearchOptions, BatchOptions, EmbeddingStats, DocumentMetadata, IEmbeddingProvider, };
//# sourceMappingURL=index.d.ts.map