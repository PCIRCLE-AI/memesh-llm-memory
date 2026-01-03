/**
 * Mock for OpenAI SDK
 * Used in tests to avoid real API calls and quota limits
 */

// Mock embedding response (1536 dimensions for text-embedding-3-small)
const createMockEmbedding = (seed: number = 0): number[] => {
  const dimensions = 1536;
  const embedding = new Array(dimensions);

  for (let i = 0; i < dimensions; i++) {
    // Create pseudo-random but deterministic embeddings based on seed
    embedding[i] = Math.sin(seed + i * 0.1) * 0.5;
  }

  return embedding;
};

// Mock OpenAI client
export class MockOpenAI {
  public embeddings: {
    create: (params: {
      model: string;
      input: string | string[];
      encoding_format?: string;
    }) => Promise<{
      data: Array<{ embedding: number[]; index: number }>;
      usage: { total_tokens: number };
    }>;
  };

  constructor(_config?: { apiKey?: string }) {
    this.embeddings = {
      create: async (params) => {
        const inputs = Array.isArray(params.input) ? params.input : [params.input];

        // Simulate API errors for invalid inputs
        if (inputs.some((text) => typeof text !== 'string')) {
          throw new Error('Input must be a string or array of strings');
        }

        // Calculate token count (roughly 1 token per 4 chars)
        const tokenCounts = inputs.map(text => Math.ceil(text.length / 4));

        // Check token limit (8192 tokens per OpenAI API)
        if (tokenCounts.some((tokens) => tokens > 8192)) {
          throw new Error('This model\'s maximum context length is 8192 tokens');
        }

        if (inputs.some((text) => text.trim().length === 0) && inputs.length > 1) {
          throw new Error('Invalid input: empty strings in batch');
        }

        // Generate mock embeddings
        const data = inputs.map((text, index) => ({
          embedding: createMockEmbedding(text.length + index),
          index,
        }));

        // Calculate total token usage
        const totalTokens = tokenCounts.reduce((sum, count) => sum + count, 0);

        return {
          data,
          usage: {
            total_tokens: totalTokens,
          },
        };
      },
    };
  }
}

// Default export (OpenAI class)
export default MockOpenAI;
