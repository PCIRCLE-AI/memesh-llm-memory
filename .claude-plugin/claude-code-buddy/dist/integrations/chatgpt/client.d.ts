export interface ChatGPTConfig {
    apiKey: string;
    model?: string;
    organization?: string;
    timeout?: number;
}
export interface ChatGPTMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export declare class ChatGPTClient {
    private client;
    private model;
    constructor(config: ChatGPTConfig);
    generateText(prompt: string, options?: {
        temperature?: number;
        maxTokens?: number;
        systemPrompt?: string;
    }): Promise<string>;
    chat(messages: ChatGPTMessage[], options?: {
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
    generateCode(task: string, language: string, context?: string): Promise<{
        code: string;
        explanation: string;
    }>;
    getModelInfo(): {
        provider: string;
        model: string;
    };
}
//# sourceMappingURL=client.d.ts.map