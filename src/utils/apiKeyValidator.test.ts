/**
 * API Key Validator Tests
 */

import { describe, it, expect } from 'vitest';
import { validateOpenAIKey, isRagAvailable } from './apiKeyValidator.js';

describe('API Key Validator', () => {
  describe('validateOpenAIKey', () => {
    it('should detect missing API key', () => {
      const result = validateOpenAIKey('');
      expect(result.isValid).toBe(false);
      expect(result.status).toBe('missing');
      expect(result.message).toContain('OPENAI_API_KEY not set');
      expect(result.guidance).toContain('https://platform.openai.com/api-keys');
    });

    it('should detect missing API key (undefined)', () => {
      const result = validateOpenAIKey(undefined);
      expect(result.isValid).toBe(false);
      expect(result.status).toBe('missing');
    });

    it('should detect invalid API key format (no sk- prefix)', () => {
      const result = validateOpenAIKey('invalid-key-format');
      expect(result.isValid).toBe(false);
      expect(result.status).toBe('invalid');
      expect(result.message).toContain('invalid format');
      expect(result.message).toContain('sk-');
    });

    it('should detect truncated API key', () => {
      const result = validateOpenAIKey('sk-short');
      expect(result.isValid).toBe(false);
      expect(result.status).toBe('invalid');
      expect(result.message).toContain('truncated or incomplete');
    });

    it('should validate correct API key format', () => {
      // Valid OpenAI API key format (48+ characters starting with sk-)
      const validKey = 'sk-' + 'x'.repeat(48);
      const result = validateOpenAIKey(validKey);
      expect(result.isValid).toBe(true);
      expect(result.status).toBe('valid');
      expect(result.message).toContain('properly formatted');
    });

    it('should accept 51-character keys', () => {
      const validKey = 'sk-' + 'x'.repeat(49);
      const result = validateOpenAIKey(validKey);
      expect(result.isValid).toBe(true);
      expect(result.status).toBe('valid');
    });
  });

  describe('isRagAvailable', () => {
    it('should return boolean for RAG availability', () => {
      const result = isRagAvailable();
      expect(typeof result).toBe('boolean');
      // Actual value depends on environment - just verify it's boolean
    });
  });
});
