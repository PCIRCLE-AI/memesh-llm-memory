import type { CostTracker } from './types.js';
export declare const HF_EMBEDDING_MODELS: {
    readonly 'all-MiniLM-L6-v2': "sentence-transformers/all-MiniLM-L6-v2";
    readonly 'all-mpnet-base-v2': "sentence-transformers/all-mpnet-base-v2";
    readonly 'bge-small-en-v1.5': "BAAI/bge-small-en-v1.5";
    readonly 'bge-base-en-v1.5': "BAAI/bge-base-en-v1.5";
};
export declare class HuggingFaceEmbeddingService {
    private apiKey;
    private model;
    private costTracker;
    private baseUrl;
    constructor(apiKey?: string, model?: string);
    isAvailable(): boolean;
    createEmbedding(text: string): Promise<number[]>;
    createEmbeddings(texts: string[]): Promise<number[][]>;
    getCostTracker(): CostTracker;
    getModelInfo(): {
        provider: string;
        model: string;
        dimensions: number;
    };
}
//# sourceMappingURL=huggingface-embeddings.d.ts.map