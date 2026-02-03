export class SamplingClient {
    sampleFn;
    constructor(sampleFn) {
        this.sampleFn = sampleFn;
    }
    async generate(prompt, options) {
        if (!prompt || !prompt.trim()) {
            throw new Error('Prompt cannot be empty');
        }
        if (options.maxTokens <= 0) {
            throw new Error('maxTokens must be positive');
        }
        const request = {
            messages: [
                { role: 'user', content: prompt },
            ],
            maxTokens: options.maxTokens,
            temperature: options.temperature,
            systemPrompt: options.systemPrompt,
        };
        try {
            const response = await this.sampleFn(request);
            if (!response?.content?.text) {
                throw new Error('Invalid response from sampling function');
            }
            return response.content.text;
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('Invalid response')) {
                throw error;
            }
            throw new Error(`Sampling failed: ${error.message}`);
        }
    }
    async generateWithHistory(messages, options) {
        if (!messages || messages.length === 0) {
            throw new Error('Messages cannot be empty');
        }
        if (options.maxTokens <= 0) {
            throw new Error('maxTokens must be positive');
        }
        const request = {
            messages,
            maxTokens: options.maxTokens,
            temperature: options.temperature,
            systemPrompt: options.systemPrompt,
        };
        try {
            const response = await this.sampleFn(request);
            if (!response?.content?.text) {
                throw new Error('Invalid response from sampling function');
            }
            return response.content.text;
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('Invalid response')) {
                throw error;
            }
            throw new Error(`Sampling failed: ${error.message}`);
        }
    }
}
//# sourceMappingURL=SamplingClient.js.map