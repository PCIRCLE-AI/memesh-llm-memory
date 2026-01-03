import axios from 'axios';
export class GrokClient {
    client;
    model;
    constructor(config) {
        const { apiKey, baseURL = 'https://api.x.ai/v1', model = 'grok-beta', timeout = 60000 } = config;
        this.model = model;
        this.client = axios.create({
            baseURL,
            timeout,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
    }
    async generateText(prompt, options) {
        const messages = [];
        if (options?.systemPrompt) {
            messages.push({
                role: 'system',
                content: options.systemPrompt
            });
        }
        messages.push({
            role: 'user',
            content: prompt
        });
        const response = await this.client.post('/chat/completions', {
            model: this.model,
            messages,
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens ?? 2048
        });
        return response.data.choices[0].message.content;
    }
    async chat(messages, options) {
        const response = await this.client.post('/chat/completions', {
            model: this.model,
            messages,
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens ?? 2048
        });
        return {
            response: response.data.choices[0].message.content,
            usage: {
                promptTokens: response.data.usage.prompt_tokens,
                completionTokens: response.data.usage.completion_tokens,
                totalTokens: response.data.usage.total_tokens
            }
        };
    }
    async reason(problem, context) {
        const systemPrompt = `You are Grok, an AI assistant specialized in reasoning and problem-solving.
Break down complex problems step-by-step and provide clear conclusions.`;
        const userPrompt = context
            ? `Context: ${context}\n\nProblem: ${problem}\n\nProvide step-by-step reasoning and a clear conclusion.`
            : `Problem: ${problem}\n\nProvide step-by-step reasoning and a clear conclusion.`;
        const response = await this.generateText(userPrompt, {
            systemPrompt,
            temperature: 0.3,
            maxTokens: 4096
        });
        const parts = response.split('\n\nConclusion:');
        return {
            reasoning: parts[0] || response,
            conclusion: parts[1]?.trim() || 'See reasoning above'
        };
    }
    getModelInfo() {
        return {
            provider: 'grok',
            model: this.model
        };
    }
}
//# sourceMappingURL=client.js.map