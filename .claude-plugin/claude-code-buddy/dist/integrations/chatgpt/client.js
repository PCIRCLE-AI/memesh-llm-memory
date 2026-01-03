import OpenAI from 'openai';
export class ChatGPTClient {
    client;
    model;
    constructor(config) {
        const { apiKey, model = 'gpt-4-turbo-preview', organization, timeout = 60000 } = config;
        this.model = model;
        this.client = new OpenAI({
            apiKey,
            organization,
            timeout
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
        const completion = await this.client.chat.completions.create({
            model: this.model,
            messages,
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens ?? 2048
        });
        return completion.choices[0].message.content || '';
    }
    async chat(messages, options) {
        const completion = await this.client.chat.completions.create({
            model: this.model,
            messages,
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens ?? 2048
        });
        return {
            response: completion.choices[0].message.content || '',
            usage: {
                promptTokens: completion.usage?.prompt_tokens || 0,
                completionTokens: completion.usage?.completion_tokens || 0,
                totalTokens: completion.usage?.total_tokens || 0
            }
        };
    }
    async generateCode(task, language, context) {
        const systemPrompt = `You are an expert programmer. Generate clean, efficient, well-documented code.`;
        const userPrompt = context
            ? `Language: ${language}\nContext: ${context}\n\nTask: ${task}\n\nProvide the code and a brief explanation.`
            : `Language: ${language}\n\nTask: ${task}\n\nProvide the code and a brief explanation.`;
        const response = await this.generateText(userPrompt, {
            systemPrompt,
            temperature: 0.2,
            maxTokens: 4096
        });
        const codeMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/);
        const code = codeMatch ? codeMatch[1] : response;
        const explanation = response.replace(/```[\w]*\n[\s\S]*?\n```/g, '').trim();
        return {
            code,
            explanation: explanation || 'See code above'
        };
    }
    getModelInfo() {
        return {
            provider: 'chatgpt',
            model: this.model
        };
    }
}
//# sourceMappingURL=client.js.map