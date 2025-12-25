// src/integrations/grok/client.ts
import axios, { AxiosInstance } from 'axios';

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

/**
 * Grok API Client (xAI)
 *
 * Follows GeminiClient pattern for consistency
 */
export class GrokClient {
  private client: AxiosInstance;
  private model: string;

  constructor(config: GrokConfig) {
    const {
      apiKey,
      baseURL = 'https://api.x.ai/v1',  // xAI official API endpoint
      model = 'grok-beta',
      timeout = 60000
    } = config;

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

  /**
   * Text generation (similar to GeminiClient.generateText)
   */
  async generateText(prompt: string, options?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  }): Promise<string> {
    const messages: GrokMessage[] = [];

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

    const response = await this.client.post<GrokResponse>('/chat/completions', {
      model: this.model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048
    });

    return response.data.choices[0].message.content;
  }

  /**
   * Multi-turn chat (similar to GeminiClient.chat)
   */
  async chat(messages: GrokMessage[], options?: {
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
    const response = await this.client.post<GrokResponse>('/chat/completions', {
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

  /**
   * Reasoning tasks (Grok's specialty)
   */
  async reason(problem: string, context?: string): Promise<{
    reasoning: string;
    conclusion: string;
  }> {
    const systemPrompt = `You are Grok, an AI assistant specialized in reasoning and problem-solving.
Break down complex problems step-by-step and provide clear conclusions.`;

    const userPrompt = context
      ? `Context: ${context}\n\nProblem: ${problem}\n\nProvide step-by-step reasoning and a clear conclusion.`
      : `Problem: ${problem}\n\nProvide step-by-step reasoning and a clear conclusion.`;

    const response = await this.generateText(userPrompt, {
      systemPrompt,
      temperature: 0.3,  // Lower temperature for reasoning tasks
      maxTokens: 4096
    });

    // Parse response to extract reasoning and conclusion
    // (Simplified - real implementation would use more sophisticated parsing)
    const parts = response.split('\n\nConclusion:');

    return {
      reasoning: parts[0] || response,
      conclusion: parts[1]?.trim() || 'See reasoning above'
    };
  }

  /**
   * Get model info
   */
  getModelInfo(): { provider: string; model: string } {
    return {
      provider: 'grok',
      model: this.model
    };
  }
}
