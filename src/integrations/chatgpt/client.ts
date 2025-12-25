// src/integrations/chatgpt/client.ts
import OpenAI from 'openai';

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

/**
 * ChatGPT API Client (OpenAI)
 *
 * Extends existing OpenAI SDK for ChatGPT models
 * (Whisper/TTS already integrated, this adds chat completion)
 */
export class ChatGPTClient {
  private client: OpenAI;
  private model: string;

  constructor(config: ChatGPTConfig) {
    const {
      apiKey,
      model = 'gpt-4-turbo-preview',
      organization,
      timeout = 60000
    } = config;

    this.model = model;
    this.client = new OpenAI({
      apiKey,
      organization,
      timeout
    });
  }

  /**
   * Text generation (similar to GeminiClient.generateText)
   */
  async generateText(prompt: string, options?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  }): Promise<string> {
    const messages: ChatGPTMessage[] = [];

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

  /**
   * Multi-turn chat (similar to GeminiClient.chat)
   */
  async chat(messages: ChatGPTMessage[], options?: {
    temperature?: number;
    maxTokens?: number;
  }): Promise<{
    response: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }> {
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

  /**
   * Code generation (ChatGPT's specialty)
   */
  async generateCode(task: string, language: string, context?: string): Promise<{
    code: string;
    explanation: string;
  }> {
    const systemPrompt = `You are an expert programmer. Generate clean, efficient, well-documented code.`;

    const userPrompt = context
      ? `Language: ${language}\nContext: ${context}\n\nTask: ${task}\n\nProvide the code and a brief explanation.`
      : `Language: ${language}\n\nTask: ${task}\n\nProvide the code and a brief explanation.`;

    const response = await this.generateText(userPrompt, {
      systemPrompt,
      temperature: 0.2,  // Lower temperature for code generation
      maxTokens: 4096
    });

    // Parse response to extract code and explanation
    // (Simplified - real implementation would use regex or AST parsing)
    const codeMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/);
    const code = codeMatch ? codeMatch[1] : response;
    const explanation = response.replace(/```[\w]*\n[\s\S]*?\n```/g, '').trim();

    return {
      code,
      explanation: explanation || 'See code above'
    };
  }

  /**
   * Get model info
   */
  getModelInfo(): { provider: string; model: string } {
    return {
      provider: 'chatgpt',
      model: this.model
    };
  }
}
