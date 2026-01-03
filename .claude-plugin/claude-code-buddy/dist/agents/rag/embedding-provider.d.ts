import type { CostTracker, IEmbeddingProvider as IEmbeddingProviderNew, EmbeddingProviderConfig } from './types.js';
export interface IEmbeddingProvider {
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
export declare class EmbeddingProviderFactory {
    static create(config: EmbeddingProviderConfig): Promise<IEmbeddingProviderNew>;
    static createOpenAI(options?: {
        apiKey?: string;
        interactive?: boolean;
    }): Promise<IEmbeddingProvider>;
    static createSync(options?: {
        apiKey?: string;
        optional?: boolean;
    }): IEmbeddingProvider | null;
    static isAvailable(): boolean;
}
//# sourceMappingURL=embedding-provider.d.ts.map