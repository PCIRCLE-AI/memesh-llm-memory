import type { CostTracker } from './types.js';
export declare class EmbeddingService {
    private client;
    private model;
    private costTracker;
    private apiKey;
    private initializationPromise;
    constructor(apiKey?: string, model?: string);
    private initialize;
    isAvailable(): boolean;
    private ensureClient;
    createEmbedding(text: string): Promise<number[]>;
    createEmbeddingsBatch(texts: string[]): Promise<number[][]>;
    cosineSimilarity(a: number[], b: number[]): number;
    estimateTokens(text: string): number;
    estimateCost(texts: string[]): number;
    private updateCostTracker;
    getCostTracker(): CostTracker;
    resetCostTracker(): void;
    getModel(): string;
    getModelDimension(): number;
    createEmbeddings(texts: string[]): Promise<number[][]>;
    getModelInfo(): {
        provider: string;
        model: string;
        dimensions: number;
    };
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
}
export declare function getEmbeddingService(): EmbeddingService;
//# sourceMappingURL=embeddings.d.ts.map