import { IEmbeddingProvider, ModelInfo } from '../types';
export interface HuggingFaceProviderOptions {
    apiKey: string;
    model?: string;
    dimensions?: number;
    maxTokens?: number;
    batchSize?: number;
}
export declare class HuggingFaceProvider implements IEmbeddingProvider {
    private apiKey;
    private model;
    private dimensions;
    private maxTokens;
    private batchSize;
    private baseUrl;
    constructor(options: HuggingFaceProviderOptions);
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
    getModelInfo(): ModelInfo;
    private normalizeEmbedding;
    private sleep;
}
//# sourceMappingURL=HuggingFaceProvider.d.ts.map