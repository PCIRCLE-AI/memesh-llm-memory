export interface SamplingRequest {
    messages: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
    maxTokens: number;
    temperature?: number;
    systemPrompt?: string;
}
export interface SamplingResponse {
    role: 'assistant';
    content: {
        type: 'text';
        text: string;
    };
}
export type SampleFunction = (request: SamplingRequest) => Promise<SamplingResponse>;
export interface GenerateOptions {
    maxTokens: number;
    temperature?: number;
    systemPrompt?: string;
}
export declare class SamplingClient {
    private sampleFn;
    constructor(sampleFn: SampleFunction);
    generate(prompt: string, options: GenerateOptions): Promise<string>;
    generateWithHistory(messages: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>, options: GenerateOptions): Promise<string>;
}
//# sourceMappingURL=SamplingClient.d.ts.map