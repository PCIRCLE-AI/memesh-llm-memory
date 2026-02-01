// src/mcp/SamplingClient.ts
/**
 * Sampling Client
 *
 * Provides server-side content generation using MCP SDK 1.25.3 sampling.
 * Allows server to proactively request content from Claude.
 */

export interface SamplingRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxTokens: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface SamplingResponse {
  role: 'assistant';
  content: { type: 'text'; text: string };
}

export type SampleFunction = (request: SamplingRequest) => Promise<SamplingResponse>;

export interface GenerateOptions {
  maxTokens: number;
  temperature?: number;
  systemPrompt?: string;
}

export class SamplingClient {
  constructor(private sampleFn: SampleFunction) {}

  /**
   * Generate content using Claude
   *
   * @param prompt - User prompt
   * @param options - Generation options
   * @returns Generated text content
   */
  async generate(prompt: string, options: GenerateOptions): Promise<string> {
    // Validation
    if (!prompt || !prompt.trim()) {
      throw new Error('Prompt cannot be empty');
    }
    if (options.maxTokens <= 0) {
      throw new Error('maxTokens must be positive');
    }

    const request: SamplingRequest = {
      messages: [
        { role: 'user', content: prompt },
      ],
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      systemPrompt: options.systemPrompt,
    };

    try {
      const response = await this.sampleFn(request);

      // Validate response
      if (!response?.content?.text) {
        throw new Error('Invalid response from sampling function');
      }

      return response.content.text;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid response')) {
        throw error;
      }
      throw new Error(`Sampling failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generate with conversation history
   *
   * @param messages - Conversation history
   * @param options - Generation options
   * @returns Generated text content
   */
  async generateWithHistory(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options: GenerateOptions
  ): Promise<string> {
    // Validation
    if (!messages || messages.length === 0) {
      throw new Error('Messages cannot be empty');
    }
    if (options.maxTokens <= 0) {
      throw new Error('maxTokens must be positive');
    }

    const request: SamplingRequest = {
      messages,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      systemPrompt: options.systemPrompt,
    };

    try {
      const response = await this.sampleFn(request);

      // Validate response
      if (!response?.content?.text) {
        throw new Error('Invalid response from sampling function');
      }

      return response.content.text;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid response')) {
        throw error;
      }
      throw new Error(`Sampling failed: ${(error as Error).message}`);
    }
  }
}
