import type { DocumentInput, SearchResult, SearchOptions, RAGConfig } from './types.js';
export declare class VectorStore {
    private index;
    private config;
    private isInitialized;
    private dataPath;
    constructor(config?: Partial<RAGConfig>);
    initialize(): Promise<void>;
    private ensureInitialized;
    addDocument(doc: DocumentInput): Promise<void>;
    addDocuments(docs: DocumentInput[]): Promise<void>;
    search(_options: SearchOptions): Promise<SearchResult[]>;
    searchWithEmbedding(queryEmbedding: number[], options?: Partial<SearchOptions>): Promise<SearchResult[]>;
    count(): Promise<number>;
    delete(ids: string[]): Promise<void>;
    clear(): Promise<void>;
    getCollectionInfo(): Promise<{
        name: string;
        count: number;
        metadata: Record<string, any>;
    }>;
    healthCheck(): Promise<boolean>;
    private generateId;
    private sanitizeMetadata;
    private createBatches;
    close(): Promise<void>;
}
//# sourceMappingURL=vectorstore.d.ts.map