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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmbeddingProviderFactory } from '../embedding-provider';
import type { IEmbeddingProvider } from '../types';

/**
 * Provider Factory Tests
 *
 * Verifies that the factory can create all supported provider types
 */
describe('Embedding Providers', () => {
  describe('Provider Factory', () => {
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
      const invalidProvider = await EmbeddingProviderFactory.create({
        provider: 'ollama',
        baseUrl: 'http://invalid-url:11434',
      });

      await expect(
        invalidProvider.embed('Test text')
      ).rejects.toThrow();
    });

    it('should handle model not found errors', async () => {
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

    beforeEach(async () => {
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

      const providers = await Promise.all([
        EmbeddingProviderFactory.create({
          provider: 'openai',
          apiKey: 'test-key',
        }),
        EmbeddingProviderFactory.create({
          provider: 'huggingface',
          apiKey: 'hf-test-key',
        }),
      ]);

      const embeddings = await Promise.all(
        providers.map(p => p.embed(text))
      );

      // All embeddings should be L2 normalized (magnitude ≈ 1)
      embeddings.forEach(embedding => {
        const magnitude = Math.sqrt(
          embedding.reduce((sum, val) => sum + val * val, 0)
        );
        expect(magnitude).toBeCloseTo(1, 2);
      });
    });
  });
});
