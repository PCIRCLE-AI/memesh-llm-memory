export interface GrokConfig {
    apiKey: string;
    baseURL?: string;
    model?: string;
    timeout?: number;
}
export interface GrokMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export interface GrokResponse {
    id: string;
    model: string;
    choices: Array<{
        message: GrokMessage;
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}
export declare class GrokClient {
    private client;
    private model;
    constructor(config: GrokConfig);
    generateText(prompt: string, options?: {
        temperature?: number;
        maxTokens?: number;
        systemPrompt?: string;
    }): Promise<string>;
    chat(messages: GrokMessage[], options?: {
        temperature?: number;
        maxTokens?: number;
    }): Promise<{
        response: string;
        usage: {
            promptTokens: number;
            completionTokens: number;
            totalTokens: number;
        };
    }>;
    reason(problem: string, context?: string): Promise<{
        reasoning: string;
        conclusion: string;
    }>;
    getModelInfo(): {
        provider: string;
        model: string;
    };
}
//# sourceMappingURL=client.d.ts.map