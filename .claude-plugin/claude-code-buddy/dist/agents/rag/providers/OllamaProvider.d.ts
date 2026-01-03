import { IEmbeddingProvider, ModelInfo } from '../types';
export interface OllamaProviderOptions {
    baseUrl?: string;
    model?: string;
    dimensions?: number;
    maxTokens?: number;
}
export declare class OllamaProvider implements IEmbeddingProvider {
    private baseUrl;
    private model;
    private dimensions;
    private maxTokens;
    constructor(options?: OllamaProviderOptions);
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
    getModelInfo(): ModelInfo;
    private sleep;
    checkAvailability(): Promise<boolean>;
    listModels(): Promise<string[]>;
}
//# sourceMappingURL=OllamaProvider.d.ts.map