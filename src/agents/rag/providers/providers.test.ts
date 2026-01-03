/**
 * Embedding Providers Test Suite
 *
 * Tests for multiple embedding provider implementations:
 * - OpenAI (existing)
 * - Hugging Face (new)
 * - Ollama (new)
 * - Local (new)
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { EmbeddingProviderFactory } from '../embedding-provider';
import type { IEmbeddingProvider } from '../types';

/**
 * Mock fetch for API-based providers (HuggingFace, Ollama)
 * This ensures tests don't make real API calls
 */
const mockFetch = vi.fn();
const originalFetch = global.fetch;

beforeAll(() => {
  global.fetch = mockFetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

/**
 * Helper to create mock embedding response for HuggingFace (OpenAI-compatible format)
 */
function createHuggingFaceMockResponse(dimensions: number, count: number = 1) {
  // Create normalized embedding (L2 norm ≈ 1)
  const createNormalizedEmbedding = (dim: number): number[] => {
    const embedding = Array(dim).fill(1 / Math.sqrt(dim));
    return embedding;
  };

  return {
    data: Array(count).fill(null).map(() => ({
      embedding: createNormalizedEmbedding(dimensions),
    })),
  };
}

/**
 * Helper to create mock embedding response for Ollama
 */
function createOllamaMockResponse(dimensions: number) {
  // Create normalized embedding
  const embedding = Array(dimensions).fill(1 / Math.sqrt(dimensions));
  return { embedding };
}

/**
 * Provider Factory Tests
 *
 * Verifies that the factory can create all supported provider types
 */
describe('Embedding Providers', () => {
  describe('Provider Factory', () => {
    beforeEach(() => {
      // Configure mock for provider creation tests
      mockFetch.mockReset();
      mockFetch.mockImplementation(async (url: string) => {
        // Ollama API check needs to return available
        if (url.includes('/api/tags')) {
          return {
            ok: true,
            json: async () => ({ models: [{ name: 'nomic-embed-text' }] }),
            text: async () => '',
          };
        }
        return {
          ok: true,
          json: async () => ({}),
          text: async () => '',
        };
      });
    });

    it('should create OpenAI provider by default', async () => {
      const provider = await EmbeddingProviderFactory.create({
        provider: 'openai',
        apiKey: 'test-key',
      });

      expect(provider).toBeDefined();
      expect(provider.getModelInfo().provider).toBe('OpenAI');
    });

    it('should create Hugging Face provider', async () => {
      const provider = await EmbeddingProviderFactory.create({
        provider: 'huggingface',
        apiKey: 'hf-test-key',
      });

      expect(provider).toBeDefined();
      expect(provider.getModelInfo().provider).toBe('Hugging Face');
    });

    it('should create Ollama provider', async () => {
      const provider = await EmbeddingProviderFactory.create({
        provider: 'ollama',
        baseUrl: 'http://localhost:11434',
      });

      expect(provider).toBeDefined();
      expect(provider.getModelInfo().provider).toBe('Ollama');
    });

    it('should create Local provider', async () => {
      const provider = await EmbeddingProviderFactory.create({
        provider: 'local',
        modelPath: '/path/to/model',
      });

      expect(provider).toBeDefined();
      expect(provider.getModelInfo().provider).toBe('Local');
    });

    it('should throw error for unsupported provider', async () => {
      await expect(
        EmbeddingProviderFactory.create({
          provider: 'unsupported' as any,
        })
      ).rejects.toThrow('Unsupported embedding provider: unsupported');
    });
  });

  /**
   * Hugging Face Provider Tests
   */
  describe('HuggingFaceProvider', () => {
    let provider: IEmbeddingProvider;

    beforeEach(async () => {
      // Reset and configure mock for HuggingFace API
      mockFetch.mockReset();
      mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
        const body = options?.body ? JSON.parse(options.body as string) : {};
        const inputCount = Array.isArray(body.input) ? body.input.length : 1;

        return {
          ok: true,
          json: async () => createHuggingFaceMockResponse(384, inputCount),
          text: async () => '',
        };
      });

      provider = await EmbeddingProviderFactory.create({
        provider: 'huggingface',
        apiKey: 'hf-test-key',
        model: 'sentence-transformers/all-MiniLM-L6-v2',
      });
    });

    it('should return correct model info', () => {
      const modelInfo = provider.getModelInfo();

      expect(modelInfo.provider).toBe('Hugging Face');
      expect(modelInfo.model).toBe('sentence-transformers/all-MiniLM-L6-v2');
      expect(modelInfo.dimensions).toBe(384); // all-MiniLM-L6-v2 embedding size
      expect(modelInfo.maxTokens).toBe(256);
    });

    it('should generate embeddings for a single text', async () => {
      const text = 'This is a test document about machine learning.';

      const embedding = await provider.embed(text);

      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(384);
      expect(embedding.every(n => typeof n === 'number')).toBe(true);
    });

    it('should generate embeddings for multiple texts in batch', async () => {
      const texts = [
        'First document about AI',
        'Second document about ML',
        'Third document about NLP',
      ];

      const embeddings = await provider.embedBatch(texts);

      expect(embeddings).toBeDefined();
      expect(embeddings.length).toBe(3);
      expect(embeddings.every(emb => emb.length === 384)).toBe(true);
    });

    it('should handle empty text gracefully', async () => {
      const embedding = await provider.embed('');

      expect(embedding).toBeDefined();
      expect(embedding.length).toBe(384);
    });

    it('should handle API errors gracefully', async () => {
      // Configure mock to return an error response
      mockFetch.mockImplementationOnce(async () => ({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
        text: async () => 'Unauthorized',
      }));

      // Create provider with invalid API key
      const invalidProvider = await EmbeddingProviderFactory.create({
        provider: 'huggingface',
        apiKey: 'invalid-key',
      });

      await expect(
        invalidProvider.embed('Test text')
      ).rejects.toThrow();
    });

    it('should respect batch size limits', async () => {
      const texts = Array(100).fill('Test document');

      const embeddings = await provider.embedBatch(texts);

      expect(embeddings.length).toBe(100);
    });
  });

  /**
   * Ollama Provider Tests
   */
  describe('OllamaProvider', () => {
    let provider: IEmbeddingProvider;

    beforeEach(async () => {
      // Reset and configure mock for Ollama API
      mockFetch.mockReset();
      mockFetch.mockImplementation(async (url: string) => {
        // Handle different Ollama endpoints
        if (url.includes('/api/tags')) {
          return {
            ok: true,
            json: async () => ({ models: [{ name: 'nomic-embed-text' }] }),
            text: async () => '',
          };
        }

        // Embeddings endpoint
        return {
          ok: true,
          json: async () => createOllamaMockResponse(768),
          text: async () => '',
        };
      });

      provider = await EmbeddingProviderFactory.create({
        provider: 'ollama',
        baseUrl: 'http://localhost:11434',
        model: 'nomic-embed-text',
      });
    });

    it('should return correct model info', () => {
      const modelInfo = provider.getModelInfo();

      expect(modelInfo.provider).toBe('Ollama');
      expect(modelInfo.model).toBe('nomic-embed-text');
      expect(modelInfo.dimensions).toBe(768); // nomic-embed-text embedding size
    });

    it('should generate embeddings for a single text', async () => {
      const text = 'This is a test document about machine learning.';

      const embedding = await provider.embed(text);

      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(768);
      expect(embedding.every(n => typeof n === 'number')).toBe(true);
    });

    it('should generate embeddings for multiple texts in batch', async () => {
      const texts = [
        'First document about AI',
        'Second document about ML',
        'Third document about NLP',
      ];

      const embeddings = await provider.embedBatch(texts);

      expect(embeddings).toBeDefined();
      expect(embeddings.length).toBe(3);
      expect(embeddings.every(emb => emb.length === 768)).toBe(true);
    });

    it('should handle connection errors gracefully', async () => {
      // Configure mock to simulate connection error on checkAvailability
      mockFetch.mockImplementationOnce(async () => {
        throw new Error('fetch failed: ECONNREFUSED');
      });

      // The error happens during provider creation (checkAvailability fails)
      await expect(
        EmbeddingProviderFactory.create({
          provider: 'ollama',
          baseUrl: 'http://invalid-url:11434',
        })
      ).rejects.toThrow(/Ollama is not running/);
    });

    it('should handle model not found errors', async () => {
      // First call for checkAvailability - succeeds
      // Second call for embed - fails with model not found
      mockFetch
        .mockImplementationOnce(async () => ({
          ok: true,
          json: async () => ({ models: [] }),
          text: async () => '',
        }))
        .mockImplementationOnce(async () => ({
          ok: false,
          status: 404,
          json: async () => ({ error: 'model not found' }),
          text: async () => 'model not found',
        }));

      const invalidProvider = await EmbeddingProviderFactory.create({
        provider: 'ollama',
        baseUrl: 'http://localhost:11434',
        model: 'non-existent-model',
      });

      await expect(
        invalidProvider.embed('Test text')
      ).rejects.toThrow();
    });
  });

  /**
   * Local Provider Tests
   */
  describe('LocalProvider', () => {
    let provider: IEmbeddingProvider;

    // Mock for @xenova/transformers pipeline
    const mockPipeline = vi.fn();

    beforeEach(async () => {
      // Reset mock
      mockPipeline.mockReset();

      // Create a mock model instance that returns normalized embeddings
      const createMockEmbedding = (dim: number) => {
        const embedding = Array(dim).fill(1 / Math.sqrt(dim));
        return { data: embedding };
      };

      // Mock the pipeline function to return a callable model
      mockPipeline.mockResolvedValue(async (_text: string, _options: any) => {
        return createMockEmbedding(384);
      });

      // Mock the dynamic import of @xenova/transformers
      vi.doMock('@xenova/transformers', () => ({
        pipeline: mockPipeline,
      }));

      provider = await EmbeddingProviderFactory.create({
        provider: 'local',
        modelPath: '/path/to/model',
        model: 'all-MiniLM-L6-v2',
      });
    });

    it('should return correct model info', () => {
      const modelInfo = provider.getModelInfo();

      expect(modelInfo.provider).toBe('Local');
      expect(modelInfo.model).toBe('all-MiniLM-L6-v2');
      expect(modelInfo.dimensions).toBe(384);
    });

    it('should generate embeddings for a single text', async () => {
      const text = 'This is a test document about machine learning.';

      const embedding = await provider.embed(text);

      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(384);
      expect(embedding.every(n => typeof n === 'number')).toBe(true);
    });

    it('should generate embeddings for multiple texts in batch', async () => {
      const texts = [
        'First document about AI',
        'Second document about ML',
        'Third document about NLP',
      ];

      const embeddings = await provider.embedBatch(texts);

      expect(embeddings).toBeDefined();
      expect(embeddings.length).toBe(3);
      expect(embeddings.every(emb => emb.length === 384)).toBe(true);
    });

    it('should cache embeddings for repeated texts', async () => {
      const text = 'Repeated document';

      const embedding1 = await provider.embed(text);
      const embedding2 = await provider.embed(text);

      expect(embedding1).toEqual(embedding2);
    });

    it('should handle model loading errors', async () => {
      // Configure mock pipeline to simulate model loading error
      mockPipeline.mockRejectedValueOnce(new Error('Model not found at /invalid/path'));

      const invalidProvider = await EmbeddingProviderFactory.create({
        provider: 'local',
        modelPath: '/invalid/path',
      });

      await expect(
        invalidProvider.embed('Test text')
      ).rejects.toThrow();
    });

    it('should support different model architectures', async () => {
      const providers = await Promise.all([
        EmbeddingProviderFactory.create({
          provider: 'local',
          modelPath: '/path/to/model',
          model: 'all-MiniLM-L6-v2', // 384 dimensions
        }),
        EmbeddingProviderFactory.create({
          provider: 'local',
          modelPath: '/path/to/model',
          model: 'all-mpnet-base-v2', // 768 dimensions
        }),
      ]);

      expect(providers[0].getModelInfo().dimensions).toBe(384);
      expect(providers[1].getModelInfo().dimensions).toBe(768);
    });
  });

  /**
   * Cross-Provider Consistency Tests
   */
  describe('Cross-Provider Consistency', () => {
    beforeEach(() => {
      // Configure mock to handle all provider API calls
      mockFetch.mockReset();
      mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
        // Ollama API check
        if (url.includes('/api/tags')) {
          return {
            ok: true,
            json: async () => ({ models: [{ name: 'nomic-embed-text' }] }),
            text: async () => '',
          };
        }

        // HuggingFace API (OpenAI-compatible)
        if (url.includes('huggingface.co')) {
          const body = options?.body ? JSON.parse(options.body as string) : {};
          const inputCount = Array.isArray(body.input) ? body.input.length : 1;
          return {
            ok: true,
            json: async () => createHuggingFaceMockResponse(384, inputCount),
            text: async () => '',
          };
        }

        // Ollama embeddings
        if (url.includes('/api/embeddings')) {
          return {
            ok: true,
            json: async () => createOllamaMockResponse(768),
            text: async () => '',
          };
        }

        // Default response
        return {
          ok: true,
          json: async () => ({}),
          text: async () => '',
        };
      });
    });

    it('should have consistent interface across all providers', async () => {
      const providers = await Promise.all([
        EmbeddingProviderFactory.create({
          provider: 'openai',
          apiKey: 'test-key',
        }),
        EmbeddingProviderFactory.create({
          provider: 'huggingface',
          apiKey: 'hf-test-key',
        }),
        EmbeddingProviderFactory.create({
          provider: 'ollama',
          baseUrl: 'http://localhost:11434',
        }),
        EmbeddingProviderFactory.create({
          provider: 'local',
          modelPath: '/path/to/model',
        }),
      ]);

      providers.forEach(provider => {
        expect(provider.embed).toBeDefined();
        expect(typeof provider.embed).toBe('function');
        expect(provider.embedBatch).toBeDefined();
        expect(typeof provider.embedBatch).toBe('function');
        expect(provider.getModelInfo).toBeDefined();
        expect(typeof provider.getModelInfo).toBe('function');
      });
    });

    it('should normalize embeddings consistently', async () => {
      const text = 'Test document';

      // Only test HuggingFace since OpenAI uses a different API client
      // that would need separate mocking
      const provider = await EmbeddingProviderFactory.create({
        provider: 'huggingface',
        apiKey: 'hf-test-key',
      });

      const embedding = await provider.embed(text);

      // Embedding should be L2 normalized (magnitude ≈ 1)
      const magnitude = Math.sqrt(
        embedding.reduce((sum, val) => sum + val * val, 0)
      );
      expect(magnitude).toBeCloseTo(1, 2);
    });
  });
});
