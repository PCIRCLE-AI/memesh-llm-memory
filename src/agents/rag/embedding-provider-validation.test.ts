/**
 * API Key Validation Tests for Embedding Provider
 *
 * These tests verify that API key validation works correctly by:
 * 1. Temporarily removing OPENAI_API_KEY from environment
 * 2. Testing validation with various invalid inputs
 * 3. Restoring the original environment after tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { EmbeddingProviderFactory } from './embedding-provider.js';
import { ConfigurationError } from '../../errors/index.js';
import { SecureKeyStore } from '../../utils/SecureKeyStore.js';

// Store original environment value
let originalEnvKey: string | undefined;

beforeAll(() => {
  // Save and clear environment variable for testing
  originalEnvKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  // Clear SecureKeyStore
  SecureKeyStore.delete('openai');
});

afterAll(() => {
  // Restore original environment
  if (originalEnvKey) {
    process.env.OPENAI_API_KEY = originalEnvKey;
  }
});

describe('API Key Validation', () => {
  describe('OpenAI Provider', () => {
    it('should throw ConfigurationError when API key is undefined', async () => {
      await expect(
        EmbeddingProviderFactory.create({
          provider: 'openai',
          apiKey: undefined,
        })
      ).rejects.toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError when API key is null', async () => {
      await expect(
        EmbeddingProviderFactory.create({
          provider: 'openai',
          apiKey: null as any,
        })
      ).rejects.toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError when API key is empty string', async () => {
      await expect(
        EmbeddingProviderFactory.create({
          provider: 'openai',
          apiKey: '',
        })
      ).rejects.toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError when API key is whitespace only', async () => {
      await expect(
        EmbeddingProviderFactory.create({
          provider: 'openai',
          apiKey: '   ',
        })
      ).rejects.toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError with helpful message', async () => {
      try {
        await EmbeddingProviderFactory.create({
          provider: 'openai',
          apiKey: '',
        });
        expect.fail('Should have thrown ConfigurationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        expect((error as ConfigurationError).message).toContain('OpenAI API key is required');
        expect((error as ConfigurationError).message).toContain('https://platform.openai.com/api-keys');
      }
    });

    it('should accept valid API key string', async () => {
      // Valid format API key (will fail later due to invalid key, but passes validation)
      await expect(
        EmbeddingProviderFactory.create({
          provider: 'openai',
          apiKey: 'sk-test-key-123',
        })
      ).resolves.toBeDefined();
    });

    it('should trim whitespace from valid API key', async () => {
      // Valid format API key with whitespace (will fail later due to invalid key, but passes validation)
      await expect(
        EmbeddingProviderFactory.create({
          provider: 'openai',
          apiKey: '  sk-test-key-123  ',
        })
      ).resolves.toBeDefined();
    });
  });

  describe('HuggingFace Provider', () => {
    it('should throw ConfigurationError when API key is undefined', async () => {
      await expect(
        EmbeddingProviderFactory.create({
          provider: 'huggingface',
          apiKey: undefined as any,
        })
      ).rejects.toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError when API key is null', async () => {
      await expect(
        EmbeddingProviderFactory.create({
          provider: 'huggingface',
          apiKey: null as any,
        })
      ).rejects.toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError when API key is empty string', async () => {
      await expect(
        EmbeddingProviderFactory.create({
          provider: 'huggingface',
          apiKey: '',
        })
      ).rejects.toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError when API key is whitespace only', async () => {
      await expect(
        EmbeddingProviderFactory.create({
          provider: 'huggingface',
          apiKey: '   ',
        })
      ).rejects.toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError with helpful message', async () => {
      try {
        await EmbeddingProviderFactory.create({
          provider: 'huggingface',
          apiKey: '',
        });
        expect.fail('Should have thrown ConfigurationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        expect((error as ConfigurationError).message).toContain('Hugging Face API key is required');
        expect((error as ConfigurationError).message).toContain('https://huggingface.co/settings/tokens');
      }
    });

    it('should accept valid API key string', async () => {
      const provider = await EmbeddingProviderFactory.create({
        provider: 'huggingface',
        apiKey: 'hf_test_key_123',
      });
      expect(provider).toBeDefined();
    });
  });

  describe('createOpenAI (legacy)', () => {
    it('should throw ConfigurationError when no API key available', async () => {
      await expect(
        EmbeddingProviderFactory.createOpenAI({
          apiKey: undefined,
          interactive: false,
        })
      ).rejects.toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError when API key is empty', async () => {
      await expect(
        EmbeddingProviderFactory.createOpenAI({
          apiKey: '',
          interactive: false,
        })
      ).rejects.toThrow(ConfigurationError);
    });

    it('should accept valid API key', async () => {
      await expect(
        EmbeddingProviderFactory.createOpenAI({
          apiKey: 'sk-test-key-123',
          interactive: false,
        })
      ).resolves.toBeDefined();
    });
  });

  describe('createSync', () => {
    it('should return null when optional=true and no API key', () => {
      const provider = EmbeddingProviderFactory.createSync({
        apiKey: undefined,
        optional: true,
      });
      expect(provider).toBeNull();
    });

    it('should return null when optional=true and empty API key', () => {
      const provider = EmbeddingProviderFactory.createSync({
        apiKey: '',
        optional: true,
      });
      expect(provider).toBeNull();
    });

    it('should throw ConfigurationError when optional=false and no API key', () => {
      expect(() =>
        EmbeddingProviderFactory.createSync({
          apiKey: undefined,
          optional: false,
        })
      ).toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError when optional=false and empty API key', () => {
      expect(() =>
        EmbeddingProviderFactory.createSync({
          apiKey: '',
          optional: false,
        })
      ).toThrow(ConfigurationError);
    });

    it('should accept valid API key', () => {
      const provider = EmbeddingProviderFactory.createSync({
        apiKey: 'sk-test-key-123',
        optional: false,
      });
      expect(provider).toBeDefined();
    });
  });

  describe('Error Message Quality', () => {
    it('should include setup instructions in OpenAI error', async () => {
      try {
        await EmbeddingProviderFactory.create({
          provider: 'openai',
          apiKey: null as any,
        });
        expect.fail('Should have thrown');
      } catch (error) {
        const err = error as ConfigurationError;
        expect(err.context).toBeDefined();
        expect(err.context!.configKey).toBe('apiKey');
        expect(err.context!.envVar).toBe('OPENAI_API_KEY');
        expect(err.context!.apiKeyUrl).toBe('https://platform.openai.com/api-keys');
        expect(err.context!.hint).toContain('OPENAI_API_KEY');
        expect(err.context!.hint).toContain('SecureKeyStore');
      }
    });

    it('should include setup instructions in HuggingFace error', async () => {
      try {
        await EmbeddingProviderFactory.create({
          provider: 'huggingface',
          apiKey: null as any,
        });
        expect.fail('Should have thrown');
      } catch (error) {
        const err = error as ConfigurationError;
        expect(err.context).toBeDefined();
        expect(err.context!.configKey).toBe('apiKey');
        expect(err.context!.envVar).toBe('HUGGINGFACE_API_KEY');
        expect(err.context!.apiKeyUrl).toBe('https://huggingface.co/settings/tokens');
        expect(err.context!.hint).toContain('HUGGINGFACE_API_KEY');
        expect(err.context!.hint).toContain('SecureKeyStore');
      }
    });
  });
});
